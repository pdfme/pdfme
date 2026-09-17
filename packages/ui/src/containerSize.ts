import type { Size } from '@pdfme/common';

export type ViewportSize = {
  height: number;
  width: number;
};

export type ContainerBox = {
  clientHeight: number;
  clientWidth: number;
  getBoundingClientRect: () => Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>;
};

const visibleIntersection = (start: number, end: number, viewportSize: number): number =>
  Math.max(0, Math.min(end, viewportSize) - Math.max(start, 0));

const capOverflowToViewport = (layout: number, visible: number, viewportSize: number): number =>
  layout > viewportSize ? Math.min(layout, visible) : layout;

export const measureUiContainerSize = (container: ContainerBox, viewport: ViewportSize): Size => {
  const layoutWidth = container.clientWidth || viewport.width;
  const layoutHeight = container.clientHeight || viewport.height;
  const rect = container.getBoundingClientRect();
  const visibleWidth = visibleIntersection(rect.left, rect.right, viewport.width);
  const visibleHeight = visibleIntersection(rect.top, rect.bottom, viewport.height);

  // Off-screen on either axis is document position, not window-shrink.
  // Keep both layout dimensions so a later scroll (which does not fire
  // ResizeObserver) does not leave one axis permanently clipped.
  if (visibleWidth === 0 || visibleHeight === 0) {
    return { height: layoutHeight, width: layoutWidth };
  }

  // #1248: only cap when the laid-out box itself exceeds the window.
  // A host that fits in the viewport but is partly scrolled away must
  // keep its layout size (e.g. 1px visible at the fold).
  return {
    height: capOverflowToViewport(layoutHeight, visibleHeight, viewport.height),
    width: capOverflowToViewport(layoutWidth, visibleWidth, viewport.width),
  };
};
