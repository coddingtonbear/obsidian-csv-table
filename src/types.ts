import { Options } from 'csv-parse'

export interface CsvTableData {
  columns: string[],
  rows: Record<string, any>[]
}

export interface NamedColumn {
  name: string
  expression: string
}

export interface ExtendedSortExpression {
  expression: string
  reversed: boolean
}

export interface CsvTableSpec {
  source: string
  csvOptions?: Options
  columns?: (NamedColumn | string)[]
  columnVariables?: Record<string, string>
  filter?: string[] | string
  maxRows?: number
  sortBy?: (string | ExtendedSortExpression)[] | string | ExtendedSortExpression
}
