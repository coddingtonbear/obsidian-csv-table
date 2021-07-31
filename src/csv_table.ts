import parseCsv from 'csv-parse/lib/sync'
import { compileExpression } from 'filtrex'
import { CsvTableSpec, CsvTableData, ExtendedSortExpression } from './types'

import { applyRowFilters, getColumnInfo, evaluateExpression, sortRows, getArrayForArrayOrObject, getSortExpression } from './util'


export function getFilteredCsvData(
  csvSpec: CsvTableSpec,
  csvData: string
): CsvTableData {
  const {
    cast = true,
    cast_date = true,
    trim = true,
    columns = true,
    skip_empty_lines = true,
    ...extraOptions
  } = (csvSpec.csvOptions ?? {})
  const csvOptions = {
    cast, trim, columns, skip_empty_lines, ...extraOptions
  }
  const parsedCsvData = parseCsv(csvData, csvOptions)
  const columnNames: string[] = []
  const rowColumns: string[] = Object.keys(parsedCsvData[0])

  try {
    for (const column of csvSpec.columns ?? rowColumns) {
      const columnInfo = getColumnInfo(column)

      // Do not attempt to compile/set the expression value
      // if it already exists in our known row columns
      if (rowColumns.indexOf(columnInfo.name) === -1) {
        const expression = compileExpression(columnInfo.expression)
        for (const row of parsedCsvData) {
          row[columnInfo.name] = evaluateExpression(row, expression, csvSpec.columnVariables)
        }
      }

      columnNames.push(columnInfo.name)
    }
  } catch (e) {
    throw new Error(`Error evaluating column expressions: ${e.message}.`)
  }

  let filteredSortedCsvData: Record<string, any>[] = []
  try {
    filteredSortedCsvData = sortRows(
      getArrayForArrayOrObject<string | ExtendedSortExpression>(csvSpec.sortBy).map(getSortExpression),
      applyRowFilters(
        getArrayForArrayOrObject<string>(csvSpec.filter),
        csvSpec.maxRows ?? Infinity,
        parsedCsvData,
        csvSpec.columnVariables
      ),
      csvSpec.columnVariables
    )
  } catch (e) {
    throw new Error(`Error evaluating filter expressions: ${e.message}.`)
  }

  return {
    columns: columnNames,
    rows: filteredSortedCsvData
  }
}
