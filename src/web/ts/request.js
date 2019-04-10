/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global moment: false, Binder: false, Bloodhound: false*/
/*global sysSub: false, ajax401: false, disableAjaxCache: false*/

function sendRequest(data, initModel, binder) {
  var path = window.location.pathname;
  var url;
  var type;
  if (/\/requests\/new$/.test(path) || data.action === 'clone') {
    url = basePath + '/requests/';
    type = 'POST';
  } else {
    url = path;
    type = 'PUT';
  }
  $('form[name="request"]').fadeTo('slow', 0.2);
  var formRequest = $.ajax({
    url: url,
    type: type,
    async: true,
    data: JSON.stringify(data),
    contentType: 'application/json',
    processData: false,
    dataType: 'json'
  }).done(function (json) {
    if (/\/requests\/new$/.test(path)) {
      document.location.href = json.location;
    } else {
      var timestamp = formRequest.getResponseHeader('Date');
      var dateObj = moment(timestamp);
      if (data.action === 'save' || data.action === 'adjust') {
        $('#message').append('<div class="alert alert-success"><button class="close" data-dismiss="alert">x</button>The changes were saved at ' + dateObj.format('HH:mm:ss') + '.</div>');
        // move the focus to the message
        $(window).scrollTop($('#message div:last-child').offset().top - 40);
        initModel = _.cloneDeep(binder.serialize());
      } else if (data.action === 'clone') {
        $('#message').append('<div class="alert alert-success"><button class="close" data-dismiss="alert">x</button>You can access the cloned request at <a href="' + json.location + '" target="_blank">' + json.location + '.</div>');
        // move the focus to the message
        $(window).scrollTop($('#message div:last-child').offset().top - 40);
      } else {
        $('form[name="request"]').hide();
        $('#modalLabel').html('The request was submitted at ' + dateObj.format('HH:mm:ss'));
        if (json && json.location) {
          $('#modal .modal-body').html('You can access it at <a href ="' + json.location + '">' + json.location + '</a>');
        } else {
          $('#modal .modal-body').html('You can access it at <a href ="' + path + '">' + path + '</a>');
        }
        $('#modal .modal-footer').empty();
        $('#modal').modal('show');
      }
    }

  }).fail(function () {
    // TODO change to modal
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>The save request failed. You might need to try again or contact the admin.</div>');
  }).always(function () {
    $('form[name="request"]').fadeTo('slow', 1);
  });
}

// system/subsystem/signal

function updateSub(json) {
  var cat = $('#cat option:selected').val();
  $('#sub').prop('disabled', false);
  $('#sub option').remove();
  $('#sub').append($('<option>', {
    value: ''
  }).text('choose').prop('disabled', true));
  $.each(json[cat].subcategory, function (k, v) {
    if (v) {
      $('#sub').append($('<option>', {
        value: k
      }).text(v));
    }
  });
  $('#sub').next('.add-on').text($('#sub option:selected').val());
}

function updateSignal(json) {
  var cat = $('#cat option:selected').val();
  $('#signal').prop('disabled', false);
  $('#signal option').remove();
  $('#signal').append($('<option>', {
    value: ''
  }).text('choose').prop('disabled', true));
  $.each(json[cat].signal, function (k, v) {
    if (v) {
      $('#signal').append($('<option>', {
        value: k
      }).text(json[cat].signal[k].name));
    }
  });
  $('#signal').next('.add-on').text($('#signal option:selected').val());
}

function update(select, json) {
  $(select).prop('disabled', false);
  $.each(json, function (k, v) {
    if (v) {
      $(select).append($('<option>', {
        value: k
      }).text(v.name));
    }
  });
}


function css() {
  update('#cat', sysSub);
  $('#cat').change(function () {
    updateSub(sysSub);
    updateSignal(sysSub);
    $('#cat').next('.add-on').text($('#cat option:selected').val());
  });

  $('#sub').change(function () {
    $('#sub').next('.add-on').text($('#sub option:selected').val());
  });

  $('#signal').change(function () {
    $('#signal').next('.add-on').text($('#signal option:selected').val());
  });
}

function setCSS(cat, sub, signal) {
  if (cat) {
    $('#cat').val(cat);
    $('#cat').next('.add-on').text(cat);
    updateSub(sysSub);
    updateSignal(sysSub);
  }
  if (signal) {
    $('#signal').val(signal);
    $('#signal').next('.add-on').text(signal);
  }
  if (sub) {
    $('#sub').val(sub);
    $('#sub').next('.add-on').text(sub);
  }
}


