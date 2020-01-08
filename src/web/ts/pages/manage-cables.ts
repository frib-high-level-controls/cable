/**
 * Manage cables page for managing cables
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
  requestNumberColumn,
  requiredColumn,
  sButtons,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedByColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
  updatedOnLongColumn,
  versionColumn,
} from '../lib/table';

/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global barChart: false, json2List: false, ajax401: false, disableAjaxCache: false, moment: false*/
/*global selectColumn: false, submittedByColumn: false, numberColumn: false, requestNumberColumn: false, approvedByColumn: false, requiredColumn: false, obsoletedByColumn: false, oTableTools: false, fnSelectAll: false, fnDeselect: false, basicColumns: false, fromColumns: false, toColumns: false, conduitColumn: false, lengthColumn: false, commentsColumn: false, statusColumn: false, fnGetSelected: false, selectEvent: false, filterEvent: false, fnWrap: false, fnUnwrap: false, ownerProvidedColumn: false, approvedOnLongColumn: false, versionColumn: false, updatedOnLongColumn: false, obsoletedOnLongColumn: false, sDom2InoF: false, highlightedEvent: false, fnAddFilterHeadScroll: false, tabShownEvent: false, fnSetDeselect: false, formatCableStatus: false*/


var managerGlobal = {
  procuring_edit: false
};

function splitTags(s) {
  return s ? s.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*[,;]\s*/) : [];
}

function updateTdFromModal(cableNumber, property, parseType, oldValue, newValue, td, oTable) {
  $('#update').prop('disabled', true);
  var sOldValue = oldValue;
  if (parseType && parseType === 'array') {
    sOldValue = oldValue.join();
  }
  if (parseType && parseType === 'boolean') {
    if (['true', 'false'].indexOf(newValue.trim()) === -1) {
      $('#modal .modal-body').prepend('<div class="text-danger">Please input true or false</div>');
      $('#update').prop('disabled', false);
      return;
    }
    newValue = newValue.trim() === 'true';
    if (newValue === oldValue) {
      $('#modal .modal-body').prepend('<div class="text-danger">The new value is the same as the old one!</div>');
      $('#update').prop('disabled', false);
      return;
    }
  } else if (parseType && parseType === 'number') {
    if (newValue !== '') {
      newValue = parseFloat(newValue);
      if (Number.isNaN(newValue)) {
        $('#modal .modal-body').prepend('<div class="text-danger">Please input a number</div>');
        $('#update').prop('disabled', false);
        return
      }
    }
    if (sOldValue === newValue) {
      $('#modal .modal-body').prepend('<div class="text-danger">The new value is the same as the old one!</div>');
      $('#update').prop('disabled', false);
      return;
    }
  } else {
    newValue = newValue.trim();
    if (sOldValue.trim() === newValue) {
      $('#modal .modal-body').prepend('<div class="text-danger">The new value is the same as the old one!</div>');
      $('#update').prop('disabled', false);
      return;
    }
  }

  var data: any = {};
  data.action = 'update';
  data.property = property;
  if (oldValue === '') {
    oldValue = null;
  }
  if (newValue === '') {
    newValue = null;
  }
  data.oldValue = oldValue;
  if (parseType && parseType === 'array') {
    data.newValue = splitTags(newValue);
  } else {
    data.newValue = newValue;
  }
  $.ajax({
    url: basePath + '/cables/' + cableNumber + '/',
    type: 'PUT',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (json) {
      oTable.row(td).data(json).draw('full-hold');
      $('#modal .modal-body').html('<div class="text-success">The update succeded!</div>');
    },
    error: function (jqXHR) {
      $('#modal .modal-body').prepend('<div class="text-danger">' + jqXHR.responseText + '</div>');
    }
  });
}

function cableDetails(cableData) {
  delete cableData[0];
  var details = '';
  details += '<div id="cable-details" class="collapse out">';
  details += '<h4>Cable details</h4>';
  details += json2List(cableData);
  details += '</div>';
  return details;
}

