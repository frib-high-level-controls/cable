/*
 * Main user page for managing cable requests
 */
import 'bootstrap/dist/css/bootstrap.min.css';

import '@fortawesome/fontawesome-free/js/all';

import 'bootstrap';

import 'datatables.net-bs4';
import 'datatables.net-buttons-bs4';

import * as $ from 'jquery';

import * as moment from 'moment';

import {
  ajax401,
  disableAjaxCache,
} from '../lib/ajaxhelper';

import {
  approvedByColumn,
  approvedOnColumn,
  basicColumns,
  commentsColumn,
  conduitColumn,
  createdOnColumn,
  detailsLinkColumn,
  editLinkColumn,
  filterEvent,
  fnAddFilterFoot,
  fnDeselect,
  fnGetSelected,
  fnSelectAll,
  fnSetDeselect,
  fnUnwrap,
  fnWrap,
  fromColumns,
  highlightedEvent,
  lengthColumn,
  numberColumn,
  ownerProvidedColumn,
  rejectedByColumn,
  rejectedOnColumn,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
} from '../lib/table';

// link(rel='stylesheet', href=basePath + '/bootstrap/css/bootstrap.css')
// link(rel='stylesheet', href=basePath + '/bootstrap/css/bootstrap-responsive.css')
// link(rel='stylesheet', href=basePath + '/datatables/css/dataTables.bootstrap.css')
// link(rel='stylesheet', href=basePath + '/font-awesome-4.2.0/css/font-awesome.css')
// link(rel='stylesheet', href=basePath + '/stylesheets/style.css')

// script(type='text/javascript', src=basePath + '/jquery/jquery-1.9.1.js')
// script(type='text/javascript', src=basePath + '/datatables/js/jquery.dataTables.js')
// script(type='text/javascript', src=basePath + '/bootstrap/js/bootstrap.js')
// script(type='text/javascript', src=basePath + '/datatables/js/ZeroClipboard.js')
// script(type='text/javascript', src=basePath + '/datatables/js/TableTools.js')
// script(type='text/javascript', src=basePath + '/datatables/js/dataTables.bootstrap.js')
// script(type='text/javascript', src=basePath + '/jquery/jquery.validate.js')
// script(type='text/javascript', src=basePath + '/dependencies/moment.js')
// script(type='text/javascript', src=basePath + '/dependencies/lodash.js')
// script(type='text/javascript', src=basePath + '/javascripts/ajaxhelper.js')
// script(type='text/javascript', src=basePath + '/javascripts/table.js')
// script(type='text/javascript', src=basePath + '/javascripts/main.js')


/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global moment: false, ajax401: false, disableAjaxCache: false*/
/*global selectColumn: false, editLinkColumn: false, detailsLinkColumn: false, createdOnColumn: false, rejectedOnColumn: false, rejectedByColumn: false, updatedOnColumn: false, submittedOnColumn: false, numberColumn: false, approvedOnColumn:false, approvedByColumn: false, fnAddFilterFoot: false, oTableTools: false, fnSelectAll: false, fnDeselect: false, basicColumns: false, fromColumns: false, toColumns: false, conduitColumn: false, lengthColumn: false, commentsColumn: false, statusColumn: false, ownerProvidedColumn: false, fnGetSelected: false, selectEvent: false, filterEvent: false, fnWrap: false, fnUnwrap: false, sDom2InoF: false, tabShownEvent: false, highlightedEvent: false, fnSetDeselect: false*/

function initCable(table) {
  $.ajax({
    url: basePath + '/cables/json',
    type: 'GET',
    contentType: 'application/json',
    dataType: 'json'
  }).done(function (json) {
    table.clear();
    table.rows.add(json);
    if ($('#cables-unwrap').hasClass('active')) {
      fnUnwrap(table);
    }
    table.draw();

  }).fail(function () {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable requests.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  });
}

