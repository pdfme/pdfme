# Supported Features

In pdfme, the following elements can be rendered.  
For elements that are not supported, you can add your own rendering process using the [plugin mechanism](/docs/custom-schemas).

## Currently Supported

**For using schemas other than the Text schema, please refer to the following documentation.  
[Using Schemas from @pdfme/schemas](/docs/custom-schemas#using-schemas-from-pdfmeschemas)**

### Text (text)

- Style-related
  - Font Size
  - Letter Spacing
  - Text Align
  - Vertical Align
  - Line Height
  - Text Color
  - Background Color
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

### Multivariable Text (multiVariableText){#multivariable-text}

- As per text, but supporting 0 to n variables in a single text field

### Shape

- **Line (line)**
  - Style-related
    - Color
- **Rectangle (rectangle)**
  - Style-related
    - Border Width
    - Border Color
    - Color
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
