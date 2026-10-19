import { MarkdownRenderChild } from "obsidian";

import { CsvRow } from "./types";
import { getCellDisplay } from "./util";

export class TableRenderer extends MarkdownRenderChild {
  constructor(
    public columns: string[],
    public rows: CsvRow[],
    public container: HTMLElement
  ) {
    super(container);
  }

  onload(): void {
    this.render();
  }

  render(): void {
    const tableEl = this.container.createEl("table");

    const theadEl = tableEl.createEl("thead");
    const headerEl = theadEl.createEl("tr");
    const tbodyEl = tableEl.createEl("tbody");

    for (const column of this.columns) {
      headerEl.createEl("th", { text: column });
    }

    for (const row of this.rows) {
      const trEl = tbodyEl.createEl("tr");

      for (const column of this.columns) {
        trEl.createEl("td", { text: getCellDisplay(row, column) });
      }
    }
  }
}

export function renderErrorPre(
  container: HTMLElement,
  error: string
): HTMLElement {
  const pre = container.createEl("pre", { cls: ["csv-table", "csv-error"] });
  pre.appendText(error);
  return pre;
}
