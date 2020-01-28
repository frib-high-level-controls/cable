/**
 * Common utilities for UI
 */
import * as $ from 'jquery';

import * as moment from 'moment';

type DateParam = string | number | Date | undefined;

type AutocompleteOptions = JQueryUI.AutocompleteOptions;

// From JQuery UI API documention (missing from the type definitions)
interface AutocompleteRequest  {
  term: string;
}

type AutocompleteResponse = (result: string[] | Array<{ label: string; value: string; }>) => void;

export function formatDate(date: DateParam) {
  return date ? moment(date).fromNow() : '';
}

export function formatDateLong(date: DateParam) {
  return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '';
}

export function formatDateShort(date: DateParam) {
  return date ? moment(date).format('YYYY-MM-DD') : '';
}

export function formatCableStatus(s: string | number) {
  const status: { [key: string]: string | undefined } = {
    100: 'approved',
    101: 'ordered',
    102: 'received',
    103: 'accepted',
    200: 'to install',
    201: 'labeled',
    202: 'bench terminated',
    203: 'bench tested',
    249: 'to pull',
    250: 'pulled',
    251: 'field terminated',
    252: 'field tested',
    300: 'working',
    400: 'failed',
    501: 'not needed',
  };
  return status[s.toString()] || 'unknown';
}

export function json2List(json: object) {
  let output = '<dl>';
  for (const k in json) {
    if (json.hasOwnProperty(k)) {
      //
      const v = (json as any)[k];
      if (typeof(v) === 'object') {
        output = output + '<dl>' + '<dt>' + k + '</dt>' + '<dd>' + json2List(v) + '</dd>' + '</dl>';
      } else {
        output = output + '<p><strong>' + k + '</strong> : ' + v + '</p>';
      }
    }
  }
  output = output + '</dl>';
  return output;
}

export function nameAuto(input: string, nameCache: any): AutocompleteOptions {
  return {
    minLength: 1,
    source: (req: AutocompleteRequest, res: AutocompleteResponse) => {
      const filter = (t: string, names: string[]) => {
          const output: string[] = [];
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