function initRequests(savedTable, submittedTable?: any, rejectedTable?: any, approvedTable?: any, cablesTable?: any) {
  if (cablesTable) {
    initCable(cablesTable);
  }
  $.ajax({
    url: basePath + '/requests/json',
    type: 'GET',
    contentType: 'application/json',
    dataType: 'json'
  }).done(function (json) {
    var saved = [];
    var submitted = [];
    var rejected = [];
    var approved = [];

    json.forEach(function (r) {
      if (savedTable) {
        if (r.status === 0) {
          saved.push(r);
          return;
        }
      }
      if (submittedTable) {
        if (r.status === 1) {
          submitted.push(r);
          return;
        }
      }
      if (approvedTable) {
        if (r.status === 2) {
          approved.push(r);
          return;
        }
      }
      if (rejectedTable) {
        if (r.status === 3) {
          rejected.push(r);
          return;
        }
      }
    });

    if (savedTable) {
      savedTable.clear();
      savedTable.rows.add(saved);

      if ($('#saved-unwrap').hasClass('active')) {
        fnUnwrap(savedTable);
      }
      savedTable.draw();
    }
    if (submittedTable) {
      submittedTable.clear();
      submittedTable.rows.add(submitted);
      if ($('#submitted-unwrap').hasClass('active')) {
        fnUnwrap(submittedTable);
      }
      submittedTable.draw();
    }
    if (rejectedTable) {
      rejectedTable.clear();
      rejectedTable.rows.add(rejected);
      if ($('#rejected-unwrap').hasClass('active')) {
        fnUnwrap(rejectedTable);
      }
      rejectedTable.draw();
    }
    if (approvedTable) {
      approvedTable.clear();
      approvedTable.rows.add(approved);
      if ($('#approved-unwrap').hasClass('active')) {
        fnUnwrap(approvedTable);
      }
      approvedTable.draw();
    }
  }).fail(function () {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable requests.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  });
}

function submitFromModal(rows, savedTable, submittedTable) {
  $('#submit').prop('disabled', true);
  var number = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'submit'
      })
    }).done(function () {
      $(that).prepend('<strong class="fa fa-check"></strong>&nbsp;');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail(function (jqXHR) {
      $(that).prepend('<stromg class="fa fa-exclamation"></strong>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    }).always(function () {
      number = number - 1;
      if (number === 0) {
        initRequests(savedTable, submittedTable);
      }
    });
  });
}

function batchSubmit(savedTable, submittedTable) {
  var selected = fnGetSelected(savedTable, 'row-selected');
  var rows = [];
  if (selected.length) {
    $('#modalLabel').html('Submit the following ' + selected.length + ' requests for approval? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      rows.push(row);
      var data = savedTable.row(row).data();
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="submit" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#submit').click(function () {
      submitFromModal(rows, savedTable, submittedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Return</button>');
    $('#modal').modal('show');
  }
}

function cloneFromModal(rows, requests, savedTable) {
  $('#action').prop('disabled', true);
  var number = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function (index) {
    var that = this;
    var quantity = parseInt(String($('input', that).val()), 10);
    if (!isNaN(quantity) && quantity > 0) {
      $.ajax({
        url: basePath + '/requests/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          action: 'clone',
          request: requests[that.id],
          quantity: quantity
        })
      }).done(function () {
        $(that).prepend('<strong class="fa fa-check"></strong>&nbsp;');
        $(that).addClass('text-success');
        fnSetDeselect(rows[index], 'row-selected', 'select-row');
      }).fail(function (jqXHR) {
        $(that).prepend('<strong class="fa fa-exclamation"></strong>&nbsp;');
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-danger');
      }).always(function () {
        number = number - 1;
        if (number === 0) {
          initRequests(savedTable);
        }
      });
    } else {
      $(that).prepend('<strong class="fa fa-exclamation"></strong>&nbsp;');
      $(that).append(' : the quantity is not acceptable');
      $(that).addClass('text-danger');
    }
  });
}

