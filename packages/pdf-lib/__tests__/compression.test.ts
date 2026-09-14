import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from '../src';

describe('compressed PDF round trip', () => {
  test.each([false, true])(
    'preserves stream contents with object streams = %s',
    async (useObjectStreams) => {
      const document = await PDFDocument.create();
      document.addPage().drawText('Compressed PDF content');
      document.setTitle('Compression round trip');
      const content = new TextEncoder().encode('PDF stream 日本語 '.repeat(1000));
      const stream = document.context.flateStream(content);
      document.catalog.set(PDFName.of('RoundTripStream'), document.context.register(stream));

      const bytes = await document.save({ useObjectStreams });
      if (useObjectStreams) {
        expect(new TextDecoder().decode(bytes)).toContain('/Type /ObjStm');
      }
      const loaded = await PDFDocument.load(bytes);
      expect(loaded.getPageCount()).toBe(1);
      expect(loaded.getTitle()).toBe('Compression round trip');
      const loadedStream = loaded.catalog.lookup(PDFName.of('RoundTripStream'), PDFRawStream);
      expect(decodePDFRawStream(loadedStream).decode()).toEqual(content);
    },
  );
});
