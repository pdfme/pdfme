import { generate } from '@pdfme/generator';
import { pdf2img as nodePdf2Img } from '../src/index.node';

describe('pdf2img tests', () => {
  let pdfArrayBuffer: ArrayBuffer;

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
        basePdf: { width: 210, height: 297, padding: [20, 10, 20, 10] },
        pdfmeVersion: '5.2.16',
      },
      inputs: [{}, {}, {}, {}],
    });
    pdfArrayBuffer = pdf.buffer;
  });

  test('Node.js version - returns array of images', async () => {
    const images = await nodePdf2Img(pdfArrayBuffer, { scale: 1 });
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBe(4); // Should have 1 image for 1 page
    expect(images[0]).toBeInstanceOf(ArrayBuffer);
    expect(images[0].byteLength).toBeGreaterThan(0);
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
      'The PDF file is empty, i.e. its size is zero by'
    );
  });
});
