import { nanoid } from 'nanoid';
import _set from 'lodash.set';
import { PageSize, Template, TemplateSchema, Schema, BasePdf } from './type';

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

export const b64toBlob = (base64: string) => {
  const byteString = atob(base64.split(',')[1]);
  const [, , mimeType] = base64.match(/(:)([a-z/]+)(;)/)!;
  const buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    buffer[i] = byteString.charCodeAt(i);
  }

  return new Blob([buffer.buffer], { type: mimeType });
};

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
  array = array.slice();
  const startIndex = to < 0 ? array.length + to : to;
  const [item] = array.splice(from, 1);
  array.splice(startIndex, 0, item);

  return array;
};

export const flatten = <T>(arr: any[]): T[] => [].concat(...arr);

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
  type: 'text',
  position: { x: 0, y: 0 },
  width: 35,
  height: 7,
  alignment: 'left',
  fontSize: 12,
  characterSpacing: 0,
  lineHeight: 1,
  data: '',
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

export const getB64BasePdf = async (basePdf: BasePdf) => {
  // TODO 相対パスに対応していない
  if (typeof basePdf === 'string' && basePdf.startsWith('http')) {
    const blob = await fetch(basePdf).then((res) => res.blob());
    const base64 = (await blob2Base64(blob)) as string;

    return base64;
  }

  return basePdf as string;
};
