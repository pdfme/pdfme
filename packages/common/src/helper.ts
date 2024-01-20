import { z } from 'zod';
import { Buffer } from 'buffer';
import { Schema, Template, Font, BasePdf, Plugins, BlankPdf, CommonOptions } from './types';
import {
  Inputs as InputsSchema,
  UIOptions as UIOptionsSchema,
  Template as TemplateSchema,
  PreviewProps as PreviewPropsSchema,
  DesignerProps as DesignerPropsSchema,
  GenerateProps as GeneratePropsSchema,
  UIProps as UIPropsSchema,
  BlankPdf as BlankPdfSchema,
} from './schema.js';
import {
  MM_TO_PT_RATIO,
  PT_TO_MM_RATIO,
  PT_TO_PX_RATIO,
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_VALUE,
} from './constants.js';

const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

export const getFallbackFontName = (font: Font) => {
  const initial = '';
  const fallbackFontName = Object.entries(font).reduce((acc, cur) => {
    const [fontName, fontValue] = cur;

    return !acc && fontValue.fallback ? fontName : acc;
  }, initial);
  if (fallbackFontName === initial) {
    throw Error(
      `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.`
    );
  }

  return fallbackFontName;
};

export const getDefaultFont = (): Font => ({
  [DEFAULT_FONT_NAME]: { data: b64toUint8Array(DEFAULT_FONT_VALUE), fallback: true },
});

export const mm2pt = (mm: number): number => {
  return parseFloat(String(mm)) * MM_TO_PT_RATIO;
};

export const pt2mm = (pt: number): number => {
  return pt * PT_TO_MM_RATIO;
};

export const pt2px = (pt: number): number => {
  return pt * PT_TO_PX_RATIO;
};

const blob2Base64Pdf = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if ((reader.result as string).startsWith('data:application/pdf;')) {
        resolve(reader.result as string);
      } else {
        reject(Error('[@pdfme/common] template.basePdf must be pdf data.'));
      }
    };
    reader.readAsDataURL(blob);
  });
};

export const isHexValid = (hex: string): boolean => {
  return /^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/i.test(hex);
};

export const getInputFromTemplate = (template: Template): { [key: string]: string }[] => {
  const input: { [key: string]: string } = {};
  template.schemas.forEach((schema) => {
    Object.entries(schema).forEach(([key, value]) => {
      if (!value.readOnly) {
        input[key] = value.content || '';
      }
    });
  });

  return [input];
};

export const getB64BasePdf = (basePdf: BasePdf) => {
  const needFetchFromNetwork =
    typeof basePdf === 'string' && !basePdf.startsWith('data:application/pdf;');
  if (needFetchFromNetwork && typeof window !== 'undefined') {
    return fetch(basePdf)
      .then((res) => res.blob())
      .then(blob2Base64Pdf)
      .catch((e: Error) => {
        throw e;
      });
  }

  return basePdf as string;
};

export const isBlankPdf = (basePdf: BasePdf): basePdf is BlankPdf =>
  BlankPdfSchema.safeParse(basePdf).success;

const getByteString = (base64: string) => Buffer.from(base64, 'base64').toString('binary');

export const b64toUint8Array = (base64: string) => {
  const data = base64.split(';base64,')[1] ? base64.split(';base64,')[1] : base64;

  const byteString = getByteString(data);

  const unit8arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    unit8arr[i] = byteString.charCodeAt(i);
  }
  return unit8arr;
};

const getFontNamesInSchemas = (schemas: { [key: string]: Schema }[]) =>
  uniq(
    schemas
      .map((s) => Object.values(s).map((v) => (v as any).fontName ?? ''))
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
    throw Error(
      `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`
    );
  }
  if (fallbackFontNum > 1) {
    throw Error(
      `[@pdfme/common] ${fallbackFontNum} fallback flags found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`
    );
  }

  const fontNamesInSchemas = getFontNamesInSchemas(schemas);
  const fontNames = Object.keys(font);
  if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
    throw Error(
      `[@pdfme/common] ${fontNamesInSchemas
        .filter((f) => !fontNames.includes(f))
        .join()} of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`
    );
  }
};

export const checkPlugins = (arg: { plugins: Plugins; template: Template }) => {
  const {
    plugins,
    template: { schemas },
  } = arg;
  const allSchemaTypes = uniq(schemas.map((s) => Object.values(s).map((v) => v.type)).flat());

  const pluginsSchemaTypes = Object.values(plugins).map((p) => p?.propPanel.defaultSchema.type);

  if (allSchemaTypes.some((s) => !pluginsSchemaTypes.includes(s))) {
    throw Error(
      `[@pdfme/common] ${allSchemaTypes
        .filter((s) => !pluginsSchemaTypes.includes(s))
        .join()} of template.schemas is not found in plugins.`
    );
  }
};

