import React, { useRef, useState, useContext, useCallback } from 'react';
import { theme } from 'antd';
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
  fmtTemplate,
  uuid,
  set,
  cloneDeep,
  templateSchemas2SchemasList,
  getPagesScrollTopByIndex,
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
}: Omit<DesignerProps, 'domContainer'> & {
  size: Size;
  onSaveTemplate: (t: Template) => void;
  onChangeTemplate: (t: Template) => void;
}) => {
  const past = useRef<SchemaForUI[][]>([]);
  const future = useRef<SchemaForUI[][]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const { token } = theme.useToken();

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [prevTemplate, setPrevTemplate] = useState<Template | null>(null);

  const { backgrounds, pageSizes, scale, error, refresh } = useUIPreProcessor({
    template,
    size,
    zoomLevel,
  });

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
      onChangeTemplate(fmtTemplate(template, _schemasList));
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
      const newSchemas = objs.reduce((acc, { key, value, schemaId }) => {
        const tgt = acc.find((s) => s.id === schemaId)! as SchemaForUI;
        // Assign to reference
        set(tgt, key, value);

        if (key === 'type') {
          const keysToKeep = ['id', 'key', 'type', 'position'];
          Object.keys(tgt).forEach((key) => {
            if (!keysToKeep.includes(key)) {
              delete tgt[key as keyof typeof tgt];
            }
          });
          const propPanel = Object.values(pluginsRegistry).find(
            (plugin) => plugin?.propPanel.defaultSchema.type === value
          )?.propPanel;
          Object.assign(tgt, propPanel?.defaultSchema || {});
        } else if (key === 'position.x' || key === 'position.y') {
          const padding = isBlankPdf(template.basePdf) ? template.basePdf.padding : [0, 0, 0, 0];
          const [paddingTop, paddingRight, paddingBottom, paddingLeft] = padding;
          const { width: pageWidth, height: pageHeight } = pageSizes[pageCursor];
          const { width: targetWidth, height: targetHeight } = tgt;
          if (key === 'position.x') {
            tgt.position.x = Math.min(
              Math.max(Number(value), paddingLeft),
              pageWidth - targetWidth - paddingRight
            );
          } else {
            tgt.position.y = Math.min(
              Math.max(Number(value), paddingTop),
              pageHeight - targetHeight - paddingBottom
            );
          }
        }

        return acc;
      }, cloneDeep(schemasList[pageCursor]));
      commitSchemas(newSchemas);
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
    const sl = await templateSchemas2SchemasList(newTemplate);
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
    const newTemplate = fmtTemplate(template, sl);
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
