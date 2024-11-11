# Headers and Footers

You can place elements like headers and footers that are displayed on every page and are not affected by page breaks.

Specifically, in cases where page breaks occur—such as with [dynamic tables](/docs/tables)—you can use this feature to place elements that are not pushed down by data.

For simplicity, we've described these as headers and footers. In reality, by adding a property called `staticSchema` to `basePdf`, you can place elements that are displayed on every page and are not affected by page breaks.

This feature cannot be used when `basePdf` specifies an existing PDF. It can only be used when `basePdf` is specified with properties of the type `{ width: number, height: number, padding: [number, number, number, number] }`.

## Example of a Footer

Let's explain using the footer section of an invoice template as an example.

```json
{
  "width": 210,
  "height": 297,
  "padding": [20, 20, 20, 20],
  "staticSchema": [
    {
      "name": "line",
      "type": "line",
      "position": {
        "x": 20,
        "y": 279
      },
      "width": 170,
      "height": 0.2,
      "rotate": 0,
      "opacity": 1,
      "color": "#999999",
      "required": false,
      "readOnly": true,
      "content": ""
    },
    {
      "name": "footerInfo",
      "type": "text",
      "content": "Invoice No.{info.InvoiceNo} • {totalInput} USD due {date}",
      "position": {
        "x": 20,
        "y": 282
      },
      "width": 122.51,
      "height": 10,
      "rotate": 0,
      "alignment": "left",
      "verticalAlignment": "middle",
      "fontSize": 13,
      "lineHeight": 1,
      "characterSpacing": 0,
      "fontColor": "#000000",
      "backgroundColor": "",
      "opacity": 1,
      "strikethrough": false,
      "underline": false,
      "required": false,
      "readOnly": true
    },
    {
      "name": "pageNumber",
      "type": "text",
      "content": "Page {currentPage} of {totalPages}",
      "position": {
        "x": 145,
        "y": 282
      },
      "width": 45,
      "height": 10,
      "rotate": 0,
      "alignment": "right",
      "verticalAlignment": "middle",
      "fontSize": 13,
      "lineHeight": 1,
      "characterSpacing": 0,
      "fontColor": "#000000",
      "backgroundColor": "",
      "opacity": 1,
      "strikethrough": false,
      "underline": false,
      "required": false,
      "readOnly": true
    }
  ]
}
```

Notably, you can specify variables like `{info.InvoiceNo}` and `{totalInput}` in the `content` of each schema. These values are obtained from the data specified in `input`. In other words, within `staticSchema`, you can refer to the data specified in `input`.

For information about usable variables, please refer to the Expression documentation [here](/docs/expression#variables-that-can-be-used-within-expressions).

![footer](/img/footer.png)

## Tips/Notes

- By placing elements within the padding, you can display them without overlapping with elements that are pushed down when page breaks occur.
- The `type` of the schema in `staticSchema` can specify the same types as the `schemas` in a regular template.
- Currently, the schemas in `staticSchema` cannot be edited in the designer.