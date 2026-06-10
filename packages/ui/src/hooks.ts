import {
  RefObject,
  MutableRefObject,
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import {
  cloneDeep,
  ZOOM,
  Template,
  Size,
  getB64BasePdf,
  b64toUint8Array,
  SchemaForUI,
  ChangeSchemas,
  isBlankPdf,
} from '@pdfme/common';
import { pdf2img, pdf2size } from '@pdfme/converter';

import {
  schemasList2template,
  uuid,
  getUniqueSchemaName,
  moveCommandToChangeSchemasArg,
  arrayBufferToBase64,
  initShortCuts,
  destroyShortCuts,
  clampZoomLevel,
  getFitZoomLevel,
  getZoomAnchor,
  restoreZoomAnchor,
  type ZoomAnchor,
  type ZoomMode,
} from './helper.js';
import { RULER_HEIGHT } from './constants.js';

export const usePrevious = <T>(value: T) => {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
};

const getScale = (n: number, paper: number) =>
  Math.floor((n / paper > 1 ? 1 : n / paper) * 100) / 100;

// Keep the base scale strictly positive. When the visible area is extremely
// narrow (e.g. mobile viewports where the sidebars consume the whole width),
// a scale of 0 or below would leave the UI stuck on the loading spinner.
const MIN_BASE_SCALE = 0.01;

type UIPreProcessorProps = { template: Template; size: Size; zoomLevel: number; maxZoom: number };

export const useUIPreProcessor = ({ template, size, zoomLevel, maxZoom }: UIPreProcessorProps) => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<Size[]>([]);
  const [scale, setScale] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const init = useCallback(
    async (prop: { template: Template; size: Size }) => {
      const {
        template: { basePdf, schemas },
        size,
      } = prop;

      let paperWidth: number;
      let paperHeight: number;
      let _backgrounds: string[];
      let _pageSizes: { width: number; height: number }[];

      if (isBlankPdf(basePdf)) {
        const { width, height } = basePdf;
        paperWidth = width * ZOOM;
        paperHeight = height * ZOOM;
        _backgrounds = schemas.map(
          () =>
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=',
        );
        _pageSizes = schemas.map(() => ({ width, height }));
      } else {
        const _basePdf = await getB64BasePdf(basePdf);
        const uint8Array = b64toUint8Array(_basePdf);
        const createPdfArrayBuffer = () => {
          const buffer = new ArrayBuffer(uint8Array.byteLength);
          new Uint8Array(buffer).set(uint8Array);
          return buffer;
        };

        const [pageSizeBuffer, imageBuffer] = [createPdfArrayBuffer(), createPdfArrayBuffer()];
        const [_pages, imgBuffers] = await Promise.all([
          pdf2size(pageSizeBuffer),
          pdf2img(imageBuffer, { scale: maxZoom }),
        ]);
        _pageSizes = _pages;
        paperWidth = _pageSizes[0].width * ZOOM;
        paperHeight = _pageSizes[0].height * ZOOM;
        _backgrounds = imgBuffers.map(arrayBufferToBase64);
      }

      const _scale = Math.max(
        MIN_BASE_SCALE,
        Math.min(
          getScale(size.width, paperWidth),
          getScale(size.height - RULER_HEIGHT, paperHeight),
        ),
      );

      return {
        backgrounds: _backgrounds,
        pageSizes: _pageSizes,
        scale: _scale,
      };
    },
    [maxZoom],
  );

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const runInit = useCallback(
    async (prop: { template: Template; size: Size }) => {
      const requestId = ++requestIdRef.current;

      try {
        const { pageSizes, scale, backgrounds } = await init(prop);
        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setPageSizes(pageSizes);
        setScale(scale);
        setBackgrounds(backgrounds);
        setError(null);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setError(error);
          console.error('[@pdfme/ui]', error);
        }
      }
    },
    [init],
  );

  useEffect(() => {
    void runInit({ template, size });
  }, [runInit, template, size]);

  const refresh = useCallback((template: Template) => runInit({ template, size }), [runInit, size]);

  return {
    backgrounds,
    pageSizes,
    baseScale: scale,
    scale: scale * zoomLevel,
    error,
    refresh,
  };
};

