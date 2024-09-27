# Tables with Dynamic Data

[![Preview of Dynamic Tables](/img/table.png)](https://playground.pdfme.com/)

The table schema has been added in since [V4.5.0](https://github.com/pdfme/pdfme/releases/tag/4.5.0).  
This schema allows you to add tables to PDFs and dynamically modify the table data.

## Using the Table Schema

The table schema is included in the `@pdfme/schemas` package and is exported as `table`.  
You can add the table schema as a plugin to `@pdfme/ui` and `@pdfme/generator` using the code below.

To support page breaks, ensure to set the `basePdf` property in the template to `{ width: number, height: number, padding: [number,number,number,number] }`.

```javascript
import { table } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';

new Designer({
  domContainer,
  template,
  plugins: { Table: table },
});

generate({
  template,
  inputs,
  plugins: { Table: table },
});
```

Adding a table in the Designer will create a template like the following:

```json
{
  "schemas": [
    [
      {
        "name": "mytable",
        "type": "table",
        "position": {
          "x": 28.92,
          "y": 51.36
        },
        "width": 150,
        "height": 57.5184,
        "content": "[[\"Alice\",\"New York\",\"Alice is a freelance web designer and developer\"],[\"Bob\",\"Paris\",\"Bob is a freelance illustrator and graphic designer\"]]",
        "showHead": true,
        "head": ["Name", "City", "Description"],
        "headWidthPercentages": [30, 30, 40],
        "tableStyles": {
          "borderWidth": 0.3,
          "borderColor": "#000000"
        },
        "headStyles": {
          "fontName": "NotoSerifJP-Regular",
          "fontSize": 13,
          "characterSpacing": 0,
          "alignment": "left",
          "verticalAlignment": "middle",
          "lineHeight": 1,
          "fontColor": "#ffffff",
          "borderColor": "",
          "backgroundColor": "#2980ba",
          "borderWidth": {
            "top": 0,
            "right": 0,
            "bottom": 0,
            "left": 0
          },
          "padding": {
            "top": 5,
            "right": 5,
            "bottom": 5,
            "left": 5
          }
        },
        "bodyStyles": {
          "fontName": "NotoSerifJP-Regular",
          "fontSize": 13,
          "characterSpacing": 0,
          "alignment": "left",
          "verticalAlignment": "middle",
          "lineHeight": 1,
          "fontColor": "#000000",
          "borderColor": "#888888",
          "backgroundColor": "",
          "alternateBackgroundColor": "#f5f5f5",
          "borderWidth": {
            "top": 0.1,
            "right": 0.1,
            "bottom": 0.1,
            "left": 0.1
          },
          "padding": {
            "top": 5,
            "right": 5,
            "bottom": 5,
            "left": 5
          }
        },
        "columnStyles": {},
        "required": false,
        "readOnly": false
      }
    ]
  ],
  "basePdf": {
    "width": 210,
    "height": 297,
    "padding": [20, 20, 20, 20]
  },
  "pdfmeVersion": "5.0.0"
}
```

You can configure the generator's input for the above template like this:

```json
[
  {
    "mytable": [
      ["Alice", "New York", "Alice is a freelance web designer and developer"],
      ["Bob", "Paris", "Bob is a freelance illustrator and graphic designer"]
    ]
  }
]
```

The input can be either a 2D array or a stringified 2D array.

By changing the input data in the generator, you can dynamically modify the table's content.

```json
[
  {
    "mytable": [
      ["Alice", "New York", "Alice is a freelance web designer and developer"],
      ["Bob", "Paris", "Bob is a freelance illustrator and graphic designer"],
      ["Charlie", "London", "Charlie is a freelance photographer"]
    ]
  }
]
```

![Table with 3 rows](/img/table-generated-pdf2.png)

If the input data spans multiple pages, automatic page breaks will be inserted.

![Table with page breaks](/img/table-generated-pdf3.png)

## About Table Settings

Using the Designer, you can easily set the number of columns and rows in a table. You can also freely configure the table's style.

### Column and Row Settings

When you click on a selected table, it enters edit mode.

In this mode, you can delete columns using the "-" button on each column, and add columns using the "+" button at the bottom right of the table.
You can also change column widths by drag and drop.

For row settings, you can add rows using the "+" button at the bottom of the table, and delete rows using the "-" button on the right side of each row.
While the actual number of rows will vary depending on the data when creating the PDF, you can use this feature to set the number of rows when creating a non-editable table.

![Table Column, Row Settings](/img/table-column-row-seting.gif)

### Table Styles

Like other schemas, you can set styles from the property panel on the right.
The styles are broadly categorized into four types:

- Table Style
- Head Style
- Body Style
- Column Style

For each, you can set borders, fonts, background colors, padding, and more.
The Body's Alternate Background Color is used to alternate background colors of rows.

## Sample Using Table Schema

You can check out a sample using the table schema at [https://playground.pdfme.com/](https://playground.pdfme.com/).

[![Table schema Playground](/img/table-invoice-template.png)](https://playground.pdfme.com/)

Set the Template Preset to Invoice and explore the sample using the Table schema.

The source code for this playground is available [here](https://github.com/pdfme/pdfme/tree/main/playground).

:::info

If you have feedback or suggestions regarding the use of the table schema, please let us know via [GitHub issues](https://github.com/pdfme/pdfme/issues) or [Discord](https://discord.gg/xWPTJbmgNV).  
Your feedback contributes significantly to the development of pdfme.

:::
