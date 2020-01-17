/*
 * Read-only table view of cable types
 */
import './base';

import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

// JSZip is a requirement for the 'Excel' button,
// but it needs to exist of the global (ie window).
import * as JSZip from 'jszip';
(window as any).JSZip = JSZip;
import 'datatables.net-bs4';
import 'datatables.net-buttons-bs4';
import 'datatables.net-buttons/js/buttons.html5.min.js';
import 'datatables.net-buttons/js/buttons.print.min.js';

import * as $ from 'jquery';

import * as dtutil from '../shared/datatablesutil';

import {
  filterEvent,
  sButtons,
  sDom2InoF,
  typeColumns,
} from '../lib/table';


$(() => {
  $(document).ajaxError((event, jqxhr) => {
    if (jqxhr.status === 401) {
      $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
      $(window).scrollTop($('#message div:last-child').offset().top - 40);
    }
  });

  const cabletype = $('#cable-type').DataTable({
    data: [],
    autoWidth: false,
    columns: typeColumns,
    dom: sDom2InoF,
    order: [
      [2, 'asc'],
      [0, 'asc'],
    ],
    buttons: sButtons,
  });
  dtutil.addFilterHead('#cable-type', typeColumns);

  filterEvent();

  $.ajax({
    url: basePath + '/cabletypes/json',
    type: 'GET',
    dataType: 'json',
  }).done((json) => {
    cabletype.clear();
    cabletype.rows.add(json);
    cabletype.draw();
  }).fail(() => {
    $('#message').append('<div class="alert alert-error"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable type information.</div>');
  });
});
