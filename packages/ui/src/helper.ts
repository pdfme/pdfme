// Update pdfjs-dist. (might be able to reduce the bundle size.)
// @ts-ignore
import PDFJSWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.js';
import hotkeys from 'hotkeys-js';
import {
  cloneDeep,
  ZOOM,
  getB64BasePdf,
  b64toUint8Array,
  pt2mm,
  Template,
  BasePdf,
  SchemaForUI,
  Size,
  isBlankPdf,
  Plugins,
} from '@pdfme/common';
import { RULER_HEIGHT } from './constants.js';

GlobalWorkerOptions.workerSrc = PDFJSWorker;

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const set = <T extends object>(obj: T, path: string | string[], value: any) => {
  path = Array.isArray(path) ? path : path.replace('[', '.').replace(']', '').split('.');
  let src: any = obj;
  path.forEach((key, index, array) => {
    if (index == path.length - 1) {
      src[key] = value;
    } else {
      if (!src.hasOwnProperty(key)) {
        const next = array[index + 1];
        src[key] = String(Number(next)) === next ? [] : {};
      }
      src = src[key];
    }
  });
};

export const debounce = <T extends Function>(cb: T, wait = 20) => {
  let h: null | ReturnType<typeof setTimeout> = null;
  const callable = (...args: any) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return <T>(<any>callable);
};

const shift = (number: number, precision: number, reverseShift: boolean) => {
  if (reverseShift) {
    precision = -precision;
  }
  const numArray = `${number}`.split('e');

  return Number(`${numArray[0]}e${numArray[1] ? Number(numArray[1]) + precision : precision}`);
};

export const round = (number: number, precision: number) => {
  return shift(Math.round(shift(number, precision, false)), precision, true);
};

export const flatten = <T>(arr: T[][]): T[] => ([] as T[]).concat(...arr);

const up = 'up';
const shiftUp = 'shift+up';
const down = 'down';
const shiftDown = 'shift+down';
const left = 'left';
const shiftLeft = 'shift+left';
const right = 'right';
const shiftRight = 'shift+right';

const rmWin = 'backspace';
const rmMac = 'delete';
const esc = 'esc';
const copyWin = 'ctrl+c';
const copyMac = 'command+c';
const pasteWin = 'ctrl+v';
const pasteMac = 'command+v';
const redoWin = 'ctrl+y';
const redoMac = 'shift+command+z';
const undoWin = 'ctrl+z';
const undoMac = 'command+z';
const saveWin = 'ctrl+s';
const saveMac = 'command+s';
const selectAllWin = 'ctrl+a';
const selectAllMac = 'command+a';

const keys = [
  up,
  shiftUp,
  down,
  shiftDown,
  left,
  shiftLeft,
  right,
  shiftRight,
  rmMac,
  rmWin,
  esc,
  copyWin,
  copyMac,
  pasteWin,
  pasteMac,
  redoWin,
  redoMac,
  undoWin,
  undoMac,
  saveWin,
  saveMac,
  selectAllWin,
  selectAllMac,
];

export const initShortCuts = (arg: {
  move: (command: 'up' | 'down' | 'left' | 'right', isShift: boolean) => void;
  remove: () => void;
  esc: () => void;
  copy: () => void;
  paste: () => void;
  redo: () => void;
  undo: () => void;
  save: () => void;
  selectAll: () => void;
}) => {
  hotkeys(keys.join(), (e, handler) => {
    switch (handler.shortcut) {
      case up:
      case shiftUp:
        e.preventDefault();
        arg.move('up', hotkeys.shift);
        break;
      case down:
      case shiftDown:
        e.preventDefault();
        arg.move('down', hotkeys.shift);
        break;
      case left:
      case shiftLeft:
        e.preventDefault();
        arg.move('left', hotkeys.shift);
        break;
      case right:
      case shiftRight:
        e.preventDefault();
        arg.move('right', hotkeys.shift);
        break;
      case rmWin:
      case rmMac:
        arg.remove();
        break;
      case esc:
        arg.esc();
        break;
      case copyWin:
      case copyMac:
        arg.copy();
        break;
      case pasteWin:
      case pasteMac:
        arg.paste();
        break;
      case redoWin:
      case redoMac:
        arg.redo();
        break;
      case undoWin:
      case undoMac:
        arg.undo();
        break;
      case saveWin:
      case saveMac:
        e.preventDefault();
        arg.save();
        break;
      case selectAllWin:
      case selectAllMac:
        e.preventDefault();
        arg.selectAll();
        break;
      default:
        break;
    }
  });
};

