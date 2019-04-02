#!/usr/bin/env node
/* tslint:disable:no-console */
/**
 * @fileOverview Read a csv file with cable number and change details and apply them to mongoDB.
 * @author Dong Liu
 */
import * as fs from 'fs';
import * as path from 'path';

import * as csv from 'csv-parse';
import * as mongoose from 'mongoose';
import rc = require('rc');

import * as request from '../app/model/request';
const Cable = request.Cable as mongoose.Model<mongoose.Document & { number: {}}, {}>;
const MultiChange = request.MultiChange;

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
}

let inputPath: string = '';
let realPath: string = '';
let db: mongoose.Connection;
let line = 0;
let done = 0;
const changes: any[] = [];
let parser: csv.Parser;
const properties: any[] = [];

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
};

rc('update-cable-csv', cfg);
if (cfg.configs) {
  for (const file of cfg.configs) {
    console.log('Load configuration: %s', file);
  }
}

if (cfg.h || cfg.help) {
  console.log(`Usage: update-cable-csv [ options ] data.csv

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
  console.error('Error: ' + realPath + ' does not exist.');
  console.error('Please input a valid csv file path.');
  process.exit(1);
}

{
  // No type support for these properties (@types/mongoose@5.3.24)
  // (see https://mongoosejs.com/docs/schematypes.html#booleans)
  const B: any = mongoose.Schema.Types.Boolean;
  // Convert uppercase strings 'TRUE' and 'FALSE' to Boolean
  B.convertToTrue.add('TRUE');
  B.convertToFalse.add('FALSE');
}

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
db.on('error', (err) => {
  console.error(err.toString());
  process.exit(1);
});
db.once('open', () => {
  console.log('Connected to database: mongodb://%s/%s', cfg.mongo.host, cfg.mongo.db);
});


function splitTags(s?: string) {
  return s ? s.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*[,;]\s*/) : [];
}

function updateCable(change: any[], i: number, callback: (err?: any) => void) {
  console.log('processing change ' + i);
  Cable.findOne({ number: change[0] }).exec((err, cable) => {
    if (err) {
      console.error(err.toString());
      callback(err);
      return;
    }

    if (!cable) {
      err = new Error('cannot find cable with id ' + change[0]);
      console.error(err.toString());
      callback(err);
      return;
    }

    const update: any = {};
    const updates: any[] = [];
    let multiChange = null;
    let conditionSatisfied = true;

    properties.forEach((p, index) => {
      const currentType = Cable.schema.path(p);
      if (!currentType) {
        err = new Error('cable does not have path "' + p + '"');
        console.error(err.toString());
        callback(err);
        return;
      }

      if (change[2 * index + 1] !== '_whatever_') {
        try {
          change[2 * index + 1] = (currentType as any).cast(change[2 * index + 1]);
        } catch (e) {
          console.error(e.toString());
          callback(e);
          return;
        }
      }

      try {
        change[2 * index + 2] = (currentType as any).cast(change[2 * index + 2]);
      } catch (e) {
        console.error(e.toString());
        callback(e);
        return;
      }

      let currentValue = cable.get(p);
      switch (p) {
      case 'basic.tags':
        if (Array.isArray(change[2 * index + 1])) {
          change[2 * index + 1] = change[2 * index + 1].join();
        }
        if (Array.isArray(change[2 * index + 2])) {
          change[2 * index + 2] = change[2 * index + 2].join();
        }
        currentValue = currentValue ? currentValue.join() : '';
        break;
      case 'status':
        change[2 * index + 1] = parseInt(change[2 * index + 1], 10);
        change[2 * index + 2] = parseInt(change[2 * index + 2], 10);
      }

      // Work around to ensure that date objects are properly compared.
      if (currentValue instanceof Date) {
        if (change[2 * index + 1] instanceof Date
            && change[2 * index + 1].getTime() === currentValue.getTime()) {
          change[2 * index + 1] = currentValue;
        }
        if (change[2 * index + 2] instanceof Date
            && change[2 * index + 2].getTime() === currentValue.getTime()) {
          change[2 * index + 2] = currentValue;
        }
      }

      if (change[2 * index + 1] === '_whatever_' || currentValue === change[2 * index + 1]) {
        if (change[2 * index + 2] !== currentValue) {
          // tslint:disable:max-line-length
          if ([undefined, null, ''].indexOf(change[2 * index + 2]) !== -1 && [undefined, null, ''].indexOf(currentValue) !== -1) {
            // do nothing
          } else {
            if (p === 'basic.tags') {
              update[p] = splitTags(change[2 * index + 2]);
            } else {
              update[p] = change[2 * index + 2];
            }
            updates.push({
              property: p,
              oldValue: cable.get(p),
              newValue: update[p],
            });
          }
        }
      } else {
        console.error('Error: cable ' + cable.number + ' ' + p + ' is ' + cable.get(p) + ', expect ' + change[2 * index + 1]);
        conditionSatisfied = false;
      }
    });

    if (!conditionSatisfied) {
      err = new Error('conditions not satisfied for cable ' + cable.number);
      console.error(err.toString());
      callback(err);
      return;
    }

    if (updates.length <= 0) {
      console.log('cable ' + cable.number + ' will not be updated (no changes)');
      callback();
      return;
    }

    update.updatedOn = Date.now();
    update.updatedBy = 'system';
    update.$inc = {
      __v: 1,
    };

    if (cfg.dryrun !== false && cfg.dryrun !== 'false') {
      console.log('cable ' + cable.number + ' will be updated with ' + JSON.stringify(update, null, 2));
      callback();
      return;
    }

    multiChange = new MultiChange({
      cableName: cable.number,
      updates: updates,
      updatedBy: 'system',
      updatedOn: Date.now(),
    });

    multiChange.save((err1, c) => {
      if (err1) {
        console.error(err1.toString());
        callback(err1);
        return;
      }

      update.$push = {
        changeHistory: c._id,
      };

      cable.updateOne(update, { new: true }, (err2) => {
        if (err2) {
          console.error(err2.toString());
          callback(err2);
          return;
        }
        console.log('cable ' + cable.number + ' was updated with ' + JSON.stringify(update, null, 2));
        callback(null);
      });
    });
  });

}

parser = csv({
  trim: true,
});

parser.on('readable', () => {
  let record = parser.read();
  let i;

  while (record) {
    line += 1;
    console.log('read ' + line + ' lines ...');
    if (line === 1) {
      if (record[0] !== 'number') {
        console.error('Error: first column must be number');
        process.exit(1);
      }
      for (i = 1; i < record.length; i += 1) {
        if (i % 2 === 1) {
          // empty columns
          if (record[i].length === 0) {
            break;
          }
          properties.push(record[i]);
        }
      }
    } else if (record[0].length === 9) {
      changes.push(record);
    }
    record = parser.read();
  }
});

parser.on('error', (err: any) => {
  console.error(err.toString());
  process.exit(1);
});

parser.on('finish', () => {
  console.log('Finished parsing the csv file at ' + Date.now());
  console.log('Starting to apply changes.');
  changes.forEach((change, index) => {
    updateCable(change, index, (err) => {
      done += 1;
      if (done === changes.length) {
        mongoose.disconnect();
      }
    });
  });
});

fs.createReadStream(realPath).pipe(parser);
