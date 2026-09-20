import { describe, expect, it, vi } from 'vitest';
import { BLANK_PDF, mm2pt, type PDFRenderProps, type Schema } from '@pdfme/common';
import * as pdfLib from '@pdfme/pdf-lib';
import { svg } from '../src/index.js';

const createSchema = (content: string, overrides: Partial<Schema> = {}): Schema => ({
  name: 'svg',
  type: 'svg',
  content,
  position: { x: 0, y: 0 },
  width: 10,
  height: 10,
  ...overrides,
});

const renderSvg = async ({
  value,
  schema = createSchema(value),
  options = {},
  font,
  embedFont = vi.fn(),
}: {
  value: string;
  schema?: Schema;
  options?: Record<string, unknown>;
  font?: Record<string, unknown>;
  embedFont?: ReturnType<typeof vi.fn>;
}) => {
  const page = {
    getHeight: () => 100,
    drawSvg: vi.fn(),
    pushOperators: vi.fn(),
  };
  const pdfDoc = {
    embedFont,
  };

  await svg.pdf({
    value,
    schema,
    basePdf: BLANK_PDF,
    pdfLib,
    pdfDoc,
    page,
    options: { ...options, font },
    _cache: new Map(),
  } as unknown as PDFRenderProps<Schema>);

  return { page, pdfDoc };
};

describe('svg.pdf', () => {
  it('passes a color mapper to drawSvg for CMYK output', async () => {
    const { page } = await renderSvg({
      value: '<svg width="10" height="10"><rect width="10" height="10" fill="#112233"/></svg>',
      options: { colorType: 'cmyk' },
    });

    const drawOptions = page.drawSvg.mock.calls[0][1];
    expect(drawOptions.mapColor).toBeTypeOf('function');

    const mapped = drawOptions.mapColor({
      color: '#112233',
      parsed: { rgb: pdfLib.rgb(17 / 255, 34 / 255, 51 / 255), alpha: 0.5 },
      kind: 'fill',
    });

    expect(mapped).toBeDefined();
    if (!mapped) throw new Error('Expected SVG CMYK mapper to return a color');
    expect(mapped.alpha).toBe(0.5);
    expect(mapped.color.type).toBe('CMYK');
    expect(mapped.color.cyan).toBeCloseTo(2 / 3);
    expect(mapped.color.magenta).toBeCloseTo(1 / 3);
    expect(mapped.color.yellow).toBeCloseTo(0);
    expect(mapped.color.key).toBeCloseTo(0.8);
  });

  it('does not pass a color mapper to drawSvg for default RGB output', async () => {
    const { page } = await renderSvg({
      value: '<svg width="10" height="10"><rect width="10" height="10" fill="#112233"/></svg>',
    });

    expect(page.drawSvg.mock.calls[0][1].mapColor).toBeUndefined();
  });

  it('keeps forwarding selected SVG fonts while adding the CMYK mapper', async () => {
    const fontMarker = { name: 'embedded-font' };
    const embedFont = vi.fn(async () => fontMarker);
    const { page } = await renderSvg({
      value:
        '<svg width="10" height="10"><text font-family="BrandFont" font-weight="700">A</text></svg>',
      options: { colorType: 'cmyk' },
      font: {
        BrandFont: { data: new Uint8Array([1, 2, 3]) },
      },
      embedFont,
    });

    expect(embedFont).toHaveBeenCalledTimes(1);
    expect(page.drawSvg).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fonts: { BrandFont: fontMarker },
        mapColor: expect.any(Function),
      }),
    );
  });

  it('wraps rotated SVG draws in a center-pivot graphics state transform', async () => {
    const value = '<svg width="10" height="10"><rect width="10" height="10" fill="#112233"/></svg>';
    const schema = createSchema(value, {
      position: { x: 20, y: 30 },
      width: 40,
      height: 10,
      rotate: 30,
    });
    const { page } = await renderSvg({ value, schema });
    const width = mm2pt(schema.width);
    const height = mm2pt(schema.height);
    const x = mm2pt(schema.position.x);
    const y = 100 - mm2pt(schema.position.y) - height;
    const pivotX = x + width / 2;
    const pivotY = y + height / 2;

    expect(page.drawSvg).toHaveBeenCalledWith(
      value,
      expect.objectContaining({ x, y: y + height, width, height }),
    );
    expect(page.pushOperators).toHaveBeenCalledTimes(2);
    const operators = page.pushOperators.mock.calls[0].map((operator) => operator.toString());
    expect(operators).toEqual([
      pdfLib.pushGraphicsState().toString(),
      pdfLib.translate(pivotX, pivotY).toString(),
      pdfLib.rotateDegrees(-30).toString(),
      pdfLib.translate(-pivotX, -pivotY).toString(),
    ]);
    expect(page.pushOperators.mock.calls[1][0].toString()).toBe(
      pdfLib.popGraphicsState().toString(),
    );
  });

  it('enables rotation controls for the SVG schema', () => {
    expect(svg.propPanel.defaultSchema.rotate).toBe(0);
  });
});
