import { PageSize, Template, TemplateWithPages, TemplateSchema, Schema } from './type';
import { blankPdf, barcodeList } from './constants';
import { nanoid } from 'nanoid';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker.entry';
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;
import _set from 'lodash.set';
import { debounce as _debounce } from 'debounce';
import { saveAs } from 'file-saver';
import { UAParser } from 'ua-parser-js';
import hotkeys from 'hotkeys-js';

export const uuid = nanoid;
export const set = _set;
export const debounce = _debounce;
export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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

export const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
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

export const blob2File = (theBlob: Blob, fileName: string): File => {
  const b: any = theBlob;
  b.lastModifiedDate = new Date();
  b.name = fileName;
  return theBlob as File;
};

export const round = (number: number, precision: number) => {
  const shift = (number: number, precision: number, reverseShift: boolean) => {
    if (reverseShift) {
      precision = -precision;
    }
    const numArray = ('' + number).split('e');
    return +(numArray[0] + 'e' + (numArray[1] ? +numArray[1] + precision : precision));
  };
  return shift(Math.round(shift(number, precision, false)), precision, true);
};

export const b64toBlob = (base64: string) => {
  const byteString = atob(base64.split(',')[1]);
  const mimeType = base64.match(/(:)([a-z/]+)(;)/)![2];
  const buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    buffer[i] = byteString.charCodeAt(i);
  }
  return new Blob([buffer.buffer], { type: mimeType });
};

export const isIos = () => {
  const parser = new UAParser();
  const os = parser.getOS().name;
  return os === 'iOS';
};

export const fileSave = (data: Blob | string, name: string) => {
  isIos()
    ? window.open(URL.createObjectURL(typeof data === 'string' ? b64toBlob(data) : data))
    : saveAs(data, name);
};

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  array = array.slice();
  const startIndex = to < 0 ? array.length + to : to;
  const item = array.splice(from, 1)[0];
  array.splice(startIndex, 0, item);
  return array;
};

const pt2mm = (pt: number) => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const mmRatio = 0.3527;
  return parseFloat(String(pt)) * mmRatio;
};

export const getPdfPageSizes = async (pdfBlob: Blob) => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await pdfjsLib.getDocument({ url }).promise;
  return Promise.all(
    new Array(pdfDoc.numPages).fill('').map((_, i) => {
      return new Promise<PageSize>(async (r) =>
        r(
          await pdfDoc.getPage(i + 1).then((page) => {
            const { height, width } = page.getViewport({ scale: 1 });
            URL.revokeObjectURL(url);
            return { height: pt2mm(height), width: pt2mm(width) };
          })
        )
      );
    })
  );
};

const pdf2Images = async (pdfBlob: Blob, width: number, imagetype: 'png' | 'jpeg') => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await pdfjsLib.getDocument({ url }).promise;
  return Promise.all(
    new Array(pdfDoc.numPages).fill('').map((_, i) => {
      return new Promise<string>(async (r) =>
        r(
          await pdfDoc.getPage(i + 1).then((page) => {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            const canvasContext = canvas.getContext('2d')!;
            const scaleRequired = canvas.width / page.getViewport({ scale: 1 }).width;
            const viewport = page.getViewport({ scale: scaleRequired });
            canvas.height = viewport.height;
            URL.revokeObjectURL(url);
            return page
              .render({ canvasContext, viewport })
              .promise.then(() => canvas.toDataURL(`image/${imagetype}`));
          })
        )
      );
    })
  );
};

export const pdf2Pngs = async (pdfBlob: Blob, width: number) => pdf2Images(pdfBlob, width, 'png');

export const fmtTemplate = (template: Template, schemas: Schema[][]): Template => {
  const _schemas = cloneDeep(schemas);
  const schemaAddedTemplate: Template = {
    basePdf: template.basePdf,
    fontName: template.fontName,
    sampledata: [
      _schemas.reduce((acc, cur) => {
        cur.forEach((c) => {
          acc[c.key] = c.data;
        });
        return acc;
      }, {} as { [key: string]: string }),
    ],
    columns: _schemas.reduce((acc, cur) => acc.concat(cur.map((s) => s.key)), [] as string[]),
    schemas: _schemas.map((_schema) =>
      _schema.reduce((acc, cur) => {
        const k = cur.key;
        // @ts-ignore
        delete cur.id;
        // @ts-ignore
        delete cur.key;
        // @ts-ignore
        delete cur.data;
        acc[k] = cur;
        return acc;
      }, {} as { [key: string]: TemplateSchema })
    ),
  };
  return schemaAddedTemplate;
};

