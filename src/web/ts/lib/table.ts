/**
 * Common table function and data
 */
import * as $ from 'jquery';

import {
  formatCableStatus,
  formatDate,
  formatDateLong,
  formatDateShort,
} from '../lib/util';

type DTAPI = DataTables.Api;

interface ColumnSettings extends DataTables.ColumnSettings {
  bFilter?: boolean;
  sParseType?: string;
}

export function selectEvent() {
  $('tbody').on('click', 'input.select-row', function(e) {
    if ($(this).prop('checked')) {
      $(e.target).closest('tr').removeClass('row-highlighted');
      $(e.target).closest('tr').addClass('row-selected');
    } else {
      $(e.target).closest('tr').removeClass('row-selected');
    }
  });
}

export function tabShownEvent() {
  $('a[data-toggle="tab"]').on('shown', () => {
    const table = $.fn.DataTable().tables(true);
    if (table.length > 0) {
      $(table).DataTable().columns.adjust();
    }
  });
}

export function highlightedEvent() {
  $('tbody').on('click', 'td', (e) => {
    if (!$(e.target).closest('tr').hasClass('row-selected') && !$(e.target).hasClass('select-row') && !$(e.target).is('a') && !$(e.target).is('i')) {
      if ($(e.target).closest('tr').hasClass('row-highlighted')) {
        $(e.target).closest('tr').removeClass('row-highlighted');
      } else {
        $(e.target).closest('tr').addClass('row-highlighted');
      }
    }
  });
}


export function filterEvent(opt?: { selectedClass?: string; checkboxClass?: string; }) {
  opt = opt || {};
  const selectedClass = opt.selectedClass || 'row-selected';
  const checkboxClass = opt.checkboxClass || 'select-row';
  $('.filter').on('change', 'input', function(e) {
    let bodyTable;
    const tableScroll = $(this).closest('.dataTables_scroll');
    if (tableScroll.length) {
      bodyTable = $(this).closest('.dataTables_scroll').find('.dataTables_scrollBody table');
    } else {
      bodyTable = $(this).closest('table');
    }
    const th = $(this).closest('th');
    const filter = $(this).closest('.filter');
    let index;
    const table = $(this).closest('table');
    let wrapper;
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
    fnDeselect(bodyTable.DataTable(), selectedClass, checkboxClass);
    bodyTable.DataTable().column(index).search(this.value);
    if ($(this).closest('.table-overflow').length) {
      const scrollDiv = $<HTMLElement>(this).closest('.table-overflow')[0];
      const scrollDivWidth = $(scrollDiv).width() || 0;
      const scrollDivOffsetLeft = $(scrollDiv).offset()?.left || 0;
      const offsetLeft = $(this).offset()?.left || 0;
      if (offsetLeft > scrollDivOffsetLeft + scrollDivWidth) {
        $(scrollDiv).scrollLeft(offsetLeft - scrollDivWidth);
      }
    }
  });
}

function dateColumn(title: string, key: string, long?: boolean): ColumnSettings {
  return {
    title: title,
    data: (source: any, type: string, val: any) => {
      if (type === 'sort') {
        // return formatDateLong(source[key]);
        return source[key];
      }
      if (long) {
        return formatDateLong(source[key]);
      }
      return formatDate(source[key]);
    },
    defaultContent: '',
  };
}

function personColumn(title: string, key: string): ColumnSettings {
  return {
    title: title,
    data: key,
    defaultContent: '',
    render: (data, type, full) => {
      return '<a href = "' + basePath + '/users/' + data + '" target="_blank">' + data + '</a>';
    },
    bFilter: true,
  };
}

function personNameColumn(title: string, key: string): ColumnSettings {
  return {
    title: title,
    data: key,
    defaultContent: '',
    render: (data, type, full) => {
      return '<a href = "' + basePath + '/usernames/' + data + '" target="_blank">' + data + '</a>';
    },
    bFilter: true,
  };
}

