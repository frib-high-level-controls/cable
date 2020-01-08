/**
 * Manage requests page for managing cable requests
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import 'jquery-ui/themes/base/all.css';

import '@fortawesome/fontawesome-free/js/all';

import 'popper.js';

import 'bootstrap';

import 'jquery-ui/ui/widgets/autocomplete';
import 'jquery-ui/ui/widgets/datepicker';

// JSZip is a requirement for the 'Excel' button,
// but it needs to exist of the global (ie window).
import * as JSZip from 'jszip';
(window as any).JSZip = JSZip;
import 'datatables.net-bs4';
import 'datatables.net-buttons-bs4';
import 'datatables.net-buttons/js/buttons.html5.min.js';
import 'datatables.net-buttons/js/buttons.print.min.js';

import * as $ from 'jquery';

import * as moment from 'moment';

import * as dtutil from '../shared/datatablesutil';

import {
  json2List,
  nameAuto,
} from '../lib/util';

import {
  ajax401,
  disableAjaxCache,
} from '../lib/ajaxhelper';

import {
  barChart,
} from '../lib/barchart';

import {
  approvedByColumn,
  approvedOnColumn,
  approvedOnLongColumn,
  basicColumns,
  commentsColumn,
  conduitColumn,
  createdOnColumn,
  detailsLinkColumn,
  editLinkColumn,
  filterEvent,
  fnDeselect,
  fnGetSelected,
  fnSelectAll,
  fnSetDeselect,
  fnUnwrap,
  fnWrap,
  formatCableStatus,
  fromColumns,
  highlightedEvent,
  lengthColumn,
  numberColumn,
  obsoletedByColumn,
  obsoletedOnLongColumn,
  ownerProvidedColumn,
  rejectedByColumn,
  rejectedOnColumn,
  rejectedOnLongColumn,
  requestNumberColumn,
  requiredColumn,
  sButtons,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedByColumn,
  submittedOnColumn,
  submittedOnLongColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
  updatedOnLongColumn,
  versionColumn,
} from '../lib/table';


/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global moment: false, barChart: false, ajax401: false, disableAjaxCache: false*/
/*global selectColumn: false, editLinkColumn: false, detailsLinkColumn: false, submittedByColumn: false, oTableTools: false, fnSelectAll: false, fnDeselect: false, basicColumns: false, fromColumns: false, toColumns: false, conduitColumn: false, lengthColumn: false, commentsColumn: false, fnGetSelected: false, selectEvent: false, filterEvent: false, fnWrap: false, fnUnwrap: false, submittedOnLongColumn: false, ownerProvidedColumn: false, rejectedOnLongColumn: false, approvedOnLongColumn: false, sDom2InoF: false, highlightedEvent: false, fnAddFilterHeadScroll: false, tabShownEvent: false*/

function approveFromModal(requests, approvingTable, approvedTable?: any, other?: any) {
  $('#approve').prop('disabled', true);
  $('#modal .modal-body div').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        action: 'approve'
      })
    }).done(function (result) {
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
      // remove the request row
      approvingTable.row(requests[index]).remove().draw('full-hold');
      // add the requests to the approved table
      approvedTable.row.add(result.request).draw('full-hold');
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
    });
  });
}


function batchApprove(oTable, approvedTable, procuringTable?: any) {
  var selected = fnGetSelected(oTable, 'row-selected');
  var requests = [];
  if (selected.length) {
    $('#modalLabel').html('Approve the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      var data = oTable.row(row).data();
      $('#modal .modal-body').append('<div id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
      requests.push(row);
    });
    $('#modal .modal-footer').html('<button id="approve" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#approve').click(function () {
      approveFromModal(requests, oTable, approvedTable, procuringTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}


function rejectFromModal(requests, approvingTable, rejectedTable) {
  $('#reject').prop('disabled', true);
  $('#modal .modal-body div').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'reject'
      }),
      dataType: 'json'
    }).done(function (request) {
      $(that).prepend('<i class="icon-remove"></i>');
      $(that).addClass('text-success');
      // remove the request row
      approvingTable.row(requests[index]).remove().draw('full-hold');
      // add the new cables to the procuring table
      rejectedTable.row.add(request).draw('full-hold');
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
    });
  });
}