type UseZoomProps = {
  baseScale: number;
  maxZoom: number;
  pageCursor: number;
  pageSizes: Size[];
  containerRef: RefObject<HTMLDivElement | null>;
  paperRefs: MutableRefObject<HTMLDivElement[]>;
  size: Size;
  hasRulers?: boolean;
  initialZoomLevel?: number;
  onZoomCommit?: () => void;
};

const ZOOM_RENDER_COMMIT_DELAY = 220;
const WHEEL_ZOOM_SENSITIVITY = 0.004;
const MAX_WHEEL_DELTA_PER_FRAME = 120;
const TOUCH_ZOOM_SENSITIVITY = 1.8;

const getTouchDistance = (touches: TouchList) => {
  const first = touches.item(0);
  const second = touches.item(1);
  if (!first || !second) return 0;

  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

const getTouchCenter = (touches: TouchList) => {
  const first = touches.item(0);
  const second = touches.item(1);
  if (!first || !second) return null;

  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  };
};

const getWheelZoomFactor = (event: WheelEvent) => {
  const deltaModeMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 80 : 1;
  const normalizedDelta = Math.max(
    -MAX_WHEEL_DELTA_PER_FRAME,
    Math.min(MAX_WHEEL_DELTA_PER_FRAME, event.deltaY * deltaModeMultiplier),
  );

  return Math.exp(-normalizedDelta * WHEEL_ZOOM_SENSITIVITY);
};

