import { Parser } from 'expr-eval'

import { evaluateExpression, getColumnInfo, getCellDisplay, ColumnInfo } from './util'


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
