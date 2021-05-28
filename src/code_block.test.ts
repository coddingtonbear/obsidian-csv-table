import { getCodeBlockData, getCsvTableSpec, CsvTableSpec, CodeBlockData } from "./code_block"

const SAMPLE_CSV_DATA: string[][] = [
  ["country", "capitol", "population"],
  ["United States of America", "\"Washington, DC\"", "328200000"],
  ["Colombia", "Bogota", "50340000"],
  ["Russia", "Moscow", "144400000"],
]

function getCsvString(data: string[][]): string {
  const rows: string[] = [];

  for (const row of data) {
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

describe('code_block/getCsvTableSpec', () => {
  test('Assert that error is raised if no source specified', () => {
    const tableSpec = ""

    expect(() => getCsvTableSpec(tableSpec)).toThrow()
  })

  test('Returns object if object is alright otherwise', () => {
    const filename = "something.csv"
    const tableSpec = `source: ${filename}`

    const result = getCsvTableSpec(tableSpec)

    expect(result.source).toEqual(filename)
  })
})

describe('code_block/getCodeBlockData', () => {
  test('basic', () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA)
    const tableSpec: CsvTableSpec = {
      source: 'arbitrary.csv'
    }

    const actual = getCodeBlockData(tableSpec, csvData)
    const expected: CodeBlockData = {
      columns: [
        "country",
        "capitol",
        "population",
      ],
      rows: [
        {
          "country": "United States of America",
          "capitol": "Washington, DC",
          "population": 328200000,
        },
        {
          "country": "Colombia",
          "capitol": "Bogota",
          "population": 50340000,
        },
        {
          "country": "Russia",
          "capitol": "Moscow",
          "population": 144400000,
        }
      ],
    }

    expect(actual).toEqual(expected)
  })

  test('with simple column expressions', () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA)
    const tableSpec: CsvTableSpec = {
      source: 'arbitrary.csv',
      columns: [
        "country",
        "population / 1000000",
      ]
    }

    const actual = getCodeBlockData(tableSpec, csvData)
    const expected: CodeBlockData = {
      columns: [
        "country",
        "population / 1000000",
      ],
      rows: [
        {
          "country": "United States of America",
          "capitol": "Washington, DC",
          "population": 328200000,
          "population / 1000000": 328.2,
        },
        {
          "country": "Colombia",
          "capitol": "Bogota",
          "population": 50340000,
          "population / 1000000": 50.34,
        },
        {
          "country": "Russia",
          "capitol": "Moscow",
          "population": 144400000,
          "population / 1000000": 144.4,
        }
      ],
    }

    expect(actual).toEqual(expected)
  })

  test('with named column expressions', () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA)
    const tableSpec: CsvTableSpec = {
      source: 'arbitrary.csv',
      columns: [
        "country",
        {
          "name": "millions",
          "expression": "population / 1000000"
        }
      ]
    }

    const actual = getCodeBlockData(tableSpec, csvData)
    const expected: CodeBlockData = {
      columns: [
        "country",
        "millions"
      ],
      rows: [
        {
          "country": "United States of America",
          "capitol": "Washington, DC",
          "population": 328200000,
          "millions": 328.2,
        },
        {
          "country": "Colombia",
          "capitol": "Bogota",
          "population": 50340000,
          "millions": 50.34,
        },
        {
          "country": "Russia",
          "capitol": "Moscow",
          "population": 144400000,
          "millions": 144.4,
        }
      ],
    }

    expect(actual).toEqual(expected)
  })

  test('with single filter', () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA)
    const tableSpec: CsvTableSpec = {
      source: 'arbitrary.csv',
      filter: "population > 300000000",
    }

    const actual = getCodeBlockData(tableSpec, csvData)
    const expected: CodeBlockData = {
      columns: [
        "country",
        "capitol",
        "population",
      ],
      rows: [
        {
          "country": "United States of America",
          "capitol": "Washington, DC",
          "population": 328200000,
        },
      ],
    }

    expect(actual).toEqual(expected)
  })

  test('with multiple filters', () => {
    const csvData = getCsvString(SAMPLE_CSV_DATA)
    const tableSpec: CsvTableSpec = {
      source: 'arbitrary.csv',
      filter: [
        "population < 300000000",
        "capitol == \"Bogota\""
      ]
    }

    const actual = getCodeBlockData(tableSpec, csvData)
    const expected: CodeBlockData = {
      columns: [
        "country",
        "capitol",
        "population",
      ],
      rows: [
        {
          "country": "Colombia",
          "capitol": "Bogota",
          "population": 50340000,
        },
      ],
    }

    expect(actual).toEqual(expected)
  })
})
