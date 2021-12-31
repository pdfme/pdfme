import { z } from 'zod';
import Helvetica from '../assets/Helvetica.ttf';
import { Template, TemplateSchema, Schema, Schemas, BasePdf, Font, CommonProps } from './type';
import {
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
} from './constants';
import { cloneDeep, uuid, uniq, b64toUint8Array } from './utils';

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
  alignment: DEFAULT_ALIGNMENT,
  fontSize: DEFAULT_FONT_SIZE,
  characterSpacing: DEFAULT_CHARACTER_SPACING,
  lineHeight: DEFAULT_LINE_HEIGHT,
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

export const getDefaultFontName = (font: Font) => {
  const initial = '';
  const defaultFontName = Object.entries(font).reduce((acc, cur) => {
    const [fontName, fontValue] = cur;

    return !acc && fontValue['default'] ? fontName : acc;
  }, initial);
  if (defaultFontName === initial) {
    throw Error(`default flag is not found in font. true default flag must be only one.`);
  }

  return defaultFontName;
};

export const getDefaultFont = (): Font => ({
  [DEFAULT_FONT_NAME]: { data: b64toUint8Array(Helvetica), default: true, index: 0 },
});

const getFontNamesInSchemas = (schemas: Schemas) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => v.fontName))
      .reduce((acc, cur) => acc.concat(cur), [] as (string | undefined)[])
      .filter(Boolean) as string[]
  );

const checkFont = (arg: { font: Font; fontNamesInSchemas: string[] }) => {
  // TODO fontNamesInSchemasに値が設定されているがfontにないケースはエラーにする必要がある
  // fontに1つオブジェクトが入っていない場合にはフラグ立ってなくてもエラーにしない方がよさそう
  // defaultのフラグではなくて、fallbackにする？
  const { font, fontNamesInSchemas } = arg;
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
};

export const checkProps = <T>(data: unknown, zodSchema: z.ZodType<T>) => {
  try {
    zodSchema.parse(data);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const messages = e.issues.map(
        (issue) => `ERROR POSITION: ${issue.path.join('.')}
ERROR MESSAGE: ${issue.message}
--------------------------`
      );

      const message = messages.join('\n');
      throw Error(`Invalid argument:
--------------------------
${message}`);
    }
  }
  const commonProps = data as CommonProps;
  const { schemas } = commonProps.template;
  const font = commonProps.options?.font;
  if (font) {
    checkFont({ font, fontNamesInSchemas: getFontNamesInSchemas(schemas) });
  }
};
