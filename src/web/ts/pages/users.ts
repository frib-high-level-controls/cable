/*
 * Users page for searching and modifying user profiles
 */
import './base';

import Bloodhound from 'typeahead.js';

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
  fnAddFilterFoot,
  fnDeselect,
  fnGetSelected,
  fnSelectAll,
  fnSetDeselect,
  fnUnwrap,
  fnWrap,
  fromColumns,
  fullNameNoLinkColumn,
  highlightedEvent,
  lastVisitedOnColumn,
  lengthColumn,
  numberColumn,
  ownerProvidedColumn,
  rejectedByColumn,
  rejectedOnColumn,
  rolesColumn,
  sButtons,
  sDom,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
  useridColumn,
  wbsColumn,
} from '../lib/table';


/*global window: false*/
/*global selectColumn: false, useridColumn: false, fullNameNoLinkColumn: false, rolesColumn: false, wbsColumn: false, lastVisitedOnColumn: false, sDom: false, oTableTools: false, selectEvent: false, filterEvent: false, fnGetSelected: false*/
/*global Bloodhound: false*/

function inArray(name, ao) {
  var i;
  for (i = 0; i < ao.length; i += 1) {
    if (ao[i].name === name) {
      return true;
    }
  }
  return false;
}

function initTable(oTable) {
  $.ajax({
    url: basePath + '/users/json',
    type: 'GET',
    dataType: 'json'
  }).done(function (json) {
    oTable.clear();
    oTable.rows.add(json);
    oTable.draw();
  }).fail(function (jqXHR, status, error) {
    $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for users information.</div>');
  });
}

function updateFromModal(cb) {
  $('#remove').prop('disabled', true);
  var number = $('#modal .modal-body .user-update-list div').length;
  $('#modal .modal-body .user-update-list div').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/users/' + that.id + '/refresh',
      type: 'GET'
    }).done(function () {
      $(that).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(that).addClass('text-success');
    })
    .fail(function (jqXHR, status, error) {
      $(that).append(' : ' + jqXHR.statusText);
      $(that).addClass('text-danger');
    })
    .always(function () {
      number = number - 1;
      if (number === 0) {
        if (cb) {
          cb();
        }
      }
    });
  });
}

function modifyFromModal(cb) {
  $('#remove').prop('disabled', true);
  var number = $('#modal .modal-body .user-modify-list div').length;
  var roles = [];
  $('#modal-roles input:checked').each(function () {
    roles.push($(this).val());
  });
  $('#modal .modal-body .user-modify-list div').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/users/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        roles: roles
      })
    }).done(function () {
      $(that).prepend('<i class="far fa-check-square text-success"></i>&nbsp;');
      $(that).addClass('text-success');
    })
    .fail(function (jqXHR, status, error) {
      $(that).append(' : ' + jqXHR.statusText);
      $(that).addClass('text-danger');
    })
    .always(function () {
      number = number - 1;
      if (number === 0) {
        if (cb) {
          cb();
        }
      }
    });
  });
}

$(function () {
  // $.ajaxSetup({
  //   cache: false
  // });
  $(document).ajaxError(function (event, jqxhr) {
    if (jqxhr.status === 401) {
      $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
      $(window).scrollTop($('#message div:last-child').offset().top - 40);
    }
  });

  var usernames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('displayName'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    // limit: 20,
    prefetch: {
      url: basePath + '/adusernames'
    }
  });

  usernames.initialize();

  $('#username').typeahead<string>({
    minLength: 1,
    highlight: true,
    hint: true
  }, {
    name: 'usernames',
    limit: 20,
    display: 'displayName',
    // displayKey: 'displayName',
    source: usernames.ttAdapter()
  });

  var userTable = $('#users').DataTable({
    data: [],
    autoWidth: false,
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: [selectColumn, useridColumn, fullNameNoLinkColumn, rolesColumn, wbsColumn, lastVisitedOnColumn] as any,
    order: [
      [5, 'desc'],
      [1, 'asc']
    ],
    dom: sDom,
    //oTableTools: oTableTools
    buttons: sButtons,
  });

  selectEvent();
  filterEvent();

  $('#add').click(function (e) {
    e.preventDefault();
    var name = $('#username').val();
    if (inArray(name, userTable.rows().data())) {
      //show message
      $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>The user named <strong>' + name + '</strong> is already in the user list. </div>');
    } else {
      $.ajax({
        url: basePath + '/users/',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          name: name,
          manager: $('#manager').prop('checked'),
          admin: $('#admin').prop('checked')
        }),
        success: function (data, status, jqXHR) {
          $('#message').append('<div class="alert alert-success"><button class="close" data-dismiss="alert">x</button>' + jqXHR.responseText + '</div>');
          initTable(userTable);
        },
        error: function (jqXHR, status, error) {
          $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Cannot add user: ' + jqXHR.responseText + '</div>');
        }
      });
    }
    document.forms[0].reset();
  });

  $('#user-reload').click(function (e) {
    initTable(userTable);
  });

  $('#user-update').click(function (e) {
    var selected = fnGetSelected(userTable, 'row-selected');
    if (selected.length) {
      $('#modalLabel').html('Update the following ' + selected.length + ' users from the application? ');
      $('#modal .modal-body').empty().append('<div class="user-update-list"/>');
      selected.forEach(function (row) {
        var data = userTable.row(row).data();  //userTable.fnGetData(row);
        $('#modal .modal-body .user-update-list').append('<div id="' + (data as any).adid + '">' + (data as any).name + '</div>');
      });
      $('#modal .modal-footer').html('<button id="update" type="button" class="btn btn-primary">Confirm</button><button type="button" data-dismiss="modal" class="btn btn-secondary">Close</button>');
      $('#update').click(function (e) {
        e.preventDefault();
        $('#update').prop('disabled', true);
        updateFromModal(function () {
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

  $('#user-modify').click(function (e) {
    var selected = fnGetSelected(userTable, 'row-selected');
    if (selected.length) {
      $('#modalLabel').html('Modify the following ' + selected.length + ' users\' role? ');
      $('#modal .modal-body').empty();
      $('#modal .modal-body').append('<form id="modal-roles" class="form-inline"><div class="form-group mr-2"><label class="form-check-label"><input id="modal-manager" type="checkbox" class="form-check-input" value="manager">manager</label></div><div class="form-group mr-2"><label class="form-check-label"><input id="modal-admin" type="checkbox" class="form-check-input" value="admin">admin</label></div></form><div class="user-modify-list mt-2"/>');
      selected.forEach(function (row) {
        var data = userTable.row(row).data(); // userTable.fnGetData(row);
        $('#modal .modal-body .user-modify-list').append('<div id="' + (data as any).adid + '">' + (data as any).name + '</div>');
      });
      $('#modal .modal-footer').html('<button id="modify" type="button" class="btn btn-primary">Confirm</button><button data-dismiss="modal" type="button" aria-hidden="true" class="btn btn-secondary">Close</button>');
      $('#modify').click(function (e) {
        e.preventDefault();
        $('#modify').prop('disabled', true);
        modifyFromModal(function () {
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
