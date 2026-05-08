const MIN_VISIBLE_PREVIEW_HEIGHT = 240;
const COLLAPSED_PREVIEW_RATIO = 0.7;

export const shouldRefreshCollapsedPreview = (container: HTMLElement) => {
  const rect = container.getBoundingClientRect();
  const visibleHeight = Math.max(
    0,
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
  );
  const renderedHeight =
    container.querySelector<HTMLElement>('.pdfme-designer-root')?.getBoundingClientRect().height ??
    0;

  return (
    visibleHeight >= MIN_VISIBLE_PREVIEW_HEIGHT &&
    renderedHeight > 0 &&
    renderedHeight < visibleHeight * COLLAPSED_PREVIEW_RATIO
  );
};
