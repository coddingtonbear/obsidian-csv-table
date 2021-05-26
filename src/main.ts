import { Plugin } from 'obsidian';

import { getCodeBlockData } from './code_block';
import { TableRenderer } from './render'

function renderErrorPre(container: HTMLElement, error: string): HTMLElement {
  let pre = container.createEl('pre', { cls: ["csv-table", "csv-error"] });
  pre.appendText(error);
  return pre;
}

export default class CsvTablePlugin extends Plugin {
  async onload() {
    console.log("Loading CSV table plugin");

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

  onunload() {
    console.log('Unloading CSV table plugin');
  }
}
