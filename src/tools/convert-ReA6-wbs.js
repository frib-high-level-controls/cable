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
  // return console.warn(filePath + ' does not exist');
}


var stream = fs.createReadStream(filePath);
var object = {};
var output = [object];
var level = 0;
csv()
  .from.stream(stream)
  .on('record', function(row, index) {
    var currentLevel = countLevel(row[0]);
    // console.log(row[1]);
    // console.log(level);
    // console.log(currentLevel);
    // console.log(object);
    // if (currentLevel == 0) {
    if (currentLevel == 1) {
      object.name = row[1];
      object.number = row[0];
      object.children = [];
      output.push(object);
      level = currentLevel;
      return;
    }
    if (currentLevel > level) {
      // in children
      object = object.children[object.children.push({})-1];
      object.name = row[1];
      object.number = row[0];
      object.children = [];
      output.push(object);
      level = currentLevel;
      return;
    }
    if (currentLevel == level) {
      // in the same object
      output.pop();
      object = output[output.length -1];
      object = object.children[object.children.push({})-1];
      object.name = row[1];
      object.number = row[0];
      object.children = [];
      output.push(object);
      level = currentLevel;
      return;
    }
    if (currentLevel < level) {
      // pop until it is on the same level
      do {
        output.pop();
      } while (countLevel(output[output.length -1].number) >= currentLevel);
      object = output[output.length -1];
      object = object.children[object.children.push({})-1];
      object.name = row[1];
      object.number = row[0];
      object.children = [];
      output.push(object);
      level = currentLevel;
      return;
    }
  })
  .on('end', function(count){
    console.log(JSON.stringify(output[1]));
  })
  .on('error', function(error){
    console.log(error.message);
  });


function countLevel(number) {
  var matches = number.match(/\./g);
  if (matches) {
    return matches.length;
  }
  return 0;
}