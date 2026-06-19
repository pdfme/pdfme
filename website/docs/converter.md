# Converter

`@pdfme/converter` can be used in both Node.js and in the browser.  

Its primary purpose is to convert PDFs into other formats (like images) or to convert various data formats (like Markdown) into PDFs.

Although it's still under development, you can already use the following features:

- **Convert PDF to Images**: [pdf2img](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts)
- **Retrieve Each Page's Width and Height**: [pdf2size](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2size.ts)
- **Convert Images to PDF**: [img2pdf](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/img2pdf.ts)
- **Markdown to PDF**: `md2pdf`

Planned conversion features include:
- **PDF to Markdown**: `pdf2md`

## Installation

```bash
npm install @pdfme/converter
```

`pdf2img` works in Node.js without any extra install step. It uses PDFium through `clawpdf`, so Node.js 20 or later is required for Node.js usage.

## Features

### pdf2img
Converts PDF pages into PNG images.

```ts
import { pdf2img } from '@pdfme/converter';

const pdf = new ArrayBuffer(...); // Source PDF
const images = await pdf2img(pdf, {
  scale: 1,
  range: { start: 0, end: 1 },
});
```

### pdf2size
Retrieves the width and height of each page in a PDF.

```ts
import { pdf2size } from '@pdfme/converter';

const pdf = new ArrayBuffer(...); // Source PDF
const sizes = await pdf2size(pdf, {
  scale: 1, // Scale factor (default: 1)
});
// sizes: Array<{ width: number, height: number }>
```

### img2pdf
Converts one or more images (JPEG or PNG) into a single PDF file.

```ts
import { img2pdf } from '@pdfme/converter';

const image1 = new ArrayBuffer(...); // First image
const image2 = new ArrayBuffer(...); // Second image
const pdf = await img2pdf([image1, image2], {
  scale: 1,
  size: { width: 210, height: 297 },
  margin: [10, 10, 10, 10],
});
```

### md2pdf (beta)
Converts GitHub Flavored Markdown into a pdfme `Template` and `inputs` pair.

```ts
import { md2pdf } from '@pdfme/converter/md2pdf';

const { template, inputs } = await md2pdf('# Hello\n\nVisit [pdfme](https://pdfme.com).');
```

You can try it in the [md2pdf playground](https://playground.pdfme.com/md2pdf), which includes a few
sample Markdown presets for quick checks.

`md2pdf` is exposed as a subpath export so regular `@pdfme/converter` imports do not pull Markdown parser dependencies into browser bundles.

To generate a PDF, pass the returned `template` and `inputs` to `@pdfme/generator` and register the schema plugins used by your Markdown document.

```ts
import { md2pdf } from '@pdfme/converter/md2pdf';
import { generate } from '@pdfme/generator';
import { image, line, list, table, text } from '@pdfme/schemas';

const { template, inputs } = await md2pdf(`
# Release notes

- Markdown becomes pdfme schemas.
- Horizontal rules become line schemas.

---

| Feature | Status |
| --- | --- |
| Tables | Supported |
`);

const pdf = await generate({
  template,
  inputs,
  plugins: {
    Text: text,
    List: list,
    Table: table,
    Image: image,
    Line: line,
  },
});
```

#### Japanese and CJK text
The default pdfme font is Roboto, which does not include Japanese/CJK glyphs. For Japanese Markdown, set a CJK-capable `fontName` during conversion and pass the same font to the generator or UI options.

```ts
import { readFile } from 'node:fs/promises';
import { md2pdf } from '@pdfme/converter/md2pdf';
import { generate } from '@pdfme/generator';
import { image, line, list, table, text } from '@pdfme/schemas';

const fontData = await readFile('./fonts/NotoSansJP-Regular.ttf');
const { template, inputs } = await md2pdf('# 日本語\n\nこれはPDF生成のテストです。', {
  style: { fontName: 'NotoSansJP' },
});

const pdf = await generate({
  template,
  inputs,
  plugins: { Text: text, List: list, Table: table, Image: image, Line: line },
  options: {
    font: {
      NotoSansJP: { data: fontData, fallback: true, subset: false },
    },
  },
});
```

If you pass `basePdf`, `md2pdf` uses it directly instead of creating a blank PDF from `page` options. The value is the same `BlankPdf` object used by pdfme templates, so it can include `staticSchema`.

#### Current limitations
`md2pdf` covers practical GFM blocks, but it is not a complete GitHub Markdown renderer yet.

- Paragraphs, headings, lists, tables, code blocks, blockquotes, horizontal rules, links, and PNG/JPEG data URI images are supported.
- Pagination is handled by pdfme dynamic layout after conversion. Text, lists, and tables can split across pages; image keep-together behavior is intentionally basic.
- Table cells are plain text. Inline Markdown styling inside table cells is stripped.
- Code block language tags are parsed but not rendered yet.
- Blockquotes are rendered with a simple background, padding, and left rule, not as nested block layouts.
- Remote Markdown images are emitted as links for now. Fetching remote images and carrying asset metadata is left for a later step.
- PNG/JPEG data URI images use a fixed initial height and do not preserve aspect ratio yet.
- Complex list item children such as nested code blocks or blockquotes are flattened into list item text.

## Error Handling

All functions throw descriptive errors when invalid parameters are provided:

- Invalid PDF: `[@pdfme/converter] Invalid PDF`
- Empty PDF: `[@pdfme/converter] The PDF file is empty`
- Invalid page range: `[@pdfme/converter] Invalid page range`
- Empty image array: `[@pdfme/converter] Input must be a non-empty array of image buffers`
- Invalid image: `[@pdfme/converter] Failed to process image`

## Types

```ts
import type { BlankPdf, PageOrientation, PageSize } from '@pdfme/common';

interface PageRange {
  start?: number;
  end?: number;
}

interface Pdf2ImgOptions {
  scale?: number;
  range?: PageRange;
}

interface Pdf2SizeOptions {
  scale?: number;
}

interface Img2PdfOptions {
  scale?: number;
  size?: { height: number, width: number }; // in millimeters
  margin?: [number, number, number, number]; // in millimeters [top, right, bottom, left]
}

type BoxSides = { top?: number, right?: number, bottom?: number, left?: number, x?: number, y?: number };
type MarkdownMargin = number | [number, number, number, number] | BoxSides;

interface Md2PdfOptions {
  page?: {
    size?: PageSize;
    orientation?: PageOrientation;
    margin?: MarkdownMargin;
  };
  basePdf?: BlankPdf;
  style?: {
    fontName?: string;
    fontSize?: number;
    lineHeight?: number;
    fontColor?: string;
    headingScale?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, number>>;
  };
}
```

## Contact

If you have any questions or suggestions about `@pdfme/converter`, please reach out via:

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
