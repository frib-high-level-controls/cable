var csv = require('csv');
var fs = require('fs');
var path = require('path');

var fileName;
if (process.argv.length == 3) {
  fileName = process.argv[2];
} else {
  // console.log(process.argv.length);
  console.warn('only needs one arguments');
  return;
}

var filePath = path.normalize(__dirname+'/'+fileName);

// console.log(filePath);

if (!fs.existsSync(filePath)) {
  return console.warn(filePath + ' does not exist');
}


var stream = fs.createReadStream(filePath);
var object = {};
csv()
  .from.stream(stream)
  .on('record', function(row, index) {
    if (index == 0) {
      object.number = '';
      object.name = row[0];
      object.children = [];
      return;
    }
    var room = {};
    room.number = row[0];
    room.name = row[1];
    object.children.push(room);
  })
  .on('end', function(count){
    console.log(JSON.stringify(object));
  })
  .on('error', function(error){
    console.log(error.message);
  });

