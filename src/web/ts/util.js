function json2List(json) {
  var output = '<dl>';
  for (var k in json) {
    if (json.hasOwnProperty(k)) {
      if (typeof(json[k]) == 'object') {
        output = output + '<dl>' + '<dt>' + k + '</dt>' + '<dd>' + json2List(json[k]) + '</dd>' + '</dl>';
      } else {
        output = output + '<p><strong>' + k + '</strong> : ' + json[k] + '</p>';
      }
    }
  }
  output = output + '</dl>';
  return output;
}

function nameAuto(input, nameCache){
  return {
    minLength: 1,
    source: function(req, res) {
      var filter = function (term, names) {
          var i, output = [];
          for (i=0; i<names.length; i+=1) {
            if (names[i].toLowerCase().indexOf(term) === 0) {
              output.push(names[i]);
            }
          }
          return output;
      };
      var term = req.term.toLowerCase();
      var key = term.charAt(0);
      if (key in nameCache) {
        res(filter(term, nameCache[key]));
        return;
      }
      $.getJSON(basePath + '/adusernames', {term: key}, function(data, status, xhr) {
        var names = [];
        for (var i = 0; i < data.length; i += 1) {
          if (data[i].displayName.indexOf(',') !== -1) {
            names.push(data[i].displayName);
          }
        }
        nameCache[key] = names;
        res(filter(term, nameCache[key]));
      });
    },
    select: function(event, ui) {
      $(input).val(ui.item.value);
    }
  };
}