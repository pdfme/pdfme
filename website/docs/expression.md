# Expression

Expressions are a feature that evaluates expressions enclosed in `{}`.   
The simplest example is `{1+1}`, which evaluates to `2`.

In pdfme, expressions can be used not only for simple calculations but also by utilizing user input.

For example, consider the following template:

```
{
    "schemas": [
        [
            {
                "name": "field1",
                "type": "text",
                "content": "Hello world",
                ...
                "readOnly": false,
            },
            {
                "name": "field2",
                "type": "text",
                "content": "{field1} !", // Expression!
                ...
                "readOnly": true,
            }
        ]
    ],
    "basePdf": { "width": 210, "height": 297, "padding": [20, 10, 20, 10] },
    "pdfmeVersion": "5.0.0"
}
```

`field2` will have the value `Hello world !`. The expression `{field1} !` is evaluated like below:

![expression](/img/expression.png)

This means that `{field1}` is replaced with the value of `field1`, and `!` is appended to it.

## Use Cases

The following use cases can be considered:

### Displaying Date or Page Numbers in Footer and Header

For example, you might want to display the creation date of the PDF in the header or display page numbers in the footer. Although headers and footers are explained in detail [here](/docs/headers-and-footers), expressions can also be used in the `staticSchema` used for headers and footers.

### Reusing User Input for Display

You can reuse values entered by the user for display. For instance, if there are fields `firstName` and `lastName` entered by the user, you can concatenate and display them as `{firstName + " " + lastName}`.

This improves usability by eliminating the need for users to enter similar information multiple times.

### Managing Values in One Place

By using expressions, you can manage values in one place. For example, if there is a value `taxRate`, you can simply change `taxRate`, and it will be reflected in all places where it is used, making changes easier.

## How to Use, Specifications

After understanding the overview and use cases, here is an explanation of the specific usage and specifications.

### How to Use Expressions

Expressions can be used in the `schema` property when the `readOnly` property is set to `true`. From the designer, you can set `readOnly` by unchecking the `Editable` checkbox.

As shown in the GIF below, you can start using expressions by unchecking the `Editable` checkbox.

![Change ReadOnly](/img/expression-change-readOnly.gif)

In other words, fields where expressions are used cannot be edited by the user.

### Limitations and Security of Expressions

- Only Arrow Functions are supported.
- The `eval` function cannot be used.
- `prototype` cannot be used.
- Only the following global objects and their methods can be used:
  - Math
  - String
  - Number
  - Boolean
  - Array
  - Object
  - Date
  - JSON
  - isNaN
  - parseFloat
  - parseInt
  - decodeURI
  - decodeURIComponent
  - encodeURI
  - encodeURIComponent

For detailed specifications, refer to [this implementation](https://github.com/pdfme/pdfme/blob/main/packages/common/src/expression.ts).

### Variables That Can Be Used Within Expressions

- **User Input Values**
  - Values entered in [Multivariable Text](/docs/supported-features#multivariable-text) or [Table](/docs/supported-features#table) that can be parsed as JSON can be used after parsing.
- **Values of Other `readOnly` Fields**
  - If an expression is used in the value of another `readOnly` field, the value after the expression is evaluated is used.
- **Embedded Variables**
  - `currentPage`
  - `totalPages`
  - `date (YYYY/MM/DD)`
  - `dateTime (YYYY/MM/DD HH:mm)`

### Examples of Expressions

The following are examples of expressions that can be used:

- **subtotal:** `'{orders.reduce((sum, item) => sum + parseFloat(item[1] || 0) * parseFloat(item[2] || 0), 0)}'`
- **tax:** `'{Number(subtotalInput) * Number(tax.rate) / 100}'`
- **total:** `'${Number(subtotal) + Number(tax)}'`