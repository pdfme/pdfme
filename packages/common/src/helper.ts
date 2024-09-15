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

export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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

interface ModifyTemplateForDynamicTableArg {
  template: Template;
  input: Record<string, string>;
  _cache: Map<any, any>;
  options: CommonOptions;
  getDynamicHeights: (
    value: string,
    args: { schema: Schema; basePdf: BasePdf; options: CommonOptions; _cache: Map<any, any> }
  ) => Promise<number[]>;
}

class Node {
  index = 0;

  key?: string;
  schema?: Schema;

  children: Node[] = [];

  width = 0;
  height = 0;
  padding: [number, number, number, number] = [0, 0, 0, 0];
  position: { x: number; y: number } = { x: 0, y: 0 };

  constructor({ width = 0, height = 0 } = {}) {
    this.width = width;
    this.height = height;
  }

  setIndex(index: number): void {
    this.index = index;
  }

  setKeyAndSchema(key: string, schema: Schema): void {
    this.key = key;
    this.schema = schema;
  }

  setWidth(width: number): void {
    this.width = width;
  }

  setHeight(height: number): void {
    this.height = height;
  }

  setPadding(padding: [number, number, number, number]): void {
    this.padding = padding;
  }

  setPosition(position: { x: number; y: number }): void {
    this.position = position;
  }

  insertChild(child: Node): void {
    const index = this.getChildCount();
    child.setIndex(index);
    this.children.splice(index, 0, child);
  }

  getChildCount(): number {
    return this.children.length;
  }

  getChild(index: number): Node {
    return this.children[index];
  }
}

function createPage(basePdf: BlankPdf) {
  const page = new Node({ ...basePdf });
  page.setPadding(basePdf.padding);
  return page;
}

function createNode(arg: {
  key: string;
  schema: Schema;
  position: { x: number; y: number };
  width: number;
  height: number;
}) {
  const { position, width, height, key, schema } = arg;
  const node = new Node({ width, height });
  node.setPosition(position);
  node.setKeyAndSchema(key, schema);
  return node;
}

function resortChildren(page: Node, orderMap: Map<string, number>): void {
  page.children = page.children
    .sort((a, b) => {
      const orderA = orderMap.get(a.key!);
      const orderB = orderMap.get(b.key!);
      if (orderA === undefined || orderB === undefined) {
        throw new Error('[@pdfme/common] order is not defined');
      }
      return orderA - orderB;
    })
    .map((child, index) => {
      child.setIndex(index);
      return child;
    });
}

async function createOnePage(
  arg: {
    basePdf: BlankPdf;
    schemaObj: Record<string, Schema>;
    orderMap: Map<string, number>;
  } & Omit<ModifyTemplateForDynamicTableArg, 'template'>
): Promise<Node> {
  const { basePdf, schemaObj, orderMap, input, options, _cache, getDynamicHeights } = arg;
  const page = createPage(basePdf);

  const schemaPositions: number[] = [];
  const sortedSchemaEntries = Object.entries(schemaObj).sort(
    (a, b) => a[1].position.y - b[1].position.y
  );
  const diffMap = new Map();
  for (const [key, schema] of sortedSchemaEntries) {
    const { position, width } = schema;

    const opt = { schema, basePdf, options, _cache };
    const value = (schema.readOnly ? schema.content : input?.[key]) || '';
    const heights = await getDynamicHeights(value, opt);

    const heightsSum = heights.reduce((acc, cur) => acc + cur, 0);
    const originalHeight = schema.height;
    if (heightsSum !== originalHeight) {
      diffMap.set(position.y + originalHeight, heightsSum - originalHeight);
    }
    heights.forEach((height, index) => {
      let y = schema.position.y + heights.reduce((acc, cur, i) => (i < index ? acc + cur : acc), 0);
      for (const [diffY, diff] of diffMap.entries()) {
        if (diffY <= schema.position.y) {
          y += diff;
        }
      }
      const node = createNode({ key, schema, position: { ...position, y }, width, height });

      schemaPositions.push(y + height + basePdf.padding[2]);
      page.insertChild(node);
    });
  }

  const pageHeight = Math.max(...schemaPositions, basePdf.height - basePdf.padding[2]);
  page.setHeight(pageHeight);

  resortChildren(page, orderMap);

  return page;
}

