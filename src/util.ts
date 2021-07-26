import { compileExpression } from 'filtrex'

type ExpressionFn = (item: Record<string, any>) => any


export function applyRowFilters(
  filters: string[],
  maxRows: number = Infinity,
  rows: Record<string, any>[],
  columnVariables?: Record<string, string>
): Record<string, any>[] {
  const filteredRows: Record<string, any>[] = []
  const expressions: ExpressionFn[] = []

  for (const expression of filters) {
    expressions.push(compileExpression(expression))
  }

  let rowIndex = 1;
  for (const row of rows) {
    let passesTests = true

    if (rowIndex > maxRows) {
      break
    }

    for (const expression of expressions) {
      if (!evaluateExpression(row, expression, columnVariables)) {
        passesTests = false
        break
      }
    }
    if (passesTests) {
      filteredRows.push(row)
    }
    rowIndex += 1
  }
  return filteredRows
}

export function sortRows(
  sortExpressions: string[],
  rows: Record<string, any>[],
  columnVariables?: Record<string, string>
): Record<string, any>[] {
  const sortedRows: Record<string, any>[] = [...rows]
  const expressions: ExpressionFn[] = []

  for (const expression of sortExpressions) {
    expressions.push(compileExpression(expression))
  }

  for (const sortExpression of expressions.reverse()) {
    sortedRows.sort((a, b) => {
      const aResult = evaluateExpression(a, sortExpression, columnVariables)
      const bResult = evaluateExpression(b, sortExpression, columnVariables)

      if (aResult < bResult) {
        return -1
      } else if (aResult > bResult) {
        return 1
      } else {
        return 0
      }
    })
  }
  return sortedRows
}

export function evaluateExpression(row: Record<string, any>, expression: ExpressionFn, columnVariables?: Record<string, string>): any {
  const extendedRow: Record<string, any> = { ...row }

  for (const columnVariable in columnVariables ?? {}) {
    extendedRow[columnVariable] = row[columnVariables[columnVariable]]
  }

  return expression(extendedRow)
}

export function getCellDisplay(row: Record<string, any>, expression: string): any {
  if (typeof row[expression] === 'string') {
    return row[expression]
  } else {
    return JSON.stringify(row[expression])
  }
}

export interface ColumnInfo {
  name: string
  expression: string
}

export function getColumnInfo(column: string | ColumnInfo): ColumnInfo {
  if (typeof column === 'string') {
    return {
      name: column,
      expression: column
    }
  } else {
    return column
  }
}
