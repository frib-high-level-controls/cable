var mongoose = require('mongoose');
var Request = require('../model/request.js').Request;
var Cable = mongoose.model('Cable');

mongoose.connect('mongodb://localhost/cable');

var newCable = new Cable({
  number: '21A000000',
  status: 0,
  request_id: 'test'
});
newCable.save(function(err, doc) {
  if (err && err.code) {
    console.dir(err);
  //   { [MongoError: E11000 duplicate key error index: cable.cables.$number_1  dup key: { : "21A000000" }]
  // name: 'MongoError',
  // err: 'E11000 duplicate key error index: cable.cables.$number_1  dup key: { : "21A000000" }',
  // code: 11000,
  // n: 0,
  // connectionId: 37,
  // ok: 1 }
  } else {
    console.log('21A000000 is saved.');
  }
});