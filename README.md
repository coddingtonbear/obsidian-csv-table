## Obsidian CSV Table

Have data in a CSV file that you'd like to render in an Obsidian preview?


## Quickstart

Imagine you have the following CSV file named `countries.csv`:

```
name,capital,population
United States of America,"Washington, DC",328200000
Colombia,Bogota,50340000
Russia,Moscow,144400000
```

~~~
```csvtable
source: countries.csv
```
~~~

Will render a table like:

<table>
    <thead>
        <tr>
            <th>name</th>
            <th>capital</th>
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

## Selecting particular columns

You can use the `columns` field to control which columns of your CSV
file to render, e.g:

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

## Filtering displayed rows

Maybe you would like to display only a subset of the rows of your CSV?
If so, you can provide a `filter` expression to limit which rows are shown:

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

By default, the parser will attempt to cast the values of each field
to an integer, boolean, or date object where appropriate for use
in your filter expressions.
Also, note that your filter expression can also be provided as a list;
those expressions will be and-ed together, e.g.:

~~~
```csvtable
source: my_csv_file.csv
filter:
- population < 100000000
- name == "Colombia"
```
~~~

## Setting CSV parser options

You can set options for the CSV parser by setting the `csvOptions` field
using the values described here: https://csv.js.org/parse/options/.

~~~
```csvtable
source: my_csv_file.csv
csvOptions:
  delimiter: ";"
```
~~~
