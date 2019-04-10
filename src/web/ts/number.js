$(function(){
  // init();
  var sysSub, signal;
  // fetch sys-sub
  $.ajax({
    url: '/sys-sub',
    type: 'GET',
    dataType: 'json'
  }).done(function(json){
    sysSub = json;
    update('#system', sysSub);
  }).fail(function(jqXHR, status, error){
    $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for numbering information.</div>');
  }).always(function(){
    // nothing to do here for now
  });

  // fetch signal
  $.ajax({
    url: '/signal',
    type: 'GET',
    dataType: 'json'
  }).done(function(json){
    signal = json;
    update('#signal', signal);
  }).fail(function(jqXHR, status, error){
    $('#message').append('<div class="alert alert-info"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for numbering information.</div>');
  }).always(function(){
    // nothing to do here for now
  });

  $('#system').change(function(){
    updateSub(sysSub);
    $('#sys-val').text($('#system option:selected').val());
  });

  $('#sub').change(function(){
    $('#sub-val').text($('#sub option:selected').val());
  });

  $('#signal').change(function(){
    $('#signal-val').text($('#signal option:selected').val());
  });

});

function updateSub(json){
  var sys = $('#system option:selected').text();
  $('#sub').prop('disabled', false);
  $('#sub option').remove();
  $.each(json[sys]['sub-system'], function(k, v){
    if (v) {
      $('#sub').append($('<option>', {
        value: v
      }).text(k));
    }
  });
}

function update(select, json) {
  $(select).prop('disabled', false);
  $.each(json, function(k, v) {
    if (v) {
      $(select).append($('<option>', {
        value: v['name']
      }).text(k));
    }
  });
}