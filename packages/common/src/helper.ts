import { z } from 'zod';
import Helvetica from './assets/Helvetica.ttf';
import { Template, Schema, BasePdf, Font, CommonProps, isTextSchema, BarCodeType } from './type';
import {
  Template as TemplateSchema,
  PreviewProps as PreviewPropsSchema,
  DesignerProps as DesignerPropsSchema,
  GenerateProps as GeneratePropsSchema,
  UIProps as UIPropsSchema,
} from './schema';

const DEFAULT_FONT_NAME = 'Helvetica';

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

export const b64toUint8Array = (base64: string) => {
  const data = base64.split(';base64,')[1] ? base64.split(';base64,')[1] : base64;

  const byteString =
    typeof window !== 'undefined'
      ? window.atob(data)
      : Buffer.from(data, 'base64').toString('binary');

  const unit8arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    unit8arr[i] = byteString.charCodeAt(i);
  }
  return unit8arr;
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
  [DEFAULT_FONT_NAME]: { data: b64toUint8Array(Helvetica), fallback: true },
});

const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

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

export const checkTemplate = (data: unknown) => checkProps(data, TemplateSchema);
export const checkUIProps = (data: unknown) => checkProps(data, UIPropsSchema);
export const checkPreviewProps = (data: unknown) => checkProps(data, PreviewPropsSchema);
export const checkDesignerProps = (data: unknown) => checkProps(data, DesignerPropsSchema);
export const checkGenerateProps = (data: unknown) => checkProps(data, GeneratePropsSchema);

export const validateBarcodeInput = (type: BarCodeType, input: string) => {
  if (!input) return false;
  if (type === 'qrcode') {
    // 500文字以下
    return input.length < 500;
  }
  if (type === 'japanpost') {
    // 郵便番号は数字(0-9)のみ。住所表示番号は英数字(0-9,A-Z)とハイフン(-)が使用可能です。
    const regexp = /^(\d{7})(\d|[A-Z]|-)+$/;

    return regexp.test(input);
  }
  if (type === 'ean13') {
    // 有効文字は数値(0-9)のみ。チェックデジットを含まない12桁orチェックデジットを含む13桁。
    const regexp = /^\d{12}$|^\d{13}$/;

    return regexp.test(input);
  }
  if (type === 'ean8') {
    // 有効文字は数値(0-9)のみ。チェックデジットを含まない7桁orチェックデジットを含む8桁。
    const regexp = /^\d{7}$|^\d{8}$/;

    return regexp.test(input);
  }
  if (type === 'code39') {
    // 有効文字は数字(0-9)。アルファベット大文字(A-Z)、記号(-.$/+%)、半角スペース。
    const regexp = /^(\d|[A-Z]|\-|\.|\$|\/|\+|\%|\s)+$/;

    return regexp.test(input);
  }
  if (type === 'code128') {
    // 有効文字は漢字、ひらがな、カタカナ以外。
    // https://qiita.com/graminume/items/2ac8dd9c32277fa9da64
    return !input.match(
      /([\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf]|[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝〜])+/
    );
  }
  if (type === 'nw7') {
    // 有効文字はNW-7は数字(0-9)と記号(-.$:/+)。
    // スタートコード／ストップコードとして、コードの始まりと終わりはアルファベット(A-D)のいずれかを使用してください。
    const regexp = /^[A-Da-d]([0-9\-\.\$\:\/\+])+[A-Da-d]$/;

    return regexp.test(input);
  }
  if (type === 'itf14') {
    // 有効文字は数値(0-9)のみ。 チェックデジットを含まない13桁orチェックデジットを含む14桁。
    const regexp = /^\d{13}$|^\d{14}$/;

    return regexp.test(input);
  }
  if (type === 'upca') {
    // 有効文字は数値(0-9)のみ。 チェックデジットを含まない11桁orチェックデジットを含む12桁。
    const regexp = /^\d{11}$|^\d{12}$/;

    return regexp.test(input);
  }
  if (type === 'upce') {
    // 有効文字は数値(0-9)のみ。 1桁目に指定できる数字(ナンバーシステムキャラクタ)は0のみ。
    // チェックデジットを含まない7桁orチェックデジットを含む8桁。
    const regexp = /^0(\d{6}$|\d{7}$)/;

    return regexp.test(input);
  }

  return false;
};