function batchReject(oTable, rejectedTable) {
  var selected = fnGetSelected(oTable, 'row-selected');
  var requests = [];
  if (selected.length) {
    $('#modalLabel').html('Reject the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      var data = oTable.row(row).data();
      $('#modal .modal-body').append('<div id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
      requests.push(row);
    });
    $('#modal .modal-footer').html('<button id="reject" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#reject').click(function () {
      rejectFromModal(requests, oTable, rejectedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}

$(function () {

  ajax401('');
  disableAjaxCache();

  const readyTime = Date.now();

  var approvingTable;
  var rejectedTable;
  var approvedTable;

  /*approving table starts*/
  var approvingAoCulumns = ([selectColumn, editLinkColumn, submittedOnLongColumn, submittedByColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let approvingTableWrapped = true;

  approvingTable = $('#approving-table').DataTable({
    ajax: {
      url: basePath + '/requests/statuses/1/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...'
    },
    columns: approvingAoCulumns,
    order: [
      [2, 'desc'],
      [5, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // sScrollY: '50vh',
    // bScrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!approvingTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#approving-table', approvingAoCulumns);

  $('#approving-table').on('init.dt', () => {
    console.log('Approving table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#approving-wrap').click(function () {
    approvingTableWrapped = true;
    fnWrap(approvingTable);
  });

  $('#approving-unwrap').click(function () {
    approvingTableWrapped = false;
    fnUnwrap(approvingTable);
  });

  $('#approving-select-none').click(function () {
    fnDeselect(approvingTable, 'row-selected', 'select-row');
  });

  $('#approving-select-all').click(function () {
    fnSelectAll(approvingTable, 'row-selected', 'select-row', true);
  });

  $('#approving-approve').click(function () {
    batchApprove(approvingTable, approvedTable);
  });

  $('#approving-reject').click(function () {
    batchReject(approvingTable, rejectedTable);
  });

  /*approving tab ends*/

  /*rejected tab starts*/
  var rejectedAoColumns = ([detailsLinkColumn, rejectedOnLongColumn, submittedOnLongColumn, submittedByColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let rejectedTableWrapped = true;

  rejectedTable = $('#rejected-table').DataTable({
    ajax: {
      url: basePath + '/requests/statuses/3/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...'
    },
    columns: rejectedAoColumns,
    order: [
      [1, 'desc'],
      [2, 'desc'],
      [3, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // sScrollY: '50vh',
    // bScrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!rejectedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#rejected-table', rejectedAoColumns);

  $('#rejected-table').on('init.dt', () => {
    console.log('Rejected table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#rejected-wrap').click(function () {
    rejectedTableWrapped = true;
    fnWrap(rejectedTable);
  });

  $('#rejected-unwrap').click(function () {
    rejectedTableWrapped = false;
    fnUnwrap(rejectedTable);
  });

  /*rejected tab ends*/

  /*approved tab starts*/
  var approvedAoColumns = ([detailsLinkColumn, approvedOnLongColumn, submittedOnLongColumn, submittedByColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let approvedTableWrapped = true;

  approvedTable = $('#approved-table').DataTable({
    ajax: {
      url: basePath + '/requests/statuses/2/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...'
    },
    columns: approvedAoColumns,
    order: [
      [1, 'desc'],
      [2, 'desc'],
      [3, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // sScrollY: '50vh',
    // bScrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!approvedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#approved-table', approvedAoColumns);

  $('#approved-table').on('init.dt', () => {
    console.log('Approved table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#approved-wrap').click(function () {
    approvedTableWrapped = true;
    fnWrap(approvedTable);
  });

  $('#approved-unwrap').click(function () {
    approvedTableWrapped = false;
    fnUnwrap(approvedTable);
  });

  /*approved tab ends*/

  /*all tabs*/
  tabShownEvent();
  filterEvent();
  selectEvent();
  highlightedEvent();

  $('#reload').click(function () {
    approvingTable.ajax.reload();
    rejectedTable.ajax.reload();
    approvedTable.ajax.reload();
  });

  $('#bar').click(function () {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    barChart(activeTable);
  });
});
