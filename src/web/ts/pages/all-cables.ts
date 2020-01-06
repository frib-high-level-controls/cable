/**
 * All Cables tables page
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import 'jquery-ui/themes/base/all.css';

import '@fortawesome/fontawesome-free/js/all';

import 'popper.js';

import 'bootstrap';

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

import * as moment from 'moment';

import * as dtutil from '../shared/datatablesutil';

import {
  json2List,
  nameAuto,
} from '../lib/util';

import {
  ajax401,
  disableAjaxCache,
} from '../lib/ajaxhelper';

import {
  barChart,
} from '../lib/barchart';

import {
  approvedByColumn,
  approvedOnColumn,
  approvedOnLongColumn,
  basicColumns,
  commentsColumn,
  conduitColumn,
  createdOnColumn,
  detailsLinkColumn,
  editLinkColumn,
  filterEvent,
  fnDeselect,
  fnGetSelected,
  fnSelectAll,
  fnSetDeselect,
  fnUnwrap,
  fnWrap,
  formatCableStatus,
  fromColumns,
  highlightedEvent,
  lengthColumn,
  numberColumn,
  obsoletedByColumn,
  obsoletedOnLongColumn,
  ownerProvidedColumn,
  rejectedByColumn,
  rejectedOnColumn,
  requestNumberColumn,
  requiredColumn,
  sButtons,
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedByColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
  updatedOnLongColumn,
  versionColumn,
} from '../lib/table';

/*global fnAddFilterFoot: false, oTableTools: false, filterEvent: false, numberColumn: false, requestNumberColumn: false, statusColumn: false, versionColumn:falase, updatedOnLongColumn: false, approvedOnLongColumn: false, submittedByColumn:false, basicColumns: false, ownerProvidedColumn, fromColumns: false, toColumns: false,conduitColumn, lengthColumn, commentsColumn: false, sDom2InoF: false, fnAddFilterHead: false, fnWrap: false, fnUnwrap: false, barChart: false, selectEvent: false, highlightedEvent: false*/
/*global ajax401: false*/
/*global window: false*/

$(function () {

  ajax401('');

  const readyTime = Date.now();

  var allAoColumns = ([numberColumn, requestNumberColumn, statusColumn, versionColumn, updatedOnLongColumn, approvedOnLongColumn, submittedByColumn] as Array<any>).concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  let allTableWrapped = true;

  var allTable = $('#all-cable').DataTable({
    ajax: {
      url: basePath + '/allcables/json',
      dataSrc: '',
    },
    autoWidth: false,
    processing: true,
    lengthMenu: [
      [25, 50, 100, 500, 1000, -1],
      [25, 50, 100, 500, 1000, 'All']
    ],
    language: {
      loadingRecords: 'Please wait - loading data from the server ...'
    },
    columns: allAoColumns,
    order: [
      [4, 'desc'],
      [5, 'desc'],
      [0, 'desc']
    ],
    dom: sDom2InoF,
    buttons: sButtons,
    deferRender: true,
    createdRow(row) {
      if (!allTableWrapped) {
        $(row).addClass('nowrap');
      }
    },
  });

  dtutil.addFilterHead('#all-cable', allAoColumns);
  // fnAddFilterFoot('#all-cable', allAoColumns);

  $('#all-cable').on('init.dt', () => {
    console.log('All table initialized: ' + String((Date.now() - readyTime) / 1000) + 's' );
  });

  $('#all-wrap').click(function () {
    allTableWrapped = true;
    fnWrap(allTable);
  });

  $('#all-unwrap').click(function () {
    allTableWrapped = false;
    fnUnwrap(allTable);
  });

  $('#reload').click(function () {
    allTable.ajax.reload();
  });

  $('#bar').click(function () {
    barChart(allTable);
  });

  filterEvent();
  selectEvent();
  highlightedEvent();
});
