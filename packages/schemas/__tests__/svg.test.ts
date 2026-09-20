import { describe, expect, it, vi } from 'vitest';
import { BLANK_PDF, type PDFRenderProps, type Schema } from '@pdfme/common';
import * as pdfLib from '@pdfme/pdf-lib';
import { svg } from '../src/index.js';

const createSchema = (content: string): Schema => ({
  name: 'svg',
  type: 'svg',
  content,
  position: { x: 0, y: 0 },
  width: 10,
  height: 10,
});

const renderSvg = async ({
  value,
  options = {},
  font,
  embedFont = vi.fn(),
}: {
  value: string;
  options?: Record<string, unknown>;
  font?: Record<string, unknown>;
  embedFont?: ReturnType<typeof vi.fn>;
}) => {
  const page = {
    getHeight: () => 100,
    drawSvg: vi.fn(),
  };
  const pdfDoc = {
    embedFont,
  };

  await svg.pdf({
    value,
    schema: createSchema(value),
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
});
