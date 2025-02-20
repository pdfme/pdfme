# Converter

`@pdfme/converter` can be used in both Node.js and in the browser.  

Its primary purpose is to convert PDFs into other formats (like images) or to convert various data formats (like Markdown) into PDFs.

Although it's still under development, you can already use the following features:

- **Convert PDF to Images**: [pdf2img](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts)
- **Retrieve Each Page's Width and Height**: [pdf2size](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2size.ts)
- **Convert Images to PDF**: [img2pdf](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/img2pdf.ts)

Planned conversion features include:
- **Markdown to PDF**: `md2pdf`
- **PDF to Markdown**: `pdf2md`

## Installation

```bash
npm install @pdfme/converter
```

If you want to convert PDFs to images (`pdf2img`) in Node.js, you’ll need [node-canvas](https://github.com/Automattic/node-canvas) (^2.11.2), which requires an additional step:

```bash
npm install canvas@^2.11.2
```

## Features

### pdf2img
Converts PDF pages into images (JPEG or PNG format).

```ts
import { pdf2img } from '@pdfme/converter';

const pdf = new ArrayBuffer(...); // Source PDF
const images = await pdf2img(pdf, {
  imageType: 'png', // 'jpeg' or 'png' (default: 'jpeg')
  scale: 1, // Scale factor (default: 1)
  range: { start: 0, end: 1 }, // Convert specific pages (default: all pages)
});
```

Options:
- `imageType`: Output image format ('jpeg' or 'png')
- `scale`: Scale factor for the output images
- `range`: Page range to convert
  - `start`: First page to convert (0-based index)
  - `end`: Last page to convert (0-based index)

Error handling:
- Invalid PDF: `[@pdfme/converter] Invalid PDF`
- Empty PDF: `[@pdfme/converter] The PDF file is empty`
- Invalid page range: `[@pdfme/converter] Invalid page range`

### img2pdf
Converts one or more images (JPEG or PNG) into a single PDF file. Each image becomes a page in the output PDF.

```ts
import { img2pdf } from '@pdfme/converter';

const image1 = new ArrayBuffer(...); // First image
const image2 = new ArrayBuffer(...); // Second image
const pdf = await img2pdf([image1, image2], {
  scale: 1, // Scale factor (default: 1)
  imageType: 'jpeg', // 'jpeg' or 'png' (optional, auto-detected if not specified)
});
```

Options:
- `scale`: Scale factor for the output PDF pages
- `imageType`: Specify the image type if known ('jpeg' or 'png')

Error handling:
- Empty input: `[@pdfme/converter] Input must be a non-empty array of image buffers`
- Invalid image: `[@pdfme/converter] Failed to process image`


## Types

```ts
interface Pdf2ImgOptions {
  scale?: number;
  imageType?: 'jpeg' | 'png';
  range?: {
    start?: number;
    end?: number;
  };
}

interface Img2PdfOptions {
  scale?: number;
  imageType?: 'jpeg' | 'png';
}
```

## Contact

If you have any questions or suggestions about `@pdfme/converter`, please reach out via:

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
