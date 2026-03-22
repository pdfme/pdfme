import { z } from 'zod';
import { Buffer } from 'buffer';
import {
  Schema,
  Template,
  Font,
  BasePdf,
  Plugins,
  BlankPdf,
  LegacySchemaPageArray,
  SchemaPageArray,
} from './types.js';
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

export const cloneDeep = structuredClone;

const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

export const getFallbackFontName = (font: Font) => {
  const initial = '';
  const fallbackFontName = Object.entries(font).reduce((acc, cur) => {
    const [fontName, fontValue] = cur as [
      string,
      { data: string | ArrayBuffer | Uint8Array; fallback?: boolean; subset?: boolean },
    ];

    return !acc && fontValue.fallback ? fontName : acc;
  }, initial);
  if (fallbackFontName === initial) {
    throw Error(
      `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.`,
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

export const px2mm = (px: number): number => {
  // http://www.endmemo.com/sconvert/millimeterpixel.php
  const ratio = 0.26458333333333;
  return parseFloat(String(px)) * ratio;
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

/**
 * Migrate from legacy keyed object format to array format
 * @param template Template
 */
export const migrateTemplate = (template: Template) => {
  if (!template.schemas) {
    return;
  }

  if (
    Array.isArray(template.schemas) &&
    template.schemas.length > 0 &&
    !Array.isArray(template.schemas[0])
  ) {
    template.schemas = (template.schemas as unknown as LegacySchemaPageArray).map(
      (page: Record<string, Schema>) =>
        Object.entries(page).map(([key, value]) => ({
          ...value,
          name: key,
        })),
    );
  }
};

export const getInputFromTemplate = (template: Template): { [key: string]: string }[] => {
  migrateTemplate(template);

  const input: { [key: string]: string } = {};
  template.schemas.forEach((page) => {
    page.forEach((schema) => {
      if (!schema.readOnly) {
        input[schema.name] = schema.content || '';
      }
    });
  });

  return [input];
};

export const isUrlSafeToFetch = (urlString: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname === '::1'
  ) {
    return false;
  }

  // Block IPv6 private ranges (link-local, unique-local, IPv4-mapped)
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (/^fe80:/i.test(bare)) return false;
  if (/^f[cd]/i.test(bare)) return false;
  const ipv4MappedMatch = bare.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i);
  if (ipv4MappedMatch) {
    const a = Number(ipv4MappedMatch[1]);
    const b = Number(ipv4MappedMatch[2]);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (a === 0) return false;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }

  return true;
};

export const getB64BasePdf = async (
  customPdf: ArrayBuffer | Uint8Array | string,
): Promise<string> => {
  if (
    typeof customPdf === 'string' &&
    !customPdf.startsWith('data:application/pdf;') &&
    typeof window !== 'undefined'
  ) {
    if (!isUrlSafeToFetch(customPdf)) {
      throw Error(
        '[@pdfme/common] Invalid or unsafe URL for basePdf. Only http: and https: URLs pointing to public hosts are allowed.',
      );
    }
    const response = await fetch(customPdf);
    const blob = await response.blob();
    return blob2Base64Pdf(blob);
  }

  if (typeof customPdf === 'string') {
    return customPdf;
  }

  const uint8Array = customPdf instanceof Uint8Array ? customPdf : new Uint8Array(customPdf);
  return 'data:application/pdf;base64,' + Buffer.from(uint8Array).toString('base64');
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

const getFontNamesInSchemas = (schemas: SchemaPageArray) =>
  uniq(
    schemas
      .map((p) => p.map((v) => (v as Schema & { fontName?: string }).fontName ?? ''))
      .reduce((acc, cur) => acc.concat(cur), [] as (string | undefined)[])
      .filter(Boolean) as string[],
  );

export const checkFont = (arg: { font: Font; template: Template }) => {
  const {
    font,
    template: { schemas },
  } = arg;
  const fontValues = Object.values(font);
  const fallbackFontNum = fontValues.reduce(
    (acc, cur) => (cur.fallback ? acc + 1 : acc),
    0 as number,
  );
  if (fallbackFontNum === 0) {
    throw Error(
      `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`,
    );
  }
  if (fallbackFontNum > 1) {
    throw Error(
      `[@pdfme/common] ${fallbackFontNum} fallback flags found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`,
    );
  }

  const fontNamesInSchemas = getFontNamesInSchemas(schemas);
  const fontNames = Object.keys(font);
  if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
    throw Error(
      `[@pdfme/common] ${fontNamesInSchemas
        .filter((f) => !fontNames.includes(f))
        .join()} of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`,
    );
  }
};

export const checkPlugins = (arg: { plugins: Plugins; template: Template }) => {
  const {
    plugins,
    template: { schemas },
  } = arg;
  const allSchemaTypes = uniq(schemas.map((p) => p.map((v) => v.type)).flat());

  const pluginsSchemaTypes = Object.values(plugins).map((p) =>
    p ? p.propPanel.defaultSchema.type : undefined,
  );

  if (allSchemaTypes.some((s) => !pluginsSchemaTypes.includes(s))) {
    throw Error(
      `[@pdfme/common] ${allSchemaTypes
        .filter((s) => !pluginsSchemaTypes.includes(s))
        .join()} of template.schemas is not found in plugins.`,
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
--------------------------`,
      );
      throw Error(`[@pdfme/common] Invalid argument:
--------------------------
${messages.join('\n')}`);
    } else {
      throw Error(
        `[@pdfme/common] Unexpected parsing error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Check fonts if template and options exist
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
export const checkPreviewProps = (data: unknown) => checkProps(data, PreviewPropsSchema);
export const checkDesignerProps = (data: unknown) => checkProps(data, DesignerPropsSchema);
export const checkUIProps = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'template' in data) {
    migrateTemplate(data.template as Template);
  }
  checkProps(data, UIPropsSchema);
};
export const checkTemplate = (template: unknown) => {
  migrateTemplate(template as Template);
  checkProps(template, TemplateSchema);
};
export const checkGenerateProps = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'template' in data) {
    migrateTemplate(data.template as Template);
  }
  checkProps(data, GeneratePropsSchema);
};
