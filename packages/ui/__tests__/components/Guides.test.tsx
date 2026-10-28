import React, { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import GuidesComponent from '@scena/react-guides';
import { PAGE_SIZE_PRESETS, ZOOM, type Size, type UIOptions } from '@pdfme/common';
import Guides from '../../src/components/Designer/Canvas/Guides';
import { OptionsContext } from '../../src/contexts';

const NBSP = '\u00A0';
const A4 = PAGE_SIZE_PRESETS.A4;

const toPaperSize = ({ width, height }: Size): Size => ({
  width: width * ZOOM,
  height: height * ZOOM,
});

const renderGuides = (options: UIOptions = {}, pageSize: Size = A4) => {
  const horizontalRef = createRef<GuidesComponent>();
  const verticalRef = createRef<GuidesComponent>();
  const getElement = (opts: UIOptions) => (
    <OptionsContext.Provider value={opts}>
      <Guides
        paperSize={toPaperSize(pageSize)}
        horizontalRef={horizontalRef}
        verticalRef={verticalRef}
      />
    </OptionsContext.Provider>
  );
  const { rerender, ...result } = render(getElement(options));
  return {
    ...result,
    updateOptions: (opts: UIOptions) => rerender(getElement(opts)),
    horizontal: horizontalRef.current!,
    vertical: verticalRef.current!,
  };
};

describe('Designer Guides', () => {
  it('keeps the react-guides defaults when the guides option is not set', () => {
    for (const options of [{}, { guides: {} }]) {
      const { horizontal, vertical, unmount } = renderGuides(options);

      for (const { props } of [horizontal, vertical]) {
        expect(props.zoom).toBe(ZOOM);
        expect(props.digit).toBe(0);
        expect(props.snaps).toEqual([]);
        expect(props.displayDragPos).toBe(false);
        expect(props.displayGuidePos).toBeFalsy();
        expect(props.dragPosFormat?.(148.5)).toBe(148.5);
      }
      unmount();
    }
  });

  it('passes precision to react-guides as digit', () => {
    const { horizontal, vertical } = renderGuides({ guides: { precision: 1 } });

    expect(horizontal.props.digit).toBe(1);
    expect(vertical.props.digit).toBe(1);
    expect(horizontal.props.snaps).toEqual([]);
    expect(horizontal.props.displayDragPos).toBe(false);
  });

  it('snaps to the middle of the page: horizontal guides use the height, vertical guides the width', () => {
    const { horizontal, vertical } = renderGuides({ guides: { snapToPageCenter: true } });

    expect(horizontal.props.snaps).toHaveLength(1);
    expect(horizontal.props.snaps![0]).toBeCloseTo(148.5, 6);
    expect(vertical.props.snaps).toHaveLength(1);
    expect(vertical.props.snaps![0]).toBeCloseTo(105, 6);
  });

  it('computes the middle from the size of each page', () => {
    const { horizontal, vertical } = renderGuides(
      { guides: { snapToPageCenter: true } },
      { width: 100, height: 50 },
    );

    expect(horizontal.props.snaps![0]).toBeCloseTo(25, 6);
    expect(vertical.props.snaps![0]).toBeCloseTo(50, 6);
  });

  it('shows the position while dragging and on the guides, formatted for options.lang', () => {
    const guides = { precision: 1, showPosition: true };
    const cases = [
      { lang: 'fr' as const, expected: `148,5${NBSP}mm` },
      { lang: 'en' as const, expected: `148.5${NBSP}mm` },
    ];

    for (const { lang, expected } of cases) {
      const { horizontal, unmount, container } = renderGuides({ lang, guides });

      expect(horizontal.props.displayDragPos).toBe(true);
      expect(horizontal.props.displayGuidePos).toBe(true);
      expect(horizontal.props.dragPosFormat?.(148.5)).toBe(expected);

      act(() => horizontal.loadGuides([148.5]));
      const label = container.querySelector('.scena-guides-horizontal .scena-guides-guide-pos');
      expect(label?.textContent).toBe(expected);
      unmount();
    }
  });

  it('formats the position in English when options.lang is not set', () => {
    const { horizontal } = renderGuides({ guides: { precision: 1, showPosition: true } });

    expect(horizontal.props.dragPosFormat?.(148.5)).toBe(`148.5${NBSP}mm`);
  });

  it('limits the displayed decimals to precision', () => {
    const { horizontal } = renderGuides({
      lang: 'en',
      guides: { precision: 2, showPosition: true },
    });
    expect(horizontal.props.dragPosFormat?.(12.3456)).toBe(`12.35${NBSP}mm`);
    expect(horizontal.props.dragPosFormat?.(12)).toBe(`12${NBSP}mm`);

    const { horizontal: integerGuides } = renderGuides({
      lang: 'en',
      guides: { showPosition: true },
    });
    expect(integerGuides.props.dragPosFormat?.(12.3456)).toBe(`12${NBSP}mm`);
  });

  it('applies updated options on re-render', () => {
    const { horizontal, updateOptions } = renderGuides({ guides: { snapToPageCenter: true } });
    expect(horizontal.props.snaps).toHaveLength(1);

    updateOptions({});
    expect(horizontal.props.snaps).toEqual([]);
  });

  describe('dragging a new guide out of the ruler', () => {
    // 1 mm = ZOOM px: 148.5 mm is at 561.2 px, 105 mm at 396.9 px. The snap threshold is 5 px.
    const dragGuide = (options: UIOptions, type: 'horizontal' | 'vertical', px: number) => {
      const { container, horizontal, vertical } = renderGuides(options);
      const ruler = container.querySelector(`.scena-guides-${type} canvas`)!;
      const point =
        type === 'horizontal' ? { clientX: 10, clientY: px } : { clientX: px, clientY: 10 };

      act(() => {
        fireEvent.mouseDown(ruler, { clientX: 10, clientY: 10, button: 0, buttons: 1 });
        fireEvent.mouseMove(document.body, { ...point, buttons: 1 });
        fireEvent.mouseUp(document.body, point);
      });
      return (type === 'horizontal' ? horizontal : vertical).getGuides();
    };

    it('rounds the position to the millimeter by default', () => {
      expect(dragGuide({}, 'horizontal', 561)).toEqual([148]);
      expect(dragGuide({}, 'vertical', 397)).toEqual([105]);
    });

    it('keeps the requested decimals without snapping', () => {
      expect(dragGuide({ guides: { precision: 1 } }, 'horizontal', 561)).toEqual([148.4]);
    });

    it('snaps to the exact middle of the page within the snap threshold', () => {
      const options = { guides: { precision: 1, snapToPageCenter: true } };

      expect(dragGuide(options, 'horizontal', 558)).toEqual([148.5]);
      expect(dragGuide(options, 'horizontal', 566)).toEqual([148.5]);
      expect(dragGuide(options, 'vertical', 393)).toEqual([105]);
      expect(dragGuide(options, 'horizontal', 570)).not.toEqual([148.5]);
    });
  });
});
