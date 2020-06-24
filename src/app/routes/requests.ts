/**
 * Route handlers for Cable Requests
 */
import * as fs from 'fs';
import * as util from 'util';

import * as Debug from 'debug';
import * as express from 'express';
import * as xlsx from 'xlsx';

import {
  warn,
} from '../shared/logging';

import {
  ensureAuthc,
  getUsername,
  hasAnyRole,
} from '../shared/auth';

import {
  buildValidator,
  catchAll,
  deleteFormFiles,
  ensureAccepts,
  findQueryParam,
  FormFields,
  FormFiles,
  HttpStatus,
  parseFormData,
  RequestError,
  validateAndThrow,
  Validator,
} from '../shared/handlers';

import {
  User,
} from '../model/user';

import {
  CableRequest,
  ICableRequest,
} from '../model/request';

import {
  CableType,
} from '../model/meta';

const OK = HttpStatus.OK;
const CREATED = HttpStatus.CREATED;
const BAD_REQUEST = HttpStatus.BAD_REQUEST;
const FORBIDDEN = HttpStatus.FORBIDDEN;
const SERVER_ERROR = HttpStatus.INTERNAL_SERVER_ERROR;

const debug = Debug('cable:routes:requests');

const readFile = util.promisify(fs.readFile);



let sysSub: webapi.CableCategories;

export function setSysSubData(data: webapi.CableCategories) {
  sysSub = data;
}

let projects: webapi.CableProject[];

export function setProjects(data: webapi.CableProject[]) {
  projects = data;
}

let traySects: webapi.CableTraySection[];

export function setTraySections(data: webapi.CableTraySection[]) {
  traySects = data;
}

const router = express.Router();

export function getRouter(opts?: {}) {
  return router;
}

enum RequestColumn {
  PROJECT = 'PROJECT',
  WBS = 'WBS',
  ENGINEER = 'ENGINEER',
  CATEGORY = 'ORIGIN CATEGORY',
  SUBCATEGORY = 'ORIGIN SUBCATEGORY',
  SIGNAL = 'SIGNAL CLASSIFICATION',
  TRAY_SECTION = 'TRAY SECTION',
  CABLE_TYPE = 'CABLE TYPE',
  OWNER_PROVIDED = 'OWNER PROVIDED',
  FUNCTION = 'FUNCTION',
  TAGS = 'TAGS',
  QUANTITY = 'QUANTITY',
  FROM_RACK = 'FROM LOCATION',
  FROM_TERM_DEV = 'FROM TERMINATION DEVICE',
  FROM_TERM_TYPE = 'FROM TERMINATION TYPE',
  FROM_TERM_PORT = 'FROM TERMINATION PORT',
  FROM_WIRING = 'FROM WIRING DRAWING',
  TO_RACK = 'TO LOCATION',
  TO_TERM_DEV = 'TO TERMINATION DEVICE',
  TO_TERM_TYPE = 'TO TERMINATION TYPE',
  TO_TERM_PORT = 'TO TERMINATION PORT',
  TO_WIRING = 'TO WIRING DRAWING',
  CONDUIT = 'CONDUIT',
  LENGTH = 'LENGTH',
  COMMENTS = 'COMMENTS',
}

