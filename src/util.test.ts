import { compileExpression } from 'filtrex'

import { applyRowFilters, evaluateExpression, getColumnInfo, getCellDisplay, ColumnInfo, sortRows, getSortExpression, getArrayForArrayOrObject } from './util'

const EXAMPLE_ROWS: Record<string, any>[] = [
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
  }
]

describe('util/applyRowFilters', () => {
  test('If no filters, all rows are returned', () => {
    const finalRows = applyRowFilters(
      [],
      Infinity,
      EXAMPLE_ROWS,
      {}
    )

    expect(finalRows).toEqual(EXAMPLE_ROWS)
  })

  test('Limits count of rows to specified limit', () => {
    const finalRows = applyRowFilters(
      [],
      1,
      EXAMPLE_ROWS,
      {}
    )

    // The first one should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[0]])
  })

  test('Applies single row filter as expression', () => {
    const finalRows = applyRowFilters(
      [
        "population < 100000000"
      ],
      Infinity,
      EXAMPLE_ROWS,
      {}
    )

    // Colombia should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[1]])
  })

  test('Applies multiple row filters as anded expression', () => {
    const finalRows = applyRowFilters(
      [
        "population < 300000000",
        "capitol == \"Moscow\"",
      ],
      Infinity,
      EXAMPLE_ROWS,
      {}
    )

    // Russia should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[2]])
  })

  test('Applies row filters using columnVariables as expressions', () => {
    const finalRows = applyRowFilters(
      [
        "poblacion < 100000000"
      ],
      Infinity,
      EXAMPLE_ROWS,
      {
        poblacion: "population"
      }
    )

    // Colombia should be the only result
    expect(finalRows).toEqual([EXAMPLE_ROWS[1]])
  })
})

describe("util/sortRows", () => {
  test("Sorts rows using column name", () => {
    const result = sortRows(
      [
        {
          expression: 'population',
          reversed: false,
        }
      ],
      EXAMPLE_ROWS
    )

    expect(result.map((row) => row.name)).toEqual([
      "Colombia",
      "Russia",
      "United States of America",
    ])
  })

  test("Sorts rows using column name, reversed", () => {
    const result = sortRows(
      [
        {
          expression: 'population',
          reversed: true,
        }
      ],
      EXAMPLE_ROWS
    )

    expect(result.map((row) => row.name)).toEqual([
      "United States of America",
      "Russia",
      "Colombia",
    ])
  })

  test("Sorts rows when using an expression", () => {
    const result = sortRows(
      [
        {
          expression: 'population * 10',
          reversed: false,
        }
      ],
      EXAMPLE_ROWS
    )

    expect(result.map((row) => row.name)).toEqual([
      "Colombia",
      "Russia",
      "United States of America",
    ])
  })

  test("Sorts upon multiple expressions", () => {
    const result = sortRows(
      [
        {
          expression: 'numeric',
          reversed: false,
        },
        {
          expression: 'alpha',
          reversed: false,
        }
      ],
      [
        {
          alpha: 'b',
          numeric: 4
        },
        {
          alpha: 'a',
          numeric: 10
        },
        {
          alpha: 'a',
          numeric: 4
        },
      ]
    )

    expect(result).toEqual([
      {
        alpha: 'a',
        numeric: 4
      },
      {
        alpha: 'b',
        numeric: 4
      },
      {
        alpha: 'a',
        numeric: 10
      },
    ])
  })
})

describe('util/evaluateExpression', () => {
  test('Evaluates simple expression', () => {
    const expression = compileExpression("value * 100")

    const row = {
      value: 100
    }
    const value = evaluateExpression(row, expression, {})

    expect(value).toEqual(row.value * 100)
  })

  test('Performs columnVariable transformations', () => {
    const expression = compileExpression("myvar")

    const row = {
      'Some string field name': 100
    }
    const columnVariables = {
      myvar: 'Some string field name'
    }
    const value = evaluateExpression(row, expression, columnVariables)

    expect(value).toEqual(row['Some string field name'])
  })
})

describe('util/getCellDisplay', () => {
  test('Fetches string cell display', () => {
    const row = {
      value: 'Some value'
    }
    const display = getCellDisplay(row, 'value')

    expect(display).toEqual(row.value)
  })

  test('JSON-encodes non-string cell display', () => {
    const row = {
      value: { arbitrary: 100 }
    }
    const display = getCellDisplay(row, 'value')

    expect(display).toEqual(JSON.stringify(row.value))
  })
})

describe('util/getColumnInfo', () => {
  test("Parses column having string name", () => {
    const arbitraryColumnName = "my_column"
    const columnInfo = getColumnInfo(arbitraryColumnName)

    expect(columnInfo).toEqual({
      name: arbitraryColumnName,
      expression: arbitraryColumnName
    })
  })

  test("Parses column having defined name", () => {
    const providedColumnInfo: ColumnInfo = {
      name: "Something",
      expression: "my_column"
    }
    const columnInfo = getColumnInfo(providedColumnInfo)

    expect(columnInfo).toEqual(providedColumnInfo)
  })
})

describe('util/getSortExpression', () => {
  test("Parses string sort expression", () => {
    const expression = 'beep'
    const parsed = getSortExpression(expression)

    expect(parsed).toEqual({
      expression,
      reversed: false
    })
  })

  test("Parses extended sort expression", () => {
    const expression = {
      expression: 'beep',
      reversed: true,
    }
    const parsed = getSortExpression(expression)

    expect(parsed).toEqual(expression)
  })
})

describe('util/getArrayForArrayOrObject', () => {
  test('Returns empty array for null', () => {
    const value: null = null
    const actual = getArrayForArrayOrObject<string>(value)

    expect(actual).toEqual([])
  })

  test('Returns empty array for undefined', () => {
    const value: undefined = undefined
    const actual = getArrayForArrayOrObject(value)

    expect(actual).toEqual([])
  })

  test('Returns original array for array', () => {
    const value: string[] = ['beep']
    const actual = getArrayForArrayOrObject<string>(value)

    expect(actual).toEqual(value)
  })

  test('Returns array of single item if single item', () => {
    const value: string = 'beep'
    const actual = getArrayForArrayOrObject<string>(value)

    expect(actual).toEqual([value])
  })
})
