import type {
  CastingDateFunction,
  InfoField,
  Options as CsvParseOptions,
} from "csv-parse";
import { parse as parseCsv } from "csv-parse/sync";

import { parseDateText } from "./dates";
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
  columns_duplicates_to_array: "group_columns_by_name",
};

/** csv-parse accepts every option in camelCase too (`castDate`); the
 * snake_case spelling is the one the defaults and renames below look for. */
function snakeCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizeCsvOptions(options: CsvParseOptions): CsvParseOptions {
  const entries = Object.entries(options).map(
    ([name, value]: [string, unknown]) => [snakeCase(name), value] as const
  );
  const given = new Set(entries.map(([name]) => name));
  const normalized: Record<string, unknown> = {};
  for (const [name, value] of entries) {
    const newName = RENAMED_CSV_OPTIONS[name];
    if (newName === undefined) {
      normalized[name] = value;
    } else if (!given.has(newName)) {
      normalized[newName] = value;
    }
  }
  return normalized;
}

interface ParsedCsv {
  rows: CsvRow[];
  /** The names rows are keyed by, known even when there are no rows. */
  columns: string[];
}

/** The names in a `columns` list given through `csvOptions`. */
function listedColumns(columns: unknown[]): string[] {
  return columns.flatMap((column: unknown) => {
    if (typeof column === "string") {
      return [column];
    }
    if (typeof column === "object" && column !== null && "name" in column) {
      return typeof column.name === "string" ? [column.name] : [];
    }
    return [];
  });
}

/** What `cast_date: true` means here: csv-parse's own reads a bare date as
 * UTC midnight, while filters and display read dates in local time, so a
 * cell `2021-10-28` would neither equal nor display as `2021-10-28`. This
 * reads every form the same way (`parseDateText`). The header line, which
 * csv-parse casts too, is left alone (csv-parse flags its cells with
 * `header`, for `columns: true` and for the function that replaces it).
 * Like csv-parse's own implementation, this returns the text untouched
 * when it isn't a date; csv-parse's `CastingDateFunction` type says `Date`
 * only, hence the assertion where it's used. */
function castDate(value: string, context: InfoField): Date | string {
  return context.header ? value : (parseDateText(value) ?? value);
}

function parseRows(csvData: string, csvSpec: CsvTableSpec): ParsedCsv {
  const {
    cast = true,
    trim = true,
    columns = true,
    skip_empty_lines = true,
    bom = true,
    cast_date = false,
    ...extraOptions
  } = normalizeCsvOptions(csvSpec.csvOptions ?? {});

  // With `columns: true`, csv-parse reads the header line itself. Passing a
  // function instead gets that line handed over -- after csv-parse's own
  // casting, so `01` arrives as the key `1` -- which is how the column
  // names are known even when there are no rows, or the first row is short
  // (`relax_column_count`). csv-parse keeps the last of two same-named
  // columns under one key, hence the Set.
  let header: string[] | undefined;
  // csv-parse types the line as text, but hands over cast values.
  const readHeader = (line: string[]): string[] => {
    header = [...new Set(line.map(String))];
    return line;
  };


  const options: CsvParseOptions = {
    cast,
    trim,
    columns: columns === true ? readHeader : columns,
    skip_empty_lines,
    bom,
    cast_date:
      cast_date === true ? (castDate as CastingDateFunction) : cast_date,
    ...extraOptions,
  };
  // csv-parse's sync `parse` is typed as returning `any`.
  const records: unknown = parseCsv(csvData, options);
  if (!Array.isArray(records)) {
    throw new Error("Expected the CSV parser to return a list of records.");
  }
  const rows = records.map(toRow);
  const listed = Array.isArray(columns) ? listedColumns(columns) : undefined;
  return {
    rows,
    columns: header ?? listed ?? Object.keys(rows[0] ?? {}),
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
