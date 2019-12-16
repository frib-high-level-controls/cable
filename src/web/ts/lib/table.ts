/*global moment:false*/
// table functions


import 'datatables.net-bs4';

import * as $ from 'jquery';

import * as moment from 'moment';


export function selectEvent() {
  $('tbody').on('click', 'input.select-row', function (e) {
    if ($(this).prop('checked')) {
      $(e.target).closest('tr').removeClass('row-highlighted');
      $(e.target).closest('tr').addClass('row-selected');
    } else {
      $(e.target).closest('tr').removeClass('row-selected');
    }
  });
}

export function tabShownEvent() {
  $('a[data-toggle="tab"]').on('shown', function () {
    var table = $.fn.DataTable().tables(true);
    if (table.length > 0) {
      $(table).DataTable().columns.adjust();
    }
  });
}

export function highlightedEvent() {
  $('tbody').on('click', 'td', function (e) {
    if (!$(e.target).closest('tr').hasClass('row-selected') && !$(e.target).hasClass('select-row') && !$(e.target).is('a') && !$(e.target).is('i')) {
      if ($(e.target).closest('tr').hasClass('row-highlighted')) {
        $(e.target).closest('tr').removeClass('row-highlighted');
      } else {
        $(e.target).closest('tr').addClass('row-highlighted');
      }
    }
  });
}


export function filterEvent(opt?: any) {
  opt = opt || {}
  opt.selectedClass = opt.selectedClass || 'row-selected';
  opt.checkboxClass = opt.checkboxClass || 'select-row'
  $('.filter').on('change', 'input', function (e) {
    var bodyTable;
    var tableScroll = $(this).closest('.dataTables_scroll');
    if (tableScroll.length) {
      bodyTable = $(this).closest('.dataTables_scroll').find('.dataTables_scrollBody table');
    } else {
      bodyTable = $(this).closest('table');
    }
    var th = $(this).closest('th');
    var filter = $(this).closest('.filter');
    var index;
    var table = $(this).closest('table');
    var wrapper;
    if (tableScroll.length) {
      wrapper = tableScroll;
    } else {
      wrapper = table;
    }
    if (filter.is('thead')) {
      index = $('thead.filter th', table).index(th);
      $('tfoot.filter th:nth-child(' + (index + 1) + ') input', wrapper).val(this.value);
    } else {
      index = $('tfoot.filter th', table).index(th);
      $('thead.filter th:nth-child(' + (index + 1) + ') input', wrapper).val(this.value);
    }
    fnDeselect(bodyTable.dataTable(), opt.selectedClass, opt.checkboxClass);
    bodyTable.dataTable().fnFilter(this.value, index);
    var scrollDiv;
    if ($(this).closest('.table-overflow').length) {
      scrollDiv = $(this).closest('.table-overflow')[0];
      if ($(this).offset().left > $(scrollDiv).offset().left + $(scrollDiv).width()) {
        $(scrollDiv).scrollLeft($(this).offset().left - $(scrollDiv).width());
      }
    }
  });
}

function formatDate(date) {
  return date ? moment(date).fromNow() : '';
}

function formatDateLong(date) {
  return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '';
}

function formatDateShort(date) {
  return date ? moment(date).format('YYYY-MM-DD') : '';
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
    '501': 'not needed'
  };
  if (status[s.toString()]) {
    return status[s.toString()];
  }
  return 'unknown';
}


