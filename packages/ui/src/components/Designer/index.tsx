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
}: Omit<DesignerProps, 'domContainer'> & {
  size: Size;
  onSaveTemplate: (t: Template) => void;
  onChangeTemplate: (t: Template) => void;
  onChangeSelection?: (selection: DesignerSelection) => void;
  onRegisterSchemaSelectionHandler?: (handler: DesignerSelectSchemas | null) => void;
} & {
  onChangeTemplate: (t: Template) => void;
  onPageCursorChange: (newPageCursor: number, totalPages: number) => void;
}) => {
  const past = useRef<SchemaForUI[][]>([]);
  const future = useRef<SchemaForUI[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const maxZoom = useMaxZoom();

  const canvasWidth = size.width - LEFT_SIDEBAR_WIDTH;

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
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

  useScrollPageCursor({
    ref: canvasRef,
    paperRefs,
    pageSizes,
    scale: displayScale,
    pageCursor,
    onChangePageCursor: (p) => {
      setPageCursor(p);
      onPageCursorChange(p, schemasList.length);
      onEditEnd();
    },
  });

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

  const commitSchemas = useCallback(
    (newSchemas: SchemaForUI[]) => {
      future.current = [];
      past.current.push(cloneDeep(schemasList[pageCursor]));
      const _schemasList = cloneDeep(schemasList);
      _schemasList[pageCursor] = newSchemas;
      setSchemasList(_schemasList);
      onChangeTemplate(schemasList2template(_schemasList, template.basePdf));
    },
    [template, schemasList, pageCursor, onChangeTemplate],
  );

  const removeSchemas = useCallback(
    (ids: string[]) => {
      commitSchemas(schemasList[pageCursor].filter((schema) => !ids.includes(schema.id)));
      onEditEnd();
    },
    [schemasList, pageCursor, commitSchemas],
  );

  const changeSchemas: ChangeSchemas = useCallback(
    (objs) => {
      _changeSchemas({
        objs,
        schemas: schemasList[pageCursor],
        basePdf: template.basePdf,
        pluginsRegistry,
        pageSize: pageSizes[pageCursor],
        commitSchemas,
      });
    },
    [commitSchemas, pageCursor, schemasList, pluginsRegistry, pageSizes, template.basePdf],
  );

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
    past,
    future,
    setSchemasList,
    onEdit,
    onEditEnd,
  });

  const updateTemplate = useCallback(
    async (newTemplate: Template, preservePage = false) => {
      const sl = await template2SchemasList(newTemplate);
      setSchemasList(sl);
      onEditEnd();
      if (!preservePage) {
        setPageCursor(0);
        if (canvasRef.current?.scroll) {
          canvasRef.current.scroll({ top: 0, behavior: 'smooth' });
        }
      } else {
        setPageCursor((prev) => {
          const clamped = Math.min(prev, sl.length - 1);
          if (clamped !== prev && canvasRef.current) {
            canvasRef.current.scroll({
              top: getPagesScrollTopByIndex(pageSizes, clamped, displayScale),
              behavior: 'smooth',
            });
          }
          return clamped;
        });
      }
    },
    [pageSizes, displayScale],
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

  const updatePage = async (sl: SchemaForUI[][], newPageCursor: number) => {
    setPageCursor(newPageCursor);
    const newTemplate = schemasList2template(sl, template.basePdf);
    onChangeTemplate(newTemplate);
    await updateTemplate(newTemplate, true);
    void refresh(newTemplate);

    // Notify page change with updated total pages
    onPageCursorChange(newPageCursor, sl.length);

    // Use setTimeout to update scroll position after render
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.scrollTop = getPagesScrollTopByIndex(
          pageSizes,
          newPageCursor,
          displayScale,
        );
      }
    }, 0);
  };

  const handleRemovePage = () => {
    if (pageCursor === 0) return;
    if (!window.confirm(i18n('removePageConfirm'))) return;

    const _schemasList = cloneDeep(schemasList);
    _schemasList.splice(pageCursor, 1);
    void updatePage(_schemasList, pageCursor - 1);
  };

  const handleAddPageAfter = () => {
    const _schemasList = cloneDeep(schemasList);
    _schemasList.splice(pageCursor + 1, 0, []);
    void updatePage(_schemasList, pageCursor + 1);
  };

  if (prevTemplate !== template) {
    setPrevTemplate(template);
    void updateTemplate(template, true);
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
