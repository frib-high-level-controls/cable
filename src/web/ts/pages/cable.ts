/**
 * Cable details page
 */
import './base';

import * as $ from 'jquery';

import { JSONPath } from 'jsonpath-plus';

import {
  formatCableStatus,
  formatDateLong,
  formatDateShort,
} from '../lib/util';

interface TransformLeaf {
  e: string;
  l: string | ((v: any) => void);
  t?: (v: any) => string;
  h?: (v: any) => string;
}

interface TransformGroup {
  [key: string]: TransformLeaf | string;
  root: string;
}

interface TransformRoot {
  [key: string]: TransformGroup | TransformLeaf;
}

function isTransformGroup(t: TransformGroup | TransformLeaf | string): t is TransformGroup {
  return  (typeof (t as TransformGroup).root === 'string');
}

function isTransformLeaf(t: TransformGroup | TransformLeaf | string): t is TransformLeaf {
  return (typeof (t as TransformLeaf).e === 'string');
}


const TRANSFORMS: TransformRoot = {
  request: {
    e: '$.request_id',
    l: (v) => {
      $('#request').prop('href', basePath + '/requests/' + v);
      $('#request').text(v);
    },
  },
  version: {
    e: '$.__v',
    l: '#version',
  },
  status: {
    e: '$.status',
    t: formatCableStatus,
    l: '#status',
  },
  basic: {
    root: '$.basic',
    project: {
      e: '$.project',
      l: 'span[name="basic.project"]',
    },
    engineer: {
      e: '$.engineer',
      l: 'span[name="basic.engineer"]',
    },
    wbs: {
      e: '$.wbs',
      l: 'span[name="basic.wbs"]',
    },
    originCategory: {
      e: '$.originCategory',
      l: (v) => {
        $('span[name="basic.originCategory"]').text(v);
        $('span[name="originCategoryName"]').text((window as any).sysSub[v].name || 'unknown');
      },
    },
    originSubcategory: {
      e: '$.originSubcategory',
      l: (v) => {
        $('span[name="basic.originSubcategory"]').text(v);
        const cat = $('span[name="basic.originCategory"]').text();
        $('span[name="originSubcategoryName"]').text((window as any).sysSub[cat].subcategory[v] || 'unknown');
      },
    },
    signalClassification: {
      e: '$.signalClassification',
      l: (v) => {
        $('span[name="basic.signalClassification"]').text(v);
        const cat = $('span[name="basic.originCategory"]').text();
        $('span[name="signalClassificationName"]').text((window as any).sysSub[cat].signal[v].name || 'unknown');
      },
    },
    cableType: {
      e: '$.cableType',
      l: 'span[name="basic.cableType"]',
    },
    service: {
      e: '$.service',
      l: 'span[name="basic.service"]',
    },
    traySection: {
      e: '$.traySection',
      l: 'span[name="basic.traySection"]',
    },
    tags: {
      e: '$.tags',
      l: 'span[name="basic.tags"]',
    },
  },
  ownerProvided: {
    e: '$.ownerProvided',
    l: 'span[name="ownerProvided"]',
  },
  from: {
    root: '$.from',
    rack: {
      e: '$.rack',
      l: 'span[name="from.rack"]',
    },
    terminationDevice: {
      e: '$.terminationDevice',
      l: 'span[name="from.terminationDevice"]',
    },
    terminationType: {
      e: '$.terminationType',
      l: 'span[name="from.terminationType"]',
    },
    terminationPort: {
      e: '$.terminationPort',
      l: 'span[name="from.terminationPort"]',
    },
    wiringDrawing: {
      e: '$.wiringDrawing',
      l: 'span[name="from.wireDrawing"]',
    },
    readyForTerm: {
      e: '$.readyForTerm',
      l: 'span[name="from.readyForTerm"]',
    },
    terminatedOn: {
      e: '$.terminatedOn',
      l: (v) => {
        $('span[name="from.terminatedOn"]').text(formatDateShort(v[0]));
      },
      h: (v) => {
        return v ? formatDateShort(v) : 'null';
      },
    },
    terminatedBy: {
      e: '$.terminatedBy',
      l: 'span[name="from.terminatedBy"]',
    },
  },
  to: {
    root: '$.to',
    rack: {
      e: '$.rack',
      l: 'span[name="to.rack"]',
    },
    terminationDevice: {
      e: '$.terminationDevice',
      l: 'span[name="to.terminationDevice"]',
    },
    terminationType: {
      e: '$.terminationType',
      l: 'span[name="to.terminationType"]',
    },
    terminationPort: {
      e: '$.terminationPort',
      l: 'span[name="to.terminationPort"]',
    },
    wiringDrawing: {
      e: '$.wiringDrawing',
      l: 'span[name="to.wireDrawing"]',
    },
    readyForTerm: {
      e: '$.readyForTerm',
      l: 'span[name="to.readyForTerm"]',
    },
    terminatedOn: {
      e: '$.terminatedOn',
      l: (v) => {
        $('span[name="to.terminatedOn"]').text(formatDateShort(v[0]));
      },
      h: (v) => {
        return v ? formatDateShort(v) : 'null';
      },
    },
    terminatedBy: {
      e: '$.terminatedBy',
      l: 'span[name="to.terminatedBy"]',
    },
  },
  length: {
    e: '$.length',
    l: 'span[name="length"]',
  },
  conduit: {
    e: '$.conduit',
    l: 'span[name="conduit"]',
  },
  comments: {
    e: '$.comments',
    l: 'span[name="comments"]',
  },
  approvedBy: {
    e: '$.approvedBy',
    l: (v) => {
      $('#approvedBy').prop('href', '/users/' + v + '/');
      $('#approvedBy').text(v);
    },
  },
  approvedOn: {
    e: '$.approvedOn',
    l: (v) => {
      $('#approvedOn').text(formatDateLong(v[0]));
    },
  },
  submittedBy: {
    e: '$.submittedBy',
    l: (v) => {
      $('#submittedBy').prop('href', '/users/' + v + '/');
      $('#submittedBy').text(v);
    },
  },
  submittedOn: {
    e: '$.submittedOn',
    l: (v) => {
      $('#submittedOn').text(formatDateLong(v[0]));
    },
  },
  pulledBy: {
    e: '$.pulledBy',
    l: (v) => {
      $('#pulledBy').prop('href', '/users/' + v + '/');
      $('#pulledBy').text(v);
    },
  },
  pulledOn: {
    e: '$.pulledOn',
    l: (v) => {
      $('#pulledOn').text(formatDateLong(v[0]));
    },
  },
  installedBy: {
    e: '$.installedBy',
    l: (v) => {
      $('#installedBy').prop('href', '/users/' + v + '/');
      $('#installedBy').text(v);
    },
  },
  installedOn: {
    e: '$.installedOn',
    l: (v) => {
      $('#installedOn').text(formatDateLong(v[0]));
    },
  },
};


