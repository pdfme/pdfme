import { describe, expect, it, vi } from 'vitest';
import { BLANK_PDF, mm2pt, type PDFRenderProps } from '@pdfme/common';
import * as pdfLib from '@pdfme/pdf-lib';
import { ellipse, rectangle } from '../src/index.js';
import type { ShapeSchema } from '../src/shapes/rectAndEllipse.js';

const PAGE_HEIGHT = 841.89;

const getRectangleSchema = (overrides: Partial<ShapeSchema> = {}): ShapeSchema => ({
  name: 'rect',
  type: 'rectangle',
  position: { x: 20, y: 30 },
  width: 50,
  height: 30,
  rotate: 0,
  opacity: 1,
  borderWidth: 10,
  borderColor: '#000000',
  color: '',
  readOnly: true,
  radius: 0,
  ...overrides,
});

const getEllipseSchema = (overrides: Partial<ShapeSchema> = {}): ShapeSchema => ({
  ...getRectangleSchema(overrides),
  name: 'ellipse',
  type: 'ellipse',
});

const createPage = () => ({
  getHeight: () => PAGE_HEIGHT,
  drawRectangle: vi.fn(),
  drawEllipse: vi.fn(),
  drawLine: vi.fn(),
});

const renderPdf = (plugin: typeof rectangle, schema: ShapeSchema) => {
  const page = createPage();

  plugin.pdf({
    value: '',
    schema,
    basePdf: BLANK_PDF,
    pdfLib,
    pdfDoc: {},
    page,
    options: {},
    _cache: new Map(),
  } as unknown as PDFRenderProps<ShapeSchema>);

  return page;
};

/**
 * Closed-form PDF drawRectangle args for a rectangle whose stroke is inset by
 * borderWidth/2 in the local (rotated) frame. Independent of rotatePoint /
 * convertForPdfLayoutProps so the plugin math is pinned, not mirrored.
 */
const expectedRectangleDraw = (schema: ShapeSchema) => {
  const boxWidth = mm2pt(schema.width);
  const boxHeight = mm2pt(schema.height);
  const rotateDegrees = schema.rotate ? -schema.rotate : 0;
  let x = mm2pt(schema.position.x);
  let y = PAGE_HEIGHT - mm2pt(schema.position.y) - boxHeight;

  if (rotateDegrees) {
    const pivotX = x + boxWidth / 2;
    const pivotY = PAGE_HEIGHT - mm2pt(schema.position.y) - boxHeight / 2;
    const theta = (rotateDegrees * Math.PI) / 180;
    const dx = x - pivotX;
    const dy = y - pivotY;
    x = Math.cos(theta) * dx - Math.sin(theta) * dy + pivotX;
    y = Math.sin(theta) * dx + Math.cos(theta) * dy + pivotY;
  }

  const borderWidth = schema.borderWidth ? mm2pt(schema.borderWidth) : 0;
  const half = borderWidth / 2;
  const theta = (rotateDegrees * Math.PI) / 180;

  return {
    x: x + half * (Math.cos(theta) - Math.sin(theta)),
    y: y + half * (Math.sin(theta) + Math.cos(theta)),
    width: boxWidth - borderWidth,
    height: boxHeight - borderWidth,
    rotate: { type: 'degrees', angle: rotateDegrees },
    borderWidth,
  };
};

