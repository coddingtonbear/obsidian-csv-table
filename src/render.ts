import { MarkdownRenderChild } from 'obsidian';

import { getCellDisplay, getColumnInfo } from './util'

export class TableRenderer extends MarkdownRenderChild {
  constructor(public columns: string[], public rows: any[], public container: HTMLElement) {
    super(container)
  }

  async onload() {
    await this.render()
  }

  async render() {
    const columns = this.columns?.length ? this.columns : Object.keys(this.rows[0])

    const tableEl = this.container.createEl('table')

    const theadEl = tableEl.createEl('thead')
    const headerEl = theadEl.createEl('tr')
    const tbodyEl = tableEl.createEl('tbody')

    const columnNames: string[] = []

    for (const column of columns) {
      const columnInfo = getColumnInfo(column)

      headerEl.createEl('th', { text: columnInfo.name })
      columnNames.push(columnInfo.name)
    }

    for (const row of this.rows) {
      const trEl = tbodyEl.createEl('tr')

      for (const columnName of columnNames) {
        trEl.createEl('td', { text: getCellDisplay(row, columnName) })
      }
    }
  }
}

export function renderErrorPre(container: HTMLElement, error: string): HTMLElement {
  let pre = container.createEl('pre', { cls: ["csv-table", "csv-error"] });
  pre.appendText(error);
  return pre;
}
