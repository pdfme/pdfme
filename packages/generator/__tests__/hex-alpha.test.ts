import generate from '../src/generate.js';
import { Template } from '@pdfme/common';
import { PDFDict, PDFDocument, PDFName } from '@pdfme/pdf-lib';
import { ellipse, line, rectangle, text } from '@pdfme/schemas';
import { getImageSnapshotOptions, pdfToImages } from './utils.js';

const plugins = { text, line, rectangle, ellipse };

const rectSchema = (arg: {
  name: string;
  x: number;
  y: number;
  color: string;
  borderColor?: string;
  borderWidth?: number;
}): Record<string, unknown> => ({
  name: arg.name,
  type: 'rectangle',
  content: '',
  position: { x: arg.x, y: arg.y },
  width: 40,
  height: 30,
  rotate: 0,
  opacity: 1,
  borderWidth: arg.borderWidth ?? 0,
  borderColor: arg.borderColor ?? '#000000',
  color: arg.color,
  readOnly: true,
  radius: 0,
});

// Repro from https://github.com/pdfme/pdfme/issues/1634: the translucent red
// rectangle must show as purple where it overlaps the opaque blue one.
const overlapTemplate: Template = {
  basePdf: { width: 80, height: 60, padding: [0, 0, 0, 0] },
  schemas: [
    [
      rectSchema({ name: 'blue', x: 10, y: 10, color: '#0000ff' }),
      rectSchema({ name: 'redAlpha', x: 25, y: 18, color: '#ff000080' }),
    ],
  ],
};

describe('hex colors with alpha channel (#1634, #1635)', () => {
  test('renders 8-digit hex as transparency in the PDF', async () => {
    const pdf = await generate({ inputs: [{}], template: overlapTemplate, plugins });
    const images = await pdfToImages(pdf);
    expect(images).toHaveLength(1);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('hexAlpha-rect-overlap-1'));
  });

  test('renders 8-digit hex as transparency with CMYK color type', async () => {
    const pdf = await generate({
      inputs: [{}],
      template: overlapTemplate,
      plugins,
      options: { colorType: 'cmyk' },
    });
    const images = await pdfToImages(pdf);
    expect(images).toHaveLength(1);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('hexAlpha-rect-overlap-cmyk-1'));
  });

  test('applies alpha to line, ellipse border, and text colors combined with schema opacity', async () => {
    const template: Template = {
      basePdf: { width: 120, height: 120, padding: [0, 0, 0, 0] },
      schemas: [
        [
          rectSchema({ name: 'backdrop', x: 0, y: 0, color: '#0000ff' }),
          {
            name: 'line',
            type: 'line',
            content: '',
            position: { x: 5, y: 15 },
            width: 110,
            height: 4,
            rotate: 0,
            opacity: 1,
            color: '#ff000080',
            readOnly: true,
          },
          {
            name: 'ellipse',
            type: 'ellipse',
            content: '',
            position: { x: 10, y: 25 },
            width: 40,
            height: 30,
            rotate: 0,
            // Alpha must multiply with the schema opacity, not replace it.
            opacity: 0.5,
            borderWidth: 4,
            borderColor: '#00ff0080',
            color: '#ff000080',
            readOnly: true,
            radius: 0,
          },
          {
            name: 'text',
            type: 'text',
            content: 'alpha text',
            position: { x: 10, y: 60 },
            width: 100,
            height: 20,
            rotate: 0,
            fontSize: 20,
            fontColor: '#ff000080',
            backgroundColor: '#00ff0080',
            borderColor: '#0000ff80',
            borderWidth: { top: 2, right: 2, bottom: 2, left: 2 },
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            opacity: 1,
            underline: true,
            readOnly: true,
          },
        ],
      ],
    };

    const pdf = await generate({ inputs: [{}], template, plugins });
    const images = await pdfToImages(pdf);
    expect(images).toHaveLength(1);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('hexAlpha-mixed-schemas-1'));
  });

  test('renders 4-digit hex shorthand without crashing (#1635)', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 60, padding: [0, 0, 0, 0] },
      schemas: [
        [
          {
            name: 'shortalpha',
            type: 'text',
            content: '4 digit bg',
            position: { x: 10, y: 10 },
            width: 80,
            height: 12,
            rotate: 0,
            fontSize: 13,
            fontColor: '#000000',
            backgroundColor: '#0f08',
            opacity: 1,
            readOnly: true,
          },
          rectSchema({ name: 'shortAlphaRect', x: 10, y: 25, color: '#f008' }),
        ],
      ],
    };

    const pdf = await generate({ inputs: [{}], template, plugins });
    const images = await pdfToImages(pdf);
    expect(images).toHaveLength(1);
    await expect(images[0]).toMatchImage(getImageSnapshotOptions('hexAlpha-4digit-1'));
  });

  test('rejects invalid hex that merely looks like an alpha color instead of drawing NaN opacity', async () => {
    // '#ff0000gg' must not be split into the valid '#ff0000' plus a NaN alpha:
    // NaN passes pdf-lib's range assertions and would end up as '/ca NaN' in the PDF.
    const template: Template = {
      basePdf: { width: 80, height: 60, padding: [0, 0, 0, 0] },
      schemas: [[rectSchema({ name: 'invalid', x: 10, y: 10, color: '#ff0000gg' })]],
    };

    await expect(generate({ inputs: [{}], template, plugins })).rejects.toThrow(
      'Invalid hex color value #ff0000gg',
    );
  });

  test('emits no graphics states for 6-digit colors when schema opacity is omitted', async () => {
    // Alpha handling must not change the output of alpha-free templates: pdf-lib only
    // embeds an ExtGState when a draw opacity is defined, and templates that omit
    // `opacity` previously drew without one.
    const noOpacity = (schema: Record<string, unknown>) => {
      const { opacity: _, ...rest } = schema;
      return rest;
    };
    const template: Template = {
      basePdf: { width: 120, height: 120, padding: [0, 0, 0, 0] },
      schemas: [
        [
          noOpacity(rectSchema({ name: 'rect', x: 10, y: 10, color: '#ff0000' })),
          noOpacity({
            name: 'line',
            type: 'line',
            content: '',
            position: { x: 5, y: 50 },
            width: 110,
            height: 2,
            rotate: 0,
            color: '#00ff00',
            readOnly: true,
          }),
          noOpacity({
            name: 'text',
            type: 'text',
            content: 'no alpha',
            position: { x: 10, y: 60 },
            width: 100,
            height: 20,
            rotate: 0,
            fontSize: 20,
            fontColor: '#0000ff',
            underline: true,
            readOnly: true,
          }),
        ],
      ],
    };

    const pdf = await generate({ inputs: [{}], template, plugins });
    const doc = await PDFDocument.load(pdf);
    const extGState = doc.getPage(0).node.Resources()?.lookup(PDFName.of('ExtGState'));
    const graphicsStateCount = extGState instanceof PDFDict ? extGState.keys().length : 0;
    expect(graphicsStateCount).toBe(0);
  });
});
