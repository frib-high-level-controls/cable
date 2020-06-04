/**
 * Route handlers for Cable Requests
 */
import * as fs from 'fs';
import * as util from 'util';

import * as Debug from 'debug';
import * as express from 'express';
import * as lodash from 'lodash';
import * as xlsx from 'xlsx';

import {
  warn,
} from '../shared/logging';

import {
  ensureAuthc,
  getUsername,
} from '../shared/auth';

import {
  buildValidator,
  catchAll,
  deleteFormFiles,
  ensureAccepts,
  HttpStatus,
  parseFormData,
  RequestError,
  validateAndThrow,
  Validator,
} from '../shared/handlers';

import {
  User,
} from '../model/user';

// import {
//   CableRequest,
// } from '../model/request';

import {
  CableType,
} from '../model/cabletype';

const OK = HttpStatus.OK;
const BAD_REQUEST = HttpStatus.BAD_REQUEST;
const SERVER_ERROR = HttpStatus.INTERNAL_SERVER_ERROR;

const debug = Debug('cable:routes:requests');

const readFile = util.promisify(fs.readFile);

interface CableTraySection {
  value: string;
  title: string;
}

interface CableProject {
  value: string;
  title: string;
}

interface CableSignal {
  name: string;
  desc?: string;
}

interface CableSignals {
  [key: string]: CableSignal | undefined;
}

interface CableSubcategories {
  [key: string]: string | undefined;
}

interface CableCategory {
  name: string;
  projects: string[];
  subcategory: CableSubcategories;
  signal: CableSignals;
}

interface CableCategories {
  [key: string]: CableCategory | undefined;
}

let sysSub: CableCategories;

export function setSysSubData(data: CableCategories) {
  sysSub = data;
}

let projects: CableProject[];

export function setProjects(data: CableProject[]) {
  projects = data;
}

let traySects: CableTraySection[];

export function setTraySections(data: CableTraySection[]) {
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

  const validatedProjects = new Map<string, string>();
  const validatedCategories = new Map<string, string>();
  const validatedSubcategories = new Map<string, string>();
  const validatedSignals = new Map<string, string>();

  const checkBasic: Validator<keyof webapi.CableRequest['basic']> = buildValidator('body', `${prefix}.basic`);

  await validateAndThrow(req, [
    // validate and convert project title to value
    checkBasic('project').custom((value, { path }): true => {
      if (!value) {
        throw new Error('Project is required');
      }
      const title = String(value).trim().toUpperCase();
      for (const project of projects) {
        if (title === project.title.toUpperCase()) {
          validatedProjects.set(path, project.value);
          return true;
        }
      }
      throw new Error(`Project is invalid: '${value}'`);
    })
    .customSanitizer((value, { path }): string => {
      return validatedProjects.get(path) ?? value;
    }),
    // validate and sanitize origin category name to value
    checkBasic('originCategory').custom((value, { path }): true => {
      if (!value) {
        throw new Error('Origin Category is required');
      }
      const project = validatedProjects.get(path.replace('originCategory', 'project'));
      if (project) {
        const name = value.toUpperCase();
        for (const category of Object.keys(sysSub)) {
          if (sysSub[category]?.projects.includes(project)) {
            if (name === sysSub[category]?.name.toUpperCase()) {
              validatedCategories.set(path, category);
              return true;
            }
          }
        }
      }
      throw new Error(`Origin Category is invalid: '${value}'`);
    })
    .customSanitizer((value, { path }): string => {
      return validatedCategories.get(path) ?? value;
    }),
    // validate and convert origin subcategory name to value
    checkBasic('originSubcategory').custom((value, { path }): true => {
      if (!value) {
        throw new Error('Origin Subcategory is required');
      }
      const category = validatedCategories.get(path.replace('originSubcategory', 'originCategory'));
      if (category) {
        const subcategories = sysSub[category]?.subcategory;
        if (subcategories) {
          const name = String(value).trim().toUpperCase();
          for (const subcategory of Object.keys(subcategories)) {
            if (name === subcategories[subcategory]?.toUpperCase()) {
              validatedSubcategories.set(path, subcategory);
              return true;
            }
          }
        }
      }
      throw new Error(`Origin Subcategory is invalid: '${value}'`);
    })
    .customSanitizer((value, { path }) => {
      return validatedSubcategories.get(path) ?? value;
    }),
    // validate and convert signal classification name to value
    checkBasic('signalClassification').custom((value, { path }): true => {
      if (!value) {
        throw new Error('Signal Classification is required');
      }
      const category = validatedCategories.get(path.replace('signalClassification', 'originCategory'));
      if (category) {
        const signals = sysSub[category]?.signal;
        if (signals) {
          const name = String(value).trim().toUpperCase();
          for (const signal of Object.keys(signals)) {
            if (name === signals[signal]?.name.toUpperCase()) {
              validatedSignals.set(path, signal);
              return true;
            }
          }
        }
      }
      throw new Error(`Signal Classification is invalid: '${value}'`);
    })
    .customSanitizer((value, { path }) => {
      return validatedSignals.get(path) ?? value;
    }),
  ]);
}

