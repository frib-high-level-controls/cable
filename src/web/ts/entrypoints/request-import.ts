/**
 * Request bulk import
 */
import '../pages/base';

import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

// JSZip is a requirement for the 'Excel' button,
// but it needs to exist of the global (ie window).
import * as JSZip from 'jszip';
(window as any).JSZip = JSZip;
import 'datatables.net-bs4';
import 'datatables.net-buttons-bs4';
import 'datatables.net-buttons/js/buttons.html5.min.js';
import 'datatables.net-buttons/js/buttons.print.min.js';

// import 'jquery-validation';

import * as $ from 'jquery';

import {
  unwrapPkgErrMsg,
  wrapCatchAll,

} from '../shared/webutil';

import * as dtutil from '../shared/datatablesutil';

// import * as Binder from '../lib/binder';

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
  sDom2InoF,
  selectColumn,
  selectEvent,
  statusColumn,
  submittedOnColumn,
  tabShownEvent,
  toColumns,
  updatedOnColumn,
} from '../lib/table';

$(() => {

  /*saved tab starts*/
  // tslint:disable-next-line:max-line-length
  const columns = [/* selectColumn, editLinkColumn, createdOnColumn, updatedOnColumn */].concat(basicColumns, ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);
  // let savedTableWrapped = true;

  dtutil.addTitleHead('#request-review-table', columns);
  dtutil.addFilterHead('#request-review-table', columns);
  const table = $('#request-review-table').DataTable({
    data: [],
    autoWidth: false,
    columns: columns,
    order: [
      [2, 'desc'],
      [3, 'desc'],
    ],
    orderCellsTop: true,
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '50vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      // if (!savedTableWrapped) {
        $(row).addClass('nowrap');
      // }
    },
  });

  $('#request-review-cancel').click((evt) => {
    $('#request-review').prop('hidden', true);
    table.clear();
  });

  $('#request-import-form').submit(wrapCatchAll(async (evt) => {
    evt.preventDefault();

    const formData = new FormData(evt.target as HTMLFormElement);
    $('#request-import-form :input').prop('disabled', true);

    let pkg: webapi.Pkg<webapi.CableRequest[]>;
    try {
      pkg = await Promise.resolve($.ajax({
        url: `${basePath}/requests/import?dryrun=true`,
        method: 'POST',
        data: formData,
        dataType: 'json',
        processData: false,
        contentType: false,
      }));

    } catch (xhr) {
      pkg = xhr.responseJSON;
      if (pkg && !pkg.data) {
        $('#message').append(
          '<div class="alert alert-danger">'
          + '<button type="button" class="close" data-dismiss="alert">x</button>'
          + 'Import cable requests failed: ' + unwrapPkgErrMsg(xhr)
          + '</div>');
        return;
      }
    } finally {
      // Clear file input to avoid problem with form re-submission
      $('#request-import-file').val('');
      $('#request-import-form :input').prop('disabled', false);
    }

    table.clear();
    table.rows.add(pkg.data);
    $('#request-review').prop('hidden', false);
    table.columns.adjust().draw();
  }));
});
