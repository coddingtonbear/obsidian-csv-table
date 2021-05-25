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
filename: countries.csv
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
filename: my_csv_file.csv
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