function batchClone(table, savedTable) {
  var selected = fnGetSelected(table, 'row-selected');
  var requests = {};
  var rows = [];
  if (selected.length) {
    $('#modalLabel').html('Clone the following ' + selected.length + ' items? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      rows.push(row);
      var data = table.row(row).data();
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + ' <input type="text" placeholder="quantity" value="1" class="type[number] input-mini" min=1 max=20></div>');
      requests[data._id] = {
        basic: data.basic,
        ownerProvided: data.ownerProvided,
        from: data.from,
        to: data.to,
        length: data.length,
        conduit: data.conduit,
        comments: data.comments
      };
    });
    $('#modal .modal-footer').html('<button id="action" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#action').click(function () {
      cloneFromModal(rows, requests, savedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}

function revertFromModal(rows, savedTable, submittedTable) {
  $('#revert').prop('disabled', true);
  var number = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'revert'
      })
    }).done(function () {
      $(that).prepend('<strong class="fa fa-check"></strong>&nbsp;');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail(function (jqXHR) {
      $(that).prepend('<strong class="fa fa-exclamation"></strong>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    }).always(function () {
      number = number - 1;
      if (number === 0) {
        initRequests(savedTable, submittedTable);
      }
    });
  });
}


function batchRevert(savedTable, submittedTable) {
  var selected = fnGetSelected(submittedTable, 'row-selected');
  var rows = [];
  if (selected.length) {
    $('#modalLabel').html('Revert the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      rows.push(row);
      var data = submittedTable.row(row).data();
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="revert" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" type="button" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#revert').click(function () {
      revertFromModal(rows, savedTable, submittedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}

function deleteFromModal(table, rows) {
  $('#delete').prop('disabled', true);
  // var number = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/requests/' + this.id + '/',
      type: 'Delete'
    }).done(function () {
      $(that).wrap('<del></del>');
      $(that).addClass('text-success');
      table.row(rows[index]).remove().draw();
    }).fail(function (jqXHR) {
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    });
  });
}