export const destroyShortCuts = () => {
  hotkeys.unbind(keys.join());
};

export const getPdfPageSizes = async (pdfBlob: Blob) => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await getDocument({ url }).promise;

  const promises = Promise.all(
    new Array(pdfDoc.numPages).fill('').map(async (_, i) => {
      return await pdfDoc.getPage(i + 1).then((page) => {
        const { height, width } = page.getViewport({ scale: 1, rotation: 0 });

        return { height: pt2mm(height), width: pt2mm(width) };
      });
    })
  );

  URL.revokeObjectURL(url);

  return promises;
};

const pdf2Images = async (pdfBlob: Blob, width: number, imageType: 'png' | 'jpeg') => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await getDocument({ url }).promise;

  const promises = Promise.all(
    new Array(pdfDoc.numPages).fill('').map(async (_, i) => {
      return await pdfDoc.getPage(i + 1).then((page) => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        const canvasContext = canvas.getContext('2d')!;
        const scaleRequired = canvas.width / page.getViewport({ scale: 1, rotation: 0 }).width;
        const viewport = page.getViewport({ scale: scaleRequired, rotation: 0 });
        canvas.height = viewport.height;

        return page
          .render({ canvasContext, viewport })
          .promise.then(() => canvas.toDataURL(`image/${imageType}`));
      });
    })
  );
  URL.revokeObjectURL(url);

  return promises;
};

export const pdf2Pngs = (pdfBlob: Blob, width: number) => pdf2Images(pdfBlob, width, 'png');

export const b64toBlob = (base64: string) => {
  const uint8Array = b64toUint8Array(base64);
  const [, , mimeType] = base64.match(/(:)([a-z/]+)(;)/)!;

  return new Blob([uint8Array.buffer], { type: mimeType });
};

const convertSchemasForUI = (template: Template): SchemaForUI[][] => {
  template.schemas.forEach((page, i) => {
    page.forEach((schema) => {
      schema.id = uuid();
      schema.content = schema.content || '';
    });
  });

  return template.schemas as SchemaForUI[][];
};

