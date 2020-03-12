import './base';
import 'jquery-validation';
import * as $ from 'jquery';
import * as Binder from '../lib/binder';
import {ajax401, disableAjaxCache} from '../lib/ajaxhelper';
import '../lib/util';
import _ from 'lodash';
import * as moment from 'moment';
import Bloodhound from 'typeahead.js';

let sysSub;
function sendRequest(data, initModel, binder) {
  const path = window.location.pathname;
  let url;
  let type;
  if (/\/requests\/new$/.test(path) || data.action === 'clone') {
    url = basePath + '/requests/';
    type = 'POST';
  } else {
    url = path;
    type = 'PUT';
  }
  $('form[name="request"]').fadeTo('slow', 0.2);
  const formRequest = $.ajax({
    url: url,
    type: type,
    async: true,
    data: JSON.stringify(data),
    contentType: 'application/json',
    processData: false,
    dataType: 'json',
  }).done((json) => {
    if (/\/requests\/new$/.test(path)) {
      document.location.href = json.location;
    } else {
      const timestamp = formRequest.getResponseHeader('Date');
      const dateObj = moment(timestamp);
      if (data.action === 'save' || data.action === 'adjust') {
        $('#message').append('<div class="alert alert-success"><button class="close" data-dismiss="alert">x</button>\
        The changes were saved at ' + dateObj.format('HH:mm:ss') + '.</div>');
        // move the focus to the message
        $(window).scrollTop($('#message div:last-child').offset().top - 40);
        initModel = _.cloneDeep(binder.serialize());
      } else if (data.action === 'clone') {
        $('#message').append(
          '<div class="alert alert-success"><button class="close" data-dismiss="alert">x</button>\
          You can access the cloned request at <a href="' + json.location + '" target="_blank">'
          + json.location + '.</div>');
        // move the focus to the message
        $(window).scrollTop($('#message div:last-child').offset().top - 40);
      } else {
        $('form[name="request"]').hide();
        $('#modalLabel').html('The request was submitted at ' + dateObj.format('HH:mm:ss'));
        if (json && json.location) {
          $('#modal .modal-body').html('You can access it at <a href ="'
          + json.location + '">' + json.location + '</a>');
        } else {
          $('#modal .modal-body').html('You can access it at <a href ="' + path + '">' + path + '</a>');
        }
        $('#modal .modal-footer').empty();
        $('#modal').modal('show');
      }
    }
  }).fail(() => {
    // TODO change to modal
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>\
    The save request failed. You might need to try again or contact the admin.</div>');
  }).always(() => {
    $('form[name="request"]').fadeTo('slow', 1);
  });
}

  // system/subsystem/signal

function updateCat(json) {
  const proj = $('#project option:selected').val();
  $('#cat').prop('disabled', false);
  $('#cat option').remove();
  $('#cat').append($('<option>', {
    value: '',
  }).text('choose').prop('disabled', true));
  $.each(json, (k, v) => {
    if (v && v.projects && ~v.projects.indexOf(proj)) {
      $('#cat').append($('<option>', {
        value: k,
      }).text(v.name));
    }
  });
  $('#cat').next('.input-group-text').text($('#cat option:selected').val() as string);
}

function updateSub(json) {
  const cat = $('#cat option:selected').val();
  $('#sub').prop('disabled', false);
  $('#sub option').remove();
  $('#sub').append($('<option>', {
    value: '',
  }).text('choose').prop('disabled', true));
  if (cat) {
    $.each(json[cat as string].subcategory, (k, v) => {
      if (v) {
        $('#sub').append($('<option>', {
          value: k,
        }).text(v));
      }
    });
  }
  $('#sub').next('.input-group-text').text($('#sub option:selected').val() as string);
}

function updateSignal(json) {
  const cat = $('#cat option:selected').val();
  $('#signal').prop('disabled', false);
  $('#signal option').remove();
  $('#signal').append($('<option>', {
    value: '',
  }).text('choose').prop('disabled', true));
  if (cat) {
    $.each(json[cat as string].signal, (k, v) => {
      if (v) {
        $('#signal').append($('<option>', {
          value: k,
        }).text(json[cat as string].signal[k].name));
      }
    });
  }
  $('#signal').next('.input-group-text').text($('#signal option:selected').val() as string);
}

function update(select, json) {
  $(select).prop('disabled', false);
  $.each(json, (k, v) => {
    if (v) {
      $(select).append($('<option>', {
        value: k,
      }).text(v.name));
    }
  });
}

function css() {
  $('#project').change(() => {
    updateCat(sysSub);
    updateSub(sysSub);
    updateSignal(sysSub);
  });

  $('#cat').change(() => {
    updateSub(sysSub);
    updateSignal(sysSub);
    $('#cat').next('.input-group-text').text($('#cat option:selected').val() as string);
  });

  $('#sub').change(() => {
    $('#sub').next('.input-group-text').text($('#sub option:selected').val() as string);
  });

  $('#signal').change(() => {
    $('#signal').next('.input-group-text').text($('#signal option:selected').val() as string);
  });
}

function setCSS(proj, cat, sub, signal) {
  if (proj) {
    $('#project').val(proj);
    updateCat(sysSub);
    updateSub(sysSub);
    updateSignal(sysSub);
  }
  if (cat) {
    $('#cat').val(cat);
    $('#cat').next('.input-group-text').text(cat);
    updateSub(sysSub);
    updateSignal(sysSub);
  }
  if (signal) {
    $('#signal').val(signal);
    $('#signal').next('.input-group-text').text(signal);
  }
  if (sub) {
    $('#sub').val(sub);
    $('#sub').next('.input-group-text').text(sub);
  }
}

