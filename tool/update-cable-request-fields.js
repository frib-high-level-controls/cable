/**
 * @fileOverview read a csv file with updated field details and update all the docs in mongo.
 * @author Dong Liu
 */

var csv = require('csv');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Request = require('../model/request.js').Request;
var Cable = require('../model/request.js').Cable;
var Change = require('../model/request.js').Change;

var inputPath;
var realPath;
var db;
var line = 0;
var specLine = 0;
var spec = {};
var parser;
var cablesProcessed = 0;
var cablesToUpdate = 0;
var cablesUpdated = 0;
var cablesChecked = 0;
var requestsProcessed = 0;
var requestsToUpdate = 0;
var requestsUpdated = 0;
var requestsChecked = 0;

var dryrun = true;

if (process.argv.length === 3) {
  inputPath = process.argv[2];
} else {
  console.warn('needs exact one argument for the input csv file path');
  process.exit(1);
}

realPath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(realPath)) {
  console.warn(realPath + ' does not exist.');
  console.warn('Please input a valid csv file path.');
  process.exit(1);
}

mongoose.connect('mongodb://localhost/cable_frib');

db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
  console.log('db connected');
});

function requestsDone() {
  console.log(requestsChecked + ' requests were checked, ' + requestsToUpdate + ' requests need update, and ' + requestsUpdated + ' were updated.');
  if (dryrun) {
    console.log('Please note that this is a dryrun.');
  }
  console.log('Bye.');
  mongoose.connection.close();
}

function itemsAllChecked(total, processed, cb) {
  if (total === processed) {
    console.log(total + ' items are processed.');
    cb();
  }
}

function checkRequests() {
  Request.where('status').equals(1).exec(function (err, docs) {
    var current = 0;
    if (err) {
      console.error(err);
      requestsDone();
    } else {
      console.log('find ' + docs.length + ' requests in db.');
      docs.forEach(function (doc) {
        console.log('checking ' + (++current) + ' request with id ' + doc._id);
        var modified = 0;
        var update = {};
        if (!!doc.from.rack && spec.hasOwnProperty(doc.from.rack.trim())) {
          update['from.rack'] = spec[doc.from.rack.trim()];
          console.log('need to update request ' + doc._id + ' at from.rack');
          modified += 1;
        }
        if (!!doc.to.rack && spec.hasOwnProperty(doc.to.rack.trim())) {
          update['to.rack'] = spec[doc.to.rack.trim()];
          console.log('need to update request ' + doc._id + ' at to.rack');
          modified += 1;
        }
        requestsChecked += 1;
        if (modified > 0) {
          requestsToUpdate += 1;
        }
        if (dryrun) {
          requestsProcessed += 1;
          itemsAllChecked(docs.length, requestsProcessed, requestsDone);
        } else {
          if (modified > 0) {
            update.updatedOn = Date.now();
            update.updatedBy = 'system';
            doc.update(update, {
              new: true
            }, function (err, cable) {
              if (err) {
                console.error(err);
              } else {
                requestsUpdated += 1;
              }
              requestsProcessed += 1;
              itemsAllChecked(docs.length, requestsProcessed, requestsDone);
            });
          } else {
            requestsProcessed += 1;
            itemsAllChecked(docs.length, requestsProcessed, requestsDone);
          }
        }
      });
    }
  });
}

function cablesDone() {
  console.log(cablesChecked + ' cables were checked, ' + cablesToUpdate + ' cables need update, and ' + cablesUpdated + ' were updated.');
  console.log('Starting processing requests ...');
  checkRequests();
}

function checkCables() {
  Cable.where('status').gte(100).lte(199).exec(function (err, docs) {
    var current = 0;
    if (err) {
      console.error(err);
      cablesDone();
    } else {
      console.log('find ' + docs.length + ' cables in db.');
      docs.forEach(function (doc) {
        console.log('checking ' + (++current) + ' cable with id ' + doc._id);
        var update = {};
        var changes = [];
        var change;
        if (!!doc.from.rack && spec.hasOwnProperty(doc.from.rack.trim())) {
          update['from.rack'] = spec[doc.from.rack.trim()];
          change = {
            cableName: doc._id,
            property: 'from.rack',
            oldValue: doc.from.rack,
            newValue: spec[doc.from.rack.trim()],
            updatedBy: 'system',
            updatedOn: Date.now()
          };
          changes.push(change);
          console.log('need to update cable ' + doc._id + ' at from.rack');
        }
        if (!!doc.to.rack && spec.hasOwnProperty(doc.to.rack.trim())) {
          update['to.rack'] = spec[doc.to.rack.trim()];
          change = {
            cableName: doc._id,
            property: 'to.rack',
            oldValue: doc.to.rack,
            newValue: spec[doc.to.rack.trim()],
            updatedBy: 'system',
            updatedOn: Date.now()
          };
          changes.push(change);
          console.log('need to update cable ' + doc._id + ' at to.rack');
          // modified += 1;
        }
        cablesChecked += 1;
        if (changes.length > 0) {
          cablesToUpdate += 1;
        }
        if (dryrun) {
          cablesProcessed += 1;
          itemsAllChecked(docs.length, cablesProcessed, cablesDone);
        } else {
          if (changes.length > 0) {
            update.updatedOn = Date.now();
            update.updatedBy = 'system';
            update.$inc = {
              __v: 1
            };
            Change.create(changes, function (err, cs) {
              if (err) {
                console.error(err);
                cablesProcessed += 1;
                itemsAllChecked(docs.length, cablesProcessed, cablesDone);
              } else {
                var ids = cs.map(function (e) {
                  return e._id;
                });
                update.$push = {
                  changeHistory: {
                    $each: ids
                  }
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
                  itemsAllChecked(docs.length, cablesProcessed, cablesDone);
                });
              }
            });
          } else {
            cablesProcessed += 1;
            itemsAllChecked(docs.length, cablesProcessed, cablesDone);
          }
        }
      });
    }
  });
}

function specParsed() {
  console.log(specLine + ' spec lines are parsed.');
  console.log('Starting processing cables ...');
  checkCables();
}


parser = csv.parse();

parser.on('readable', function () {
  var record;
  do {
    record = parser.read();
    if (!!record) {
      line += 1;
      // console.log('read ' + line + ' line of the spec ...');
      if (record[0].indexOf(':') !== -1) {
        spec[record[0]] = record[1];
        specLine += 1;
      }
    }
  } while (!!record);
});

parser.on('error', function (err) {
  console.log(err.message);
});

parser.on('finish', function () {
  specParsed();
});

fs.createReadStream(realPath).pipe(parser);

// keep running until the user interrupts
process.stdin.resume();