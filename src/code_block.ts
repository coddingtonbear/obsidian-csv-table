import { Vault } from "obsidian";
import parseCsv from 'csv-parse/lib/sync'
import { Options } from 'csv-parse'
import YAML from 'yaml'
import { Parser } from 'expr-eval';

import { applyRowFilters, getColumnInfo, evaluateExpression } from './util'

export interface CodeBlockData {
  columns: string[],
  rows: Record<string, any>[]
}

interface CsvSpec {
  source?: string
  csvOptions?: Options
  columns?: string[]
  columnVariables?: Record<string, string>
  filter?: string[] | string
  maxRows?: number
}

export async function getCodeBlockData(
  csvSpecString: string,
  vault: Vault,
): Promise<CodeBlockData> {
  let csvSpec: CsvSpec = {}
  try {
    csvSpec = YAML.parse(csvSpecString)
  } catch (e) {
    throw new Error(`Could not parse CSV table spec: ${e.message}.`)
  }

  if (!csvSpec.source) {
    throw new Error("Parameter 'source' is required.")
  }

  const exists = await vault.adapter.exists(csvSpec.source)
  if (!exists) {
    throw new Error(`CSV file '${csvSpec.source}' could not be found.`)
  }
  const data = await vault.adapter.read(csvSpec.source)

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
  const csvData = parseCsv(data, csvOptions)

  try {
    for (const column of csvSpec.columns ?? []) {
      const columnInfo = getColumnInfo(column)
      const parser = new Parser()

      if (columnInfo.name != columnInfo.expression) {
        const expression = parser.parse(columnInfo.expression)

        for (const row of csvData) {
          row[columnInfo.name] = evaluateExpression(row, expression, csvSpec.columnVariables)
        }
      }
    }
  } catch (e) {
    throw new Error(`Error evaluating column expressions: ${e.message}.`)
  }

  let filteredCsvData: Record<string, any>[] = []
  try {
    filteredCsvData = applyRowFilters(
      csvSpec.filter ? (typeof csvSpec.filter === 'string' ? [csvSpec.filter] : csvSpec.filter) : [],
      csvSpec.maxRows ?? Infinity,
      csvData,
      csvSpec.columnVariables
    )
  } catch (e) {
    throw new Error(`Error evaluating filter expressions: ${e.message}.`)
  }

  return {
    columns: csvSpec.columns,
    rows: filteredCsvData
  }
}