export const sortSchemas = (template: Template, pageNum: number): Schema[][] =>
  new Array(pageNum).fill('').reduce((acc, _, i) => {
    acc.push(
      template.schemas[i]
        ? Object.entries(template.schemas[i])
            .sort((a, b) => {
              const aIndex = template.columns.findIndex((c) => c === a[0]);
              const bIndex = template.columns.findIndex((c) => c === b[0]);
              return aIndex > bIndex ? 1 : -1;
            })
            .map((e) => {
              const [key, value] = e;
              return Object.assign(value, {
                key,
                data: template.sampledata[0][key],
                id: uuid(),
              });
            })
        : []
    );
    return acc;
  }, [] as Schema[][]);

export const getInitialSchema = (): Schema => ({
  id: uuid(),
  key: '',
  type: 'text',
  position: {
    x: 0,
    y: 0,
  },
  width: 35,
  height: 7,
  alignment: 'left',
  fontSize: 12,
  characterSpacing: 0,
  lineHeight: 1,
  data: '',
});

const isEmptyObj = (obj: Object) => {
  return !Object.keys(obj).length;
};

const tempalteDataTest = (template: Template) => {
  const sampledata =
    template.sampledata.length > 0
      ? Object.entries(template.sampledata[0]).every((entry) => {
          const [key, value] = entry;
          return typeof key === 'string' && typeof value === 'string';
        })
      : true;
  const schemas = template.schemas.map((schema) =>
    Object.entries(schema).every((entry) => {
      const [key, value] = entry;
      return (
        isEmptyObj({ [key]: value }) ||
        (typeof key === 'string' &&
          typeof value.type === 'string' &&
          typeof value.position.x === 'number' &&
          typeof value.position.y === 'number' &&
          typeof value.width === 'number' &&
          typeof value.height === 'number' &&
          ['left', 'right', 'center'].includes(value.alignment || '') &&
          typeof value.fontSize === 'number' &&
          typeof value.characterSpacing === 'number' &&
          typeof value.lineHeight === 'number')
      );
    })
  );
  const columns = template.columns.every(
    (column) => typeof column === 'string' && typeof column === 'string'
  );
  const fontName = typeof template.fontName === 'string';
  const basePdf = typeof template.basePdf === 'string';
  return (
    sampledata &&
    schemas &&
    columns &&
    basePdf &&
    fontName &&
    template.schemas
      .map((schema) => Object.keys(schema).length)
      .reduce((acc, cur) => acc + cur, 0) === template.columns.length
  );
};

export const flatten = <T>(arr: any[]): T[] => [].concat(...arr);

export const fmtTemplateFromJson = (file: File) => {
  return readFile(file, 'text').then((jsonStr) => {
    try {
      const templateFromJson: Template = JSON.parse(jsonStr as string);
      templateFromJson.fontName = '';
      const flatSchemaLength = templateFromJson.schemas
        .map((schema) => Object.keys(schema).length)
        .reduce((acc, cur) => acc + cur, 0);
      // columns
      if (!templateFromJson.columns || flatSchemaLength !== templateFromJson.columns.length) {
        templateFromJson.columns = flatten(
          templateFromJson.schemas.map((schema) => Object.keys(schema))
        );
      }
      // sampledata
      if (
        !templateFromJson.sampledata ||
        !Array.isArray(templateFromJson.sampledata) ||
        !templateFromJson.sampledata[0] ||
        flatSchemaLength !== Object.keys(templateFromJson.sampledata[0]).length
      ) {
        templateFromJson.sampledata = [
          templateFromJson.schemas.reduce(
            (acc, cur) =>
              Object.assign(
                acc,
                Object.keys(cur).reduce(
                  (a, c) => Object.assign(a, { [c]: '' }),
                  {} as { [key: string]: string }
                )
              ),
            {} as { [key: string]: string }
          ),
        ];
      }
      // basePdf
      if (!templateFromJson.basePdf || typeof templateFromJson.basePdf !== 'string') {
        templateFromJson.basePdf = blankPdf;
      }
      if (tempalteDataTest(templateFromJson)) {
        return Promise.resolve(templateFromJson);
      } else {
        return Promise.reject(
          "Invalid template data: This Template can't load. invalid template data."
        );
      }
    } catch (e) {
      return Promise.reject("Invalid template data: This Template can't load. invalid JSON.");
    }
  });
};

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

  hotkeys(keys.join(), (e, handler) => {
    e.preventDefault();
    switch (handler.shortcut) {
      case up:
      case shiftUp:
        arg.move('up', hotkeys.shift);
        break;
      case down:
      case shiftDown:
        arg.move('down', hotkeys.shift);
        break;
      case left:
      case shiftLeft:
        arg.move('left', hotkeys.shift);
        break;
      case right:
      case shiftRight:
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
        arg.save();
        break;
    }
  });
};

