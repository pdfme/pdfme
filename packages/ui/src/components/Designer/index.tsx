import React, {
  useRef,
  useState,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  cloneDeep,
  ZOOM,
  Template,
  Schema,
  SchemaForUI,
  ChangeSchemas,
  DesignerProps,
  Size,
  isBlankPdf,
  px2mm,
} from '@pdfme/common';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import RightSidebar from './RightSidebar/index.js';
import LeftSidebar from './LeftSidebar.js';
import Canvas from './Canvas/index.js';
import { RULER_HEIGHT, RIGHT_SIDEBAR_WIDTH, LEFT_SIDEBAR_WIDTH } from '../../constants.js';
import { I18nContext, OptionsContext, PluginsRegistry } from '../../contexts.js';
import {
  schemasList2template,
  normalizeSchemasListForBasePdf,
  uuid,
  round,
  template2SchemasList,
  getPagesScrollTopByIndex,
  changeSchemas as _changeSchemas,
  useMaxZoom,
} from '../../helper.js';
import { useUIPreProcessor, useScrollPageCursor, useInitEvents, useZoom } from '../../hooks.js';
import {
  createDesignerSelection,
  getDesignerSelectionPageIndex,
  getSelectedSchemaIds,
  normalizeDesignerSchemaSelectionTargets,
  type DesignerSelectSchemas,
  type DesignerSelection,
} from '../../designerSelection.js';
import Root from '../Root.js';
import ErrorScreen from '../ErrorScreen.js';
import CtlBar from '../CtlBar.js';

type TemplateEditorProps = Omit<DesignerProps, 'domContainer'> & {
  size: Size;
  onSaveTemplate: (t: Template) => void;
  onChangeTemplate: (t: Template) => void;
  onChangeSelection?: (selection: DesignerSelection) => void;
  onRegisterSchemaSelectionHandler?: (handler: DesignerSelectSchemas | null) => void;
  onUpdateTemplatePageApplied?: (page: number) => void;
  onPageCursorChange: (newPageCursor: number, totalPages: number) => void;
  updateTemplatePage?: number;
};

type PendingScrollPage = {
  page: number;
  queuedPageSizes: Size[];
  requestedPage?: number;
};

type DesignerHistoryEntry = {
  schemasList: SchemaForUI[][];
  /** Page shown when this snapshot is restored. */
  pageCursor: number;
  /**
   * Page the action that left this snapshot landed on.
   * Swapped with `pageCursor` when the entry moves to the other stack, so redo
   * returns to the page where that step was applied.
   */
  appliedCursor: number;
};

type ApplySchemasOptions = {
  /** Undo/redo and page add/delete always notify. Schema commits do not. */
  notifyPageCursor: 'always' | 'never';
  /** Keep a selection only when its schemas still exist on the landing page. */
  preserveSelection?: boolean;
};

const MAX_HISTORY_LENGTH = 100;
/** Release scroll suppression if a pending page scroll never finishes. */
const SCROLL_SUPPRESS_FALLBACK_MS = 1000;

const pushHistory = (stack: DesignerHistoryEntry[], entry: DesignerHistoryEntry) => {
  stack.push({
    schemasList: cloneDeep(entry.schemasList),
    pageCursor: entry.pageCursor,
    appliedCursor: entry.appliedCursor,
  });
  if (stack.length > MAX_HISTORY_LENGTH) {
    stack.splice(0, stack.length - MAX_HISTORY_LENGTH);
  }
};

const clampPageCursor = (pageCursor: number, pageCount: number) => {
  if (pageCount <= 0) return 0;
  const normalized = Number.isFinite(pageCursor) ? Math.trunc(pageCursor) : 0;
  return Math.min(Math.max(normalized, 0), pageCount - 1);
};

const schemasEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/**
 * When the canvas scales there is a displacement of the starting position of the dragged schema.
 * It moves left or right from the top-left corner of the drag icon depending on the scale.
 * This function calculates the adjustment needed to compensate for this displacement.
 */
