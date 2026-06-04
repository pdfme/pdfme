import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFString,
  rgb,
} from '@pdfme/pdf-lib';
import type { Template } from '@pdfme/common';
import { text } from '@pdfme/schemas';
import generate from '../src/generate.js';
import { getFont } from './utils.js';

const addSourceUriLink = (arg: {
  pdfDoc: PDFDocument;
  pageIndex: number;
  uri: string;
  rect: [number, number, number, number];
}) => {
  const { pdfDoc, pageIndex, uri, rect } = arg;
  const page = pdfDoc.getPage(pageIndex);
  const linkRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: rect,
      Border: [0, 0, 1],
      C: [0, 0, 1],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(uri),
      },
    }),
  );

  page.node.addAnnot(linkRef);
};

const createBasePdfWithLink = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([200, 120]);
  page.drawText('pdfme', { x: 20, y: 70, size: 16, color: rgb(0, 0, 1) });
  addSourceUriLink({
    pdfDoc,
    pageIndex: 0,
    uri: 'https://pdfme.com',
    rect: [20, 68, 70, 88],
  });
  return pdfDoc.save();
};

const createCroppedBasePdfWithLink = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 200]);
  page.setCropBox(50, 40, 200, 120);
  page.drawText('pdfme', { x: 60, y: 80, size: 16, color: rgb(0, 0, 1) });
  addSourceUriLink({
    pdfDoc,
    pageIndex: 0,
    uri: 'https://pdfme.com/cropped',
    rect: [60, 78, 130, 98],
  });
  addSourceUriLink({
    pdfDoc,
    pageIndex: 0,
    uri: 'https://pdfme.com/partial',
    rect: [220, 140, 280, 180],
  });
  addSourceUriLink({
    pdfDoc,
    pageIndex: 0,
    uri: 'https://pdfme.com/outside',
    rect: [260, 50, 290, 80],
  });
  return pdfDoc.save();
};

const createBasePdfWithUnsafeAndSafeLinks = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([200, 120]);
  page.drawText('links', { x: 20, y: 70, size: 16, color: rgb(0, 0, 1) });
  addSourceUriLink({
    pdfDoc,
    pageIndex: 0,
    uri: 'javascript:alert(1)',
    rect: [20, 68, 70, 88],
  });
  addSourceUriLink({
    pdfDoc,
    pageIndex: 0,
    uri: 'mailto:hello@pdfme.com',
    rect: [80, 68, 130, 88],
  });
  return pdfDoc.save();
};

const getUriLinkAnnotations = async (pdf: Uint8Array<ArrayBuffer>) => {
  const pdfDoc = await PDFDocument.load(pdf);
  const page = pdfDoc.getPage(0);
  const annots = page.node.Annots();
  if (!annots) return [];

  const links: PDFDict[] = [];
  for (let index = 0; index < annots.size(); index += 1) {
    const annot = annots.lookup(index, PDFDict);
    if (annot.get(PDFName.of('Subtype')) !== PDFName.of('Link')) continue;

    const action = annot.lookup(PDFName.of('A'), PDFDict);
    if (action.get(PDFName.of('S')) !== PDFName.of('URI')) continue;
    links.push(annot);
  }
  return links;
};

const getAnnotationUri = (annotation: PDFDict) =>
  annotation
    .lookup(PDFName.of('A'), PDFDict)
    .lookup(PDFName.of('URI'), PDFString)
    .decodeText();

const getAnnotationRect = (annotation: PDFDict) => annotation.lookup(PDFName.of('Rect'), PDFArray);

describe('generate custom basePdf links', () => {
  test('preserves URI link annotations from basePdf pages', async () => {
    const basePdf = await createBasePdfWithLink();
    const template: Template = {
      basePdf,
      schemas: [[]],
    };

    const pdf = await generate({ template, inputs: [{}], plugins: {} });
    const links = await getUriLinkAnnotations(pdf);

    expect(links).toHaveLength(1);
    expect(getAnnotationUri(links[0])).toBe('https://pdfme.com');
    expect(getAnnotationRect(links[0]).asRectangle()).toEqual({
      x: 20,
      y: 68,
      width: 50,
      height: 20,
    });
  });

  test('keeps basePdf links when schemas are rendered on top', async () => {
    const basePdf = await createBasePdfWithLink();
    const template: Template = {
      basePdf,
      schemas: [
        [
          {
            name: 'overlay',
            type: 'text',
            content: 'Overlay',
            position: { x: 10, y: 10 },
            width: 40,
            height: 10,
            fontSize: 10,
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{ overlay: 'Overlay' }],
      plugins: { text },
      options: { font: getFont() },
    });
    const links = await getUriLinkAnnotations(pdf);

    expect(links.map(getAnnotationUri)).toEqual(['https://pdfme.com']);
  });

  test('preserves URI link annotations relative to cropped basePdf pages', async () => {
    const basePdf = await createCroppedBasePdfWithLink();
    const template: Template = {
      basePdf,
      schemas: [[]],
    };

    const pdf = await generate({ template, inputs: [{}], plugins: {} });
    const links = await getUriLinkAnnotations(pdf);

    expect(links).toHaveLength(2);
    expect(links.map(getAnnotationUri)).toEqual([
      'https://pdfme.com/cropped',
      'https://pdfme.com/partial',
    ]);
    expect(getAnnotationRect(links[0]).asRectangle()).toEqual({
      x: 10,
      y: 38,
      width: 70,
      height: 20,
    });
    expect(getAnnotationRect(links[1]).asRectangle()).toEqual({
      x: 170,
      y: 100,
      width: 30,
      height: 20,
    });
  });

  test('does not preserve unsafe URI schemes from basePdf pages', async () => {
    const basePdf = await createBasePdfWithUnsafeAndSafeLinks();
    const template: Template = {
      basePdf,
      schemas: [[]],
    };

    const pdf = await generate({ template, inputs: [{}], plugins: {} });
    const links = await getUriLinkAnnotations(pdf);

    expect(links.map(getAnnotationUri)).toEqual(['mailto:hello@pdfme.com']);
  });
});
