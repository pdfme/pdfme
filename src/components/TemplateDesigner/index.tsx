import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { TemplateDesignerReactProps, Template, Schema, PageSize } from '../../libs/type';
import Sidebar from './Sidebar';
import Main from './Main';
import { rulerHeight } from '../../libs/constants';
import { I18nContext } from '../../libs/contexts';
import {
  uuid,
  set,
  cloneDeep,
  round,
  b64toBlob,
  arrayMove,
  fmtTemplate,
  sortSchemas,
  getInitialSchema,
  getSampleByType,
  getKeepRatioHeightByWidth,
  getB64BasePdf,
} from '../../libs/utils';
import { getPdfPageSizes } from '../../libs/pdfjs';
import { initShortCuts, destroyShortCuts } from '../../libs/ui';
import { useUiPreProcessor, useScrollPageCursor } from '../../libs/hooks';
import Root from '../Root';

const fmtValue = (key: string, value: string) => {
  const skip = ['id', 'key', 'type', 'data', 'alignment', 'fontColor', 'backgroundColor'];
  const v = Number(value) < 0 ? 0 : Number(value);

  return skip.includes(key) ? value : v;
};

const moveCommandToChangeSchemasArg = (props: {
  command: 'up' | 'down' | 'left' | 'right';
  activeSchemas: Schema[];
  isShift: boolean;
  pageSize: PageSize;
}) => {
  const { command, activeSchemas, isShift, pageSize } = props;
  const key = command === 'up' || command === 'down' ? 'y' : 'x';
  const num = isShift ? 0.1 : 1;

  const getValue = (as: Schema) => {
    let value = 0;
    const { position } = as;
    switch (command) {
      case 'up':
        value = round(position.y - num, 2);
        break;
      case 'down':
        value = round(position.y + num, 2);
        break;
      case 'left':
        value = round(position.x - num, 2);
        break;
      case 'right':
        value = round(position.x + num, 2);
        break;
      default:
        break;
    }

    return value;
  };

  return activeSchemas.map((as) => {
    let value = getValue(as);
    const { width, height } = as;
    if (key === 'x') {
      value = value > pageSize.width - width ? round(pageSize.width - width, 2) : value;
    } else {
      value = value > pageSize.height - height ? round(pageSize.height - height, 2) : value;
    }

    return { key: `position.${key}`, value: String(value), schemaId: as.id };
  });
};