function rowToRawCableRequest(row: any): any {

  function prop(name: RequestColumn) {
    if (row[name] !== undefined) {
      return row[name];
    }
    for (const key of Object.keys(row)) {
      if (name === key.toUpperCase()) {
        return row[key];
      }
    }
  }

  const data: any = {
    basic: {
      project: prop(RequestColumn.PROJECT),
      wbs: prop(RequestColumn.WBS),
      engineer: prop(RequestColumn.ENGINEER),
      originCategory: prop(RequestColumn.CATEGORY),
      originSubcategory: prop(RequestColumn.SUBCATEGORY),
      signalClassification: prop(RequestColumn.SIGNAL),
      traySection: prop(RequestColumn.TRAY_SECTION),
      cableType: prop(RequestColumn.CABLE_TYPE),
      service: prop(RequestColumn.FUNCTION),
      tags: prop(RequestColumn.TAGS),
      quantity: prop(RequestColumn.QUANTITY),
    },
    from: {
      rack: prop(RequestColumn.FROM_RACK),
      terminationDevice: prop(RequestColumn.FROM_TERM_DEV),
      terminationType: prop(RequestColumn.FROM_TERM_TYPE),
      terminationPort: prop(RequestColumn.FROM_TERM_PORT),
      wiringDrawing: prop(RequestColumn.FROM_WIRING),
    },
    to: {
      rack: prop(RequestColumn.TO_RACK),
      terminationDevice: prop(RequestColumn.TO_TERM_DEV),
      terminationType: prop(RequestColumn.TO_TERM_TYPE),
      terminationPort: prop(RequestColumn.TO_TERM_PORT),
      wiringDrawing: prop(RequestColumn.TO_WIRING),
    },
    ownerProvided: prop(RequestColumn.OWNER_PROVIDED),
    conduit: prop(RequestColumn.CONDUIT),
    length: prop(RequestColumn.LENGTH),
    comments: prop(RequestColumn.COMMENTS),
  };

  return data;
}

async function sanitizeRawCableRequest(req: express.Request, prefix?: string): Promise<void> {
  prefix = prefix ?? 'request';

  const validationCache = new Map<string, string>();

  const check: Validator<keyof webapi.CableRequest> = buildValidator('body', prefix);
  const checkBasic: Validator<keyof webapi.CableRequest['basic']> = buildValidator('body', `${prefix}.basic`);

  await validateAndThrow(req, [
    // validate and convert project title to value
    checkBasic('project').optional()
      .isString().withMessage('Project must be a string')
      .trim().notEmpty().withMessage('Project is empty')
      .custom((value: string, { path }): true => {
        const title = value.toUpperCase();
        for (const project of projects) {
          if (title === project.title.toUpperCase()) {
            validationCache.set(path, project.value);
            return true;
          }
        }
        throw new Error(`Project is invalid: '${value}'`);
      })
      .customSanitizer((value: string, { path }): string => {
        return validationCache.get(path) ?? value;
      }),
    // validate and sanitize origin category name to value
    checkBasic('originCategory').optional()
      .isString().withMessage('Origin Category must be a string')
      .trim().notEmpty().withMessage('Origin Category is empty')
      .custom((value: string, { path }): true => {
        const project = validationCache.get(path.replace('originCategory', 'project'));
        if (project) {
          const name = value.toUpperCase();
          for (const category of Object.keys(sysSub)) {
            if (sysSub[category]?.projects.includes(project)) {
              if (name === category || name === sysSub[category]?.name.toUpperCase()) {
                validationCache.set(path, category);
                return true;
              }
            }
          }
        }
        throw new Error(`Origin Category is invalid: '${value}'`);
      })
      .customSanitizer((value: string, { path }) => {
        return validationCache.get(path) ?? value;
      }),
    // validate and convert origin subcategory name to value
    checkBasic('originSubcategory').optional()
      .isString().withMessage('Origin Subcategory must be a string')
      .trim().notEmpty().withMessage('Origin Subcategory is empty')
      .custom((value: string, { path }): true => {
        const category = validationCache.get(path.replace('originSubcategory', 'originCategory'));
        if (category) {
          const subcategories = sysSub[category]?.subcategory;
          if (subcategories) {
            const name = value.toUpperCase();
            for (const subcategory of Object.keys(subcategories)) {
              if (name === subcategory || name === subcategories[subcategory]?.toUpperCase()) {
                validationCache.set(path, subcategory);
                return true;
              }
            }
          }
        }
        throw new Error(`Origin Subcategory is invalid: '${value}'`);
      })
      .customSanitizer((value: string, { path }): string => {
        return validationCache.get(path) ?? value;
      }),
    // validate and convert signal classification name to value
    checkBasic('signalClassification').optional()
      .isString().withMessage('Signal Classification must be a string')
      .trim().notEmpty().withMessage('Signal Classification is empty')
      .custom((value, { path }): true => {
        const category = validationCache.get(path.replace('signalClassification', 'originCategory'));
        if (category) {
          const signals = sysSub[category]?.signal;
          if (signals) {
            const name = value.toUpperCase();
            for (const signal of Object.keys(signals)) {
              if (name === signal || name === signals[signal]?.name.toUpperCase()) {
                validationCache.set(path, signal);
                return true;
              }
            }
          }
        }
        throw new Error(`Signal Classification is invalid: '${value}'`);
      })
      .customSanitizer((value: string, { path }): string => {
        return validationCache.get(path) ?? value;
      }),
    checkBasic('quantity').optional()
      .isString().withMessage('Quantity must be a string')
      .trim().notEmpty().withMessage('Quantity is empty')
      .isInt().withMessage('Quantity must be an integer').toInt(), // convert to number!
    checkBasic('tags').optional()
      .isString().withMessage('Tags must be a string')
      .customSanitizer((value: string): string[] => {
        return value.split(',').map((t) => t.trim()).filter((t) => (t !== '')); // convert to array!
      }),
    check('ownerProvided').optional()
      .isString().withMessage('Owner Provided must be a string')
      .trim().notEmpty().withMessage('Owner Provided is empty')
      .custom((value: string): boolean => {
        if ([ 'YES', 'NO' ].includes(value.toUpperCase())) {
          return true;
        }
        throw new Error('Owner Provided must be YES/NO');
      })
      .customSanitizer((value: string): boolean => {
        return (value.toUpperCase() === 'YES'); // convert to boolean!
      }),
    check('length').optional()
      .isString().withMessage('Length must be a string')
      .trim().notEmpty().withMessage('Length is empty')
      .isFloat().withMessage('Length must be a number').toFloat(), // convert to number!
  ]);
}