function updateTd(td, oTable, columns: dtutil.ColumnSettings[]) {
  var cableData = oTable.row(td.parentNode).data();
  var cableNumber = cableData.number;
  var columnDef = columns[oTable.cell(td).index().column] as any;
  var property = columnDef.mData;
  var parseType = columnDef.sParseType;
  var title = columnDef.sTitle;
  var oldValue = oTable.cell(td).data();
  var renderedValue = oldValue;
  if (parseType && parseType === 'array') {
    renderedValue = oldValue.join();
  }
  $('#modalLabel').html('Update the cable <span class="text-info" style="text-decoration: underline;" data-toggle="collapse" data-target="#cable-details">' + cableNumber + '</span> ?');
  $('#modal .modal-body').empty();
  $('#modal .modal-body').append('<div>Update the value of <b>' + title + ' (' + property + ')</b></div>');
  $('#modal .modal-body').append('<div>From <b>' + renderedValue + '</b></div>');
  $('#modal .modal-body').append('<div>To <input id="new-value" type="text"></div>');
  $('#modal .modal-body').append(cableDetails(cableData));
  $('#modal .modal-footer').html('<button id="update" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
  $('#modal').modal('show');
  $('#update').click(function () {
    var newValue = $('#new-value').val();
    updateTdFromModal(cableNumber, property, parseType, oldValue, newValue, td, oTable);
  });
}

function actionFromModal(rows, action, data, activeTable, destinationTable) {
  if( !data ) {
    data = { action: action };
  }
  $('#modal .modal-body .cable').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/cables/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(data),
      dataType: 'json'
    }).done(function (cable) {
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
      switch (action) {
      case 'obsolete':
        activeTable.row(rows[index]).remove().draw('full-hold');
        destinationTable.row.add(cable).draw('full-hold');
        break;
      case 'To terminated':
      case 'From terminated':
      case 'To ready for termination':
      case 'From ready for termination':
        activeTable.row(rows[index]).data(cable).draw('full-hold');
        break;
      case 'Ready to use':
        activeTable.row(rows[index]).remove().draw('full-hold');
        destinationTable.row.add(cable).draw('full-hold');
        break;
      default:
        // do nothing
      }
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
    }).always(() => { });
  });
}

function newRequestFromModal(cables, rows) {
  $('#modal .modal-body .cable').each(function (index) {
    var that = this;
    var request = {
      basic: cables[index].basic,
      ownerProvided: cables[index].ownerProvided,
      from: cables[index].from,
      to: cables[index].to,
      length: cables[index].length,
      conduit: cables[index].conduit,
      comments: cables[index].comments
    };
    $.ajax({
      url: basePath + '/requests/',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'clone',
        request: request
      }),
      dataType: 'json'
    }).done(function (json) {
      $(that).prepend('<i class="icon-check"></i>');
      $(that).append(' : <a target="_blank" href="' + json.location + '">' + json.location + '</a>');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail(function (jqXHR) {
      $(that).prepend('<i class="icon-question"></i>');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-error');
    }).always(() => { });
  });
}