export const destroyShortCuts = () => {
  hotkeys.unbind();
};

export const getInitialTemplate = (): TemplateWithPages => {
  return {
    sampledata: [],
    schemas: [],
    columns: [],
    basePdf: blankPdf,
    fontName: '',
    pages: [],
  };
};

export const getSampleByType = (type: string) => {
  const defaultValue: { [key: string]: string } = {
    qrcode: 'https://labelmake.jp/',
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

export const getKeepRaitoHeightByWidth = (type: string, width: number) => {
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

// TODO Must consider font
export const getFontFamily = (fontName?: string) => 'Helvetica, Arial, sans-serif';

export const getA4 = (): PageSize => ({ height: 297, width: 210 });

const blob2Base64 = (blob: Blob) => {
  return new Promise<string | ArrayBuffer>((r) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      r(reader.result as string);
    };
    reader.readAsDataURL(blob);
  });
};

export const getB64BasePdf = async (template: Template) => {
  const basePdf = template.basePdf;
  if (typeof basePdf === 'string' && basePdf.startsWith('http')) {
    const blob = await fetch(basePdf).then((res) => res.blob());
    const base64 = (await blob2Base64(blob)) as string;
    return base64;
  } else {
    return basePdf as string;
  }
};

// TODO Import from labelmake library and use
type BarCodeType = typeof barcodeList[number];
export const validateBarcodeInput = (type: BarCodeType, input: string) => {
  if (!input) return false;
  if (type === 'qrcode') {
    // 漢字を含まない500文字以下
    const regexp =
      /([\u{3005}\u{3007}\u{303b}\u{3400}-\u{9FFF}\u{F900}-\u{FAFF}\u{20000}-\u{2FFFF}][\u{E0100}-\u{E01EF}\u{FE00}-\u{FE02}]?)/mu;
    return !regexp.test(input) && input.length < 500;
  } else if (type === 'japanpost') {
    // 郵便番号は数字(0-9)のみ。住所表示番号は英数字(0-9,A-Z)とハイフン(-)が使用可能です。
    const regexp = /^(\d{7})(\d|[A-Z]|-)+$/;
    return regexp.test(input);
  } else if (type === 'ean13') {
    // 有効文字は数値(0-9)のみ。チェックデジットを含まない12桁orチェックデジットを含む13桁。
    const regexp = /^\d{12}$|^\d{13}$/;
    return regexp.test(input);
  } else if (type === 'ean8') {
    // 有効文字は数値(0-9)のみ。チェックデジットを含まない7桁orチェックデジットを含む8桁。
    const regexp = /^\d{7}$|^\d{8}$/;
    return regexp.test(input);
  } else if (type === 'code39') {
    // 有効文字は数字(0-9)。アルファベット大文字(A-Z)、記号(-.$/+%)、半角スペース。
    const regexp = /^(\d|[A-Z]|\-|\.|\$|\/|\+|\%|\s)+$/;
    return regexp.test(input);
  } else if (type === 'code128') {
    // 有効文字は漢字、ひらがな、カタカナ以外。
    // https://qiita.com/graminume/items/2ac8dd9c32277fa9da64
    return input.match(
      /([\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf]|[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝〜])+/
    )
      ? false
      : true;
  } else if (type === 'nw7') {
    // 有効文字はNW-7は数字(0-9)と記号(-.$:/+)。
    // スタートコード／ストップコードとして、コードの始まりと終わりはアルファベット(A-D)のいずれかを使用してください。
    const regexp = /^[A-Da-d]([0-9\-\.\$\:\/\+])+[A-Da-d]$/;
    return regexp.test(input);
  } else if (type === 'itf14') {
    // 有効文字は数値(0-9)のみ。 チェックデジットを含まない13桁orチェックデジットを含む14桁。
    const regexp = /^\d{13}$|^\d{14}$/;
    return regexp.test(input);
  } else if (type === 'upca') {
    // 有効文字は数値(0-9)のみ。 チェックデジットを含まない11桁orチェックデジットを含む12桁。
    const regexp = /^\d{11}$|^\d{12}$/;
    return regexp.test(input);
  } else if (type === 'upce') {
    // 有効文字は数値(0-9)のみ。 1桁目に指定できる数字(ナンバーシステムキャラクタ)は0のみ。
    // チェックデジットを含まない7桁orチェックデジットを含む8桁。
    const regexp = /^0(\d{6}$|\d{7}$)/;
    return regexp.test(input);
  }
  return false;
};
