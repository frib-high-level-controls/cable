#!/usr/bin/env node
/* tslint:disable:no-console */
/**
 * @fileOverview read a csv file with cable request details and insert them into mongo.
 * @author Dong Liu
 */

/*jslint es5: true*/
import * as fs from 'fs';
import * as path from 'path';

import * as csv from 'csv-parse';
import * as mongoose from 'mongoose';
import rc = require('rc');
import * as validator from 'validator';

import {
  CableRequest,
  ICableRequest,
} from '../app/model/request';

import naming = require('./lib/naming');

interface Config {
  configs?: string[];
  h?: {};
  help?: {};
  mongo: {
    user?: {};
    pass?: {};
    host?: {};
    port: {};
    addr: {};
    db: {};
    options: {};
  };
  dryrun?: {};
  _?: Array<{}>;
  metadata: {
    syssubsystem_path?: string;
  };
}

let inputPath: string = '';
let realPath: string = '';
let db: mongoose.Connection;
let line = 0;
const requests: any[] = [];
const lines: any[] = [];
let parser: csv.Parser;
let success = 0;

let version = '';


const cfg: Config = {
  mongo: {
    port: '27017',
    addr: 'localhost',
    db: 'swdb-dev',
    options: {
      // Use the "new" URL parser (Remove deprecation warning in Mongoose 5.x!)
      useNewUrlParser: true,
    },
  },
  metadata: {
    // no defaults
  },
};

rc('import-cable-request', cfg);
if (cfg.configs) {
  for (const file of cfg.configs) {
    console.log('Load configuration: %s', file);
  }
}

if (cfg.h || cfg.help) {
  console.log(`Usage: import-cable-requests [ options ] data.csv

  Options
      --help               display help information
      --config [rcfile]    load configuration from rcfile
      --dryrun [dryrun]    validate CSV data (default: true)
  `);
  process.exit(1);
}

if (!cfg._ || !Array.isArray(cfg._) || (cfg._.length === 0)) {
  console.error('Error: need the input source csv file path!');
  process.exit(1);
} else {
  inputPath = String(cfg._[0]);
  realPath = path.resolve(process.cwd(), inputPath);
}

if (!fs.existsSync(realPath)) {
  console.error(realPath + ' does not exist.');
  console.error('Please input a valid csv file path.');
  process.exit(1);
}

if (!cfg.metadata.syssubsystem_path) {
  console.error('system-subsystem data file path not found');
  process.exit(1);
}

if (!fs.existsSync(String(cfg.metadata.syssubsystem_path))) {
  console.error('system-subsystem data file not found: %s', cfg.metadata.syssubsystem_path);
  process.exit(1);
}

let syssub: any;
try {
  syssub = JSON.parse(fs.readFileSync(String(cfg.metadata.syssubsystem_path), 'utf8'));
} catch (err) {
  console.error('system-subsystem data read error: %s', err);
  process.exit(1);
}


const validate = (cfg.dryrun !== false && cfg.dryrun !== 'false');

if (!validate) {
  // Configure Mongoose (MongoDB)
  let mongoUrl = 'mongodb://';
  if (cfg.mongo.user) {
    mongoUrl += encodeURIComponent(String(cfg.mongo.user));
    if (cfg.mongo.pass) {
      mongoUrl += ':' + encodeURIComponent(String(cfg.mongo.pass));
    }
    mongoUrl += '@';
  }
  if (!cfg.mongo.host) {
    cfg.mongo.host = `${cfg.mongo.addr}:${cfg.mongo.port}`;
  }
  mongoUrl +=  `${cfg.mongo.host}/${cfg.mongo.db}`;

  mongoose.connect(mongoUrl, cfg.mongo.options);
  db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', () => {
    console.log('Connected to database: mongodb://%s/%s', cfg.mongo.host, cfg.mongo.db);
  });
}

function jobDone() {
  if (validate) {
    console.log(requests.length + ' requests were processed, and ' + success + ' requests were valid. Bye.');
  } else {
    console.log(requests.length + ' requests were processed, and ' + success + ' requests were inserted. Bye.');
    mongoose.connection.close();
  }
}

function splitTags(s?: string) {
  return s ? s.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*[,;]\s*/) : [];
}

function isTrue(S: string) {
  const s = S.toLowerCase();
  return s === 'yes' || s === 'true';
}

