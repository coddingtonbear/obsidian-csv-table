import { compileRowExpression, RowExpression } from "./expression";
import { CsvRow, ExtendedSortExpression, NamedColumn } from "./types";

/** Returns the rows among the first `maxRows` that pass every filter, in
 * their original order. */
export function applyRowFilters(
  filters: string[],
  maxRows: number = Infinity,
  rows: CsvRow[],
  columnVariables?: Record<string, string>
): CsvRow[] {
  const expressions = filters.map(compileRowExpression);
  const filteredRows: CsvRow[] = [];

  let rowIndex = 1;
  for (const row of rows) {
    if (rowIndex > maxRows) {
      break;
    }
    rowIndex += 1;
    const passesTests = expressions.every((expression) =>
      Boolean(evaluateExpression(row, expression, columnVariables))
    );
    if (passesTests) {
      filteredRows.push(row);
    }
  }
  return filteredRows;
}

/** Orders two cell values as JavaScript's `<` and `>` would: text with
 * text alphabetically, everything else numerically (dates by instant). */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const x = Number(a);
  const y = Number(b);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    return 0;
  }
  return Math.sign(x - y);
}

/** Sorts rows by each expression in rank order: the first expression is the
 * primary key, the second breaks its ties, and so on. */
export function sortRows(
  sortExpressions: ExtendedSortExpression[],
  rows: CsvRow[],
  columnVariables?: Record<string, string>
): CsvRow[] {
  const compiled = sortExpressions.map((sortExpression) => ({
    reversed: sortExpression.reversed,
    expression: compileRowExpression(sortExpression.expression),
  }));
  const keyed = rows.map((row) => ({
    row,
    keys: compiled.map(({ expression }) =>
      evaluateExpression(row, expression, columnVariables)
    ),
  }));

  // Array.prototype.sort is stable, so rows that compare equal on every key
  // keep their order in the CSV.
  keyed.sort((a, b) => {
    for (let i = 0; i < compiled.length; i++) {
      const order = compareValues(a.keys[i], b.keys[i]);
      if (order !== 0) {
        return compiled[i].reversed ? -order : order;
      }
    }
    return 0;
  });
  return keyed.map(({ row }) => row);
}

/** Evaluates an expression against a row extended with `columnVariables`:
 * each variable reads the column it names, so columns whose names aren't
 * valid identifiers can be used in expressions. */
export function evaluateExpression(
  row: CsvRow,
  expression: RowExpression,
  columnVariables?: Record<string, string>
): unknown {
  const extendedRow: CsvRow = { ...row };

  for (const [variable, columnName] of Object.entries(columnVariables ?? {})) {
    extendedRow[variable] = row[columnName];
  }

  return expression(extendedRow);
}

/** The text shown in a cell: strings as they are, anything else as JSON. */
export function getCellDisplay(row: CsvRow, columnName: string): string {
  const value = row[columnName];
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value) ?? "";
}

export function getColumnInfo(column: string | NamedColumn): NamedColumn {
  if (typeof column === "string") {
    return {
      name: column,
      expression: column,
    };
  }
  return column;
}

export function getSortExpression(
  expression: string | ExtendedSortExpression
): ExtendedSortExpression {
  if (typeof expression === "string") {
    return {
      expression: expression,
      reversed: false,
    };
  }
  return expression;
}

export function getArrayForArrayOrObject<T>(value?: T[] | T | null): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}
