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
      columns: ["a", "b"],
      rows: [],
    });
    expect(
      getFilteredCsvData(
        { source: "a.csv", csvOptions: { columns: ["x", { name: "y" }] } },
        ""
      )
    ).toEqual({ columns: ["x", "y"], rows: [] });
    expect(
      getFilteredCsvData({ source: "a.csv", columns: ["a", "b"] }, "a,b\n")
    ).toEqual({ columns: ["a", "b"], rows: [] });
  });

  test("ignores a byte order mark", () => {
    const actual = getFilteredCsvData({ source: "a.csv" }, "\ufeffa,b\n1,2\n");
    expect(actual.columns).toEqual(["a", "b"]);
    expect(actual.rows).toEqual([{ a: 1, b: 2 }]);
  });

  test("maps csv-parse 4 option names onto their csv-parse 5 names", () => {
    expect(
      getFilteredCsvData(
        { source: "a.csv", csvOptions: { relax: true } },
        'a,b\n1,x"y\n'
      ).rows
    ).toEqual([{ a: 1, b: 'x"y' }]);
    expect(
      getFilteredCsvData(
        { source: "a.csv", csvOptions: { skip_lines_with_empty_values: true } },
        "a,b\n1,2\n,\n3,4\n"
      ).rows
    ).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  test("lets the current csv-parse option name win over the old one", () => {
    for (const csvOptions of [
      { relax: false, relax_quotes: true },
      { relax_quotes: true, relax: false },
    ]) {
      expect(
        getFilteredCsvData({ source: "a.csv", csvOptions }, 'a,b\n1,x"y\n').rows
      ).toEqual([{ a: 1, b: 'x"y' }]);
    }
    expect(
      getFilteredCsvData(
        { source: "a.csv", csvOptions: { skip_lines_with_error: true } },
        'a,b\n1,x"y\n2,3\n'
      ).rows
    ).toEqual([{ a: 2, b: 3 }]);
  });

  test("still reports a broken column expression on a header-only CSV", () => {
    expect(() =>
      getFilteredCsvData(
        { source: "a.csv", columns: ["population /"] },
        "population\n"
      )
    ).toThrow(/Error evaluating column expressions/);
  });

  test("renders an empty table for a header-only CSV with named columns", () => {
    expect(
      getFilteredCsvData(
        { source: "a.csv", columns: ["Country Name", "population / 1000000"] },
        "Country Name,population\n"
      )
    ).toEqual({ columns: ["Country Name", "population / 1000000"], rows: [] });
  });

  test("keeps dates as text unless csvOptions asks for date casting", () => {
    const csvData = getCsvString([
      ["Subject", "start"],
      ["Standup", "2021-01-11 08:00"],
      ["Retro", "2021-10-28 12:00"],
    ]);
    const asText = getFilteredCsvData(
      { source: "a.csv", filter: 'start >= "2021-10-28"' },
      csvData
    );
    expect(asText.rows.map((row) => row.start)).toEqual(["2021-10-28 12:00"]);

    const asDates = getFilteredCsvData(
      {
        source: "a.csv",
        filter: 'start >= "2021-10-28"',
        csvOptions: { cast_date: true },
      },
      csvData
    );
    expect(asDates.rows.map((row) => row.Subject)).toEqual(["Retro"]);
    expect(asDates.rows[0].start).toEqual(new Date(2021, 9, 28, 12, 0));
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
