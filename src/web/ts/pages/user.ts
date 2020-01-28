/**
 * User profile view and edit assigned roles and WBS numbers
 */
import './base';

import * as $ from 'jquery';

import * as moment from 'moment';


function update(roles: any[]) {
  for (const role of roles) {
    $('input[value= "' + role + '"]').prop('checked', true);
  }
}

function cleanWbsForm() {
  $('#newWBS').closest('li').remove();
  $('#add').removeAttr('disabled');
}

$(() => {

  let wbs: string[] = (window as any).wbs;
  let roles: string[] = (window as any).roles;

  update(roles);
  $('input:checkbox').change((e) => {
    $('#modify').prop('hidden', false);
  });
  $('#modify').click((e) => {
    const currentRoles: string[] = [];
    $('#roles input:checked').each((idx, elm) => {
      currentRoles.push(String($(elm).val()));
    });
    if (roles.sort().join() === currentRoles.sort().join()) {
      $('#message').append('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert">x</button>Nothing was changed.</div>');
    } else {
      roles = currentRoles;
      const request = $.ajax({
        type: 'PUT',
        async: true,
        data: JSON.stringify({
          roles: roles,
        }),
        contentType: 'application/json',
        processData: false,
        dataType: 'json',
      }).done((json) => {
        const timestamp = request.getResponseHeader('Date');
        const dateObj = timestamp ? moment(timestamp) : moment();
        $('#message').append('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert">x</button>The modification was saved at ' + dateObj.format('HH:mm:ss') + '.</div>');
        $('#modify').prop('hidden', true);
      }).fail((jqXHR, status, error) => {
        $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>The save request failed. You might need to try again or contact the admin.</div>');
      });
    }
    e.preventDefault();
  });

  $('#add').click((evt) => {
    evt.preventDefault();
    $('#add').prop('disabled', true);
    $('#wbs').append('<li><form class="form-inline"><input id="newWBS" class="form-control mr-2" type="text"> <button id="confirm" class="btn btn-primary mr-2">Confirm</button> <button type="button" id="cancel" class="btn btn-secondary mr-2">Cancel</button></form></li>');
    $('#cancel').click((e) => {
      e.preventDefault();
      cleanWbsForm();
    });
    $('#confirm').click((e) => {
      e.preventDefault();
      const newwbs = $('#newWBS').val() as string;
      if (newwbs) {
        if (wbs && wbs.length) {
          if (wbs.indexOf(newwbs) !== -1) {
            cleanWbsForm();
            $('#message').append('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert">x</button>The WBS number <strong>' + newwbs + '</strong> is already in the user list. </div>');
            const offset = $('#message div:last-child').offset();
            if (offset) {
              $(window).scrollTop(offset.top - 40);
            }
            return;
          }
        } else {
          wbs = [];
        }
        $.ajax({
          url: window.location.pathname + '/wbs/',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            newwbs: newwbs,
          }),
        }).done((data, status, jqXHR) => {
          wbs.push(newwbs);
          $('#wbs').append('<li><span class="wbs">' + newwbs + '</span> <button type="button" class="btn btn-small btn-warning remove-wbs"><i class="fa fa-trash fa-lg"></i></button></li>');
          cleanWbsForm();
          $('#message').append('<div class="alert alert-success"><button type="button" class="close" data-dismiss="alert">x</button>The WBS number <strong>' + newwbs + '</strong> was added.</div>');
        }).fail((jqXHR, status, error) => {
          if (jqXHR.status !== 401) {
            $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>Cannot add the WBS number.</div>');
            const offset = $('#message div:last-child').offset();
            if (offset) {
              $(window).scrollTop(offset.top - 40);
            }
          }
        });
      } else {
        cleanWbsForm();
      }
    });
  });

  $('#wbs').on('click', '.remove-wbs', function(e) {
    e.preventDefault();
    const $that = $(this);
    const toRemove = $that.siblings('span.wbs').text();
    $.ajax({
      url: window.location.pathname + '/wbs/' + toRemove,
      type: 'DELETE',
    }).done((data, status, jqXHR) => {
      const index = wbs.indexOf(toRemove);
      if (index > -1) {
        wbs.splice(index, 1);
      }
      $that.closest('li').remove();
    }).fail((jqXHR, status, error) => {
      if (jqXHR.status !== 401) {
        $('#message').append('<div class="alert alert-danger"><button type="button" class="close" data-dismiss="alert">x</button>Cannot remove the device</div>');
        const offset = $('#message div:last-child').offset();
        if (offset) {
          $(window).scrollTop(offset.top - 40);
        }
      }
    });
  });

});
