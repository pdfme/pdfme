## @pdfme/converter

This library provides utility functions for converting PDFs to other formats or converting data—such as Markdown—into PDF(WIP).

## Markdown to pdfme template

`md2pdf` converts GitHub Flavored Markdown into a pdfme `Template` and `inputs` pair.

```ts
import { md2pdf } from '@pdfme/converter';

const { template, inputs } = await md2pdf('# Hello\n\nVisit [pdfme](https://pdfme.com).');
```

The initial MVP emits text, headings, lists, tables, code blocks, horizontal rules, and data URI images. Remote Markdown images are emitted as links for now; image fetching/asset metadata is intentionally left for a later step.

For the complete pdfme documentation, see [this link](https://pdfme.com/docs/converter).
