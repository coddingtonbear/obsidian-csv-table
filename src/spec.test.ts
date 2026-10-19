import { describe, test, expect } from "vitest";

import { parseTableSpec } from "./spec";

describe("spec/parseTableSpec", () => {
  test("parses a minimal spec", () => {
    expect(parseTableSpec("source: countries.csv")).toEqual({
      source: "countries.csv",
    });
  });

  test("parses every option", () => {
    const spec = parseTableSpec(`
source: countries.csv
csvOptions:
  delimiter: ";"
columns:
- name
- expression: population / 1000000
  name: Population (Millions)
columnVariables:
  poblacion: population
filter:
- population > 1
- name == "Colombia"
maxRows: 10
sortBy:
- name
- expression: population
  reversed: true
`);
    expect(spec).toEqual({
      source: "countries.csv",
      csvOptions: { delimiter: ";" },
      columns: [
        "name",
        { expression: "population / 1000000", name: "Population (Millions)" },
      ],
      columnVariables: { poblacion: "population" },
      filter: ["population > 1", 'name == "Colombia"'],
      maxRows: 10,
      sortBy: ["name", { expression: "population", reversed: true }],
    });
  });

  test("accepts a single filter and sortBy", () => {
    expect(
      parseTableSpec("source: a.csv\nfilter: x > 1\nsortBy: x")
    ).toMatchObject({ filter: "x > 1", sortBy: "x" });
    expect(
      parseTableSpec("source: a.csv\nsortBy:\n  expression: x\n  reversed: true")
    ).toMatchObject({ sortBy: { expression: "x", reversed: true } });
  });

  test("treats a key left blank as not given", () => {
    expect(
      parseTableSpec(
        "source: a.csv\ncsvOptions:\ncolumns:\ncolumnVariables:\nfilter:\nmaxRows:\nsortBy:"
      )
    ).toEqual({ source: "a.csv" });
  });

  test("accepts a column given by name only", () => {
    expect(
      parseTableSpec("source: a.csv\ncolumns:\n- name: population")
    ).toMatchObject({
      columns: [{ name: "population", expression: "population" }],
    });
  });

  test("accepts values 1.2 read by coercion", () => {
    expect(parseTableSpec('source: a.csv\nmaxRows: "10"')).toMatchObject({
      maxRows: 10,
    });
    expect(
      parseTableSpec("source: a.csv\nsortBy:\n  expression: x\n  reversed: yes")
    ).toMatchObject({ sortBy: { expression: "x", reversed: true } });
    expect(
      parseTableSpec("source: a.csv\nsortBy:\n- expression: x\n  reversed: 0")
    ).toMatchObject({ sortBy: [{ expression: "x", reversed: false }] });
    expect(
      parseTableSpec("source: a.csv\ncolumns:\n- 2020\n- name: 2021\n  expression: 2020")
    ).toMatchObject({
      columns: ["2020", { name: "2021", expression: "2020" }],
    });
  });

  test("accepts numeric column names in columnVariables", () => {
    expect(
      parseTableSpec("source: a.csv\ncolumnVariables:\n  y: 2020\n  first: 0")
    ).toMatchObject({ columnVariables: { y: "2020", first: "0" } });
  });

  test("ignores unknown keys", () => {
    expect(parseTableSpec("source: a.csv\nsomethingElse: 1")).toEqual({
      source: "a.csv",
    });
  });

  test("requires source", () => {
    expect(() => parseTableSpec("")).toThrow(/YAML mapping/);
    expect(() => parseTableSpec("filter: x")).toThrow(
      "Parameter 'source' is required."
    );
    expect(() => parseTableSpec("source:")).toThrow(
      "Parameter 'source' is required."
    );
    expect(() => parseTableSpec("source: [a]")).toThrow(
      "Parameter 'source' must be a path."
    );
  });

  test("reports YAML that does not parse", () => {
    expect(() => parseTableSpec("source: a.csv\nfilter: [")).toThrow(
      /Could not parse CSV table spec/
    );
  });

  test("explains csvOptions written as a list", () => {
    expect(() =>
      parseTableSpec("source: a.csv\ncsvOptions:\n- delimiter: ';'")
    ).toThrow(/'csvOptions' must be a mapping/);
  });

  test("rejects malformed options", () => {
    expect(() => parseTableSpec("source: a.csv\ncolumns: name")).toThrow(
      /'columns' must be a list/
    );
    expect(() =>
      parseTableSpec("source: a.csv\ncolumns:\n- expression: x")
    ).toThrow(/'columns' must be a list/);
    expect(() =>
      parseTableSpec("source: a.csv\ncolumns:\n- name: x\n  expression: [1]")
    ).toThrow(/'columns' must be a list/);
    expect(() => parseTableSpec("source: a.csv\ncolumns:\n- [x]")).toThrow(
      /'columns' must be a list/
    );
    expect(() =>
      parseTableSpec("source: a.csv\ncolumnVariables:\n- a")
    ).toThrow(/'columnVariables' must be a mapping/);
    expect(() =>
      parseTableSpec("source: a.csv\ncolumnVariables:\n  a: [1]")
    ).toThrow(/'columnVariables' must be a mapping/);
    expect(() => parseTableSpec("source: a.csv\nfilter:\n  a: 1")).toThrow(
      /'filter' must be an expression/
    );
    expect(() => parseTableSpec("source: a.csv\nmaxRows: ten")).toThrow(
      /'maxRows' must be a whole number/
    );
    expect(() => parseTableSpec("source: a.csv\nmaxRows: 1.5")).toThrow(
      /'maxRows' must be a whole number/
    );
    expect(() => parseTableSpec("source: a.csv\nmaxRows: -1")).toThrow(
      /'maxRows' must be a whole number/
    );
    expect(() => parseTableSpec("source: a.csv\nsortBy:\n  reversed: true")).toThrow(
      /'sortBy' must be an expression/
    );
  });
});
