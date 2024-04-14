# Tables with Dynamic Data

:::warning

There are still some bugs with this feature. For more details, please refer to the [related issue on GitHub](https://github.com/pdfme/pdfme/issues?q=is%3Aissue+is%3Aopen+label%3Atable).

We are working to resolve these issues. 

If you encounter any issues, please let us know.
Your contributions greatly contribute to the development of pdfme. Contributions for bug fixes are highly welcome.
Please collaborate with us to resolve these issues.

:::
[![Preview of Dynamic Tables](/img/table.png)](https://playground.pdfme.com/)

The table schema has been added in beta since [V4](https://github.com/pdfme/pdfme/releases/tag/4.0.0).   
This schema allows you to add tables to PDFs and dynamically modify the table data.

## Using the Table Schema

The table schema is included in the `@pdfme/schemas` package and is exported as `tableBeta`.  
You can add the table schema as a plugin to `@pdfme/ui` and `@pdfme/generator` using the code below.

To support page breaks, ensure to set the `basePdf` property in the template to `{ width: number, height: number, padding: [number,number,number,number] }`.

```javascript
import { tableBeta } from '@pdfme/schemas';
import { Designer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';

new Designer({
    domContainer,
    template,
    plugins: { Table: tableBeta },
});

generate({
    template,
    inputs,
    plugins: { Table: tableBeta },
});
```

Adding a table in the Designer will create a template like the following:

```json
{
    "schemas": [
        {
            "mytable": {
                "type": "table",
                "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-table\"><path d=\"M12 3v18\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9h18\"/><path d=\"M3 15h18\"/></svg>",
                "position": {"x": 28.706846058368317,"y": 37.85750960310253},
                "width": 150,
                "height": 57.5184,
                "content": "[[\"Alice\",\"New York\",\"Alice is a freelance web designer and developer\"],[\"Bob\",\"Paris\",\"Bob is a freelance illustrator and graphic designer\"]]",
                "showHead": true,
                "head": ["Name","City","Description"],
                "headWidthPercentages": [30,30,40],
                "tableStyles": {"borderWidth": 0.3,"borderColor": "#000000"},
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
                    "borderWidth": {"top": 0,"right": 0,"bottom": 0,"left": 0},
                    "padding": {"top": 5,"right": 5,"bottom": 5,"left": 5}
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
                    "borderWidth": {"top": 0.1,"right": 0.1,"bottom": 0.1,"left": 0.1},
                    "padding": {"top": 5,"right": 5,"bottom": 5,"left": 5}
                },
                "columnStyles": {}
            }
        }
    ],
    "basePdf": { "width": 210, "height": 297, "padding": [10,10,10,10] }
}
```

You can configure the generator's input for the above template like this:

```json
[
  {
    "mytable": [
      [
          "Alice",
          "New York",
          "Alice is a freelance web designer and developer"
      ],
      [
          "Bob",
          "Paris",
          "Bob is a freelance illustrator and graphic designer"
      ]
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
      [
          "Alice",
          "New York",
          "Alice is a freelance web designer and developer"
      ],
      [
          "Bob",
          "Paris",
          "Bob is a freelance illustrator and graphic designer"
      ],
      [
          "Charlie",
          "London",
          "Charlie is a freelance photographer"
      ]
  ]
  }
]
```

![Table with 3 rows](/img/table-generated-pdf2.png)

If the input data spans multiple pages, automatic page breaks will be inserted.

![Table with page breaks](/img/table-generated-pdf3.png)

## Sample Using Table Schema

You can check out a sample using the table schema at [https://playground.pdfme.com/](https://playground.pdfme.com/).

[![Table schema Playground](/img/table-invoice-template.png)](https://playground.pdfme.com/)

Set the Template Preset to Invoice and explore the sample using the Table schema.

The source code for this playground is available [here](https://github.com/pdfme/pdfme/tree/main/playground).

:::warning

There are still some bugs with this feature. For more details, please refer to the [related issue on GitHub](https://github.com/pdfme/pdfme/issues?q=is%3Aissue+is%3Aopen+label%3Atable).

We are working to resolve these issues. 

If you encounter any issues, please let us know.
Your contributions greatly contribute to the development of pdfme. Contributions for bug fixes are highly welcome.
Please collaborate with us to resolve these issues.

:::

:::info

If you have feedback or suggestions regarding the use of the table schema, please let us know via [GitHub issues](https://github.com/pdfme/pdfme/issues) or [Discord](https://discord.gg/xWPTJbmgNV).  
Your feedback contributes significantly to the development of pdfme.

:::

