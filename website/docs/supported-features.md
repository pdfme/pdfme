# Supported Features

In pdfme, the following elements can be rendered.  
For elements that are not supported, you can add your own rendering process using the [plugin mechanism](/docs/custom-schemas).

## Currently Supported

:::info

For using schemas other than the Text schema, please refer to the following documentation.  
[Using Schemas from @pdfme/schemas](/docs/custom-schemas#using-schemas-from-pdfmeschemas)

:::

## Dynamic Layout and Page Breaks

Some schemas can reflow their height before rendering. Text and Multivariable Text support this through `overflow: "expand"`, while List and Table use dynamic layout for long content and page breaks.

Dynamic layout and automatic page breaks require a blank `basePdf` object, such as `{ width: 210, height: 297, padding: [10, 10, 10, 10] }`. When `basePdf` is custom PDF data, pdfme keeps the original pages fixed and does not reflow schemas across pages. In the Designer, `overflow: "expand"` is disabled for Text and Multivariable Text when a custom `basePdf` is used.

The Designer canvas shows the authored schema boxes. Reflow is applied in Preview, Form, Viewer, and PDF generation.

### Text (text)

- Style-related
  - Font Size
  - Letter Spacing
  - Text Align
  - Vertical Align
  - Line Height
  - Text Color
  - Background Color
  - Border Color
  - Border Width
  - Padding
  - Underline
  - Strikethrough
- Font-related
  - TrueType fonts (TTF & TTC)
  - OpenType fonts with PostScript or TrueType outlines (TTF, OTF, & OTC)
  - Support for CJK (Chinese, Japanese, Korean) fonts
  - Embedding and subsetting of fonts
  - Support for multiple fonts and fallback fonts
  - Dynamic Font Sizing
    - Detailed options for Min, Max, Fit
- Overflow
  - Visible: keeps the schema's authored height and allows overflowing text to remain visible
  - Expand: measures the rendered text, grows the schema height, pushes following schemas down, and splits long text across pages when blank `basePdf` is used
  - Expand is grow-only and does not shrink below the authored height
  - Expand cannot be combined with Dynamic Font Sizing; when Expand is active, the normal Font Size is used for measuring and rendering
- Text Format
  - Plain text
  - Inline Markdown (`**bold**`, `*italic*`, `***bold italic***`, `~~strikethrough~~`) with automatic font variant fallback
- Text box styling
  - Background, border, and padding are rendered as the schema box, including when the text content is empty

### Multivariable Text (multiVariableText){#multivariable-text}

- As per text, but supporting 0 to n variables in a single text field
- Inline Markdown is supported in the template text while variable values are rendered as literal strings
- Supports the same `overflow: "expand"` behavior as Text after variable values are resolved
- Split Multivariable Text chunks remain editable for variable values in Form mode. Static inline-markdown text remains read-only.

### Shape

- **Line (line)**
  - Style-related
    - Color
- **Rectangle (rectangle)**
  - Style-related
    - Border Width
    - Border Color
    - Color
    - Radius
- **Ellipse (ellipse)**
  - Style-related
    - Border Width
    - Border Color
    - Color

### Graphics

- **Image (image)**
  - Formats
    - JPEG
    - PNG
    - PDF (embed pdf inside pdf)
- **SVG (svg)**

### Barcodes

- Various types
  - qrcode
  - japanpost
  - ean13
  - ean8
  - code39
  - code128
  - nw7
  - itf14
  - upca
  - upce
  - gs1datamatrix
  - pdf417
- Style-related
  - Bar Color
  - Background Color
  - Text Color
  - [Include text option (planned support)](https://github.com/pdfme/pdfme/issues/23)

### Table (table){#table}

Details: [Tables with Dynamic Data](/docs/tables)

- Style-related
  - Table
    - Border Width
    - Border Color
  - Header / Body
    - Font Name
    - Font Size
    - Letter Spacing
    - Text Align
    - Vertical Align
    - Line Height
    - Text Color
    - Border Color
    - Background Color
    - Border Width
    - Padding
  - Column
    - Text Align

### List (list)

- List Style
  - Bullet
  - Ordered (numbered)
- Layout
  - Marker Width
  - Marker Gap
  - Indent Size (for nested items)
  - Item Spacing
- Dynamic height with automatic page breaking for long lists
- Dynamic layout requires a blank `basePdf` object
- Inherits text styling options (font, size, color, alignment, etc.) from the Text schema

:::note

`__splitRange` is internal metadata used by pdfme while splitting Text, Multivariable Text, List, and Table schemas across pages. Template authors usually should not set or edit it directly.

:::

### Select (select)

- Options
- Style-related
  - Font Name
  - Font Size
  - Letter Spacing
  - Text Align
  - Vertical Align
  - Line Height
  - Text Color
  - Background Color

### Date (date) / Time (time) / DateTime (dateTime)

- Date Format
- Style-related
  - Font Name
  - Font Size
  - Letter Spacing
  - Text Align
  - Text Color
  - Background Color

### Radio Button (radioGroup) / Check Box (checkbox)

- Style-related
  - Color

## Planned Support

- [HyperLink](https://github.com/pdfme/pdfme/issues/319)

## Custom Feature Requests

While pdfme is an open-source project released under the MIT License, we are open to considering custom feature additions for a fee.  
**If you are willing to pay, we can evaluate and implement your requested features.**  
Please note that any additional functionality will always be released as open source. If this approach works for you, please [contact us](https://app.pdfme.com/contact).
