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
    table.fnClearTable();
    table.fnAddData(json);
    if ($('#cables-unwrap').hasClass('active')) {
      fnUnwrap(table);
    }
    table.fnDraw();

  }).fail(function () {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable requests.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  });
}

function initRequests(savedTable, submittedTable, rejectedTable, approvedTable, cablesTable) {
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
      savedTable.fnClearTable();
      savedTable.fnAddData(saved);

      if ($('#saved-unwrap').hasClass('active')) {
        fnUnwrap(savedTable);
      }
      savedTable.fnDraw();
    }
    if (submittedTable) {
      submittedTable.fnClearTable();
      submittedTable.fnAddData(submitted);
      if ($('#submitted-unwrap').hasClass('active')) {
        fnUnwrap(submittedTable);
      }
      submittedTable.fnDraw();
    }
    if (rejectedTable) {
      rejectedTable.fnClearTable();
      rejectedTable.fnAddData(rejected);
      if ($('#rejected-unwrap').hasClass('active')) {
        fnUnwrap(rejectedTable);
      }
      rejectedTable.fnDraw();
    }
    if (approvedTable) {
      approvedTable.fnClearTable();
      approvedTable.fnAddData(approved);
      if ($('#approved-unwrap').hasClass('active')) {
        fnUnwrap(approvedTable);
      }
      approvedTable.fnDraw();
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
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
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
      var data = savedTable.fnGetData(row);
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="submit" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
    $('#submit').click(function () {
      submitFromModal(rows, savedTable, submittedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
  }
}

function cloneFromModal(rows, requests, savedTable) {
  $('#action').prop('disabled', true);
  var number = $('#modal .modal-body .request').length;
  $('#modal .modal-body .request').each(function (index) {
    var that = this;
    var quantity = parseInt($('input', that).val(), 10);
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
        $(that).prepend('<i class="icon-check"></i>');
        $(that).addClass('text-success');
        fnSetDeselect(rows[index], 'row-selected', 'select-row');
      }).fail(function (jqXHR) {
        $(that).prepend('<i class="icon-question"></i>');
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-error');
      }).always(function () {
        number = number - 1;
        if (number === 0) {
          initRequests(savedTable);
        }
      });
    } else {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : the quantity is not acceptable');
      $(that).addClass('text-error');
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
      var data = table.fnGetData(row);
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
    $('#modal .modal-footer').html('<button id="action" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
    $('#action').click(function () {
      cloneFromModal(rows, requests, savedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
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
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
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
      var data = submittedTable.fnGetData(row);
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="revert" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
    $('#revert').click(function () {
      revertFromModal(rows, savedTable, submittedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
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
      table.fnDeleteRow(rows[index]);
    }).fail(function (jqXHR) {
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
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
      var data = table.fnGetData(row);
      rows.push(row);
      $('#modal .modal-body').append('<div class="request" id="' + data._id + '">' + moment(data.createdOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.basic.originCategory + data.basic.originSubcategory + data.basic.signalClassification + '||' + data.basic.wbs + '</div>');
    });
    $('#modal .modal-footer').html('<button id="delete" class="btn btn-primary"">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
    $('#delete').click(function () {
      deleteFromModal(table, rows);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
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
  var savedAoColumns = [selectColumn, editLinkColumn, createdOnColumn, updatedOnColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);

  fnAddFilterFoot('#saved-table', savedAoColumns);
  savedTable = $('#saved-table').dataTable({
    aaData: [],
    bAutoWidth: false,
    aoColumns: savedAoColumns,
    aaSorting: [
      [2, 'desc'],
      [3, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
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
  var submittedAoColumns = [selectColumn, detailsLinkColumn, submittedOnColumn, updatedOnColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  fnAddFilterFoot('#submitted-table', submittedAoColumns);

  submittedTable = $('#submitted-table').dataTable({
    aaData: [],
    bAutoWidth: false,
    aoColumns: submittedAoColumns,
    'aaSorting': [
      [2, 'desc'],
      [3, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
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

  var rejectedAoColumns = [selectColumn, detailsLinkColumn, rejectedOnColumn, submittedOnColumn, rejectedByColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  fnAddFilterFoot('#rejected-table', rejectedAoColumns);
  rejectedTable = $('#rejected-table').dataTable({
    aaData: [],
    bAutoWidth: false,
    aoColumns: rejectedAoColumns,
    aaSorting: [
      [2, 'desc'],
      [3, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
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
  var approvedAoColumns = [selectColumn, detailsLinkColumn, approvedOnColumn, approvedByColumn, submittedOnColumn].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  fnAddFilterFoot('#approved-table', approvedAoColumns);
  approvedTable = $('#approved-table').dataTable({
    aaData: [],
    bAutoWidth: false,
    aoColumns: approvedAoColumns,
    aaSorting: [
      [2, 'desc'],
      [3, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
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
  var cableAoCulumns = [selectColumn, numberColumn, statusColumn, updatedOnColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);

  fnAddFilterFoot('#cables-table', cableAoCulumns);
  cablesTable = $('#cables-table').dataTable({
    aaData: [],
    bAutoWidth: false,
    aoColumns: cableAoCulumns,
    'aaSorting': [
      [3, 'desc'],
      [1, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools,
    sScrollY: '50vh',
    bScrollCollapse: true
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
    var activeTable = $($.fn.dataTable.fnTables(true)[0]).dataTable();
    batchClone(activeTable, savedTable);
  });

  tabShownEvent();
  selectEvent();
  filterEvent();
  highlightedEvent();
});