async function validateWebCableRequest(req: express.Request, prefix?: string): Promise<void> {
  prefix = prefix ?? 'request';

  const validationCache = new Map<string, string>();

  // Query data needed for validation
  const [ users, cableTypes ] = await Promise.all([
    User.find().exec(),
    CableType.find().exec(),
  ]);

  const checkBasic: Validator<keyof webapi.CableRequest['basic']> = buildValidator('body', `${prefix}.basic`);
  const checkFrom: Validator<keyof webapi.CableRequest['from']> = buildValidator('body', `${prefix}.from`);
  const checkTo: Validator<keyof webapi.CableRequest['to']> = buildValidator('body', `${prefix}.to`);
  const check: Validator<keyof webapi.CableRequest> = buildValidator('body', prefix);

  await validateAndThrow(req, [
    checkBasic('project')
      .exists().withMessage('Project is required')
      .isString().withMessage('Project must be a string')
      .trim().custom((value: string, { path }): true => {
        if (projects.some((p) => (p.value === value))) {
          validationCache.set(path, value);
          return true;
        }
        throw new Error(`Project is invalid: '${value}'`);
      }),
    checkBasic('wbs')
      .exists().withMessage('WBS is required')
      .isString().withMessage('WBS must be a string')
      .trim().custom((value: string): true => {
        if (/^[A-Z]\d{1,5}$/.test(value)) {
          return true;
        }
        throw new Error(`WBS is must match /[A-Z]\d{1,5}/: '${value}'`);
      }),
    checkBasic('engineer').exists().withMessage('Engineer is required')
      .isString().withMessage('Engineer must be a string')
      .trim().custom((value: string): true => {
        if (users.some((u) => u.name === value)) {
          return true;
        }
        throw new Error(`Engineer is invalid: '${value}'`);
      }),
    checkBasic('originCategory')
      .exists().withMessage('Origin Category is required')
      .isString().withMessage('Origin Category must be a string')
      .trim().custom((value: string, { path }): true => {
        const project = validationCache.get(path.replace('originCategory', 'project'));
        if (Object.keys(sysSub).includes(value)) {
          if (sysSub[value]?.projects.some((p) => (p === project))) {
            validationCache.set(path, value);
            return true;
          }
        }
        throw new Error(`Origin Category is invalid: '$'{value}'`);
      }),
    checkBasic('originSubcategory')
      .exists().withMessage('Origin Subcategory is required')
      .isString().withMessage('Origin Subcategory must be a string')
      .trim().custom((value: string, { path }): true => {
        const category = validationCache.get(path.replace('originSubcategory', 'originCategory'));
        const subcategories = category ? sysSub[category]?.subcategory : undefined;
        if (subcategories && Object.keys(subcategories).includes(value)) {
          return true;
        }
        throw new Error(`Origin Subcategory is invalid: '${value}'`);
      }),
    checkBasic('signalClassification')
      .exists().withMessage('Signal Classification is required')
      .isString().withMessage('Signal Classification must be a string')
      .trim().custom((value: string, { path }): true => {
        const category = validationCache.get(path.replace('signalClassification', 'originCategory'));
        const signals = category ? sysSub[category]?.signal : undefined;
        if (signals && Object.keys(signals).includes(value)) {
          return true;
        }
        throw new Error(`Signal Classification is invalid: '${value}'`);
      }),
    checkBasic('traySection')
      .exists().withMessage('Tray Section is required')
      .isString().withMessage('Tray Section must be a string')
      .trim().custom((value: string): true => {
        if (traySects.some((s) => (s.value === value))) {
          return true;
        }
        throw new Error(`Tray Section is invalid: '${value}'`);
      }),
    checkBasic('cableType')
      .exists().withMessage('Cable Type is required')
      .isString().withMessage('Cable Type must be a string')
      .trim().custom((value: string): true => {
        for (const cableType of cableTypes) {
          if (cableType.name === value) {
            // TODO: check if obsolete when available!
            // if (cableType.obsolete === true) {
            //   throw new Error(`Cable Type is obsolete: '${value}'`);
            // }
            return true;
          }
        }
        throw new Error(`Cable Type is invalid: '${value}'`);
      }),
    checkBasic('service').optional()
      .isString().withMessage('Service must be a string').trim(),
    checkBasic('tags').optional()
      .isArray().withMessage('Tags must be an array')
      .customSanitizer((value: any[]): string[] => {
        // ensure tags is an array of non-empty strings
        return value.map((t) => String(t).trim()).filter((t) => (t !== ''));
      }),
    checkBasic('quantity')
      .exists().withMessage('Quantity is required')
      .isInt({ min: 1 }).withMessage('Quanity must be >= 1').toInt(),
    check('ownerProvided')
      .exists().withMessage('Owner Provided is required')
      .isBoolean().withMessage('Owner Provided must be true/false').toBoolean(),
    // from
    checkFrom('rack').optional()
      .isString().withMessage('From Location must be a string').trim(),
    checkFrom('terminationDevice').optional()
      .isString().withMessage('From Termination Device must be a string').trim(),
    checkFrom('terminationType').optional()
      .isString().withMessage('From Termination Type must be a string').trim(),
    checkFrom('wiringDrawing').optional()
      .isString().withMessage('From Wiring Drawing must be a string').trim(),
    // to
    checkTo('rack').optional()
      .isString().withMessage('To Location must be a string').trim(),
    checkTo('terminationDevice').optional()
      .isString().withMessage('To Termination Device must be a string').trim(),
    checkTo('terminationType').optional()
      .isString().withMessage('To Termination Type must be a string').trim(),
    checkTo('wiringDrawing').optional()
      .isString().withMessage('To Wiring Drawing must be a string').trim(),
    // routing
    check('length').optional()
      .isFloat({ gt: 0.0 }).withMessage('Length must be > 0').toFloat(),
    check('conduit').optional()
      .isString().withMessage('Conduit must be a string').trim(),
    // other
    check('comments').optional()
      .isString().withMessage('Comments must be a string').trim(),
  ]);
}


