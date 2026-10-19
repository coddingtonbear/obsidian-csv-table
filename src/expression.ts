import { compileExpression } from "filtrex";

import { CsvRow } from "./types";

/** A compiled filtrex expression, evaluated against one row. */
export type RowExpression = (row: CsvRow) => unknown;

const DATE_ONLY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/** Reads text as the instant it names, or `undefined` if it names none.
 *
 * `Date.parse` reads a bare date (`2021-01-11`) as UTC midnight but a
 * date with a time (`2021-01-11 08:00`) in the local time zone, so a
 * filter like `start >= "2021-10-28"` would admit the previous evening's
 * cells west of UTC. Bare dates are read as local midnight instead, so
 * every form is read in the same zone. */
export function parseDateText(text: string): Date | undefined {
  const dateOnly = DATE_ONLY.exec(text);
  if (dateOnly !== null) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
      ? date
      : undefined;
  }
  const time = Date.parse(text);
  return Number.isNaN(time) ? undefined : new Date(time);
}

/** When one operand is a Date (csv-parse's `cast_date`) and the other is
 * text naming a date, returns both as Dates so they can be compared;
 * otherwise returns the operands untouched. */
function coerceDates(a: unknown, b: unknown): [unknown, unknown] {
  if (a instanceof Date && typeof b === "string") {
    return [a, parseDateText(b) ?? b];
  }
  if (typeof a === "string" && b instanceof Date) {
    return [parseDateText(a) ?? a, b];
  }
  return [a, b];
}

/** Orders two values the way filtrex 2 (plain JavaScript) did, so that the
 * number-and-text coercions existing filters rely on keep working: text
 * with text alphabetically, everything else numerically (a Date by its
 * instant), and NaN when the two can't be ordered. A Date and text naming
 * a date compare as instants. */
export function compare(left: unknown, right: unknown): number {
  const [a, b] = coerceDates(left, right);
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
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

/** filtrex 2 returned `null` for arithmetic that produced no finite number
 * (`population / 0`, `"abc" * 2`, a missing column plus one). */
function finite(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value === 0 ? 0 : value;
}

function isTextual(value: unknown): boolean {
  return typeof value === "string" || value instanceof Date;
}

/** A cell as text, for concatenation and matching. */
function asText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    value instanceof Date ||
    value === undefined ||
    value === null
  ) {
    return String(value);
  }
  return JSON.stringify(value) ?? "";
}

/** JavaScript's `+`: text concatenation if either side is text (a Date
 * stringifies, as it did), numeric addition otherwise. */
function add(a: unknown, b: unknown): unknown {
  if (isTextual(a) || isTextual(b)) {
    return asText(a) + asText(b);
  }
  return finite(Number(a) + Number(b));
}

const operators = {
  "+": add,
  "-": (a: unknown, b?: unknown) =>
    b === undefined ? finite(-Number(a)) : finite(Number(a) - Number(b)),
  "*": (a: unknown, b: unknown) => finite(Number(a) * Number(b)),
  "/": (a: unknown, b: unknown) => finite(Number(a) / Number(b)),
  "%": (a: unknown, b: unknown) => finite(Number(a) % Number(b)),
  "^": (a: unknown, b: unknown) => finite(Number(a) ** Number(b)),
  "==": equals,
  "!=": (a: unknown, b: unknown) => !equals(a, b),
  "<": (a: unknown, b: unknown) => compare(a, b) < 0,
  "<=": (a: unknown, b: unknown) => compare(a, b) <= 0,
  ">": (a: unknown, b: unknown) => compare(a, b) > 0,
  ">=": (a: unknown, b: unknown) => compare(a, b) >= 0,
  // filtrex 3 only matches text against text; cast cells are often
  // numbers (`zip ~= "^9"`), so both sides are read as text.
  "~=": (a: unknown, b: unknown) =>
    a !== undefined && a !== null && new RegExp(asText(b)).test(asText(a)),
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
 * 1.2: its arithmetic, comparison and `~=` operators reject operands of
 * the wrong type, where filtrex 2 applied JavaScript's coercions. Blank
 * cells are text, so the operators are overridden to keep the old
 * coercions (see `compare`, `add` and friends), missing columns read as
 * `undefined`, and `true`/`false` are available as constants. */
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
