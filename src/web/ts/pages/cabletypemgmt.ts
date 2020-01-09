/*
 * Editable table view of cable types
 */
import 'bootstrap/dist/css/bootstrap.min.css';

import '@fortawesome/fontawesome-free/js/all';

import 'popper.js';

import 'bootstrap';

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

import * as moment from 'moment';

import * as dtutil from '../shared/datatablesutil';

import {
  ajax401,
  disableAjaxCache,
} from '../lib/ajaxhelper';

import {
  approvedByColumn,
  approvedOnColumn,
  basicColumns,
  commentsColumn,
  conduitColumn,
  createdOnColumn,
  detailsLinkColumn,
  editLinkColumn,
  filterEvent,
  fnAddFilterFoot,
  fnDeselect,
  fnGetSelected,
  fnSelectAll,
  fnSetDeselect,
  fnUnwrap,
  fnWrap,
  fromColumns,
  highlightedEvent,
  lengthColumn,
  numberColumn,
  ownerProvidedColumn,
  rejectedByColumn,
  rejectedOnColumn,
  sButtons,
  sDom,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  typeColumns,
  updatedOnColumn,
} from '../lib/table';

/*global fnAddFilterFoot: false, typeColumns: false, sDom: false, oTableTools: false, filterEvent: false*/
/*global window: false*/

$(document).ajaxError(function (event, jqxhr) {
  if (jqxhr.status === 401) {
    $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Please click <a href="/" target="_blank">home</a>, log in, and then save the changes on this page.</div>');
    $(window).scrollTop($('#message div:last-child').offset().top - 40);
  }
});

function tdEdit(oTable) {
  $(oTable.cells().nodes()).editable(function (value) {
    var that = this;
    var newValue = value.trim();
    var oldValue = oTable.cell(that).data().trim();
    if (newValue === oldValue) {
      return newValue;
    }
    var data: { target?: string; update?: string; original?: string; } = {};
    data.target = typeColumns[oTable.column(that).index()].mData;
    data.update = newValue;
    data.original = oldValue;
    if (data.original === '') {
      data.original = null;
    }
    if (data.update === '') {
      data.update = null;
    }

    $.ajax({
      url: basePath + '/cabletypes/' + oTable.row(that).data()._id,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function () {
        oTable.row(that).data()[data.target] = newValue;
        oTable.draw();
      },
      error: function (jqXHR) {
        $(that).text(oldValue);
        $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Cannot update the cable type : ' + jqXHR.statusText + '</div>');
        $(window).scrollTop($('#message div:last-child').offset().top - 40);
      }
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

$(function () {
  //fnAddFilterFoot('#cable-type', typeColumns);
  var cabletype = $('#cable-type').DataTable({
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
    dataType: 'json'
  }).done(function (json) {
    cabletype.clear();
    cabletype.rows.add(json);
    cabletype.draw();
    tdEdit(cabletype);
  }).fail(function () {
    $('#message').append('<div class="alert alert-danger"><button class="close" data-dismiss="alert">x</button>Cannot reach the server for cable type information.</div>');
  }).always(() => {});
});
