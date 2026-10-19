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

function parseRows(csvData: string, csvSpec: CsvTableSpec): CsvRow[] {
  const {
    cast = true,
    cast_date = true,
    trim = true,
    columns = true,
    skip_empty_lines = true,
    ...extraOptions
  } = csvSpec.csvOptions ?? {};
  // csv-parse's sync `parse` is typed as returning `any`.
  const records: unknown = parseCsv(csvData, {
    cast,
    cast_date,
    trim,
    columns,
    skip_empty_lines,
    ...extraOptions,
  });
  if (!Array.isArray(records)) {
    throw new Error("Expected the CSV parser to return a list of records.");
  }
  return records.map(toRow);
}

export function getFilteredCsvData(
  csvSpec: CsvTableSpec,
  csvData: string
): CsvTableData {
  const parsedCsvData = parseRows(csvData, csvSpec);
  const columnNames: string[] = [];
  const rowColumns: string[] =
    parsedCsvData.length > 0 ? Object.keys(parsedCsvData[0]) : [];

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

  let filteredSortedCsvData: CsvRow[] = [];
  try {
    const sortExpressions = getArrayForArrayOrObject<
      string | ExtendedSortExpression
    >(csvSpec.sortBy).map(getSortExpression);
    const filteredRows = applyRowFilters(
      getArrayForArrayOrObject<string>(csvSpec.filter),
      csvSpec.maxRows ?? Infinity,
      parsedCsvData,
      csvSpec.columnVariables
    );
    filteredSortedCsvData = sortRows(
      sortExpressions,
      filteredRows,
      csvSpec.columnVariables
    );
  } catch (e) {
    throw new Error(`Error evaluating filter expressions: ${errorMessage(e)}.`);
  }

  return {
    columns: columnNames,
    rows: filteredSortedCsvData,
  };
}