export const useZoom = ({
  baseScale,
  maxZoom,
  pageCursor,
  pageSizes,
  containerRef,
  paperRefs,
  size,
  hasRulers = false,
  initialZoomLevel = 1,
  onZoomCommit,
}: UseZoomProps) => {
  const [zoomLevel, setZoomLevelState] = useState(initialZoomLevel);
  const [zoomMode, setZoomModeState] = useState<ZoomMode>('manual');
  const [displayScale, setDisplayScale] = useState(0);
  const [renderScale, setRenderScale] = useState(0);

  const zoomLevelRef = useRef(zoomLevel);
  const zoomModeRef = useRef<ZoomMode>(zoomMode);
  const displayScaleRef = useRef(displayScale);
  const baseScaleRef = useRef(baseScale);
  const pendingAnchorRef = useRef<ZoomAnchor | null>(null);
  const pendingCommitCallbackRef = useRef(false);
  const renderCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const queuedGestureRef = useRef<{ zoomLevel: number; anchor: ZoomAnchor | null } | null>(null);
  const touchGestureRef = useRef<{ distance: number; zoomLevel: number } | null>(null);
  const zoomContainerReady = displayScale > 0;

  useEffect(() => {
    baseScaleRef.current = baseScale;
  }, [baseScale]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    zoomModeRef.current = zoomMode;
  }, [zoomMode]);

  useEffect(() => {
    displayScaleRef.current = displayScale;
  }, [displayScale]);

  const getAnchor = useCallback(
    (point?: { clientX: number; clientY: number }) => {
      const container = containerRef.current;
      const paper = paperRefs.current[pageCursor];
      if (!container || !paper) return null;

      const containerRect = container.getBoundingClientRect();
      const clientX = point?.clientX ?? containerRect.left + containerRect.width / 2;
      const clientY = point?.clientY ?? containerRect.top + containerRect.height / 2;

      return getZoomAnchor({
        pageIndex: pageCursor,
        paper,
        clientX,
        clientY,
        scale: displayScaleRef.current,
      });
    },
    [containerRef, pageCursor, paperRefs],
  );

  const markCommitted = useCallback(() => {
    pendingCommitCallbackRef.current = true;
  }, []);

  const clearRenderCommitTimer = useCallback(() => {
    if (renderCommitTimerRef.current) {
      clearTimeout(renderCommitTimerRef.current);
      renderCommitTimerRef.current = null;
    }
  }, []);

  const commitRenderScale = useCallback(() => {
    clearRenderCommitTimer();
    const nextScale = displayScaleRef.current;
    setRenderScale(nextScale);
    markCommitted();
  }, [clearRenderCommitTimer, markCommitted]);

  const updateZoom = useCallback(
    ({
      nextZoomLevel,
      mode,
      anchor,
      commitRender,
    }: {
      nextZoomLevel: number;
      mode: ZoomMode;
      anchor?: ZoomAnchor | null;
      commitRender: boolean;
    }) => {
      const nextZoom = clampZoomLevel(nextZoomLevel, maxZoom);
      const nextDisplayScale = baseScaleRef.current > 0 ? baseScaleRef.current * nextZoom : 0;

      pendingAnchorRef.current = anchor ?? null;
      zoomLevelRef.current = nextZoom;
      zoomModeRef.current = mode;
      displayScaleRef.current = nextDisplayScale;

      setZoomModeState(mode);
      setZoomLevelState(nextZoom);
      setDisplayScale(nextDisplayScale);

      if (commitRender) {
        clearRenderCommitTimer();
        setRenderScale(nextDisplayScale);
        markCommitted();
        return;
      }

      clearRenderCommitTimer();
      renderCommitTimerRef.current = setTimeout(() => {
        setRenderScale(displayScaleRef.current);
        markCommitted();
      }, ZOOM_RENDER_COMMIT_DELAY);
    },
    [clearRenderCommitTimer, markCommitted, maxZoom],
  );

  const queueGestureZoom = useCallback(
    (nextZoomLevel: number, anchor: ZoomAnchor | null) => {
      queuedGestureRef.current = { zoomLevel: nextZoomLevel, anchor };
      if (animationFrameRef.current !== null) return;

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        const queued = queuedGestureRef.current;
        queuedGestureRef.current = null;
        if (!queued) return;

        updateZoom({
          nextZoomLevel: queued.zoomLevel,
          mode: 'manual',
          anchor: queued.anchor,
          commitRender: false,
        });
      });
    },
    [updateZoom],
  );

  const setZoomLevel = useCallback(
    (nextZoomLevel: number) => {
      updateZoom({
        nextZoomLevel,
        mode: 'manual',
        anchor: getAnchor(),
        commitRender: true,
      });
    },
    [getAnchor, updateZoom],
  );

  const fitZoom = useCallback(
    (mode: Exclude<ZoomMode, 'manual'>) => {
      const nextZoomLevel = getFitZoomLevel({
        mode,
        pageSize: pageSizes[pageCursor],
        container: containerRef.current,
        baseScale: baseScaleRef.current,
        maxZoom,
        hasRulers,
      });
      updateZoom({
        nextZoomLevel,
        mode,
        anchor: getAnchor(),
        commitRender: true,
      });
    },
    [containerRef, getAnchor, hasRulers, maxZoom, pageCursor, pageSizes, updateZoom],
  );

  useEffect(() => {
    if (baseScale <= 0) {
      setDisplayScale(0);
      setRenderScale(0);
      return;
    }

    const nextZoomLevel =
      zoomModeRef.current === 'manual'
        ? clampZoomLevel(zoomLevelRef.current, maxZoom)
        : getFitZoomLevel({
            mode: zoomModeRef.current,
            pageSize: pageSizes[pageCursor],
            container: containerRef.current,
            baseScale,
            maxZoom,
            hasRulers,
          });
    const nextDisplayScale = baseScale * nextZoomLevel;

    zoomLevelRef.current = nextZoomLevel;
    displayScaleRef.current = nextDisplayScale;
    setZoomLevelState(nextZoomLevel);
    setDisplayScale(nextDisplayScale);
    setRenderScale(nextDisplayScale);
    markCommitted();
  }, [
    baseScale,
    containerRef,
    hasRulers,
    markCommitted,
    maxZoom,
    pageCursor,
    pageSizes,
    size.height,
    size.width,
  ]);

  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    if (anchor) {
      restoreZoomAnchor({
        container: containerRef.current,
        paper: paperRefs.current[anchor.pageIndex],
        anchor,
        scale: displayScale,
      });
      pendingAnchorRef.current = null;
    }

    if (pendingCommitCallbackRef.current && Math.abs(displayScale - renderScale) < Number.EPSILON) {
      pendingCommitCallbackRef.current = false;
      onZoomCommit?.();
    }
  }, [containerRef, displayScale, onZoomCommit, paperRefs, renderScale]);

  useEffect(() => {
    if (!zoomContainerReady) return undefined;

    const node = containerRef.current;
    if (!node) return undefined;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      const anchor = getAnchor({ clientX: event.clientX, clientY: event.clientY });
      const nextZoomLevel = zoomLevelRef.current * getWheelZoomFactor(event);
      queueGestureZoom(nextZoomLevel, anchor);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;

      event.preventDefault();
      event.stopPropagation();
      touchGestureRef.current = {
        distance: getTouchDistance(event.touches),
        zoomLevel: zoomLevelRef.current,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !touchGestureRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      const center = getTouchCenter(event.touches);
      const distance = getTouchDistance(event.touches);
      if (!center || distance <= 0 || touchGestureRef.current.distance <= 0) return;

      const anchor = getAnchor(center);
      const ratio = distance / touchGestureRef.current.distance;
      const dampedRatio = Math.pow(ratio, TOUCH_ZOOM_SENSITIVITY);
      queueGestureZoom(touchGestureRef.current.zoomLevel * dampedRatio, anchor);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) return;

      touchGestureRef.current = null;
      commitRenderScale();
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('touchstart', onTouchStart, { passive: false });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    node.addEventListener('touchcancel', onTouchEnd);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [commitRenderScale, containerRef, getAnchor, queueGestureZoom, zoomContainerReady]);

  useEffect(
    () => () => {
      clearRenderCommitTimer();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [clearRenderCommitTimer],
  );

  return {
    displayScale,
    renderScale,
    zoomLevel,
    zoomMode,
    setZoomLevel,
    fitWidth: () => fitZoom('fit-width'),
    fitHeight: () => fitZoom('fit-height'),
  };
};

type ScrollPageCursorProps = {
  ref: RefObject<HTMLDivElement | null>;
  paperRefs: MutableRefObject<HTMLDivElement[]>;
  pageSizes: Size[];
  scale: number;
  pageCursor: number;
  onChangePageCursor: (page: number) => void;
};

const getVisibleArea = (containerRect: DOMRect, elementRect: DOMRect) => {
  const visibleWidth = Math.max(
    0,
    Math.min(containerRect.right, elementRect.right) -
      Math.max(containerRect.left, elementRect.left),
  );
  const visibleHeight = Math.max(
    0,
    Math.min(containerRect.bottom, elementRect.bottom) -
      Math.max(containerRect.top, elementRect.top),
  );

  return visibleWidth * visibleHeight;
};

const getMostVisiblePageIndex = (
  container: HTMLElement,
  paperRefs: MutableRefObject<HTMLDivElement[]>,
  pageCursor: number,
) => {
  const containerRect = container.getBoundingClientRect();
  let bestPageIndex = pageCursor;
  let bestVisibleArea = 0;

  paperRefs.current.forEach((paper, pageIndex) => {
    if (!paper) return;

    const visibleArea = getVisibleArea(containerRect, paper.getBoundingClientRect());
    if (visibleArea > bestVisibleArea) {
      bestVisibleArea = visibleArea;
      bestPageIndex = pageIndex;
    }
  });

  return bestVisibleArea > 0 ? bestPageIndex : pageCursor;
};

export const useScrollPageCursor = ({
  ref,
  paperRefs,
  pageSizes,
  scale,
  pageCursor,
  onChangePageCursor,
}: ScrollPageCursorProps) => {
  const onScroll = useCallback(() => {
    if (!pageSizes[0] || !ref.current) {
      return;
    }

    const _pageCursor = getMostVisiblePageIndex(ref.current, paperRefs, pageCursor);
    if (_pageCursor !== pageCursor) {
      onChangePageCursor(_pageCursor);
    }
  }, [onChangePageCursor, pageCursor, pageSizes, paperRefs, ref]);

  useEffect(() => {
    const node = ref.current;
    node?.addEventListener('scroll', onScroll);
    const animationFrame = window.requestAnimationFrame(onScroll);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      node?.removeEventListener('scroll', onScroll);
    };
  }, [ref, onScroll, scale]);
};