const scaleDragPosAdjustment = (adjustment: number, scale: number): number => {
  if (scale > 1) return adjustment * (scale - 1);
  if (scale < 1) return adjustment * -(1 - scale);
  return 0;
};

// Minimum canvas width (px) that should remain visible next to an open
// right sidebar for the Designer to stay usable.
const MIN_CANVAS_WIDTH = 100;

const TemplateEditor = ({
  template,
  size,
  onSaveTemplate,
  onChangeTemplate,
  onPageCursorChange,
  onChangeSelection,
  onRegisterSchemaSelectionHandler,
  onUpdateTemplatePageApplied,
  updateTemplatePage,
}: TemplateEditorProps) => {
  const past = useRef<DesignerHistoryEntry[]>([]);
  const future = useRef<DesignerHistoryEntry[]>([]);
  const schemasListRef = useRef<SchemaForUI[][]>([[]]);
  const pageCursorRef = useRef(0);
  const pendingSelectionIdsRef = useRef<string[] | null>(null);
  const suppressScrollPageCursorRef = useRef(false);
  const scrollSuppressTokenRef = useRef(0);
  const scrollSuppressTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const maxZoom = useMaxZoom();

  const canvasWidth = size.width - LEFT_SIDEBAR_WIDTH;

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const activeElementsRef = useRef(activeElements);
  activeElementsRef.current = activeElements;
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
  schemasListRef.current = schemasList;
  pageCursorRef.current = pageCursor;
  const [pendingScrollPage, setPendingScrollPage] = useState<PendingScrollPage | null>(null);
  // Close the sidebar by default on narrow viewports (e.g. smartphones) where
  // it would not leave any usable canvas width.
  const [sidebarOpen, setSidebarOpen] = useState(
    options.sidebarOpen ?? canvasWidth - RIGHT_SIDEBAR_WIDTH >= MIN_CANVAS_WIDTH,
  );
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [prevTemplate, setPrevTemplate] = useState<Template | null>(null);

  const sizeExcSidebars = useMemo(
    () => ({
      // Never let the width go negative; on narrow viewports the open sidebar
      // can be wider than the screen, which previously produced a negative
      // base scale and left the Designer stuck on the loading spinner.
      width: Math.max(sidebarOpen ? canvasWidth - RIGHT_SIDEBAR_WIDTH : canvasWidth, 0),
      height: size.height,
    }),
    [canvasWidth, sidebarOpen, size.height],
  );

  const { backgrounds, pageSizes, baseScale, error, refresh } = useUIPreProcessor({
    template,
    size: sizeExcSidebars,
    zoomLevel: 1,
    maxZoom,
  });
  const { displayScale, renderScale, zoomLevel, zoomMode, setZoomLevel, fitWidth, fitHeight } =
    useZoom({
      baseScale,
      maxZoom,
      pageCursor,
      pageSizes,
      containerRef: canvasRef,
      paperRefs,
      size: sizeExcSidebars,
      hasRulers: true,
      initialZoomLevel: options.zoomLevel ?? 1,
    });
  const previousOptionsZoomLevelRef = useRef(options.zoomLevel);

  const getElementsByIds = (ids: string[]) =>
    ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

  const onEdit = (targets: Array<HTMLElement | null | undefined>) => {
    setActiveElements(
      targets.filter((target): target is HTMLElement => target instanceof HTMLElement),
    );
    setHoveringSchemaId(null);
  };

  const selectSchemas: DesignerSelectSchemas = useCallback(
    (targets, options = {}) => {
      const normalizedTargets = normalizeDesignerSchemaSelectionTargets(targets);
      if (normalizedTargets.length === 0) {
        onEditEnd();
        return;
      }

      const targetPageIndex = getDesignerSelectionPageIndex(normalizedTargets, pageCursor, options);
      const targetSchemas = schemasList[targetPageIndex] ?? [];
      const selectedSchemaIds = getSelectedSchemaIds({
        pageIndex: targetPageIndex,
        schemas: targetSchemas,
        targets: normalizedTargets,
      });

      const editSelectedSchemas = () => onEdit(getElementsByIds(selectedSchemaIds));
      if (selectedSchemaIds.length === 0) {
        onEditEnd();
        return;
      }

      if (targetPageIndex !== pageCursor) {
        setPageCursor(targetPageIndex);
        onPageCursorChange(targetPageIndex, schemasList.length);
        if (options.scroll !== false && canvasRef.current) {
          canvasRef.current.scrollTop = getPagesScrollTopByIndex(
            pageSizes,
            targetPageIndex,
            displayScale,
          );
        }
        setTimeout(editSelectedSchemas);
        return;
      }

      editSelectedSchemas();
    },
    [pageCursor, pageSizes, displayScale, schemasList, onPageCursorChange],
  );

  useEffect(() => {
    onRegisterSchemaSelectionHandler?.(selectSchemas);
    return () => onRegisterSchemaSelectionHandler?.(null);
  }, [onRegisterSchemaSelectionHandler, selectSchemas]);

  useEffect(() => {
    onChangeSelection?.(
      createDesignerSelection({
        activeSchemaIds: activeElements.map((element) => element.id),
        pageIndex: pageCursor,
        schemasList,
      }),
    );
  }, [activeElements, onChangeSelection, pageCursor, schemasList]);

  const onEditEnd = () => {
    setActiveElements([]);
    setHoveringSchemaId(null);
  };
  const onEditRef = useRef(onEdit);
  const onEditEndRef = useRef(onEditEnd);
  onEditRef.current = onEdit;
  onEditEndRef.current = onEditEnd;

  useLayoutEffect(() => {
    const ids = pendingSelectionIdsRef.current;
    if (!ids) return;
    if (pageSizes.length !== schemasList.length || backgrounds.length !== schemasList.length) {
      return;
    }
    pendingSelectionIdsRef.current = null;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    onEditRef.current(elements);
  }, [backgrounds, pageSizes, schemasList]);

  useEffect(() => {
    if (previousOptionsZoomLevelRef.current === options.zoomLevel) {
      return;
    }

    previousOptionsZoomLevelRef.current = options.zoomLevel;
    if (typeof options.zoomLevel === 'number') {
      setZoomLevel(options.zoomLevel);
    }
  }, [options.zoomLevel, setZoomLevel]);

  useEffect(() => {
    if (typeof options.sidebarOpen === 'boolean') {
      setSidebarOpen(options.sidebarOpen);
    }
  }, [options.sidebarOpen]);

  const armScrollSuppression = (fallbackMs?: number) => {
    const token = ++scrollSuppressTokenRef.current;
    suppressScrollPageCursorRef.current = true;
    if (scrollSuppressTimerRef.current !== null) {
      window.clearTimeout(scrollSuppressTimerRef.current);
      scrollSuppressTimerRef.current = null;
    }
    if (fallbackMs !== undefined) {
      scrollSuppressTimerRef.current = window.setTimeout(() => {
        scrollSuppressTimerRef.current = null;
        if (scrollSuppressTokenRef.current !== token) return;
        suppressScrollPageCursorRef.current = false;
      }, fallbackMs);
      return;
    }
    requestAnimationFrame(() => {
      if (scrollSuppressTokenRef.current !== token) return;
      suppressScrollPageCursorRef.current = false;
    });
  };

  useEffect(() => {
    return () => {
      if (scrollSuppressTimerRef.current !== null) {
        window.clearTimeout(scrollSuppressTimerRef.current);
      }
    };
  }, []);

  useScrollPageCursor({
    ref: canvasRef,
    paperRefs,
    pageSizes,
    scale: displayScale,
    pageCursor,
    onChangePageCursor: (p) => {
      if (suppressScrollPageCursorRef.current) return;
      setPageCursor(p);
      onPageCursorChange(p, schemasList.length);
      onEditEnd();
    },
  });

  useLayoutEffect(() => {
    if (!pendingScrollPage || !canvasRef.current) {
      return;
    }

    const { page: pendingPage, queuedPageSizes, requestedPage } = pendingScrollPage;
    if (!pageSizes[pendingPage] || pageSizes.length !== schemasList.length) {
      return;
    }

    if (isBlankPdf(template.basePdf)) {
      const { width, height } = template.basePdf;
      const hasCurrentBlankPdfSizes = pageSizes.every(
        (pageSize) => pageSize.width === width && pageSize.height === height,
      );
      if (!hasCurrentBlankPdfSizes) {
        return;
      }
    } else if (pageSizes === queuedPageSizes) {
      return;
    }

    setPendingScrollPage(null);
    armScrollSuppression();
    canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, pendingPage, displayScale);
    if (requestedPage !== undefined) {
      onUpdateTemplatePageApplied?.(requestedPage);
    }
  }, [
    displayScale,
    pageCursor,
    pageSizes,
    pendingScrollPage,
    schemasList.length,
    template.basePdf,
    onUpdateTemplatePageApplied,
  ]);

  useLayoutEffect(() => {
    const updateHeight = () => {
      setCanvasHeight(canvasRef.current ? canvasRef.current.clientHeight : 0);
    };
    updateHeight();

    if (typeof ResizeObserver === 'function' && canvasRef.current) {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(canvasRef.current);
      return () => observer.disconnect();
    }
    return undefined;
  }, [displayScale]);

  const applyDocument = useCallback(
    (nextSchemasList: SchemaForUI[][], nextPageCursor: number, options: ApplySchemasOptions) => {
      const basePdf = template.basePdf;
      const next = normalizeSchemasListForBasePdf(nextSchemasList, basePdf, pageSizes.length);
      const clampedCursor = clampPageCursor(nextPageCursor, next.length);
      const pageCountChanged = next.length !== schemasListRef.current.length;
      const cursorChanged = clampedCursor !== pageCursorRef.current;

      if (options.preserveSelection) {
        const landingPage = next[clampedCursor] ?? [];
        const previousIds = activeElementsRef.current.map((element) => element.id);
        const survivingIds = previousIds.filter((id) =>
          landingPage.some((schema) => schema.id === id),
        );
        if (survivingIds.length !== previousIds.length) {
          onEditEndRef.current();
        }
        pendingSelectionIdsRef.current = survivingIds.length > 0 ? survivingIds : null;
      }

      schemasListRef.current = next;
      pageCursorRef.current = clampedCursor;
      setSchemasList(next);
      setPageCursor(clampedCursor);

      const newTemplate = schemasList2template(next, basePdf);
      onChangeTemplate(newTemplate);
      if (options.notifyPageCursor === 'always') {
        onPageCursorChange(clampedCursor, next.length);
      }
      if (pageCountChanged) {
        void refresh(newTemplate);
      }

      if (cursorChanged) {
        if (pageCountChanged) {
          armScrollSuppression(SCROLL_SUPPRESS_FALLBACK_MS);
          setPendingScrollPage({ page: clampedCursor, queuedPageSizes: pageSizes });
        } else if (canvasRef.current) {
          armScrollSuppression();
          canvasRef.current.scrollTop = getPagesScrollTopByIndex(
            pageSizes,
            clampedCursor,
            displayScale,
          );
        }
      }
    },
    [displayScale, onChangeTemplate, onPageCursorChange, pageSizes, refresh, template.basePdf],
  );

  const commitSchemas = useCallback(
    (newSchemas: SchemaForUI[]) => {
      const currentSchemas = schemasListRef.current;
      const currentPage = pageCursorRef.current;
      if (schemasEqual(currentSchemas[currentPage], newSchemas)) return;

      future.current = [];
      pushHistory(past.current, {
        schemasList: currentSchemas,
        pageCursor: currentPage,
        appliedCursor: currentPage,
      });
      const next = cloneDeep(currentSchemas);
      next[currentPage] = newSchemas;
      applyDocument(next, currentPage, { notifyPageCursor: 'never' });
    },
    [applyDocument],
  );

  // Renderer layout sync (table/list height). The live document is what the
  // next undo stores, so updating it here keeps redo from restoring a stale
  // height and syncing again. History stacks are left untouched.
  const syncSchemas: ChangeSchemas = useCallback(
    (objs) => {
      const currentPage = pageCursorRef.current;
      const pageSize = pageSizes[currentPage];
      if (!pageSize || objs.length === 0) return;

      _changeSchemas({
        objs,
        schemas: schemasListRef.current[currentPage] ?? [],
        basePdf: template.basePdf,
        pluginsRegistry,
        pageSize,
        commitSchemas: (newSchemas) => {
          const currentSchemas = schemasListRef.current;
          if (schemasEqual(currentSchemas[currentPage], newSchemas)) return;

          const next = cloneDeep(currentSchemas);
          next[currentPage] = newSchemas;
          applyDocument(next, currentPage, { notifyPageCursor: 'never' });
        },
      });
    },
    [applyDocument, pageSizes, pluginsRegistry, template.basePdf],
  );

  const removeSchemas = useCallback(
    (ids: string[]) => {
      const currentPage = pageCursorRef.current;
      const pageSchemas = schemasListRef.current[currentPage] ?? [];
      commitSchemas(pageSchemas.filter((schema) => !ids.includes(schema.id)));
      onEditEndRef.current();
    },
    [commitSchemas],
  );

  const changeSchemas: ChangeSchemas = useCallback(
    (objs) => {
      const currentPage = pageCursorRef.current;
      _changeSchemas({
        objs,
        schemas: schemasListRef.current[currentPage] ?? [],
        basePdf: template.basePdf,
        pluginsRegistry,
        pageSize: pageSizes[currentPage],
        commitSchemas,
      });
    },
    [commitSchemas, pageSizes, pluginsRegistry, template.basePdf],
  );

  const timeTravel = useCallback(
    (mode: 'undo' | 'redo') => {
      const source = mode === 'undo' ? past : future;
      const destination = mode === 'undo' ? future : past;
      const target = source.current.pop();
      if (!target) return;

      pushHistory(destination.current, {
        schemasList: schemasListRef.current,
        pageCursor: target.appliedCursor,
        appliedCursor: target.pageCursor,
      });
      applyDocument(target.schemasList, target.pageCursor, {
        notifyPageCursor: 'always',
        preserveSelection: true,
      });
    },
    [applyDocument],
  );

  const undo = useCallback(() => timeTravel('undo'), [timeTravel]);
  const redo = useCallback(() => timeTravel('redo'), [timeTravel]);

  useInitEvents({
    pageCursor,
    pageSizes,
    activeElements,
    template,
    schemasList,
    changeSchemas,
    commitSchemas,
    removeSchemas,
    onSaveTemplate,
    undo,
    redo,
    onEdit,
    onEditEnd,
  });

  const updateTemplate = useCallback(
    async (newTemplate: Template, targetPage?: number) => {
      const sl = await template2SchemasList(newTemplate);
      schemasListRef.current = sl;
      setSchemasList(sl);
      pendingSelectionIdsRef.current = null;
      onEditEndRef.current();

      if (targetPage !== undefined) {
        const normalizedPage = Number.isFinite(targetPage) ? Math.trunc(targetPage) : 0;
        const clampedPage = Math.min(Math.max(normalizedPage, 0), sl.length - 1);
        pageCursorRef.current = clampedPage;
        setPageCursor(clampedPage);
        onPageCursorChange(clampedPage, sl.length);
        setPendingScrollPage({
          page: clampedPage,
          queuedPageSizes: pageSizes,
          requestedPage: targetPage,
        });
      } else {
        const clampedPage = Math.min(pageCursorRef.current, sl.length - 1);
        const cursorChanged = clampedPage !== pageCursorRef.current;
        pageCursorRef.current = clampedPage;
        setPageCursor(clampedPage);
        if (cursorChanged) {
          onPageCursorChange(clampedPage, sl.length);
          setPendingScrollPage({ page: clampedPage, queuedPageSizes: pageSizes });
        }
      }
    },
    [pageSizes, onPageCursorChange],
  );

  const addSchema = (defaultSchema: Schema) => {
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = isBlankPdf(template.basePdf)
      ? template.basePdf.padding
      : [0, 0, 0, 0];
    const pageSize = pageSizes[pageCursor];

    const newSchemaName = (prefix: string) => {
      let index = schemasList.reduce((acc, page) => acc + page.length, 1);
      let newName = prefix + index;
      while (schemasList.some((page) => page.find((s) => s.name === newName))) {
        index++;
        newName = prefix + index;
      }
      return newName;
    };
    const ensureMiddleValue = (min: number, value: number, max: number) =>
      Math.min(Math.max(min, value), max);

    const s = {
      id: uuid(),
      ...defaultSchema,
      name: newSchemaName(i18n('field')),
      position: {
        x: ensureMiddleValue(
          paddingLeft,
          defaultSchema.position.x,
          pageSize.width - paddingRight - defaultSchema.width,
        ),
        y: ensureMiddleValue(
          paddingTop,
          defaultSchema.position.y,
          pageSize.height - paddingBottom - defaultSchema.height,
        ),
      },
      required: defaultSchema.readOnly
        ? false
        : options.requiredByDefault || defaultSchema.required || false,
    } as SchemaForUI;

    if (defaultSchema.position.y === 0) {
      const paper = paperRefs.current[pageCursor];
      const rectTop = paper ? paper.getBoundingClientRect().top : 0;
      s.position.y = rectTop > 0 ? paddingTop : pageSizes[pageCursor].height / 2;
    }

    commitSchemas(schemasList[pageCursor].concat(s));
    setTimeout(() => onEdit([document.getElementById(s.id)]));
  };

  const onSortEnd = (sortedSchemas: SchemaForUI[]) => {
    commitSchemas(sortedSchemas);
  };

  const onChangeHoveringSchemaId = (id: string | null) => {
    setHoveringSchemaId(id);
  };

  const handleRemovePage = () => {
    const currentPage = pageCursorRef.current;
    if (currentPage === 0) return;
    if (!window.confirm(i18n('removePageConfirm'))) return;

    future.current = [];
    const currentSchemas = schemasListRef.current;
    pushHistory(past.current, {
      schemasList: currentSchemas,
      pageCursor: currentPage,
      appliedCursor: currentPage - 1,
    });
    const next = cloneDeep(currentSchemas);
    next.splice(currentPage, 1);
    onEditEndRef.current();
    pendingSelectionIdsRef.current = null;
    applyDocument(next, currentPage - 1, { notifyPageCursor: 'always' });
  };

  const handleAddPageAfter = () => {
    future.current = [];
    const currentSchemas = schemasListRef.current;
    const currentPage = pageCursorRef.current;
    pushHistory(past.current, {
      schemasList: currentSchemas,
      pageCursor: currentPage,
      appliedCursor: currentPage + 1,
    });
    const next = cloneDeep(currentSchemas);
    next.splice(currentPage + 1, 0, []);
    onEditEndRef.current();
    pendingSelectionIdsRef.current = null;
    applyDocument(next, currentPage + 1, { notifyPageCursor: 'always' });
  };

  if (prevTemplate !== template) {
    setPrevTemplate(template);
    void updateTemplate(template, updateTemplatePage);
  }

  if (error) {
    // Pass the error directly to ErrorScreen
    return <ErrorScreen size={size} error={error} />;
  }
  const pageManipulation = isBlankPdf(template.basePdf)
    ? { addPageAfter: handleAddPageAfter, removePage: handleRemovePage }
    : {};

  return (
    <Root size={size} scale={displayScale}>
      <DndContext
        onDragEnd={(event: DragEndEvent) => {
          // Triggered after a schema is dragged & dropped from the left sidebar.
          if (!event.active) return;
          const active = event.active;
          const pageRect = paperRefs.current[pageCursor].getBoundingClientRect();

          const dragStartLeft = active.rect.current.initial?.left || 0;
          const dragStartTop = active.rect.current.initial?.top || 0;

          const canvasLeftOffsetFromPageCorner =
            pageRect.left - dragStartLeft + scaleDragPosAdjustment(20, displayScale);
          const canvasTopOffsetFromPageCorner = pageRect.top - dragStartTop;

          const moveY = (event.delta.y - canvasTopOffsetFromPageCorner) / displayScale;
          const moveX = (event.delta.x - canvasLeftOffsetFromPageCorner) / displayScale;

          const position = {
            x: round(px2mm(Math.max(0, moveX)), 2),
            y: round(px2mm(Math.max(0, moveY)), 2),
          };

          addSchema({ ...(active.data.current as Schema), position });
        }}
        onDragStart={onEditEnd}
      >
        <LeftSidebar height={canvasHeight} scale={displayScale} basePdf={template.basePdf} />

        <div
          style={{
            position: 'absolute',
            width: canvasWidth,
            marginLeft: LEFT_SIDEBAR_WIDTH,
          }}
        >
          <CtlBar
            size={sizeExcSidebars}
            pageCursor={pageCursor}
            pageNum={schemasList.length}
            setPageCursor={(p) => {
              if (!canvasRef.current) return;
              // Update scroll position and state
              canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, displayScale);
              setPageCursor(p);
              onPageCursorChange(p, schemasList.length);
              onEditEnd();
            }}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            zoomMode={zoomMode}
            fitWidth={fitWidth}
            fitHeight={fitHeight}
            {...pageManipulation}
          />

          <RightSidebar
            hoveringSchemaId={hoveringSchemaId}
            onChangeHoveringSchemaId={onChangeHoveringSchemaId}
            height={canvasHeight}
            size={size}
            pageSize={pageSizes[pageCursor] ?? []}
            basePdf={template.basePdf}
            activeElements={activeElements}
            schemasList={schemasList}
            schemas={schemasList[pageCursor] ?? []}
            changeSchemas={changeSchemas}
            syncSchemas={syncSchemas}
            onSortEnd={onSortEnd}
            onEdit={(id) => {
              const editingElem = document.getElementById(id);
              if (editingElem) {
                onEdit([editingElem]);
              }
            }}
            onEditEnd={onEditEnd}
            deselectSchema={onEditEnd}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <Canvas
            ref={canvasRef}
            paperRefs={paperRefs}
            basePdf={template.basePdf}
            hoveringSchemaId={hoveringSchemaId}
            onChangeHoveringSchemaId={onChangeHoveringSchemaId}
            height={size.height - RULER_HEIGHT * ZOOM}
            pageCursor={pageCursor}
            scale={displayScale}
            renderScale={renderScale}
            size={sizeExcSidebars}
            pageSizes={pageSizes}
            backgrounds={backgrounds}
            activeElements={activeElements}
            schemasList={schemasList}
            changeSchemas={changeSchemas}
            syncSchemas={syncSchemas}
            removeSchemas={removeSchemas}
            sidebarOpen={sidebarOpen}
            onEdit={onEdit}
          />
        </div>
      </DndContext>
    </Root>
  );
};

export default TemplateEditor;
