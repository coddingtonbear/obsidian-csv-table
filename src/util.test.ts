import { describe, test, expect } from "vitest";

import { compileRowExpression } from "./expression";
import { CsvRow, NamedColumn } from "./types";
import {
  applyRowFilters,
  evaluateExpression,
  formatDate,
  getColumnInfo,
  getCellDisplay,
  sortRows,
  getSortExpression,
  getArrayForArrayOrObject,
} from "./util";

const EXAMPLE_ROWS: CsvRow[] = [
  {
    name: "United States of America",
    capitol: "Washington, DC",
    population: 328200000,
  },
  {
    name: "Colombia",
    capitol: "Bogota",
    population: 50340000,
  },
  {
    name: "Russia",
    capitol: "Moscow",
    population: 144400000,
  },
];

describe("util/applyRowFilters", () => {
  test("If no filters, all rows are returned", () => {
    const finalRows = applyRowFilters([], Infinity, EXAMPLE_ROWS, {});

    expect(finalRows).toEqual(EXAMPLE_ROWS);
  });

  test("Limits count of rows to specified limit", () => {
    const finalRows = applyRowFilters([], 1, EXAMPLE_ROWS, {});

    // The first one should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[0]]);
  });

  test("Counts the limit against rows that pass the filters", () => {
    const finalRows = applyRowFilters(
      ["population < 300000000"],
      1,
      EXAMPLE_ROWS,
      {}
    );

    expect(finalRows).toEqual([EXAMPLE_ROWS[1]]);
  });

  test("Applies single row filter as expression", () => {
    const finalRows = applyRowFilters(
      ["population < 100000000"],
      Infinity,
      EXAMPLE_ROWS,
      {}
    );

    // Colombia should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[1]]);
  });

  test("Applies multiple row filters as anded expression", () => {
    const finalRows = applyRowFilters(
      ["population < 300000000", 'capitol == "Moscow"'],
      Infinity,
      EXAMPLE_ROWS,
      {}
    );

    // Russia should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[2]]);
  });

  test("Applies column variable transformations", () => {
    const finalRows = applyRowFilters(
      ["poblacion < 100000000"],
      Infinity,
      EXAMPLE_ROWS,
      {
        poblacion: "population",
      }
    );

    // Colombia should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[1]]);
  });

  test("Reports a runtime error instead of matching every row", () => {
    expect(() =>
      applyRowFilters(["unknownFunction(population)"], Infinity, EXAMPLE_ROWS)
    ).toThrow(/Unknown function/);
  });
});

describe("util/sortRows", () => {
  test("Sorts rows using column name", () => {
    const result = sortRows(
      [
        {
          expression: "population",
          reversed: false,
        },
      ],
      EXAMPLE_ROWS
    );

    expect(result.map((row) => row.name)).toEqual([
      "Colombia",
      "Russia",
      "United States of America",
    ]);
  });

  test("Sorts rows using column name, reversed", () => {
    const result = sortRows(
      [
        {
          expression: "population",
          reversed: true,
        },
      ],
      EXAMPLE_ROWS
    );

    expect(result.map((row) => row.name)).toEqual([
      "United States of America",
      "Russia",
      "Colombia",
    ]);
  });

  test("Sorts rows when using an expression", () => {
    const result = sortRows(
      [
        {
          expression: "population * 10",
          reversed: false,
        },
      ],
      EXAMPLE_ROWS
    );

    expect(result.map((row) => row.name)).toEqual([
      "Colombia",
      "Russia",
      "United States of America",
    ]);
  });

  test("Sorts upon multiple expressions", () => {
    const sortExpressions = [
      {
        expression: "numeric",
        reversed: false,
      },
      {
        expression: "alpha",
        reversed: false,
      },
    ];
    const result = sortRows(sortExpressions, [
      {
        alpha: "b",
        numeric: 4,
      },
      {
        alpha: "a",
        numeric: 10,
      },
      {
        alpha: "a",
        numeric: 4,
      },
    ]);

    expect(result).toEqual([
      {
        alpha: "a",
        numeric: 4,
      },
      {
        alpha: "b",
        numeric: 4,
      },
      {
        alpha: "a",
        numeric: 10,
      },
    ]);
    // The caller's list of sort expressions is left as it was.
    expect(sortExpressions.map((s) => s.expression)).toEqual([
      "numeric",
      "alpha",
    ]);
  });

  test("Sorts text alphabetically and dates by instant", () => {
    const rows: CsvRow[] = [
      { name: "b", when: new Date("2021-03-01") },
      { name: "a", when: new Date("2021-01-01") },
      { name: "c", when: new Date("2021-02-01") },
    ];
    expect(
      sortRows([{ expression: "name", reversed: false }], rows).map(
        (row) => row.name
      )
    ).toEqual(["a", "b", "c"]);
    expect(
      sortRows([{ expression: "when", reversed: false }], rows).map(
        (row) => row.name
      )
    ).toEqual(["a", "c", "b"]);
  });

  test("Keeps CSV order for rows whose keys are equal", () => {
    const rows: CsvRow[] = [
      { name: "first", group: 1 },
      { name: "second", group: 1 },
      { name: "third", group: 0 },
    ];
    expect(
      sortRows([{ expression: "group", reversed: false }], rows).map(
        (row) => row.name
      )
    ).toEqual(["third", "first", "second"]);
  });

  test("Orders a date against text naming a date, as filters do", () => {
    const rows: CsvRow[] = [
      { name: "b", when: new Date(2021, 2, 1) },
      { name: "a", when: "2021-01-01" },
      { name: "c", when: new Date(2021, 1, 1) },
    ];
    expect(
      sortRows([{ expression: "when", reversed: false }], rows).map(
        (row) => row.name
      )
    ).toEqual(["a", "c", "b"]);
  });

  test("Does not reorder the caller's rows", () => {
    const rows = [...EXAMPLE_ROWS];
    sortRows([{ expression: "population", reversed: false }], rows);
    expect(rows).toEqual(EXAMPLE_ROWS);
  });
});

