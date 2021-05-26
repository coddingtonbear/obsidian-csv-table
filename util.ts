import {Parser, Expression} from 'expr-eval'


export function applyRowFilters(filters: string[], maxRows: number = Infinity, rows: Record<string, any>[]): Record<string, any>[] {
	const filteredRows: Record<string, any>[] = []
	const expressions: Expression[] = []
	const parser = new Parser()

	for(const expression of filters) {
		expressions.push(parser.parse(expression))
	}

	let rowIndex = 1;
	for(const row of rows) {
		let passesTests = true

		if (rowIndex > maxRows) {
			break
		}

		for(const expression of expressions) {
			if(! expression.evaluate(row)) {
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

export function getCellValue(row: Record<string, any>, expression: string): any {
	if (typeof row[expression] === 'string') {
		return row[expression]
	} else if (typeof row[expression] === 'undefined') {
		const parser = new Parser()
		return parser.parse(expression).evaluate(row)
	} else {
		return JSON.stringify(row[expression])
	}
}

interface ColumnInfo {
  name: string
  expression: string
}

export function getColumnInfo(column: string): ColumnInfo {
  const matchResult = column.match(/(.*) as (?:'|")(.*)(?:'|")/)
  if(matchResult) {
    return {
      name: matchResult[2],
      expression: matchResult[1]
    }
  } else {
    return {
      name: column,
      expression: column
    }
  }
}