const checkProps = <T>(data: unknown, zodSchema: z.ZodType<T>) => {
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
      throw Error(`[@pdfme/common] Invalid argument:
--------------------------
${message}`);
    }
  }

  // Check fon if template and options exist
  if (data && typeof data === 'object' && 'template' in data && 'options' in data) {
    const { template, options } = data as { template: Template; options: { font?: Font } };
    if (options && options.font) {
      checkFont({ font: options.font, template });
    }
  }

  // Check plugins if template and plugins exist
  if (data && typeof data === 'object' && 'template' in data && 'plugins' in data) {
    const { template, plugins } = data as { template: Template; plugins: Plugins };
    if (plugins) {
      checkPlugins({ plugins, template });
    }
  }
};

export const checkInputs = (data: unknown) => checkProps(data, InputsSchema);
export const checkUIOptions = (data: unknown) => checkProps(data, UIOptionsSchema);
export const checkTemplate = (data: unknown) => checkProps(data, TemplateSchema);
export const checkUIProps = (data: unknown) => checkProps(data, UIPropsSchema);
export const checkPreviewProps = (data: unknown) => checkProps(data, PreviewPropsSchema);
export const checkDesignerProps = (data: unknown) => checkProps(data, DesignerPropsSchema);
export const checkGenerateProps = (data: unknown) => checkProps(data, GeneratePropsSchema);

// TODO
// とりあえずフォームから行数を増やして、改ページできるようにする
// ここで schema.y よりも大きい他のスキーマの y を増加させる
// さらにオーバーフローした場合は、ページを追加する

interface ModifyTemplateForDynamicTableArg {
  template: Template;
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: CommonOptions;

  getDynamicHeight: (
    value: string,
    args: { schema: Schema; options: CommonOptions; _cache: Map<any, any> },
    pageWidth: number
  ) => Promise<number>;
}
/*
 * テーブルの行数が増えた場合、その分、そのテーブルより下のスキーマの y を増加/減少させる
 */
export const getDynamicTemplate = async (arg: ModifyTemplateForDynamicTableArg) => {
  const { template } = arg;
  if (!isBlankPdf(template.basePdf)) {
    return template;
  }
  const diffMap = await calculateDiffMap({ ...arg });
  return normalizePositionsAndPageBreak(template, diffMap);
};

async function calculateDiffMap(arg: ModifyTemplateForDynamicTableArg) {
  const { template, input, _cache, options, getDynamicHeight } = arg;
  if (!isBlankPdf(template.basePdf)) {
    return {};
  }
  const diffMap: { [y: number]: number } = {};
  for (const schemaObj of template.schemas) {
    for (const [key, schema] of Object.entries(schemaObj)) {
      if (schema.type !== 'table') continue;
      const pageWidth = template.basePdf.width;
      const dynamicHeight = await getDynamicHeight(
        input[key],
        { schema, options, _cache },
        pageWidth
      );
      diffMap[schema.position.y + schema.height] = dynamicHeight - schema.height;
    }
  }
  // TODO ここでdiffMap内でyが下にあるものに対してもdiffの値を加算する
  // じゃないとdiffMapのプロパティが複数あるときに対応できない
  return diffMap;
}

function normalizePositionsAndPageBreak(
  template: Template,
  diffMap: { [y: number]: number }
): Template {
  const returnTemplate: Template = { schemas: [], basePdf: template.basePdf };
  if (!isBlankPdf(template.basePdf) || Object.keys(diffMap).length === 0) {
    return template;
  }

  const pageHeight = template.basePdf.height;
  const padding = template.basePdf.padding;
  const paddingTop = padding[0];
  const paddingBottom = padding[2];

  for (let i = 0; i < template.schemas.length; i += 1) {
    const schemaObj = template.schemas[i];
    for (const [key, schema] of Object.entries(schemaObj)) {
      for (const [diffKey, diffValue] of Object.entries(diffMap)) {
        const { position, height } = schema;
        const page = returnTemplate.schemas;
        const isAffected = position.y > Number(diffKey);
        if (isAffected) {
          const yPlusDiff = position.y + diffValue;
          const shouldGoNextPage = yPlusDiff + height > pageHeight - paddingBottom;
          if (shouldGoNextPage) {
            // TODO このnewYの計算がおかしい。マイナスになっている
            // paddingTopは必要なのか？
            const newY = Math.max(
              // これがおかしい
              paddingTop + yPlusDiff - (pageHeight - paddingBottom),
              paddingTop
            );

            // 次のページの存在チェック
            const nextPage = page[i + 1];
            if (nextPage) {
              // 次のページに追加する
              nextPage[key] = { ...schema, position: { ...position, y: newY } };
            } else {
              // なければページを追加してから追加する
              page.push({ [key]: { ...schema, position: { ...position, y: newY } } });
            }
          } else {
            // なければページを追加してから追加する
            if (!page[i]) page[i] = {};

            page[i][key] = { ...schema, position: { ...position, y: yPlusDiff } };
          }
        } else {
          page[i] = { ...page[i], [key]: schema };
        }
      }
    }
  }
  return returnTemplate;
}
