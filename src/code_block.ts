import parseCsv from 'csv-parse/lib/sync'
import { Options } from 'csv-parse'
import YAML from 'yaml'
import { compileExpression } from 'filtrex'

import { applyRowFilters, getColumnInfo, evaluateExpression } from './util'

export interface CodeBlockData {
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
}

export function getCsvTableSpec(csvSpecString: string): CsvTableSpec {
  let csvSpec: CsvTableSpec = {
    source: ''  // Assert that this has a proper value below
  }

  try {
    csvSpec = YAML.parse(csvSpecString)
  } catch (e) {
    throw new Error(`Could not parse CSV table spec: ${e.message}.`)
  }

  if (!csvSpec.source) {
    throw new Error("Parameter 'source' is required.")
  }

  return csvSpec
}

export function getCodeBlockData(
  csvSpec: CsvTableSpec,
  csvData: string
): CodeBlockData {
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

  if (!csvSpec.columns?.length) {
    for (const key of Object.keys(parsedCsvData[0])) {
      columnNames.push(key)
    }
  } else {
    try {
      for (const column of csvSpec.columns ?? []) {
        const columnInfo = getColumnInfo(column)
        const expression = compileExpression(columnInfo.expression)
        columnNames.push(columnInfo.name)

        for (const row of parsedCsvData) {
          row[columnInfo.name] = evaluateExpression(row, expression, csvSpec.columnVariables)
        }
      }
    } catch (e) {
      throw new Error(`Error evaluating column expressions: ${e.message}.`)
    }
  }

  let filteredCsvData: Record<string, any>[] = []
  try {
    filteredCsvData = applyRowFilters(
      csvSpec.filter ? (typeof csvSpec.filter === 'string' ? [csvSpec.filter] : csvSpec.filter) : [],
      csvSpec.maxRows ?? Infinity,
      parsedCsvData,
      csvSpec.columnVariables
    )
  } catch (e) {
    throw new Error(`Error evaluating filter expressions: ${e.message}.`)
  }

  return {
    columns: columnNames,
    rows: filteredCsvData
  }
}
