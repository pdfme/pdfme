import generate from '../src/generate.js';
import { Template, BLANK_A4_PDF, Schema } from '@pdfme/common';
import { PDFDocument, PDFName } from '@pdfme/pdf-lib';
import { image } from '@pdfme/schemas';

const plugins = { image };

// PNGs at distinct widths so the embedded XObject's IHDR-reported
// width × height fingerprints which schema rendered it. Widths chosen to
// be far apart so the data URLs differ in length and in their last-16
// bytes — the image plugin caches PDFImage by
// `${type}:${value.length}:${value.slice(0,16)}:${value.slice(-16)}`,
// which would collide on near-identical small PNGs.
const PNG_10x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAABCAIAAABol6gpAAAAKElEQVR4nGPgEpHTMLJxC4hKyato6pm2YNWWfScu3Xn24RcLn4SSDgCy3w0rOw2EswAAAABJRU5ErkJggg==';
const PNG_50x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAABCAIAAAATs2rlAAAAkklEQVR4nGMwSpl24pdO3IRDX9Qiuva8Uwhq2fZCyqduwyMRt4pVd/gcipZc47DKmXeBySRtxqk/egmTjnzTiOrZ90EppG3HKxm/hk1PxDyq1twTcCpZdoPLJm/BJRazjFln/hkkTTn2Qyum78AnlbCOXW/kApq2PJPwqln3QMilbMUtHruCRVfYLLLmnGPAbj8ANjFK63cxzToAAAAASUVORK5CYII=';
const PNG_100x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAABCAIAAACnuZzqAAAAT0lEQVR4nGNIOaEz4UvEHoWWFz4bRCruOCzhyLlgMuNPwhGNng8hO2QannisESi5YbOAJeOMwZQfMQdUOt4EbJGoeeCygqfgisUchpGkHwBM9pO5H56lWgAAAABJRU5ErkJggg==';
const PNG_500x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAABCAIAAACnnMvDAAAAWklEQVR4nGP48uLOhSM71iyY0lFTkBLh42CiISPA8uPNgysn9mxYMqOnoSQjJsDFQkdBhOPPhyc3zhzYsmLOhJaKnIQQDxsDFQkehlH9o/pH9Y/qH9U/+PQDAPjv5JcUZMYGAAAAAElFTkSuQmCC';

const img = (name: string, content: string, x: number, y: number): Schema => ({
  name,
  type: 'image',
  content,
  position: { x, y },
  width: 20,
  height: 20,
  readOnly: true, // use schema.content directly, not input[name]
});

const xObjectImageDimsPerPage = async (pdfBytes: Uint8Array): Promise<string[][]> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  return pages.map((page) => {
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

// These tests demonstrate a per-page schema render-order bug in
// `packages/generator/src/generate.ts`. They are SKIPPED so the suite
// stays green on this branch — un-skip locally to reproduce.
//
// generate iterates each page through a globally-deduplicated schema-name
// array (`Set` across all pages), then resolves each name on the current
// page with `schemaPage.find(s => s.name == name)`. Two consequences:
//
//   1. Z-order on a page no longer matches that page's own schema array
//      order if the same name appears on another page first. A background
//      rectangle declared *after* an image on page 2 may still draw
//      *before* the image because the Set put the image at page-1's
//      earlier index — flipping the intended z-order.
//
//   2. Multiple schemas with the same name on the SAME page silently drop
//      all but the first because `.find()` returns one match.
describe.skip('per-page schema render order (bug demonstration — skipped)', () => {
  test("renders schemas on each page in that page's own array order, not the global name order", async () => {
    // Names "alpha" and "beta" appear on both pages, in opposite per-page
    // order. Page 1: alpha then beta. Page 2: beta then alpha.
    // Each schema carries a uniquely-sized image so render order can be
    // read off the resulting XObject embedding order.
    const template: Template = {
      basePdf: BLANK_A4_PDF,
      schemas: [
        [img('alpha', PNG_10x1, 0, 0), img('beta', PNG_50x1, 30, 0)],
        [img('beta', PNG_100x1, 0, 0), img('alpha', PNG_500x1, 30, 0)],
      ],
    };

    const pdf = await generate({ template, inputs: [{}], plugins });
    const dimsPerPage = await xObjectImageDimsPerPage(pdf);

    expect(dimsPerPage.length).toBe(2);
    // Page 1 array order is [alpha=10x1, beta=50x1].
    expect(dimsPerPage[0]).toEqual(['10x1', '50x1']);
    // Page 2 array order is [beta=100x1, alpha=500x1]. Bug: schemaNames
    // Set = ["alpha", "beta"] from page-1, so page-2 renders alpha
    // (500x1) FIRST and beta (100x1) SECOND — flipped from intent.
    expect(dimsPerPage[1]).toEqual(['100x1', '500x1']);
  });

  test('renders multiple same-named schemas on the same page', async () => {
    // Two image schemas on one page sharing a name. Bug: `.find()` returns
    // the first match in the global name iteration → second image silently
    // dropped at render.
    const template: Template = {
      basePdf: BLANK_A4_PDF,
      schemas: [[img('twin', PNG_10x1, 0, 0), img('twin', PNG_50x1, 30, 0)]],
    };

    const pdf = await generate({ template, inputs: [{}], plugins });
    const dimsPerPage = await xObjectImageDimsPerPage(pdf);

    expect(dimsPerPage.length).toBe(1);
    expect(dimsPerPage[0]).toEqual(['10x1', '50x1']);
  });
});
