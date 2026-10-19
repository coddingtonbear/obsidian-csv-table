## Obsidian CSV Table

Have data in a CSV file that you'd like to render as a table in Obsidian? Now you can.

## Quickstart

Imagine you have the following CSV file named `countries.csv`:

```
name,capitol,population
United States of America,"Washington, DC",328200000
Colombia,Bogota,50340000
Russia,Moscow,144400000
```

The following code block:

~~~
```csvtable
source: countries.csv
```
~~~

will render a table like:

<table>
    <thead>
        <tr>
            <th>name</th>
            <th>capitol</th>
            <th>population</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>United States of America</td>
            <td>Washington, DC</td>
            <td>328200000</td>
        </tr>
        <tr>
            <td>Colombia</td>
            <td>Bogota</td>
            <td>50340000</td>
        </tr>
        <tr>
            <td>Russia</td>
            <td>Moscow</td>
            <td>144400000</td>
        </tr>
    </tbody>
</table>

## Options

- `source`: (Required) Path (relative to your vault's root) to the csv file to render within your notes.
- `csvOptions`: Options to use for decoding the referenced CSV file; see https://csv.js.org/parse/options/ for available options. By default the plugin sets `columns: true`, `trim: true`, `skip_empty_lines: true`, `bom: true`, `cast: true` and a `cast_date` that only casts cells that look like dates (see "Filtering displayed rows" below); anything you set here takes precedence.
- `columns`: A list of columns to render. Each item may be either the name of a field to display or an expression (see "Expressions" below), and can be re-named. If unspecified, all columns in the referenced CSV  will be rendered. See "Selecting particular columns" below for details.
- `filter`: A list of filter expressions (see "Expressions" below) or a single filter expression to use for limiting which rows of the referenced CSV will be displayed. If unspecified, all rows of the referenced CSV will be rendered taking into account the value specified for `maxRows` below. See "Filtering displayed rows" for details.
- `sortBy`: A list of sort expressions (see "Expressions" below) or a single sort expression to use for sorting the displayed rows.  If unspecified, rows will be displayed in the order they appear in the referenced CSV.  See "Sorting Rows" for details.
- `columnVariables`: A mapping of variable name to column name allowing you to set a name for use in `filter` or `columns` above to reference the value of a field that is not a valid variable name.
- `maxRows`: The maximum number of rows to display, counted after `filter` and `sortBy` have been applied. If unspecified, all rows matching your filter will be displayed.

### Expressions

This library uses `filtrex` for expression evaluation; see their documentation to see more information about the expression syntax and what functions are available: https://github.com/m93a/filtrex#expressions.

See "Filtering displayed rows" for an example of a filter expression in action, but realistically they work exactly as you'd probably expect. A few details worth knowing:

- `and`, `or` and `not` need true-or-false operands: write `not (population > 100000000)` or `done == true` rather than `not population`.
- `true` and `false` can be written as-is, e.g. `done == true`.
- Comparisons coerce the way JavaScript does: a number cell compared with text naming a number (`population == "50340000"`) matches.
- A date cell (see "Filtering displayed rows") can be compared with another date cell, or with text naming a date: `start >= "2021-10-28"`.
- Column names must be valid identifiers (letters, digits and underscores, not starting with a digit). Use `columnVariables` to give any other column a usable name.

### Selecting particular columns

You can use the `columns` field to control which columns of your CSV file to render, e.g:

~~~
```csvtable
columns:
- name
- population
source: my_csv_file.csv
```
~~~

<table>
    <thead>
        <tr>
            <th>name</th>
            <th>population</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>United States of America</td>
            <td>328200000</td>
        </tr>
        <tr>
            <td>Colombia</td>
            <td>50340000</td>
        </tr>
        <tr>
            <td>Russia</td>
            <td>144400000</td>
        </tr>
    </tbody>
</table>

It's also possible for you to set better names for your columns or use expressions:

~~~
```csvtable
columns:
- expression: name
  name: Country Name
- expression: population  / 1000000
  name: Population (Millions)
source: my_csv_file.csv
```
~~~

<table>
    <thead>
        <tr>
            <th>Country Name</th>
            <th>Population (Millions)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>United States of America</td>
            <td>328.2</td>
        </tr>
        <tr>
            <td>Colombia</td>
            <td>50.34</td>
        </tr>
        <tr>
            <td>Russia</td>
            <td>144.4</td>
        </tr>
    </tbody>
</table>

### Filtering displayed rows

Maybe you would like to display only a subset of the rows of your CSV?  If so, you can provide a `filter` expression to limit which rows are shown:

~~~
```csvtable
source: my_csv_file.csv
filter: population < 100000000
```
~~~

<table>
    <thead>
        <tr>
            <th>name</th>
            <th>population</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Colombia</td>
            <td>50340000</td>
        </tr>
    </tbody>
</table>

By default, cells holding a number are cast to numbers, and cells that look like a date -- digits, a separator and more digits, such as `2021-01-11`, `2021-01-11 08:00` or `01/11/2021` -- are cast to dates, so your filter expressions can compare them:

~~~
```csvtable
source: meetings.csv
filter: start >= "2021-10-28"
```
~~~

(Set `cast_date: false` in `csvOptions` to keep dates as text, or `cast_date: true` to let csv-parse try to read every cell as a date, which it will also do to text like "March".) Also, note that your filter expression can also be provided as a list; those expressions will be and-ed together, e.g.:

~~~
```csvtable
source: my_csv_file.csv
filter:
- population < 100000000
- name == "Colombia"
```
~~~

Note that the filtering language requires that you use double-quoted strings in comparisons -- if you had entered `name == 'Colombia'` above, the filter would not have returned results.

### Sorting Rows

If you would like to sort the rows of your displayed CSV, you can provide a sort expression:

~~~
```csvtable
source: my_csv_file.csv
sortBy: name
```
~~~

<table>
    <thead>
        <tr>
            <th>name</th>
            <th>population</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Colombia</td>
            <td>50340000</td>
        </tr>
        <tr>
            <td>Russia</td>
            <td>144400000</td>
        </tr>
        <tr>
            <td>United States of America</td>
            <td>328200000</td>
        </tr>
    </tbody>
</table>

Additionally, you can specify your `sortBy` expression as a list; the document will be sorted by all specified fields in rank order:

~~~
```csvtable
source: my_csv_file.csv
sortBy:
- columnOne
- columnTwo
```
~~~

It's also possible for you to sort your displayed data in reverse order if you specify your `sortBy` expression using an extended format allowing you to specify both the expression and direction of sort:

~~~
```csvtable
source: my_csv_file.csv
sortBy:
- expression: name
  reversed: true
```
~~~

<table>
    <thead>
        <tr>
            <th>name</th>
            <th>population</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>United States of America</td>
            <td>328200000</td>
        </tr>
        <tr>
            <td>Russia</td>
            <td>144400000</td>
        </tr>
        <tr>
            <td>Colombia</td>
            <td>50340000</td>
        </tr>
    </tbody>
</table>

## Upgrading from 1.2

Version 1.3 rebuilt the plugin on current tooling and newer versions of csv-parse and filtrex. Existing `csvtable` blocks should keep working, with these differences:

- Requires Obsidian 1.13.1 or newer.
- `maxRows` now counts the rows displayed, after filtering and sorting. It used to limit how many rows of the file were read before filtering, and sorting applied to that subset.
- Only cells that look like a date are cast to dates. Previously any text JavaScript could read as a date -- "March", "meeting 5" -- became one, and rendered as a quoted timestamp. Set `cast_date: true` in `csvOptions` for the old behavior.
- A byte order mark at the start of the file is skipped, so the first column of a CSV saved by Excel gets its proper name.
- `and`, `or` and `not` require true-or-false operands; see "Expressions".
- Expression errors that used to let every row through (an unknown function, for instance) now show as an error in place of the table.
- Tables carry the `csv-table` class and so fill the width of the note, as the plugin's stylesheet always intended.