function createRequest(i: number): Request | undefined {
  const request = requests[i];
  let namecodes;
  let newRequest: ICableRequest;
  let quantityIndex = 10;
  const v2 = version.indexOf('v2') === 0;
  const v3 = version.indexOf('v3') === 0;
  // need more validation function here
  if (v2 || v3) {
    quantityIndex = 11;
  }
  if (!validator.isInt(request[quantityIndex])) {
    console.log('Line ' + lines[i] + ': the quantity is not an integer: ' + request[quantityIndex]);
    if (i === requests.length - 1) {
      jobDone();
      return;
    }
    return createRequest(i + 1);
  }
  namecodes = naming.encode(request[3], request[4], request[5], syssub);
  if (!namecodes[0] || !namecodes[1] || !namecodes[2])  {
    // tslint:disable:max-line-length
    console.log('Line ' + lines[i] + ': cannot encode the name of: ' + request[3] + '/' + request[4] + '/' + request[5]);
    if (i === requests.length - 1) {
      jobDone();
      return;
    }
    return createRequest(i + 1);
  }
  if (v3) {
    newRequest = {
      basic: {
        project: request[0],
        engineer: request[2],
        wbs: request[1],
        originCategory: namecodes[0],
        originSubcategory: namecodes[1],
        signalClassification: namecodes[2],
        cableType: request[7],
        service: request[9],
        traySection: request[6],
        tags: splitTags(request[10]),
        quantity: request[11],
      },
      from: {
        rack: request[12],
        terminationDevice: request[13],
        terminationType: request[14],
        terminationPort: request[15],
        wiringDrawing: request[16],
      },
      to: {
        rack: request[17],
        terminationDevice: request[18],
        terminationType: request[19],
        terminationPort: request[20],
        wiringDrawing: request[21],
      },
      ownerProvided: isTrue(request[8]),
      conduit: request[22],
      length: request[23],
      comments: request[24],
      status: 1,
      createdBy: 'system',
      createdOn: new Date(),
      submittedBy: 'system',
      submittedOn: new Date(),
    };
  } else if (v2) {
    newRequest = {
      basic: {
        project: request[0],
        engineer: request[2],
        wbs: request[1],
        originCategory: namecodes[0],
        originSubcategory: namecodes[1],
        signalClassification: namecodes[2],
        cableType: request[7],
        service: request[9],
        traySection: request[6],
        tags: splitTags(request[10]),
        quantity: request[11],
      },
      from: {
        rack: request[12],
        terminationDevice: request[13],
        terminationType: request[14],
        wiringDrawing: request[15],
      },
      to: {
        rack: request[16],
        terminationDevice: request[17],
        terminationType: request[18],
        wiringDrawing: request[19],
      },
      ownerProvided: isTrue(request[8]),
      conduit: request[20],
      length: request[21],
      comments: request[22],
      status: 1,
      createdBy: 'system',
      createdOn: new Date(),
      submittedBy: 'system',
      submittedOn: new Date(),
    };
  } else {
    newRequest = {
      basic: {
        project: request[0],
        engineer: request[2],
        wbs: request[1],
        originCategory: namecodes[0],
        originSubcategory: namecodes[1],
        signalClassification: namecodes[2],
        cableType: request[7],
        service: request[8],
        traySection: request[6],
        tags: splitTags(request[9]),
        quantity: request[10],
      },

      from: {
        rack: request[11],
        terminationDevice: request[12],
        terminationType: request[13],
        wiringDrawing: request[14],
      },

      to: {
        rack: request[15],
        terminationDevice: request[16],
        terminationType: request[17],
        wiringDrawing: request[18],
      },
      ownerProvided: false,
      conduit: request[19],
      length: request[20],
      comments: request[21],
      status: 1,
      createdBy: 'system',
      createdOn: new Date(),
      submittedBy: 'system',
      submittedOn: new Date(),
    };
  }
  if (validate) {
    // dryrun only, create document and validate, but do not save!
    new CableRequest(newRequest).validate((err) => {
      if (err) {
        console.log('line ' + i + ':' + err);
      } else {
        success += 1;
      }
      if (i === requests.length - 1) {
        jobDone();
      } else {
        setImmediate(() => {
          createRequest(i + 1);
        });
      }
    });
  } else {
    CableRequest.create(newRequest, (err: any, doc: CableRequest) => {
      if (err) {
        console.log(err);
      } else {
        success += 1;
        console.log('New request created with id: ' + doc.id);
      }
      if (i === requests.length - 1) {
        jobDone();
      } else {
        setImmediate(() => {
          createRequest(i + 1);
        });
      }
    });
  }
}


parser = csv({
  trim: true,
});

parser.on('readable', () => {
  let record = parser.read();
  while (record) {
    line += 1;
    console.log('read ' + line + ' lines ...');
    if (line === 2) {
      version = record[0];
      console.log('template version: ' + version);
    }
    if (line > 2) {
      requests.push(record);
      lines.push(line);
    }
    record = parser.read();
  }
});

parser.on('error', (err: any) => {
  console.log(err.message);
});

parser.on('finish', () => {
  createRequest(0);
});

fs.createReadStream(realPath).pipe(parser);

// keep running until the user interrupts
process.stdin.resume();