function history(found: any[]) {
  let output = '';
  if (found.length > 0) {
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < found.length; i += 1) {
      const t = JSONPath({ json: TRANSFORMS, path: '$.' + found[i].property });
      if ((t.length > 0) && (typeof(t[0].h) === 'function')) {
        // tslint:disable-next-line:max-line-length
        output = output + 'changed to <strong>' + t[0].h(found[i].newValue) + '</strong> from <strong>' + t[0].h(found[i].oldValue) + '</strong> by <strong>' + found[i].updatedBy + '</strong> on <strong>' + formatDateLong(found[i].updatedOn) + '</strong>; ';
      } else {
        output = output + 'changed to <strong>' + found[i].newValue + '</strong> from <strong>' + found[i].oldValue + '</strong> by <strong>' + found[i].updatedBy + '</strong> on <strong>' + formatDateLong(found[i].updatedOn) + '</strong>; ';
      }
    }
  }
  return output;
}

function jsonETL(json: any, transforms: TransformRoot | TransformGroup) {
  for (const prop in transforms) {
    if (transforms.hasOwnProperty(prop)) {
      const transform = transforms[prop];
      if (isTransformGroup(transform)) {
        jsonETL(JSONPath({ json: json, path: transform.root })[0], transform);
      } else if (isTransformLeaf(transform)) {
        let value = JSONPath({ json: json, path: transform.e });
        if (transform.t && typeof transform.t === 'function') {
          value = transform.t(value);
        }
        if (transform.l) {
          if (typeof transform.l === 'string') {
            $(transform.l).text(value);
          } else if (typeof transform.l === 'function') {
            transform.l(value);
          }
        }
      }
    }
  }
}


$(() => {
  $.ajax({
    url: document.location.pathname + '/json',
    type: 'GET',
    dataType: 'json',
  }).done((json) => {
    jsonETL(json, TRANSFORMS);
  }).fail((jqXHR, status, error) => {
    $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>Cannot reach the server for cable details.</div>');
    const offset = $('#message div:last-child').offset();
    if (offset) {
      $(window).scrollTop(offset.top - 40);
    }
  });

  $.ajax({
    url: document.location.pathname + '/changes/json',
    type: 'GET',
    dataType: 'json',
  }).done((json) => {
    const changes: webapi.Change[] = [];
    $.each(json as Array<webapi.Change | webapi.MultiChange>, (index, value) => {
      if (value.hasOwnProperty('updates')) {
        // If object has an 'updates' property then assert it is a MultiChange
        $.each((value as webapi.MultiChange).updates!, (i, v) => {
          changes.push({
            cableName: value.cableName,
            updatedOn: value.updatedOn,
            updatedBy: value.updatedBy,
            property: v.property,
            oldValue: v.oldValue,
            newValue: v.newValue,
          });
        });
      } else {
        // Otherwise assert it is a simple Change
        changes.push(value as webapi.Change);
      }
    });
    $('span.property').each((index, element) => {
      const found = changes.filter((e) => {
        if (e.hasOwnProperty('property')) {
          return e.property === $(element).attr('name');
        }
        return false;
      });
      if (found.length) {
        if (found.length > 1) {
          found.sort((a, b) => {
            if (a.updatedOn && b.updatedOn && a.updatedOn > b.updatedOn) {
              return -1;
            }
            return 1;
          });
        }
        // tslint:disable-next-line:max-line-length
        $(element).closest('div').append('<div class="input-history alert alert-info"><b>history</b>: ' + history(found) + '</div>');
      }
    });
  }).fail((jqXHR, status, error) => {
    $('#message').append('<div class="alert alert-error"><button type="button", class="close" data-dismiss="alert">x</button>Cannot reach the server for cable change history.</div>');
    const offset = $('#message div:last-child').offset();
    if (offset) {
      $(window).scrollTop(offset.top - 40);
    }
  });

  $('#show-history').click((e) => {
    $('.input-history').show();
  });

  $('#hide-history').click((e) => {
    $('.input-history').hide();
  });
});
