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
    oTable.fnClearTable();
    oTable.fnAddData(json);
    oTable.fnDraw();
  }).fail(function (jqXHR, status, error) {
    $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for users information.</div>');
  });
}

function updateFromModal(cb) {
  $('#remove').prop('disabled', true);
  var number = $('#modal .modal-body div').length;
  $('#modal .modal-body div').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/users/' + that.id + '/refresh',
      type: 'GET'
    }).done(function () {
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
    })
      .fail(function (jqXHR, status, error) {
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-error');
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
  var number = $('#modal .modal-body div').length;
  var roles = [];
  $('#modal-roles input:checked').each(function () {
    roles.push($(this).val());
  });
  $('#modal .modal-body div').each(function (index) {
    var that = this;
    $.ajax({
      url: basePath + '/users/' + that.id + '/',
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        roles: roles
      })
    }).done(function () {
      $(that).prepend('<i class="icon-check"></i>');
      $(that).addClass('text-success');
    })
      .fail(function (jqXHR, status, error) {
        $(that).append(' : ' + jqXHR.responseText);
        $(that).addClass('text-error');
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
      $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
      $(window).scrollTop($('#message div:last-child').offset().top - 40);
    }
  });

  var usernames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('displayName'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      url: basePath + '/adusernames'
    }
  });

  usernames.initialize();

  $('#username').typeahead({
    minLength: 1,
    highlight: true,
    hint: true
  }, {
    name: 'usernames',
    displayKey: 'displayName',
    source: usernames.ttAdapter()
  });

  var userTable = $('#users').dataTable({
    aaData: [],
    // bAutoWidth: false,
    aoColumns: [selectColumn, useridColumn, fullNameNoLinkColumn, rolesColumn, wbsColumn, lastVisitedOnColumn],
    aaSorting: [
      [5, 'desc'],
      [1, 'asc']
    ],
    sDom: sDom,
    oTableTools: oTableTools
  });

  selectEvent();
  filterEvent();

  $('#add').click(function (e) {
    e.preventDefault();
    var name = $('#username').val();
    if (inArray(name, userTable.fnGetData())) {
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
          $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot add user: ' + jqXHR.responseText + '</div>');
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
      $('#modal .modal-body').empty();
      selected.forEach(function (row) {
        var data = userTable.fnGetData(row);
        $('#modal .modal-body').append('<div id="' + data.adid + '">' + data.name + '</div>');
      });
      $('#modal .modal-footer').html('<button id="update" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
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
      $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
      $('#modal').modal('show');
    }
  });

  $('#user-modify').click(function (e) {
    var selected = fnGetSelected(userTable, 'row-selected');
    if (selected.length) {
      $('#modalLabel').html('Modify the following ' + selected.length + ' users\' role? ');
      $('#modal .modal-body').empty();
      $('#modal .modal-body').append('<form id="modal-roles" class="form-inline"><label class="checkbox"><input id="modal-manager" type="checkbox" value="manager">manager</label> <label class="checkbox"><input id="modal-admin" type="checkbox" value="admin">admin</label> </form>');
      selected.forEach(function (row) {
        var data = userTable.fnGetData(row);
        $('#modal .modal-body').append('<div id="' + data.adid + '">' + data.name + '</div>');
      });
      $('#modal .modal-footer').html('<button id="modify" class="btn btn-primary">Confirm</button><button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
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
      $('#modal .modal-footer').html('<button data-dismiss="modal" aria-hidden="true" class="btn">Return</button>');
      $('#modal').modal('show');
    }
  });

  initTable(userTable);
});