function batchAction(oTable, action, data, obsoletedTable) {
  var selected = fnGetSelected(oTable, 'row-selected');
  var cables = [];
  var rows = [];
  if (selected.length) {
    $('#modalLabel').html(action + ' the following ' + selected.length + ' cables? ');
    $('#modal .modal-body').empty();

    selected.forEach(function (row) {
      rows.push(row);
      var data = oTable.row(row).data();
      cables.push(data);
      $('#modal .modal-body').append('<div class="cable" id="' + data.number + '">' + data.number + '||' + formatCableStatus(data.status) + '||' + moment(data.approvedOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.submittedBy + '||' + data.basic.project + '</div>');
    });
    $('#modal .modal-footer').html('<button id="action" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');

    $('#modal').modal('show');
    $('#action').click(function () {
      $('#action').prop('disabled', true);
      if (action === 'create new request from') {
        newRequestFromModal(cables, rows);
      } else {
        actionFromModal(rows, action, data, oTable, obsoletedTable);
      }
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}


function batchActionWithNameAndDate(oTable, action, data, destinationTable) {
  var selected = fnGetSelected(oTable, 'row-selected');
  var cables = [];
  var rows = [];
  if (selected.length) {
    $('#modalLabel').html(action + ' the following ' + selected.length + ' cables? ');
    $('#modal .modal-body').empty();
    $('#modal .modal-body').append('<form class="form-horizontal" id="modalform"><div class="control-group"><label class="control-label">Staff name</label><div class="controls ui-front"><input id="modal-name" type="text" class="input-small" placeholder="Last, First"></div></div><div class="control-group"><label class="control-label">Date</label><div class="controls"><input id="modal-date" type="text" class="input-small" placeholder="date"></div></div></form>');
    selected.forEach(function (row) {
      rows.push(row);
      const data = oTable.row(row).data();
      cables.push(row);
      $('#modal .modal-body').append('<div class="cable" id="' + data.number + '">' + data.number + '||' + formatCableStatus(data.status) + '||' + moment(data.approvedOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.submittedBy + '||' + data.basic.project + '</div>');
    });
    $('#modal .modal-footer').html('<button id="action" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal-name').autocomplete(nameAuto('#modal-name', {}));
    $('#modal-date').datepicker({ dateFormat: 'yy-mm-dd' });
    $('#modal').modal('show');
    $('#action').click(function (e) {
      $('#action').prop('disabled', true);
      if( !data ) {
        data = { action: action };
      }
      data.name = $('#modal-name').val();
      data.date = $('#modal-date').datepicker('getDate');
      actionFromModal(rows, action, data, oTable, destinationTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" type="button" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
};


/*function batchCableAction(oTable, action, procuringTable, installingTable, installedTable) {
  var selected = fnGetSelected(oTable, 'row-selected');
  var cables = [];
  var required = [];
  if (selected.length) {
    $('#modalLabel').html(action + ' the following ' + selected.length + ' cables? ');
    $('#modal .modal-body').empty();
    $('#modal .modal-body').append('<form class="form-horizontal" id="modalform"><div class="control-group"><label class="control-label">Staff name</label><div class="controls"><input id="username" type="text" class="input-small" placeholder="Last, First"></div></div><div class="control-group"><label class="control-label">Date</label><div class="controls"><input id="date" type="text" class="input-small" placeholder="date"></div></div></form>');
    selected.forEach(function (row) {
      var data = oTable.fnGetData(row);
      cables.push(row);
      required.push(data.required);
      $('#modal .modal-body').append('<div class="cable" id="' + data.number + '">' + data.number + '||' + formatCableStatus(data.status) + '||' + moment(data.approvedOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.submittedBy + '||' + data.basic.project + '</div>');
    });
    $('#modal .modal-footer').html('<button id="action" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#username').autocomplete(nameAuto('#username', nameCache));
    $('#date').datepicker();
    $('#modal').modal('show');
    $('#action').click(function (e) {
      actionFromModal(cables, required, action, procuringTable, installingTable, installedTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
    $('#modal').modal('show');
  }
}

function actionFromModal(cables, required, action, procuringTable, installingTable, installedTable) {
  $('#action').prop('disabled', true);
  var number = $('#modal .modal-body .cable').length;
  $('#modal .modal-body .cable').each(function (index) {
    var that = this;
    $.ajax({
      url: '/cables/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        action: action,
        required: required[index],
        name: $('#username').val(),
        date: $('#date').val()
      }),
      dataType: 'json'
    }).done(function (cable) {
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
      fnSetDeselect(cables[index], 'row-selected', 'select-row');
      switch (action) {
      case 'order':
        procuringTable.fnUpdate(cable, cables[index]);
        break;
      case 'receive':
        procuringTable.fnUpdate(cable, cables[index]);
        break;
      case 'accept':
        procuringTable.fnUpdate(cable, cables[index]);
        break;
      case 'install':
        procuringTable.fnDeleteRow(cables[index]);
        installingTable.fnAddData(cable);
        break;
      case 'label':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'benchTerm':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'benchTest':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'pull':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'pulled':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'fieldTerm':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'fieldTest':
        installingTable.fnUpdate(cable, cables[index]);
        break;
      case 'use':
        installingTable.fnDeleteRow(cables[index]);
        installedTable.fnAddData(cable);
        break;
      default:
        // do nothing
      }
    })
      .fail(function (jqXHR, status, error) {
        $(that).prepend('<i class="icon-question"></i>');
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-error');
      })
      .always();
  });
}*/

$(function () {

  ajax401('');
  disableAjaxCache();

  const readyTime = Date.now();

  var procuringTable;
  var installingTable;
  var installedTable;
  var obsoletedTable;
  /*procuring tab starts*/

  var procuringAoColumns = ([selectColumn, numberColumn, requestNumberColumn, statusColumn, versionColumn, updatedOnLongColumn, approvedOnLongColumn, approvedByColumn, submittedByColumn] as Array<any>).concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let procuringTableWrapped = true;

  procuringTable = $('#procuring-table').DataTable({
    ajax: {
      url: basePath + '/cables/statuses/1/json',
      dataSrc: '',
    },
    autoWidth: true,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: procuringAoColumns,
    order: [
      [5, 'desc'],
      [6, 'desc'],
      [1, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '100%',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!procuringTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#procuring-table', procuringAoColumns);

  $('#procuring-table').on('init.dt', () => {
    console.log('Procuring table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#procuring-wrap').click(function () {
    procuringTableWrapped = true;
    fnWrap(procuringTable);
  });

  $('#procuring-unwrap').click(function () {
    procuringTableWrapped = false;
    fnUnwrap(procuringTable);
  });

  $('#procuring-select-all').click(function () {
    fnSelectAll(procuringTable, 'row-selected', 'select-row', true);
  });

  $('#procuring-select-none').click(function () {
    fnDeselect(procuringTable, 'row-selected', 'select-row');
  });

  $('#procuring-edit').click(function () {
    if (managerGlobal.procuring_edit) {
      $('#procuring-edit').html('<i class="fa fa-edit fa-lg"></i>&nbsp;Edit mode');
      managerGlobal.procuring_edit = false;
      $('#procuring-table td.editable').removeClass('info');
      $('#procuring-order, #procuring-receive, #procuring-accept, #procuring-to-install').prop('disabled', false);
    } else {
      $('#procuring-edit').html('<i class="fa fa-check-square fa-lg"></i>&nbsp;Check mode');
      managerGlobal.procuring_edit = true;
      $('#procuring-table td.editable').addClass('info');
      $('#procuring-order, #procuring-receive, #procuring-accept, #procuring-to-install').prop('disabled', true);
    }
  });

  $('#procuring-table').on('dblclick', 'td.editable', function (e) {
    e.preventDefault();
    if (managerGlobal.procuring_edit) {
      updateTd(this, procuringTable, procuringAoColumns);
    }
  });
  /*  $('#procuring-order, #procuring-receive, #procuring-accept').click(function (e) {
      batchCableAction(procuringTable, $(this).val(), procuringTable);
    });

    $('#procuring-to-install').click(function (e) {
      batchCableAction(procuringTable, $(this).val(), procuringTable, installingTable);
    });*/

  /*procuring tab ends*/

  /*installing tab starts*/
  var installingAoColumns = ([selectColumn, numberColumn, statusColumn, versionColumn, updatedOnLongColumn, submittedByColumn, requiredColumn] as Array<any>).concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let installingTableWrapped = true;

  installingTable = $('#installing-table').DataTable({
    ajax: {
      url: basePath + '/cables/statuses/2/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: installingAoColumns,
    order: [
      [4, 'desc'],
      [1, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!installingTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#installing-table', installingAoColumns);

  $('#installing-table').on('init.dt', () => {
    console.log('Installing table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#installing-wrap').click(function () {
    installingTableWrapped = true;
    fnWrap(installingTable);
  });

  $('#installing-unwrap').click(function () {
    installingTableWrapped = false;
    fnUnwrap(installingTable);
  });

  $('#installing-select-all').click(function () {
    fnSelectAll(installingTable, 'row-selected', 'select-row', true);
  });

  $('#installing-select-none').click(function () {
    fnDeselect(installingTable, 'row-selected', 'select-row');
  });

  $('#installing-to-ready-for-term').click(function (e) {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    var data = {
      action: 'update',
      property: 'to.readyForTerm',
      oldValue: false,
      newValue: true
    };
    batchAction(activeTable, 'To ready for termination', data, obsoletedTable);
  });

  $('#installing-from-ready-for-term').click(function (e) {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    var data = {
      action: 'update',
      property: 'from.readyForTerm',
      oldValue: false,
      newValue: true
    };
    batchAction(activeTable, 'From ready for termination', data, obsoletedTable);
  });

  $('#installing-to-terminated').click(function (e) {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    var data = {
      action: 'to-terminated',
    };
    batchActionWithNameAndDate(activeTable, 'To terminated', data, obsoletedTable);
  });

  $('#installing-from-terminated').click(function (e) {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    var data = {
      action: 'from-terminated',
    };
    batchActionWithNameAndDate(activeTable, 'From terminated', data, obsoletedTable);
  });


  /*  $('#installing-label, #installing-benchTerm, #installing-benchTest, #installing-to-pull, #installing-pull, #installing-fieldTerm, #installing-fieldTest').click(function (e) {
      batchCableAction(installingTable, $(this).val(), null, installingTable);
    });*/

  $('#installing-installed').click(function (e) {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    var data = {
      action: 'installed',
    };
    batchActionWithNameAndDate(activeTable, 'Ready to use', data, installedTable);
  });

  /*installing tab ends*/

  /*installed tab starts*/
  var installedAoColumns = ([selectColumn, numberColumn, statusColumn, versionColumn, updatedOnLongColumn, submittedByColumn] as Array<any>).concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let installedTableWrapped = true;

  installedTable = $('#installed-table').DataTable({
    ajax: {
      url: basePath + '/cables/statuses/3/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: installedAoColumns,
    order: [
      [4, 'desc'],
      [1, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true
    deferRender: true,
    createdRow(row) {
      if (!installedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#installed-table', installedAoColumns);

  $('#installed-table').on('init.dt', () => {
    console.log('Installed table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#installed-wrap').click(function () {
    installedTableWrapped = true;
    fnWrap(installedTable);
  });

  $('#installed-unwrap').click(function () {
    installedTableWrapped = false;
    fnUnwrap(installedTable);
  });

  $('#installed-select-all').click(function () {
    fnSelectAll(installedTable, 'row-selected', 'select-row', true);
  });

  $('#installed-select-none').click(function () {
    fnDeselect(installedTable, 'row-selected', 'select-row');
  });
  /*installed tab end*/

  /*obsoleted tab starts*/
  var obsoletedAoColumns = ([selectColumn, numberColumn, requestNumberColumn, statusColumn, versionColumn, obsoletedOnLongColumn, obsoletedByColumn, submittedByColumn] as Array<any>).concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let obsoletedTableWrapped = true;

  obsoletedTable = $('#obsoleted-table').DataTable({
    ajax: {
      url: basePath + '/cables/statuses/5/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: obsoletedAoColumns,
    order: [
      [5, 'desc'],
      [1, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    // scrollY: '50vh',
    // scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!obsoletedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#obsoleted-table', obsoletedAoColumns);

  $('#obsoleted-table').on('init.dt', () => {
    console.log('Obsoleted table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#obsoleted-wrap').click(function () {
    obsoletedTableWrapped = true;
    fnWrap(obsoletedTable);
  });

  $('#obsoleted-unwrap').click(function () {
    obsoletedTableWrapped = false;
    fnUnwrap(obsoletedTable);
  });

  // $('#obsoleted-select-all').click(function (e) {
  //   fnSelectAll(obsoletedTable, 'row-selected', 'select-row', true);
  // });

  // $('#obsoleted-select-none').click(function (e) {
  //   fnDeselect(obsoletedTable, 'row-selected', 'select-row');
  // });
  /*obsoleted tab end*/

  /*all tabs*/
  tabShownEvent();
  filterEvent();
  selectEvent();
  highlightedEvent();

  $('a[data-toggle="tab"]').on('shown', function (e) {
    if ($(e.target).prop('href').indexOf('obsoleted') === -1) {
      $('#obsolete').prop('disabled', false);
    } else {
      $('#obsolete').prop('disabled', true);
    }
  });

  $('#obsolete').click(function () {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    batchAction(activeTable, 'obsolete', null, obsoletedTable);
  });

  $('#new-request').click(function () {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    batchAction(activeTable, 'create new request from', null, obsoletedTable);
  });

  $('#reload').click(function () {
    procuringTable.ajax.reload();
    installingTable.ajax.reload();
    installedTable.ajax.reload();
    obsoletedTable.ajax.reload();
  });

  $('#bar').click(function () {
    var activeTable = $('.tab-pane.active .dataTable').DataTable();
    barChart(activeTable);
  });
});