$(function () {
  ajax401('');
  disableAjaxCache();

  $('input').keypress(function (e) {
    if (e.which === 13) {
      return false;
    }
  });

  var requestForm = document.forms[0];
  var binder = new Binder.FormBinder(requestForm);
  var initModel;

  $.validator.addMethod('wbs', function (value, element) {
    return this.optional(element) || /^[A-Z]\d{1,5}$/.test(value);
  }, 'Please check the WBS number, remove spaces and dots');

  var validator = $(requestForm).validate({
    errorElement: 'span',
    errorClass: 'error',
    validClass: 'success',
    errorPlacement: function (error, element) {
      error.appendTo($(element).closest('.controls'));
    },
    highlight: function (element) {
      $(element).closest('.control-group').removeClass('success').addClass('error');
    },
    success: function (element) {
      $(element).closest('.control-group').removeClass('error').addClass('success');
    }
  });

  $('#wbs').rules('add', {wbs: true});

  if ($('#requestId').length) {
    $('form[name="request"]').fadeTo('slow', 0.2);
  }

  css();

  var usernames = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('displayName'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      url: basePath + '/adusernames'
    }
  });

  usernames.initialize();

  $('#engineer').typeahead({
    minLength: 1,
    highlight: true,
    hint: true
  }, {
    name: 'usernames',
    displayKey: 'displayName',
    source: usernames.ttAdapter()
  });

  var cabletypes = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 20,
    prefetch: {
      url: basePath + '/cabletypes/json'
    }
  });

  cabletypes.initialize();

  $('#type').typeahead({
    minLength: 1,
    highlight: true,
    hint: true
  }, {
    name: 'cabletypes',
    displayKey: 'name',
    source: cabletypes.ttAdapter()
  });

  /*$('#penetration').autocomplete({
    minLength: 1,
    source: function (req, res) {
      var term = req.term.toLowerCase();
      var output = [];
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
      dataType: 'json'
    }).done(function (json) {
      // load the data
      var cat;
      var sub;
      var signal;
      if (json.basic) {
        cat = json.basic.originCategory || null;
        sub = json.basic.originSubcategory || null;
        signal = json.basic.signalClassification || null;
      }

      var savedBinder = new Binder.FormBinder(requestForm, json);
      savedBinder.deserialize();

      setCSS(cat, sub, signal);


      $('form[name="request"]').fadeTo('slow', 1);

      validator.form();

      initModel = _.cloneDeep(binder.serialize());

      // show action buttons

      if (json.status === 0) {
        $('#save').closest('.btn-group').removeClass('hide');
        $('#submit').closest('.btn-group').removeClass('hide');
        $('#reset').closest('.btn-group').removeClass('hide');
      }

      if (json.status === 1) {
        $('#adjust').closest('.btn-group').removeClass('hide');
        $('#reject').closest('.btn-group').removeClass('hide');
        $('#approve').closest('.btn-group').removeClass('hide');
      }

      if (json.status === 2 || json.status === 3) {
        $('input, select, textarea').prop('disabled', true);
      }

    }).fail(function () {
      $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot find the saved request. You might need to try again or contact the admin.</div>');
    });
  } else {
    validator.form();
    initModel = _.cloneDeep(binder.serialize());

    $('#save').closest('.btn-group').removeClass('hide');
    $('#submit').closest('.btn-group').removeClass('hide');
    $('#reset').closest('.btn-group').removeClass('hide');
  }

  $('#reset').click(function (e) {
    e.preventDefault();
    binder.deserialize(initModel);
  });

  $('.form-actions button').not('#reset').click(function (e) {
    e.preventDefault();
    var action = this.id;
    var currentModel = {};
    currentModel = binder.serialize();
    var data = {
      request: currentModel,
      action: action
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
      if ($(requestForm).valid()) {
        sendRequest(data, initModel, binder);
      } else {
        $('#modalLabel').html('The request is not validated');
        $('#modal .modal-body').html('The form has ' + validator.numberOfInvalids() + ' invalid input(s) to fix.');
        $('#modal').modal('show');
        return;
      }
    }

    if (action === 'clone' || action === 'reject' || action === 'approve') {
      sendRequest(data, initModel, binder);
    }

  });

});
