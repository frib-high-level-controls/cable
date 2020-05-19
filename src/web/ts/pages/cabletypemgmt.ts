/*
 * Editable table view of cable types
 */
import './base';

import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

import 'jquery-jeditable';

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

type DTAPI = DataTables.Api;

$(document).ajaxError((event, jqxhr) => {
  if (jqxhr.status === 401) {
    $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
    const offset = $('#message div:last-child').offset();
    if (offset) {
      $(window).scrollTop(offset.top - 40);
    }
  }
});

function tdEdit(oTable: DTAPI) {
  $(oTable.cells().nodes()).editable(function(this: HTMLElement, value: string) {
    const that = this;
    const newValue = value.trim();
    let oldValue = oTable.cell(that).data();
    if (oldValue) {
      oldValue = String(oldValue).trim();
    }
    if (newValue === oldValue) {
      return newValue;
    }
    const data: { target: string; update?: string | null; original?: string | null; } = {
      target: String(typeColumns[oTable.column(that).index()].data),
      update: newValue,
      original: oldValue,
    };
    if (data.original === '') {
      data.original = null;
    }
    if (data.update === '') {
      data.update = null;
    }

    const d = oTable.row(that).data() as webapi.CableType;
    $.ajax({
      url: basePath + '/cabletypes/' + d._id,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: () => {
        (d as any)[data.target] = newValue;
        oTable.draw();
      },
      error: (jqXHR) => {
        $(that).text(oldValue);
        $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Cannot update the cable type : ' + jqXHR.statusText + '</div>');
        const offset = $('#message div:last-child').offset();
        if (offset) {
          $(window).scrollTop(offset.top - 40);
        }
      },
    });
    return value;
  }, {
    type: 'textarea',
    cancel: 'Cancel',
    submit: 'Update',
    indicator: 'Updating...',
    placeholder: '',
    cssclass: 'form-inline',
    inputcssclass: 'form-control',
    submitcssclass: 'btn btn-primary mr-1',
    cancelcssclass: 'btn btn-secondary mr-1',
  });
}

$(() => {
  const cabletype = $('#cable-type').DataTable({
    data: [],
    autoWidth: false,
    columns: typeColumns,
    dom: sDom2InoF,
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
    tdEdit(cabletype);
  }).fail(() => {
    $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable type information.</div>');
  });
});
