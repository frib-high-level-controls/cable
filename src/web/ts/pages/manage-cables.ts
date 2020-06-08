/**
 * Manage cables page for managing cables
 */
import './base';

import 'jquery-ui/themes/base/all.css';

import 'jquery-ui/ui/widgets/autocomplete';
import 'jquery-ui/ui/widgets/datepicker';

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
  formatCableStatus,
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
  approvedOnLongColumn,
  basicColumns,
  ColumnSettings,
  commentsColumn,
  conduitColumn,
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
  obsoletedByColumn,
  obsoletedOnLongColumn,
  ownerProvidedColumn,
  requestNumberColumn,
  requiredColumn,
  sButtons,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedByColumn,
  tabShownEvent,
  toColumns,
  updatedOnLongColumn,
  versionColumn,
} from '../lib/table';

type DTAPI = DataTables.Api;

interface ActionData<T = undefined> {
  action: string;
  property?: string;
  oldValue?: T;
  newValue?: T;
  name?: string;
  date?: Date;
}

const managerGlobal = {
  procuring_edit: false,
};

function splitTags(s?: string) {
  return s ? s.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*[,;]\s*/) : [];
}
// tslint:disable-next-line:max-line-length
function updateTdFromModal(cableNumber: string, property: string, parseType: string | undefined, oldValue: any, newValue: any, td: HTMLElement, oTable: DTAPI) {
  $('#update').prop('disabled', true);
  let sOldValue = oldValue;
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
        return;
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

  const data: any = {};
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
    success: (json) => {
      oTable.row(td).data(json).draw('full-hold');
      $('#modal .modal-body').html('<div class="text-success">The update succeded!</div>');
    },
    error: (jqXHR) => {
      $('#modal .modal-body').prepend('<div class="text-danger">' + jqXHR.responseText + '</div>');
    },
  });
}

function cableDetails(cableData: webapi.Cable) {
  delete (cableData as any)[0]; // Why this is here!?
  let details = '';
  details += '<div id="cable-details" class="collapse out">';
  details += '<h4>Cable details</h4>';
  details += json2List(cableData);
  details += '</div>';
  return details;
}

