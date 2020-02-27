/*
 * Users page for searching and modifying user profiles
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

import Bloodhound from 'bloodhound';

import * as $ from 'jquery';

import {
  filterEvent,
  fnGetSelected,
  fullNameNoLinkColumn,
  lastVisitedOnColumn,
  rolesColumn,
  sButtons,
  sDom,
  selectColumn,
  selectEvent,
  useridColumn,
  wbsColumn,
} from '../lib/table';

type DTAPI = DataTables.Api;

function inArray(name: string, ao: DTAPI) {
  // DataTables.Api is only Array-like,
  // so TS does not allow use of for-of.
  // tslint:disable:prefer-for-of
  for (let i = 0; i < ao.length; i += 1) {
    if (ao[i].name === name) {
      return true;
    }
  }
  return false;
}

function initTable(oTable: DTAPI) {
  $.ajax({
    url: basePath + '/users/json',
    type: 'GET',
    dataType: 'json',
  }).done((json) => {
    oTable.clear();
    oTable.rows.add(json);
    oTable.draw();
  }).fail((jqXHR, status, error) => {
    $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for users information.</div>');
  });
}

function updateFromModal(cb?: () => void) {
  $('#remove').prop('disabled', true);
  let n = $('#modal .modal-body .user-update-list div').length;
  $('#modal .modal-body .user-update-list div').each((index, element) => {
    $.ajax({
      url: basePath + '/users/' + element.id + '/refresh',
      type: 'GET',
    }).done(() => {
      $(element).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(element).addClass('text-success');
    })
    .fail((jqXHR, status, error) => {
      $(element).append(' : ' + jqXHR.statusText);
      $(element).addClass('text-danger');
    })
    .always(() => {
      n = n - 1;
      if (n === 0) {
        if (cb) {
          cb();
        }
      }
    });
  });
}

function modifyFromModal(cb?: () => void) {
  $('#remove').prop('disabled', true);
  let n = $('#modal .modal-body .user-modify-list div').length;
  const roles: string[] = [];
  $('#modal-roles input:checked').each((idx, elm) => {
    roles.push(String($(elm).val()));
  });
  $('#modal .modal-body .user-modify-list div').each((index, element) => {
    $.ajax({
      url: basePath + '/users/' + element.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        roles: roles,
      }),
    }).done(() => {
      $(element).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(element).addClass('text-success');
    })
    .fail((jqXHR, status, error) => {
      $(element).append(' : ' + jqXHR.statusText);
      $(element).addClass('text-danger');
    })
    .always(() => {
      n = n - 1;
      if (n === 0) {
        if (cb) {
          cb();
        }
      }
    });
  });
}

$(() => {
  // $.ajaxSetup({
  //   cache: false
  // });
  $(document).ajaxError((event, jqxhr) => {
    if (jqxhr.status === 401) {
      $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
      const offset = $('#message div:last-child').offset();
      if (offset) {
        $(window).scrollTop(offset.top - 40);
      }
    }
  });

  const usernames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('displayName'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    // limit: 20,
    prefetch: {
      url: basePath + '/adusernames',
    },
  });

  usernames.initialize();

  $('#username').typeahead<string>({
    minLength: 1,
    highlight: true,
    hint: true,
  }, {
    name: 'usernames',
    limit: 20,
    display: 'displayName',
    // displayKey: 'displayName',
    source: usernames.ttAdapter(),
  });

  const userTable = $('#users').DataTable({
    data: [],
    autoWidth: false,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: [selectColumn, useridColumn, fullNameNoLinkColumn, rolesColumn, wbsColumn, lastVisitedOnColumn] as any,
    order: [
      [5, 'desc'],
      [1, 'asc'],
    ],
    dom: sDom,
    buttons: sButtons,
  });

  selectEvent();
  filterEvent();

  $('#add').click((e) => {
    e.preventDefault();
    const name = String($('#username').val());
    if (inArray(name, userTable.rows().data())) {
      // show message
      $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>The user named <strong>' + name + '</strong> is already in the user list. </div>');
    } else {
      $.ajax({
        url: basePath + '/users/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          name: name,
          manager: $('#manager').prop('checked'),
          admin: $('#admin').prop('checked'),
        }),
        success: (data, status, jqXHR) => {
          $('#message').append('<div class="alert alert-success"><button type="button" class="close" data-dismiss="alert">x</button>' + jqXHR.responseText + '</div>');
          initTable(userTable);
        },
        error: (jqXHR, status, error) => {
          $('#message').append('<div class="alert alert-danger"><button type="button" class="close" data-dismiss="alert">x</button>Cannot add user: ' + jqXHR.responseText + '</div>');
        },
      });
    }
    document.forms[0].reset();
  });

  $('#user-reload').click((e) => {
    initTable(userTable);
  });

  $('#user-update').click((evt) => {
    const selected = fnGetSelected(userTable, 'row-selected');
    if (selected.length) {
      $('#modalLabel').html('Update the following ' + selected.length + ' users from the application? ');
      $('#modal .modal-body').empty().append('<div class="user-update-list"/>');
      selected.forEach((row) => {
        const data = userTable.row(row).data();  // userTable.fnGetData(row);
        $('#modal .modal-body .user-update-list').append('<div id="' + (data as any).adid + '">' + (data as any).name + '</div>');
      });
      $('#modal .modal-footer').html('<button id="update" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
      $('#update').click((e) => {
        e.preventDefault();
        $('#update').prop('disabled', true);
        updateFromModal(() => {
          initTable(userTable);
        });
      });
      $('#modal').modal('show');
    } else {
      $('#modalLabel').html('Alert');
      $('#modal .modal-body').html('No users has been selected!');
      $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
      $('#modal').modal('show');
    }
  });

  $('#user-modify').click((evt) => {
    const selected = fnGetSelected(userTable, 'row-selected');
    if (selected.length) {
      $('#modalLabel').html('Modify the following ' + selected.length + ' users\' role? ');
      $('#modal .modal-body').empty();
      $('#modal .modal-body').append('<form id="modal-roles" class="form-inline"><div class="form-group mr-2"><label class="form-check-label"><input id="modal-manager" type="checkbox" class="form-check-input" value="manager">manager</label></div><div class="form-group mr-2"><label class="form-check-label"><input id="modal-admin" type="checkbox" class="form-check-input" value="admin">admin</label></div></form><div class="user-modify-list mt-2"/>');
      selected.forEach((row) => {
        const data = userTable.row(row).data(); // userTable.fnGetData(row);
        $('#modal .modal-body .user-modify-list').append('<div id="' + (data as any).adid + '">' + (data as any).name + '</div>');
      });
      $('#modal .modal-footer').html('<button id="modify" type="button" class="btn btn-primary">Confirm</button><button data-dismiss="modal" type="button" aria-hidden="true" class="btn btn-secondary">Close</button>');
      $('#modify').click((e) => {
        e.preventDefault();
        $('#modify').prop('disabled', true);
        modifyFromModal(() => {
          initTable(userTable);
        });
      });
      $('#modal').modal('show');
    } else {
      $('#modalLabel').html('Alert');
      $('#modal .modal-body').html('No users has been selected!');
      $('#modal .modal-footer').html('<button type="button" data-dismiss="modal" aria-hidden="true" class="btn btn-secondary">Close</button>');
      $('#modal').modal('show');
    }
  });

  initTable(userTable);
});