describe("util/evaluateExpression", () => {
  test("Evaluates simple expression", () => {
    const expression = compileRowExpression("value * 100");

    const row = {
      value: 100,
    };
    const value = evaluateExpression(row, expression, {});

    expect(value).toEqual(row.value * 100);
  });

  test("Performs columnVariable transformations", () => {
    const expression = compileRowExpression("myvar");

    const row = {
      "Some string field name": 100,
    };
    const columnVariables = {
      myvar: "Some string field name",
    };
    const value = evaluateExpression(row, expression, columnVariables);

    expect(value).toEqual(row["Some string field name"]);
  });
});

describe("util/getCellDisplay", () => {
  test("Fetches string cell display", () => {
    const row = {
      value: "Some value",
    };
    const display = getCellDisplay(row, "value");

    expect(display).toEqual(row.value);
  });

  test("JSON-encodes non-string cell display", () => {
    const row = {
      value: { arbitrary: 100 },
    };
    const display = getCellDisplay(row, "value");

    expect(display).toEqual(JSON.stringify(row.value));
  });

  test("Shows nothing for a missing cell", () => {
    expect(getCellDisplay({}, "value")).toEqual("");
  });

  test("Shows a date as the CSV wrote it", () => {
    expect(getCellDisplay({ d: new Date(2021, 0, 11) }, "d")).toEqual(
      "2021-01-11"
    );
    expect(getCellDisplay({ d: new Date(2021, 0, 11, 8, 0) }, "d")).toEqual(
      "2021-01-11 08:00"
    );
  });
});

describe("util/formatDate", () => {
  test("writes local dates and times", () => {
    expect(formatDate(new Date(2021, 0, 11))).toEqual("2021-01-11");
    expect(formatDate(new Date(2021, 11, 1, 8, 5))).toEqual("2021-12-01 08:05");
    expect(formatDate(new Date(2021, 0, 11, 8, 0, 30))).toEqual(
      "2021-01-11 08:00:30"
    );
    expect(formatDate(new Date(2021, 0, 11, 0, 0, 0, 5))).toEqual(
      "2021-01-11 00:00:00"
    );
    expect(formatDate(new Date(NaN))).toEqual("Invalid Date");
  });
});

describe("util/getColumnInfo", () => {
  test("Parses column having string name", () => {
    const arbitraryColumnName = "my_column";
    const columnInfo = getColumnInfo(arbitraryColumnName);

    expect(columnInfo).toEqual({
      name: arbitraryColumnName,
      expression: arbitraryColumnName,
    });
  });

  test("Parses column having defined name", () => {
    const providedColumnInfo: NamedColumn = {
      name: "Something",
      expression: "my_column",
    };
    const columnInfo = getColumnInfo(providedColumnInfo);

    expect(columnInfo).toEqual(providedColumnInfo);
  });
});

describe("util/getSortExpression", () => {
  test("Parses string sort expression", () => {
    const expression = "beep";
    const parsed = getSortExpression(expression);

    expect(parsed).toEqual({
      expression,
      reversed: false,
    });
  });

  test("Parses extended sort expression", () => {
    const expression = {
      expression: "beep",
      reversed: true,
    };
    const parsed = getSortExpression(expression);

    expect(parsed).toEqual(expression);
  });
});

describe("util/getArrayForArrayOrObject", () => {
  test("Returns empty array for null", () => {
    const value: null = null;
    const actual = getArrayForArrayOrObject<string>(value);

    expect(actual).toEqual([]);
  });

  test("Returns empty array for undefined", () => {
    const value: undefined = undefined;
    const actual = getArrayForArrayOrObject(value);

    expect(actual).toEqual([]);
  });

  test("Returns original array for array", () => {
    const value: string[] = ["beep"];
    const actual = getArrayForArrayOrObject<string>(value);

    expect(actual).toEqual(value);
  });

  test("Returns array of single item if single item", () => {
    const value: string = "beep";
    const actual = getArrayForArrayOrObject<string>(value);

    expect(actual).toEqual([value]);
  });
});
