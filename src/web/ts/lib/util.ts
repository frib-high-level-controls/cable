/**
 * Common utilities for UI
 */
import * as $ from 'jquery';


export function json2List(json: any) {
  let output = '<dl>';
  for (const k in json) {
    if (json.hasOwnProperty(k)) {
      if (typeof(json[k]) === 'object') {
        output = output + '<dl>' + '<dt>' + k + '</dt>' + '<dd>' + json2List(json[k]) + '</dd>' + '</dl>';
      } else {
        output = output + '<p><strong>' + k + '</strong> : ' + json[k] + '</p>';
      }
    }
  }
  output = output + '</dl>';
  return output;
}

export function nameAuto(input: any, nameCache: any) {
  return {
    minLength: 1,
    source: (req, res) => {
      const filter = (t: string, names: string[]) => {
          const output = [];
          for (const name of names) {
            if (name.toLowerCase().indexOf(t) === 0) {
              output.push(name);
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
      $.getJSON(basePath + '/adusernames', {term: key}, (data, status, xhr) => {
        const names = [];
        for (const d of data) {
          if (d.displayName.indexOf(',') !== -1) {
            names.push(d.displayName);
          }
        }
        nameCache[key] = names;
        res(filter(term, nameCache[key]));
      });
    },
    select(event, ui) {
      $(input).val(ui.item.value);
    },
  };
}
