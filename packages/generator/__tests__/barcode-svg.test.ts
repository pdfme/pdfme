import generate from '../src/generate.js';
import { BLANK_PDF, type Template } from '@pdfme/common';
import { getImageSnapshotOptions, pdfToImages } from './utils.js';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
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
      {
        name: 'qr',
        type: 'qrcode',
        content: '',
        position: { x: 135, y: 145 },
        width: 35,
        height: 35,
        rotate: -28,
        backgroundColor: '#ffffff',
        barColor: '#000000',
      },
    ],
  ],
};

const barcodeBackgroundTemplate: Template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'wideQr',
        type: 'qrcode',
        content: '',
        position: { x: 15, y: 20 },
        width: 62,
        height: 24,
        backgroundColor: '#ff66cc',
        barColor: '#000000',
      },
      {
        name: 'rotatedCode128',
        type: 'code128',
        content: '',
        position: { x: 105, y: 30 },
        width: 58,
        height: 24,
        rotate: 28,
        backgroundColor: '#66ccff',
        barColor: '#000000',
      },
      {
        // bwip-js style hex without a leading hash must keep working.
        name: 'ean13',
        type: 'ean13',
        content: '',
        position: { x: 35, y: 92 },
        width: 46,
        height: 20,
        backgroundColor: 'ccff66',
        barColor: '#000000',
      },
      {
        // The hex alpha channel must translate into background transparency.
        name: 'rotatedPdf417',
        type: 'pdf417',
        content: '',
        position: { x: 120, y: 95 },
        width: 52,
        height: 28,
        rotate: -32,
        backgroundColor: '#ffcc6680',
        barColor: '#000000',
      },
      {
        // A fully transparent background must not paint a rectangle.
        name: 'transparentQr',
        type: 'qrcode',
        content: '',
        position: { x: 40, y: 150 },
        width: 30,
        height: 30,
        backgroundColor: '#00000000',
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

const pageGraphicsStateAlphas = (page: ReturnType<PDFDocument['getPage']>) => {
  const extGState = page.node.Resources()?.lookupMaybe(PDFName.of('ExtGState'), PDFDict);
  if (!extGState) return [];
  return extGState.keys().map((key) => {
    const graphicsState = extGState.lookup(key, PDFDict);
    return {
      ca: graphicsState.lookupMaybe(PDFName.of('ca'), PDFNumber)?.asNumber(),
      CA: graphicsState.lookupMaybe(PDFName.of('CA'), PDFNumber)?.asNumber(),
    };
  });
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
    // The schema-box background rectangle must honor colorType as well:
    // the white background becomes `0 0 0 0 k` and no RGB fill remains.
    expect(content).toMatch(/(?:^|\s)0(?:\.0+)? 0(?:\.0+)? 0(?:\.0+)? 0(?:\.0+)? k(?:\s|$)/);
    expect(content).not.toMatch(/(?:^|\s)rg(?:\s|$)/);
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

  test('renders rotated barcode SVGs', async () => {
    const pdf = await generate({
      template: rotatedBarcodeTypesTemplate,
      inputs: [
        {
          qr: 'https://pdfme.com/issue-460-rotated',
          code128: 'ABC-123',
          ean13: '1111111111116',
          japanpost: '10000131-3-2-B503',
          pdf417: 'PDF417 rotated',
          gs1datamatrix: '(01)12345678901231',
        },
      ],
      plugins: {
        qrcode: barcodes.qrcode,
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
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('rotated-barcodes-svg-1'));
  });

  test('strips hex alpha from bar and text colors instead of letting bwip-js misread them', async () => {
    // bwip-js reads 8-digit hex as CCMMYYKK: '#ff000080' used to render teal (#007f7f)
    // and its raw value leaked into the SVG root fill, adding a stray ~50% opacity in
    // the PDF only. The alpha channel must be dropped so bars render the opaque color.
    const template: Template = {
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
            backgroundColor: '',
            barColor: '#ff000080',
          },
          {
            name: 'code128',
            type: 'code128',
            content: '',
            position: { x: 10, y: 50 },
            width: 60,
            height: 20,
            backgroundColor: '',
            barColor: '#000000',
            textColor: '#0000ff80',
            includetext: true,
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{ qr: 'https://pdfme.com/alpha-barcolor', code128: 'ABC-123' }],
      plugins: { qrcode: barcodes.qrcode, code128: barcodes.code128 },
    });
    const { page, content } = await loadFirstPageContent(pdf);

    // The intended opaque colors: red QR modules and blue barcode text.
    expect(content).toMatch(/(?:^|\s)1(?:\.0+)? 0(?:\.0+)? 0(?:\.0+)? rg(?:\s|$)/);
    expect(content).toMatch(/(?:^|\s)0(?:\.0+)? 0(?:\.0+)? 1(?:\.0+)? rg(?:\s|$)/);
    // Not the CMYK misreads: teal (0 0.498 0.498) or olive (0.498 0.498 0).
    expect(content).not.toMatch(/0\.49\d+/);
    // No stray opacity inherited from the injected SVG root fill.
    for (const { ca, CA } of pageGraphicsStateAlphas(page)) {
      expect(ca === undefined || ca === 1).toBe(true);
      expect(CA === undefined || CA === 1).toBe(true);
    }
  });

  test('emits no graphics state for an opaque 6-digit background when schema opacity is omitted', async () => {
    const template: Template = {
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
            backgroundColor: '#ff66cc',
            barColor: '#000000',
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{ qr: 'https://pdfme.com/opaque-background' }],
      plugins: { qrcode: barcodes.qrcode },
    });
    const { page } = await loadFirstPageContent(pdf);

    expect(pageGraphicsStateAlphas(page)).toEqual([]);
  });

  test('renders 4-digit bar and text colors without throwing', async () => {
    // bwip-js rejects 4-digit hex ('bwip-js: invalid color'); the alpha digit must be
    // stripped before the color reaches it.
    const template: Template = {
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
            backgroundColor: '',
            barColor: '#f008',
          },
          {
            name: 'code128',
            type: 'code128',
            content: '',
            position: { x: 10, y: 50 },
            width: 60,
            height: 20,
            backgroundColor: '',
            barColor: '#000000',
            textColor: '#00f8',
            includetext: true,
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{ qr: 'https://pdfme.com/short-alpha-barcolor', code128: 'ABC-123' }],
      plugins: { qrcode: barcodes.qrcode, code128: barcodes.code128 },
    });
    const { content } = await loadFirstPageContent(pdf);

    expect(content).toMatch(/(?:^|\s)1(?:\.0+)? 0(?:\.0+)? 0(?:\.0+)? rg(?:\s|$)/);
    expect(content).toMatch(/(?:^|\s)0(?:\.0+)? 0(?:\.0+)? 1(?:\.0+)? rg(?:\s|$)/);
  });

  test('fills the schema box with barcode backgrounds', async () => {
    const pdf = await generate({
      template: barcodeBackgroundTemplate,
      inputs: [
        {
          wideQr: 'https://pdfme.com/background-wide',
          rotatedCode128: 'ABC-123',
          ean13: '1111111111116',
          rotatedPdf417: 'PDF417 background',
          transparentQr: 'https://pdfme.com/background-transparent',
        },
      ],
      plugins: {
        qrcode: barcodes.qrcode,
        code128: barcodes.code128,
        ean13: barcodes.ean13,
        pdf417: barcodes.pdf417,
      },
    });
    const { pdfDoc, page } = await loadFirstPageContent(pdf);
    const images = await pdfToImages(pdf);

    expect(pageHasImageXObject(pdfDoc, page)).toBe(false);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('barcode-backgrounds-svg-1'));
  });

  test('letterboxes contain barcodes and still stretches when fit is stretch', async () => {
    const template: Template = {
      basePdf: BLANK_PDF,
      schemas: [
        [
          {
            name: 'qrWide',
            type: 'qrcode',
            content: '',
            position: { x: 15, y: 15 },
            width: 60,
            height: 30,
            fit: 'contain',
            backgroundColor: '#ff66cc',
            barColor: '#000000',
          },
          {
            name: 'qrTall',
            type: 'qrcode',
            content: '',
            position: { x: 90, y: 15 },
            width: 30,
            height: 60,
            fit: 'contain',
            backgroundColor: '#66ccff',
            barColor: '#000000',
          },
          {
            name: 'pdf417',
            type: 'pdf417',
            content: '',
            position: { x: 135, y: 15 },
            width: 55,
            height: 30,
            fit: 'contain',
            backgroundColor: '#ffe066',
            barColor: '#000000',
          },
          {
            name: 'code128',
            type: 'code128',
            content: '',
            position: { x: 15, y: 90 },
            width: 30,
            height: 40,
            fit: 'contain',
            backgroundColor: '#99e699',
            barColor: '#000000',
          },
          {
            name: 'japanpost',
            type: 'japanpost',
            content: '',
            position: { x: 60, y: 90 },
            width: 40,
            height: 20,
            fit: 'contain',
            backgroundColor: '#ff9933',
            barColor: '#000000',
          },
          {
            name: 'qrRotated',
            type: 'qrcode',
            content: '',
            position: { x: 120, y: 95 },
            width: 50,
            height: 28,
            rotate: 20,
            fit: 'contain',
            backgroundColor: '#cc99ff',
            barColor: '#000000',
          },
          {
            name: 'qrStretch',
            type: 'qrcode',
            content: '',
            position: { x: 15, y: 160 },
            width: 60,
            height: 30,
            fit: 'stretch',
            backgroundColor: '#dddddd',
            barColor: '#000000',
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [
        {
          qrWide: 'https://pdfme.com/fit-wide',
          qrTall: 'https://pdfme.com/fit-tall',
          pdf417: 'PDF417 contain',
          code128: 'ABC-123',
          japanpost: '10000131-3-2-B503',
          qrRotated: 'https://pdfme.com/fit-rotated',
          qrStretch: 'https://pdfme.com/fit-stretch',
        },
      ],
      plugins: {
        qrcode: barcodes.qrcode,
        pdf417: barcodes.pdf417,
        code128: barcodes.code128,
        japanpost: barcodes.japanpost,
      },
    });
    const { pdfDoc, page } = await loadFirstPageContent(pdf);
    const images = await pdfToImages(pdf);

    expect(pageHasImageXObject(pdfDoc, page)).toBe(false);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('barcode-fit-contain-1'));
  });
});
