import { describe, test, expect } from "vitest";

import { getFilteredCsvData } from "./csv_table";
import { CsvTableSpec, CsvTableData } from "./types";

const SAMPLE_CSV_DATA: string[][] = [
  ["country", "capitol", "population"],
  ["United States of America", '"Washington, DC"', "328200000"],
  ["Colombia", "Bogota", "50340000"],
  ["Russia", "Moscow", "144400000"],
];

function getCsvString(data: string[][]): string {
  const rows: string[] = [];

  for (const row of data) {
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

describe("csv_table/getFilteredCsvData", () => {
  test("basic", () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA);
    const tableSpec: CsvTableSpec = {
      source: "arbitrary.csv",
    };

    const actual = getFilteredCsvData(tableSpec, csvData);
    const expected: CsvTableData = {
      columns: ["country", "capitol", "population"],
      rows: [
        {
          country: "United States of America",
          capitol: "Washington, DC",
          population: 328200000,
        },
        {
          country: "Colombia",
          capitol: "Bogota",
          population: 50340000,
        },
        {
          country: "Russia",
          capitol: "Moscow",
          population: 144400000,
        },
      ],
    };

    expect(actual).toEqual(expected);
  });

  test("with simple column expressions", () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA);
    const tableSpec: CsvTableSpec = {
      source: "arbitrary.csv",
      columns: ["country", "population / 1000000"],
    };

    const actual = getFilteredCsvData(tableSpec, csvData);
    const expected: CsvTableData = {
      columns: ["country", "population / 1000000"],
      rows: [
        {
          country: "United States of America",
          capitol: "Washington, DC",
          population: 328200000,
          "population / 1000000": 328.2,
        },
        {
          country: "Colombia",
          capitol: "Bogota",
          population: 50340000,
          "population / 1000000": 50.34,
        },
        {
          country: "Russia",
          capitol: "Moscow",
          population: 144400000,
          "population / 1000000": 144.4,
        },
      ],
    };

    expect(actual).toEqual(expected);
  });

  test("with named column expressions", () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA);
    const tableSpec: CsvTableSpec = {
      source: "arbitrary.csv",
      columns: [
        "country",
        {
          name: "Population (Millions)",
          expression: "population / 1000000",
        },
      ],
    };

    const actual = getFilteredCsvData(tableSpec, csvData);
    expect(actual.columns).toEqual(["country", "Population (Millions)"]);
    expect(actual.rows.map((row) => row["Population (Millions)"])).toEqual([
      328.2, 50.34, 144.4,
    ]);
  });

  test("with column variables", () => {
    const csvData = getCsvString([
      ["Country Name", "Population"],
      ["Colombia", "50340000"],
      ["Russia", "144400000"],
    ]);
    const tableSpec: CsvTableSpec = {
      source: "arbitrary.csv",
      columnVariables: { name: "Country Name", population: "Population" },
      columns: [{ name: "Country Name", expression: "name" }, "Population"],
      filter: "population > 100000000",
      sortBy: "name",
    };

    const actual = getFilteredCsvData(tableSpec, csvData);
    expect(actual.columns).toEqual(["Country Name", "Population"]);
    expect(actual.rows.map((row) => row["Country Name"])).toEqual(["Russia"]);
  });

  test("reports a column expression that cannot be compiled", () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA);
    expect(() =>
      getFilteredCsvData(
        { source: "arbitrary.csv", columns: ["population /"] },
        csvData
      )
    ).toThrow(/Error evaluating column expressions/);
  });

  test("reports a filter that cannot be evaluated", () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA);
    expect(() =>
      getFilteredCsvData(
        { source: "arbitrary.csv", filter: "nope(population)" },
        csvData
      )
    ).toThrow(/Error evaluating filter expressions: Unknown function/);
  });

  test("filters, then sorts, then limits to maxRows", () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA);
    const tableSpec: CsvTableSpec = {
      source: "arbitrary.csv",
      filter: "population < 300000000",
      sortBy: { expression: "population", reversed: true },
      maxRows: 1,
    };

    const actual = getFilteredCsvData(tableSpec, csvData);
    expect(actual.rows.map((row) => row.country)).toEqual(["Russia"]);
  });

  test("renders an empty table for a CSV with no rows", () => {
    expect(getFilteredCsvData({ source: "a.csv" }, "")).toEqual({
      columns: [],
      rows: [],
    });
    expect(getFilteredCsvData({ source: "a.csv" }, "a,b\n")).toEqual({
      columns: [],
      rows: [],
    });
    expect(
      getFilteredCsvData({ source: "a.csv", columns: ["a", "b"] }, "a,b\n")
    ).toEqual({ columns: ["a", "b"], rows: [] });
  });

  test("passes csvOptions through to the parser", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv", csvOptions: { delimiter: ";", cast: false } },
      "a;b\n1;2\n"
    );
    expect(actual.rows).toEqual([{ a: "1", b: "2" }]);
  });

  test("keys rows by position when columns are off", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv", csvOptions: { columns: false } },
      "a,b\n1,2\n"
    );
    expect(actual.columns).toEqual(["0", "1"]);
    expect(actual.rows).toEqual([
      { "0": "a", "1": "b" },
      { "0": 1, "1": 2 },
    ]);
  });

  test("reports CSV the parser rejects", () => {
    expect(() =>
      getFilteredCsvData({ source: "a.csv" }, "a,b\n1\n")
    ).toThrow(/Invalid Record Length/);
  });
});
