/*global moment:false*/
// table functions

function addEvents() {
  $('tbody').on('click', 'input.select-row', function (e) {
    if ($(this).prop('checked')) {
      $(e.target).closest('tr').addClass('row-selected');
    } else {
      $(e.target).closest('tr').removeClass('row-selected');
    }
  });

  $('tfoot').on('keyup', 'input', function (e) {
    var table = $(this).closest('table');
    var th = $(this).closest('th');
    table.dataTable().fnFilter(this.value, $('tfoot th', table).index(th));

  });
}

function formatDate(date) {
  return date ? moment(date).fromNow() : '';
}

function formatDateLong(date) {
  return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '';
}

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
    '500': 'aborted'
  };
  if (status[s.toString()]) {
    return status[s.toString()];
  }
  return 'unknown';
}


function dateColumn(title, key) {
  return {
    sTitle: title,
    mData: function (source, type, val) {
      if (type === 'sort') {
        // return formatDateLong(source[key]);
        return source[key];
      }
      return formatDate(source[key]);
    },
    sDefaultContent: ''
  };
}

function personColumn(title, key) {
  return {
    sTitle: title,
    mData: key,
    sDefaultContent: '',
    mRender: function (data, type, full) {
      return '<a href = "/users/' + data + '" target="_blank">' + data + '</a>';
    },
    bFilter: true
  };
}

function createNullArray(size) {
  var out = [],
    i;
  for (i = 0; i < size; i += 1) {
    out.push(null);
  }
  return out;
}



function fnWrap(oTableLocal) {
  $(oTableLocal.fnSettings().aoData).each(function () {
    $(this.nTr).removeClass('nowrap');
  });
  oTableLocal.fnAdjustColumnSizing();
}

function fnUnwrap(oTableLocal) {
  $(oTableLocal.fnSettings().aoData).each(function () {
    $(this.nTr).addClass('nowrap');
  });
  oTableLocal.fnAdjustColumnSizing();
}



function fnGetSelected(oTableLocal, selectedClass) {
  var aReturn = [],
    i;
  var aTrs = oTableLocal.fnGetNodes();

  for (i = 0; i < aTrs.length; i++) {
    if ($(aTrs[i]).hasClass(selectedClass)) {
      aReturn.push(aTrs[i]);
    }
  }
  return aReturn;
}

function fnDeselect(oTableLocal, selectedClass, checkboxClass) {
  var aTrs = oTableLocal.fnGetNodes(),
    i;

  for (i = 0; i < aTrs.length; i++) {
    if ($(aTrs[i]).hasClass(selectedClass)) {
      $(aTrs[i]).removeClass(selectedClass);
      $(aTrs[i]).find('input.' + checkboxClass + ':checked').prop('checked', false);
    }
  }
}

function fnSelectAll(oTableLocal, selectedClass, checkboxClass, filtered) {
  fnDeselect(oTableLocal, selectedClass, checkboxClass);
  var settings = oTableLocal.fnSettings();
  var indexes = (filtered === true) ? settings.aiDisplay : settings.aiDisplayMaster;
  indexes.forEach(function (i) {
    var r = oTableLocal.fnGetNodes(i);
    $(r).addClass(selectedClass);
    $(r).find('input.' + checkboxClass).prop('checked', true);
  });
}

function fnSetDeselect(nTr, selectedClass, checkboxClass) {
  if ($(nTr).hasClass(selectedClass)) {
    $(nTr).removeClass(selectedClass);
    $(nTr).find('input.' + checkboxClass + ':checked').prop('checked', false);
  }
}

function fnSetColumnsVis(oTableLocal, columns, show) {
  columns.forEach(function (e, i, a) {
    oTableLocal.fnSetColumnVis(e, show);
  });
}

function fnAddFilterFoot(sTable, aoColumns) {
  var tr = $('<tr role="row">');
  aoColumns.forEach(function (c) {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.sTitle + '" style="width:80%;" autocomplete="off"></th>');
    } else {
      tr.append('<th></th>');
    }
  });
  $(sTable).append($('<tfoot>').append(tr));
}

