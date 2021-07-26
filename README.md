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

- `source`: (Required) Path to the csv file to render within your notes.
- `csvOptions`: Options to use for decoding the referenced CSV file;
  see https://csv.js.org/parse/options/ for available options.
- `columns`: A list of columns to render. Each item may be either the
  name of a field to display or an expression (see "Expressions" below),
  and can be re-named. If unspecified, all columns in the referenced CSV 
  will be rendered. See "Selecting particular columns" below for details.
- `filter`: A list of filter expressions (see "Expressions" below) to
  use for limiting which rows of the referenced CSV will be displayed.
  If unspecified, all rows of the referenced CSV will be rendered taking
  into account the value specified for `maxRows` below. See "Filtering
  displayed rows" for details.
- `columnVariables`: A mapping of variable name to column name allowing
  you to set a name for use in `filter` or `columns` above to reference
  the value of a field that is not a valid variable name.
- `maxRows`: The maximum number of rows to display. If unspecified,
  all unfiltered rows of the referenced CSV will be displayed.

### Expressions

This library uses `filtrex` for expression evaluation; see their documentation to see more information about the expression syntax and what functions are available: https://github.com/m93a/filtrex#expressions.

See "Filtering displayed rows" for an example of a filter expression in action, but realistically they work exactly as you'd probably expect.

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

By default, the parser will attempt to cast the values of each field to an integer, boolean, or date object where appropriate for use in your filter expressions.  Also, note that your filter expression can also be provided as a list; those expressions will be and-ed together, e.g.:

~~~
```csvtable
source: my_csv_file.csv
filter:
- population < 100000000
- name == "Colombia"
```
~~~

Note that the filtering language requires that you use double-quoted strings in comparisons -- if you had entered `name == 'Colombia'` above, the filter would not have returned results.
