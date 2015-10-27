#!/usr/bin/env node

/**
 * @fileOverview update a field according to a simple spec
 * @author Dong Liu
 */

/*jslint es5: true*/

var fs = require('fs');
var path = require('path');

var mongoose = require('mongoose');
var Request = require('../model/request.js').Request;
var Cable = require('../model/request.js').Cable;
var Change = require('../model/request.js').Change;

var program = require('commander');

var inputPath;
var realPath;
var db;
var spec;
var cablesProcessed = 0;
var cablesUpdated = 0;
var requestsProcessed = 0;
var requestsUpdated = 0;

program.version('0.0.1')
  .option('-d, --dryrun', 'dryrun')
  .option('-c, --cable', 'update cables according to the spec')
  .option('-r, --request', 'update request according to the spec')
  .arguments('<spec>')
  .action(function (spec) {
    inputPath = spec;
  });

program.parse(process.argv);

if (program.cable && program.request) {
  console.log('please choose one option either -c or -r');
  process.exit(1);
}

if (!program.cable && !program.request) {
  console.log('please choose either -c or -r');
  process.exit(1);
}

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

console.log(spec);

if (program.cable) {
  if (!spec.condition.status) {
    spec.condition.status = {
      $gte: 100,
      $lte: 199
    };
  }
}

if (program.request) {
  if (!spec.condition.status) {
    spec.condition.status = 1;
  }
}

console.log(spec);

mongoose.connect('mongodb://localhost/cable_frib');
db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('db connected');
});

function allDone() {
  if (program.dryrun) {
    console.log('Please note that this is a dryrun.');
  }
  if (program.request) {
    console.log(requestsUpdated + ' were updated.');
  }
  if (program.cable) {
    console.log(cablesUpdated + ' were updated.');
  }
  mongoose.connection.close();
  console.log('Bye.');
}

function itemsAllChecked(total, processed, cb) {
  if (total === processed) {
    console.log(total + ' items are processed.');
    if (cb) {
      cb();
    }
  }
}

function checkRequests() {
  console.log('Starting processing requests ...');
  Request.find(spec.condition).exec(function (err, docs) {
    var current = 0;
    if (err) {
      console.error(err);
    } else {
      console.log('find ' + docs.length + ' requests to process for the condition.');
      docs.forEach(function (doc) {
        console.log('processing ' + (++current) + ' request with id ' + doc._id);
        var update = {};
        if (program.dryrun) {
          requestsProcessed += 1;
          itemsAllChecked(docs.length, requestsProcessed, allDone);
        } else {
          update.updatedOn = Date.now();
          update.updatedBy = 'system';
          update.$inc = {
            __v: 1
          };
          doc.update(update, {
            new: true
          }, function (err, request) {
            if (err) {
              console.error(err);
            } else {
              requestsUpdated += 1;
            }
            requestsProcessed += 1;
            itemsAllChecked(docs.length, requestsProcessed, allDone);
          });
        }
      });
    }
  });
}

function checkCables() {
  console.log('Starting processing cables ...');
  Cable.find(spec.condition).exec(function (err, docs) {
    var current = 0;
    if (err) {
      console.error(err);
    } else {
      console.log('find ' + docs.length + ' cables for the condition.');
      if (!program.dryrun) {
        docs.forEach(function (doc) {
          console.log('updating ' + (++current) + ' cable with id ' + doc._id);
          var change = new Change({
            cableName: doc.number,
            property: spec.change.field_name,
            oldValue: spec.change.from_value,
            newValue: spec.change.to_value,
            updatedBy: 'system',
            updatedOn: Date.now()
          });
          var update = {};
          update[spec.change.field_name] = spec.change.to_value;
          if (!!change) {
            update.updatedOn = Date.now();
            update.updatedBy = 'system';
            update.$inc = {
              __v: 1
            };
            change.save(function (err, c) {
              if (err) {
                console.error(err);
                cablesProcessed += 1;
                itemsAllChecked(docs.length, cablesProcessed, allDone);
              } else {
                update.$push = {
                  changeHistory: c._id
                };
                doc.update(update, {
                  new: true
                }, function (err, cable) {
                  if (err) {
                    console.error(err);
                  } else {
                    cablesUpdated += 1;
                  }
                  cablesProcessed += 1;
                  itemsAllChecked(docs.length, cablesProcessed, allDone);
                });
              }
            });
          } else {
            cablesProcessed += 1;
            itemsAllChecked(docs.length, cablesProcessed, allDone);
          }
        });
      }
    }
  });
}


if (program.request) {
  checkRequests();
}

if (program.cable) {
  checkCables();
}

// keep running until the user interrupts
process.stdin.resume();