$.fn.dataTableExt.oApi.fnAddDataAndDisplay = function (oSettings, aData) {
  /* Add the data */
  var iAdded = this.oApi._fnAddData(oSettings, aData);
  var nAdded = oSettings.aoData[iAdded].nTr;

  /* Need to re-filter and re-sort the table to get positioning correct, not perfect
   * as this will actually redraw the table on screen, but the update should be so fast (and
   * possibly not alter what is already on display) that the user will not notice
   */
  this.oApi._fnReDraw(oSettings);

  /* Find it's position in the table */
  var iPos = -1;
  var i, iLen;
  for (i = 0, iLen = oSettings.aiDisplay.length; i < iLen; i++) {
    if (oSettings.aoData[oSettings.aiDisplay[i]].nTr === nAdded) {
      iPos = i;
      break;
    }
  }

  /* Get starting point, taking account of paging */
  if (iPos >= 0) {
    oSettings._iDisplayStart = (Math.floor(i / oSettings._iDisplayLength)) * oSettings._iDisplayLength;
    this.oApi._fnCalculateEnd(oSettings);
  }

  this.oApi._fnDraw(oSettings);
  return {
    "nTr": nAdded,
    "iPos": iAdded
  };
};

$.fn.dataTableExt.oApi.fnDisplayRow = function (oSettings, nRow) {
  // Account for the "display" all case - row is already displayed
  if (oSettings._iDisplayLength === -1) {
    return;
  }

  // Find the node in the table
  var iPos = -1;
  var i, iLen;
  for (i = 0, iLen = oSettings.aiDisplay.length; i < iLen; i++) {
    if (oSettings.aoData[oSettings.aiDisplay[i]].nTr === nRow) {
      iPos = i;
      break;
    }
  }

  // Alter the start point of the paging display
  if (iPos >= 0) {
    oSettings._iDisplayStart = (Math.floor(i / oSettings._iDisplayLength)) * oSettings._iDisplayLength;
    this.oApi._fnCalculateEnd(oSettings);
  }

  this.oApi._fnDraw(oSettings);
};



// global cable variables

var selectColumn = {
  sTitle: '',
  sDefaultContent: '<label class="checkbox"><input type="checkbox" class="select-row"></label>',
  sSortDataType: 'dom-checkbox',
  asSorting: ['desc', 'asc']
};

var idColumn = {
  sTitle: '',
  mData: '_id',
  bVisible: false
};

var editLinkColumn = {
  sTitle: '',
  mData: '_id',
  mRender: function (data, type, full) {
    return '<a href="requests/' + data + '" target="_blank"><i class="fa fa-edit fa-lg"></i></a>';
  },
  bSortable: false
};

var detailsLinkColumn = {
  sTitle: '',
  mData: '_id',
  mRender: function (data, type, full) {
    return '<a href="requests/' + data + '/details" target="_blank"><i class="fa fa-file-text-o fa-lg"></i></a>';
  },
  bSortable: false
};

var createdOnColumn = dateColumn('Created', 'createdOn');

var updatedOnColumn = dateColumn('Updated', 'updatedOn');

var submittedOnColumn = dateColumn('Submitted', 'submittedOn');
var submittedByColumn = personColumn('Submitted by', 'submittedBy');

var approvedOnColumn = dateColumn('Approved', 'approvedOn');
var approvedByColumn = personColumn('Approved by', 'approvedBy');

var rejectedOnColumn = dateColumn('Rejected', 'rejectedOn');
var rejectedByColumn = personColumn('Rejected by', 'rejectedBy');

var commentsColumn = {
  sTitle: 'Comments',
  sDefaultContent: '',
  mData: 'comments',
  bFilter: true
};

