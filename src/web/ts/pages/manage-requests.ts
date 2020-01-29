/**
 * Manage requests page for managing cable requests
 */
import './base';

import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

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
  ajax401,
  disableAjaxCache,
} from '../lib/ajaxhelper';

import {
  barChart,
} from '../lib/barchart';

import {
  approvedOnLongColumn,
  basicColumns,
  commentsColumn,
  conduitColumn,
  detailsLinkColumn,
  editLinkColumn,
  filterEvent,
  fnDeselect,
  fnGetSelected,
  fnSelectAll,
  fnUnwrap,
  fnWrap,
  fromColumns,
  highlightedEvent,
  lengthColumn,
  ownerProvidedColumn,
  rejectedOnLongColumn,
  sButtons,
  sDom2InoF,
  selectColumn,
  selectEvent,
  submittedByColumn,
  submittedOnLongColumn,
  tabShownEvent,
  toColumns,
} from '../lib/table';

type DTAPI = DataTables.Api;


function approveFromModal(requests: DTAPI[], approvingTable: DTAPI, approvedTable: DTAPI, other?: DTAPI) {
  $('#approve').prop('disabled', true);
  $('#modal .modal-body div').each(function(index) {
    const that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        action: 'approve',
      }),
    }).done((result) => {
      $(that).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(that).addClass('text-success');
      // remove the request row
      // Type definitions are missing the draw method!
      (approvingTable.row(requests[index]).remove() as any).draw('full-hold');
      // add the requests to the approved table
      approvedTable.row.add(result.request).draw('full-hold');
    }).fail((jqXHR) => {
      $(that).prepend('<i class="fas fa-question text-danger"></i>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    });
  });
}


function batchApprove(oTable: DTAPI, approvedTable: DTAPI, procuringTable?: DTAPI) {
  const selected = fnGetSelected(oTable, 'row-selected');
  const requests: DTAPI[] = [];
  if (selected.length) {
    $('#modalLabel').html('Approve the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach((row) => {
      const data = oTable.row(row).data() as webapi.CableRequest;
      // tslint:disable-next-line:max-line-length
      $('#modal .modal-body').append('<div id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
      requests.push(row);
    });
    $('#modal .modal-footer').html('<button id="approve" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#approve').click(() => {
      approveFromModal(requests, oTable, approvedTable, procuringTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    // tslint:disable-next-line:max-line-length
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}


function rejectFromModal(requests: DTAPI[], approvingTable: DTAPI, rejectedTable: DTAPI) {
  $('#reject').prop('disabled', true);
  $('#modal .modal-body div').each(function(index) {
    const that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'reject',
      }),
      dataType: 'json',
    }).done((request) => {
      $(that).prepend('<i class="fas fa-times text-success"></i>&nbsp;');
      $(that).addClass('text-success');
      // remove the request row
      // Type definitions are missing draw method!
      (approvingTable.row(requests[index]).remove() as any).draw('full-hold');
      // add the new cables to the procuring table
      rejectedTable.row.add(request).draw('full-hold');
    }).fail((jqXHR) => {
      $(that).prepend('<i class="fas fa-question text-danger"></i>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    });
  });
}

function batchReject(oTable: DTAPI, rejectedTable: DTAPI) {
  const selected = fnGetSelected(oTable, 'row-selected');
  const requests: DTAPI[] = [];
  if (selected.length) {
    $('#modalLabel').html('Reject the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach((row) => {
      const data = oTable.row(row).data() as webapi.CableRequest;
      // tslint:disable-next-line:max-line-length
      $('#modal .modal-body').append('<div id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
      requests.push(row);
    });
    $('#modal .modal-footer').html('<button id="reject" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#reject').click(() => {
      rejectFromModal(requests, oTable, rejectedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    // tslint:disable-next-line:max-line-length
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}

$(() => {

  ajax401('');
  disableAjaxCache();

  const readyTime = Date.now();

  /*approving table starts*/
  // tslint:disable-next-line:max-line-length
  const approvingAoCulumns = [selectColumn, editLinkColumn, submittedOnLongColumn, submittedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let approvingTableWrapped = true;

  const approvingTable = $('#approving-table').DataTable({
    ajax: {
      url: basePath + '/requests/statuses/1/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: approvingAoCulumns,
    order: [
      [2, 'desc'],
      [5, 'desc'],
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
    // tslint:disable-next-line:no-console
    console.log('Approving table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#approving-wrap').click(() => {
    approvingTableWrapped = true;
    fnWrap(approvingTable);
  });

  $('#approving-unwrap').click(() => {
    approvingTableWrapped = false;
    fnUnwrap(approvingTable);
  });

  $('#approving-select-none').click(() => {
    fnDeselect(approvingTable, 'row-selected', 'select-row');
  });

  $('#approving-select-all').click(() => {
    fnSelectAll(approvingTable, 'row-selected', 'select-row', true);
  });

  $('#approving-approve').click(() => {
    batchApprove(approvingTable, approvedTable);
  });

  $('#approving-reject').click(() => {
    batchReject(approvingTable, rejectedTable);
  });

  /*approving tab ends*/

  /*rejected tab starts*/
  // tslint:disable-next-line:max-line-length
  const rejectedAoColumns = [detailsLinkColumn, rejectedOnLongColumn, submittedOnLongColumn, submittedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let rejectedTableWrapped = true;

  const rejectedTable = $('#rejected-table').DataTable({
    ajax: {
      url: basePath + '/requests/statuses/3/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: rejectedAoColumns,
    order: [
      [1, 'desc'],
      [2, 'desc'],
      [3, 'desc'],
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
    // tslint:disable-next-line:no-console
    console.log('Rejected table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#rejected-wrap').click(() => {
    rejectedTableWrapped = true;
    fnWrap(rejectedTable);
  });

  $('#rejected-unwrap').click(() => {
    rejectedTableWrapped = false;
    fnUnwrap(rejectedTable);
  });

  /*rejected tab ends*/

  /*approved tab starts*/
  // tslint:disable-next-line:max-line-length
  const approvedAoColumns = [detailsLinkColumn, approvedOnLongColumn, submittedOnLongColumn, submittedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let approvedTableWrapped = true;

  const approvedTable = $('#approved-table').DataTable({
    ajax: {
      url: basePath + '/requests/statuses/2/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: approvedAoColumns,
    order: [
      [1, 'desc'],
      [2, 'desc'],
      [3, 'desc'],
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
    // tslint:disable-next-line:no-console
    console.log('Approved table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#approved-wrap').click(() => {
    approvedTableWrapped = true;
    fnWrap(approvedTable);
  });

  $('#approved-unwrap').click(() => {
    approvedTableWrapped = false;
    fnUnwrap(approvedTable);
  });

  /*approved tab ends*/

  /*all tabs*/
  tabShownEvent();
  filterEvent();
  selectEvent();
  highlightedEvent();

  $('#reload').click(() => {
    approvingTable.ajax.reload();
    rejectedTable.ajax.reload();
    approvedTable.ajax.reload();
  });

  $('#bar').click(() => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    barChart(activeTable);
  });
});
