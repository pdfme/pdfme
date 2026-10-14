import { describe, expect, test } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFString } from '@pdfme/pdf-lib';
import { addUriLinkAnnotation } from '../src/text/linkAnnotation.js';

describe('addUriLinkAnnotation', () => {
  test('keeps a URI with an unbalanced paren intact', async () => {
    const uri = 'https://pdfme.com/smile:-)';
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([200, 120]);
    addUriLinkAnnotation({ pdfDoc, page, uri, rect: { x: 10, y: 10, width: 50, height: 20 } });

    const reloaded = await PDFDocument.load(await pdfDoc.save());
    const annot = reloaded.getPage(0).node.Annots()!.lookup(0, PDFDict);
    const action = annot.lookup(PDFName.of('A'), PDFDict);
    expect(action.lookup(PDFName.of('URI'), PDFString).decodeText()).toBe(uri);
  });
});
