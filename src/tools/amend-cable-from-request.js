/**
 * @fileOverview read a csv file with cable request details and insert them into mongo.
 * @author Dong Liu
 */

var fs = require('fs'),
  path = require('path'),
  mongoose = require('mongoose'),
  Request = require('../model/request.js').Request,
  Cable = require('../model/request.js').Cable;


var checked = 0,
  updated = 0;


if (process.argv.length !== 2) {
  console.warn('do not need parameters');
  process.exit(1);
}

mongoose.connect('mongodb://localhost/cable_frib');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
  console.log('db connected');
});

function jobDone() {
  console.log(checked + ' cables were checked, and ' + updated + ' were updated. Bye.');
  mongoose.connection.close();
  process.exit();
}

function checkCables() {
  Cable.find({}).exec(function (err, docs) {
    var current = 0;
    if (err) {
      console.error(err);
      jobDone();
    } else {
      console.log('find ' + docs.length + 'cables in db');
      docs.forEach(function (doc) {
        console.log('checking ' + current++ + ' cable with id ' + doc._id);
        Request.findById(doc.request_id).exec(function (err, request) {
          var modified = false;
          if (err) {
            console.error(err);
            jobDone();
          } else {
            if (doc['length'] !== request['length']) {
              doc['length'] = request['length'];
              console.log('update cable ' + doc._id + ' at length');
              modified = true;
            }
            if (doc.conduit !== request.conduit) {
              doc.conduit = request.conduit;
              console.log('update cable ' + doc._id + ' at conduit');
              modified = true;
            }
            if (modified === true) {
              doc.save(function (err, newDoc) {
                if (err) {
                  console.log('cable ' + doc._id + ' cannot be saved');
                  console.error(err);
                  // jobDone();
                } else {
                  updated += 1;
                }
              });
            }
            checked += 1;
            if (checked === docs.length) {
              jobDone();
            }
          }
        });
      });
    }
  });
}

checkCables();
