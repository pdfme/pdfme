// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { BLANK_PDF, mm2pt, type PDFRenderProps, type UIRenderProps } from '@pdfme/common';
import * as pdfLib from '@pdfme/pdf-lib';
import { circleMark } from '../src/index.js';
import type { CircleMarkSchema } from '../src/types.js';

const getSchema = (overrides: Partial<CircleMarkSchema> = {}): CircleMarkSchema => ({
  name: 'choice',
  type: 'circleMark',
  content: 'false',
  position: { x: 10, y: 20 },
  width: 30,
  height: 40,
  rotate: 15,
  opacity: 0.5,
  color: '#336699',
  borderWidth: 2,
  ...overrides,
});

const renderPdf = (schema: CircleMarkSchema, value: unknown, colorType?: 'rgb' | 'cmyk') => {
  const page = {
    getHeight: () => 300,
    drawEllipse: vi.fn(),
  };

  circleMark.pdf({
    value,
    schema,
    basePdf: BLANK_PDF,
    pdfLib,
    pdfDoc: {},
    page,
    options: colorType ? { colorType } : {},
    _cache: new Map(),
  } as unknown as PDFRenderProps<CircleMarkSchema>);

  return page.drawEllipse;
};

const renderUi = (
  schema: CircleMarkSchema,
  value: unknown,
  mode: UIRenderProps<CircleMarkSchema>['mode'] = 'form',
) => {
  const rootElement = document.createElement('div');
  const onChange = vi.fn();

  circleMark.ui({
    value,
    schema,
    rootElement,
    mode,
    onChange,
    basePdf: BLANK_PDF,
    options: {},
    theme: { colorPrimary: '#1677ff', colorPrimaryBg: '#e6f4ff', colorWhite: '#ffffff' },
    i18n: (key: string) => key,
    scale: 1,
    _cache: new Map(),
  } as unknown as UIRenderProps<CircleMarkSchema>);

  return { rootElement, onChange };
};

describe('circleMark plugin', () => {
  it('exports the expected default schema', () => {
    expect(circleMark.propPanel.defaultSchema).toMatchObject({
      type: 'circleMark',
      content: 'false',
      width: 10,
      height: 10,
      rotate: 0,
      opacity: 1,
      color: '#000000',
      borderWidth: 1,
    });
  });

  it('draws a native PDF ellipse only for the string value true', () => {
    const schema = getSchema();
    const drawEllipse = renderPdf(schema, 'true');

    expect(drawEllipse).toHaveBeenCalledTimes(1);
    expect(drawEllipse).toHaveBeenCalledWith(
      expect.objectContaining({
        x: mm2pt(10) + mm2pt(30) / 2,
        y: 300 - mm2pt(20) - mm2pt(40) + mm2pt(40) / 2,
        xScale: mm2pt(30) / 2 - mm2pt(2) / 2,
        yScale: mm2pt(40) / 2 - mm2pt(2) / 2,
        rotate: { type: 'degrees', angle: -15 },
        borderWidth: mm2pt(2),
        borderColor: {
          type: 'RGB',
          red: 0.2,
          green: 0.4,
          blue: 0.6,
        },
        borderOpacity: 0.5,
      }),
    );

    expect(renderPdf(schema, 'false')).not.toHaveBeenCalled();
    expect(renderPdf(schema, '')).not.toHaveBeenCalled();
    expect(renderPdf(schema, true)).not.toHaveBeenCalled();
  });

  it('uses CMYK color conversion for PDF output when requested', () => {
    const drawEllipse = renderPdf(getSchema({ color: '#000000' }), 'true', 'cmyk');

    expect(drawEllipse).toHaveBeenCalledWith(
      expect.objectContaining({
        borderColor: { type: 'CMYK', cyan: 0, magenta: 0, yellow: 0, key: 1 },
      }),
    );
  });

  it('does not throw or draw when the mark style cannot produce a visible ellipse', () => {
    expect(renderPdf(getSchema({ width: 0 }), 'true')).not.toHaveBeenCalled();
    expect(renderPdf(getSchema({ height: 0 }), 'true')).not.toHaveBeenCalled();
    expect(renderPdf(getSchema({ borderWidth: 0 }), 'true')).not.toHaveBeenCalled();
    expect(renderPdf(getSchema({ color: '' }), 'true')).not.toHaveBeenCalled();
    expect(renderPdf(getSchema({ color: 'invalid' }), 'true')).not.toHaveBeenCalled();
    expect(renderPdf(getSchema({ width: 1, borderWidth: 2 }), 'true')).not.toHaveBeenCalled();
  });

  it('renders a clickable area while only showing the mark when selected', () => {
    const selected = renderUi(getSchema(), 'true');
    const selectedContainer = selected.rootElement.firstElementChild as HTMLDivElement;
    const mark = selectedContainer.firstElementChild as HTMLDivElement;

    expect(mark.style.borderRadius).toBe('50%');
    expect(mark.style.borderStyle).toBe('solid');
    expect(mark.style.borderColor).toBe('rgb(51, 102, 153)');

    const unselected = renderUi(getSchema(), 'false');
    const unselectedContainer = unselected.rootElement.firstElementChild as HTMLDivElement;

    expect(unselectedContainer.childElementCount).toBe(0);
    unselectedContainer.click();
    expect(unselected.onChange).toHaveBeenCalledWith({ key: 'content', value: 'true' });
  });

  it('does not toggle read-only form fields', () => {
    const { rootElement, onChange } = renderUi(getSchema({ readOnly: true }), 'false');

    expect(rootElement.childElementCount).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});
