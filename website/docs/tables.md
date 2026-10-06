# Tables with Dynamic Data

[![Preview of Dynamic Tables](/img/table.png)](https://playground.pdfme.com/)

The table schema has been added in since [V4.5.0](https://github.com/pdfme/pdfme/releases/tag/4.5.0).  
This schema allows you to add tables to PDFs and dynamically modify the table data.

## Using the Table Schema

The table schema is included in the `@pdfme/schemas` package and is exported as `table`.  
You can add the table schema as a plugin to `@pdfme/ui` and `@pdfme/generator` using the code below.

To support page breaks, ensure to set the `basePdf` property in the template to `{ width: number, height: number, padding: [number,number,number,number] }`. Custom PDF data used as `basePdf` keeps the original pages fixed, so dynamic layout and automatic page breaks are not applied.

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

## Image columns

A column can opt in to images. Columns without `cellType` stay text, and existing templates render the same way. `inputs` and `content` are still `string[][]`. An image cell's value is a PNG or JPEG data URL.

```json
{
  "head": ["Name", "Photo", "Note"],
  "headWidthPercentages": [30, 30, 40],
  "columnStyles": {
    "alignment": { "1": "center" },
    "verticalAlignment": { "1": "middle" },
    "cellType": { "1": "image" },
    "imageHeightMode": { "1": "fixed" },
    "imageHeight": { "1": 20 }
  },
  "content": "[[\"Alice\",\"data:image/png;base64,iVBORw0KGgo...\",\"Workshop\"]]"
}
```

`imageHeightMode` and `imageHeight` are stored separately, so switching between `fixed` and `auto` does not clear the millimeter value.

- `fixed` (the default) gives every cell in the column the same image height. That height is 20mm when `imageHeight` is omitted or is not a finite number greater than 0. Empty and invalid values keep that height, so the row does not collapse and page breaks stay predictable. 20mm also keeps a single default row from growing past one page.
- `auto` sets the image height to `inner width × image height / image width`. An empty or invalid value contributes no image height, and the row follows the other cells. On a blank `basePdf`, the height is capped so the row, the header (when `showHead` is true), the cell's vertical padding and border, and a 1mm margin still fit in the page content box. A custom PDF `basePdf` is not reflowed, so that cap is not applied.

Only `data:image/png;base64,...` and `data:image/jpeg;base64,...` (or `image/jpg`) are drawn. `http` URLs, gif, webp, svg, any other string, and broken base64 are not drawn. `null` is unsupported: it is not drawn and does not warn. `""` is the same. A PNG or JPEG whose header is readable but whose bytes fail during embedding is skipped, and the warning below is logged once. Any other invalid value logs this warning once per distinct value:

```text
[@pdfme/schemas/table] unsupported image in column N; only PNG/JPEG data URL is supported
```

Keep sample images small (about 100KB or less). The data URL is copied into the template or the inputs.

Header cells are always text, even in an image column. A `cellType` of `null` is unsupported and is treated as text, without a warning. A column type this version does not know (for example a future `qrcode`) is treated as text, and that unknown value is warned about once.

Older pdfme versions ignore `cellType` and show the data URL as text.

### Choosing an image column

Select the table in the Designer. The **Column Style** card has one block per column. The name is the heading, or "Column N" when the heading is empty. Each block sets the cell type, horizontal alignment, and vertical alignment. An image column also sets the height mode. With more than six columns, each block starts collapsed and the summary line shows the name, type, and alignments. Opening a block keeps it open across later edits of that table. Six columns or fewer stay expanded, with no collapse control.

- **Text** is the default. An unknown type is shown as Text until you change it.
- **Image** sets that column's `cellType` to `"image"` and clears every body cell in the column. The heading is not changed, and header cells stay text.
- The first time a column becomes an image, pdfme writes `imageHeightMode: "fixed"` and `imageHeight: 20` when they are missing, and `alignment: "center"` only when alignment is missing. An alignment you already set is kept.
- Switching the column back to Text removes that column's `cellType`, `imageHeightMode`, and `imageHeight`. Empty maps are removed. Alignment and vertical alignment are left as they are, and the body cells are cleared again.
- Horizontal alignment writes only that column's `columnStyles.alignment`. Vertical alignment writes `columnStyles.verticalAlignment` the same way. Either value overrides the matching Head Style or Body Style for that column, including the header. A column with no value leaves the existing header and body alignment unchanged. Image cells use the same pair for `objectPosition`. Removing or renaming a column remaps `verticalAlignment` with the other per-column maps.

An image column also has a height mode:

- **Fixed height (mm)** uses one image height for every row. The field shows the stored height, or 20 when the stored value is missing or is not a finite number greater than 0. A value that is not a finite number greater than 0 is discarded and the field returns to the height it was showing.
- **Auto (fit width)** sizes the image from its aspect ratio. Switching between fixed and auto changes only `imageHeightMode` and keeps the millimeter value.

### Editing an image cell

Click a body cell in an image column. In the Designer, and in the Form when the table is not read-only, that cell shows **Select image**. **Remove image** appears once the cell has a value and sets the cell to `""`. The file input accepts PNG and JPEG only. Clicking an empty image cell opens the file dialog; if the browser does not open it, use Select image. A resolved PNG or JPEG is shown in the cell. An empty or invalid value shows the dotted placeholder.

Cells you are not editing stay as a picture, with no button and no file input. Header cells stay text. A read-only Form table and the Viewer do the same: the picture only, and the cursor is the default arrow. An editable image cell uses a pointer cursor.

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
