/**
 * User profile view and edit assigned roles and WBS numbers
 */
import './base';

import 'jquery-validation';

import * as $ from 'jquery';

import * as Binder from '../lib/binder';


function sendRequest(data: any) {
  const url = basePath + '/cabletypes/';
  const type = 'POST';
  $('form[name="cabletype"]').fadeTo('slow', 0.5);
  $.ajax({
    url: url,
    type: type,
    async: true,
    data: JSON.stringify(data),
    contentType: 'application/json',
    processData: false,
  }).done((json, textStatus, jqXHR) => {
    $('#message').append('<div class="alert alert-success"><button type="button" class="close" data-dismiss="alert">x</button>' + jqXHR.responseText + '</div>');
  }).fail((jqXHR, status, error) => {
    $('#message').append('<div class="alert alert-danger"><button type="button" class="close" data-dismiss="alert">x</button>The save request failed: ' + jqXHR.responseText + '</div>');
    $('form[name="cabletype"]').fadeTo('slow', 1);
  });
}


function naming(conductorNumber: any, conductorSize: any, fribType: any, typeNumber: any) {
  return conductorNumber + 'C_' + conductorSize + '_' + fribType + '_' + typeNumber;
}

$(() => {
  // keyup and mouseup catch all the change event
  $('#conductor-number, #conductor-size, #frib-type, #type-number').bind('keyup mouseup', () => {
    $('#name').val(naming($('#conductor-number').val(), $('#conductor-size').val(), $('#frib-type').val(), $('#type-number').val()));
  });

  const form = document.forms[0];

  const validator = $(form).validate({
    errorClass: 'invalid-feedback',
    highlight: (element) => {
      $(element).addClass('is-invalid');
    },
    unhighlight: (element) => {
      $(element).removeClass('is-invalid');
    },
  });

  validator.form();

  const binder = new Binder.FormBinder(form);

  $('#submit').click((e) => {
    e.preventDefault();
    const currentModel = binder.serialize();

    validator.form();
    if ($(form).valid()) {
      sendRequest(currentModel);
    } else {
      $('#modalLabel').html('The request is not validated');
      $('#modal .modal-body').html('The form has ' + validator.numberOfInvalids() + ' invalid input(s) to fix.');
      $('#modal').modal('show');
      return;
    }
  });
});
