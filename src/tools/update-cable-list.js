#!/usr/bin/env node

/**
 * @fileOverview update all the items according to a simple spec
 * @author Dong Liu
 */

/*jslint es5: true*/

var fs = require('fs');
var path = require('path');

var mongoose = require('mongoose');
var Cable = require('../model/request.js').Cable;
var MultiChange = require('../model/request.js').MultiChange;

var program = require('commander');

var inputPath;
var realPath;
var db;
var spec;

program.version('0.0.1')
  .option('-d, --dryrun', 'dryrun')
  .arguments('<spec>')
  .action(function (p) {
    inputPath = p;
  });

program.parse(process.argv);

if (inputPath === undefined) {
  console.error('need the input json spec file path!');
  process.exit(1);
}

realPath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(realPath)) {
  console.error(realPath + ' does not exist.');
  console.error('Please input a valid spec file path.');
  process.exit(1);
}

spec = require(realPath);

if (!spec.condition.status) {
  spec.condition.status = {
    $gte: 100,
    $lte: 299
  };
}

console.log(JSON.stringify(spec, null, 2));

mongoose.connect('mongodb://localhost/cable_frib');
db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('db connected');
});

function checkCables() {
  console.log('Starting processing cables ...');
  Cable.find(spec.condition).exec(function (err, docs) {
    if (err) {
      console.error(err);
    } else {
      console.log('find ' + docs.length + ' cables to update.');
      docs.forEach(function (doc) {
        var update = {};
        var updates = [];
        var index;
        spec.updates.forEach(function (u) {
          if (u.oldValue === '_whatever_') {
            update[u.property] = u.newValue;
            updates.push({
              property: u.property,
              oldValue: doc.get(u.property),
              newValue: u.newValue
            });
          } else {
            index = u.oldValue.indexOf(doc.get(u.property));
            if (index !== -1) {
              update[u.property] = u.newValue[index];
              updates.push({
                property: u.property,
                oldValue: u.oldValue[index],
                newValue: u.newValue[index]
              });
            }
          }
        });
        var multiChange;
        if (updates.length > 0) {
          multiChange = new MultiChange({
            cableName: doc.number,
            updates: updates,
            updatedBy: 'system',
            updatedOn: Date.now()
          });
        }

        if (multiChange) {
          update.updatedOn = Date.now();
          update.updatedBy = 'system';
          update.$inc = {
            __v: 1
          };
          if (program.dryrun) {
            console.log('cable ' + doc.number + ' will be updated with ' + JSON.stringify(update, null, 2));
          } else {
            multiChange.save(function (err1, c) {
              if (err) {
                console.error(err1);
              } else {
                update.$push = {
                  changeHistory: c._id
                };
                doc.update(update, {
                  new: true
                }, function (err2) {
                  if (err2) {
                    console.error(err2);
                  } else {
                    console.log('cable ' + doc.number + ' was updated with ' + JSON.stringify(update, null, 2));
                  }
                });
              }
            });
          }
        } else {
          console.log('cable ' + doc.number + ' has no property to update');
        }
      });
    }
  });
}

checkCables();

// keep running until the user interrupts
process.stdin.resume();
