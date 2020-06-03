/**
 * Route handlers for Cable Requests
 */
import * as fs from 'fs';
import * as util from 'util';

import * as Debug from 'debug';
import * as express from 'express';
import * as xlsx from 'xlsx';


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
  CableRequest,
} from '../model/request';

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

// let traySects: CableTraySection[];

export function setTraySections(data: CableTraySection[]) {
  // traySects = data;
}

const router = express.Router();

export function getRouter(opts?: {}) {
  return router;
}

enum RequestColumn {
  PROJECT = 'PROJECT',
  WBS = 'WBS',
  ENGINEER = 'ENGINEER',
  CATEGORY = 'CATEGORY',
  SUBCATEGORY = 'SUBCATEGORY',
  SIGNAL = 'SIGNAL',
  TRAY_SECTION = 'TRAY SECTION',
  CABLE_TYPE = 'CABLE TYPE',
  OWNER_PROVIDED = 'OWNER PROVIDED',
  FUNCTION = 'FUNCTION',
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

function rowToWebCableRequests(row: any): Promise<webapi.CableRequest | null> {

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

  const body: any = {
    project: prop(RequestColumn.PROJECT),
    wbs: prop(RequestColumn.WBS),
    engineer: prop(RequestColumn.ENGINEER),
    originCategory: prop(RequestColumn.CATEGORY),
    originSubcategory: prop(RequestColumn.SUBCATEGORY),
    signalClassification: prop(RequestColumn.SIGNAL),
    traySection: prop(RequestColumn.TRAY_SECTION),
    cableType: prop(RequestColumn.CABLE_TYPE),
    ownerProvided: prop(RequestColumn.OWNER_PROVIDED),
    service: prop(RequestColumn.FUNCTION),
    quantity: prop(RequestColumn.QUANTITY),
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
    conduit: prop(RequestColumn.CONDUIT),
    length: prop(RequestColumn.LENGTH),
    comments: prop(RequestColumn.COMMENTS),
  };

  if (typeof body.project !== 'string') {
    throw new RequestError('ValidationError');
  }

  {
    let found = false;
    const title = body.project.trim().toUpperCase();
    for (const project of projects) {
      if (title === project.title.toUpperCase()) {
        body.project = project.value;
        found = true;
        break;
      }
    }
    if (!found) {
      throw new RequestError('Validation Error');
    }
  }

  if (typeof body.originCategory !== 'string') {
    throw new RequestError('ValidationError');
  }
  {
    let found = false;
    const name = body.originCategory.trim().toUpperCase();
    for (const category of Object.keys(sysSub)) {
      if (sysSub[category]?.projects.includes(body.project)) {
        if (name === sysSub[category]?.name) {
          body.originCategory = category;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      throw new RequestError('ValidationError');
    }
  }

  if (typeof body.originSubcategory !== 'string') {
    throw new RequestError('ValidationError');
  }
  {
    let found = false;
    const name = body.originSubcategory.trim().toUpperCase();
    const subcategories = sysSub[body.originCategory]?.subcategory;
    if (subcategories) {
      for (const subcategory of Object.keys(subcategories)) {
        if (name === subcategories[subcategory]) {
          body.originSubcategory = subcategory;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      throw new RequestError('ValidationError');
    }
  }

  if (typeof body.signalClassification !== 'string') {
    throw new RequestError('ValidationError');
  }
  {
    let found = false;
    const name = body.signalClassification.trim().toUpperCase();
    const signals = sysSub[body.originCategory]?.signal;
    if (signals) {
      for (const signal of Object.keys(signals)) {
        if (name === signals[signal]?.name) {
          body.signalClassification = signal;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      throw new RequestError('ValidationError');
    }
  }

  return Promise.resolve(body);
}

async function reqToWebCableRequest(req: express.Request): Promise<CableRequest> {
  const request: webapi.CableRequest | undefined = req.body.request;

  if (!request || !request?.basic || !request?.to || !request?.from) {
    throw new RequestError('Bad Request', HttpStatus.BAD_REQUEST);
  }

  const checkBasic: Validator<keyof webapi.CableRequest['basic']> = buildValidator('body', 'request.basic');
  const checkFrom: Validator<keyof webapi.CableRequest['from']> = buildValidator('body', 'request.from');
  const checkTo: Validator<keyof webapi.CableRequest['to']> = buildValidator('body', 'request.to');
  const check: Validator<keyof webapi.CableRequest> = buildValidator('body', 'request');

  // validate cable type
  if (!request?.basic?.cableType || !(await CableType.findOne({name: request.basic.cableType}))) {
    throw new RequestError('Invalid Cable Type', HttpStatus.BAD_REQUEST);
  }

  await validateAndThrow(req, [
    checkBasic('project').notEmpty().trim().custom((value) => {
      return projects.some((v: {value: string, title: string}) => (v.value === value));
    }),
    checkBasic('wbs').optional().trim().custom((value) => {
      return /^[A-Z]\d{1,5}$/.test(value);
    }),
    checkBasic('engineer').notEmpty().trim().isString(),
    checkBasic('originCategory').notEmpty().trim().custom((value) => {
      return Object.keys(sysSub).includes(value);
    }),
    checkBasic('originSubcategory').notEmpty().trim().custom((value) => {
      const originCat = req.body.request.basic.originCategory;
      const subcategories = sysSub[originCat]?.subcategory ?? {};
      return Object.keys(subcategories).includes(value);
      // if (subcategories) {
      //   return Object.keys(subcategor).includes(value);
      // }
    }),
    checkBasic('signalClassification').notEmpty().trim().custom((value) => {
      const originCat = req.body.request.basic.originCategory;
      const signals = sysSub[originCat]?.signal ?? {};
      return Object.keys(signals).includes(value);
      // return Object.keys(sysSub[originCat].signal).includes(value);
    }),
    checkBasic('traySection').notEmpty().trim().isString(),
    checkBasic('service').optional().trim().isString(),
    checkBasic('tags').optional().trim().isString(),
    checkBasic('quantity').notEmpty().trim().isFloat().isNumeric(),
    check('ownerProvided').notEmpty().trim().toBoolean().isBoolean(),
    // from
    checkFrom('rack').notEmpty().trim().isString(),
    checkFrom('terminationDevice').optional().trim().isString(),
    checkFrom('terminationType').optional().trim().isString(),
    checkFrom('wiringDrawing').optional().trim().isString(),
    // to
    checkTo('rack').notEmpty().trim().isString(),
    checkTo('terminationDevice').optional().trim().isString(),
    checkTo('terminationType').optional().trim().isString(),
    checkTo('wiringDrawing').optional().trim().isString(),
    // routing
    check('length').optional({checkFalsy: true}).trim().isFloat().isNumeric(),
    check('conduit').optional().trim().isString(),
    // other
    check('comments').optional().trim().isString(),
  ]);

  return req.body.request || {};
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
        console.log(err);
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
      try {
        req.body.requests.push(rowToWebCableRequests(row));
      } catch (err) {
        console.log(err);
      }
    }
  }

  // const valdiated  = (req.body.valdiated === true);

  const requests = req.body.requests;
  if (!Array.isArray(requests)) {
    throw new RequestError('test');
  }

  // const results: any[] = [];
  // for (const request of requests) {
  for (let idx = 0; idx < requests.length; idx++) {
    // const request = requests[idx];
    req.body = { request: requests[idx] };
    try {
      requests[idx] = await reqToWebCableRequest(req);
    } catch (err) {
      // results.push(request);
      console.log(err);
    }
  }

  // dryrun?

  // const result = await CableRequest.create(requests);

  res.status(OK).json([]);
}));
