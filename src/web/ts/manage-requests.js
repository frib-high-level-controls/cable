/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global moment: false, barChart: false, ajax401: false, disableAjaxCache: false*/
/*global selectColumn: false, editLinkColumn: false, detailsLinkColumn: false, submittedByColumn: false, oTableTools: false, fnSelectAll: false, fnDeselect: false, basicColumns: false, fromColumns: false, toColumns: false, conduitColumn: false, lengthColumn: false, commentsColumn: false, fnGetSelected: false, selectEvent: false, filterEvent: false, fnWrap: false, fnUnwrap: false, submittedOnLongColumn: false, ownerProvidedColumn: false, rejectedOnLongColumn: false, approvedOnLongColumn: false, sDom2InoF: false, highlightedEvent: false, fnAddFilterHeadScroll: false, tabShownEvent: false*/

function approveFromModal(requests, approvingTable, approvedTable) {
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
      approvingTable.fnDeleteRow(requests[index]);
      // add the requests to the approved table
      approvedTable.fnAddData(result.request);
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
    });
  });
}


function batchApprove(oTable, approvedTable, procuringTable) {
  var selected = fnGetSelected(oTable, 'row-selected');
  var requests = [];
  if (selected.length) {
    $('#modalLabel').html('Approve the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      var data = oTable.fnGetData(row);
      $('#modal .modal-body').append('<div id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
      requests.push(row);
    });
    $('#modal .modal-footer').html('<button id="approve" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
    $('#approve').click(function () {
      approveFromModal(requests, oTable, approvedTable, procuringTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
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
      approvingTable.fnDeleteRow(requests[index]);
      // add the new cables to the procuring table
      rejectedTable.fnAddData(request);
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
      var data = oTable.fnGetData(row);
      $('#modal .modal-body').append('<div id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
      requests.push(row);
    });
    $('#modal .modal-footer').html('<button id="reject" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
    $('#reject').click(function () {
      rejectFromModal(requests, oTable, rejectedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
  }
}

$(function () {

  ajax401('');
  disableAjaxCache();

  var approvingTable;
  var rejectedTable;
  var approvedTable;
  /*approving table starts*/
  var approvingAoCulumns = [selectColumn, editLinkColumn, submittedOnLongColumn, submittedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);

  approvingTable = $('#approving-table').dataTable({
    sAjaxSource: basePath + '/requests/statuses/1/json',
    sAjaxDataProp: '',
    bAutoWidth: false,
    bProcessing: true,
    oLanguage: {
      sLoadingRecords: 'Please wait - loading data from the server ...'
    },
    bDeferRender: true,
    aoColumns: approvingAoCulumns,
    aaSorting: [
      [2, 'desc'],
      [5, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
  });

  fnAddFilterHeadScroll('#approving-table', approvingAoCulumns);

  $('#approving-wrap').click(function () {
    fnWrap(approvingTable);
  });

  $('#approving-unwrap').click(function () {
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

  var rejectedAoColumns = [detailsLinkColumn, rejectedOnLongColumn, submittedOnLongColumn, submittedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  rejectedTable = $('#rejected-table').dataTable({
    aaData: [],
    sAjaxSource: basePath + '/requests/statuses/3/json',
    sAjaxDataProp: '',
    bAutoWidth: false,
    bProcessing: true,
    oLanguage: {
      sLoadingRecords: 'Please wait - loading data from the server ...'
    },
    bDeferRender: true,
    aoColumns: rejectedAoColumns,
    aaSorting: [
      [1, 'desc'],
      [2, 'desc'],
      [3, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
  });
  fnAddFilterHeadScroll('#rejected-table', rejectedAoColumns);

  $('#rejected-wrap').click(function () {
    $('#rejected-table td').removeClass('nowrap');
    rejectedTable.fnAdjustColumnSizing();
  });

  $('#rejected-unwrap').click(function () {
    $('#rejected-table td').addClass('nowrap');
    rejectedTable.fnAdjustColumnSizing();
  });

  /*rejected tab ends*/

  /*approved tab starts*/

  var approvedAoColumns = [detailsLinkColumn, approvedOnLongColumn, submittedOnLongColumn, submittedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  approvedTable = $('#approved-table').dataTable({
    sAjaxSource: basePath + '/requests/statuses/2/json',
    sAjaxDataProp: '',
    bAutoWidth: false,
    bProcessing: true,
    oLanguage: {
      sLoadingRecords: 'Please wait - loading data from the server ...'
    },
    bDeferRender: true,
    aoColumns: approvedAoColumns,
    aaSorting: [
      [1, 'desc'],
      [2, 'desc'],
      [3, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
  });
  fnAddFilterHeadScroll('#approved-table', approvedAoColumns);

  $('#approved-wrap').click(function () {
    $('#approved-table td').removeClass('nowrap');
    approvedTable.fnAdjustColumnSizing();
  });

  $('#approved-unwrap').click(function () {
    $('#approved-table td').addClass('nowrap');
    approvedTable.fnAdjustColumnSizing();
  });

  /*approved tab ends*/

  /*all tabs*/
  tabShownEvent();
  filterEvent();
  selectEvent();
  highlightedEvent();

  $('#reload').click(function () {
    approvingTable.fnReloadAjax();
    rejectedTable.fnReloadAjax();
    approvedTable.fnReloadAjax();
  });

  $('#bar').click(function () {
    var activeTable = $($.fn.dataTable.fnTables(true)[0]).dataTable();
    barChart(activeTable);
  });
});
