# Supported Features

In pdfme, the following elements can be rendered.  
For elements that are not supported, you can add your own rendering process using the [plugin mechanism](/docs/custom-schemas).

## Currently Supported

For using schemas other than the Text schema, please refer to the following documentation.  
[Using Schemas from @pdfme/schemas](/docs/custom-schemas#using-schemas-from-pdfmeschemas)

### Text
- Style-related
    - Font Size
    - Letter Spacing
    - Text Align
    - Vertical Align
    - Line Height
    - Text Color
    - Background Color
- Font-related
    - TrueType fonts (TTF & TTC)
    - OpenType fonts with PostScript or TrueType outlines (TTF, OTF, & OTC)
    - Support for CJK (Chinese, Japanese, Korean) fonts
    - Embedding and subsetting of fonts
    - Support for multiple fonts and fallback fonts
    - Dynamic Font Sizing
        - Detailed options for Min, Max, Fit
- Support Read only

### Shape
- Line
  - Style-related
    - Color
- Rectangle
    - Style-related
        - Border Width
        - Border Color
        - Color
- Ellipse
    - Style-related
        - Border Width
        - Border Color
        - Color

### Graphics
- Image
    - Formats
        - JPEG
        - PNG
    - Support Read only
- SVG
    - Support Read only

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

## Planned Support

- [HyperLink](https://github.com/pdfme/pdfme/issues/319)
- [Table](/docs/tables)