function updateTd(td: HTMLElement, oTable: DTAPI, columns: ColumnSettings[]) {
  const cableData = oTable.row(td.parentNode).data() as webapi.Cable;
  const cableNumber = cableData.number;
  const columnDef = columns[oTable.cell(td).index().column];
  const property = String(columnDef.data);
  const parseType = columnDef.sParseType;
  const title = columnDef.title;
  const oldValue = oTable.cell(td).data();
  let renderedValue = oldValue;
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
  $('#update').click(() => {
    const newValue = $('#new-value').val();
    updateTdFromModal(cableNumber, property, parseType, oldValue, newValue, td, oTable);
  });
}
// tslint:disable-next-line:max-line-length
function actionFromModal<T>(rows: DTAPI[], action: string, data: ActionData<T> | null, activeTable: DTAPI, destinationTable: DTAPI) {
  if (!data) {
    data = { action: action };
  }
  $('#modal .modal-body .cable').each(function(index) {
    const that = this;
    $.ajax({
      url: basePath + '/cables/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(data),
      dataType: 'json',
    }).done((cable) => {
      $(that).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
      switch (action) {
      case 'obsolete':
        // Type definition missing draw method!
        (activeTable.row(rows[index]).remove() as any).draw('full-hold');
        destinationTable.row.add(cable).draw('full-hold');
        break;
      case 'To terminated':
      case 'From terminated':
      case 'To ready for termination':
      case 'From ready for termination':
        activeTable.row(rows[index]).data(cable).draw('full-hold');
        break;
      case 'Ready to use':
        // Type definition missing draw method!
        (activeTable.row(rows[index]).remove() as any).draw('full-hold');
        destinationTable.row.add(cable).draw('full-hold');
        break;
      default:
        // do nothing
      }
    }).fail((jqXHR) => {
      $(that).prepend('<i class="fas fa-question text-danger"></i>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    });
  });
}

function newRequestFromModal(cables: webapi.Cable[], rows: DTAPI[]) {
  $('#modal .modal-body .cable').each(function(index) {
    const that = this;
    const request = {
      basic: cables[index].basic,
      ownerProvided: cables[index].ownerProvided,
      from: cables[index].from,
      to: cables[index].to,
      length: cables[index].length,
      conduit: cables[index].conduit,
      comments: cables[index].comments,
    };
    $.ajax({
      url: basePath + '/requests/',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        action: 'clone',
        request: request,
      }),
      dataType: 'json',
    }).done((json) => {
      $(that).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(that).append('<div class="ml-2"><a target="_blank" href="' + json.location + '">Open New Request</a><div>');
      $(that).addClass('text-success');
      fnSetDeselect(rows[index], 'row-selected', 'select-row');
    }).fail((jqXHR) => {
      $(that).prepend('<i class="fas fa-question text-danger"></i>&nbsp;');
      $(that).append(' : ' + jqXHR.responseText);
      $(that).addClass('text-danger');
    });
  });
}

function batchAction<T>(oTable: DTAPI, action: string, data: ActionData<T> | null, obsoletedTable: DTAPI): void {
  const selected = fnGetSelected(oTable, 'row-selected');
  const cables: webapi.Cable[] = [];
  const rows: DTAPI[] = [];
  if (selected.length) {
    $('#modalLabel').html(action + ' the following ' + selected.length + ' cables? ');
    $('#modal .modal-body').empty();

    selected.forEach((row) => {
      rows.push(row);
      const d = oTable.row(row).data() as webapi.Cable;
      cables.push(d);
      // tslint:disable-next-line:max-line-length
      $('#modal .modal-body').append('<div class="cable" id="' + d.number + '">' + d.number + '||' + formatCableStatus(d.status) + '||' + moment(d.approvedOn).format('YYYY-MM-DD HH:mm:ss') + '||' + d.submittedBy + '||' + d.basic.project + '</div>');
    });
    $('#modal .modal-footer').html('<button id="action" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');

    $('#modal').modal('show');
    $('#action').click(() => {
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
    // tslint:disable-next-line:max-line-length
    $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}

// tslint:disable-next-line:max-line-length
function batchActionWithNameAndDate<T>(oTable: DTAPI, action: string, data: ActionData<T> | null, destinationTable: DTAPI) {
  const selected = fnGetSelected(oTable, 'row-selected');
  const cables: webapi.Cable[] = [];
  const rows: DTAPI[] = [];
  if (selected.length) {
    $('#modalLabel').html(action + ' the following ' + selected.length + ' cables? ');
    $('#modal .modal-body').empty();
    $('#modal .modal-body').append('<form class="form-horizontal" id="modalform"><div class="control-group"><label class="control-label">Staff name</label><div class="controls ui-front"><input id="modal-name" type="text" class="input-small" placeholder="Last, First"></div></div><div class="control-group"><label class="control-label">Date</label><div class="controls"><input id="modal-date" type="text" class="input-small" placeholder="date"></div></div></form>');
    selected.forEach((row) => {
      rows.push(row);
      const d = oTable.row(row).data() as webapi.Cable;
      cables.push(d);
      // tslint:disable-next-line:max-line-length
      $('#modal .modal-body').append('<div class="cable" id="' + d.number + '">' + d.number + '||' + formatCableStatus(d.status) + '||' + moment(d.approvedOn).format('YYYY-MM-DD HH:mm:ss') + '||' + d.submittedBy + '||' + d.basic.project + '</div>');
    });
    $('#modal .modal-footer').html('<button id="action" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
    $('#modal-name').autocomplete(nameAuto('#modal-name', {}));
    $('#modal-date').datepicker({ dateFormat: 'yy-mm-dd' });
    $('#modal').modal('show');
    $('#action').click((e) => {
      $('#action').prop('disabled', true);
      if (!data) {
        data = { action: action };
      }
      data.name = String($('#modal-name').val());
      data.date = $('#modal-date').datepicker('getDate');
      actionFromModal(rows, action, data, oTable, destinationTable);
    });
  } else {
    $('#modalLabel').html('Alert');
    $('#modal .modal-body').html('No request has been selected!');
    // tslint:disable-next-line:max-line-length
    $('#modal .modal-footer').html('<button data-dismiss="modal" type="button" class="btn btn-secondary">Close</button>');
    $('#modal').modal('show');
  }
}


// function batchCableAction(oTable, action, procuringTable, installingTable, installedTable) {
//   var selected = fnGetSelected(oTable, 'row-selected');
//   var cables = [];
//   var required = [];
//   if (selected.length) {
//     $('#modalLabel').html(action + ' the following ' + selected.length + ' cables? ');
//     $('#modal .modal-body').empty();
// tslint:disable-next-line:max-line-length
//     $('#modal .modal-body').append('<form class="form-horizontal" id="modalform"><div class="control-group"><label class="control-label">Staff name</label><div class="controls"><input id="username" type="text" class="input-small" placeholder="Last, First"></div></div><div class="control-group"><label class="control-label">Date</label><div class="controls"><input id="date" type="text" class="input-small" placeholder="date"></div></div></form>');
//     selected.forEach(function (row) {
//       var data = oTable.fnGetData(row);
//       cables.push(row);
//       required.push(data.required);
// tslint:disable-next-line:max-line-length
//       $('#modal .modal-body').append('<div class="cable" id="' + data.number + '">' + data.number + '||' + formatCableStatus(data.status) + '||' + moment(data.approvedOn).format('YYYY-MM-DD HH:mm:ss') + '||' + data.submittedBy + '||' + data.basic.project + '</div>');
//     });
// tslint:disable-next-line:max-line-length
//     $('#modal .modal-footer').html('<button id="action" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
//     $('#username').autocomplete(nameAuto('#username', nameCache));
//     $('#date').datepicker();
//     $('#modal').modal('show');
//     $('#action').click(function (e) {
//       actionFromModal(cables, required, action, procuringTable, installingTable, installedTable);
//     });
//   } else {
//     $('#modalLabel').html('Alert');
//     $('#modal .modal-body').html('No request has been selected!');
//     $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
//     $('#modal').modal('show');
//   }
// }

// function actionFromModal(cables, required, action, procuringTable, installingTable, installedTable) {
//   $('#action').prop('disabled', true);
//   var number = $('#modal .modal-body .cable').length;
//   $('#modal .modal-body .cable').each(function (index) {
//     var that = this;
//     $.ajax({
//       url: '/cables/' + that.id + '/',
//       type: 'PUT',
//       contentType: 'application/json',
//       data: JSON.stringify({
//         action: action,
//         required: required[index],
//         name: $('#username').val(),
//         date: $('#date').val()
//       }),
//       dataType: 'json'
//     }).done(function (cable) {
//       $(that).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
//       $(that).addClass('text-success');
//       fnSetDeselect(cables[index], 'row-selected', 'select-row');
//       switch (action) {
//       case 'order':
//         procuringTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'receive':
//         procuringTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'accept':
//         procuringTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'install':
//         procuringTable.fnDeleteRow(cables[index]);
//         installingTable.fnAddData(cable);
//         break;
//       case 'label':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'benchTerm':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'benchTest':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'pull':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'pulled':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'fieldTerm':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'fieldTest':
//         installingTable.fnUpdate(cable, cables[index]);
//         break;
//       case 'use':
//         installingTable.fnDeleteRow(cables[index]);
//         installedTable.fnAddData(cable);
//         break;
//       default:
//         // do nothing
//       }
//     })
//       .fail(function (jqXHR, status, error) {
//         $(that).prepend('<i class="fas fa-question text-danger"></i>&nbsp;');
//         $(that).append(' : ' + jqXHR.responseText);
//         $(that).addClass('text-danger');
//       })
//       .always();
//   });
// }

$(() => {

  ajax401('');
  disableAjaxCache();

  const readyTime = Date.now();

  // tslint:disable-next-line:max-line-length
  const procuringAoColumns = [selectColumn, numberColumn, requestNumberColumn, statusColumn, versionColumn, updatedOnLongColumn, approvedOnLongColumn, approvedByColumn, submittedByColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat(conduitColumn, lengthColumn, commentsColumn);
  let procuringTableWrapped = true;

  const procuringTable = $('#procuring-table').DataTable({
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
      [1, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '55vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!procuringTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#procuring-table', procuringAoColumns);

  $('a.nav-link[href="#procuring"]').one('shown.bs.tab', (evt) => {
    // ensure table headers are aligned with table body
    procuringTable.columns.adjust();
  });

  $('#procuring-table').on('init.dt', () => {
    // tslint:disable-next-line:no-console
    console.log('Procuring table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#procuring-wrap').click(() => {
    procuringTableWrapped = true;
    fnWrap(procuringTable);
  });

  $('#procuring-unwrap').click(() => {
    procuringTableWrapped = false;
    fnUnwrap(procuringTable);
  });

  $('#procuring-select-all').click(() => {
    fnSelectAll(procuringTable, 'row-selected', 'select-row', true);
  });

  $('#procuring-select-none').click(() => {
    fnDeselect(procuringTable, 'row-selected', 'select-row');
  });

  $('#procuring-edit').click(() => {
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

  $('#procuring-table').on('dblclick', 'td.editable', function(this: HTMLElement, e) {
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
  // tslint:disable-next-line:max-line-length
  const installingAoColumns = [selectColumn, numberColumn, statusColumn, versionColumn, updatedOnLongColumn, submittedByColumn, requiredColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let installingTableWrapped = true;

  const installingTable = $('#installing-table').DataTable({
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
      [1, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '55vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!installingTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#installing-table', installingAoColumns);

  $('a.nav-link[href="#installing"]').one('shown.bs.tab', (evt) => {
    // ensure table headers are aligned with table body
    installingTable.columns.adjust();
  });

  $('#installing-table').on('init.dt', () => {
    // tslint:disable-next-line:no-console
    console.log('Installing table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#installing-wrap').click(() => {
    installingTableWrapped = true;
    fnWrap(installingTable);
  });

  $('#installing-unwrap').click(() => {
    installingTableWrapped = false;
    fnUnwrap(installingTable);
  });

  $('#installing-select-all').click(() => {
    fnSelectAll(installingTable, 'row-selected', 'select-row', true);
  });

  $('#installing-select-none').click(() => {
    fnDeselect(installingTable, 'row-selected', 'select-row');
  });

  $('#installing-to-ready-for-term').click((e) => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    const data: ActionData<boolean> = {
      action: 'update',
      property: 'to.readyForTerm',
      oldValue: false,
      newValue: true,
    };
    batchAction(activeTable, 'To ready for termination', data, obsoletedTable);
  });

  $('#installing-from-ready-for-term').click((e) => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    const data: ActionData<boolean> = {
      action: 'update',
      property: 'from.readyForTerm',
      oldValue: false,
      newValue: true,
    };
    batchAction(activeTable, 'From ready for termination', data, obsoletedTable);
  });

  $('#installing-to-terminated').click((e) => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    const data: ActionData = {
      action: 'to-terminated',
    };
    batchActionWithNameAndDate(activeTable, 'To terminated', data, obsoletedTable);
  });

  $('#installing-from-terminated').click((e) => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    const data: ActionData = {
      action: 'from-terminated',
    };
    batchActionWithNameAndDate(activeTable, 'From terminated', data, obsoletedTable);
  });

  // tslint:disable-next-line:max-line-length
  // $('#installing-label, #installing-benchTerm, #installing-benchTest, #installing-to-pull, #installing-pull, #installing-fieldTerm, #installing-fieldTest').click(function (e) {
  //   batchCableAction(installingTable, $(this).val(), null, installingTable);
  // });

  $('#installing-installed').click((e) => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    const data = {
      action: 'installed',
    };
    batchActionWithNameAndDate(activeTable, 'Ready to use', data, installedTable);
  });

  /*installing tab ends*/

  /*installed tab starts*/
  // tslint:disable-next-line:max-line-length
  const installedAoColumns = [selectColumn, numberColumn, statusColumn, versionColumn, updatedOnLongColumn, submittedByColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let installedTableWrapped = true;

  const installedTable = $('#installed-table').DataTable({
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
      [1, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '55vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!installedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#installed-table', installedAoColumns);

  $('a.nav-link[href="#installed"]').one('shown.bs.tab', (evt) => {
    // ensure table headers are aligned with table body
    installedTable.columns.adjust();
  });

  $('#installed-table').on('init.dt', () => {
    // tslint:disable-next-line:no-console
    console.log('Installed table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#installed-wrap').click(() => {
    installedTableWrapped = true;
    fnWrap(installedTable);
  });

  $('#installed-unwrap').click(() => {
    installedTableWrapped = false;
    fnUnwrap(installedTable);
  });

  $('#installed-select-all').click(() => {
    fnSelectAll(installedTable, 'row-selected', 'select-row', true);
  });

  $('#installed-select-none').click(() => {
    fnDeselect(installedTable, 'row-selected', 'select-row');
  });
  /*installed tab end*/

  /*obsoleted tab starts*/
  // tslint:disable-next-line:max-line-length
  const obsoletedAoColumns = [selectColumn, numberColumn, requestNumberColumn, statusColumn, versionColumn, obsoletedOnLongColumn, obsoletedByColumn, submittedByColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let obsoletedTableWrapped = true;

  const obsoletedTable = $('#obsoleted-table').DataTable({
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
      [1, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '55vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!obsoletedTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });
  dtutil.addFilterHead('#obsoleted-table', obsoletedAoColumns);

  $('a.nav-link[href="#obsoleted"]').one('shown.bs.tab', (evt) => {
    // ensure table headers are aligned with table body
    obsoletedTable.columns.adjust();
  });

  $('#obsoleted-table').on('init.dt', () => {
    // tslint:disable-next-line:no-console
    console.log('Obsoleted table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#obsoleted-wrap').click(() => {
    obsoletedTableWrapped = true;
    fnWrap(obsoletedTable);
  });

  $('#obsoleted-unwrap').click(() => {
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

  $('a[data-toggle="tab"]').on('shown', (e) => {
    if ($(e.target).prop('href').indexOf('obsoleted') === -1) {
      $('#obsolete').prop('disabled', false);
    } else {
      $('#obsolete').prop('disabled', true);
    }
  });

  $('#obsolete').click(() => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    batchAction(activeTable, 'obsolete', null, obsoletedTable);
  });

  $('#new-request').click(() => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    batchAction(activeTable, 'create new request from', null, obsoletedTable);
  });

  $('#reload').click(() => {
    procuringTable.ajax.reload();
    installingTable.ajax.reload();
    installedTable.ajax.reload();
    obsoletedTable.ajax.reload();
  });

  $('#bar').click(() => {
    const activeTable = $('.tab-pane.active .dataTable').DataTable();
    barChart(activeTable);
  });
});
