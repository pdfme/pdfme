import { z } from 'zod';
import Helvetica from '../assets/Helvetica.ttf';
import { Template, Schema, SchemaForUI, BasePdf, Font, CommonProps, isTextSchema } from './type';
import {
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
} from './constants';
import { cloneDeep, uuid, uniq, b64toUint8Array, flatten, b64toBlob } from './utils';
import { getPdfPageSizes } from './pdfjs';

export const fmtTemplate = (template: Template, schemasList: SchemaForUI[][]): Template => {
  const _schemasList = cloneDeep(schemasList);
  const schemaAddedTemplate: Template = {
    basePdf: template.basePdf,
    sampledata: [
      _schemasList.reduce((acc, cur) => {
        cur.forEach((c) => {
          acc[c.key] = c.data;
        });

        return acc;
      }, {} as { [key: string]: string }),
    ],
    columns: _schemasList.reduce((acc, cur) => acc.concat(cur.map((s) => s.key)), [] as string[]),
    schemas: _schemasList.map((_schema) =>
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
      }, {} as { [key: string]: Schema })
    ),
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

const blob2Base64Pdf = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if ((reader.result as string).startsWith('data:application/pdf;')) {
        resolve(reader.result as string);
      } else {
        reject(Error('template.basePdf must be pdf data.'));
      }
    };
    reader.readAsDataURL(blob);
  });
};

export const getB64BasePdf = (basePdf: BasePdf) => {
  const needFetchFromNetwork =
    typeof basePdf === 'string' && !basePdf.startsWith('data:application/pdf;');
  if (needFetchFromNetwork) {
    return fetch(basePdf)
      .then((res) => res.blob())
      .then(blob2Base64Pdf)
      .catch((e: Error) => {
        throw e;
      });
  }

  return basePdf as string;
};

export const getFallbackFontName = (font: Font) => {
  const initial = '';
  const fallbackFontName = Object.entries(font).reduce((acc, cur) => {
    const [fontName, fontValue] = cur;

    return !acc && fontValue.fallback ? fontName : acc;
  }, initial);
  if (fallbackFontName === initial) {
    throw Error(`fallback flag is not found in font. true fallback flag must be only one.`);
  }

  return fallbackFontName;
};

export const getDefaultFont = (): Font => ({
  [DEFAULT_FONT_NAME]: { data: b64toUint8Array(Helvetica), fallback: true, index: 0 },
});

const getFontNamesInSchemas = (schemas: { [key: string]: Schema }[]) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => (isTextSchema(v) ? v.fontName : '')))
      .reduce((acc, cur) => acc.concat(cur), [] as (string | undefined)[])
      .filter(Boolean) as string[]
  );

export const checkFont = (arg: { font: Font; template: Template }) => {
  const {
    font,
    template: { schemas },
  } = arg;
  const fontValues = Object.values(font);
  const fallbackFontNum = fontValues.reduce((acc, cur) => (cur.fallback ? acc + 1 : acc), 0);
  if (fallbackFontNum === 0) {
    throw Error(`fallback flag is not found in font. true fallback flag must be only one.`);
  }
  if (fallbackFontNum > 1) {
    throw Error(
      `${fallbackFontNum} fallback flags found in font. true fallback flag must be only one.`
    );
  }

  const fontNamesInSchemas = getFontNamesInSchemas(schemas);
  const fontNames = Object.keys(font);
  if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
    throw Error(
      `${fontNamesInSchemas
        .filter((f) => !fontNames.includes(f))
        .join()} of template.schemas is not found in font.`
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
  const { template, options } = commonProps;
  const font = options?.font;
  if (font) {
    checkFont({ font, template });
  }
};

export const generateColumnsAndSampledataIfNeeded = (template: Template) => {
  const { schemas, columns, sampledata } = template;

  const flatSchemaLength = schemas
    .map((schema) => Object.keys(schema).length)
    .reduce((acc, cur) => acc + cur, 0);

  const neetColumns = !columns || flatSchemaLength !== columns.length;

  const needSampledata = !sampledata || flatSchemaLength !== Object.keys(sampledata[0]).length;

  // columns
  if (neetColumns) {
    template.columns = flatten(schemas.map((schema) => Object.keys(schema)));
  }

  // sampledata
  if (needSampledata) {
    template.sampledata = [
      schemas.reduce(
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

  return template;
};

const extractOriginalKey = (key: string) => key.replace(/ copy$| copy [0-9]*$/, '');

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

export const templateSchemas2SchemasList = async (template: Template) => {
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
