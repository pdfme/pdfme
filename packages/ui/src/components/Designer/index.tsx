import React, { useRef, useState, useContext, useCallback, useEffect } from 'react';
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
import { DndContext } from '@dnd-kit/core';
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
import { useUIPreProcessor, useScrollPageCursor, useInitEvents } from '../../hooks.js';
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

const TemplateEditor = ({
  template,
  size,
  onSaveTemplate,
  onChangeTemplate,
  onPageCursorChange,
}: Omit<DesignerProps, 'domContainer'> & {
  size: Size;
  onSaveTemplate: (t: Template) => void;
  onChangeTemplate: (t: Template) => void;
} & {
  onChangeTemplate: (t: Template) => void;
  onPageCursorChange: (newPageCursor: number) => void;
}) => {
  const past = useRef<SchemaForUI[][]>([]);
  const future = useRef<SchemaForUI[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const maxZoom = useMaxZoom();

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(options.zoomLevel ?? 1);
  const [sidebarOpen, setSidebarOpen] = useState(options.sidebarOpen ?? true);
  const [prevTemplate, setPrevTemplate] = useState<Template | null>(null);

  const { backgrounds, pageSizes, scale, error, refresh } = useUIPreProcessor({
    template,
    size,
    zoomLevel,
    maxZoom,
  });

  const onEdit = (targets: HTMLElement[]) => {
    setActiveElements(targets);
    setHoveringSchemaId(null);
  };

  const onEditEnd = () => {
    setActiveElements([]);
    setHoveringSchemaId(null);
  };

  // Update component state only when _options_ changes
  // Ignore exhaustive useEffect dependency warnings here
  useEffect(() => {
    if (typeof options.zoomLevel === 'number' && options.zoomLevel !== zoomLevel) {
      setZoomLevel(options.zoomLevel);
    }
    if (typeof options.sidebarOpen === 'boolean' && options.sidebarOpen !== sidebarOpen) {
      setSidebarOpen(options.sidebarOpen);
    }
    // eslint-disable-next-line
  }, [options]);

  useScrollPageCursor({
    ref: canvasRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: (p) => {
      setPageCursor(p);
      onPageCursorChange(p);
      onEditEnd();
    },
  });

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

  const updateTemplate = useCallback(async (newTemplate: Template) => {
    const sl = await template2SchemasList(newTemplate);
    setSchemasList(sl);
    onEditEnd();
    setPageCursor(0);
    if (canvasRef.current?.scroll) {
      canvasRef.current.scroll({ top: 0, behavior: 'smooth' });
    }
  }, []);

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
    setTimeout(() => onEdit([document.getElementById(s.id)!]));
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
    await updateTemplate(newTemplate);
    void refresh(newTemplate);

    // Use setTimeout to update scroll position after render
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, newPageCursor, scale);
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
    void updateTemplate(template);
  }

  const canvasWidth = size.width - LEFT_SIDEBAR_WIDTH;
  const sizeExcSidebars = {
    width: sidebarOpen ? canvasWidth - RIGHT_SIDEBAR_WIDTH : canvasWidth,
    height: size.height,
  };

  if (error) {
    // Pass the error directly to ErrorScreen
    return <ErrorScreen size={size} error={error} />;
  }
  const pageManipulation = isBlankPdf(template.basePdf)
    ? { addPageAfter: handleAddPageAfter, removePage: handleRemovePage }
    : {};

  return (
    <Root size={size} scale={scale}>
      <DndContext
        onDragEnd={(event) => {
          // Triggered after a schema is dragged & dropped from the left sidebar.
          if (!event.active) return;
          const active = event.active;
          const pageRect = paperRefs.current[pageCursor].getBoundingClientRect();

          const dragStartLeft = active.rect.current.initial?.left || 0;
          const dragStartTop = active.rect.current.initial?.top || 0;

          const canvasLeftOffsetFromPageCorner =
            pageRect.left - dragStartLeft + scaleDragPosAdjustment(20, scale);
          const canvasTopOffsetFromPageCorner = pageRect.top - dragStartTop;

          const moveY = (event.delta.y - canvasTopOffsetFromPageCorner) / scale;
          const moveX = (event.delta.x - canvasLeftOffsetFromPageCorner) / scale;

          const position = {
            x: round(px2mm(Math.max(0, moveX)), 2),
            y: round(px2mm(Math.max(0, moveY)), 2),
          };

          addSchema({ ...(active.data.current as Schema), position });
        }}
        onDragStart={onEditEnd}
      >
        <LeftSidebar
          height={canvasRef.current ? canvasRef.current.clientHeight : 0}
          scale={scale}
          basePdf={template.basePdf}
        />

        <div style={{ position: 'absolute', width: canvasWidth, marginLeft: LEFT_SIDEBAR_WIDTH }}>
          <CtlBar
            size={sizeExcSidebars}
            pageCursor={pageCursor}
            pageNum={schemasList.length}
            setPageCursor={(p) => {
              if (!canvasRef.current) return;
              // Update scroll position and state
              canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, scale);
              setPageCursor(p);
              onEditEnd();
            }}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            {...pageManipulation}
          />

          <RightSidebar
            hoveringSchemaId={hoveringSchemaId}
            onChangeHoveringSchemaId={onChangeHoveringSchemaId}
            height={canvasRef.current ? canvasRef.current.clientHeight : 0}
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
            scale={scale}
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
