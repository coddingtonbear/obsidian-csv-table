import { Plugin } from 'obsidian';

import { getCodeBlockData } from './code_block';
import { TableRenderer, renderErrorPre } from './render'

export default class CsvTablePlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("csvtable", async (csvSpecString: string, el, ctx) => {
      try {
        const codeBlockData = await getCodeBlockData(csvSpecString, this.app.vault)
        ctx.addChild(new TableRenderer(codeBlockData.columns, codeBlockData.rows, el));
      } catch (e) {
        renderErrorPre(el, e.message)
        return
      }
    });
  }
}
