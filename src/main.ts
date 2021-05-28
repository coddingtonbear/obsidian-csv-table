import { Plugin } from 'obsidian';

import { getCodeBlockData, getCsvTableSpec } from './code_block';
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

        const codeBlockData = await getCodeBlockData(tableSpec, csvData)
        ctx.addChild(new TableRenderer(codeBlockData.columns, codeBlockData.rows, el));
      } catch (e) {
        renderErrorPre(el, e.message)
        return
      }
    });
  }
}
