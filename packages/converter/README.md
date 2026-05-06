## @pdfme/converter

This library provides utility functions for converting PDFs to other formats or converting data—such as Markdown—into PDF(WIP).

## Markdown to pdfme template

`md2pdf` converts GitHub Flavored Markdown into a pdfme `Template` and `inputs` pair.

```ts
import { md2pdf } from '@pdfme/converter/md2pdf';

const { template, inputs } = await md2pdf('# Hello\n\nVisit [pdfme](https://pdfme.com).');
```

The initial MVP emits text, headings, lists, tables, code blocks, blockquotes, horizontal rules, and data URI images. `md2pdf` is exposed as a subpath export so normal converter imports do not pull the Markdown parser into browser bundles.

Current limitations:

- Pagination is block-level. Long text/list blocks still rely on pdfme dynamic layout, while table/image keep-together behavior is intentionally basic.
- Table cells are plain text; inline Markdown styling inside cells is stripped.
- Code block language tags are parsed but not rendered yet.
- Blockquotes are rendered as indented text with a light background, not as full nested block layouts.
- Remote Markdown images are emitted as links for now; image fetching/asset metadata is left for a later step.
- Data URI images are rendered at a fixed initial height and do not preserve aspect ratio yet.
- Complex list item children such as nested code blocks or blockquotes are flattened into list item text.

For the complete pdfme documentation, see [this link](https://pdfme.com/docs/converter).
