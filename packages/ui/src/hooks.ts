import { RefObject, useRef, useState, useCallback, useEffect } from 'react';
import {
  ZOOM,
  Template,
  Size,
  getB64BasePdf,
  SchemaForUI,
  ChangeSchemas,
  isBlankPdf,
} from '@pdfme/common';

import {
  schemasList2template,
  uuid,
  cloneDeep,
  getUniqSchemaKey,
  moveCommandToChangeSchemasArg,
  pdf2Pngs,
  getPdfPageSizes,
  b64toBlob,
  initShortCuts,
  destroyShortCuts,
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

type UIPreProcessorProps = { template: Template; size: Size; zoomLevel: number };

export const useUIPreProcessor = ({ template, size, zoomLevel }: UIPreProcessorProps) => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<Size[]>([]);
  const [scale, setScale] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const init = async (prop: { template: Template; size: Size }) => {
    const {
      template: { basePdf, schemas },
      size,
    } = prop;
    let paperWidth, paperHeight, _backgrounds, _pageSizes;

    if (isBlankPdf(basePdf)) {
      const { width, height } = basePdf;
      paperWidth = width * ZOOM;
      paperHeight = height * ZOOM;
      _backgrounds = schemas.map(
        () =>
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII='
      );
      _pageSizes = schemas.map(() => ({ width, height }));
    } else {
      const _basePdf = await getB64BasePdf(basePdf);
      const pdfBlob = b64toBlob(_basePdf);
      _pageSizes = await getPdfPageSizes(pdfBlob);
      paperWidth = _pageSizes[0].width * ZOOM;
      paperHeight = _pageSizes[0].height * ZOOM;
      _backgrounds = await pdf2Pngs(pdfBlob, paperWidth);
    }
    const _scale = Math.min(
      getScale(size.width, paperWidth),
      getScale(size.height - RULER_HEIGHT, paperHeight)
    );

    return { backgrounds: _backgrounds, pageSizes: _pageSizes, scale: _scale };
  };

  useEffect(() => {
    init({ template, size })
      .then(({ pageSizes, scale, backgrounds }) => {
        setPageSizes(pageSizes), setScale(scale), setBackgrounds(backgrounds);
      })
      .catch((err: Error) => {
        setError(err);
        console.error(`[@pdfme/ui] ${err}`);
      });
  }, [template, size]);

  return {
    backgrounds,
    pageSizes,
    scale: scale * zoomLevel,
    error,
    refresh: (template: Template) =>
      init({ template, size }).then(({ pageSizes, scale, backgrounds }) => {
        setPageSizes(pageSizes), setScale(scale), setBackgrounds(backgrounds);
      }),
  };
};

type ScrollPageCursorProps = {
  ref: RefObject<HTMLDivElement>;
  pageSizes: Size[];
  scale: number;
  pageCursor: number;
  onChangePageCursor: (page: number) => void;
};

export const useScrollPageCursor = ({
  ref,
  pageSizes,
  scale,
  pageCursor,
  onChangePageCursor,
}: ScrollPageCursorProps) => {
  const onScroll = useCallback(() => {
    if (!pageSizes[0] || !ref.current) {
      return;
    }

    const scroll = ref.current.scrollTop;
    const { top } = ref.current.getBoundingClientRect();
    const pageHeights = pageSizes.reduce((acc, cur, i) => {
      let value = (cur.height * ZOOM + RULER_HEIGHT) * scale;
      if (i === 0) {
        value += top - value / 2;
      } else {
        value += acc[i - 1];
      }

      return acc.concat(value);
    }, [] as number[]);
    let _pageCursor = 0;
    pageHeights.forEach((ph, i) => {
      if (scroll > ph) {
        _pageCursor = i + 1 >= pageHeights.length ? pageHeights.length - 1 : i + 1;
      }
    });
    if (_pageCursor !== pageCursor) {
      onChangePageCursor(_pageCursor);
    }
  }, [onChangePageCursor, pageCursor, pageSizes, ref, scale]);

  useEffect(() => {
    ref.current?.addEventListener('scroll', onScroll);

    return () => {
      ref.current?.removeEventListener('scroll', onScroll);
    };
  }, [ref, onScroll]);
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
  onEdit: (targets: HTMLElement[]) => void;
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
      save: () =>
        onSaveTemplate && onSaveTemplate(schemasList2template(schemasList, template.basePdf)),
      remove: () => removeSchemas(getActiveSchemas().map((s) => s.id)),
      esc: onEditEnd,
      selectAll: () => onEdit(schemasList[pageCursor].map((s) => document.getElementById(s.id)!)),
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
