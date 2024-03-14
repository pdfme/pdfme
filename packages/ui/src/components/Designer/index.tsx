import React, { useRef, useState, useContext, useCallback } from 'react';
import {
  ZOOM,
  Template,
  Schema,
  SchemaForUI,
  ChangeSchemas,
  DesignerProps,
  Size,
  Plugin,
  isBlankPdf,
} from '@pdfme/common';
import Sidebar from './Sidebar/index';
import Canvas from './Canvas/index';
import { RULER_HEIGHT, SIDEBAR_WIDTH } from '../../constants';
import { I18nContext, PluginsRegistry } from '../../contexts';
import {
  schemasList2template,
  uuid,
  cloneDeep,
  template2SchemasList,
  getPagesScrollTopByIndex,
  changeSchemas as _changeSchemas,
} from '../../helper';
import { useUIPreProcessor, useScrollPageCursor, useInitEvents } from '../../hooks';
import Root from '../Root';
import ErrorScreen from '../ErrorScreen';
import CtlBar from '../CtlBar';

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
  onPageCursorChange: (newPageCursor: number) => void
}) => {
  const past = useRef<SchemaForUI[][]>([]);
  const future = useRef<SchemaForUI[][]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [prevTemplate, setPrevTemplate] = useState<Template | null>(null);

  const { backgrounds, pageSizes, scale, error, refresh } =
    useUIPreProcessor({ template, size, zoomLevel });

  const onEdit = (targets: HTMLElement[]) => {
    setActiveElements(targets);
    setHoveringSchemaId(null);
  };

  const onEditEnd = () => {
    setActiveElements([]);
    setHoveringSchemaId(null);
  };

  useScrollPageCursor({
    ref: mainRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: (p) => {
      setPageCursor(p);
      onPageCursorChange(p)
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
    [template, schemasList, pageCursor, onChangeTemplate]
  );

  const removeSchemas = useCallback(
    (ids: string[]) => {
      commitSchemas(schemasList[pageCursor].filter((schema) => !ids.includes(schema.id)));
      onEditEnd();
    },
    [schemasList, pageCursor, commitSchemas]
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
    [commitSchemas, pageCursor, schemasList, pluginsRegistry, pageSizes, template.basePdf]
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
    if (mainRef.current?.scroll) {
      mainRef.current.scroll({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const addSchema = () => {
    const propPanel = (Object.values(pluginsRegistry)[0] as Plugin<Schema>)?.propPanel;

    if (!propPanel) {
      throw new Error(`[@pdfme/ui] addSchema failed: propPanel is empty.
Check this document: https://pdfme.com/docs/custom-schemas`);
    }

    const s = {
      id: uuid(),
      key: `${i18n('field')}${schemasList[pageCursor].length + 1}`,
      ...propPanel.defaultSchema,
    } as SchemaForUI;

    const paper = paperRefs.current[pageCursor];
    const rectTop = paper ? paper.getBoundingClientRect().top : 0;
    const [paddingTop, , , paddingLeft] = isBlankPdf(template.basePdf)
      ? template.basePdf.padding
      : [0, 0, 0, 0];
    s.position.y = rectTop > 0 ? paddingTop : pageSizes[pageCursor].height / 2;
    s.position.x = paddingLeft;

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
    setTimeout(
      () =>
        mainRef.current &&
        ((mainRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, newPageCursor, scale)), 0)
    );
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

  const sizeExcSidebar = {
    width: sidebarOpen ? size.width - SIDEBAR_WIDTH : size.width,
    height: size.height,
  };

  if (error) {
    return <ErrorScreen size={size} error={error} />;
  }
  const pageManipulation = isBlankPdf(template.basePdf)
    ? { addPageAfter: handleAddPageAfter, removePage: handleRemovePage }
    : {};

  return (
    <Root size={size} scale={scale}>
      <CtlBar
        size={sizeExcSidebar}
        pageCursor={pageCursor}
        pageNum={schemasList.length}
        setPageCursor={(p) => {
          if (!mainRef.current) return;
          mainRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, scale);
          setPageCursor(p);
          onEditEnd();
        }}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        {...pageManipulation}
      />
      <Sidebar
        hoveringSchemaId={hoveringSchemaId}
        onChangeHoveringSchemaId={onChangeHoveringSchemaId}
        height={mainRef.current ? mainRef.current.clientHeight : 0}
        size={size}
        pageSize={pageSizes[pageCursor] ?? []}
        activeElements={activeElements}
        schemas={schemasList[pageCursor] ?? []}
        changeSchemas={changeSchemas}
        onSortEnd={onSortEnd}
        onEdit={(id: string) => {
          const editingElem = document.getElementById(id);
          editingElem && onEdit([editingElem]);
        }}
        onEditEnd={onEditEnd}
        addSchema={addSchema}
        deselectSchema={onEditEnd}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <Canvas
        ref={mainRef}
        paperRefs={paperRefs}
        basePdf={template.basePdf}
        hoveringSchemaId={hoveringSchemaId}
        onChangeHoveringSchemaId={onChangeHoveringSchemaId}
        height={size.height - RULER_HEIGHT * ZOOM}
        pageCursor={pageCursor}
        scale={scale}
        size={sizeExcSidebar}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        activeElements={activeElements}
        schemasList={schemasList}
        changeSchemas={changeSchemas}
        removeSchemas={removeSchemas}
        sidebarOpen={sidebarOpen}
        onEdit={onEdit}
      />
    </Root>
  );
};

export default TemplateEditor;
