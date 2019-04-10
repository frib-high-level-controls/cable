var fs = require('fs');
var csv = require('csv');

if (process.argv.length < 3) {
  console.error('usage: dump2pull.js input.csv [filter.txt]');
  process.exit(1);
}

try {
  var input = fs.openSync(process.argv[2], 'r');
} catch (err) {
  console.error(err);
  process.exit(1);
}

if (process.argv.length > 3) {
  try{
    var filter = fs.readFileSync(process.argv[3], 'UTF8').split('\n');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

var line = 0;

parser = csv.parse({
  trim: true
});

parser.on('readable', function () {
  var record = parser.read();

  if (line === 0) {
    console.log('number,status,,pulledOn,,pulledBy,');
  }

  while (record) {
    line += 1;
    //console.error('Line: ' + line + ' read');
    if ((line > 1 && !filter) || (line > 1 && filter.indexOf(record[0]) !== -1)) {
      if (record[2] === 'TRUE') {
        if (record[1] === '') {
          console.error('Line: ' + line + ': ' + record[0] + ': Installed without installation date');
        } else {
          console.log(record[0] + ', 250, 250, ' + record[1] + ', ' + record[1] + ', Shaw Electric, Shaw Electric');
        }
      }
    }

    record = parser.read();
  }
});

parser.on('error', function (err) {
  console.error(err.toString());
  process.exit(1);
});

parser.on('finish', function () {
  console.error('Finished parsing the csv file at ' + Date.now());
  process.exit();
});

fs.createReadStream('', { fd: input}).pipe(parser);
