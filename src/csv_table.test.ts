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

  test("ignores a byte order mark", () => {
    const actual = getFilteredCsvData({ source: "a.csv" }, "\ufeffa,b\n1,2\n");
    expect(actual.columns).toEqual(["a", "b"]);
    expect(actual.rows).toEqual([{ a: 1, b: 2 }]);
  });

  test("casts dates so filters can compare them", () => {
    const csvData = getCsvString([
      ["Subject", "start"],
      ["meeting 1", "2021-01-11 08:00"],
      ["meeting 5", "2021-10-28 12:00"],
    ]);
    const actual = getFilteredCsvData(
      { source: "a.csv", filter: 'start >= "2021-10-28"' },
      csvData
    );
    expect(actual.rows.map((row) => row.Subject)).toEqual(["meeting 5"]);
    expect(actual.rows[0].start).toBeInstanceOf(Date);
  });

  test("casts only cells that look like dates, read in local time", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv" },
      getCsvString([
        ["text", "iso", "us", "other", "2021-01-01"],
        ["meeting 5", "2021-01-11", "01/11/2021", "11.01.2021", "March"],
        ["1 Jan", "2021-01-11T08:00:00Z", "1/2", "Room 2", "x"],
        ["10-20", "2021-01-11 08:00", "2021/01/11", "1.2.3", "2021-13-45"],
      ])
    );
    expect(actual.columns).toEqual(["text", "iso", "us", "other", "2021-01-01"]);
    const [first, second, third] = actual.rows;
    expect(first.text).toBe("meeting 5");
    expect(first.iso).toEqual(new Date(2021, 0, 11));
    expect(first.us).toEqual(new Date(2021, 0, 11));
    expect(first.other).toBe("11.01.2021");
    expect(first["2021-01-01"]).toBe("March");
    expect(second.text).toBe("1 Jan");
    expect(second.iso).toEqual(new Date("2021-01-11T08:00:00Z"));
    expect(second.us).toBe("1/2");
    expect(second.other).toBe("Room 2");
    expect(third.text).toBe("10-20");
    expect(third.iso).toEqual(new Date(2021, 0, 11, 8, 0));
    expect(third.us).toEqual(new Date(2021, 0, 11));
    expect(third.other).toBe("1.2.3");
    expect(third["2021-01-01"]).toBe("2021-13-45");
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

  test("renders an empty table for a header-only CSV with named columns", () => {
    expect(
      getFilteredCsvData(
        { source: "a.csv", columns: ["Country Name", "population / 1000000"] },
        "Country Name,population\n"
      )
    ).toEqual({ columns: ["Country Name", "population / 1000000"], rows: [] });
  });

  test("lets csvOptions choose csv-parse's own date casting", () => {
    const csv = "a\nmeeting 5\n";
    expect(
      getFilteredCsvData({ source: "a.csv", csvOptions: { cast_date: true } }, csv)
        .rows[0].a
    ).toBeInstanceOf(Date);
    expect(
      getFilteredCsvData({ source: "a.csv", csvOptions: { cast_date: false } }, "a\n2021-01-11\n")
        .rows[0].a
    ).toBe("2021-01-11");
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
