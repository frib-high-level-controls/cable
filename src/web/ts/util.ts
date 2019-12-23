export function json2List(json) {
  let output = '<dl>';
  for (const k in json) {
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

export function nameAuto(input, nameCache) {
  return {
    minLength: 1,
    source: function(req, res) {
      const filter = function (term, names) {
          let i, output = [];
          for (i=0; i<names.length; i+=1) {
            if (names[i].toLowerCase().indexOf(term) === 0) {
              output.push(names[i]);
            }
          }
          return output;
      };
      const term = req.term.toLowerCase();
      const key = term.charAt(0);
      if (key in nameCache) {
        res(filter(term, nameCache[key]));
        return;
      }
      $.getJSON(basePath + '/adusernames', {term: key}, function(data, status, xhr) {
        const names = [];
        for (let i = 0; i < data.length; i += 1) {
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