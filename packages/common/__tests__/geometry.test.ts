import { describe, expect, it } from 'vitest';
import {
  clampPositionIntoPage,
  fitIntoPage,
  getPositionRange,
  getRotatedBoundingBox,
  getSizeRange,
  isWithinPage,
  type GeometryBox,
  type PageArea,
} from '../src/index.js';

const A4: PageArea = { width: 210, height: 297 };
const box = (over: Partial<GeometryBox> = {}): GeometryBox => ({
  position: { x: 0, y: 0 },
  width: 100,
  height: 20,
  ...over,
});

describe('getRotatedBoundingBox', () => {
  it('is the box itself when not rotated', () => {
    expect(getRotatedBoundingBox(box({ position: { x: 5, y: 7 } }))).toEqual({
      x: 5,
      y: 7,
      width: 100,
      height: 20,
    });
  });

  it('swaps the extents around the centre at right angles', () => {
    for (const rotate of [90, 270, -90, 450]) {
      expect(getRotatedBoundingBox(box({ rotate }))).toEqual({
        x: 40,
        y: -40,
        width: 20,
        height: 100,
      });
    }
    expect(getRotatedBoundingBox(box({ rotate: 180 }))).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
    });
  });

  it('grows the box at 45 degrees', () => {
    const { x, y, width, height } = getRotatedBoundingBox(box({ rotate: 45 }));
    expect(width).toBeCloseTo(84.8528, 3);
    expect(height).toBeCloseTo(84.8528, 3);
    expect(x).toBeCloseTo(7.5736, 3);
    expect(y).toBeCloseTo(-32.4264, 3);
  });
});

describe('getPositionRange', () => {
  it('keeps the un-rotated limits and padding for unrotated boxes', () => {
    expect(getPositionRange(box(), { ...A4, padding: [10, 20, 30, 40] })).toEqual({
      x: { min: 40, max: 90 },
      y: { min: 10, max: 247 },
    });
  });

  it('lets a 90deg box reach every page edge', () => {
    expect(getPositionRange(box({ rotate: 90 }), A4)).toEqual({
      x: { min: -40, max: 150 },
      y: { min: 40, max: 237 },
    });
  });

  it('swaps the interval when the visible box is larger than the area', () => {
    expect(getPositionRange(box({ width: 250 }), A4).x).toEqual({ min: -40, max: 0 });
    expect(getPositionRange(box({ width: 20, height: 250, rotate: 90 }), A4).x).toEqual({
      min: 75,
      max: 115,
    });
  });
});

describe('clampPositionIntoPage', () => {
  it('clamps to the rotated limits', () => {
    expect(clampPositionIntoPage(box({ rotate: 90, position: { x: -50, y: 300 } }), A4)).toEqual({
      x: -40,
      y: 237,
    });
  });

  it('leaves values within the epsilon of a limit untouched', () => {
    expect(
      clampPositionIntoPage(box({ rotate: 90, position: { x: 150.005, y: 39.995 } }), A4),
    ).toEqual({ x: 150.005, y: 39.995 });
  });

  it('does not pin an oversized box to one edge', () => {
    expect(clampPositionIntoPage(box({ width: 250, position: { x: -20, y: 0 } }), A4).x).toBe(-20);
    expect(clampPositionIntoPage(box({ width: 250, position: { x: 10, y: 0 } }), A4).x).toBe(0);
  });
});

describe('getSizeRange', () => {
  it('matches the old un-rotated limit', () => {
    expect(getSizeRange(box({ position: { x: 60, y: 0 } }), A4, 'width')).toEqual({
      min: 0,
      max: 150,
    });
    expect(
      getSizeRange(box({ position: { x: 0, y: 7 } }), { ...A4, padding: [0, 0, 10, 0] }, 'height'),
    ).toEqual({ min: 0, max: 280 });
  });

  it('accounts for the rotated extent with the position held', () => {
    // 90deg: width grows the visible box vertically around y + h/2 = 110.
    expect(getSizeRange(box({ rotate: 90, position: { x: 50, y: 100 } }), A4, 'width')).toEqual({
      min: 0,
      max: 220,
    });
  });
});

describe('fitIntoPage', () => {
  it('translates a box back inside after a rotation', () => {
    expect(fitIntoPage(box({ rotate: 90 }), A4)).toEqual({
      position: { x: 0, y: 40 },
      width: 100,
      height: 20,
    });
  });

  it('clamps the position first, then the size', () => {
    expect(
      fitIntoPage(box({ position: { x: 100, y: 0 }, width: 150 }), A4, {
        positionSize: { width: 100, height: 20 },
      }),
    ).toEqual({ position: { x: 100, y: 0 }, width: 110, height: 20 });
    expect(fitIntoPage(box({ position: { x: 100, y: 0 }, width: 150 }), A4)).toEqual({
      position: { x: 60, y: 0 },
      width: 150,
      height: 20,
    });
  });

  it('shrinks a rotated resize that would cross an edge', () => {
    expect(
      fitIntoPage(box({ rotate: 90, position: { x: 50, y: 100 }, width: 300 }), A4, {
        positionSize: { width: 100, height: 20 },
      }),
    ).toEqual({ position: { x: 50, y: 100 }, width: 220, height: 20 });
  });

  it('keeps the result inside the page', () => {
    for (const rotate of [0, 30, 45, 90, 135, 200, 315]) {
      const fitted = fitIntoPage(
        box({ rotate, position: { x: 190, y: -30 }, width: 80, height: 40 }),
        { ...A4, padding: [10, 10, 10, 10] },
      );
      expect(isWithinPage({ ...fitted, rotate }, { ...A4, padding: [10, 10, 10, 10] })).toBe(true);
    }
  });
});

describe('isWithinPage', () => {
  it('checks the visible box', () => {
    expect(isWithinPage(box({ rotate: 90, position: { x: -40, y: 40 } }), A4)).toBe(true);
    expect(isWithinPage(box({ position: { x: -40, y: 40 } }), A4)).toBe(false);
    expect(isWithinPage(box({ rotate: 90, position: { x: -40, y: 39 } }), A4)).toBe(false);
  });
});
