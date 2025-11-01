import hotkeysJs from 'hotkeys-js';
import { useContext } from 'react';
import {
  cloneDeep,
  ZOOM,
  getB64BasePdf,
  b64toUint8Array,
  Template,
  BasePdf,
  SchemaForUI,
  Size,
  isBlankPdf,
  PluginRegistry,
} from '@pdfme/common';
import { pdf2size } from '@pdfme/converter';
import { DEFAULT_MAX_ZOOM, RULER_HEIGHT } from './constants.js';
import { OptionsContext } from './contexts.js';

// Define a type for the hotkeys function with additional properties
type HotkeysFunction = {
  (keys: string, callback: (e: KeyboardEvent, handler: { shortcut: string }) => void): unknown;
  shift: boolean;
  unbind: (keys: string) => void;
};

// Create a simple mock for hotkeys to avoid TypeScript errors
const hotkeys = function (
  keys: string,
  callback: (e: KeyboardEvent, handler: { shortcut: string }) => void,
) {
  return hotkeysJs(keys, callback);
} as HotkeysFunction;

// Add properties to the hotkeys function
hotkeys.shift = false;
hotkeys.unbind = function (keys: string) {
  // Do nothing if hotkeysJs doesn't have unbind
  const hotkeysFn = hotkeysJs as unknown as { unbind?: (keys: string) => void };
  if (typeof hotkeysFn.unbind === 'function') {
    hotkeysFn.unbind(keys);
  }
};

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const set = <T extends object>(obj: T, path: string | string[], value: unknown) => {
  path = Array.isArray(path) ? path : path.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  let src: Record<string, unknown> = obj as Record<string, unknown>;
  path.forEach((key, index, array) => {
    if (index == path.length - 1) {
      src[key] = value;
    } else {
      if (!Object.prototype.hasOwnProperty.call(src, key)) {
        const next = array[index + 1];
        src[key] = String(Number(next)) === next ? [] : {};
      }
      src = src[key] as Record<string, unknown>;
    }
  });
};

export const debounce = <T extends (...args: unknown[]) => unknown>(cb: T, wait = 20) => {
  let h: null | ReturnType<typeof setTimeout> = null;
  const callable = (...args: Parameters<T>) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return callable as T;
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
  hotkeys(keys.join(), (e: KeyboardEvent, handler: { shortcut: string }) => {
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

/**
 * Guess the MIME type by checking the first few bytes of the ArrayBuffer.
 * Currently checks for PNG, JPEG, and GIF signatures.
 */
function detectMimeType(arrayBuffer: ArrayBuffer): string {
  const dataView = new DataView(arrayBuffer);

  // Check for PNG signature: 0x89 0x50 0x4E 0x47
  if (
    dataView.getUint8(0) === 0x89 &&
    dataView.getUint8(1) === 0x50 &&
    dataView.getUint8(2) === 0x4e &&
    dataView.getUint8(3) === 0x47
  ) {
    return 'image/png';
  }

  // Check for JPEG signature: 0xFF 0xD8 0xFF
  if (
    dataView.getUint8(0) === 0xff &&
    dataView.getUint8(1) === 0xd8 &&
    dataView.getUint8(2) === 0xff
  ) {
    return 'image/jpeg';
  }

  return ''; // Unknown type
}

export const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
  // Detect the MIME type
  const mimeType = detectMimeType(arrayBuffer);

  // Convert ArrayBuffer to raw Base64
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64String = btoa(binary);

  // Optionally prepend a data: URL if a known MIME type is found;
  // otherwise just return the raw Base64.
  if (mimeType) {
    return `data:${mimeType};base64,${base64String}`;
  } else {
    // or you can default to `application/octet-stream` if unknown
    return `data:application/octet-stream;base64,${base64String}`;
  }
};

const convertSchemasForUI = (template: Template): SchemaForUI[][] => {
  template.schemas.forEach((page) => {
    page.forEach((schema) => {
      (schema as SchemaForUI).id = uuid();
      (schema as SchemaForUI).content = schema.content || '';
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
    // pdf2size accepts both ArrayBuffer and Uint8Array
    const pdfArrayBuffer = b64toUint8Array(b64BasePdf);

    pageSizes = await pdf2size(pdfArrayBuffer);
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
      if (xEdge > width) {
        value.position.x = Math.max(0, width - value.width);
      }
      if (yEdge > height) {
        value.position.y = Math.max(0, height - value.height);
      }
    });

    return schema;
  });
};

export const schemasList2template = (schemasList: SchemaForUI[][], basePdf: BasePdf): Template => ({
  schemas: cloneDeep(schemasList).map((page) =>
    page.map((schema) => {
      // @ts-expect-error Property 'id' is used only in UI
      delete schema.id;
      return schema;
    }),
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
    {},
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
  value: unknown,
  basePdf: BasePdf,
  pageSize: Size,
) => {
  const padding = isBlankPdf(basePdf) ? basePdf.padding : [0, 0, 0, 0];
  const [pt, pr, pb, pl] = padding;
  const { width: pw, height: ph } = pageSize;
  const calcBounds = (v: unknown, min: number, max: number) =>
    Math.min(Math.max(Number(v), min), max);
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
  value: unknown,
  pluginsRegistry: PluginRegistry,
) => {
  if (key !== 'type') return;
  const keysToKeep = ['id', 'name', 'type', 'position', 'required'];
  Object.keys(schema).forEach((key) => {
    if (!keysToKeep.includes(key)) {
      delete schema[key as keyof typeof schema];
    }
  });

  const plugin = pluginsRegistry.findByType(value as string);

  // Apply default schema properties if available
  if (plugin?.propPanel.defaultSchema) {
    const defaultSchema = plugin.propPanel.defaultSchema;
    const schemaRecord = schema as Record<string, unknown>;

    // Use a type-safe approach to copy properties
    for (const key of Object.keys(defaultSchema)) {
      // Only add properties that don't already exist in the schema
      if (!Object.prototype.hasOwnProperty.call(schema, key)) {
        const propertyValue = defaultSchema[key];
        if (propertyValue !== undefined) {
          schemaRecord[key] = propertyValue;
        }
      }
    }
  }
  if (schema.readOnly) {
    schema.required = false;
  }
};

export const changeSchemas = (args: {
  objs: { key: string; value: unknown; schemaId: string }[];
  schemas: SchemaForUI[];
  basePdf: BasePdf;
  pluginsRegistry: PluginRegistry;
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

export const useMaxZoom = () => {
  const options = useContext(OptionsContext);

  return options.maxZoom ? options.maxZoom / 100 : DEFAULT_MAX_ZOOM;
};

export const setFontNameRecursively = (
  obj: Record<string, unknown>,
  fontName: string,
  seen = new WeakSet(),
): void => {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
  seen.add(obj);

  for (const key in obj) {
    if (
      key === 'fontName' &&
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] === undefined
    ) {
      obj[key] = fontName;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      setFontNameRecursively(obj[key] as Record<string, unknown>, fontName, seen);
    }
  }
};
