import { useEffect, useRef, type RefObject } from 'react';
import { shouldRefreshCollapsedPreview } from './previewSizing';

const INITIAL_REFRESH_DELAY_MS = 150;
const REFRESH_COOLDOWN_MS = 750;

type UseRefreshCollapsedPreviewOptions = {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onRefresh: () => void;
  scrollRootRef: RefObject<HTMLElement | null>;
};

export const useRefreshCollapsedPreview = ({
  containerRef,
  enabled,
  onRefresh,
  scrollRootRef,
}: UseRefreshCollapsedPreviewOptions) => {
  const onRefreshRef = useRef(onRefresh);
  const lastRefreshAtRef = useRef(-Infinity);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    let frameId: number | null = null;
    const refreshPreviewIfVisible = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const container = containerRef.current;
        if (!container || !shouldRefreshCollapsedPreview(container)) return;

        const now = performance.now();
        if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) return;

        lastRefreshAtRef.current = now;
        onRefreshRef.current();
      });
    };

    const scrollContainer = scrollRootRef.current;
    scrollContainer?.addEventListener('scroll', refreshPreviewIfVisible, { passive: true });
    window.addEventListener('scroll', refreshPreviewIfVisible, { passive: true });
    window.addEventListener('resize', refreshPreviewIfVisible);
    const timeoutId = window.setTimeout(refreshPreviewIfVisible, INITIAL_REFRESH_DELAY_MS);

    return () => {
      scrollContainer?.removeEventListener('scroll', refreshPreviewIfVisible);
      window.removeEventListener('scroll', refreshPreviewIfVisible);
      window.removeEventListener('resize', refreshPreviewIfVisible);
      window.clearTimeout(timeoutId);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [containerRef, enabled, scrollRootRef]);
};
