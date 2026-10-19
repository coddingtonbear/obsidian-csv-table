import type { Options as CsvParseOptions } from "csv-parse";
import { parse as parseCsv } from "csv-parse/sync";

import { compileRowExpression, errorMessage } from "./expression";
import { CsvRow, CsvTableData, CsvTableSpec, ExtendedSortExpression } from "./types";
import {
  applyRowFilters,
  getColumnInfo,
  evaluateExpression,
  sortRows,
  getArrayForArrayOrObject,
  getSortExpression,
} from "./util";

/** A record as csv-parse returns it: an object with `columns` on (the
 * default), or a list of cells with it off. A list is keyed by position so
 * the rest of the plugin only sees objects. */
function toRow(record: unknown): CsvRow {
  if (Array.isArray(record)) {
    return Object.fromEntries(
      record.map((cell: unknown, index) => [String(index), cell])
    );
  }
  if (typeof record === "object" && record !== null) {
    return record as CsvRow;
  }
  throw new Error(`Unexpected CSV record: ${JSON.stringify(record)}`);
}

/** csv-parse 5 renamed these options; blocks written for csv-parse 4 (this
 * plugin until 1.2) keep working. csv-parse ignores names it doesn't know.
 * When a block gives both names, the current one wins. */
const RENAMED_CSV_OPTIONS: Record<string, string> = {
  relax: "relax_quotes",
  skip_lines_with_empty_values: "skip_records_with_empty_values",
  skip_lines_with_error: "skip_records_with_error",
};

function renameCsvOptions(options: CsvParseOptions): CsvParseOptions {
  const renamed: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(options) as [string, unknown][]) {
    const newName = RENAMED_CSV_OPTIONS[name];
    if (newName === undefined) {
      renamed[name] = value;
    } else if (!(newName in options)) {
      renamed[newName] = value;
    }
  }
  return renamed;
}

interface ParsedCsv {
  rows: CsvRow[];
  /** The names rows are keyed by, known even when there are no rows. */
  columns: string[];
}

/** The column names csv-parse keys rows by: the header line when it is
 * reading one (`columns: true`), or the names given in a `columns` list.
 * Read from the header rather than from the first row, which under
 * `relax_column_count` may be short. */
function parseHeaderColumns(csvData: string, options: CsvParseOptions): string[] {
  if (options.columns === true) {
    // The header is the first record once csv-parse stops treating it as
    // the header; `from` counts records, so it is reset to reach it.
    const records: unknown = parseCsv(csvData, {
      ...options,
      columns: false,
      cast: false,
      cast_date: false,
      from: 1,
      to: 1,
    });
    const header: unknown = Array.isArray(records) ? records[0] : undefined;
    // csv-parse keeps the last of two same-named columns under one key.
    return Array.isArray(header) ? [...new Set(header.map(String))] : [];
  }
  if (Array.isArray(options.columns)) {
    return options.columns.flatMap((column: unknown) => {
      if (typeof column === "string") {
        return [column];
      }
      if (typeof column === "object" && column !== null && "name" in column) {
        return typeof column.name === "string" ? [column.name] : [];
      }
      return [];
    });
  }
  return [];
}

function parseRows(csvData: string, csvSpec: CsvTableSpec): ParsedCsv {
  const {
    cast = true,
    trim = true,
    columns = true,
    skip_empty_lines = true,
    bom = true,
    ...extraOptions
  } = renameCsvOptions(csvSpec.csvOptions ?? {});
  const options: CsvParseOptions = {
    cast,
    trim,
    columns,
    skip_empty_lines,
    bom,
    ...extraOptions,
  };
  // csv-parse's sync `parse` is typed as returning `any`.
  const records: unknown = parseCsv(csvData, options);
  if (!Array.isArray(records)) {
    throw new Error("Expected the CSV parser to return a list of records.");
  }
  const rows = records.map(toRow);
  const headerColumns = parseHeaderColumns(csvData, options);
  return {
    rows,
    columns:
      headerColumns.length > 0 ? headerColumns : Object.keys(rows[0] ?? {}),
  };
}

export function getFilteredCsvData(
  csvSpec: CsvTableSpec,
  csvData: string
): CsvTableData {
  const { rows: parsedCsvData, columns: rowColumns } = parseRows(
    csvData,
    csvSpec
  );
  const columnNames: string[] = [];

  try {
    for (const column of csvSpec.columns ?? rowColumns) {
      const columnInfo = getColumnInfo(column);

      // Do not attempt to compile/set the expression value
      // if it already exists in our known row columns
      if (!rowColumns.includes(columnInfo.name)) {
        const expression = compileRowExpression(columnInfo.expression);
        for (const row of parsedCsvData) {
          row[columnInfo.name] = evaluateExpression(
            row,
            expression,
            csvSpec.columnVariables
          );
        }
      }

      columnNames.push(columnInfo.name);
    }
  } catch (e) {
    throw new Error(`Error evaluating column expressions: ${errorMessage(e)}.`);
  }

  let filteredRows: CsvRow[] = [];
  try {
    filteredRows = applyRowFilters(
      getArrayForArrayOrObject<string>(csvSpec.filter),
      parsedCsvData,
      csvSpec.columnVariables
    );
  } catch (e) {
    throw new Error(`Error evaluating filter expressions: ${errorMessage(e)}.`);
  }

  let filteredSortedCsvData: CsvRow[] = [];
  try {
    const sortExpressions = getArrayForArrayOrObject<
      string | ExtendedSortExpression
    >(csvSpec.sortBy).map(getSortExpression);
    filteredSortedCsvData = sortRows(
      sortExpressions,
      filteredRows,
      csvSpec.columnVariables
    ).slice(0, csvSpec.maxRows ?? Infinity);
  } catch (e) {
    throw new Error(`Error evaluating sort expressions: ${errorMessage(e)}.`);
  }

  return {
    columns: columnNames,
    rows: filteredSortedCsvData,
  };
}
