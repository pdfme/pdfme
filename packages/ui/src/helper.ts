// @ts-ignore
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.js';
GlobalWorkerOptions.workerSrc = PDFJSWorker;
import hotkeys from 'hotkeys-js';
import {
  getB64BasePdf,
  b64toUint8Array,
  Template,
  SchemaForUI,
  Schema,
  Size,
  DEFAULT_ALIGNMENT,
  DEFAULT_FONT_SIZE,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_LINE_HEIGHT,
} from '@pdfme/common';

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

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  array = array.slice();
  const startIndex = to < 0 ? array.length + to : to;
  const [item] = array.splice(from, 1);
  array.splice(startIndex, 0, item);

  return array;
};

export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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
      default:
        break;
    }
  });
};

export const destroyShortCuts = () => {
  hotkeys.unbind(keys.join());
};

const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && file !== null) {
        r(e.target.result);
      }
    });
    if (file !== null) {
      if (type === 'text') {
        fileReader.readAsText(file);
      } else if (type === 'dataURL') {
        fileReader.readAsDataURL(file);
      } else if (type === 'arrayBuffer') {
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
};

export const readFiles = (files: FileList | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && files !== null) {
        r(e.target.result);
      }
    });
    if (files !== null && files[0]) {
      readFile(files[0], type).then((data) => r(data));
    }
  });
};

const sortSchemasList = (template: Template, pageNum: number): SchemaForUI[][] =>
  new Array(pageNum).fill('').reduce((acc, _, i) => {
    acc.push(
      template.schemas[i]
        ? Object.entries(template.schemas[i])
            .sort((a, b) => {
              const aIndex = (template.columns ?? []).findIndex((c) => c === a[0]);
              const bIndex = (template.columns ?? []).findIndex((c) => c === b[0]);

              return aIndex > bIndex ? 1 : -1;
            })
            .map((e) => {
              const [key, value] = e;
              const data = template.sampledata ? template.sampledata[0][key] : '';

              return Object.assign(value, {
                key,
                data,
                id: uuid(),
              });
            })
        : []
    );

    return acc;
  }, [] as SchemaForUI[][]);

const pt2mm = (pt: number) => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const mmRatio = 0.3527;

  return parseFloat(String(pt)) * mmRatio;
};

export const getPdfPageSizes = async (pdfBlob: Blob) => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await getDocument({ url }).promise;

  const promises = Promise.all(
    new Array(pdfDoc.numPages).fill('').map(async (_, i) => {
      const pageSize = await pdfDoc.getPage(i + 1).then((page) => {
        const { height, width } = page.getViewport({ scale: 1 });

        return { height: pt2mm(height), width: pt2mm(width) };
      });

      return pageSize;
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
      const image = await pdfDoc.getPage(i + 1).then((page) => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        const canvasContext = canvas.getContext('2d')!;
        const scaleRequired = canvas.width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: scaleRequired });
        canvas.height = viewport.height;

        return page
          .render({ canvasContext, viewport })
          .promise.then(() => canvas.toDataURL(`image/${imageType}`));
      });

      return image;
    })
  );
  URL.revokeObjectURL(url);

  return promises;
};

export const pdf2Pngs = (pdfBlob: Blob, width: number) => pdf2Images(pdfBlob, width, 'png');

export const b64toBlob = (base64: string) => {
  const uniy8Array = b64toUint8Array(base64);
  const [, , mimeType] = base64.match(/(:)([a-z/]+)(;)/)!;

  return new Blob([uniy8Array.buffer], { type: mimeType });
};

