import { Schema, mm2pt, pt2mm } from '@pdfme/common';
import { convertForPdfLayoutProps, rotatePoint } from '../src/renderUtils';

describe('rotatePoint', () => {
  it('should rotate one point round another by 90 degrees', () => {
    const point = { x: 5, y: 5 };
    const pivot = { x: 0, y: 0 };
    const angle = 90;

    const { x, y } = rotatePoint(point, pivot, angle);
    expect(x).toEqual(-5);
    expect(y).toEqual(5);
  });

  it('should rotate one point round another by 180 degrees', () => {
    const point = { x: 5, y: 5 };
    const pivot = { x: 0, y: 0 };
    const angle = 180;

    const { x, y } = rotatePoint(point, pivot, angle);
    expect(x).toBeCloseTo(-5);
    expect(y).toBeCloseTo(-5);
  });

  it('should not rotate if pivot and point are the same', () => {
    const point = { x: 10, y: 10 };
    const pivot = { x: 10, y: 10 };
    const angle = 221;

    const { x, y } = rotatePoint(point, pivot, angle);
    expect(x).toEqual(10);
    expect(y).toEqual(10);
  });

  it('should rotate one point round another by 45 degrees', () => {
    const point = { x: 10, y: 10 };
    const pivot = { x: 5, y: 5 };
    const angle = 45;

    const { x, y } = rotatePoint(point, pivot, angle);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(12.07);
  });
});

describe('convertForPdfLayoutProps', () => {
  it('should return correct value without rotation', () => {
    const schema: Schema = {
      type: 'image',
      width: 100,
      height: 100,
      position: { x: 100, y: 100 },
      rotate: 0,
    };
    const pageHeight = 1000;

    const {
      position: { x, y },
      height,
      width,
      rotate,
    } = convertForPdfLayoutProps({ schema, pageHeight });

    expect(height).toEqual(mm2pt(schema.height));
    expect(width).toEqual(mm2pt(schema.width));
    expect(x).toEqual(mm2pt(schema.position.x));
    expect(y).toEqual(pageHeight - mm2pt(schema.position.y) - mm2pt(schema.height));
    expect(rotate).toEqual({ angle: 0, type: 'degrees' });
  });

  it('should return correct value with rotation', () => {
    const schema: Schema = {
      type: 'image',
      width: 50,
      height: 120,
      position: { x: 100, y: 100 },
      rotate: 90,
    };
    const pageHeight = 1000;

    const {
      position: { x, y },
      height,
      width,
      rotate,
    } = convertForPdfLayoutProps({ schema, pageHeight });

    expect(pt2mm(width)).toBeCloseTo(50);
    expect(pt2mm(height)).toBeCloseTo(120.005);
    expect(pt2mm(x)).toBeCloseTo(65.003);
    expect(pt2mm(y)).toBeCloseTo(217.793);
    expect(rotate).toEqual({ angle: -90, type: 'degrees' });
  });

  it('should not rotate if asked not to', () => {
    const schema: Schema = {
      type: 'text',
      width: 50,
      height: 120,
      position: { x: 100, y: 100 },
      rotate: 90,
    };
    const pageHeight = 1000;

    const {
      position: { x, y },
      height,
      width,
      rotate,
    } = convertForPdfLayoutProps({ schema, pageHeight, applyRotateTranslate: false });

    expect(pt2mm(width)).toBeCloseTo(50);
    expect(pt2mm(height)).toBeCloseTo(120.005);
    expect(pt2mm(x)).toBeCloseTo(100);
    expect(Math.round(pt2mm(y))).toEqual(Math.round(pt2mm(1000) - 100 - 120));
    expect(rotate).toEqual({ angle: -90, type: 'degrees' });
  });
});
