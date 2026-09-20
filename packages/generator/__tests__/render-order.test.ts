import generate from '../src/generate.js';
import { BLANK_A4_PDF } from '@pdfme/common';
import type { Schema, Template } from '@pdfme/common';
import { PDFDocument, PDFName } from '@pdfme/pdf-lib';
import { image } from '@pdfme/schemas';

const plugins = { image };

const PNG_10x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAABCAIAAABol6gpAAAAKElEQVR4nGPgEpHTMLJxC4hKyato6pm2YNWWfScu3Xn24RcLn4SSDgCy3w0rOw2EswAAAABJRU5ErkJggg==';
const PNG_50x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAABCAIAAAATs2rlAAAAkklEQVR4nGMwSpl24pdO3IRDX9Qiuva8Uwhq2fZCyqduwyMRt4pVd/gcipZc47DKmXeBySRtxqk/egmTjnzTiOrZ90EppG3HKxm/hk1PxDyq1twTcCpZdoPLJm/BJRazjFln/hkkTTn2Qyum78AnlbCOXW/kApq2PJPwqln3QMilbMUtHruCRVfYLLLmnGPAbj8ANjFK63cxzToAAAAASUVORK5CYII=';
const PNG_100x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAABCAIAAACnuZzqAAAAT0lEQVR4nGNIOaEz4UvEHoWWFz4bRCruOCzhyLlgMuNPwhGNng8hOQannisESi5YbOAJeOMwZQfMQdUOt4EbJGoeeCygqfgisUchpGkHwBM9pO5H56lWgAAAABJRU5ErkJggg==';
const PNG_500x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAABCAIAAACnnMvDAAAAWklEQVR4nGP48uLOhSM71iyY0lFTkBLh42CiISPA8uPNgysn9mxYMqOnoSQjJsDFQkdBhOPPhyc3zhzYsmLOhJaKnIQQDxsDFQkehlH9o/pH9Y/qH9U/+PQDAPjv5JcUZMYGAAAAAElFTkSuQmCC';

const img = (name: string, content: string, x: number, y: number): Schema => ({
  name,
  type: 'image',
  content,
  position: { x, y },
  width: 20,
  height: 20,
  readOnly: true,
});

const xObjectImageDimsPerPage = async (
  pdfBytes: Uint8Array<ArrayBuffer>,
): Promise<string[][]> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPages().map((page) => {
    const resources = page.node.Resources();
    const xobj = resources?.lookup(PDFName.of('XObject')) as
      | { entries?: () => Iterable<[{ encodedName: string }, unknown]> }
      | undefined;
    const dims: string[] = [];

    for (const [, ref] of xobj?.entries?.() ?? []) {
      const obj = pdfDoc.context.lookup(ref) as
        | { dict?: { get: (n: ReturnType<typeof PDFName.of>) => unknown } }
        | undefined;
      const subtype = obj?.dict?.get?.(PDFName.of('Subtype'));
      if (subtype && String(subtype) === '/Image') {
        const w = obj!.dict!.get(PDFName.of('Width'));
        const h = obj!.dict!.get(PDFName.of('Height'));
        dims.push(`${String(w)}x${String(h)}`);
      }
    }

    return dims;
  });
};

describe('per-page schema render order', () => {
  test("renders schemas on each page in that page's own array order", async () => {
    const template: Template = {
      basePdf: BLANK_A4_PDF,
      schemas: [
        [img('alpha', PNG_10x1, 0, 0), img('beta', PNG_50x1, 30, 0)],
        [img('beta', PNG_100x1, 0, 0), img('alpha', PNG_500x1, 30, 0)],
      ],
    };

    const pdf = await generate({ template, inputs: [{}], plugins });
    const dimsPerPage = await xObjectImageDimsPerPage(pdf);

    expect(dimsPerPage).toEqual([
      ['10x1', '50x1'],
      ['100x1', '500x1'],
    ]);
  });

  test('renders multiple same-named schemas on the same page', async () => {
    const template: Template = {
      basePdf: BLANK_A4_PDF,
      schemas: [[img('twin', PNG_10x1, 0, 0), img('twin', PNG_50x1, 30, 0)]],
    };

    const pdf = await generate({ template, inputs: [{}], plugins });
    const dimsPerPage = await xObjectImageDimsPerPage(pdf);

    expect(dimsPerPage).toEqual([['10x1', '50x1']]);
  });
});
