import { Plugin, parseYaml, TFile } from "obsidian";

import { getFilteredCsvData } from "./csv_table";
import { TableRenderer, renderErrorPre } from "./render";
import { CsvTableSpec } from "./types";

export default class CsvTablePlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor(
      "csvtable",
      async (csvSpecString: string, el, ctx) => {
        try {
          let tableSpec: CsvTableSpec = {
            source: "", // Assert that this has a proper value below
          };
          try {
            tableSpec = parseYaml(csvSpecString);
          } catch (e) {
            throw new Error(`Could not parse CSV table spec: ${e.message}`);
          }

          if (!tableSpec.source) {
            throw new Error("Parameter 'source' is required.");
          }

          const file = this.app.vault.getAbstractFileByPath(tableSpec.source);
          if (!(file instanceof TFile)) {
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
          renderErrorPre(el, e.message);
          return;
        }
      }
    );
  }
}
