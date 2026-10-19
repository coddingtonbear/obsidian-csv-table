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

  test("with non-variable-safe column names", () => {
    const csvData = getCsvString([
      ["1st", "2nd"],
      ["alpha", "1"],
      ["beta", "2"],
    ]);
    const tableSpec: CsvTableSpec = {
      source: "arbitrary.csv",
      columns: ["1st", "2nd"],
    };

    const actual = getFilteredCsvData(tableSpec, csvData);
    const expected: CsvTableData = {
      columns: ["1st", "2nd"],
      rows: [
        {
          "1st": "alpha",
          "2nd": 1,
        },
        {
          "1st": "beta",
          "2nd": 2,
        },
      ],
    };

    expect(actual).toEqual(expected);
  });

  test("displays a comparison column as true or false", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv", columns: ["country", "population > 100000000"] },
      getCsvString(SAMPLE_CSV_DATA)
    );
    expect(actual.rows.map((row) => row["population > 100000000"])).toEqual([
      true,
      false,
      true,
    ]);
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

  test("reports a sort expression that cannot be compiled", () => {
    expect(() =>
      getFilteredCsvData(
        { source: "arbitrary.csv", sortBy: "population +" },
        getCsvString(SAMPLE_CSV_DATA)
      )
    ).toThrow(/Error evaluating sort expressions/);
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

  test("with cast_date, reads bare dates in local time and leaves the header alone", () => {
    const tz = process.env.TZ;
    try {
      process.env.TZ = "America/Los_Angeles";
      const actual = getFilteredCsvData(
        {
          source: "a.csv",
          csvOptions: { cast_date: true },
          filter: 'd >= "2021-10-28" and d == "2021-10-28"',
        },
        "Jan 2021,d\nx,2021-10-28\ny,2021-10-27\n"
      );
      expect(actual.columns).toEqual(["Jan 2021", "d"]);
      expect(actual.rows).toEqual([{ "Jan 2021": "x", d: new Date(2021, 9, 28) }]);
    } finally {
      if (tz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = tz;
      }
    }
  });

  test("keys numeric-looking header names the way csv-parse casts them", () => {
    const actual = getFilteredCsvData({ source: "a.csv" }, "01,02\n1,2\n");
    expect(actual.columns).toEqual(["1", "2"]);
    expect(actual.rows).toEqual([{ "1": 1, "2": 2 }]);
    const uncast = getFilteredCsvData(
      { source: "a.csv", csvOptions: { cast: false } },
      "01,02\n1,2\n"
    );
    expect(uncast.columns).toEqual(["01", "02"]);
    expect(uncast.rows).toEqual([{ "01": "1", "02": "2" }]);
  });

  test("groups same-named columns when asked, under either option name", () => {
    for (const csvOptions of [
      { group_columns_by_name: true },
      { columns_duplicates_to_array: true },
    ]) {
      const actual = getFilteredCsvData(
        { source: "a.csv", csvOptions },
        "a,a\n1,2\n"
      );
      expect(actual.columns).toEqual(["a"]);
      expect(actual.rows).toEqual([{ a: [1, 2] }]);
    }
  });

  test("sorts by a column named with a number", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv", sortBy: { expression: "'2020'", reversed: false } },
      "name,2020\nb,5\na,1\nc,3\n"
    );
    expect(actual.rows.map((row) => row.name)).toEqual(["a", "c", "b"]);
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

  test("takes column names from the header when the first row is short", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv", csvOptions: { relax_column_count: true } },
      "a,b,c\n1\n4,5,6\n"
    );
    expect(actual.columns).toEqual(["a", "b", "c"]);
    expect(actual.rows).toEqual([{ a: 1 }, { a: 4, b: 5, c: 6 }]);
  });

  test("keeps the header when csvOptions skip records", () => {
    const actual = getFilteredCsvData(
      { source: "a.csv", csvOptions: { from: 2 } },
      "a,b\n1,2\n"
    );
    expect(actual).toEqual({ columns: ["a", "b"], rows: [] });
  });

  test("reports CSV the parser rejects", () => {
    expect(() =>
      getFilteredCsvData({ source: "a.csv" }, "a,b\n1\n")
    ).toThrow(/Invalid Record Length/);
  });
});
