## @pdfme/converter

This library provides utility functions for converting PDFs to other formats or converting data—such as Markdown—into PDF(WIP).

## Markdown to pdfme template

`md2pdf` converts GitHub Flavored Markdown into a pdfme `Template` and `inputs` pair.

```ts
import { md2pdf } from '@pdfme/converter/md2pdf';

const { template, inputs } = await md2pdf('# Hello\n\nVisit [pdfme](https://pdfme.com).');
```

The initial MVP emits text, headings, lists, tables, code blocks, blockquotes, horizontal rules, and data URI images. `md2pdf` is exposed as a subpath export so normal converter imports do not pull the Markdown parser into browser bundles.

When passing the result to `generate`, register the plugins for the Markdown features you use. Horizontal rules (`---`) are emitted as `line` schemas, so documents that contain them need the `Line` plugin.

### CJK and Japanese text

The default pdfme font is Roboto, which does not include Japanese/CJK glyphs. For Japanese Markdown, set a CJK-capable `fontName` during conversion and pass the same font to `generate` or UI options.

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

Current limitations:

- Pagination is handled by pdfme dynamic layout after conversion. Long text/list/table content can split across pages, while image keep-together behavior is intentionally basic.
- Table cells are plain text; inline Markdown styling inside cells is stripped.
- Code block language tags are parsed but not rendered yet.
- Blockquotes are rendered as indented text with a light background, not as full nested block layouts.
- Remote Markdown images are emitted as links for now; image fetching/asset metadata is left for a later step.
- PNG/JPEG data URI images are rendered at a fixed initial height and do not preserve aspect ratio yet.
- Complex list item children such as nested code blocks or blockquotes are flattened into list item text.

For the complete pdfme documentation, see [this link](https://pdfme.com/docs/converter).
