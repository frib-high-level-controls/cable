/*global fnAddFilterFoot: false, oTableTools: false, filterEvent: false, numberColumn: false, requestNumberColumn: false, statusColumn: false, versionColumn:falase, updatedOnLongColumn: false, approvedOnLongColumn: false, submittedByColumn:false, basicColumns: false, ownerProvidedColumn, fromColumns: false, toColumns: false,conduitColumn, lengthColumn, commentsColumn: false, sDom2InoF: false, fnAddFilterHead: false, fnWrap: false, fnUnwrap: false, barChart: false, selectEvent: false, highlightedEvent: false*/
/*global ajax401: false*/
/*global window: false*/
$(function () {
  ajax401();
  var allAoColumns = [numberColumn, requestNumberColumn, statusColumn, versionColumn, updatedOnLongColumn, approvedOnLongColumn, submittedByColumn].concat(basicColumns.slice(0, 2), basicColumns.slice(3, 8), ownerProvidedColumn, fromColumns, toColumns).concat([conduitColumn, lengthColumn, commentsColumn]);

  var allTable = $('#all-cable').dataTable({
    sAjaxSource: basePath + '/allcables/json',
    sAjaxDataProp: '',
    bAutoWidth: false,
    iDisplayLength: 25,
    aLengthMenu: [
      [25, 50, 100, 500, 1000, -1],
      [25, 50, 100, 500, 1000, 'All']
    ],
    oLanguage: {
      sLoadingRecords: 'Please wait - loading data from the server ...'
    },
    bProcessing: true,
    aoColumns: allAoColumns,
    aaSorting: [
      [4, 'desc'],
      [5, 'desc'],
      [0, 'desc']
    ],
    sDom: sDom2InoF,
    oTableTools: oTableTools
  });

  fnAddFilterHead('#all-cable', allAoColumns);
  fnAddFilterFoot('#all-cable', allAoColumns);

  $('#all-wrap').click(function () {
    fnWrap(allTable);
  });
  $('#all-unwrap').click(function () {
    fnUnwrap(allTable);
  });

  $('#reload').click(function () {
    allTable.fnReloadAjax();
  });

  $('#bar').click(function () {
    barChart(allTable);
  });


  filterEvent();
  selectEvent();
  highlightedEvent();
});
