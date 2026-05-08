const MIN_VISIBLE_PREVIEW_HEIGHT = 240;
const COLLAPSED_PREVIEW_RATIO = 0.7;

type PreviewSizingSnapshot = {
  containerBottom: number;
  containerTop: number;
  renderedHeight: number;
  viewportHeight: number;
};

export const shouldRefreshCollapsedPreviewSnapshot = ({
  containerBottom,
  containerTop,
  renderedHeight,
  viewportHeight,
}: PreviewSizingSnapshot) => {
  const visibleHeight = Math.max(
    0,
    Math.min(containerBottom, viewportHeight) - Math.max(containerTop, 0),
  );

  return (
    visibleHeight >= MIN_VISIBLE_PREVIEW_HEIGHT &&
    renderedHeight > 0 &&
    renderedHeight < visibleHeight * COLLAPSED_PREVIEW_RATIO
  );
};

export const shouldRefreshCollapsedPreview = (container: HTMLElement) => {
  const rect = container.getBoundingClientRect();
  const renderedRoot = container.firstElementChild;
  const renderedHeight =
    renderedRoot instanceof HTMLElement ? renderedRoot.getBoundingClientRect().height : 0;

  return shouldRefreshCollapsedPreviewSnapshot({
    containerBottom: rect.bottom,
    containerTop: rect.top,
    renderedHeight,
    viewportHeight: window.innerHeight,
  });
};