describe('rectangle.pdf border inset', () => {
  const angles = [0, 30, 45, 90, 180] as const;
  const borderWidths = [0, 1, 10, 25] as const;

  it.each(angles.flatMap((rotate) => borderWidths.map((borderWidth) => ({ rotate, borderWidth }))))(
    'insets the stroke path in the local frame at rotate=$rotate borderWidth=$borderWidth',
    ({ rotate, borderWidth }) => {
      const schema = getRectangleSchema({ rotate, borderWidth });
      const page = renderPdf(rectangle, schema);
      const expected = expectedRectangleDraw(schema);

      expect(page.drawEllipse).not.toHaveBeenCalled();
      expect(page.drawRectangle).toHaveBeenCalledTimes(1);
      expect(page.drawRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expected.width,
          height: expected.height,
          rotate: expected.rotate,
          borderWidth: expected.borderWidth,
        }),
      );

      const drawn = page.drawRectangle.mock.calls[0][0] as { x: number; y: number };
      expect(drawn.x).toBeCloseTo(expected.x, 8);
      expect(drawn.y).toBeCloseTo(expected.y, 8);
    },
  );

  it('reduces to an unrotated +borderWidth/2 offset at rotate 0', () => {
    const schema = getRectangleSchema({ rotate: 0, borderWidth: 10 });
    const page = renderPdf(rectangle, schema);
    const drawn = page.drawRectangle.mock.calls[0][0] as { x: number; y: number };
    const borderWidth = mm2pt(10);
    const x = mm2pt(schema.position.x);
    const y = PAGE_HEIGHT - mm2pt(schema.position.y) - mm2pt(schema.height);

    expect(drawn.x).toBeCloseTo(x + borderWidth / 2, 8);
    expect(drawn.y).toBeCloseTo(y + borderWidth / 2, 8);
  });

  it('stays on-page at rotate 90 instead of using a diverging tan offset', () => {
    const schema = getRectangleSchema({ rotate: 90, borderWidth: 10 });
    const page = renderPdf(rectangle, schema);
    const drawn = page.drawRectangle.mock.calls[0][0] as { x: number; y: number };

    expect(Number.isFinite(drawn.x)).toBe(true);
    expect(Number.isFinite(drawn.y)).toBe(true);
    expect(Math.abs(drawn.x)).toBeLessThan(PAGE_HEIGHT);
    expect(Math.abs(drawn.y)).toBeLessThan(PAGE_HEIGHT);
  });

  it('does not offset a fill-only rectangle', () => {
    const schema = getRectangleSchema({
      rotate: 45,
      borderWidth: 0,
      borderColor: '',
      color: '#ff0000',
    });
    const page = renderPdf(rectangle, schema);
    const expected = expectedRectangleDraw(schema);
    const drawn = page.drawRectangle.mock.calls[0][0] as { x: number; y: number; width: number };

    expect(drawn.x).toBeCloseTo(expected.x, 8);
    expect(drawn.y).toBeCloseTo(expected.y, 8);
    expect(drawn.width).toBeCloseTo(mm2pt(schema.width), 8);
  });

  it('forwards radius when a rotated rounded rectangle is drawn', () => {
    const schema = getRectangleSchema({ rotate: 45, radius: 8, borderWidth: 10 });
    const page = renderPdf(rectangle, schema);

    expect(page.drawRectangle).toHaveBeenCalledWith(expect.objectContaining({ radius: mm2pt(8) }));
  });

  it('does not draw when neither fill nor border color is set', () => {
    const page = renderPdf(
      rectangle,
      getRectangleSchema({ color: '', borderColor: '', rotate: 45 }),
    );

    expect(page.drawRectangle).not.toHaveBeenCalled();
    expect(page.drawEllipse).not.toHaveBeenCalled();
  });
});

describe('ellipse.pdf is unchanged by the rectangle inset', () => {
  it.each([0, 45, 90])('draws a center-anchored ellipse at rotate=%s', (rotate) => {
    const schema = getEllipseSchema({ rotate, borderWidth: 10 });
    const page = renderPdf(ellipse, schema);
    const width = mm2pt(schema.width);
    const height = mm2pt(schema.height);
    const x = mm2pt(schema.position.x);
    const y = PAGE_HEIGHT - mm2pt(schema.position.y) - height;
    const borderWidth = mm2pt(10);

    expect(page.drawRectangle).not.toHaveBeenCalled();
    expect(page.drawEllipse).toHaveBeenCalledTimes(1);
    expect(page.drawEllipse).toHaveBeenCalledWith(
      expect.objectContaining({
        x: x + width / 2,
        y: y + height / 2,
        xScale: width / 2 - borderWidth / 2,
        yScale: height / 2 - borderWidth / 2,
        rotate: { type: 'degrees', angle: schema.rotate ? -schema.rotate : 0 },
        borderWidth,
      }),
    );
  });
});