export const template2SchemasList = async (_template: Template) => {
  const template = cloneDeep(_template);
  const { basePdf, schemas } = template;
  const schemasForUI = convertSchemasForUI(template);

  let pageSizes: Size[] = [];
  if (isBlankPdf(basePdf)) {
    pageSizes = schemas.map(() => ({
      width: basePdf.width,
      height: basePdf.height,
    }));
  } else {
    const b64BasePdf = await getB64BasePdf(basePdf);
    const pdfBlob = b64toBlob(b64BasePdf);
    pageSizes = await getPdfPageSizes(pdfBlob);
  }

  const ssl = schemasForUI.length;
  const psl = pageSizes.length;

  return (
    ssl < psl
      ? schemasForUI.concat(new Array(psl - ssl).fill(cloneDeep([])))
      : schemasForUI.slice(0, pageSizes.length)
  ).map((schema, i) => {
    Object.values(schema).forEach((value) => {
      const { width, height } = pageSizes[i];
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
};

export const schemasList2template = (schemasList: SchemaForUI[][], basePdf: BasePdf): Template => ({
  schemas: cloneDeep(schemasList).map((page) =>
    page.map((schema) => {
      // @ts-ignore
      delete schema.id;
      return schema;
    })
  ),
  basePdf,
});

export const getUniqueSchemaName = (arg: {
  copiedSchemaName: string;
  schema: SchemaForUI[];
  stackUniqueSchemaNames: string[];
}) => {
  const { copiedSchemaName, schema, stackUniqueSchemaNames } = arg;
  const schemaNames = schema.map((s) => s.name).concat(stackUniqueSchemaNames);
  const tmp: { [originalName: string]: number } = schemaNames.reduce(
    (acc, cur) => Object.assign(acc, { originalName: cur, copiedNum: 0 }),
    {}
  );
  const extractOriginalName = (name: string) => name.replace(/ copy$| copy [0-9]*$/, '');
  schemaNames
    .filter((name) => / copy$| copy [0-9]*$/.test(name))
    .forEach((name) => {
      const originalName = extractOriginalName(name);
      const match = name.match(/[0-9]*$/);
      const copiedNum = match && match[0] ? Number(match[0]) : 1;
      if ((tmp[originalName] ?? 0) < copiedNum) {
        tmp[originalName] = copiedNum;
      }
    });

  const originalName = extractOriginalName(copiedSchemaName);
  if (tmp[originalName]) {
    const copiedNum = tmp[originalName];
    const uniqueName = `${originalName} copy ${copiedNum + 1}`;
    stackUniqueSchemaNames.push(uniqueName);

    return uniqueName;
  }
  const uniqueName = `${copiedSchemaName} copy`;
  stackUniqueSchemaNames.push(uniqueName);

  return uniqueName;
};

export const moveCommandToChangeSchemasArg = (props: {
  command: 'up' | 'down' | 'left' | 'right';
  activeSchemas: SchemaForUI[];
  isShift: boolean;
  pageSize: Size;
}) => {
  const { command, activeSchemas, isShift, pageSize } = props;
  const key = command === 'up' || command === 'down' ? 'y' : 'x';
  const num = isShift ? 0.1 : 1;

  const getValue = (as: SchemaForUI) => {
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

    return value > 0 ? value : 0;
  };

  return activeSchemas.map((as) => {
    let value = getValue(as);
    const { width, height } = as;
    if (key === 'x') {
      value = value > pageSize.width - width ? round(pageSize.width - width, 2) : value;
    } else {
      value = value > pageSize.height - height ? round(pageSize.height - height, 2) : value;
    }

    return { key: `position.${key}`, value, schemaId: as.id };
  });
};

export const getPagesScrollTopByIndex = (pageSizes: Size[], index: number, scale: number) => {
  return pageSizes
    .slice(0, index)
    .reduce((acc, cur) => acc + (cur.height * ZOOM + RULER_HEIGHT * scale) * scale, 0);
};

export const getSidebarContentHeight = (sidebarHeight: number) =>
  sidebarHeight - RULER_HEIGHT - RULER_HEIGHT / 2 - 30;

const handlePositionSizeChange = (
  schema: SchemaForUI,
  key: string,
  value: any,
  basePdf: BasePdf,
  pageSize: Size
) => {
  const padding = isBlankPdf(basePdf) ? basePdf.padding : [0, 0, 0, 0];
  const [pt, pr, pb, pl] = padding;
  const { width: pw, height: ph } = pageSize;
  const calcBounds = (v: any, min: number, max: number) => Math.min(Math.max(Number(v), min), max);
  if (key === 'position.x') {
    schema.position.x = calcBounds(value, pl, pw - schema.width - pr);
  } else if (key === 'position.y') {
    schema.position.y = calcBounds(value, pt, ph - schema.height - pb);
  } else if (key === 'width') {
    schema.width = calcBounds(value, 0, pw - schema.position.x - pr);
  } else if (key === 'height') {
    schema.height = calcBounds(value, 0, ph - schema.position.y - pb);
  }
};

const handleTypeChange = (
  schema: SchemaForUI,
  key: string,
  value: any,
  pluginsRegistry: Plugins
) => {
  if (key !== 'type') return;
  const keysToKeep = ['id', 'name', 'type', 'position', 'required'];
  Object.keys(schema).forEach((key) => {
    if (!keysToKeep.includes(key)) {
      delete schema[key as keyof typeof schema];
    }
  });
  // Apply attributes from new defaultSchema
  const propPanel = Object.values(pluginsRegistry).find(
    (plugin) => plugin?.propPanel.defaultSchema.type === value
  )?.propPanel;
  Object.keys(propPanel?.defaultSchema || {}).forEach((key) => {
    if (!schema.hasOwnProperty(key)) {
      (schema as any)[key] = propPanel?.defaultSchema[key];
    }
  });
  if (schema.readOnly) {
    schema.required = false;
  }
};

export const changeSchemas = (args: {
  objs: { key: string; value: any; schemaId: string }[];
  schemas: SchemaForUI[];
  basePdf: BasePdf;
  pluginsRegistry: Plugins;
  pageSize: { width: number; height: number };
  commitSchemas: (newSchemas: SchemaForUI[]) => void;
}) => {
  const { objs, schemas, basePdf, pluginsRegistry, pageSize, commitSchemas } = args;
  const newSchemas = objs.reduce((acc, { key, value, schemaId }) => {
    const tgt = acc.find((s) => s.id === schemaId);
    if (!tgt) return acc;
    // Assign to reference
    set(tgt, key, value);

    if (key === 'type') {
      handleTypeChange(tgt, key, value, pluginsRegistry);
    } else if (['position.x', 'position.y', 'width', 'height'].includes(key)) {
      handlePositionSizeChange(tgt, key, value, basePdf, pageSize);
    }

    return acc;
  }, cloneDeep(schemas));
  commitSchemas(newSchemas);
};
