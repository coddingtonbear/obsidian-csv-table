import type { Options as CsvParseOptions } from "csv-parse";

/** One parsed CSV record, keyed by column name. With csv-parse's `cast`
 * options on (the default), a cell may be a number or a Date as well as
 * text; a column expression may store any value at all. */
export type CsvRow = Record<string, unknown>;

export interface CsvTableData {
  columns: string[];
  rows: CsvRow[];
}

/** A column given as `{ name, expression }`: the heading to show, and the
 * expression (or column name) that fills it. */
export interface NamedColumn {
  name: string;
  expression: string;
}

export interface ExtendedSortExpression {
  expression: string;
  reversed: boolean;
}

export interface CsvTableSpec {
  source: string;
  csvOptions?: CsvParseOptions;
  columns?: (NamedColumn | string)[];
  columnVariables?: Record<string, string>;
  filter?: string[] | string;
  maxRows?: number;
  sortBy?:
    | (string | ExtendedSortExpression)[]
    | string
    | ExtendedSortExpression;
}
