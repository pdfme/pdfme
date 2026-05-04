import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
} from '@pdfme/pdf-lib';
import type { Schema, Template } from '@pdfme/common';
import { mm2pt } from '@pdfme/common';
import { text } from '@pdfme/schemas';
import generate from '../src/generate.js';
import { getFont } from './utils.js';

const createTextSchema = (arg: {
  name: string;
  content: string;
  y: number;
  width?: number;
}): Schema =>
  ({
    name: arg.name,
    type: 'text',
    readOnly: true,
    content: arg.content,
    position: { x: 10, y: arg.y },
    width: arg.width ?? 80,
    height: 12,
    fontSize: 12,
    lineHeight: 1,
    characterSpacing: 0,
    alignment: 'left',
    verticalAlignment: 'top',
    fontColor: '#000000',
    backgroundColor: '',
    textFormat: 'inline-markdown',
  }) as Schema;

const getLinkAnnotations = async (pdf: Uint8Array<ArrayBuffer>, pageIndex: number) => {
  const pdfDoc = await PDFDocument.load(pdf);
  const page = pdfDoc.getPage(pageIndex);
  const annots = page.node.Annots();
  if (!annots) return { pdfDoc, links: [] as PDFDict[] };

  const links: PDFDict[] = [];
  for (let index = 0; index < annots.size(); index += 1) {
    const annot = annots.lookup(index, PDFDict);
    if (annot.get(PDFName.of('Subtype')) === PDFName.of('Link')) {
      links.push(annot);
    }
  }
  return { pdfDoc, links };
};

const getGoToDestination = (annotation: PDFDict) => {
  const action = annotation.lookup(PDFName.of('A'), PDFDict);
  expect(action.get(PDFName.of('S'))).toBe(PDFName.of('GoTo'));
  return action.lookup(PDFName.of('D'), PDFArray);
};

const generatePdf = (template: Template) =>
  generate({
    template,
    inputs: [{}],
    plugins: { text },
    options: { font: getFont() },
  });

describe('generate internal markdown links', () => {
  test('creates GoTo link annotations for #schemaName links', async () => {
    const targetSchema = createTextSchema({ name: 'intro', content: 'Intro', y: 20 });
    const template: Template = {
      basePdf: { width: 100, height: 100, padding: [0, 0, 0, 0] },
      schemas: [
        [createTextSchema({ name: 'toc', content: '[Intro](#intro)', y: 10 })],
        [targetSchema],
      ],
    };

    const pdf = await generatePdf(template);
    const { pdfDoc, links } = await getLinkAnnotations(pdf, 0);
    const destination = getGoToDestination(links[0]);

    expect(links).toHaveLength(1);
    expect(destination.get(0).toString()).toBe(pdfDoc.getPage(1).ref.toString());
    expect(destination.lookup(1, PDFName)).toBe(PDFName.of('XYZ'));
    expect(destination.lookup(2, PDFNumber).asNumber()).toBeCloseTo(mm2pt(10));
    expect(destination.lookup(3, PDFNumber).asNumber()).toBeCloseTo(
      mm2pt(100) - mm2pt(targetSchema.position.y),
    );
  });

  test('resolves internal links within each generated input scope', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 100, padding: [0, 0, 0, 0] },
      schemas: [
        [createTextSchema({ name: 'toc', content: '[Intro](#intro)', y: 10 })],
        [createTextSchema({ name: 'intro', content: 'Intro', y: 20 })],
      ],
    };

    const pdf = await generate({
      template,
      inputs: [{}, {}],
      plugins: { text },
      options: { font: getFont() },
    });
    const first = await getLinkAnnotations(pdf, 0);
    const second = await getLinkAnnotations(pdf, 2);

    expect(getGoToDestination(first.links[0]).get(0).toString()).toBe(
      first.pdfDoc.getPage(1).ref.toString(),
    );
    expect(getGoToDestination(second.links[0]).get(0).toString()).toBe(
      second.pdfDoc.getPage(3).ref.toString(),
    );
  });

  test('throws for missing internal link targets', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 100, padding: [0, 0, 0, 0] },
      schemas: [[createTextSchema({ name: 'toc', content: '[Missing](#missing)', y: 10 })]],
    };

    await expect(generatePdf(template)).rejects.toThrow(
      'Internal link target "#missing" was not found',
    );
  });

  test('throws for ambiguous internal link targets', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 100, padding: [0, 0, 0, 0] },
      schemas: [
        [createTextSchema({ name: 'toc', content: '[Intro](#intro)', y: 10 })],
        [createTextSchema({ name: 'intro', content: 'Intro', y: 20 })],
        [createTextSchema({ name: 'intro', content: 'Intro again', y: 30 })],
      ],
    };

    await expect(generatePdf(template)).rejects.toThrow(
      'Internal link target "#intro" is ambiguous',
    );
  });
});
