/*
 * Main user page for managing cable requests
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
  approvedByColumn,
  approvedOnColumn,
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
  fromColumns,
  highlightedEvent,
  lengthColumn,
  numberColumn,
  ownerProvidedColumn,
  rejectedByColumn,
  rejectedOnColumn,
  sButtons,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
} from '../lib/table';


function initCable(table) {
  $.ajax({
    url: basePath + '/cables/json',
    type: 'GET',
    contentType: 'application/json',
    dataType: 'json',
  }).done((json) => {
    table.clear();
    table.rows.add(json);
    if ($('#cables-unwrap').hasClass('active')) {
      fnUnwrap(table);
    }
    table.draw();

  }).fail(() => {
    $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>Cannot reach the server for cable requests.</div>');
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
    dataType: 'json',
  }).done((json) => {
    const saved = [];
    const submitted = [];
    const rejected = [];
    const approved = [];

    json.forEach((r) => {
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
  }).fail(() => {
    $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>Cannot reach the server for cable requests.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  });
}

function submitFromModal(rows, savedTable, submittedTable) {
  $('#submit').prop('disabled', true);
  let n = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function(index) {
    const that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'submit',
      }),
    }).done(() => {
      $(that).prepend('<strong class="fa fa-check"></strong>&nbsp;');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail((jqXHR) => {
      $(that).prepend('<stromg class="fa fa-exclamation"></strong>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    }).always(() => {
      n = n - 1;
      if (n === 0) {
        initRequests(savedTable, submittedTable);
      }
    });
  });
}

function batchSubmit(savedTable, submittedTable) {
  const selected = fnGetSelected(savedTable, 'row-selected');
  const rows = [];
  if (selected.length) {
    $('#modalLabel').html('Submit the following ' + selected.length + ' requests for approval? ');
    $('#modal .modal-body').empty();
    selected.forEach((row) => {
      rows.push(row);
      const data = savedTable.row(row).data();
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="submit" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#submit').click(() => {
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
  let n = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function(index) {
    const that = this;
    const quantity = parseInt(String($('input', that).val()), 10);
    if (!isNaN(quantity) && quantity > 0) {
      $.ajax({
        url: basePath + '/requests/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          action: 'clone',
          request: requests[that.id],
          quantity: quantity,
        }),
      }).done(() => {
        $(that).prepend('<strong class="fa fa-check"></strong>&nbsp;');
        $(that).addClass('text-success');
        fnSetDeselect(rows[index], 'row-selected', 'select-row');
      }).fail((jqXHR) => {
        $(that).prepend('<strong class="fa fa-exclamation"></strong>&nbsp;');
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-danger');
      }).always(() => {
        n = n - 1;
        if (n === 0) {
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
  const selected = fnGetSelected(table, 'row-selected');
  const requests = {};
  const rows = [];
  if (selected.length) {
    $('#modalLabel').html('Clone the following ' + selected.length + ' items? ');
    $('#modal .modal-body').empty();
    selected.forEach((row) => {
      rows.push(row);
      const data = table.row(row).data();
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + ' <input type="text" placeholder="quantity" value="1" class="type[number] input-mini" min=1 max=20></div>');
      requests[data._id] = {
        basic: data.basic,
        ownerProvided: data.ownerProvided,
        from: data.from,
        to: data.to,
        length: data.length,
        conduit: data.conduit,
        comments: data.comments,
      };
    });
    $('#modal .modal-footer').html('<button id="action" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#action').click(() => {
      cloneFromModal(rows, requests, savedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    // tslint:disable:max-line-length
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}

function revertFromModal(rows, savedTable, submittedTable) {
  $('#revert').prop('disabled', true);
  let n = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function(index) {
    const that = this;
    $.ajax({
      url: basePath + '/requests/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'revert',
      }),
    }).done(() => {
      $(that).prepend('<strong class="fa fa-check"></strong>&nbsp;');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail((jqXHR) => {
      $(that).prepend('<strong class="fa fa-exclamation"></strong>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    }).always(() => {
      n = n - 1;
      if (n === 0) {
        initRequests(savedTable, submittedTable);
      }
    });
  });
}


function batchRevert(savedTable, submittedTable) {
  const selected = fnGetSelected(submittedTable, 'row-selected');
  const rows = [];
  if (selected.length) {
    $('#modalLabel').html('Revert the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach((row) => {
      rows.push(row);
      const data = submittedTable.row(row).data();
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="revert" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" type="button" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#revert').click(() => {
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
  $('#modal .modal-body .request').each(function(index) {
    const that = this;
    $.ajax({
      url: basePath + '/requests/' + this.id + '/',
      type: 'Delete',
    }).done(() => {
      $(that).wrap('<del></del>');
      $(that).addClass('text-success');
      table.row(rows[index]).remove().draw();
    }).fail((jqXHR) => {
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    });
  });
}

function batchDelete(table) {
  const selected = fnGetSelected(table, 'row-selected');
  const rows = [];
  if (selected.length) {
    $('#modalLabel').html('Delete the following ' + selected.length + ' requests? ');
    $('#modal .modal-body').empty();
    selected.forEach((row) => {
      const data = table.row(row).data();
      rows.push(row);
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="delete" type="button" class="btn btn-primary"">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
    $('#delete').click(() => {
      deleteFromModal(table, rows);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}


$(() => {
  let savedTable;
  let submittedTable;
  let rejectedTable;
  let approvedTable;
  let cablesTable;


  ajax401('');
  disableAjaxCache();

  /*saved tab starts*/
  // add footer first
  const savedAoColumns = [selectColumn, editLinkColumn, createdOnColumn, updatedOnColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let savedTableWrapped = true;

  savedTable = $('#saved-table').DataTable({
    data: [],
    autoWidth: false,
    columns: savedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!savedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#saved-table', savedAoColumns);

  $('#saved-wrap').click(() => {
    savedTableWrapped = true;
    fnWrap(savedTable);
  });

  $('#saved-unwrap').click(() => {
    savedTableWrapped = false;
    fnUnwrap(savedTable);
  });

  $('#saved-select-all').click(() => {
    fnSelectAll(savedTable, 'row-selected', 'select-row', true);
  });

  $('#saved-select-none').click(() => {
    fnDeselect(savedTable, 'row-selected', 'select-row');
  });

  $('#saved-delete').click(() => {
    batchDelete(savedTable);
  });

  $('#saved-submit').click(() => {
    batchSubmit(savedTable, submittedTable);
  });

  /*saved tab ends*/

  /*submitted tab starts*/
  const submittedAoColumns = [selectColumn, detailsLinkColumn, submittedOnColumn, updatedOnColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let submittedTableWrapped = true;

  submittedTable = $('#submitted-table').DataTable({
    data: [],
    autoWidth: false,
    columns: submittedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!submittedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#submitted-table', submittedAoColumns);

  $('#submitted-wrap').click(() => {
    submittedTableWrapped = true;
    fnWrap(submittedTable);
  });

  $('#submitted-unwrap').click(() => {
    submittedTableWrapped = false;
    fnUnwrap(submittedTable);
  });

  $('#submitted-revert').click(() => {
    batchRevert(savedTable, submittedTable);
  });

  $('#submitted-select-all').click(() => {
    fnSelectAll(submittedTable, 'row-selected', 'select-row', true);
  });

  $('#submitted-select-none').click(() => {
    fnDeselect(submittedTable, 'row-selected', 'select-row');
  });

  /*submitted tab ends*/

  /*rejected tab starts*/

  const rejectedAoColumns = [selectColumn, detailsLinkColumn, rejectedOnColumn, submittedOnColumn, rejectedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let rejectedTableWrapped = true;

  rejectedTable = $('#rejected-table').DataTable({
    data: [],
    autoWidth: false,
    columns: rejectedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!rejectedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#rejected-table', rejectedAoColumns);

  $('#rejected-wrap').click(() => {
    rejectedTableWrapped = true;
    fnWrap(rejectedTable);
  });

  $('#rejected-unwrap').click(() => {
    rejectedTableWrapped = false;
    fnUnwrap(rejectedTable);
  });

  $('#rejected-select-all').click(() => {
    fnSelectAll(rejectedTable, 'row-selected', 'select-row', true);
  });

  $('#rejected-select-none').click(() => {
    fnDeselect(rejectedTable, 'row-selected', 'select-row');
  });

  $('#rejected-delete').click(() => {
    batchDelete(rejectedTable);
  });

  /*rejected tab ends*/

  /*approved tab starts*/
  const approvedAoColumns = [selectColumn, detailsLinkColumn, approvedOnColumn, approvedByColumn, submittedOnColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let approvedTableWrapped = true;

  approvedTable = $('#approved-table').DataTable({
    data: [],
    autoWidth: false,
    columns: approvedAoColumns,
    order: [
      [2, 'desc'],
      [3, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!approvedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#approved-table', approvedAoColumns);

  $('#approved-select-all').click(() => {
    fnSelectAll(approvedTable, 'row-selected', 'select-row', true);
  });

  $('#approved-select-none').click(() => {
    fnDeselect(approvedTable, 'row-selected', 'select-row');
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

  /*cables tab starts*/
  const cableAoCulumns = [selectColumn, numberColumn, statusColumn, updatedOnColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let cablesTableWrapped = true;

  cablesTable = $('#cables-table').DataTable({
    data: [],
    autoWidth: false,
    columns: cableAoCulumns,
    order: [
      [3, 'desc'],
      [1, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    createdRow(row) {
      if (!cablesTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#cables-table', cableAoCulumns);

  $('#cables-wrap').click(() => {
    cablesTableWrapped = true;
    fnWrap(cablesTable);
  });

  $('#cables-unwrap').click(() => {
    cablesTableWrapped = false;
    fnUnwrap(cablesTable);
  });

  /*cables tab ends*/

  initRequests(savedTable, submittedTable, rejectedTable, approvedTable, cablesTable);

  $('#reload').click(() => {
    initRequests(savedTable, submittedTable, rejectedTable, approvedTable, cablesTable);
  });

  $('#clone').click(function cloneHandler() {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    batchClone(activeTable, savedTable);
  });

  tabShownEvent();
  selectEvent();
  filterEvent();
  highlightedEvent();
});
