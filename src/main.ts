import { Plugin, normalizePath } from "obsidian";

import { getFilteredCsvData } from "./csv_table";
import { errorMessage } from "./expression";
import { TableRenderer, renderErrorPre } from "./render";
import { parseTableSpec } from "./spec";

export default class CsvTablePlugin extends Plugin {
  onload(): void {
    this.registerMarkdownCodeBlockProcessor(
      "csvtable",
      async (csvSpecString, el, ctx) => {
        try {
          const tableSpec = parseTableSpec(csvSpecString);

          const file = this.app.vault.getFileByPath(
            normalizePath(tableSpec.source)
          );
          if (file === null) {
            throw new Error(
              `CSV file '${tableSpec.source}' could not be found.`
            );
          }
          const csvData = await this.app.vault.cachedRead(file);

          const filteredCsvData = getFilteredCsvData(tableSpec, csvData);
          ctx.addChild(
            new TableRenderer(filteredCsvData.columns, filteredCsvData.rows, el)
          );
        } catch (e) {
          renderErrorPre(el, errorMessage(e));
        }
      }
    );
  }
}