$(async () => {
  sysSub =  (window as any).sysSub
  ajax401('');
  disableAjaxCache();
  $('.form-control').keypress((e) => {
    if (e.which === 13) {
      return false;
    }
  });

  const requestForm = document.forms[0];

  let initModel;

  $.validator.addMethod('wbs', function(value, element) {
    return this.optional(element) || /^[A-Z]\d{1,5}$/.test(value);
  }, 'Please check the WBS number, remove spaces and dots');
  const validator = $(requestForm).validate({
    errorClass: 'invalid-feedback',
    highlight: (element) => {
      $(element).addClass('is-invalid');
    },
    unhighlight: (element) => {
      $(element).removeClass('is-invalid');
    },
    success(element) {
      $(element).closest('.form-group').removeClass('is-invalid').addClass('is-valid');
    },
  });

  const binder = new Binder.FormBinder(requestForm);

  $('#wbs').rules('add', {wbs: true});

  if ($('#requestId').length) {
    $('form[name="request"]').fadeTo('slow', 0.2);
  }

  css();

  const usernames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('displayName'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      url: basePath + '/adusernames',
    },
  });

  usernames.initialize();

  $('#engineer').typeahead<string>({
    minLength: 1,
    highlight: true,
    hint: true,
  }, {
    name: 'usernames',
    limit: 20,
    display: 'displayName',
    source: usernames.ttAdapter(),
  });

  const cabletypes = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
      url: basePath + '/cabletypes/json',
    },
  });

  cabletypes.initialize();
  $('#type').typeahead({
    minLength: 1,
    highlight: true,
    hint: false,
  }, {
    name: 'cabletypes',
    display: 'name',
    source: cabletypes.ttAdapter(),
    limit: 20,
  });
  /*$('#penetration').autocomplete({
    minLength: 1,
    source: function (req, res) {
      const term = req.term.toLowerCase();
      const output = [];
      if (penetration.length === 0) {
        $.getJSON('/penetration', function (data, status, xhr) {
          penetration = data;
          res(getList(penetration, term));
        });
      } else {
        res(getList(penetration, term));
      }
    },
    select: function (event, ui) {
      $('#penetration').val(ui.item.value);
    }
  });*/

  // check if the request is for an existing request
  if ($('#requestId').length) {
    $.ajax({
      url: basePath + '/requests/' + $('#requestId').text() + '/json',
      type: 'GET',
      async: true,
      dataType: 'json',
    }).done((json) => {
      // load the data
      let proj;
      let cat;
      let sub;
      let signal;
      if (json.basic) {
        proj = json.basic.project || null;
        cat = json.basic.originCategory || null;
        sub = json.basic.originSubcategory || null;
        signal = json.basic.signalClassification || null;
      }

      const savedBinder = new Binder.FormBinder(requestForm, json);
      savedBinder.deserialize();
      setCSS(proj, cat, sub, signal);

      $('form[name="request"]').fadeTo('slow', 1);
      initModel = _.cloneDeep(binder.serialize());

      // show action buttons
      if (json.status === 0) {
        $('#save').closest('.btn-group').removeAttr('hidden');
        $('#submit').closest('.btn-group').removeAttr('hidden');
        $('#reset').closest('.btn-group').removeAttr('hidden');
      }

      if (json.status === 1) {
        $('#adjust').closest('.btn-group').removeAttr('hidden');
        $('#reject').closest('.btn-group').removeAttr('hidden');
        $('#approve').closest('.btn-group').removeAttr('hidden');
      }

      if (json.status === 2 || json.status === 3) {
        $('.form-control, select, textarea').prop('disabled', true);
      }

    }).fail(() => {
      $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>\
      Cannot find the saved request. You might need to try again or contact the admin.</div>');
    });
  } else {
    validator.form();
    initModel = _.cloneDeep(binder.serialize());

    $('#save').closest('.btn-group').removeAttr('hidden');
    $('#submit').closest('.btn-group').removeAttr('hidden');
    $('#reset').closest('.btn-group').removeAttr('hidden');
  }

  $('#reset').click((e) => {
    e.preventDefault();
    binder.deserialize(initModel);
  });

  $('.form-actions button').not('#reset').click((e) => {
    e.preventDefault();
    const action = e.target.id;
    let currentModel = {};
    currentModel = binder.serialize();
    const data = {
      request: currentModel,
      action: action,
    };

    if (action === 'save' || action === 'adjust') {
      if (_.isEqual(initModel, currentModel)) {

        $('#modalLabel').html('The request cannot be sent');
        $('#modal .modal-body').html('No change has been made in the form');
        $('#modal').modal('show');
        return;
      }
    }

    if (action === 'save' || action === 'submit' || action === 'adjust') {
      try {
        if ($(requestForm).valid()) {
          sendRequest(data, initModel, binder);
        } else {
          $('#modalLabel').html('The request is not validated');
          $('#modal .modal-body').html('The form has ' + validator.numberOfInvalids()
          + ' invalid form-control(s) to fix.');
          $('#modal').modal('show');
          return;
        }
      } catch(e) {
        console.log(e)
      }
    }

    if (action === 'clone' || action === 'reject' || action === 'approve') {
      sendRequest(data, initModel, binder);
    }
  });
});