router.get('/requests/import', ensureAuthc(), (req, res) => {
  res.render('request-import', {
    projects: projects,
    categories: sysSub,
    traySections: traySects,
  });
});

router.post('/requests/import', ensureAuthc(), ensureAccepts('json'), catchAll(async (req, res) => {
  debug('import requests');

  const username = getUsername(req);
  if (!username) {
    throw new RequestError('No username on authenticated request', SERVER_ERROR);
  }

  if (req.is('multipart/form-data')) {

    let fields: FormFields;
    let files: FormFiles;
    try {
      ({ fields, files } = await parseFormData(req, {
        maxFileSize: 20 * 1024 * 1024, // 20MB
      }));
    } catch (err) {
      throw new RequestError(`Error parsing form data: ${err.message}`, BAD_REQUEST);
    }

    const validated = fields.validated ? [ '1', 'on', 'true' ].includes(fields.validated) : false;
    if (validated && !hasAnyRole(req, 'validator')) {
      throw new RequestError('Not permitted to validate cable requests', FORBIDDEN);
    }

    if (!files.requests) {
      throw new RequestError('Import data file is required', BAD_REQUEST);
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(files.requests.path);
    } finally {
      try {
        await deleteFormFiles(files);
      } catch (err) {
        warn('Error deleting form files: %s', err);
      }
    }

    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(buffer, { type: 'buffer' /*, dateNF: 'yyyy-mm-dd'*/ });
    } catch (err) {
      throw new RequestError('Import data file is not XLSX', BAD_REQUEST);
    }

    let sheetName = 'NEW';
    for (const name of workbook.SheetNames) {
      if (sheetName === name.toUpperCase()) {
        sheetName = name;
      }
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new RequestError(`Workbook sheet not found: ${sheetName}`, BAD_REQUEST);
    }

    const rows = xlsx.utils.sheet_to_json(sheet, { raw: false });
    if (rows.length === 0) {
      throw new RequestError('Cable Request data is required', BAD_REQUEST);
    }

    req.body = {
      requests: [],
      validated,
    };

    for (const row of rows) {
      req.body.requests.push(rowToRawCableRequest(row));
    }

    try {
      // Always exectute validation even if sanitization fails!
      try {
        await sanitizeRawCableRequest(req, 'requests.*');
      } finally {
        await validateWebCableRequest(req, 'requests.*');
      }
    } catch (err) {
      if (!(err instanceof RequestError)) {
        throw err;
      }
      // Need special logic to include
      // the converted data in response
      // along with the are validation errors.
      const pkg: webapi.Pkg<ICableRequest[]> = {
        data: req.body.requests,
        error: err.details,
      };
      res.status(err.status).json(pkg);
      return;
    }
  } else { // req is application/json
    req.body.validated = (req.body.validated === true);
    if (req.body.valdiated && !hasAnyRole(req, req.body.valdiated)) {
      throw new RequestError('Not permitted to validate requests', FORBIDDEN);
    }

    if (!Array.isArray(req.body.requests) || req.body.requests === 0) {
      throw new RequestError('Cable Request data is required', BAD_REQUEST);
    }

    await validateWebCableRequest(req, 'requests.*');
  }

  const requests: CableRequest[] = [];
  for (const request of req.body.requests as ICableRequest[]) {
    request.status = !req.body.validated ? 1 : 1.5;
    request.createdBy = username;
    request.createdOn = new Date();
    request.submittedBy = username;
    request.submittedOn = new Date();
    requests.push(new CableRequest(request));
  }

  {
    const p: Array<Promise<void>> = [];
    for (const request of requests) {
      p.push(request.validate());
    }
    await Promise.all(p);
  }

  const dryrun = findQueryParam(req, 'dryrun');
  if (dryrun !== undefined && dryrun !== 'false') {
    res.status(OK).json(requests);
    return;
  }

  {
    const p: Array<Promise<CableRequest>> = [];
    for (const request of requests) {
      p.push(request.save());
    }
    await Promise.all(p);
  }

  res.status(CREATED).json(requests);
}));
