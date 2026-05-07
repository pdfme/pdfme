import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore
import { generate } from '@pdfme/generator';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PAGE_SIZE_PRESETS } from '@pdfme/common';
import { line, list, table, text } from '@pdfme/schemas';
import { md2pdf } from '../src/md2pdf.js';
import {
  pdf2img as nodePdf2Img,
  pdf2size as nodePdf2Size,
  img2pdf,
} from '../src/index.node.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const notoSansJPData = readFileSync(
  path.join(__dirname, '../../generator/__tests__/assets/fonts/NotoSansJP-Regular.ttf'),
);

const a4BasePdf = (padding: [number, number, number, number] = [20, 10, 20, 10]) => ({
  ...PAGE_SIZE_PRESETS.A4,
  padding,
});

describe('pdf2img tests', () => {
  let pdfArrayBuffer: ArrayBuffer | Uint8Array;

  beforeAll(async () => {
    const pdf = await generate({
      template: {
        schemas: [
          [
            {
              name: 'field1',
              type: 'text',
              content: 'Type Something...',
              position: { x: 10, y: 20 },
              width: 45,
              height: 10,
            },
          ],
        ],
        basePdf: a4BasePdf(),
        pdfmeVersion: '5.2.16',
      },
      inputs: [
        { field1: 'hello-1' },
        { field1: 'hello-2' },
        { field1: 'hello-3' },
        { field1: 'hello-4' },
      ],
    });
    pdfArrayBuffer = new Uint8Array(pdf.buffer);
  });

  test('Node.js version - returns array of images', async () => {
    const images = await nodePdf2Img(pdfArrayBuffer, { scale: 1 });
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBe(4);
    expect(images[0]).toBeInstanceOf(ArrayBuffer);
    expect(images[0].byteLength).toBeGreaterThan(0);
  });

  test('Node.js version - rendered image is not blank', async () => {
    const images = await nodePdf2Img(pdfArrayBuffer, { scale: 1, imageType: 'png' });
    const image = await loadImage(Buffer.from(new Uint8Array(images[0])));
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');

    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    let nonWhitePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (!(a === 0 || (r === 255 && g === 255 && b === 255))) {
        nonWhitePixels += 1;
      }
    }

    expect(nonWhitePixels).toBeGreaterThan(0);
  });

  test('pageNumbers option - should render only specified pages', async () => {
    const images = await nodePdf2Img(pdfArrayBuffer, {
      scale: 1,
      range: { start: 0, end: 1 },
    });

    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBe(2);

    images.forEach((img) => {
      expect(img).toBeInstanceOf(ArrayBuffer);
      expect(img.byteLength).toBeGreaterThan(0);
    });
  });

  test('invalid PDF input - should throw error', async () => {
    const invalidBuffer = new ArrayBuffer(10);
    await expect(nodePdf2Img(invalidBuffer, { scale: 1 })).rejects.toThrow('Invalid PDF');
  });

  test('empty buffer input - should throw error', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    await expect(nodePdf2Img(emptyBuffer, { scale: 1 })).rejects.toThrow(
      'The PDF file is empty, i.e. its size is zero by',
    );
  });
});
describe('img2pdf tests', () => {
  let jpegImage: ArrayBuffer;
  let pngImage: ArrayBuffer;

  beforeAll(async () => {
    // Create test images using pdf2img for testing
    const pdf = await generate({
      template: {
        schemas: [
          [
            {
              name: 'field1',
              type: 'text',
              content: 'Type Something...',
              position: { x: 10, y: 20 },
              width: 45,
              height: 10,
            },
          ],
        ],
        basePdf: a4BasePdf(),
        pdfmeVersion: '5.2.16',
      },
      inputs: [{ field1: 'hello-1' }],
    });
    const images = await nodePdf2Img(new Uint8Array(pdf.buffer), { scale: 1 });
    jpegImage = images[0];
    pngImage = images[0]; // Using same image for both tests
  });

  test('converts single image to PDF', async () => {
    const pdf = await img2pdf([jpegImage]);
    expect(pdf).toBeInstanceOf(ArrayBuffer);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('converts multiple images to single PDF', async () => {
    const pdf = await img2pdf([jpegImage, pngImage]);
    expect(pdf).toBeInstanceOf(ArrayBuffer);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('handles scale option', async () => {
    const pdf = await img2pdf([jpegImage], { scale: 0.5 });
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('throws error for empty input', async () => {
    await expect(img2pdf([])).rejects.toThrow('Input must be a non-empty array');
  });

  test('throws error for invalid image', async () => {
    const invalidImage = new ArrayBuffer(10);
    await expect(img2pdf([invalidImage])).rejects.toThrow('Failed to process image');
  });

  test('handles size option', async () => {
    const customSize = { width: 100, height: 150 }; // in millimeters
    const pdf = await img2pdf([jpegImage], { size: customSize });
    expect(pdf).toBeInstanceOf(ArrayBuffer);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('handles margin option', async () => {
    const margins: [number, number, number, number] = [10, 20, 30, 40]; // in millimeters [top, right, bottom, left]
    const pdf = await img2pdf([jpegImage], { margin: margins });
    expect(pdf).toBeInstanceOf(ArrayBuffer);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('handles both size and margin options', async () => {
    const customSize = { width: 100, height: 150 }; // in millimeters
    const margins: [number, number, number, number] = [10, 20, 30, 40]; // in millimeters [top, right, bottom, left]
    const pdf = await img2pdf([jpegImage], {
      size: customSize,
      margin: margins,
    });
    expect(pdf).toBeInstanceOf(ArrayBuffer);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('uses default margin [0,0,0,0] when margin is omitted', async () => {
    // This test verifies the default behavior is maintained
    const pdf1 = await img2pdf([jpegImage]);
    const pdf2 = await img2pdf([jpegImage], {
      margin: [0, 0, 0, 0] as [number, number, number, number],
    });

    const [rendered1] = await nodePdf2Img(pdf1, { imageType: 'png' });
    const [rendered2] = await nodePdf2Img(pdf2, { imageType: 'png' });
    const image1 = await loadImage(Buffer.from(new Uint8Array(rendered1)));
    const image2 = await loadImage(Buffer.from(new Uint8Array(rendered2)));

    expect(image1.width).toBe(image2.width);
    expect(image1.height).toBe(image2.height);

    const canvas1 = createCanvas(image1.width, image1.height);
    const context1 = canvas1.getContext('2d');
    context1.drawImage(image1, 0, 0);
    const pixels1 = context1.getImageData(0, 0, image1.width, image1.height).data;

    const canvas2 = createCanvas(image2.width, image2.height);
    const context2 = canvas2.getContext('2d');
    context2.drawImage(image2, 0, 0);
    const pixels2 = context2.getImageData(0, 0, image2.width, image2.height).data;

    expect(Buffer.compare(Buffer.from(pixels1), Buffer.from(pixels2))).toBe(0);
  });
});

describe('pdf2size tests', () => {
  let pdfArrayBuffer: ArrayBuffer | Uint8Array;

  beforeAll(async () => {
    const pdf = await generate({
      template: {
        schemas: [
          [
            {
              name: 'field1',
              type: 'text',
              content: 'Type Something...',
              position: { x: 10, y: 20 },
              width: 45,
              height: 10,
            },
          ],
        ],
        basePdf: a4BasePdf(),
        pdfmeVersion: '5.2.16',
      },
      inputs: [{}, {}, {}, {}],
    });
    pdfArrayBuffer = new Uint8Array(pdf.buffer);
  });

  test('returns array of page sizes', async () => {
    const sizes = await nodePdf2Size(pdfArrayBuffer, { scale: 1 });
    expect(Array.isArray(sizes)).toBe(true);
    expect(sizes.length).toBe(4);
    sizes.forEach((size) => {
      expect(typeof size.width).toBe('number');
      expect(typeof size.height).toBe('number');
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });
  });

  test('scale option - properly adjusts size', async () => {
    const scale = 0.5;
    const sizes = await nodePdf2Size(pdfArrayBuffer, { scale });
    sizes.forEach((size) => {
      expect(size.width).toBeLessThan(200);
      expect(size.height).toBeLessThan(300);
    });
  });

  test('invalid PDF input - should throw error', async () => {
    const invalidBuffer = new ArrayBuffer(10);
    await expect(nodePdf2Size(invalidBuffer, { scale: 1 })).rejects.toThrow('Invalid PDF');
  });

  test('empty buffer input - should throw error', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    await expect(nodePdf2Size(emptyBuffer, { scale: 1 })).rejects.toThrow(
      'The PDF file is empty, i.e. its size is zero by',
    );
  });
});

describe('md2pdf tests', () => {
  test('converts GFM blocks into a pdfme template and inputs', async () => {
    const { template, inputs } = await md2pdf(`# Hello [PDFme](https://pdfme.com)

A **bold** paragraph with ~~deleted~~ text.

---

- [x] Done
- [ ] Todo
  - Nested

| Name | Value |
| ---- | ----- |
| **A** | [1](https://example.com) |
| B | 2 |

\`\`\`ts
const value = 1;
\`\`\`
`);

    const schemas = template.schemas[0];
    expect(template.basePdf).toEqual({
      width: 210,
      height: 297,
      padding: [20, 15, 20, 15],
    });
    expect(inputs).toEqual([{}]);
    expect(schemas.map((schema) => schema.type)).toEqual([
      'text',
      'text',
      'line',
      'list',
      'table',
      'text',
    ]);

    expect(schemas[0]).toMatchObject({
      name: 'hello-pdfme',
      type: 'text',
      content: 'Hello [PDFme](https://pdfme.com)',
      lineHeight: 1.25,
      fontColor: '#111827',
      textFormat: 'inline-markdown',
      overflow: 'expand',
    });
    expect(schemas[1]).toMatchObject({
      content: 'A **bold** paragraph with ~~deleted~~ text.',
      textFormat: 'inline-markdown',
    });
    expect(schemas[2]).toMatchObject({
      type: 'line',
      height: 0.25,
      color: '#d0d7de',
    });
    expect(JSON.parse(String(schemas[3].content))).toEqual(['[x] Done', '[ ] Todo', '\tNested']);
    expect(schemas[3]).toMatchObject({
      type: 'list',
      listStyle: 'bullet',
      textFormat: 'inline-markdown',
      overflow: 'expand',
    });
    expect(schemas[4]).toMatchObject({
      type: 'table',
      head: ['Name', 'Value'],
      headWidthPercentages: [50, 50],
      tableStyles: {
        borderColor: '#d0d7de',
        borderWidth: 0.2,
      },
      headStyles: {
        backgroundColor: '#f6f8fa',
        borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
      },
      bodyStyles: {
        borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
        alternateBackgroundColor: '#f9fafb',
      },
    });
    expect(JSON.parse(String(schemas[4].content))).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
    expect(schemas[5]).toMatchObject({
      type: 'text',
      content: 'const value = 1;',
      backgroundColor: '#f6f8fa',
      borderColor: '#d0d7de',
      borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
      padding: { top: 2, right: 3, bottom: 2, left: 3 },
      textFormat: 'plain',
      overflow: 'expand',
    });
  });

  test('sanitizes unsafe links and falls back for remote markdown images', async () => {
    const { template } = await md2pdf(
      '[safe](#hello) [bad](javascript:alert(1))\n\n![Logo](https://example.com/logo.png)',
    );
    const schemas = template.schemas[0];

    expect(schemas[0].content).toBe('[safe](#hello) bad');
    expect(schemas[1]).toMatchObject({
      type: 'text',
      content: '[Logo](https://example.com/logo.png)',
      textFormat: 'inline-markdown',
    });
  });

  test('emits data URI markdown images as image schemas', async () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    const { template } = await md2pdf(`![pixel](${png})`);

    expect(template.schemas[0][0]).toMatchObject({
      type: 'image',
      content: png,
      readOnly: true,
    });
  });

  test('accepts page size and margin options', async () => {
    const { template } = await md2pdf('Hello', {
      page: {
        size: 'Letter',
        orientation: 'landscape',
        margin: { x: 10, y: 12 },
      },
    });

    expect(template.basePdf).toEqual({
      width: 279.4,
      height: 215.9,
      padding: [12, 10, 12, 10],
    });
  });

  test('lets generator dynamic layout split long markdown without pre-splitting the template', async () => {
    const markdown = Array.from({ length: 70 }, (_, index) => `Paragraph ${index + 1}`).join('\n\n');
    const { template, inputs } = await md2pdf(markdown);

    expect(template.schemas.length).toBe(1);

    const pdf = await generate({
      template,
      inputs,
      plugins: { Text: text },
    });
    const pageSizes = await nodePdf2Size(pdf);

    expect(pageSizes.length).toBeGreaterThan(1);
  });

  test('renders blockquotes as indented text instead of literal markdown quotes', async () => {
    const { template } = await md2pdf('> Quote line');
    const schema = template.schemas[0][0];

    expect(schema).toMatchObject({
      type: 'text',
      content: 'Quote line',
      backgroundColor: '#f8fafc',
      borderColor: '#d0d7de',
      borderWidth: { top: 0, right: 0, bottom: 0, left: 0.8 },
      padding: { top: 2, right: 3, bottom: 2, left: 3 },
    });
    expect(schema.position.x).toBe(15);
  });

  test('deduplicates heading slugs with a _1 suffix', async () => {
    const { template } = await md2pdf('# Same\n\n# Same');

    expect(template.schemas[0].map((schema) => schema.name)).toEqual(['same', 'same_1']);
  });

  test('generates a PDF from the converted markdown template', async () => {
    const { template, inputs } = await md2pdf(`# Title

Visit [pdfme](https://pdfme.com).

---

- Alpha
- Beta

| Key | Value |
| --- | ----- |
| One | 1 |
`);

    const pdf = await generate({
      template,
      inputs,
      plugins: { Text: text, List: list, Table: table, Line: line },
    });

    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  test('generates a Japanese PDF when the caller provides a CJK font', async () => {
    const { template, inputs } = await md2pdf('# 日本語\n\nこれはPDF生成のテストです。', {
      style: { fontName: 'NotoSansJP' },
    });

    expect(template.schemas[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', fontName: 'NotoSansJP' }),
      ]),
    );

    const pdf = await generate({
      template,
      inputs,
      plugins: { Text: text },
      options: {
        font: {
          NotoSansJP: { data: notoSansJPData, fallback: true, subset: false },
        },
      },
    });

    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