var basicColumns = [{
  sTitle: 'project',
  sDefaultContent: '',
  mData: 'basic.project',
  bFilter: true
}, {
  sTitle: 'WBS',
  sDefaultContent: '',
  mData: 'basic.wbs',
  bFilter: true
}, {
  sTitle: 'Category',
  sDefaultContent: '',
  mData: function (source, type, val) {
    return (source.basic.originCategory || '?') + (source.basic.originSubcategory || '?') + (source.basic.signalClassification || '?');
  },
  bFilter: true
}, {
  sTitle: 'Cable type',
  sDefaultContent: '',
  mData: 'basic.cableType',
  bFilter: true
}, {
  sTitle: 'Engineer',
  sDefaultContent: '',
  mData: 'basic.engineer',
  bFilter: true
}, {
  sTitle: 'Function',
  sDefaultContent: '',
  mData: 'basic.service',
  bFilter: true
}, {
  sTitle: 'Tags',
  sDefaultContent: '',
  mData: function (source, type, val) {
    if (source.basic.tags) {
      return source.basic.tags.join();
    }
    return '';
  },
  bFilter: true
}, {
  sTitle: 'Quantity',
  sDefaultContent: '',
  mData: 'basic.quantity',
  bFilter: true
}];
var fromColumns = [{
  sTitle: 'From rack',
  sDefaultContent: '',
  mData: 'from.rack',
  bFilter: true
}, {
  sTitle: 'termination device',
  sDefaultContent: '',
  mData: 'from.terminationDevice',
  bFilter: true
}, {
  sTitle: 'termination type',
  sDefaultContent: '',
  mData: 'from.terminationType',
  bFilter: true
}, {
  sTitle: 'wiring drawing',
  sDefaultContent: '',
  mData: 'from.wiringDrawing',
  bFilter: true
}];

var toColumns = [{
  sTitle: 'To rack',
  sDefaultContent: '',
  mData: 'to.rack',
  bFilter: true
}, {
  sTitle: 'termination device',
  sDefaultContent: '',
  mData: 'to.terminationDevice',
  bFilter: true
}, {
  sTitle: 'termination type',
  sDefaultContent: '',
  mData: 'to.terminationType',
  bFilter: true
}, {
  sTitle: 'wiring drawing',
  sDefaultContent: '',
  mData: 'to.wiringDrawing',
  bFilter: true
}];

var conduitColumn = {
  sTitle: 'Conduit',
  sDefaultContent: '',
  mData: 'conduit',
  bFilter: true
};

var numberColumn = {
  sTitle: 'Number',
  mData: 'number',
  mRender: function (data, type, full) {
    return '<a href="cables/' + data + '" target="_blank">' + data + '</a>';
  },
  bFilter: true
};

var statusColumn = {
  sTitle: 'Status',
  // mData: 'status',
  // mRender: function(data, type, full) {
  //   return formatCableStatus(data);
  // },
  mData: function (source, type, val) {
    return formatCableStatus(source.status);
  },
  bFilter: true
};

var requiredColumn = {
  sTitle: 'Required',
  mData: function (source, type, val) {
    if (source.required) {
      var result = [],
        i;
      for (i in source.required) {
        if (source.required.hasOwnProperty(i) && source.required[i]) {
          result.push(i);
        }
      }
      return result.join();
    }
    return '';
  },
  bFilter: true
};

var typeColumns = [{
  sTitle: 'Name',
  mData: 'name',
  bFilter: true
}, {
  sTitle: 'Service',
  mData: 'service',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Conductor number',
  mData: 'conductorNumber',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Conductor size',
  mData: 'conductorSize',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Type',
  mData: 'fribType',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Pairing',
  mData: 'pairing',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Shielding',
  mData: 'shielding',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Outer Diameter',
  mData: 'outerDiameter',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Voltage Rating',
  mData: 'voltageRating',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Raceway',
  mData: 'raceway',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Tunnel/Hotcell',
  mData: 'tunnelHotcell',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Other Requirements',
  mData: 'otherRequirements',
  sDefaultContent: '',
  bFilter: true
}];

var oTableTools = {
  "sSwfPath": "/datatables/swf/copy_csv_xls_pdf.swf",
  "aButtons": [
    "copy",
    "print", {
      "sExtends": "collection",
      "sButtonText": 'Save <span class="caret" />',
      "aButtons": ["csv", "xls", "pdf"]
    }
  ]
};

var sDom = "<'row-fluid'<'span6'<'control-group'T>>><'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";
