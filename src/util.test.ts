import { getColumnInfo, ColumnInfo } from './util'

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
