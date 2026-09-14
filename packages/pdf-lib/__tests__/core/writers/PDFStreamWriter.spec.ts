import fs from 'fs';

import {
  PDFContext,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
  PDFName,
  PDFRef,
  PDFStreamWriter,
} from '../../../src/index';

const expectedPdfBytes = new Uint8Array(
  fs.readFileSync(`${__dirname}/data/stream-writer-1.pdf`),
);

const contentStreamText = `
  BT
    /F1 24 Tf
    100 100 Td
    (Hello World and stuff!) Tj
  ET
`;

describe(`PDFStreamWriter`, () => {
  it(`serializes PDFContext objects using Indirect Objects, Object Streams, and XRef Streams`, async () => {
    const context = PDFContext.create();

    const contentStream = context.flateStream(contentStreamText);
    const contentStreamRef = PDFRef.of(9000);
    context.assign(contentStreamRef, contentStream);

    const fontDict = context.obj({
      Type: 'Font',
      Subtype: 'Type1',
      Name: 'F1',
      BaseFont: 'Helvetica',
      Encoding: 'MacRomanEncoding',
    });
    const fontDictRef = context.register(fontDict);

    const page = context.obj({
      Type: 'Page',
      MediaBox: [0, 0, 612, 792],
      Contents: contentStreamRef,
      Resources: { Font: { F1: fontDictRef } },
    });
    const pageRef = context.register(page);

    const pages = context.obj({
      Type: 'Pages',
      Kids: [pageRef],
      Count: 1,
    });
    const pagesRef = context.register(pages);
    page.set(PDFName.of('Parent'), pagesRef);

    const catalog = context.obj({
      Type: 'Catalog',
      Pages: pagesRef,
    });
    context.trailerInfo.Root = context.register(catalog);

    const buffer = await PDFStreamWriter.forContext(
      context,
      Infinity,
      false,
      2,
    ).serializeToBuffer();

    // Compression may change bytes and offsets while preserving the PDF objects.
    const actual = await PDFDocument.load(buffer);
    const expected = await PDFDocument.load(expectedPdfBytes);
    expect(actual.getPageCount()).toBe(expected.getPageCount());
    for (const [ref, object] of expected.context.enumerateIndirectObjects()) {
      const actualObject = actual.context.lookup(ref);
      if (object instanceof PDFRawStream) {
        expect(actualObject).toBeInstanceOf(PDFRawStream);
        expect(decodePDFRawStream(actualObject as PDFRawStream).decode()).toEqual(
          decodePDFRawStream(object).decode(),
        );
      } else {
        expect(actualObject?.toString()).toBe(object.toString());
      }
    }
  });
});
