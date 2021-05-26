import { Parser, Expression } from 'expr-eval'


export function applyRowFilters(
  filters: string[],
  maxRows: number = Infinity,
  rows: Record<string, any>[],
  columnVariables?: Record<string, string>
): Record<string, any>[] {
  const filteredRows: Record<string, any>[] = []
  const expressions: Expression[] = []
  const parser = new Parser()

  for (const expression of filters) {
    expressions.push(parser.parse(expression))
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

export function evaluateExpression(row: Record<string, any>, expression: Expression, columnVariables?: Record<string, string>): any {
  const extendedRow: Record<string, any> = { ...row }

  for (const columnVariable in columnVariables ?? {}) {
    console.log(columnVariable, row[columnVariables[columnVariable]])
    extendedRow[columnVariable] = row[columnVariables[columnVariable]]
  }

  return expression.evaluate(extendedRow)
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
