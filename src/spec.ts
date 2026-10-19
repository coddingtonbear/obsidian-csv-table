import { parseYaml } from "obsidian";

import { errorMessage } from "./expression";
import { CsvTableSpec, ExtendedSortExpression, NamedColumn } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A column name may be written as a number (`year: 2020`, or a position
 * when `columns` is off); row keys are text, so the name is read as text. */
function toColumnVariables(
  value: Record<string, unknown>
): Record<string, string> | undefined {
  const variables: Record<string, string> = {};
  for (const [name, columnName] of Object.entries(value)) {
    if (typeof columnName === "string") {
      variables[name] = columnName;
    } else if (typeof columnName === "number") {
      variables[name] = String(columnName);
    } else {
      return undefined;
    }
  }
  return variables;
}

/** `{ name }` alone names an existing column, as it did in 1.2. */
function toNamedColumn(value: unknown): NamedColumn | undefined {
  if (!isRecord(value) || typeof value.name !== "string") {
    return undefined;
  }
  if (value.expression === undefined || value.expression === null) {
    return { name: value.name, expression: value.name };
  }
  return typeof value.expression === "string"
    ? { name: value.name, expression: value.expression }
    : undefined;
}

function isSortExpression(value: unknown): value is ExtendedSortExpression {
  return (
    isRecord(value) &&
    typeof value.expression === "string" &&
    (value.reversed === undefined || typeof value.reversed === "boolean")
  );
}

function isListOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(isItem);
}

const isString = (value: unknown): value is string => typeof value === "string";

/** Parses and validates a `csvtable` code block. Unknown keys are ignored,
 * and so is a key left blank (YAML `null`); a known key of the wrong shape
 * is an error naming the key, since the commonest mistake is writing a
 * mapping as a list (`csvOptions:\n- delimiter: ;`). */
export function parseTableSpec(text: string): CsvTableSpec {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (e) {
    throw new Error(`Could not parse CSV table spec: ${errorMessage(e)}`);
  }
  if (!isRecord(parsed)) {
    throw new Error("The CSV table spec must be a YAML mapping.");
  }

  // A key left blank (`filter:`) parses as null and means "not given".
  const given = (name: string): unknown =>
    parsed[name] === null ? undefined : parsed[name];
  const source = given("source");
  const csvOptions = given("csvOptions");
  const columns = given("columns");
  const columnVariables = given("columnVariables");
  const filter = given("filter");
  const maxRows = given("maxRows");
  const sortBy = given("sortBy");

  if (source === undefined || source === "") {
    throw new Error("Parameter 'source' is required.");
  }
  if (typeof source !== "string") {
    throw new Error("Parameter 'source' must be a path.");
  }
  const spec: CsvTableSpec = { source };

  if (csvOptions !== undefined) {
    if (!isRecord(csvOptions)) {
      throw new Error(
        "Parameter 'csvOptions' must be a mapping of csv-parse option names to values."
      );
    }
    spec.csvOptions = csvOptions;
  }
  if (columns !== undefined) {
    const named = Array.isArray(columns)
      ? columns.map((item: unknown) =>
          isString(item) ? item : toNamedColumn(item)
        )
      : undefined;
    if (named === undefined || named.some((item) => item === undefined)) {
      throw new Error(
        "Parameter 'columns' must be a list of column names, expressions, or {name, expression} mappings."
      );
    }
    spec.columns = named as (string | NamedColumn)[];
  }
  if (columnVariables !== undefined) {
    const variables = isRecord(columnVariables)
      ? toColumnVariables(columnVariables)
      : undefined;
    if (variables === undefined) {
      throw new Error(
        "Parameter 'columnVariables' must be a mapping of variable names to column names."
      );
    }
    spec.columnVariables = variables;
  }
  if (filter !== undefined) {
    if (!isString(filter) && !isListOf(filter, isString)) {
      throw new Error(
        "Parameter 'filter' must be an expression or a list of expressions."
      );
    }
    spec.filter = filter;
  }
  if (maxRows !== undefined) {
    if (typeof maxRows !== "number" || !Number.isInteger(maxRows) || maxRows < 0) {
      throw new Error("Parameter 'maxRows' must be a whole number.");
    }
    spec.maxRows = maxRows;
  }
  if (sortBy !== undefined) {
    const isSortItem = (item: unknown): item is string | ExtendedSortExpression =>
      isString(item) || isSortExpression(item);
    if (!isSortItem(sortBy) && !isListOf(sortBy, isSortItem)) {
      throw new Error(
        "Parameter 'sortBy' must be an expression, a {expression, reversed} mapping, or a list of them."
      );
    }
    spec.sortBy = sortBy;
  }
  return spec;
}