async function validateWebCableRequest(req: express.Request, prefix?: string): Promise<void> {
  prefix = prefix ?? 'request';

  // Cache data needed for validation
  const [ users, cableTypes ] = await Promise.all([
    User.find().exec(),
    CableType.find().exec(),
  ]);

  const checkBasic: Validator<keyof webapi.CableRequest['basic']> = buildValidator('body', `${prefix}.basic`);
  const checkFrom: Validator<keyof webapi.CableRequest['from']> = buildValidator('body', `${prefix}.from`);
  const checkTo: Validator<keyof webapi.CableRequest['to']> = buildValidator('body', `${prefix}.to`);
  const check: Validator<keyof webapi.CableRequest> = buildValidator('body', prefix);

  await validateAndThrow(req, [
    checkBasic('project').trim().custom((value) => {
      if (!projects.some((p) => (p.value === value))) {
        throw new Error(`Project is invalid: ${value}`);
      }
      return true;
    }),
    checkBasic('wbs').trim().custom((value) => {
      if (!/^[A-Z]\d{1,5}$/.test(value)) {
        throw new Error(`WBS is must match /[A-Z]\d{1,5}/: '${value}'`);
      }
      return true;
    }),
    checkBasic('engineer').trim().custom((value) => {
      for (const user of users) {
        if (user.name === value) {
          return true;
        }
      }
      throw new Error(`Engineer is invalid: '${value}'`);
    }),
    checkBasic('originCategory').trim().custom((value) => {
      if (!Object.keys(sysSub).includes(value)) {
        throw new Error(`Origin Category is invalid: '$'{value}'`);
      }
      return true;
    }),
    checkBasic('originSubcategory').trim().custom((value, { path }) => {
      const category = lodash.get(req.body, path.replace('originSubcategory', 'originCategory'));
      const subcategories = sysSub[category]?.subcategory ?? {};
      if (!Object.keys(subcategories).includes(value)) {
        throw new Error(`Origin Subcategory is invalid: '${value}'`);
      }
      return true;
    }),
    checkBasic('signalClassification').trim().custom((value, { path }) => {
      const category = lodash.get(req.body, path.replace('originSubcategory', 'originCategory'));
      const signals = sysSub[category]?.signal ?? {};
      if (!Object.keys(signals).includes(value)) {
        throw new Error(`Signal Classification is invalid: '${value}'`);
      }
      return true;
    }),
    checkBasic('traySection').trim().custom((value) => {
      if (!traySects.some((s) => (s.value === value))) {
        throw new Error(`Tray Section is invalid: '${value}'`);
      }
      return true;
    }),
    checkBasic('cableType').trim().custom((value) => {
      for (const cableType of cableTypes) {
        if (cableType.name === value) {
          if (cableType.obsolete === true) {
            throw new Error(`Cable Type is obsolete: '${value}'`);
          }
          return true;
        }
      }
      throw new Error(`Cable Type is invalid: '${value}'`);
    }),
    checkBasic('service').optional().trim().isString(),
    checkBasic('tags').optional().trim().isString(),
    checkBasic('quantity').trim().isNumeric().toInt(),
    check('ownerProvided').trim().isBoolean().toBoolean(),
    // from
    checkFrom('rack').optional().trim().isString(),
    checkFrom('terminationDevice').optional().trim().isString(),
    checkFrom('terminationType').optional().trim().isString(),
    checkFrom('wiringDrawing').optional().trim().isString(),
    // to
    checkTo('rack').optional().trim().isString(),
    checkTo('terminationDevice').optional().trim().isString(),
    checkTo('terminationType').optional().trim().isString(),
    checkTo('wiringDrawing').optional().trim().isString(),
    // routing
    check('length').optional({checkFalsy: true}).trim().isDecimal().toFloat(),
    check('conduit').optional().trim().isString(),
    // other
    check('comments').optional().trim().isString(),
  ]);
}


router.get('/requests/import', ensureAuthc(), (req, res) => {
  res.render('request-import');
});

router.post('/requests/import', ensureAuthc(), ensureAccepts('json'), catchAll(async (req, res) => {
  debug('import requests');

  const username = getUsername(req);
  if (!username) {
    throw new RequestError('No username on authenticated request', SERVER_ERROR);
  }

  if (req.is('multipart/form-data')) {
    const { fields, files } = await parseFormData(req);

    let workbook: xlsx.WorkBook;
    try {
      if (!files.data) {
        throw new RequestError('Import data file is required', BAD_REQUEST);
      }
      const buffer = await readFile(files.data.path);
      workbook = xlsx.read(buffer, { type: 'buffer' /*, dateNF: 'yyyy-mm-dd'*/ });
    } finally {
      try {
        await deleteFormFiles(files);
      } catch (err) {
        warn('Error deleting form files: %s', err);
      }
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

    req.body = {
      requests: [],
      validated: fields.validated ? [ 'on' ].includes(fields.validated) : false,
    };

    const rows = xlsx.utils.sheet_to_json(sheet);
    for (const row of rows) {
      req.body.requests.push(rowToRawCableRequest(row));
    }

    await sanitizeRawCableRequest(req, 'requests.*');
  }

  // const valdiated  = (req.body.valdiated === true);

  if (!Array.isArray(req.body.requests)) {
    throw new RequestError('Cable Request data is required', BAD_REQUEST);
  }

  await validateWebCableRequest(req, 'requests.*');

  // dryrun?

  // const result = await CableRequest.create(requests);

  res.status(OK).json([]);
}));
