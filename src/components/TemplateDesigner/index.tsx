import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { TemplateDesignerReactProps, Template, Schema, PageSize } from '../../libs/type';
import Sidebar from './Sidebar';
import Main from './Main';
import { rulerHeight } from '../../libs/constants';
import { I18nContext } from '../../libs/contexts';
import { uuid, set, cloneDeep, round, arrayMove } from '../../libs/utils';
import {
  fmtTemplate,
  getInitialSchema,
  getSampleByType,
  getKeepRatioHeightByWidth,
  getUniqSchemaKey,
  templateSchemas2SchemasList,
} from '../../libs/helper';
import { initShortCuts, destroyShortCuts } from '../../libs/ui';
import { useUiPreProcessor, useScrollPageCursor } from '../../libs/hooks';
import Root from '../Root';
import Error from '../Error';

const fmtValue = (key: string, value: string) => {
  const skip = [
    'id',
    'key',
    'type',
    'data',
    'alignment',
    'fontColor',
    'fontName',
    'backgroundColor',
  ];
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

  const { backgrounds, pageSizes, scale, error } = useUiPreProcessor({
    template,
    size,
    offset: rulerHeight,
  });

  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [schemasList, setSchemasList] = useState<Schema[][]>([[]] as Schema[][]);
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

  const modifiedTemplate = fmtTemplate(template, schemasList);

  const commitSchemas = useCallback(
    (newSchemas: Schema[]) => {
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
    // TOOD valueがstringで矯正されているのがおかしい。
    // numberも受け取れるようにしてfmtValueを使わなくていいようにした
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
    const timeTavel = (mode: 'undo' | 'redo') => {
      const isUndo = mode === 'undo';
      if ((isUndo ? past : future).current.length <= 0) return;
      (isUndo ? future : past).current.push(cloneDeep(schemasList[pageCursor]));
      const s = cloneDeep(schemasList);
      s[pageCursor] = (isUndo ? past : future).current.pop()!;
      setSchemasList(s);
      onEditEnd();
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
        setActiveElements(pasteSchemas.map((s) => document.getElementById(s.id)!));
        copiedSchemas.current = pasteSchemas;
      },
      redo: () => timeTavel('redo'),
      undo: () => timeTavel('undo'),
      save: () => saveTemplate(modifiedTemplate),
      remove: () => removeSchemas(getActiveSchemas().map((s) => s.id)),
      esc: onEditEnd,
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
    if (rootRef.current?.scroll) {
      rootRef.current.scroll({ top: 0, behavior: 'smooth' });
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
    setTimeout(() => setActiveElements([document.getElementById(s.id)!]));
  };

  const onSortEnd = (arg: { oldIndex: number; newIndex: number }) => {
    const movedSchema = arrayMove(cloneDeep(schemasList[pageCursor]), arg.oldIndex, arg.newIndex);
    commitSchemas(movedSchema);
  };

  const getLastActiveSchema = () => {
    if (activeElements.length === 0) return getInitialSchema();
    const last = activeElements[activeElements.length - 1];

    return schemasList[pageCursor].find((s) => s.id === last.id) || getInitialSchema();
  };

  const activeSchema = getLastActiveSchema();

  if (error) {
    return <Error size={size} error={error} />;
  }

  return (
    <Root ref={rootRef} size={size} scale={scale}>
      <Sidebar
        height={mainRef.current ? mainRef.current.scrollHeight : 0}
        pageCursor={pageCursor}
        pageSizes={pageSizes}
        activeElement={activeElements[activeElements.length - 1]}
        schemas={schemasList[pageCursor]}
        activeSchema={activeSchema}
        changeSchemas={changeSchemas}
        onSortEnd={onSortEnd}
        onEdit={(id: string) => {
          const editingElem = document.getElementById(id);
          if (editingElem) {
            setActiveElements([editingElem]);
          }
        }}
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
        schemas={schemasList[pageCursor]}
        changeSchemas={changeSchemas}
        setActiveElements={setActiveElements}
        paperRefs={paperRefs}
      />
    </Root>
  );
};

export default TemplateEditor;
