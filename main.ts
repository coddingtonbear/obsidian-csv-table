import { Plugin, MarkdownRenderChild } from 'obsidian';
import parseCsv from 'csv-parse/lib/sync'
import {Options} from 'csv-parse'
import YAML from 'yaml'

import {getCellValue, applyRowFilters, getColumnInfo} from './util'

interface CsvSpec {
	source?: string
	csvOptions?: Options
	columns?: string[]
	filter?: string[] | string
	maxRows?: number
}

function renderErrorPre(container: HTMLElement, error: string): HTMLElement {
	let pre = container.createEl('pre', { cls: ["csv-table", "csv-error"] });
	pre.appendText(error);
	return pre;
}

export default class CsvTablePlugin extends Plugin {
	async onload() {
		console.log("Loading CSV table plugin");

		this.registerMarkdownCodeBlockProcessor("csvtable", async (csvSpecString: string, el, ctx) => {
			let csvSpec: CsvSpec = {}
			try {
				csvSpec = YAML.parse(csvSpecString)
			} catch (e) {
				renderErrorPre(el, `Could not parse CSV table spec: ${e.message}.`)
				return
			}

			if (!csvSpec.source) {
				renderErrorPre(el, "Parameter 'source' is required.")
				return
			}

			const exists = await this.app.vault.adapter.exists(csvSpec.source)
			if (!exists) {
				renderErrorPre(el, `CSV file '${csvSpec.source}' could not be found.`)
				return
			}
			const data = await this.app.vault.adapter.read(csvSpec.source)

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

			let filteredCsvData: Record<string, any>[] = []
			try {
				filteredCsvData = applyRowFilters(
					csvSpec.filter ? (typeof csvSpec.filter === 'string' ? [csvSpec.filter] : csvSpec.filter): [],
					csvSpec.maxRows ?? Infinity,
					csvData
				)
			} catch(e) {
				renderErrorPre(el, `Error evaluating filter expressions: ${e.message}.`)
			}

			ctx.addChild(new TableRenderer(csvSpec.columns, filteredCsvData, el));
		});
	}

	onunload() {
		console.log('Unloading CSV table plugin');
	}
}

class TableRenderer extends MarkdownRenderChild {
	constructor(public columns: string[], public rows: any[], public container: HTMLElement) {
		super(container)
	}

	async onload() {
		await this.render()
	}

	async render() {
		const columns = this.columns?.length ? this.columns : Object.keys(this.rows[0])

		const tableEl = this.container.createEl('table')

		const theadEl = tableEl.createEl('thead')
		const headerEl = theadEl.createEl('tr')
		const tbodyEl = tableEl.createEl('tbody')

		const columnExpressions: string[] = []

		for (const column of columns) {
			const columnInfo = getColumnInfo(column)

			headerEl.createEl('th', {text: columnInfo.name})
			columnExpressions.push(columnInfo.expression)
		}

		for (const row of this.rows) {
			const trEl = tbodyEl.createEl('tr')

			for (const columnExpression of columnExpressions) {
				trEl.createEl('td', {text: getCellValue(row, columnExpression)})
			}
		}
	}
}
