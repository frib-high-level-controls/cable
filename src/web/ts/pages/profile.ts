/**
 * User profile page
 */
import './base';

import * as $ from 'jquery';

import * as moment from 'moment';


$(() => {
  let sub = $('#sub').prop('checked');
  $('#modify').click((e) => {
    if ($('#sub').prop('checked') === sub) {
      $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>The subscription state was not changed.</div>');
    } else {
      sub = $('#sub').prop('checked');
      const request = $.ajax({
        // url: 'profile',
        type: 'PUT',
        async: true,
        data: JSON.stringify({subscribe: sub}),
        contentType: 'application/json',
        processData: false,
        dataType: 'json',
      }).done((json) => {
        const timestamp = request.getResponseHeader('Date');
        const dateObj = moment(timestamp);
        $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>The modification was saved at ' + dateObj.format('HH:mm:ss') + '.</div>');
      }).fail((jqXHR, status, error) => {
        // TODO change to modal
        alert('The save request failed. You might need to try again or contact the admin.');
      });
    }
    e.preventDefault();
  });
});
