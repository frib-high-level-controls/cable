#!/usr/bin/env node

/**
 * @fileOverview Read a csv file with cable type change details and apply them to mongoDB.
 * @author Dong Liu
 */

/*eslint max-depth: [2, 10]*/

var csv = require('csv');

var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var CableType = require('../model/meta.js').CableType;
var program = require('commander');

var inputPath;
var realPath;
var db;
var line = 0;
var changes = [];
var parser;
var properties = [];

program.version('0.0.1')
  .option('-d, --dryrun', 'dry run')
  .arguments('<source>')
  .action(function (source) {
    inputPath = source;
  });

program.parse(process.argv);

if (inputPath === undefined) {
  console.error('need the input source csv file path!');
  process.exit(1);
}

realPath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(realPath)) {
  console.error(realPath + ' does not exist.');
  console.error('Please input a valid csv file path.');
  process.exit(1);
}

mongoose.connect('mongodb://localhost/cable_frib');
db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('db connected');
});

function updateType(change, i) {
  console.log('processing change ' + i);
  CableType.findOne({
    name: change[0]
  }).exec(function (err, type) {
    if (err) {
      console.error(err);
    } else {
      if (!type) {
        console.error('cannot find cable type with name ' + change[0]);
        return;
      }

      var update = {};
      var needed = false;

      properties.forEach(function (p, index) {
        if (type.get(p) === change[2 * index + 1] || change[2 * index + 1] === '_whatever_') {
          if (change[2 * index + 2] !== type.get(p)) {
            if ([undefined, null, ''].indexOf(change[2 * index + 2]) !== -1 && [undefined, null, ''].indexOf(type.get(p)) !== -1) {
              // do nothing
            } else {
              update[p] = change[2 * index + 2];
              needed = true;
            }
          }
        } else {
          console.log('cable type ' + type.name + ' ' + p + ' is ' + type.get(p) + ', expect ' + change[2 * index + 1]);
        }
      });

      if (needed) {
        update.updatedOn = Date.now();
        update.updatedBy = 'system';
        update.$inc = {
          __v: 1
        };
        if (program.dryrun) {
          console.log('cable type ' + type.name + ' will be updated with ' + JSON.stringify(update, null, 2));
        } else {
          type.update(update, {
            new: true
          }, function (err2) {
            if (err2) {
              console.error(err2);
            } else {
              console.log('cable type ' + type.name + ' was updated with ' + JSON.stringify(update, null, 2));
            }
          });
        }
      } else {
        console.error('no changes for cable type ' + type.name);
      }
    }
  });

}

parser = csv.parse({
  trim: true
});

parser.on('readable', function () {
  var record = parser.read();
  var i;

  while (record) {
    line += 1;
    console.log('read ' + line + ' lines ...');
    if (line === 1) {
      if (record[0] !== 'name') {
        console.log('the first column should be type name');
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
    } else if (record[0].length > 9) {
      changes.push(record);
    }
    record = parser.read();
  }
});

parser.on('error', function (err) {
  console.log(err.message);
});

parser.on('finish', function () {
  console.log('Finished parsing the csv file at ' + Date.now());
  console.log('Starting to apply changes.');
  changes.forEach(function (change, index) {
    updateType(change, index);
  });
});

fs.createReadStream(realPath).pipe(parser);

// keep running until the user interrupts
process.stdin.resume();
