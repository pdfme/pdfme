# Converter

`@pdfme/converter` can be used in both Node.js and in the browser.  

Its primary purpose is to convert PDFs into other formats (like images) or to convert various data formats (like Markdown) into PDFs.

Although it’s still under development, you can already use the following features:

- **Convert PDF to Images**: [pdf2img](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts)
- **Retrieve Each Page’s Width and Height**: [pdf2size](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2size.ts)

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

## Usage

For instance, the `pdf2img` function has the following TypeScript interface:

```ts
pdf2img(pdf: ArrayBuffer, options?: Pdf2ImgOptions): Promise<ArrayBuffer[]>
```
See the details here:  
[https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts](https://github.com/pdfme/pdfme/blob/main/packages/converter/src/pdf2img.ts)

Below is an example in TypeScript that reads a local PDF, converts the first page into a PNG, and saves it as a thumbnail:

```ts
import fs from 'fs';
import path from 'path';
import { pdf2img } from '@pdfme/converter';

async function generateThumbnail(pdfPath: string, thumbnailPath: string): Promise<void> {
  try {
    const pdf = fs.readFileSync(pdfPath);
    const pdfArrayBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);

    const images = await pdf2img(pdfArrayBuffer, {
      imageType: 'png',
      range: { end: 1 },
    });

    const thumbnail = images[0];
    fs.writeFileSync(thumbnailPath, Buffer.from(thumbnail));

    console.log(`Thumbnail saved to ${thumbnailPath}`);
  } catch (err) {
    console.error(`Failed to generate thumbnail from ${pdfPath} to ${thumbnailPath}`, err);
  }
}
```

For reference, check out the [thumbnail generation script](https://github.com/pdfme/pdfme/blob/main/playground/scripts/generate-templates-thumbnail.js) in the repository’s playground directory.

## Contact

If you have any questions or suggestions about `@pdfme/converter`, please reach out via:

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)