export const useMountStatus = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
};

interface UseInitEventsParams {
  pageCursor: number;
  pageSizes: Size[];
  activeElements: HTMLElement[];
  template: Template;
  schemasList: SchemaForUI[][];
  changeSchemas: ChangeSchemas;
  commitSchemas: (newSchemas: SchemaForUI[]) => void;
  removeSchemas: (ids: string[]) => void;
  onSaveTemplate: (t: Template) => void;
  past: React.MutableRefObject<SchemaForUI[][]>;
  future: React.MutableRefObject<SchemaForUI[][]>;
  setSchemasList: React.Dispatch<React.SetStateAction<SchemaForUI[][]>>;
  onEdit: (targets: Array<HTMLElement | null | undefined>) => void;
  onEditEnd: () => void;
}

export const useInitEvents = ({
  pageCursor,
  pageSizes,
  activeElements,
  template,
  schemasList,
  changeSchemas,
  commitSchemas,
  removeSchemas,
  onSaveTemplate,
  past,
  future,
  setSchemasList,
  onEdit,
  onEditEnd,
}: UseInitEventsParams) => {
  const copiedSchemas = useRef<SchemaForUI[] | null>(null);

  const initEvents = useCallback(() => {
    const getElementsByIds = (ids: string[]) =>
      ids
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element instanceof HTMLElement);

    const getActiveSchemas = () => {
      const ids = activeElements.map((ae) => ae.id);

      return schemasList[pageCursor].filter((s) => ids.includes(s.id));
    };
    const timeTravel = (mode: 'undo' | 'redo') => {
      const isUndo = mode === 'undo';
      const stack = isUndo ? past : future;
      if (stack.current.length <= 0) return;
      (isUndo ? future : past).current.push(cloneDeep(schemasList[pageCursor]));
      const s = cloneDeep(schemasList);
      s[pageCursor] = stack.current.pop()!;
      setSchemasList(s);
    };
    initShortCuts({
      move: (command, isShift) => {
        const pageSize = pageSizes[pageCursor];
        const activeSchemas = getActiveSchemas();
        const arg = moveCommandToChangeSchemasArg({ command, activeSchemas, pageSize, isShift });
        changeSchemas(arg);
      },

      copy: () => {
        const activeSchemas = getActiveSchemas();
        if (activeSchemas.length === 0) return;
        copiedSchemas.current = activeSchemas;
      },
      paste: () => {
        if (!copiedSchemas.current || copiedSchemas.current.length === 0) return;
        const schema = schemasList[pageCursor];
        const stackUniqueSchemaNames: string[] = [];
        const pasteSchemas = copiedSchemas.current.map((cs) => {
          const id = uuid();
          const name = getUniqueSchemaName({
            copiedSchemaName: cs.name,
            schema,
            stackUniqueSchemaNames,
          });
          const { height, width, position: p } = cs;
          const ps = pageSizes[pageCursor];
          const position = {
            x: p.x + 10 > ps.width - width ? ps.width - width : p.x + 10,
            y: p.y + 10 > ps.height - height ? ps.height - height : p.y + 10,
          };

          return Object.assign(cloneDeep(cs), { id, name, position });
        });
        commitSchemas(schemasList[pageCursor].concat(pasteSchemas));
        setTimeout(() => {
          onEdit(getElementsByIds(pasteSchemas.map((s) => s.id)));
        });
        copiedSchemas.current = pasteSchemas;
      },
      redo: () => timeTravel('redo'),
      undo: () => timeTravel('undo'),
      save: () =>
        onSaveTemplate && onSaveTemplate(schemasList2template(schemasList, template.basePdf)),
      remove: () => removeSchemas(getActiveSchemas().map((s) => s.id)),
      esc: onEditEnd,
      selectAll: () => onEdit(getElementsByIds(schemasList[pageCursor].map((s) => s.id))),
    });
  }, [
    template,
    activeElements,
    pageCursor,
    pageSizes,
    changeSchemas,
    commitSchemas,
    schemasList,
    onSaveTemplate,
    removeSchemas,
    past,
    future,
    setSchemasList,
    copiedSchemas,
    onEdit,
    onEditEnd,
  ]);

  const destroyEvents = useCallback(() => {
    destroyShortCuts();
  }, []);

  useEffect(() => {
    initEvents();

    return destroyEvents;
  }, [initEvents, destroyEvents]);
};
