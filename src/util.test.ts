import { Parser } from 'expr-eval'

import { applyRowFilters, evaluateExpression, getColumnInfo, getCellDisplay, ColumnInfo } from './util'

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
        "capitol == 'Moscow'",
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

describe('util/evaluateExpression', () => {
  test('Evaluates simple expression', () => {
    const parser = new Parser()
    const expression = parser.parse("value * 100")

    const row = {
      value: 100
    }
    const value = evaluateExpression(row, expression, {})

    expect(value).toEqual(row.value * 100)
  })

  test('Performs columnVariable transformations', () => {
    const parser = new Parser()
    const expression = parser.parse("myvar")

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