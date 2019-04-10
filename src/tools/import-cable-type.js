/**
 * @fileOverview read a csv file with cable type details and insert the cable types in mongo.
 * @author Dong Liu
 */

var csv = require('csv'),
  fs = require('fs'),
  path = require('path'),
  mongoose = require('mongoose'),
  CableType = require('../model/meta.js').CableType;

var inputPath, realPath, db, line = 0,
  types = [],
  parser, processed = 0,
  success = 0;

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

function createType(types, i) {
  CableType.create({
    name: types[i][4] + 'C_' + types[i][5] + '_' + types[i][6] + '_' + types[i][1],
    service: types[i][3],
    conductorNumber: types[i][4],
    conductorSize: types[i][5],
    fribType: types[i][6],
    typeNumber: types[i][1],
    pairing: types[i][7],
    shielding: types[i][8],
    outerDiameter: types[i][9],
    voltageRating: types[i][10],
    raceway: types[i][11],
    tunnelHotcell: (types[i][12] === 'yes'),
    otherRequirements: types[i][13],
    createdBy: 'system',
    createdOn: Date.now()
  }, function (err, doc) {
    processed += 1;
    if (err) {
      console.log(err);
    } else {
      success += 1;
      console.log('New type created with id: ' + doc.id);
    }
    if (processed === types.length) {
      console.log(processed + ' types were processed, and ' + success + ' types were inserted. Bye.');
      mongoose.connection.close();
      process.exit();
    }
  });
}


parser = csv.parse();

parser.on('readable', function () {
  var record;
  do {
    record = parser.read();
    if (!!record) {
      line += 1;
      console.log('read ' + line + ' lines ...');
      if (record.length > 2 && record[1].length === 3) {
        types.push(record);
      }
    }
  } while (!!record);
});

parser.on('error', function (err) {
  console.log(err.message);
});

parser.on('finish', function () {
  var i;
  for (i = 0; i < types.length; i += 1) {
    createType(types, i);
  }
});

fs.createReadStream(realPath).pipe(parser);
