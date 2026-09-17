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

const pickMeasuredLength = (layout: number, visible: number): number =>
  visible > 0 && visible < layout ? visible : layout;

export const measureUiContainerSize = (container: ContainerBox, viewport: ViewportSize): Size => {
  const layoutWidth = container.clientWidth || viewport.width;
  const layoutHeight = container.clientHeight || viewport.height;
  const rect = container.getBoundingClientRect();
  const visibleWidth = visibleIntersection(rect.left, rect.right, viewport.width);
  const visibleHeight = visibleIntersection(rect.top, rect.bottom, viewport.height);

  return {
    height: pickMeasuredLength(layoutHeight, visibleHeight),
    width: pickMeasuredLength(layoutWidth, visibleWidth),
  };
};
