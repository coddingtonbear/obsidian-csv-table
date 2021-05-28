import { Plugin } from 'obsidian';

import { getFilteredCsvData, getCsvTableSpec } from './csv_table';
import { TableRenderer, renderErrorPre } from './render'

export default class CsvTablePlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("csvtable", async (csvSpecString: string, el, ctx) => {
      try {
        const tableSpec = getCsvTableSpec(csvSpecString)

        const exists = await this.app.vault.adapter.exists(tableSpec.source)
        if (!exists) {
          throw new Error(`CSV file '${tableSpec.source}' could not be found.`)
        }
        const csvData = await this.app.vault.adapter.read(tableSpec.source)

        const filteredCsvData = getFilteredCsvData(tableSpec, csvData)
        ctx.addChild(new TableRenderer(filteredCsvData.columns, filteredCsvData.rows, el));
      } catch (e) {
        renderErrorPre(el, e.message)
        return
      }
    });
  }
}
