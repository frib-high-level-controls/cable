/*global moment: false, sysSub: false, JSONPath: false, window: false*/

function formatCableStatus(s) {
  var status = {
    '100': 'approved',
    '101': 'ordered',
    '102': 'received',
    '103': 'accepted',
    '200': 'to install',
    '201': 'labeled',
    '202': 'bench terminated',
    '203': 'bench tested',
    '249': 'to pull',
    '250': 'pulled',
    '251': 'field terminated',
    '252': 'field tested',
    '300': 'working',
    '400': 'failed',
    '501': 'not needed'
  };
  if (status[s.toString()]) {
    return status[s.toString()];
  }
  return 'unknown';
}

function formatDateLong(date) {
  return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '';
}

function formatDateShort(date) {
  return date ? moment(date).format('YYYY-MM-DD') : '';
}

function history(found) {
  var i, t, output = '';
  if (found.length > 0) {
    for (i = 0; i < found.length; i += 1) {
      t = JSONPath({}, template, '$.' + found[i].property);
      if( (t.length > 0) && (typeof(t[0].h) === 'function') ) {
        output = output + 'changed to <strong>' + t[0].h(found[i].newValue) + '</strong> from <strong>' + t[0].h(found[i].oldValue) + '</strong> by <strong>' + found[i].updatedBy + '</strong> on <strong>' + formatDateLong(found[i].updatedOn) + '</strong>; ';
      } else {
        output = output + 'changed to <strong>' + found[i].newValue + '</strong> from <strong>' + found[i].oldValue + '</strong> by <strong>' + found[i].updatedBy + '</strong> on <strong>' + formatDateLong(found[i].updatedOn) + '</strong>; ';
      }
    }
  }
  return output;
}

var template = {
  request: {
    e: '$.request_id',
    l: function (v) {
      $('#request').prop('href', '/requests/' + v + '/');
      $('#request').text(v);
    }
  },
  version: {
    e: '$.__v',
    l: '#version'
  },
  status: {
    e: '$.status',
    t: formatCableStatus,
    l: '#status'
  },
  basic: {
    root: '$.basic',
    project: {
      e: '$.project',
      l: 'span[name="basic.project"]'
    },
    engineer: {
      e: '$.engineer',
      l: 'span[name="basic.engineer"]'
    },
    wbs: {
      e: '$.wbs',
      l: 'span[name="basic.wbs"]'
    },
    originCategory: {
      e: '$.originCategory',
      l: function (v) {
        $('span[name="basic.originCategory"]').text(v);
        $('span[name="originCategoryName"]').text(sysSub[v].name || 'unknown');
      }
    },
    originSubcategory: {
      e: '$.originSubcategory',
      l: function (v) {
        $('span[name="basic.originSubcategory"]').text(v);
        var cat = $('span[name="basic.originCategory"]').text();
        $('span[name="originSubcategoryName"]').text(sysSub[cat].subcategory[v] || 'unknown');
      }
    },
    signalClassification: {
      e: '$.signalClassification',
      l: function (v) {
        $('span[name="basic.signalClassification"]').text(v);
        var cat = $('span[name="basic.originCategory"]').text();
        $('span[name="signalClassificationName"]').text(sysSub[cat].signal[v].name || 'unknown');
      }
    },
    cableType: {
      e: '$.cableType',
      l: 'span[name="basic.cableType"]'
    },
    service: {
      e: '$.service',
      l: 'span[name="basic.service"]'
    },
    traySection: {
      e: '$.traySection',
      l: 'span[name="basic.traySection"]'
    },
    tags: {
      e: '$.tags',
      l: 'span[name="basic.tags"]'
    }
  },
  ownerProvided: {
    e: '$.ownerProvided',
    l: 'span[name="ownerProvided"]'
  },
  from: {
    root: '$.from',
    rack: {
      e: '$.rack',
      l: 'span[name="from.rack"]'
    },
    terminationDevice: {
      e: '$.terminationDevice',
      l: 'span[name="from.terminationDevice"]'
    },
    terminationType: {
      e: '$.terminationType',
      l: 'span[name="from.terminationType"]'
    },
    terminationPort: {
      e: '$.terminationPort',
      l: 'span[name="from.terminationPort"]'
    },
    wiringDrawing: {
      e: '$,wiringDrawing',
      l: 'span[name="from.wireDrawing"]'
    },
    readyForTerm: {
      e: '$.readyForTerm',
      l: 'span[name="from.readyForTerm"]'
    },
    terminatedOn: {
      e: '$.terminatedOn',
      l: function (v) {
        $('span[name="from.terminatedOn"]').text(formatDateShort(v[0]));
      },
      h: function (v) {
        return v ? formatDateShort(v) : 'null';
      }
    },
    terminatedBy: {
      e: '$.terminatedBy',
      l: 'span[name="from.terminatedBy"]'
    }
  },

  to: {
    root: '$.to',
    rack: {
      e: '$.rack',
      l: 'span[name="to.rack"]'
    },
    terminationDevice: {
      e: '$.terminationDevice',
      l: 'span[name="to.terminationDevice"]'
    },
    terminationType: {
      e: '$.terminationType',
      l: 'span[name="to.terminationType"]'
    },
    terminationPort: {
      e: '$.terminationPort',
      l: 'span[name="to.terminationPort"]'
    },
    wiringDrawing: {
      e: '$,wiringDrawing',
      l: 'span[name="to.wireDrawing"]'
    },
    readyForTerm: {
      e: '$.readyForTerm',
      l: 'span[name="to.readyForTerm"]'
    },
    terminatedOn: {
      e: '$.terminatedOn',
      l: function (v) {
        $('span[name="to.terminatedOn"]').text(formatDateShort(v[0]));
      },
      h: function (v) {
        return v ? formatDateShort(v) : 'null';
      }
    },
    terminatedBy: {
      e: '$.terminatedBy',
      l: 'span[name="to.terminatedBy"]'
    }
  },

  length: {
    e: '$.length',
    l: 'span[name="length"]'
  },
  conduit: {
    e: '$.conduit',
    l: 'span[name="conduit"]'
  },
  comments: {
    e: '$.comments',
    l: 'span[name="comments"]'
  },

  approvedBy: {
    e: '$.approvedBy',
    l: function (v) {
      $('#approvedBy').prop('href', '/users/' + v + '/');
      $('#approvedBy').text(v);
    }
  },
  approvedOn: {
    e: '$.approvedOn',
    l: function (v) {
      $('#approvedOn').text(formatDateLong(v[0]));
    }
  },

  submittedBy: {
    e: '$.submittedBy',
    l: function (v) {
      $('#submittedBy').prop('href', '/users/' + v + '/');
      $('#submittedBy').text(v);
    }
  },
  submittedOn: {
    e: '$.submittedOn',
    l: function (v) {
      $('#submittedOn').text(formatDateLong(v[0]));
    }
  },

  pulledBy: {
    e: '$.pulledBy',
    l: function (v) {
      $('#pulledBy').prop('href', '/users/' + v + '/');
      $('#pulledBy').text(v);
    }
  },
  pulledOn: {
    e: '$.pulledOn',
    l: function (v) {
      $('#pulledOn').text(formatDateLong(v[0]));
    }
  },

  installedBy: {
    e: '$.installedBy',
    l: function (v) {
      $('#installedBy').prop('href', '/users/' + v + '/');
      $('#installedBy').text(v);
    }
  },
  installedOn: {
    e: '$.installedOn',
    l: function (v) {
      $('#installedOn').text(formatDateLong(v[0]));
    }
  }
};

