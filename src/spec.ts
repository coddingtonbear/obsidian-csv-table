import { parseYaml } from "obsidian";

import { errorMessage } from "./expression";
import { CsvTableSpec, ExtendedSortExpression, NamedColumn } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) && Object.values(value).every((v) => typeof v === "string")
  );
}

function isNamedColumn(value: unknown): value is NamedColumn {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.expression === "string"
  );
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

/** Parses and validates a `csvtable` code block. Unknown keys are ignored;
 * a known key of the wrong shape is an error naming the key, since the
 * commonest mistake is writing a mapping as a list (`csvOptions:\n- delimiter: ;`). */
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

  const {
    source,
    csvOptions,
    columns,
    columnVariables,
    filter,
    maxRows,
    sortBy,
  } = parsed;

  if (source === undefined || source === null || source === "") {
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
    if (
      !isListOf(
        columns,
        (item): item is string | NamedColumn =>
          isString(item) || isNamedColumn(item)
      )
    ) {
      throw new Error(
        "Parameter 'columns' must be a list of column names, expressions, or {name, expression} mappings."
      );
    }
    spec.columns = columns;
  }
  if (columnVariables !== undefined) {
    if (!isStringRecord(columnVariables)) {
      throw new Error(
        "Parameter 'columnVariables' must be a mapping of variable names to column names."
      );
    }
    spec.columnVariables = columnVariables;
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
