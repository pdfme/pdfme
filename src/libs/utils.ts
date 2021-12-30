import { nanoid } from 'nanoid';
import base64url from 'base64url';
import _set from 'lodash.set';
import { PageSize, Template, TemplateSchema, Schema, Schemas, BasePdf, Font } from './type';
import { DEFAULT_FONT_NAME } from './constants';

export const uuid = nanoid;

export const set = _set;

export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

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

export const b64toUint8Array = (base64: string) => {
  if (typeof window !== 'undefined') {
    const byteString = window.atob(base64.split(',')[1]);
    const unit8arr = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i += 1) {
      unit8arr[i] = byteString.charCodeAt(i);
    }

    return unit8arr;
  }

  return new Uint8Array(base64url.toBuffer(base64));
};

export const b64toBlob = (base64: string) => {
  const uniy8Array = b64toUint8Array(base64);
  const [, , mimeType] = base64.match(/(:)([a-z/]+)(;)/)!;

  return new Blob([uniy8Array.buffer], { type: mimeType });
};

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  array = array.slice();
  const startIndex = to < 0 ? array.length + to : to;
  const [item] = array.splice(from, 1);
  array.splice(startIndex, 0, item);

  return array;
};

export const flatten = <T>(arr: T[][]): T[] => ([] as T[]).concat(...arr);

export const pt2mm = (pt: number) => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const mmRatio = 0.3527;

  return parseFloat(String(pt)) * mmRatio;
};

export const mm2pt = (mm: number): number => {
  // https://www.ddc.co.jp/words/archives/20090701114500.html
  const ptRatio = 2.8346;

  return parseFloat(String(mm)) * ptRatio;
};

export const fmtTemplate = (template: Template, schemas: Schema[][]): Template => {
  const _schemas = cloneDeep(schemas);
  const schemaAddedTemplate: Template = {
    basePdf: template.basePdf,
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
  }, [] as Schema[][]);

export const getInitialSchema = (): Schema => ({
  id: uuid(),
  key: '',
  data: '',
  type: 'text',
  position: { x: 0, y: 0 },
  width: 35,
  height: 7,
  alignment: 'left',
  fontSize: 12,
  characterSpacing: 0,
  lineHeight: 1,
});

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

export const getB64BasePdf = async (basePdf: BasePdf) => {
  // TODO 相対パスに対応していない
  if (typeof basePdf === 'string' && basePdf.startsWith('http')) {
    const blob = await fetch(basePdf).then((res) => res.blob());
    const base64 = (await blob2Base64(blob)) as string;

    return base64;
  }

  return basePdf as string;
};

export const getFontNamesInSchemas = (schemas: Schemas) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => v.fontName))
      .reduce((acc, cur) => acc.concat(cur), [] as (string | undefined)[])
      .filter(Boolean) as string[]
  );

export const checkFont = (arg: { font?: Font; fontNamesInSchemas: string[] }) => {
  // TODO fontNamesInSchemasに値が設定されているがfontにないケースはエラーにする必要がある
  const { font, fontNamesInSchemas } = arg;
  if (font) {
    const fontNames = Object.keys(font);
    if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
      throw Error(
        `${fontNamesInSchemas
          .filter((f) => !fontNames.includes(f))
          .join()} of template.schemas is not found in font`
      );
    }

    const fontValues = Object.values(font);
    const defaultFontNum = fontValues.reduce((acc, cur) => (cur['default'] ? acc + 1 : acc), 0);
    if (defaultFontNum === 0) {
      throw Error(`default flag is not found in font. true default flag must be only one.`);
    }
    if (defaultFontNum > 1) {
      throw Error(
        `${defaultFontNum} default flags found in font. true default flag must be only one.`
      );
    }
  }
};

export const getDefaultFontName = (font: Font | undefined) =>
  font
    ? Object.entries(font).reduce((acc, cur) => {
        const [fontName, fontValue] = cur;

        return !acc && fontValue['default'] ? fontName : acc;
      }, '')
    : DEFAULT_FONT_NAME;
