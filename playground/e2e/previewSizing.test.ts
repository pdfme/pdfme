import { shouldRefreshCollapsedPreviewSnapshot } from '../src/routes/previewSizing';

describe('preview sizing helpers', () => {
  it('refreshes when a visible preview rendered much smaller than its container', () => {
    expect(
      shouldRefreshCollapsedPreviewSnapshot({
        containerBottom: 800,
        containerTop: 100,
        renderedHeight: 300,
        viewportHeight: 900,
      }),
    ).toBe(true);

    expect(
      shouldRefreshCollapsedPreviewSnapshot({
        containerBottom: 800,
        containerTop: 100,
        renderedHeight: 0,
        viewportHeight: 900,
      }),
    ).toBe(true);
  });

  it('does not refresh when the visible area is too small or the preview is not collapsed', () => {
    expect(
      shouldRefreshCollapsedPreviewSnapshot({
        containerBottom: 220,
        containerTop: 0,
        renderedHeight: 80,
        viewportHeight: 900,
      }),
    ).toBe(false);

    expect(
      shouldRefreshCollapsedPreviewSnapshot({
        containerBottom: 200,
        containerTop: 0,
        renderedHeight: 0,
        viewportHeight: 900,
      }),
    ).toBe(false);

    expect(
      shouldRefreshCollapsedPreviewSnapshot({
        containerBottom: 800,
        containerTop: 100,
        renderedHeight: 600,
        viewportHeight: 900,
      }),
    ).toBe(false);
  });
});
