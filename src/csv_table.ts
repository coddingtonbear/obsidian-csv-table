import parseCsv from 'csv-parse/lib/sync'
import { compileExpression } from 'filtrex'
import { Options } from 'csv-parse'

import { applyRowFilters, getColumnInfo, evaluateExpression, sortRows } from './util'

export interface CsvTableData {
  columns: string[],
  rows: Record<string, any>[]
}

export interface NamedColumn {
  name: string
  expression: string
}

export interface CsvTableSpec {
  source: string
  csvOptions?: Options
  columns?: (NamedColumn | string)[]
  columnVariables?: Record<string, string>
  filter?: string[] | string
  maxRows?: number
  sortBy?: string[] | string
}

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
      csvSpec.sortBy ? (typeof csvSpec.sortBy === 'string' ? [csvSpec.sortBy] : csvSpec.sortBy) : [],
      applyRowFilters(
        csvSpec.filter ? (typeof csvSpec.filter === 'string' ? [csvSpec.filter] : csvSpec.filter) : [],
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
