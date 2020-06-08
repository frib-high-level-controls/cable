/**
 * All Cables tables page
 */
import './base';

import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

import 'jquery-ui/ui/widgets/autocomplete';
import 'jquery-ui/ui/widgets/datepicker';

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
  ajax401,
} from '../lib/ajaxhelper';

import {
  barChart,
} from '../lib/barchart';

import {
  approvedOnLongColumn,
  basicColumns,
  commentsColumn,
  conduitColumn,
  filterEvent,
  fnUnwrap,
  fnWrap,
  fromColumns,
  highlightedEvent,
  lengthColumn,
  numberColumn,
  ownerProvidedColumn,
  requestNumberColumn,
  sButtons,
  sDom2InoF,
  selectEvent,
  statusColumn,
  submittedByColumn,
  toColumns,
  updatedOnLongColumn,
  versionColumn,
} from '../lib/table';


$(() => {

  ajax401('');

  const readyTime = Date.now();
  // tslint:disable:max-line-length
  const allAoColumns = [numberColumn, requestNumberColumn, statusColumn, versionColumn, updatedOnLongColumn, approvedOnLongColumn, submittedByColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let allTableWrapped = true;

  const allTable = $('#all-cable').DataTable({
    ajax: {
      url: basePath + '/allcables/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    lengthMenu: [
      [25, 50, 100, 500, 1000, -1],
      [25, 50, 100, 500, 1000, 'All'],
    ],
    language: {
      loadingRecords: 'Please wait - loading data from the server ...',
    },
    columns: allAoColumns,
    order: [
      [4, 'desc'],
      [5, 'desc'],
      [0, 'desc'],
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '55vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      if (!allTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });

  dtutil.addFilterHead('#all-cable', allAoColumns);

  $('#all-cable').on('init.dt', () => {
    // tslint:disable:no-console
    console.log('All table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#all-wrap').click(() => {
    allTableWrapped = true;
    fnWrap(allTable);
  });

  $('#all-unwrap').click(() => {
    allTableWrapped = false;
    fnUnwrap(allTable);
  });

  $('#reload').click(() => {
    allTable.ajax.reload();
  });

  $('#bar').click(() => {
    barChart(allTable);
  });

  filterEvent();
  selectEvent();
  highlightedEvent();
});
