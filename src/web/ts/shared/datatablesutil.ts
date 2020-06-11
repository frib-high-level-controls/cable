/**
 * Common utilities for working with DataTables
 */
import * as $ from 'jquery';

export interface ColumnSettings extends DataTables.ColumnSettings {
  searching?: boolean;
  placeholder?: string;
}


/**
 * Add title (ie search) row input to the table head (ie thead)
 */
export function addTitleHead(tableQuery: string, columns: ColumnSettings[]): void {
  const t = $(tableQuery);
  let thead = t.find<HTMLElement>('thead').first();
  if (thead.length === 0) {
    thead = $('<thead/>').appendTo(t);
  }
  const tr = $('<tr/>').appendTo(thead);
  columns.forEach((column, idx) => {
    $(`<th>${column.title || idx}</th>`).appendTo(tr);
  });
}

/**
 * Add filter (ie search) row to the table head (ie thead)
 */
export function addFilterHead(tableQuery: string, columns: ColumnSettings[]): void {
  const t = $(tableQuery);
  let thead = t.find<HTMLElement>('thead').first();
  if (thead.length === 0) {
    thead = $('<thead/>').appendTo(t);
  }
  const tr = $('<tr/>').appendTo(thead);

  columns.forEach((column, idx) => {
    const th = $('<th></th>').appendTo(tr);
    if (column.searching || (column as any).bFilter) {
      th.append(`<input type="text" placeholder="${column.placeholder || ''}"
                      style="width:80%;" autocomplete="off">`);
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
