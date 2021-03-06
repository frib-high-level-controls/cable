/**
 * Chart cable data
 */
import * as $ from 'jquery';

import _ from 'lodash';

import { Chart } from 'chart.js';

import {
  fnGetSelected,
} from '../lib/table';

type DTAPI = DataTables.Api;

let plot: Chart | null = null;
function query(o: object, s: string): object | null {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, ''); // strip a leading dot
  const a = s.split('.');
  for (const i of a) {
    if (o.hasOwnProperty(i)) {
      // TS does not use hasOwnProperty to guard type
      // therefore a type assertion is required.
      o = (o as any)[i];
    } else {
      return null;
    }
  }
  return o;
}

function drawChart(ctx: CanvasRenderingContext2D, selected: DTAPI[], oTable: DTAPI, groupBy: string) {
  const barChartData = {
    labels: [] as string[],
    datasets: [{
      fillColor: 'rgba(151,187,205,0.5)',
      strokeColor: 'rgba(151,187,205,0.8)',
      highlightFill: 'rgba(151,187,205,0.75)',
      highlightStroke: 'rgba(151,187,205,1)',
      data: [] as number[],
    }],
  };
  const data: object[] = [];
  if (selected.length) {
    selected.forEach((row) => {
      data.push(oTable.row(row).data());
    });
  } else {
    oTable.rows().data().each((row) => {
      data.push(row);
    });
  }
  const groups = _.countBy(data, (item) => {
    return query(item, groupBy);
  });
  _.forEach(groups, (count, key) => {
    barChartData.labels.push(key);
    barChartData.datasets[0].data.push(count);
  });
  ctx.clearRect(0, 0, 400, 600);
  if (plot !== null) {
    plot.destroy();
  }
  plot = new Chart(ctx, {
    type: 'bar',
    data: barChartData,
    options: {
      legend: {
        display: false,
      },
    },
    // barShowStroke: false,
    // animation: false
  });
  return barChartData;
}

function tableBar(oTable: DTAPI) {
  const selected = fnGetSelected(oTable, 'row-selected');
  if (selected.length) {
    $('#modalLabel').html('Plot a bar chart for the selected ' + selected.length + ' items in current table');
  } else {
    $('#modalLabel').html('Plot a bar chart for all items in the table');
  }
  $('#modal .modal-body').empty().html('<canvas id="barChart"></canvas><a id="barChartShowData" hidden href="#">Show Data</a><textarea id="barChartData" hidden readonly="readonly" style="height:400px;"></textarea><div><a id="barChartHideData" href="#" hidden>Show Plot</a></div>');

  $('#modal .modal-footer').html('<form class="form-inline"><select id="bar-key" class="form-control mr-2"><option value="basic.wbs">WBS</option><option value="status">Status</option><option value="basic.traySection">Tray section</option><option value="basic.cableType">Cable type</option><option value="basic.engineer">Engineer</option><option value="conduit">Conduit</option></select><button id="plot" type="button" class="btn btn-primary mr-2">Plot</button><button type="button" data-dismiss="modal" aria-hidden="true" class="btn btn-secondary">Close</button></form>');

  $('#modal').modal('show');

  $('#plot').click((e) => {
    e.preventDefault();
    // Reset element visibility. Chart must be visible when created.
    $('#barChartData,#barChartHideData').prop('hidden', true);
    $('#barChart,#barChartShowData').prop('hidden', false);
    const ctx = $<HTMLCanvasElement>('#barChart')[0].getContext('2d');
    if (ctx) {
      const groupBy = String($('#bar-key').val());
      const data = drawChart(ctx, selected, oTable, groupBy);
      const csv = [ '"' + $('#bar-key option:selected').text() + '", "count"'];
      for (let idx = 0; idx < data.labels.length; idx += 1) {
        csv.push('"' + data.labels[idx] + '", ' + data.datasets[0].data[idx]);
      }
      $('#barChartData').val(csv.join('\n'));
    }
  });

  $('#barChartShowData').click((e) => {
    $('#barChart,#barChartShowData').prop('hidden', true);
    $('#barChartData,#barChartHideData').prop('hidden', false);
  });

  $('#barChartHideData').click((e) => {
    $('#barChartData,#barChartHideData').prop('hidden', true);
    $('#barChart,#barChartShowData').prop('hidden', false);
  });
}

export {
  tableBar as barChart,
};
