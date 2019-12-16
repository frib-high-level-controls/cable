/**
 * Common utilities for working with DataTables
 */
import * as $ from 'jquery';

export interface ColumnSettings extends DataTables.ColumnSettings {
  searching?: boolean;
  placeholder?: string;
}

/**
 * Add filter (ie search) input fields to the table head (ie thead)
 */
export function addFilterHead(tableQuery: string, columns: ColumnSettings[]): void {
  const t = $(tableQuery);
  const tr = $('<tr/>').appendTo(t.find('thead'));

  columns.forEach((column, idx) => {
    const th = $('<th></th>').appendTo(tr);
    if (column.searching || (column as any).bFilter) {
      th.append(`<input type="text" placeholder="${column.placeholder || ''}"
                      style="width:80%;" autocomplete="off">`);
      // Need a regular (non-arrow) function to capture 'this' properly!
      // tslint:disable only-arrow-functions
      th.on('keyup', 'input', (evt) => {
        if (evt.target instanceof HTMLInputElement) {
          const input = $(evt.target).val();
          if (typeof input === 'string') {
            t.DataTable().column(idx).search(input).draw();
          }
        }
      });
    }
  });
}