function createNullArray(size: number): null[] {
  const out: null[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push(null);
  }
  return out;
}



export function fnWrap(oTableLocal: DTAPI): void {
  $(oTableLocal.rows().nodes()).each((idx, row) => {
    $(row).removeClass('nowrap');
  });
}

export function fnUnwrap(oTableLocal: DTAPI): void {
  $(oTableLocal.rows().nodes()).each((idx, cell) => {
    $(cell).addClass('nowrap');
  });
}



export function fnGetSelected(oTableLocal: DTAPI, selectedClass: string): DTAPI[] {
  const aReturn = [];
  const aTrs = oTableLocal.rows().nodes();
  // DataTables.Api is only Array-like,
  // so TS does not allow use of for-of.
  // tslint:disable:prefer-for-of
  for (let i = 0; i < aTrs.length; i++) {
    if ($(aTrs[i]).hasClass(selectedClass)) {
      aReturn.push(aTrs[i]);
    }
  }
  return aReturn;
}

export function fnDeselect(oTableLocal: DTAPI, selectedClass: string, checkboxClass: string): void {
  const aTrs = oTableLocal.rows().nodes();
  // DataTables.Api is only Array-like,
  // so TS does not allow use of for-of.
  // tslint:disable:prefer-for-of
  for (let i = 0; i < aTrs.length; i++) {
    if ($(aTrs[i]).hasClass(selectedClass)) {
      $(aTrs[i]).removeClass(selectedClass);
      $(aTrs[i]).find('input.' + checkboxClass + ':checked').prop('checked', false);
    }
  }
}

export function fnSelectAll(oTableLocal: DTAPI, selectedClass: string, checkboxClass: string, current: boolean): void {
  let rows;
  if (current) {
    rows = oTableLocal.$('tr', {
      page: 'current',
      // If 'current' is given then the
      // following two options are forced:
      // 'filter':'applied' and 'order':'current'
    });
  } else {
    rows = oTableLocal.$('tr');
  }

  for (let i = 0; i < rows.length; i += 1) {
    $(rows[i]).addClass(selectedClass);
    $(rows[i]).find('input.' + checkboxClass).prop('checked', true);
  }
}

export function fnSetDeselect(nTr: DTAPI, selectedClass: string, checkboxClass: string): void {
  if ($(nTr).hasClass(selectedClass)) {
    $(nTr).removeClass(selectedClass);
    $(nTr).find('input.' + checkboxClass + ':checked').prop('checked', false);
  }
}

function fnSetColumnsVis(oTableLocal: DTAPI, columns: number[], show: boolean): void {
  columns.forEach((e, i, a) => {
    oTableLocal.column(e).visible(show);
  });
}

export function fnAddFilterFoot(sTable: DTAPI, aoColumns: ColumnSettings[]): void {
  const tr = $('<tr role="row">');
  aoColumns.forEach((c) => {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.title + '" style="width:80%;" autocomplete="off"></th>');
    } else {
      tr.append('<th></th>');
    }
  });
  $(sTable).append($('<tfoot class="filter">').append(tr));
}

function fnAddFilterHead(sTable: DTAPI, aoColumns: ColumnSettings[]): void {
  const tr = $('<tr role="row">');
  aoColumns.forEach((c) => {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.title + '" style="width:80%;" autocomplete="off"></th>');
    } else {
      tr.append('<th></th>');
    }
  });
  $(sTable).append($('<thead class="filter">').append(tr));
}