function breakIntoPages(arg: {
  longPage: Node;
  orderMap: Map<string, number>;
  basePdf: BlankPdf;
}): Node[] {
  const { longPage, orderMap, basePdf } = arg;
  const pages: Node[] = [createPage(basePdf)];
  const [paddingTop, , paddingBottom] = basePdf.padding;
  const yAdjustments: { page: number; value: number }[] = [];

  const getPageHeight = (pageIndex: number) =>
    basePdf.height - paddingBottom - (pageIndex > 0 ? paddingTop : 0);

  const calculateNewY = (y: number, pageIndex: number) => {
    const newY = y - pageIndex * (basePdf.height - paddingTop - paddingBottom);

    while (pages.length <= pageIndex) {
      if (!pages[pageIndex]) {
        pages.push(createPage(basePdf));
        yAdjustments.push({ page: pageIndex, value: (newY - paddingTop) * -1 });
      }
    }
    return newY + (yAdjustments.find((adj) => adj.page === pageIndex)?.value || 0);
  };

  const children = longPage.children.sort((a, b) => a.position.y - b.position.y);
  for (let i = 0; i < children.length; i++) {
    const { key, schema, position, height, width } = children[i];
    const { y, x } = position;

    let targetPageIndex = Math.floor(y / getPageHeight(pages.length - 1));
    let newY = calculateNewY(y, targetPageIndex);

    if (newY + height > basePdf.height - paddingBottom) {
      targetPageIndex++;
      newY = calculateNewY(y, targetPageIndex);
    }

    if (!key || !schema) throw new Error('[@pdfme/common] key or schema is undefined');

    const clonedElement = createNode({ key, schema, position: { x, y: newY }, width, height });
    pages[targetPageIndex].insertChild(clonedElement);
  }

  pages.forEach((page) => resortChildren(page, orderMap));

  return pages;
}

function createNewTemplate(pages: Node[], basePdf: BlankPdf): Template {
  const newTemplate: Template = {
    schemas: Array.from({ length: pages.length }, () => ({} as Record<string, Schema>)),
    basePdf: basePdf,
  };

  const keyToSchemas = new Map<string, Node[]>();

  cloneDeep(pages).forEach((page, pageIndex) => {
    page.children.forEach((child) => {
      const { key, schema } = child;
      if (!key || !schema) throw new Error('[@pdfme/common] key or schema is undefined');

      if (!keyToSchemas.has(key)) {
        keyToSchemas.set(key, []);
      }
      keyToSchemas.get(key)!.push(child);

      const sameKeySchemas = page.children.filter((c) => c.key === key);
      const start = keyToSchemas.get(key)!.length - sameKeySchemas.length;

      if (sameKeySchemas.length > 0) {
        if (!sameKeySchemas[0].schema) {
          throw new Error('[@pdfme/common] schema is undefined');
        }

        // Use the first schema to get the schema and position
        const schema = sameKeySchemas[0].schema;
        const height = sameKeySchemas.reduce((acc, cur) => acc + cur.height, 0);
        const position = sameKeySchemas[0].position;

        // Currently, __bodyRange exists for table schemas, but if we make it more abstract,
        // it could be used for other schemas as well to render schemas that have been split by page breaks, starting from the middle.
        schema.__bodyRange = {
          start: Math.max(start - 1, 0),
          end: start + sameKeySchemas.length - 1,
        };

        // Currently, this is used to determine whether to display the header when a table is split.
        schema.__isSplit = start > 0;

        newTemplate.schemas[pageIndex][key] = Object.assign({}, schema, { position, height });
      }
    });
  });

  return newTemplate;
}

export const getDynamicTemplate = async (
  arg: ModifyTemplateForDynamicTableArg
): Promise<Template> => {
  const { template } = arg;
  if (!isBlankPdf(template.basePdf)) {
    return template;
  }

  const basePdf = template.basePdf as BlankPdf;
  const pages: Node[] = [];

  for (const schemaObj of template.schemas) {
    const orderMap = new Map(Object.keys(schemaObj).map((key, index) => [key, index]));

    const longPage = await createOnePage({ basePdf, schemaObj, orderMap, ...arg });
    const brokenPages = breakIntoPages({ longPage, basePdf, orderMap });
    pages.push(...brokenPages);
  }

  return createNewTemplate(pages, template.basePdf);
};
