import { PageSize, Template, TemplateSchema, Schema } from '../types';
import { blankPdf, CANVA_API } from '../constants';
import { nanoid } from 'nanoid';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import _set from 'lodash.set';
import { debounce as _debounce } from 'debounce';
import { saveAs } from 'file-saver';
import { UAParser } from 'ua-parser-js';
import hotkeys from 'hotkeys-js';
import memoizeOne from 'memoize-one';

export const uuid = nanoid;
export const set = _set;
export const debounce = _debounce;
export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const readFiles = (
  files: FileList | null,
  type: 'text' | 'dataURL' | 'arrayBuffer'
) => {
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

export const readFile = (
  file: File | null,
  type: 'text' | 'dataURL' | 'arrayBuffer'
) => {
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
    return +(
      numArray[0] +
      'e' +
      (numArray[1] ? +numArray[1] + precision : precision)
    );
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
    ? window.open(
        URL.createObjectURL(typeof data === 'string' ? b64toBlob(data) : data)
      )
    : saveAs(data, name);
};

export const arrayMove = (array: any[], from: number, to: number) => {
  array = array.slice();
  const startIndex = to < 0 ? array.length + to : to;
  const item = array.splice(from, 1)[0];
  array.splice(startIndex, 0, item);
  return array;
};

export const pt2mm = (pt: number) => {
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

const pdf2Images = async (
  pdfBlob: Blob,
  width: number,
  imagetype: 'png' | 'jpeg'
) => {
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
            const scaleRequired =
              canvas.width / page.getViewport({ scale: 1 }).width;
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

export const pdf2Pngs = async (pdfBlob: Blob, width: number) =>
  pdf2Images(pdfBlob, width, 'png');

export const fmtTemplate = (
  template: Template,
  schemas: Schema[][]
): Template => {
  const _schemas = cloneDeep(schemas);
  const schemaAddedTemplate: Template = {
    basePdf: template.basePdf,
    canvaId: template.canvaId ? template.canvaId : '',
    fontName: template.fontName,
    sampledata: [
      _schemas.reduce((acc, cur) => {
        cur.forEach((c) => {
          acc[c.key] = c.data;
        });
        return acc;
      }, {} as { [key: string]: string }),
    ],
    columns: _schemas.reduce(
      (acc, cur) => acc.concat(cur.map((s) => s.key)),
      [] as string[]
    ),
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
          ['left', 'right', 'center'].includes(value.alignment) &&
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
      if (
        !templateFromJson.columns ||
        flatSchemaLength !== templateFromJson.columns.length
      ) {
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
      if (
        !templateFromJson.basePdf ||
        typeof templateFromJson.basePdf !== 'string'
      ) {
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
      return Promise.reject(
        "Invalid template data: This Template can't load. invalid JSON."
      );
    }
  });
};

type Command = 'up' | 'down' | 'left' | 'right';
export const initShortCuts = (arg: {
  move: (command: Command, isShift: boolean) => void;
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

export const getInitialTemplate = (): Template => {
  return {
    sampledata: [],
    schemas: [],
    columns: [],
    basePdf: blankPdf,
    fontName: '',
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

export const fmtTemplateForDev = (template: Template, schemas: Schema[][]) => {
  const fmtdTmplt: any = fmtTemplate(template, schemas);
  delete fmtdTmplt.id;
  delete fmtdTmplt.status;
  delete fmtdTmplt.owner;
  delete fmtdTmplt.name;
  delete fmtdTmplt.description;
  delete fmtdTmplt.tags;
  delete fmtdTmplt.photo;
  delete fmtdTmplt.columns;
  delete fmtdTmplt.sampledata;
  delete fmtdTmplt.fontName;
  delete fmtdTmplt.createdAt;
  delete fmtdTmplt.updatedAt;
  delete fmtdTmplt.canvaId;
  fmtdTmplt.schemas.forEach((schema: any) => {
    delete schema.id;
    delete schema.key;
    delete schema.data;
    Object.values(schema).forEach((s: any) => {
      if (s.type !== 'text') {
        delete s.alignment;
        delete s.fontSize;
        delete s.characterSpacing;
        delete s.lineHeight;
        delete s.fontColor;
        delete s.backgroundColor;
      }
      if (!s.fontColor) delete s.fontColor;
      if (!s.backgroundColor) delete s.backgroundColor;
    });
  });
  return fmtdTmplt;
};

export const copyTextToClipboard = (textVal: string): void => {
  const copyFrom = document.createElement('textarea');
  copyFrom.textContent = textVal;
  const bodyElm = document.getElementsByTagName('body')[0];
  bodyElm.appendChild(copyFrom);
  copyFrom.select();
  document.execCommand('copy');
  bodyElm.removeChild(copyFrom);
};

export const designTypes: string[] = [
  'A4Document',
  'Announcement',
  'BirthdayCard',
  'BirthdayInvitation',
  'BlogBanner',
  'BookCover',
  'Bookmark',
  'Brochure',
  'BusinessCard',
  'Calendar',
  'Card',
  'Certificate',
  'DesktopWallpaper',
  'EmailHeader',
  'EtsyShopCover',
  'EtsyShopIcon',
  'FacebookAd',
  'FacebookAppAd',
  'FacebookCover',
  'FacebookEventCover',
  'FacebookPost',
  'Flyer',
  'GiftCertificate',
  'Infographic',
  'InstagramPost',
  'InstagramStory',
  'Invitation',
  'Invoice',
  'Label',
  'LargeRectangleAd',
  'LeaderboardAd',
  'LessonPlan',
  'Letter',
  'LinkedInBanner',
  'Logo',
  'MagazineCover',
  'MediumRectangleAd',
  'Menu',
  'MindMap',
  'Newsletter',
  'PhotoCollage',
  'PinterestGraphic',
  'Postcard',
  'Poster',
  'Presentation',
  'Presentation43',
  'ProductLabel',
  'RecipeCard',
  'Resume',
  'SnapchatGeofilter',
  'SocialMedia',
  'Ticket',
  'TumblrGraphic',
  'TwitterHeader',
  'TwitterPost',
  'WattpadBookCover',
  'WeddingInvitation',
  'WideSkyscraperAd',
  'Worksheet',
  'Yearbook',
  'YouTubeChannelArt',
  'YouTubeThumbnail',
];

const _getCanvaApi = async (): Promise<any> => {
  return new Promise((r) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.canva.com/designbutton/v2/api.js';
    script.onload = async () => {
      const api = await window.Canva.DesignButton.initialize({
        apiKey: CANVA_API,
      });
      r(api);
    };
    document.body.appendChild(script);
  });
};

const memoize = <T extends (...args: any) => any>(func: T): T =>
  memoizeOne(func);

const getCanvaApi = memoize(_getCanvaApi);

type fmt = 'yyyy' | 'MM' | 'dd' | 'hh' | 'mm' | 'ss';
const dateFmt = (date: Date, format: string): string => {
  const dateFormat = {
    _fmt: {
      yyyy: (d: Date): string => d.getFullYear() + '',
      MM: (d: Date): string => ('0' + (d.getMonth() + 1)).slice(-2),
      dd: (d: Date): string => ('0' + d.getDate()).slice(-2),
      hh: (d: Date): string => ('0' + d.getHours()).slice(-2),
      mm: (d: Date): string => ('0' + d.getMinutes()).slice(-2),
      ss: (d: Date): string => ('0' + d.getSeconds()).slice(-2),
    },
    _priority: ['yyyy', 'MM', 'dd', 'hh', 'mm', 'ss'],
    format: function (_d: Date, format: string) {
      return this._priority.reduce(
        (res, fmt) => res.replace(fmt, this._fmt[fmt as fmt](_d)),
        format
      );
    },
  };
  return dateFormat.format(date, format);
};

const getTemplateName = () =>
  'Template@' + dateFmt(new Date(), 'yyyy-MM-dd-hh:mm');

export const canvaCreate = (
  designType: string,
  onPublish: (file: File, canvaId: string) => void
) => {
  getCanvaApi().then((canva) => {
    canva.createDesign({
      design: { type: designType },
      editor: { fileType: 'pdf' },
      onDesignPublish: (options: any) => {
        const exportUrl = options.exportUrl;
        const canvaId = options.designId;
        fetch(exportUrl)
          .then((res) => res.blob())
          .then((blob) => {
            onPublish(blob2File(blob, getTemplateName()), canvaId);
          });
      },
    });
  });
};

export const canvaEdit = (
  templateCanvaId: string,
  onPublish: (file: File, canvaId: string) => void
) => {
  getCanvaApi().then((canva) => {
    canva.editDesign({
      design: { id: templateCanvaId },
      editor: { fileType: 'pdf' },
      onDesignPublish: (options: any) => {
        const exportUrl = options.exportUrl;
        const canvaId = options.designId;
        fetch(exportUrl)
          .then((res) => res.blob())
          .then((blob) => {
            onPublish(blob2File(blob, getTemplateName()), canvaId);
          });
      },
    });
  });
};