const TemplateEditor = ({
  template,
  saveTemplate,
  size,
  onChangeTemplate,
}: TemplateDesignerReactProps & { onChangeTemplate: (t: Template) => void }) => {
  const copiedSchemas = useRef<Schema[] | null>(null);
  const past = useRef<Schema[][]>([]);
  const future = useRef<Schema[][]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);

  const { backgrounds, pageSizes, scale } = useUiPreProcessor({
    template,
    size,
    offset: rulerHeight,
  });

  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  // TODO 名前変更 schemasはschemasListにしてschemas[pageCursor]をschemasにした方が良さそう
  const [schemas, setSchemas] = useState<Schema[][]>([[]] as Schema[][]);
  const [pageCursor, setPageCursor] = useState(0);

  const onEditEnd = () => setActiveElements([]);

  useScrollPageCursor({
    rootRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: (p) => {
      setPageCursor(p);
      onEditEnd();
    },
  });

  const modifiedTemplate = fmtTemplate(template, schemas);

  const commitSchemas = useCallback(
    (newSchemas: Schema[]) => {
      future.current = [];
      past.current.push(cloneDeep(schemas[pageCursor]));
      const _schemas = cloneDeep(schemas);
      _schemas[pageCursor] = newSchemas;
      setSchemas(_schemas);
      onChangeTemplate(modifiedTemplate);
    },
    [schemas, pageCursor, modifiedTemplate, onChangeTemplate]
  );

  const removeSchemas = useCallback(
    (ids: string[]) => {
      commitSchemas(schemas[pageCursor].filter((schema) => !ids.includes(schema.id)));
      onEditEnd();
    },
    [schemas, pageCursor, commitSchemas]
  );

  const changeSchemas = useCallback(
    (objs: { key: string; value: string; schemaId: string }[]) => {
      const newSchemas = objs.reduce((acc, { key, value, schemaId }) => {
        const tgt = acc.find((s) => s.id === schemaId)!;
        // Assign to reference
        set(tgt, key, fmtValue(key, value));
        if (key === 'type') {
          // set default value, text or barcode
          set(tgt, 'data', value === 'text' ? 'text' : getSampleByType(value));
          // For barcodes, adjust the height to get the correct ratio.
          if (value !== 'text' && value !== 'image') {
            set(tgt, 'height', getKeepRatioHeightByWidth(value, tgt.width));
          }
        }

        return acc;
      }, cloneDeep(schemas[pageCursor]));
      commitSchemas(newSchemas);
    },
    [commitSchemas, pageCursor, schemas]
  );

  const initEvents = useCallback(() => {
    const getActiveSchemas = () => {
      const ids = activeElements.map((ae) => ae.id);

      return schemas[pageCursor].filter((s) => ids.includes(s.id));
    };
    const timeTavel = (mode: 'undo' | 'redo') => {
      const isUndo = mode === 'undo';
      if ((isUndo ? past : future).current.length <= 0) return;
      (isUndo ? future : past).current.push(cloneDeep(schemas[pageCursor]));
      const s = cloneDeep(schemas);
      s[pageCursor] = (isUndo ? past : future).current.pop()!;
      setSchemas(s);
      onEditEnd();
    };
    initShortCuts({
      move: (command, isShift) => {
        const pageSize = pageSizes[pageCursor];
        const activeSchemas = getActiveSchemas();
        const arg = moveCommandToChangeSchemasArg({ command, activeSchemas, pageSize, isShift });
        changeSchemas(arg);
      },
      remove: () => removeSchemas(getActiveSchemas().map((s) => s.id)),
      esc: onEditEnd,
      copy: () => {
        const activeSchemas = getActiveSchemas();
        if (activeSchemas.length === 0) return;
        copiedSchemas.current = activeSchemas;
      },
      paste: () => {
        if (!copiedSchemas.current || copiedSchemas.current.length === 0) return;
        const ps = pageSizes[pageCursor];
        const _schemas = copiedSchemas.current.map((cs) => {
          const { height, width, position: p } = cs;
          const position = {
            x: p.x + 10 > ps.width - width ? ps.width - width : p.x + 10,
            y: p.y + 10 > ps.height - height ? ps.height - height : p.y + 10,
          };
          const schema = Object.assign(cloneDeep(cs), { id: uuid(), position });
          schema.key = `${schema.key} copy`;

          return schema;
        });
        commitSchemas(schemas[pageCursor].concat(_schemas));
        setActiveElements(_schemas.map((s) => document.getElementById(s.id)!));
        copiedSchemas.current = _schemas;
      },
      redo: () => timeTavel('redo'),
      undo: () => timeTavel('undo'),
      save: () => {
        saveTemplate(modifiedTemplate);
      },
    });
  }, [
    activeElements,
    changeSchemas,
    commitSchemas,
    modifiedTemplate,
    pageCursor,
    pageSizes,
    removeSchemas,
    saveTemplate,
    schemas,
  ]);

  const destroyEvents = useCallback(() => {
    destroyShortCuts();
  }, []);

  const updateTemplate = useCallback(async (newTemplate: Template) => {
    const newSchemas = sortSchemas(newTemplate, newTemplate.schemas.length);
    const basePdf = await getB64BasePdf(newTemplate.basePdf);
    const pdfBlob = b64toBlob(basePdf);
    const _pageSizes = await getPdfPageSizes(pdfBlob);
    const _schemas = (
      newSchemas.length < _pageSizes.length
        ? newSchemas.concat(new Array(_pageSizes.length - newSchemas.length).fill(cloneDeep([])))
        : newSchemas.slice(0, _pageSizes.length)
    ).map((schema, i) => {
      Object.values(schema).forEach((value) => {
        const { width, height } = _pageSizes[i];
        const xEdge = value.position.x + value.width;
        const yEdge = value.position.y + value.height;
        if (width < xEdge) {
          const diff = xEdge - width;
          value.position.x += diff;
        }
        if (height < yEdge) {
          const diff = yEdge - height;
          value.position.y += diff;
        }
      });

      return schema;
    });
    setSchemas(_schemas);
    onEditEnd();
    setPageCursor(0);
    rootRef.current?.scroll({ top: 0, behavior: 'smooth' });
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
    s.key = `${i18n('field')}${schemas[pageCursor].length + 1}`;
    commitSchemas(schemas[pageCursor].concat(s));
    setTimeout(() => setActiveElements([document.getElementById(s.id)!]));
  };

  const onSortEnd = (arg: { oldIndex: number; newIndex: number }) => {
    const movedSchema = arrayMove(cloneDeep(schemas[pageCursor]), arg.oldIndex, arg.newIndex);
    commitSchemas(movedSchema);
  };

  const getLastActiveSchema = () => {
    if (activeElements.length === 0) return getInitialSchema();
    const last = activeElements[activeElements.length - 1];

    return schemas[pageCursor].find((s) => s.id === last.id) || getInitialSchema();
  };

  const activeSchema = getLastActiveSchema();

  return (
    <Root ref={rootRef} size={size} scale={scale}>
      <Sidebar
        height={mainRef.current ? mainRef.current.scrollHeight : 0}
        pageCursor={pageCursor}
        activeElement={activeElements[activeElements.length - 1]}
        schemas={schemas[pageCursor]}
        activeSchema={activeSchema}
        changeSchemas={changeSchemas}
        onSortEnd={onSortEnd}
        onEdit={(id: string) => setActiveElements([document.getElementById(id)!])}
        onEditEnd={onEditEnd}
        addSchema={addSchema}
        removeSchema={(id) => removeSchemas([id])}
      />
      <Main
        ref={mainRef}
        height={size.height - rulerHeight}
        pageCursor={pageCursor}
        scale={scale}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        activeElements={activeElements}
        schemas={schemas.map((s) =>
          s.reduce(
            (acc, cur) => Object.assign(acc, { [cur.key]: cur }),
            {} as { [key: string]: Schema }
          )
        )}
        changeSchemas={changeSchemas}
        setActiveElements={setActiveElements}
        paperRefs={paperRefs}
      />
    </Root>
  );
};

export default TemplateEditor;