function jsonETL(json, template) {
  var prop, value;
  for (prop in template) {
    if (template.hasOwnProperty(prop)) {
      if (template[prop].root) {
        jsonETL(JSONPath({}, json, template[prop].root)[0], template[prop]);
      } else {
        value = JSONPath({}, json, template[prop].e);
        if (template[prop].t && typeof template[prop].t === 'function') {
          value = template[prop].t(value);
        }
        if (template[prop].l) {
          if (typeof template[prop].l === 'string') {
            $(template[prop].l).text(value);
          } else if (typeof template[prop].l === 'function') {
            template[prop].l(value);
          }
        }
      }
    }
  }
}


$(function () {
  $.ajax({
    url: document.location.pathname + '/json',
    type: 'GET',
    dataType: 'json'
  }).done(function (json) {
    jsonETL(json, template);
  }).fail(function (jqXHR, status, error) {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable details.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  }).always();

  $.ajax({
    url: document.location.pathname + '/changes/json',
    type: 'GET',
    dataType: 'json'
  }).done(function (json) {
    var changes = [];
    $.each(json, function (index, value) {
      if (value.hasOwnProperty('updates')) {
        $.each(value.updates, function (i, v) {
          v.updatedOn = value.updatedOn;
          v.updatedBy = value.updatedBy;
          changes.push(v);
        });
      } else {
        changes.push(value);
      }
    });
    $('span.property').each(function (index, element) {
      var found = changes.filter(function (e) {
        if (e.hasOwnProperty('property')) {
          return e.property === $(element).attr('name');
        }
        return false;
      });
      if (found.length) {
        if (found.length > 1) {
          found.sort(function (a, b) {
            if (a.updatedOn > b.updatedOn) {
              return -1;
            }
            return 1;
          });
        }
        $(element).closest('div').append('<div class="input-history alert alert-info"><b>history</b>: ' + history(found) + '</div>');
      }
    });
  }).fail(function (jqXHR, status, error) {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable change history.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  }).always();

  $('#show-history').click(function (e) {
    $('.input-history').show();
  });
  $('#hide-history').click(function (e) {
    $('.input-history').hide();
  });

});
