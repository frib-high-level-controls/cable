/*global fnAddFilterFoot: false, typeColumns: false, sDom: false, oTableTools: false, filterEvent: false*/
/*global window: false*/
$(function () {
  $(document).ajaxError(function (event, jqxhr) {
    if (jqxhr.status === 401) {
      $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
      $(window).scrollTop($('#message div:last-child').offset().top - 40);
    }
  });
  fnAddFilterFoot('#cable-type', typeColumns);
  var cabletype = $('#cable-type').dataTable({
    aaData: [],
    bAutoWidth: false,
    aoColumns: typeColumns,
    sDom: sDom,
    aaSorting: [
      [2, 'asc'],
      [0, 'asc']
    ],
    oTableTools: oTableTools
  });

  filterEvent();

  $.ajax({
    url: basePath + '/cabletypes/json',
    type: 'GET',
    dataType: 'json'
  }).done(function (json) {
    cabletype.fnClearTable();
    cabletype.fnAddData(json);
    cabletype.fnDraw();
  }).fail(function () {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable type information.</div>');
  }).always();
});