function batchDelete(table) {
  var selected = fnGetSelected(table, 'row-selected');
  var rows = [];
  if (selected.length) {
    $('#modalLabel').html('Delete the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach(function (row) {
      var data = table.row(row).data();
      rows.push(row);
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="delete" type="button" class="btn btn-primary"">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#delete').click(function () {
      deleteFromModal(table, rows);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}


$(function () {
  var savedTable;
  var submittedTable;
  var rejectedTable;
  var approvedTable;
  var cablesTable;


  ajax401('');
  disableAjaxCache();

  /*saved tab starts*/
  // add footer first
  var savedAoColumns = ([selectColumn, editLinkColumn, createdOnColumn, updatedOnColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);

  fnAddFilterFoot('#saved-table', savedAoColumns);
  savedTable = $('#saved-table').DataTable({
    data: [],
    autoWidth: false,
    columns: savedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc']
    ],
    //dom: sDom2InoF,
    //oTableTools: oTableTools,
    //sScrollY: '50vh',
    //bScrollCollapse: true
  });

  $('#saved-wrap').click(function () {
    fnWrap(savedTable);
  });

  $('#saved-unwrap').click(function () {
    fnUnwrap(savedTable);
  });

  $('#saved-select-all').click(function () {
    fnSelectAll(savedTable, 'row-selected', 'select-row', true);
  });

  $('#saved-select-none').click(function () {
    fnDeselect(savedTable, 'row-selected', 'select-row');
  });

  $('#saved-delete').click(function () {
    batchDelete(savedTable);
  });

  $('#saved-submit').click(function () {
    batchSubmit(savedTable, submittedTable);
  });

  /*saved tab ends*/

  /*submitted tab starts*/
  var submittedAoColumns = ([selectColumn, detailsLinkColumn, submittedOnColumn, updatedOnColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  fnAddFilterFoot('#submitted-table', submittedAoColumns);

  submittedTable = $('#submitted-table').DataTable({
    data: [],
    autoWidth: false,
    columns: submittedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc']
    ],
    dom: sDom2InoF,
    //oTableTools: oTableTools,
    //sScrollY: '50vh',
    //bScrollCollapse: true
  });

  $('#submitted-wrap').click(function () {
    fnWrap(submittedTable);
  });

  $('#submitted-unwrap').click(function () {
    fnUnwrap(submittedTable);
  });

  $('#submitted-revert').click(function () {
    batchRevert(savedTable, submittedTable);
  });

  $('#submitted-select-all').click(function () {
    fnSelectAll(submittedTable, 'row-selected', 'select-row', true);
  });

  $('#submitted-select-none').click(function () {
    fnDeselect(submittedTable, 'row-selected', 'select-row');
  });

  /*submitted tab ends*/

  /*rejected tab starts*/

  var rejectedAoColumns = ([selectColumn, detailsLinkColumn, rejectedOnColumn, submittedOnColumn, rejectedByColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  fnAddFilterFoot('#rejected-table', rejectedAoColumns);
  rejectedTable = $('#rejected-table').DataTable({
    data: [],
    autoWidth: false,
    columns: rejectedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc']
    ],
    dom: sDom2InoF,
    //oTableTools: oTableTools,
    //sScrollY: '50vh',
    //bScrollCollapse: true
  });

  $('#rejected-wrap').click(function () {
    fnWrap(rejectedTable);
  });

  $('#rejected-unwrap').click(function () {
    fnUnwrap(rejectedTable);
  });

  $('#rejected-select-all').click(function () {
    fnSelectAll(rejectedTable, 'row-selected', 'select-row', true);
  });

  $('#rejected-select-none').click(function () {
    fnDeselect(rejectedTable, 'row-selected', 'select-row');
  });

  $('#rejected-delete').click(function () {
    batchDelete(rejectedTable);
  });

  /*rejected tab ends*/

  /*approved tab starts*/
  var approvedAoColumns = ([selectColumn, detailsLinkColumn, approvedOnColumn, approvedByColumn, submittedOnColumn] as Array<any>).concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  fnAddFilterFoot('#approved-table', approvedAoColumns);
  approvedTable = $('#approved-table').DataTable({
    data: [],
    autoWidth: false,
    columns: approvedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc']
    ],
    dom: sDom2InoF,
    //oTableTools: oTableTools,
    //sScrollY: '50vh',
    //bScrollCollapse: true
  });

  $('#approved-select-all').click(function () {
    fnSelectAll(approvedTable, 'row-selected', 'select-row', true);
  });

  $('#approved-select-none').click(function () {
    fnDeselect(approvedTable, 'row-selected', 'select-row');
  });

  $('#approved-wrap').click(function () {
    fnWrap(approvedTable);
  });

  $('#approved-unwrap').click(function () {
    fnUnwrap(approvedTable);
  });

  /*approved tab ends*/

  /*cables tab starts*/
  var cableAoCulumns = ([selectColumn, numberColumn, statusColumn, updatedOnColumn] as Array<any>).concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);

  fnAddFilterFoot('#cables-table', cableAoCulumns);
  cablesTable = $('#cables-table').DataTable({
    data: [],
    autoWidth: false,
    columns: cableAoCulumns,
    order: [
      [3, 'desc'],
      [1, 'desc']
    ],
    dom: sDom2InoF,
    //oTableTools: oTableTools,
    //sScrollY: '50vh',
    //bScrollCollapse: true
  });

  $('#cables-wrap').click(function () {
    fnWrap(cablesTable);
  });

  $('#cables-unwrap').click(function () {
    fnUnwrap(cablesTable);
  });

  /*cables tab ends*/

  initRequests(savedTable, submittedTable, rejectedTable, approvedTable, cablesTable);

  $('#reload').click(function () {
    initRequests(savedTable, submittedTable, rejectedTable, approvedTable, cablesTable);
  });

  $('#clone').click(function cloneHandler() {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    batchClone(activeTable, savedTable);
  });

  tabShownEvent();
  selectEvent();
  filterEvent();
  highlightedEvent();
});