export const templateSchemas2SchemasList = async (_template: Template) => {
  const template = cloneDeep(_template);
  const sortedSchemasList = sortSchemasList(template, template.schemas.length);
  const basePdf = await getB64BasePdf(template.basePdf);
  const pdfBlob = b64toBlob(basePdf);
  const pageSizes = await getPdfPageSizes(pdfBlob);
  const ssl = sortedSchemasList.length;
  const psl = pageSizes.length;
  const schemasList = (
    ssl < psl
      ? sortedSchemasList.concat(new Array(psl - ssl).fill(cloneDeep([])))
      : sortedSchemasList.slice(0, pageSizes.length)
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

  return schemasList;
};

export const fmtTemplate = (template: Template, schemasList: SchemaForUI[][]): Template => {
  const schemaAddedTemplate: Template = {
    schemas: cloneDeep(schemasList).map((schema) =>
      schema.reduce((acc, cur) => {
        const k = cur.key;
        // @ts-ignore
        delete cur.id;
        // @ts-ignore
        delete cur.key;
        // @ts-ignore
        delete cur.data;
        acc[k] = cur;

        return acc;
      }, {} as { [key: string]: Schema })
    ),
    columns: cloneDeep(schemasList).reduce(
      (acc, cur) => acc.concat(cur.map((s) => s.key)),
      [] as string[]
    ),
    sampledata: [
      cloneDeep(schemasList).reduce((acc, cur) => {
        cur.forEach((c) => {
          acc[c.key] = c.data;
        });

        return acc;
      }, {} as { [key: string]: string }),
    ],
    basePdf: template.basePdf,
  };

  return schemaAddedTemplate;
};

export const getInitialSchema = (): SchemaForUI => ({
  id: uuid(),
  key: '',
  data: '',
  type: 'text',
  position: { x: 0, y: 0 },
  width: 35,
  height: 7,
  alignment: DEFAULT_ALIGNMENT,
  fontSize: DEFAULT_FONT_SIZE,
  characterSpacing: DEFAULT_CHARACTER_SPACING,
  lineHeight: DEFAULT_LINE_HEIGHT,
});

export const getSampleByType = (type: string) => {
  const defaultValue: { [key: string]: string } = {
    qrcode: 'https://pdfme.com/',
    japanpost: '6540123789-A-K-Z',
    ean13: '2112345678900',
    ean8: '02345673',
    code39: 'THIS IS CODE 39',
    code128: 'This is Code 128!',
    nw7: 'A0123456789B',
    itf14: '04601234567893',
    upca: '416000336108',
    upce: '00123457',
  };

  return defaultValue[type] ? defaultValue[type] : '';
};

export const getKeepRatioHeightByWidth = (type: string, width: number) => {
  const raito: { [key: string]: number } = {
    qrcode: 1,
    japanpost: 0.09,
    ean13: 0.4,
    ean8: 0.5,
    code39: 0.5,
    code128: 0.5,
    nw7: 0.5,
    itf14: 0.3,
    upca: 0.4,
    upce: 0.5,
  };

  return width * (raito[type] ? raito[type] : 1);
};

export const getUniqSchemaKey = (arg: {
  copiedSchemaKey: string;
  schema: SchemaForUI[];
  stackUniqSchemaKeys: string[];
}) => {
  const { copiedSchemaKey, schema, stackUniqSchemaKeys } = arg;
  const schemaKeys = schema.map((s) => s.key).concat(stackUniqSchemaKeys);
  const tmp: { [originalKey: string]: number } = schemaKeys.reduce(
    (acc, cur) => Object.assign(acc, { originalKey: cur, copiedNum: 0 }),
    {}
  );
  const extractOriginalKey = (key: string) => key.replace(/ copy$| copy [0-9]*$/, '');
  schemaKeys
    .filter((key) => / copy$| copy [0-9]*$/.test(key))
    .forEach((key) => {
      const originalKey = extractOriginalKey(key);
      const match = key.match(/[0-9]*$/);
      const copiedNum = match && match[0] ? Number(match[0]) : 1;
      if ((tmp[originalKey] ?? 0) < copiedNum) {
        tmp[originalKey] = copiedNum;
      }
    });

  const originalKey = extractOriginalKey(copiedSchemaKey);
  if (tmp[originalKey]) {
    const copiedNum = tmp[originalKey];
    const uniqKey = `${originalKey} copy ${copiedNum + 1}`;
    stackUniqSchemaKeys.push(uniqKey);

    return uniqKey;
  }
  const uniqKey = `${copiedSchemaKey} copy`;
  stackUniqSchemaKeys.push(uniqKey);

  return uniqKey;
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

    return { key: `position.${key}`, value, schemaId: as.id };
  });
};
