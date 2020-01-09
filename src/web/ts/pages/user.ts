/**
 * User profile view and edit assigned roles and WBS numbers
 */
import './base';

import * as $ from 'jquery';

import * as moment from 'moment';

/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global roles: true, wbs: true, moment: false*/
function update(roles) {
  var i;
  for (i = 0; i < roles.length; i += 1) {
    $('input[value= "' + roles[i] + '"]').prop('checked', true);
  }
}

function cleanWbsForm() {
  $('#newWBS').closest('li').remove();
  $('#add').removeAttr('disabled');
}

$(function () {

  let wbs: string[] = (window as any).wbs;
  let roles: string[] = (window as any).roles;

  update(roles);
  $('input:checkbox').change(function (e) {
    $('#modify').prop('hidden', false);
  });
  $('#modify').click(function (e) {
    var currentRoles = [];
    $('#roles input:checked').each(function () {
      currentRoles.push($(this).val());
    });
    if (roles.sort().join() === currentRoles.sort().join()) {
      $('#message').append('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert">x</button>Nothing was changed.</div>');
    } else {
      roles = currentRoles;
      var request = $.ajax({
        type: 'PUT',
        async: true,
        data: JSON.stringify({
          roles: roles
        }),
        contentType: 'application/json',
        processData: false,
        dataType: 'json'
      }).done(function (json) {
        var timestamp = request.getResponseHeader('Date');
        var dateObj = moment(timestamp);
        $('#message').append('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert">x</button>The modification was saved at ' + dateObj.format('HH:mm:ss') + '.</div>');
        $('#modify').hide();
      }).fail(function (jqXHR, status, error) {
        $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>The save request failed. You might need to try again or contact the admin.</div>');
      });
    }
    e.preventDefault();
  });

  $('#add').click(function (e) {
    e.preventDefault();
    $('#add').prop('disabled', true);
    $('#wbs').append('<li><form class="form-inline"><input id="newWBS" class="form-control mr-2" type="text"> <button id="confirm" class="btn btn-primary mr-2">Confirm</button> <button type="button" id="cancel" class="btn btn-secondary mr-2">Cancel</button></form></li>');
    $('#cancel').click(function (e) {
      e.preventDefault();
      cleanWbsForm();
    });
    $('#confirm').click(function (e) {
      e.preventDefault();
      var newwbs = $('#newWBS').val() as string;
      if (newwbs) {
        if (wbs && wbs.length) {
          if (wbs.indexOf(newwbs) !== -1) {
            cleanWbsForm();
            $('#message').append('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert">x</button>The WBS number <strong>' + newwbs + '</strong> is already in the user list. </div>');
            return $(window).scrollTop($('#message div:last-child').offset().top - 40);
          }
        } else {
          wbs = [];
        }
        $.ajax({
          url: window.location.pathname + '/wbs/',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            newwbs: newwbs
          })
        }).done(function (data, status, jqXHR) {
          wbs.push(newwbs);
          $('#wbs').append('<li><span class="wbs">' + newwbs + '</span> <button type="button" class="btn btn-small btn-warning remove-wbs"><i class="fa fa-trash fa-lg"></i></button></li>');
          cleanWbsForm();
          $('#message').append('<div class="alert alert-success"><button type="button" class="close" data-dismiss="alert">x</button>The WBS number <strong>' + newwbs + '</strong> was added.</div>');
        }).fail(function (jqXHR, status, error) {
          if (jqXHR.status !== 401) {
            $('#message').append('<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">x</button>Cannot add the WBS number.</div>');
            $(window).scrollTop($('#message div:last-child').offset().top - 40);
          }
        });
      } else {
        cleanWbsForm();
      }
    });
  });

  $('#wbs').on('click', '.remove-wbs', function (e) {
    e.preventDefault();
    var $that = $(this);
    var toRemove = $that.siblings('span.wbs').text();
    $.ajax({
      url: window.location.pathname + '/wbs/' + toRemove,
      type: 'DELETE'
    }).done(function (data, status, jqXHR) {
      var index = wbs.indexOf(toRemove);
      if (index > -1) {
        wbs.splice(index, 1);
      }
      $that.closest('li').remove();
    }).fail(function (jqXHR, status, error) {
      if (jqXHR.status !== 401) {
        $('#message').append('<div class="alert alert-danger"><button type="button" class="close" data-dismiss="alert">x</button>Cannot remove the device</div>');
        $(window).scrollTop($('#message div:last-child').offset().top - 40);
      }
    });
  });

});
