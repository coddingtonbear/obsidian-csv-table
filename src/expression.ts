import { compileExpression } from "filtrex";

import { CsvRow } from "./types";

/** A compiled filtrex expression, evaluated against one row. */
export type RowExpression = (row: CsvRow) => unknown;

/** Reads text as the instant it names, for comparing with a cast Date. */
function parseDate(text: string): Date {
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Cannot read "${text}" as a date.`);
  }
  return date;
}

/** When one operand is a Date (csv-parse's `cast_date`) and the other is
 * text, returns both as instants so they can be compared; otherwise returns
 * the operands untouched. */
function coerceDates(a: unknown, b: unknown): [unknown, unknown] {
  if (a instanceof Date && typeof b === "string") {
    return [a, parseDate(b)];
  }
  if (typeof a === "string" && b instanceof Date) {
    return [parseDate(a), b];
  }
  return [a, b];
}

/** Compares two values the way filtrex 2 (plain JavaScript) did, so that
 * the number-and-text coercions existing filters rely on keep working; two
 * dates compare by instant, and a date compares with text naming a date. */
function compare(left: unknown, right: unknown): number {
  const [a, b] = coerceDates(left, right);
  if (a instanceof Date && b instanceof Date) {
    return Math.sign(a.getTime() - b.getTime());
  }
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  // Any other combination compares numerically; NaN compares as neither
  // less nor greater, as in JavaScript.
  const x = Number(a);
  const y = Number(b);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    return NaN;
  }
  return Math.sign(x - y);
}

function equals(left: unknown, right: unknown): boolean {
  const [a, b] = coerceDates(left, right);
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  // Loose equality on purpose: filtrex 2 compared with `==`, so with
  // `cast` on, `population == "50340000"` matched a numeric cell.
  return a == b;
}

const operators = {
  "==": equals,
  "!=": (a: unknown, b: unknown) => !equals(a, b),
  "<": (a: unknown, b: unknown) => compare(a, b) < 0,
  "<=": (a: unknown, b: unknown) => compare(a, b) <= 0,
  ">": (a: unknown, b: unknown) => compare(a, b) > 0,
  ">=": (a: unknown, b: unknown) => compare(a, b) >= 0,
};

/** Reads a property, treating one the row lacks as `undefined` rather than
 * as the error filtrex 3 reports by default. Rows parsed with
 * `relax_column_count` can lack trailing columns. */
function readOptionalProperty(
  name: string,
  get: (name: string) => unknown,
  row: unknown
): unknown {
  if (
    typeof row !== "object" ||
    row === null ||
    !Object.prototype.hasOwnProperty.call(row, name)
  ) {
    return undefined;
  }
  return get(name);
}

/** Compiles a filtrex expression for use in `columns`, `filter` and
 * `sortBy`. Syntax errors throw here; runtime errors (an unknown function,
 * `and`/`or`/`not` applied to a non-boolean) throw when the expression is
 * evaluated, so the table shows them rather than silently treating the
 * error object as a value.
 *
 * filtrex 3 is stricter than the filtrex 2 this plugin used until version
 * 1.2: comparison operators are overridden to keep the old coercions (see
 * `compare`), missing columns read as `undefined`, and `true`/`false` are
 * available as constants. */
export function compileRowExpression(expression: string): RowExpression {
  const compiled = compileExpression(expression, {
    customProp: readOptionalProperty,
    operators,
    constants: { true: true, false: false },
  });
  return (row: CsvRow): unknown => {
    const result: unknown = compiled(row);
    if (result instanceof Error) {
      throw result;
    }
    return result;
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
