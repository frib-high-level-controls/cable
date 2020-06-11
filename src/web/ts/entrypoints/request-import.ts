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
  sButtons,
  sDom2InoF,
} from '../lib/table';

type CableRequest = webapi.CableRequest;

const projects: webapi.CableProject[] = (global as any).projects || [];

const categories: webapi.CableCategories = (global as any).categories || {};

const traySections: webapi.CableTraySection[] = (global as any).traySections || [];

let errors: webapi.PkgErrorDetail[] = [];

function findErrorWithLocation(row: number, path: string, reason?: string): webapi.PkgErrorDetail | null {
  reason = reason || 'ValidationError';
  const location = `requests[${row}].${path}`;
  for (const error of errors) {
    if (location === error.location && reason === error.reason) {
      return error;
    }
  }
  return null;
}

function simpleColumn(title: string, path: string): dtutil.ColumnSettings {
  return {
    title: title,
    data: path,
    defaultContent: '',
    render: (value: any, type: string, row: CableRequest, meta): string => {
      const error = findErrorWithLocation(meta.row, path);
      if (error) {
        return `<span class="text-danger">${error.message}</span>`;
      }
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    },
    searchable: true,
  };
}


// Need to implement special column definitons
// that render validation errors if available.
export const reviewTableColumns: dtutil.ColumnSettings[] = [
{
  title: 'Project',
  data: 'basic.project',
  defaultContent: '',
  render: (value: CableRequest['basic']['project'], type: string, row: CableRequest, meta): string => {
    const error = findErrorWithLocation(meta.row, 'basic.project');
    if (error) {
      return `<span class="text-danger">${error.message}</span>`;
    }
    const project = projects.find((p) => (p.value === value));
    if (!project || !project.title) {
      return `<span class="text-danger">ERROR</span>`;
    }
    return project.title;
  },
  searchable: true,
},
  simpleColumn('WBS', 'basic.wbs'),
{
  title: 'Origin Category',
  data: 'basic.originCategory',
  defaultContent: '',
  render: (value: CableRequest['basic']['originCategory'], type: string, row: CableRequest, meta): string => {
    const error = findErrorWithLocation(meta.row, 'basic.originCategory');
    if (error) {
      return `<span class="text-danger">${error.message}</span>`;
    }
    if (!categories[value] || !categories[value].name) {
      return `<span class="text-danger">ERROR</span>`;
    }
    return categories[value].name;
  },
  searchable: true,
}, {
  title: 'Origin Subcategory',
  data: 'basic.originSubcategory',
  defaultContent: '',
  render: (value: CableRequest['basic']['originSubcategory'], type: string, row: CableRequest, meta): string => {
    const error = findErrorWithLocation(meta.row, 'basic.originSubcategory');
    if (error) {
      return `<span class="text-danger">${error.message}</span>`;
    }
    const category = categories[row.basic.originCategory];
    if (!category || !category.subcategory[value]) {
      return `<span class="text-danger">ERROR</span>`;
    }
    return category.subcategory[value];
  },
  searchable: true,
}, {
  title: 'Signal Classification',
  data: 'basic.signalClassification',
  defaultContent: '',
  render: (value: CableRequest['basic']['signalClassification'], type: string, row: CableRequest, meta): string => {
    const error = findErrorWithLocation(meta.row, 'basic.signalClassification');
    if (error) {
      return `<span class="text-danger">${error.message}</span>`;
    }
    const category = categories[row.basic.originCategory];
    if (!category || !category.signal[value] || !category.signal[value].name) {
      return `<span class="text-danger">ERROR</span>`;
    }
    return category.signal[value].name;
  },
  searchable: true,
}, {
  title: 'Tray section',
  data: 'basic.traySection',
  defaultContent: '',
  render: (value: CableRequest['basic']['traySection'], type: string, row: CableRequest, meta): string => {
    const error = findErrorWithLocation(meta.row, 'basic.traySection');
    if (error) {
      return `<span class="text-danger">${error.message}</span>`;
    }
    const traySection = traySections.find((s) => (s.value === value));
    if (!traySection || !traySection.title) {
      return `<span class="text-danger">ERROR</span>`;
    }
    return traySection.title;
  },
  searchable: true,
},
  simpleColumn('Cable Type', 'basic.cableType'),
  simpleColumn('Engineer', 'basic.engineer'),
  simpleColumn('Function', 'basic.service'),
  simpleColumn('Tags', 'basic.tags'),
  simpleColumn('Quantity', 'basic.quantity'),
  simpleColumn('Owner provided', 'ownerProvided'),
  // FROM
  simpleColumn('From Location', 'from.rack'),
  simpleColumn('From Termination Device', 'from.terminationDevice'),
  simpleColumn('From Termination Type', 'from.terminationType'),
  simpleColumn('From Termination Port', 'from.terminationPort'),
  simpleColumn('From Wiring Drawing', 'from.wiringDrawing'),
  // TO
  simpleColumn('To Location', 'to.rack'),
  simpleColumn('To Termination Device', 'to.terminationDevice'),
  simpleColumn('To Termination Type', 'to.terminationType'),
  simpleColumn('To Termination Port', 'to.terminationPort'),
  simpleColumn('To Wiring Drawing', 'to.wiringDrawing'),

  simpleColumn('Conduit', 'conduit'),
  simpleColumn('Length', 'length'),
  simpleColumn('Comments', 'comments'),
];


$(() => {
  // import data review table

  dtutil.addTitleHead('#request-review-table', reviewTableColumns);
  dtutil.addFilterHead('#request-review-table', reviewTableColumns);
  const reviewTable = $('#request-review-table').DataTable({
    data: [],
    autoWidth: false,
    columns: reviewTableColumns,
    order: [], // disable default ordering
    orderCellsTop: true,
    dom: sDom2InoF,
    buttons: sButtons,
    scrollX: true,
    scrollY: '50vh',
    scrollCollapse: true,
    deferRender: true,
    createdRow(row) {
      $(row).addClass('nowrap');
    },
  });

  $('#request-review-cancel').click((evt) => {
    $('#request-review').prop('hidden', true);
    reviewTable.clear();
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
      if (!pkg?.data) {
        $('#message').append(
          '<div class="alert alert-danger">'
          + '<button type="button" class="close" data-dismiss="alert">x</button>'
          + 'Import cable requests failed: ' + unwrapPkgErrMsg(xhr)
          + '</div>');
        return;
      }
      // expecting the validation errors
      errors = pkg.error?.errors || [];
      $('#message').append(
        '<div class="alert alert-danger">'
        + '<button type="button" class="close" data-dismiss="alert">x</button>'
        + 'Imported Cable Requests contain ' + errors.length + ' validation error(s)'
        + '</div>');
    } finally {
      // Clear file input to avoid problem with form re-submission
      ($('#request-import-form')[0] as HTMLFormElement).reset();
      $('#request-import-form :input').prop('disabled', false);
    }

    reviewTable.clear();
    reviewTable.rows.add(pkg.data);
    $('#request-review').prop('hidden', false);
    reviewTable.columns.adjust().draw();
  }));
});
