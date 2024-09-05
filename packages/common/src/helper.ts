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

const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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
  modifyTemplate: (arg: {
    template: Template;
    input: Record<string, string>;
    _cache: Map<any, any>;
    options: CommonOptions;
  }) => Promise<Template>;
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

function generateDebugHTML(pages: Node[]) {
  let html = '<div style="font-family: Arial, sans-serif; width: min-content; margin: 0 auto;">';
  let counter = 0;
  pages.forEach((page, pageIndex) => {
    const [pagePaddingTop, pagePaddingRight, pagePaddingBottom, pagePaddingLeft] = page.padding;

    html += `<div style="margin-bottom: 20px;">
      <h2>Page ${pageIndex + 1}</h2>
      <div style="position: relative; width: ${page.width}px; height: ${
      page.height
    }px; border: 1px solid #000; background: #f0f0f0;">
        <div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-top: ${pagePaddingTop}px solid rgba(0, 255, 0, 0.2); border-right: ${pagePaddingRight}px solid rgba(0, 0, 255, 0.2); border-bottom: ${pagePaddingBottom}px solid rgba(255, 255, 0, 0.2); border-left: ${pagePaddingLeft}px solid rgba(255, 0, 255, 0.2);"></div>`;

    page.children.forEach((child) => {
      const { x: left, y: top } = child.position;
      const { width, height } = child;

      html += `<div style="position: absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; background: rgba(255, 0, 0, 0.2); border: 1px solid #f00;">
        <div style="font-size: 10px; display: flex; align-items: center; justify-content: center; height: 100%;" title="Position: (${left}, ${top}), Size: ${width} x ${height}">
          ${counter++}
        </div>
      </div>`;
    });

    html += `</div></div>`;
  });

  html += '</div>';
  return html;
}

async function createOnePage(
  basePdf: BlankPdf,
  schemaObj: Record<string, Schema>,
  input: Record<string, string>,
  options: CommonOptions,
  _cache: Map<any, any>,
  getDynamicHeights: ModifyTemplateForDynamicTableArg['getDynamicHeights']
): Promise<Node> {
  const page = createPage(basePdf);

  const schemaEntries = Object.entries(schemaObj);
  const schemaPositions: number[] = [];
  const sortedSchemaEntries = schemaEntries.sort((a, b) => a[1].position.y - b[1].position.y);
  const diffMap = new Map();
  for (const [key, schema] of sortedSchemaEntries) {
    const { position, width } = schema;

    const opt = { schema, basePdf, options, _cache };
    const heights = await getDynamicHeights(input?.[key] || '', opt);

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
  return page;
}

function breakIntoPages(longPage: Node, basePdf: BlankPdf): Node[] {
  const pages = [createPage(basePdf)];
  const [paddingTop, paddingBottom] = [basePdf.padding[0], basePdf.padding[2]];

  const yAdjustment = { page: -1, value: 0 };
  for (let i = 0; i < longPage.getChildCount(); i++) {
    const { key, schema, position, height, width } = longPage.getChild(i);
    const { y, x } = position;
    const targetPageIndex = Math.floor(
      (y + height) / (basePdf.height - paddingBottom - (pages.length > 1 ? paddingTop : 0))
    );
    let newY = y - targetPageIndex * (basePdf.height - paddingTop - paddingBottom);
    if (!pages[targetPageIndex]) {
      pages.push(createPage(basePdf));
      yAdjustment.page = targetPageIndex;
      yAdjustment.value = (newY - paddingTop) * -1;
    }

    if (yAdjustment.page === targetPageIndex) {
      newY += yAdjustment.value;
    }

    if (!key || !schema) throw new Error('key or schema is undefined');

    const clonedElement = createNode({
      key: key,
      schema: schema,
      position: { x, y: newY },
      width,
      height,
    });

    pages[targetPageIndex].insertChild(clonedElement);
  }

  return pages;
}

export const getDynamicTemplate = async (
  arg: ModifyTemplateForDynamicTableArg
): Promise<Template> => {
  const { template, modifyTemplate, getDynamicHeights, input, options, _cache } = arg;
  if (!isBlankPdf(template.basePdf)) {
    return template;
  }

  // ---------------------------------------------

  const basePdf = template.basePdf as BlankPdf;
  const pages: Node[] = [];

  for (const schemaObj of template.schemas) {
    const longPage = await createOnePage(
      basePdf,
      schemaObj,
      input,
      options,
      _cache,
      getDynamicHeights
    );
    const brokenPages = breakIntoPages(longPage, basePdf);
    pages.push(...brokenPages);
  }

  document.getElementById('debug')!.innerHTML = generateDebugHTML(pages);

  const newTemplate: Template = {
    schemas: Array.from({ length: pages.length }, () => ({} as Record<string, Schema>)),
    basePdf: template.basePdf,
  };
  const newSchemas = newTemplate.schemas;
  cloneDeep(pages).forEach((page, pageIndex) => {
    page.children.forEach((child) => {
      const { key, schema } = child;
      if (!key || !schema) throw new Error('key or schema is undefined');

      const sameKeySchemas = page.children.filter((c) => c.key === key);
      const prevPage: Node | undefined = pages[pageIndex - 1];
      const prevPageSameKeySchemas = prevPage ? prevPage.children.filter((c) => c.key === key) : [];
      if (sameKeySchemas.length === 1) {
        // TODO ここから
        // 次のページにまたがっているテーブル、同じページに同じキーがないのでこっちに入ってしまう
        // __bodyRangeもそうだけど、ヘッダーが入るという問題がある
        schema.__bodyRange = { start: 0, end: 1 }; // 違うかも
        schema.showHead = prevPageSameKeySchemas.length === 0;
        newSchemas[pageIndex][key] = Object.assign(schema, {
          position: { ...child.position },
          height: child.height,
        });
      } else if (sameKeySchemas.length > 1) {
        sameKeySchemas.forEach((s, i) => {
          if (!s.schema) throw new Error('schema is undefined');
          if (i === 0) {
            const start = prevPageSameKeySchemas.length;
            s.schema.showHead = start === 0;
            s.schema.__bodyRange = {
              start,
              end: start + sameKeySchemas.length - 1, // headが入っているので-1
            };
            newSchemas[pageIndex][key] = Object.assign(s.schema, { position: { ...s.position } });
          }
        });
      }
    });
  });
  console.log('0: orders.__bodyRange', newTemplate?.schemas?.[0]?.orders?.__bodyRange);
  console.log('1: orders.__bodyRange', newTemplate?.schemas?.[1]?.orders?.__bodyRange);
  console.log('newTemplate', newTemplate);
  return newTemplate;
};