function dateColumn(title, key, long?: any) {
  return {
    sTitle: title,
    mData: function (source, type, val) {
      if (type === 'sort') {
        // return formatDateLong(source[key]);
        return source[key];
      }
      if (long) {
        return formatDateLong(source[key]);
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
      return '<a href = "' + basePath + '/users/' + data + '" target="_blank">' + data + '</a>';
    },
    bFilter: true
  };
}

function personNameColumn(title, key) {
  return {
    sTitle: title,
    mData: key,
    sDefaultContent: '',
    mRender: function (data, type, full) {
      return '<a href = "' + basePath + '/usernames/' + data + '" target="_blank">' + data + '</a>';
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



export function fnWrap(oTableLocal) {
  $(oTableLocal.rows().nodes()).each((idx, row) => {
    $(row).removeClass('nowrap');
  });
}

export function fnUnwrap(oTableLocal) {
  $(oTableLocal.rows().nodes()).each((idx, cell) => {
    $(cell).addClass('nowrap');
  });
}



export function fnGetSelected(oTableLocal, selectedClass) {
  var aReturn = [],
    i;
  var aTrs = oTableLocal.rows().nodes();

  for (i = 0; i < aTrs.length; i++) {
    if ($(aTrs[i]).hasClass(selectedClass)) {
      aReturn.push(aTrs[i]);
    }
  }
  return aReturn;
}

export function fnDeselect(oTableLocal, selectedClass, checkboxClass) {
  var aTrs = oTableLocal.rows().nodes(),
    i;

  for (i = 0; i < aTrs.length; i++) {
    if ($(aTrs[i]).hasClass(selectedClass)) {
      $(aTrs[i]).removeClass(selectedClass);
      $(aTrs[i]).find('input.' + checkboxClass + ':checked').prop('checked', false);
    }
  }
}

export function fnSelectAll(oTableLocal, selectedClass, checkboxClass, current) {
  var rows;
  var i;
  if (current) {
    rows = oTableLocal.$('tr', {
      'page':'current',
      // If 'current' is given then the
      // following two options are forced:
      // 'filter':'applied' and 'order':'current'
    });
  } else {
    rows = oTableLocal.$('tr');
  }

  for (i = 0; i < rows.length; i += 1) {
    $(rows[i]).addClass(selectedClass);
    $(rows[i]).find('input.' + checkboxClass).prop('checked', true);
  }
}

export function fnSetDeselect(nTr, selectedClass, checkboxClass) {
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

export function fnAddFilterFoot(sTable, aoColumns) {
  var tr = $('<tr role="row">');
  aoColumns.forEach(function (c) {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.sTitle + '" style="width:80%;" autocomplete="off"></th>');
    } else {
      tr.append('<th></th>');
    }
  });
  $(sTable).append($('<tfoot class="filter">').append(tr));
}

function fnAddFilterHead(sTable, aoColumns) {
  var tr = $('<tr role="row">');
  aoColumns.forEach(function (c) {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.sTitle + '" style="width:80%;" autocomplete="off"></th>');
    } else {
      tr.append('<th></th>');
    }
  });
  $(sTable).append($('<thead class="filter">').append(tr));
}

export function fnAddFilterHeadScroll(sTable, aoColumns) {
  var tr = $('<tr role="row">');
  aoColumns.forEach(function (c) {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.sTitle + '" style="width:80%;" autocomplete="off"></th>');
    } else {
      tr.append('<th></th>');
    }
  });
  $(sTable + '_wrapper').find('.dataTables_scrollHead table').append($('<thead class="filter">').append(tr));
}

// $.fn.DataTable().fnAddDataAndDisplay = function (oSettings, aData) {
//   /* Add the data */
//   var iAdded = this.oApi._fnAddData(oSettings, aData);
//   var nAdded = oSettings.aoData[iAdded].nTr;

//   /* Need to re-filter and re-sort the table to get positioning correct, not perfect
//     * as this will actually redraw the table on screen, but the update should be so fast (and
//     * possibly not alter what is already on display) that the user will not notice
//     */
//   this.oApi._fnReDraw(oSettings);

//   /* Find it's position in the table */
//   var iPos = -1;
//   var i, iLen;
//   for (i = 0, iLen = oSettings.aiDisplay.length; i < iLen; i++) {
//     if (oSettings.aoData[oSettings.aiDisplay[i]].nTr === nAdded) {
//       iPos = i;
//       break;
//     }
//   }

//   /* Get starting point, taking account of paging */
//   if (iPos >= 0) {
//     oSettings._iDisplayStart = (Math.floor(i / oSettings._iDisplayLength)) * oSettings._iDisplayLength;
//     this.oApi._fnCalculateEnd(oSettings);
//   }

//   this.oApi._fnDraw(oSettings);
//   return {
//     "nTr": nAdded,
//     "iPos": iAdded
//   };
// };

// $.fn.dataTableExt.oApi.fnDisplayRow = function (oSettings, nRow) {
//   // Account for the "display" all case - row is already displayed
//   if (oSettings._iDisplayLength === -1) {
//     return;
//   }

//   // Find the node in the table
//   var iPos = -1;
//   var i, iLen;
//   for (i = 0, iLen = oSettings.aiDisplay.length; i < iLen; i++) {
//     if (oSettings.aoData[oSettings.aiDisplay[i]].nTr === nRow) {
//       iPos = i;
//       break;
//     }
//   }

