import { Plugin, MarkdownRenderChild } from 'obsidian';
import parseCsv from 'csv-parse/lib/sync'
import {Options} from 'csv-parse'
import YAML from 'yaml'

interface CsvSpec {
	filename?: string
	csvOptions?: Options
	columns?: string[]
	where?: string[]
}

function renderErrorPre(container: HTMLElement, error: string): HTMLElement {
	let pre = container.createEl('pre', { cls: ["dataview", "dataview-error"] });
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
				renderErrorPre(el, "Could not parse CSV table spec.")
				return
			}

			if (!csvSpec.filename) {
				renderErrorPre(el, "Parameter 'filename' is required.")
				return
			}

			const exists = await this.app.vault.adapter.exists(csvSpec.filename)
			if (!exists) {
				renderErrorPre(el, `CSV file '${csvSpec.filename}' could not be found.`)
				return
			}
			const data = await this.app.vault.adapter.read(csvSpec.filename)

			const {
				trim = true,
				columns = true,
				skip_empty_lines = true,
				...extraOptions
			} = (csvSpec.csvOptions ?? {})
			const csvOptions = {
				trim, columns, skip_empty_lines, ...extraOptions
			}
			console.log(csvOptions)
			const csvData = parseCsv(data, csvOptions)
			const filteredCsvData = this.filterConstraints(csvSpec.where, csvData)

			ctx.addChild(new TableRenderer(csvSpec.columns, filteredCsvData, el));
		});
	}

	filterConstraints(constraints: string[], rows: any[]): any[] {
		return rows
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

		for (const column of columns) {
			headerEl.createEl('th', {text: column})
		}

		for (const row of this.rows) {
			console.log(row)

			const trEl = tbodyEl.createEl('tr')

			for (const column of columns) {
				trEl.createEl('td', {text: typeof row[column] === "string" ? row[column] : JSON.stringify(row[column])})
			}
		}
	}
}
