import generate from '../src/generate.js';
import { BLANK_PDF, type Template } from '@pdfme/common';
import { getImageSnapshotOptions, pdfToImages } from './utils.js';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from '@pdfme/pdf-lib';
import { barcodes } from '@pdfme/schemas';

const qrTemplate: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'qr',
        type: 'qrcode',
        content: '',
        position: { x: 10, y: 10 },
        width: 30,
        height: 30,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
    ],
  ],
};

const rotatedQrTemplate: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        ...qrTemplate.schemas[0][0],
        position: { x: 60, y: 70 },
        width: 35,
        height: 35,
        rotate: 37,
      },
    ],
  ],
};

const loadFirstPageContent = async (pdfBytes: Uint8Array<ArrayBuffer>) => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);
  const contents = page.node.Contents();
  const streams =
    contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, idx) => contents.lookup(idx, PDFRawStream))
      : contents instanceof PDFRawStream
        ? [contents]
        : [];
  const content = streams
    .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
    .join('\n');

  return { pdfDoc, page, content };
};

const pageHasImageXObject = (pdfDoc: PDFDocument, page: ReturnType<PDFDocument['getPage']>) => {
  const resources = page.node.Resources();
  const xobj = resources?.lookup(PDFName.of('XObject')) as
    | { entries?: () => Iterable<[{ encodedName: string }, unknown]> }
    | undefined;

  for (const [, ref] of xobj?.entries?.() ?? []) {
    const obj = pdfDoc.context.lookup(ref) as
      | { dict?: { get: (n: ReturnType<typeof PDFName.of>) => unknown } }
      | undefined;
    if (String(obj?.dict?.get?.(PDFName.of('Subtype'))) === '/Image') return true;
  }

  return false;
};

describe('barcode SVG PDF rendering', () => {
  test('renders QR codes with CMYK vector operators and no image XObject', async () => {
    const pdf = await generate({
      template: qrTemplate,
      inputs: [{ qr: 'https://pdfme.com/issue-460' }],
      plugins: { qrcode: barcodes.qrcode },
      options: { colorType: 'cmyk' },
    });
    const { pdfDoc, page, content } = await loadFirstPageContent(pdf);

    expect(content).toMatch(/(?:^|\s)0(?:\.0+)? 0(?:\.0+)? 0(?:\.0+)? 1(?:\.0+)? k(?:\s|$)/);
    expect(pageHasImageXObject(pdfDoc, page)).toBe(false);
  });

  test('renders QR codes through the RGB vector path by default', async () => {
    const pdf = await generate({
      template: qrTemplate,
      inputs: [{ qr: 'https://pdfme.com/issue-460-rgb' }],
      plugins: { qrcode: barcodes.qrcode },
    });
    const { pdfDoc, page, content } = await loadFirstPageContent(pdf);

    expect(content).toMatch(/(?:^|\s)0(?:\.0+)? 0(?:\.0+)? 0(?:\.0+)? rg(?:\s|$)/);
    expect(pageHasImageXObject(pdfDoc, page)).toBe(false);
  });

  test('renders rotated QR codes as visible vector SVG', async () => {
    const pdf = await generate({
      template: rotatedQrTemplate,
      inputs: [{ qr: 'https://pdfme.com/issue-460-rotated' }],
      plugins: { qrcode: barcodes.qrcode },
    });
    const { pdfDoc, page } = await loadFirstPageContent(pdf);
    const images = await pdfToImages(pdf);

    expect(pageHasImageXObject(pdfDoc, page)).toBe(false);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('rotated-qrcode-svg-1'));
  });
});