function fnAddFilterHeadScroll(sTable: DTAPI, aoColumns: ColumnSettings[]): void {
  const tr = $('<tr role="row">');
  aoColumns.forEach((c) => {
    if (c.bFilter) {
      tr.append('<th><input type="text" placeholder="' + c.title + '" style="width:80%;" autocomplete="off"></th>');
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

export const selectColumn: ColumnSettings = {
  title: '',
  defaultContent: '<label class="checkbox"><input type="checkbox" class="select-row"></label>',
  orderDataType: 'dom-checkbox',
  orderSequence: ['desc', 'asc'],
};

const idColumn: ColumnSettings = {
  title: '',
  data: '_id',
  visible: false,
};

export const editLinkColumn: ColumnSettings = {
  title: '',
  data: '_id',
  render: (data, type, full) => {
    return '<a href="' + basePath + '/requests/' + data + '" target="_blank"><i class="fa fa-edit fa-lg"></i></a>';
  },
  orderable: false,
};

export const detailsLinkColumn: ColumnSettings = {
  title: '',
  data: '_id',
  render: (data, type, full) => {
    return '<a href="' + basePath + '/requests/' + data + '/details" target="_blank"><i class="fa fa-file-alt fa-lg"></i></a>';
  },
  orderable: false,
};

export const createdOnColumn = dateColumn('Created', 'createdOn');

export const updatedOnColumn = dateColumn('Updated', 'updatedOn');
export const updatedOnLongColumn = dateColumn('Updated', 'updatedOn', true);

export const submittedOnColumn = dateColumn('Submitted', 'submittedOn');
export const submittedOnLongColumn = dateColumn('Submitted', 'submittedOn', true);
export const submittedByColumn = personColumn('Submitted by', 'submittedBy');

export const approvedOnColumn = dateColumn('Approved', 'approvedOn');
export const approvedOnLongColumn = dateColumn('Approved', 'approvedOn', true);
export const approvedByColumn = personColumn('Approved by', 'approvedBy');

export const rejectedOnColumn = dateColumn('Rejected', 'rejectedOn');
export const rejectedOnLongColumn = dateColumn('Rejected', 'rejectedOn', true);
export const rejectedByColumn = personColumn('Rejected by', 'rejectedBy');

const obsoletedOnColumn = dateColumn('Obsoleted', 'obsoletedOn');
export const obsoletedOnLongColumn = dateColumn('Obsoleted', 'obsoletedOn', true);
export const obsoletedByColumn = personColumn('Obsoleted by', 'obsoletedBy');

export const commentsColumn: ColumnSettings = {
  title: 'Comments',
  defaultContent: '',
  data: 'comments',
  className: 'editable',
  bFilter: true,
};

export const lengthColumn: ColumnSettings = {
  title: 'Length(ft)',
  defaultContent: '',
  data: 'length',
  className: 'editable',
  sParseType: 'number',
  bFilter: true,
};

export const versionColumn: ColumnSettings = {
  title: 'version',
  defaultContent: '0',
  data: '__v',
  bFilter: true,
};

export const ownerProvidedColumn: ColumnSettings = {
  title: 'Owner provided',
  defaultContent: 'false',
  data: 'ownerProvided',
  className: 'editable',
  sParseType: 'boolean',
  bFilter: true,
};

export const basicColumns: ColumnSettings[] = [{
  title: 'Project',
  defaultContent: '',
  data: 'basic.project',
  className: 'editable',
  bFilter: true,
}, {
  title: 'WBS',
  defaultContent: '',
  data: 'basic.wbs',
  className: 'editable',
  bFilter: true,
}, {
  title: 'Category',
  defaultContent: '',
  data: (source: any, type: string, val: any): string => {
    return (source.basic.originCategory || '?')
            + (source.basic.originSubcategory || '?')
            + (source.basic.signalClassification || '?');
  },
  bFilter: true,
}, {
  title: 'Tray section',
  defaultContent: '',
  data: 'basic.traySection',
  className: 'editable',
  bFilter: true,
}, {
  title: 'Cable type',
  defaultContent: '',
  data: 'basic.cableType',
  className: 'editable',
  bFilter: true,
}, {
  title: 'Engineer',
  defaultContent: '',
  data: 'basic.engineer',
  className: 'editable',
  bFilter: true,
}, {
  title: 'Function',
  defaultContent: '',
  data: 'basic.service',
  className: 'editable',
  bFilter: true,
}, {
  title: 'Tags',
  defaultContent: '',
  data: 'basic.tags',
  render: (data, type, full) => {
    if (data) {
      return data.join();
    }
    return '';
  },
  // mParser: function (sRendered) {
  //   return s ? s.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*,\s*/) : [];
  // },
  sParseType: 'array',
  className: 'editable',
  bFilter: true,
}, {
  title: 'Quantity',
  defaultContent: '',
  data: 'basic.quantity',
  bFilter: true,
}];

export const fromColumns: ColumnSettings[] = [{
  title: 'From location',
  defaultContent: '',
  data: 'from.rack',
  className: 'editable',
  bFilter: true,
}, {
  title: 'From termination device',
  defaultContent: '',
  data: 'from.terminationDevice',
  className: 'editable',
  bFilter: true,
}, {
  title: 'From termination type',
  defaultContent: '',
  data: 'from.terminationType',
  className: 'editable',
  bFilter: true,
}, {
  title: 'From termination port',
  defaultContent: '',
  data: 'from.terminationPort',
  className: 'editable',
  bFilter: true,
}, {
  title: 'From wiring drawing',
  defaultContent: '',
  data: 'from.wiringDrawing',
  className: 'editable',
  bFilter: true,
}, {
  title: 'From ready for termination',
  defaultContent: 'false',
  data: 'from.readyForTerm',
  className: 'editable',
  sParseType: 'boolean',
  bFilter: true,
}, {
  title: 'From terminated on',
  defaultContent: '',
  data: (source: any, type: string, val: any): string => {
    if ( source.from && source.from.terminatedOn ) {
      if ( type === 'sort' ) {
        return source.from.terminatedOn;
      } else {
        return formatDateShort(source.from.terminatedOn);
      }
    }
    return '';
  },
  className: 'editable',
  bFilter: true,
}, {
    title: 'From terminated by',
    defaultContent: '',
    data: 'from.terminatedBy',
    className: 'editable',
    bFilter: true,
}];

export const toColumns: ColumnSettings[] = [{
  title: 'To location',
  defaultContent: '',
  data: 'to.rack',
  className: 'editable',
  bFilter: true,
}, {
  title: 'To termination device',
  defaultContent: '',
  data: 'to.terminationDevice',
  className: 'editable',
  bFilter: true,
}, {
  title: 'To termination type',
  defaultContent: '',
  data: 'to.terminationType',
  className: 'editable',
  bFilter: true,
}, {
  title: 'To termination port',
  defaultContent: '',
  data: 'to.terminationPort',
  className: 'editable',
  bFilter: true,
}, {
  title: 'To wiring drawing',
  defaultContent: '',
  data: 'to.wiringDrawing',
  className: 'editable',
  bFilter: true,
}, {
  title: 'To ready for termination',
  defaultContent: 'false',
  data: 'to.readyForTerm',
  className: 'editable',
  sParseType: 'boolean',
  bFilter: true,
}, {
  title: 'To terminated on',
  defaultContent: '',
  data: (source: any, type: string, val: any) => {
    if ( source.to && source.to.terminatedOn ) {
      if ( type === 'sort' ) {
        return source.to.terminatedOn;
      } else {
        return formatDateShort(source.to.terminatedOn);
      }
    }
    return '';
  },
  className: 'editable',
  bFilter: true,
}, {
    title: 'To terminated by',
    defaultContent: '',
    data: 'to.terminatedBy',
    className: 'editable',
    bFilter: true,
}];

export const conduitColumn: ColumnSettings = {
  title: 'Conduit',
  defaultContent: '',
  data: 'conduit',
  className: 'editable',
  bFilter: true,
};

export const numberColumn: ColumnSettings = {
  title: 'Number',
  data: 'number',
  render: (data, type, full) => {
    return '<a href="' + basePath + '/cables/' + data + '/" target="_blank">' + data + '</a>';
  },
  bFilter: true,
};

export const requestNumberColumn: ColumnSettings = {
  title: 'Request',
  data: 'request_id',
  render: (data, type, full) => {
    return '<a href="' + basePath + '/requests/' + data + '/" target="_blank">' + data + '</a>';
  },
  bFilter: true,
};

export const statusColumn: ColumnSettings = {
  title: 'Status',
  // data: 'status',
  // render: function(data, type, full) {
  //   return formatCableStatus(data);
  // },
  data: (source: any, type: string, val: any) => {
    return formatCableStatus(source.status);
  },
  bFilter: true,
};

export const requiredColumn: ColumnSettings = {
  title: 'Required',
  data: (source: any, type: string, val: any) => {
    if (source.required) {
      const result = [];
      for (const i in source.required) {
        if (source.required.hasOwnProperty(i) && source.required[i]) {
          result.push(i);
        }
      }
      return result.join();
    }
    return '';
  },
  bFilter: true,
};

export const typeColumns: ColumnSettings[] = [{
  title: 'Name',
  data: 'name',
  bFilter: true,
}, {
  title: 'Service',
  data: 'service',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Conductor number',
  data: 'conductorNumber',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Conductor size',
  data: 'conductorSize',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Type',
  data: 'fribType',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Pairing',
  data: 'pairing',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Shielding',
  data: 'shielding',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Outer Diameter',
  data: 'outerDiameter',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Voltage Rating',
  data: 'voltageRating',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Raceway',
  data: 'raceway',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Tunnel/Hotcell',
  data: 'tunnelHotcell',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Manufacturer',
  data: 'manufacturer',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Part number',
  data: 'partNumber',
  defaultContent: '',
  bFilter: true,
}, {
  title: 'Other Requirements',
  data: 'otherRequirements',
  defaultContent: '',
  bFilter: true,
}];

/*user columns*/

export const useridColumn = personColumn('User id', 'adid');

export const fullNameNoLinkColumn: ColumnSettings = {
  title: 'Full name',
  data: 'name',
  defaultContent: '',
  bFilter: true,
};

export const rolesColumn: ColumnSettings = {
  title: 'Roles',
  data: 'roles',
  // defaultContent: '',
  render: (data, type, full) => {
    if (data) {
      return data.join(', ');
    }
    return '';
  },
  bFilter: true,
};

export const wbsColumn: ColumnSettings = {
  title: 'WBS',
  data: (source: any) => {
    if (source.wbs) {
      return source.wbs.join(', ');
    }
    return '';
  },
  bFilter: true,
};

export const lastVisitedOnColumn = dateColumn('Last visited', 'lastVisitedOn');


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

export const sDom = '<"d-flex"<"form-inline mr-auto p-2"<l>><<"p-2"B><"form-inline mr-auto p-2"<f>>>>rt<"d-flex"<"mr-auto p-2"i><"p-2"p>>';
const sDom2i = "<'row-fluid'<'span6'<'control-group'T>>><'row-fluid'<'span3'l><'span3'i><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";
export const sDom2InoF = '<"d-flex"<"form-inline mr-auto p-2"<l>><"p-2"B>>rt<"d-flex"<"mr-auto p-2"i><"p-2"p>>';
const sDom2i1p = "<'row-fluid'<'span6'<'control-group'T>>><'row-fluid'<'span3'l><'span3'i><'span3'r><'span3'f>>t<'row-fluid'<'span6'i><'span6'p>>";
const sDomNoTools = "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";
const sDomNoLength = "<'row-fluid'<'span6'<'control-group'T>><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>";

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
//     var aData = (oSettings.sAjaxDataProp !== "")?that.oApi._fnGetObjectDataFn(oSettings.sAjaxDataProp)(json):json;
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