//   // Alter the start point of the paging display
//   if (iPos >= 0) {
//     oSettings._iDisplayStart = (Math.floor(i / oSettings._iDisplayLength)) * oSettings._iDisplayLength;
//     this.oApi._fnCalculateEnd(oSettings);
//   }

//   this.oApi._fnDraw(oSettings);
// };



// global cable variables

export const selectColumn = {
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

export const editLinkColumn = {
  sTitle: '',
  mData: '_id',
  mRender: function (data, type, full) {
    return '<a href="' + basePath + '/requests/' + data + '" target="_blank"><i class="fa fa-edit fa-lg"></i></a>';
  },
  bSortable: false
};

export const detailsLinkColumn = {
  sTitle: '',
  mData: '_id',
  mRender: function (data, type, full) {
    return '<a href="' + basePath + '/requests/' + data + '/details" target="_blank"><i class="fa fa-file-alt fa-lg"></i></a>';
  },
  bSortable: false
};

export const createdOnColumn = dateColumn('Created', 'createdOn');

export const updatedOnColumn = dateColumn('Updated', 'updatedOn');
export const updatedOnLongColumn = dateColumn('Updated', 'updatedOn', true);

export const submittedOnColumn = dateColumn('Submitted', 'submittedOn');
var submittedOnLongColumn = dateColumn('Submitted', 'submittedOn', true);
export const submittedByColumn = personColumn('Submitted by', 'submittedBy');

export const approvedOnColumn = dateColumn('Approved', 'approvedOn');
export const approvedOnLongColumn = dateColumn('Approved', 'approvedOn', true);
export const approvedByColumn = personColumn('Approved by', 'approvedBy');

export const rejectedOnColumn = dateColumn('Rejected', 'rejectedOn');
var rejectedOnLongColumn = dateColumn('Rejected', 'rejectedOn', true);
export const rejectedByColumn = personColumn('Rejected by', 'rejectedBy');

var obsoletedOnColumn = dateColumn('Obsoleted', 'obsoletedOn');
export const obsoletedOnLongColumn = dateColumn('Obsoleted', 'obsoletedOn', true);
export const obsoletedByColumn = personColumn('Obsoleted by', 'obsoletedBy');

export const commentsColumn = {
  sTitle: 'Comments',
  sDefaultContent: '',
  mData: 'comments',
  sClass: 'editable',
  bFilter: true
};

export const lengthColumn = {
  sTitle: 'Length(ft)',
  sDefaultContent: '',
  mData: 'length',
  sClass: 'editable',
  sParseType: 'number',
  bFilter: true
};

export const versionColumn = {
  sTitle: 'version',
  sDefaultContent: 0,
  mData: '__v',
  bFilter: true
}

export const ownerProvidedColumn = {
  sTitle: 'Owner provided',
  sDefaultContent: false,
  mData: 'ownerProvided',
  sClass: 'editable',
  sParseType: 'boolean',
  bFilter: true
}

export const basicColumns = [{
  sTitle: 'Project',
  sDefaultContent: '',
  mData: 'basic.project',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'WBS',
  sDefaultContent: '',
  mData: 'basic.wbs',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'Category',
  sDefaultContent: '',
  mData: function (source, type, val) {
    return (source.basic.originCategory || '?') + (source.basic.originSubcategory || '?') + (source.basic.signalClassification || '?');
  },
  bFilter: true
}, {
  sTitle: 'Tray section',
  sDefaultContent: '',
  mData: 'basic.traySection',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'Cable type',
  sDefaultContent: '',
  mData: 'basic.cableType',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'Engineer',
  sDefaultContent: '',
  mData: 'basic.engineer',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'Function',
  sDefaultContent: '',
  mData: 'basic.service',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'Tags',
  sDefaultContent: '',
  mData: 'basic.tags',
  mRender: function (data, type, full) {
    if (data) {
      return data.join();
    }
    return '';
  },
  // mParser: function (sRendered) {
  //   return s ? s.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*,\s*/) : [];
  // },
  sParseType: 'array',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'Quantity',
  sDefaultContent: '',
  mData: 'basic.quantity',
  bFilter: true
}];

export const fromColumns = [{
  sTitle: 'From location',
  sDefaultContent: '',
  mData: 'from.rack',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'From termination device',
  sDefaultContent: '',
  mData: 'from.terminationDevice',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'From termination type',
  sDefaultContent: '',
  mData: 'from.terminationType',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'From termination port',
  sDefaultContent: '',
  mData: 'from.terminationPort',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'From wiring drawing',
  sDefaultContent: '',
  mData: 'from.wiringDrawing',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'From ready for termination',
  sDefaultContent: false,
  mData: 'from.readyForTerm',
  sClass: 'editable',
  sParseType: 'boolean',
  bFilter: true
}, {
  sTitle: 'From terminated on',
  sDefaultContent: '',
  mData: function (source, type, val) {
    if( source.from && source.from.terminatedOn ) {
      if( type === 'sort' ) {
        return source.from.terminatedOn;
      } else {
        return formatDateShort(source.from.terminatedOn);
      }
    }
    return '';
  },
  sClass: 'editable',
  bFilter: true
}, {
    sTitle: 'From terminated by',
    sDefaultContent: '',
    mData: 'from.terminatedBy',
    sClass: 'editable',
    bFilter: true
}];

export const toColumns = [{
  sTitle: 'To location',
  sDefaultContent: '',
  mData: 'to.rack',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'To termination device',
  sDefaultContent: '',
  mData: 'to.terminationDevice',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'To termination type',
  sDefaultContent: '',
  mData: 'to.terminationType',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'To termination port',
  sDefaultContent: '',
  mData: 'to.terminationPort',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'To wiring drawing',
  sDefaultContent: '',
  mData: 'to.wiringDrawing',
  sClass: 'editable',
  bFilter: true
}, {
  sTitle: 'To ready for termination',
  sDefaultContent: false,
  mData: 'to.readyForTerm',
  sClass: 'editable',
  sParseType: 'boolean',
  bFilter: true
}, {
  sTitle: 'To terminated on',
  sDefaultContent: '',
  mData: function (source, type, val) {
    if( source.to && source.to.terminatedOn ) {
      if( type === 'sort' ) {
        return source.to.terminatedOn;
      } else {
        return formatDateShort(source.to.terminatedOn);
      }
    }
    return '';
  },
  sClass: 'editable',
  bFilter: true
}, {
    sTitle: 'To terminated by',
    sDefaultContent: '',
    mData: 'to.terminatedBy',
    sClass: 'editable',
    bFilter: true
}];

export const conduitColumn = {
  sTitle: 'Conduit',
  sDefaultContent: '',
  mData: 'conduit',
  sClass: 'editable',
  bFilter: true
};

export const numberColumn = {
  sTitle: 'Number',
  mData: 'number',
  mRender: function (data, type, full) {
    return '<a href="' + basePath + '/cables/' + data + '/" target="_blank">' + data + '</a>';
  },
  bFilter: true
};

export const requestNumberColumn = {
  sTitle: 'Request',
  mData: 'request_id',
  mRender: function (data, type, full) {
    return '<a href="' + basePath + '/requests/' + data + '/" target="_blank">' + data + '</a>';
  },
  bFilter: true
};

export const statusColumn = {
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

export const requiredColumn = {
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
  sTitle: 'Manufacturer',
  mData: 'manufacturer',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Part number',
  mData: 'partNumber',
  sDefaultContent: '',
  bFilter: true
}, {
  sTitle: 'Other Requirements',
  mData: 'otherRequirements',
  sDefaultContent: '',
  bFilter: true
}];

/*user columns*/

var useridColumn = personColumn('User id', 'adid');

var fullNameNoLinkColumn = {
  sTitle: 'Full name',
  mData: 'name',
  sDefaultContent: '',
  bFilter: true
};

var rolesColumn = {
  sTitle: 'Roles',
  mData: 'roles',
  // sDefaultContent: '',
  mRender: function (data, type, full) {
    if (data) {
      return data.join();
    }
    return '';
  },
  bFilter: true
};

var wbsColumn = {
  sTitle: 'WBS',
  mData: function (source) {
    if (source.wbs) {
      return source.wbs.join();
    }
    return '';
  },
  bFilter: true
};

var lastVisitedOnColumn = dateColumn('Last visited', 'lastVisitedOn');


/*table buttons*/

export const sButtons = [
  'copy', 'print', 'csv', 'excel',
  // Dropdown menu does not appear for unknown reason!
  // {
  //   extend: 'collection',
  //   text: 'Save',
  //   buttons: [ 'csv', 'excel' ],
  // },
];

var sDom = "<'row-fluid'<'span6'<'control-group'T>>><'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";
var sDom2i = "<'row-fluid'<'span6'<'control-group'T>>><'row-fluid'<'span3'l><'span3'i><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";
export const sDom2InoF = '<"d-flex"<"form-inline mr-auto p-2"<l>><"p-2"B>>rt<"d-flex"<"mr-auto p-2"i><"p-2"p>>';
var sDom2i1p = "<'row-fluid'<'span6'<'control-group'T>>><'row-fluid'<'span3'l><'span3'i><'span3'r><'span3'f>>t<'row-fluid'<'span6'i><'span6'p>>";
var sDomNoTools = "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";
var sDomNoLength = "<'row-fluid'<'span6'<'control-group'T>><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";

/**
 * By default DataTables only uses the sAjaxSource variable at initialisation
 * time, however it can be useful to re-read an Ajax source and have the table
 * update. Typically you would need to use the `fnClearTable()` and
 * `fnAddData()` functions, however this wraps it all up in a single function
 * call.
 *
 * DataTables 1.10 provides the `dt-api ajax.url()` and `dt-api ajax.reload()`
 * methods, built-in, to give the same functionality as this plug-in. As such
 * this method is marked deprecated, but is available for use with legacy
 * version of DataTables. Please use the new API if you are used DataTables 1.10
 * or newer.
 *
 *  @name fnReloadAjax
 *  @summary Reload the table's data from the Ajax source
 *  @author [Allan Jardine](http://sprymedia.co.uk)
 *  @deprecated
 *
 *  @param {string} [sNewSource] URL to get the data from. If not give, the
 *    previously used URL is used.
 *  @param {function} [fnCallback] Callback that is executed when the table has
 *    redrawn with the new data
 *  @param {boolean} [bStandingRedraw=false] Standing redraw (don't changing the
 *      paging)
 *
 *  @example
 *    var table = $('#example').dataTable();
 *
 *    // Example call to load a new file
 *    table.fnReloadAjax( 'media/examples_support/json_source2.txt' );
 *
 *    // Example call to reload from original file
 *    table.fnReloadAjax();
 */

// jQuery.fn.dataTableExt.oApi.fnReloadAjax = function (oSettings, sNewSource, fnCallback, bStandingRedraw) {
//   // DataTables 1.10 compatibility - if 1.10 then `versionCheck` exists.
//   // 1.10's API has ajax reloading built in, so we use those abilities
//   // directly.
//   if (jQuery.fn.dataTable.versionCheck) {
//     var api = new jQuery.fn.dataTable.Api(oSettings);

//     if (sNewSource) {
//       api.ajax.url(sNewSource).load(fnCallback, !bStandingRedraw);
//     } else {
//       api.ajax.reload(fnCallback, !bStandingRedraw);
//     }
//     return;
//   }

//   if (sNewSource !== undefined && sNewSource !== null) {
//     oSettings.sAjaxSource = sNewSource;
//   }

//   // Server-side processing should just call fnDraw
//   if (oSettings.oFeatures.bServerSide) {
//     this.fnDraw();
//     return;
//   }

//   this.oApi._fnProcessingDisplay(oSettings, true);
//   var that = this;
//   var iStart = oSettings._iDisplayStart;
//   var aData = [];

//   this.oApi._fnServerParams(oSettings, aData);

//   oSettings.fnServerData.call(oSettings.oInstance, oSettings.sAjaxSource, aData, function (json) {
//     /* Clear the old information from the table */
//     that.oApi._fnClearTable(oSettings);

//     /* Got the data - add it to the table */
//     var aData = (oSettings.sAjaxDataProp !== "") ? that.oApi._fnGetObjectDataFn(oSettings.sAjaxDataProp)(json) : json;
//     var i;
//     for (i = 0; i < aData.length; i++) {
//       that.oApi._fnAddData(oSettings, aData[i]);
//     }

//     oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();

//     that.fnDraw();

//     if (bStandingRedraw === true) {
//       oSettings._iDisplayStart = iStart;
//       that.oApi._fnCalculateEnd(oSettings);
//       that.fnDraw(false);
//     }

//     that.oApi._fnProcessingDisplay(oSettings, false);

//     /* Callback user function - for event handlers etc */
//     if (typeof fnCallback == 'function' && fnCallback !== null) {
//       fnCallback(oSettings);
//     }
//   }, oSettings);
// };
