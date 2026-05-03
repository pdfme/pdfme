import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from '@pdfme/pdf-lib';
import type { Template } from '@pdfme/common';
import { text } from '@pdfme/schemas';
import generate from '../src/generate.js';
import { getFont } from './utils.js';

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

describe('generate inline markdown links', () => {
  test('creates URI link annotations for text schema links', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 80, padding: [0, 0, 0, 0] },
      schemas: [
        [
          {
            name: 'message',
            type: 'text',
            readOnly: true,
            content: 'Visit [pdfme](https://pdfme.com) now.',
            position: { x: 10, y: 10 },
            width: 80,
            height: 12,
            fontSize: 12,
            lineHeight: 1,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'top',
            fontColor: '#000000',
            backgroundColor: '',
            textFormat: 'inline-markdown',
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{}],
      plugins: { text },
      options: { font: getFont() },
    });
    const links = await getUriLinkAnnotations(pdf);

    expect(links).toHaveLength(1);
    expect(getAnnotationUri(links[0])).toBe('https://pdfme.com');
    expect(getAnnotationRect(links[0]).size()).toBe(4);
  });

  test('creates one annotation for each wrapped visible link fragment', async () => {
    const template: Template = {
      basePdf: { width: 80, height: 80, padding: [0, 0, 0, 0] },
      schemas: [
        [
          {
            name: 'message',
            type: 'text',
            readOnly: true,
            content: '[averyveryverylonglinklabel](https://pdfme.com/docs)',
            position: { x: 10, y: 10 },
            width: 16,
            height: 60,
            fontSize: 12,
            lineHeight: 1,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'top',
            fontColor: '#000000',
            backgroundColor: '',
            textFormat: 'inline-markdown',
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{}],
      plugins: { text },
      options: { font: getFont() },
    });
    const links = await getUriLinkAnnotations(pdf);

    expect(links.length).toBeGreaterThan(1);
    expect(links.map(getAnnotationUri)).toEqual(
      Array.from({ length: links.length }, () => 'https://pdfme.com/docs'),
    );
  });

  test('appends link annotations without replacing existing page annotations', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 80, padding: [0, 0, 0, 0] },
      schemas: [
        [
          {
            name: 'first',
            type: 'text',
            readOnly: true,
            content: '[First](https://example.com/first)',
            position: { x: 10, y: 10 },
            width: 80,
            height: 12,
            fontSize: 12,
            lineHeight: 1,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'top',
            fontColor: '#000000',
            backgroundColor: '',
            textFormat: 'inline-markdown',
          },
          {
            name: 'second',
            type: 'text',
            readOnly: true,
            content: '[Second](https://example.com/second)',
            position: { x: 10, y: 25 },
            width: 80,
            height: 12,
            fontSize: 12,
            lineHeight: 1,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'top',
            fontColor: '#000000',
            backgroundColor: '',
            textFormat: 'inline-markdown',
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{}],
      plugins: { text },
      options: { font: getFont() },
    });
    const links = await getUriLinkAnnotations(pdf);

    expect(links.map(getAnnotationUri)).toEqual([
      'https://example.com/first',
      'https://example.com/second',
    ]);
  });

  test('does not create annotations for unsafe URI schemes', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 80, padding: [0, 0, 0, 0] },
      schemas: [
        [
          {
            name: 'message',
            type: 'text',
            readOnly: true,
            content: '[Bad](javascript:alert(1)) [Mail](mailto:hello@pdfme.com)',
            position: { x: 10, y: 10 },
            width: 80,
            height: 12,
            fontSize: 12,
            lineHeight: 1,
            characterSpacing: 0,
            alignment: 'left',
            verticalAlignment: 'top',
            fontColor: '#000000',
            backgroundColor: '',
            textFormat: 'inline-markdown',
          },
        ],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{}],
      plugins: { text },
      options: { font: getFont() },
    });
    const links = await getUriLinkAnnotations(pdf);

    expect(links.map(getAnnotationUri)).toEqual(['mailto:hello@pdfme.com']);
  });
});
