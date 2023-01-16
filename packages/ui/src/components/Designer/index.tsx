import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { DesignerReactProps, Template, SchemaForUI } from '@pdfme/common';
import Sidebar from './Sidebar/index';
import Main from './Main/index';
import { ZOOM, RULER_HEIGHT } from '../../constants';
import { I18nContext } from '../../contexts';
import {
  uuid,
  set,
  cloneDeep,
  initShortCuts,
  destroyShortCuts,
  templateSchemas2SchemasList,
  fmtTemplate,
  getInitialSchema,
  getSampleByType,
  getKeepRatioHeightByWidth,
  getUniqSchemaKey,
  moveCommandToChangeSchemasArg,
  getPagesScrollTopByIndex,
} from '../../helper';
import { useUIPreProcessor, useScrollPageCursor } from '../../hooks';
import Root from '../Root';
import Error from '../Error';
import CtlBar from '../CtlBar/index';

const TemplateEditor = ({
  template,
  size,
  onSaveTemplate,
  onChangeTemplate,
}: DesignerReactProps & { onChangeTemplate: (t: Template) => void }) => {
  const copiedSchemas = useRef<SchemaForUI[] | null>(null);
  const past = useRef<SchemaForUI[][]>([]);
  const future = useRef<SchemaForUI[][]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const { backgrounds, pageSizes, scale, error } = useUIPreProcessor({ template, size, zoomLevel });

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

  const modifiedTemplate = fmtTemplate(template, schemasList);

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

  const changeSchemas = useCallback(
    (objs: { key: string; value: string | number; schemaId: string }[]) => {
      const newSchemas = objs.reduce((acc, { key, value, schemaId }) => {
        const tgt = acc.find((s) => s.id === schemaId)!;
        // Assign to reference
        set(tgt, key, value);
        if (key === 'type') {
          const type = String(value);
          // set default value, text or barcode
          set(tgt, 'data', getSampleByType(type));
          // For barcodes, adjust the height to get the correct ratio.
          if (value !== 'text') {
            set(tgt, 'height', getKeepRatioHeightByWidth(type, tgt.width));
          }
        }

        return acc;
      }, cloneDeep(schemasList[pageCursor]));
      commitSchemas(newSchemas);
    },
    [commitSchemas, pageCursor, schemasList]
  );

  const initEvents = useCallback(() => {
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
        const stackUniqSchemaKeys: string[] = [];
        const pasteSchemas = copiedSchemas.current.map((cs) => {
          const id = uuid();
          const key = getUniqSchemaKey({ copiedSchemaKey: cs.key, schema, stackUniqSchemaKeys });
          const { height, width, position: p } = cs;
          const ps = pageSizes[pageCursor];
          const position = {
            x: p.x + 10 > ps.width - width ? ps.width - width : p.x + 10,
            y: p.y + 10 > ps.height - height ? ps.height - height : p.y + 10,
          };

          return Object.assign(cloneDeep(cs), { id, key, position });
        });
        commitSchemas(schemasList[pageCursor].concat(pasteSchemas));
        onEdit(pasteSchemas.map((s) => document.getElementById(s.id)!));
        copiedSchemas.current = pasteSchemas;
      },
      redo: () => timeTravel('redo'),
      undo: () => timeTravel('undo'),
      save: () => onSaveTemplate && onSaveTemplate(modifiedTemplate),
      remove: () => removeSchemas(getActiveSchemas().map((s) => s.id)),
      esc: onEditEnd,
      selectAll: () => onEdit(schemasList[pageCursor].map((s) => document.getElementById(s.id)!)),
    });
  }, [
    activeElements,
    changeSchemas,
    commitSchemas,
    modifiedTemplate,
    pageCursor,
    pageSizes,
    removeSchemas,
    onSaveTemplate,
    schemasList,
  ]);

  const destroyEvents = useCallback(() => {
    destroyShortCuts();
  }, []);

  const updateTemplate = useCallback(async (newTemplate: Template) => {
    const sl = await templateSchemas2SchemasList(newTemplate);
    setSchemasList(sl);
    onEditEnd();
    setPageCursor(0);
    if (mainRef.current?.scroll) {
      mainRef.current.scroll({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    updateTemplate(template);
  }, [template, updateTemplate]);

  useEffect(() => {
    initEvents();

    return destroyEvents;
  }, [initEvents, destroyEvents]);

  const addSchema = () => {
    const s = getInitialSchema();
    const paper = paperRefs.current[pageCursor];
    const rectTop = paper ? paper.getBoundingClientRect().top : 0;
    s.position.y = rectTop > 0 ? 0 : pageSizes[pageCursor].height / 2;
    s.data = 'text';
    s.key = `${i18n('field')}${schemasList[pageCursor].length + 1}`;
    commitSchemas(schemasList[pageCursor].concat(s));
    setTimeout(() => onEdit([document.getElementById(s.id)!]));
  };

  const onSortEnd = (sortedSchemas: SchemaForUI[]) => {
    commitSchemas(sortedSchemas);
  };

  const onChangeHoveringSchemaId = (id: string | null) => {
    setHoveringSchemaId(id);
  };

  if (error) {
    return <Error size={size} error={error} />;
  }

  return (
    <Root size={size} scale={scale}>
      <CtlBar
        size={size}
        pageCursor={pageCursor}
        pageNum={schemasList.length}
        setPageCursor={(p) => {
          if (!mainRef.current) return;
          mainRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, scale);
          setPageCursor(p);
          onEditEnd();
        }}
        zoomLevel={zoomLevel}
        setZoomLevel={(zoom) => {
          if (mainRef.current) {
            mainRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, pageCursor, scale);
          }
          setZoomLevel(zoom);
        }}
      />
      <Sidebar
        hoveringSchemaId={hoveringSchemaId}
        onChangeHoveringSchemaId={onChangeHoveringSchemaId}
        height={mainRef.current ? mainRef.current.clientHeight : 0}
        size={size}
        pageSize={pageSizes[pageCursor]}
        activeElements={activeElements}
        schemas={schemasList[pageCursor]}
        changeSchemas={changeSchemas}
        onSortEnd={onSortEnd}
        onEdit={(id: string) => {
          const editingElem = document.getElementById(id);
          editingElem && onEdit([editingElem]);
        }}
        onEditEnd={onEditEnd}
        addSchema={addSchema}
      />
      <Main
        ref={mainRef}
        paperRefs={paperRefs}
        hoveringSchemaId={hoveringSchemaId}
        onChangeHoveringSchemaId={onChangeHoveringSchemaId}
        height={size.height - RULER_HEIGHT * ZOOM}
        pageCursor={pageCursor}
        scale={scale}
        size={size}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        activeElements={activeElements}
        schemasList={schemasList}
        changeSchemas={changeSchemas}
        removeSchemas={removeSchemas}
        onEdit={onEdit}
      />
    </Root>
  );
};

export default TemplateEditor;
