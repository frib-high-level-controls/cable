/**
 * Chart cable data
 */
import * as $ from 'jquery';

import _ from 'lodash';

import { Chart } from 'chart.js';

import {
  fnGetSelected,
} from '../lib/table';

/*global fnGetSelected: false*/

var plot = null;
function query(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, ''); // strip a leading dot
  var a = s.split('.');
  var i;
  for (i = 0; i < a.length; i += 1) {
    if (o.hasOwnProperty(a[i])) {
      o = o[a[i]];
    } else {
      return null;
    }
  }
  return o;
}

function drawChart(ctx, selected, oTable, groupBy) {
  var barChartData = {
    labels: [],
    datasets: [{
      fillColor: 'rgba(151,187,205,0.5)',
      strokeColor: 'rgba(151,187,205,0.8)',
      highlightFill: 'rgba(151,187,205,0.75)',
      highlightStroke: 'rgba(151,187,205,1)',
      data: []
    }]
  };
  var data = [];
  var rows;
  var i;
  if (selected.length) {
    selected.forEach(function (row) {
      data.push(oTable.row(row).data());
    });
  } else {
    data = oTable.rows().data();
  }
  var groups = _.countBy(data, function (item) {
    return query(item, groupBy);
  });
  _.forEach(groups, function (count, key) {
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
    //barShowStroke: false,
    //animation: false
  });
  return barChartData;
}

function tableBar(oTable) {
  var selected = fnGetSelected(oTable, 'row-selected');
  if (selected.length) {
    $('#modalLabel').html('Plot a bar chart for the selected ' + selected.length + ' items in current table');
  } else {
    $('#modalLabel').html('Plot a bar chart for all items in the table');
  }
  $('#modal .modal-body').empty().html('<canvas id="barChart"></canvas><a id="barChartShowData" hidden href="#">Show Data</a><textarea id="barChartData" hidden readonly="readonly" style="height:400px;"></textarea><div><a id="barChartHideData" href="#" hidden>Show Plot</a></div>');

  $('#modal .modal-footer').html('<form class="form-inline"><select id="bar-key" class="form-control mr-2"><option value="basic.wbs">WBS</option><option value="status">Status</option><option value="basic.traySection">Tray section</option><option value="basic.cableType">Cable type</option><option value="basic.engineer">Engineer</option><option value="conduit">Conduit</option></select><button id="plot" type="button" class="btn btn-primary mr-2">Plot</button><button type="button" data-dismiss="modal" aria-hidden="true" class="btn btn-secondary">Close</button></form>');

  $('#modal').modal('show');

  $('#plot').click(function (e) {
    e.preventDefault();
    // Reset element visibility. Chart must be visible when created.
    $('#barChartData,#barChartHideData').prop('hidden', true);
    $('#barChart,#barChartShowData').prop('hidden', false);
    var ctx = ($('#barChart')[0] as any).getContext('2d');
    var groupBy = $('#bar-key').val();
    var data = drawChart(ctx, selected, oTable, groupBy);
    var csv = [ '"' + $('#bar-key option:selected').text() + '", "count"'];
    for (var idx = 0; idx < data.labels.length; idx += 1) {
      csv.push('"' + data.labels[idx] + '", ' + data.datasets[0].data[idx]);
    }
    $('#barChartData').val(csv.join('\n'));
  });

  $('#barChartShowData').click(function (e) {
    $('#barChart,#barChartShowData').prop('hidden', true);
    $('#barChartData,#barChartHideData').prop('hidden', false);
  });

  $('#barChartHideData').click(function (e) {
    $('#barChartData,#barChartHideData').prop('hidden', true);
    $('#barChart,#barChartShowData').prop('hidden', false);
  });
}

export {
  tableBar as barChart,
};
