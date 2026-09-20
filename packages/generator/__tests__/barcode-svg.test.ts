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

const rotatedBarcodeTypesTemplate: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'code128',
        type: 'code128',
        content: '',
        position: { x: 20, y: 25 },
        width: 55,
        height: 22,
        rotate: 18,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
      {
        name: 'ean13',
        type: 'ean13',
        content: '',
        position: { x: 115, y: 25 },
        width: 45,
        height: 22,
        rotate: -22,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
      {
        name: 'japanpost',
        type: 'japanpost',
        content: '',
        position: { x: 25, y: 90 },
        width: 70,
        height: 20,
        rotate: 32,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
      {
        name: 'pdf417',
        type: 'pdf417',
        content: '',
        position: { x: 120, y: 88 },
        width: 55,
        height: 30,
        rotate: -35,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
      {
        name: 'gs1datamatrix',
        type: 'gs1datamatrix',
        content: '',
        position: { x: 70, y: 145 },
        width: 35,
        height: 35,
        rotate: 45,
        backgroundColor: '#ffffff',
        barColor: '#000000',
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

  test('renders rotated 1D and 2D barcode SVGs', async () => {
    const pdf = await generate({
      template: rotatedBarcodeTypesTemplate,
      inputs: [
        {
          code128: 'ABC-123',
          ean13: '1111111111116',
          japanpost: '10000131-3-2-B503',
          pdf417: 'PDF417 rotated',
          gs1datamatrix: '(01)12345678901231',
        },
      ],
      plugins: {
        code128: barcodes.code128,
        ean13: barcodes.ean13,
        japanpost: barcodes.japanpost,
        pdf417: barcodes.pdf417,
        gs1datamatrix: barcodes.gs1datamatrix,
      },
    });
    const { pdfDoc, page } = await loadFirstPageContent(pdf);
    const images = await pdfToImages(pdf);

    expect(pageHasImageXObject(pdfDoc, page)).toBe(false);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('rotated-barcode-types-svg-1'));
  });
});
