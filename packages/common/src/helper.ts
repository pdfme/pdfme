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

type EdgeName = 'top' | 'right' | 'bottom' | 'left';
type Position = { x: number; y: number };

interface NodeStyle {
  width: number;
  height: number;
  padding: [number, number, number, number]; // [top, right, bottom, left]
  position: Position;
}

class Node {
  private children: Node[] = [];
  style: NodeStyle = {
    width: 0,
    height: 0,
    padding: [0, 0, 0, 0],
    position: { x: 0, y: 0 },
  };

  setWidth(width: number): void {
    this.style.width = width;
  }

  setHeight(height: number): void {
    this.style.height = height;
  }

  setPadding(edge: EdgeName, value: number): void {
    const edgeMap: Record<EdgeName, number> = { top: 0, right: 1, bottom: 2, left: 3 };
    this.style.padding[edgeMap[edge]] = value;
  }

  setPosition(edge: 'left' | 'top', value: number): void {
    if (edge === 'left') this.style.position.x = value;
    if (edge === 'top') this.style.position.y = value;
  }

  insertChild(child: Node, index: number): void {
    this.children.splice(index, 0, child);
  }

  getChildCount(): number {
    return this.children.length;
  }

  getChild(index: number): Node {
    return this.children[index];
  }

  getComputedWidth(): number {
    return this.style.width;
  }

  getComputedHeight(): number {
    return this.style.height;
  }

  getComputedLeft(): number {
    return this.style.position.x;
  }

  getComputedTop(): number {
    return this.style.position.y;
  }

  getComputedPadding(edge: EdgeName): number {
    const edgeMap: Record<EdgeName, number> = { top: 0, right: 1, bottom: 2, left: 3 };
    return this.style.padding[edgeMap[edge]];
  }
}

function generateDebugHTML(pages: Node[]) {
  let html = '<div style="font-family: Arial, sans-serif; width: min-content; margin: 0 auto;">';

  pages.forEach((page, pageIndex) => {
    const [pagePaddingTop, pagePaddingRight, pagePaddingBottom, pagePaddingLeft] =
      page.style.padding;

    html += `<div style="margin-bottom: 20px;">
      <h2>Page ${pageIndex + 1}</h2>
      <div style="position: relative; width: ${page.style.width}px; height: ${
      page.style.height
    }px; border: 1px solid #000; background: #f0f0f0;">
        <div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-top: ${pagePaddingTop}px solid rgba(0, 255, 0, 0.2); border-right: ${pagePaddingRight}px solid rgba(0, 0, 255, 0.2); border-bottom: ${pagePaddingBottom}px solid rgba(255, 255, 0, 0.2); border-left: ${pagePaddingLeft}px solid rgba(255, 0, 255, 0.2);"></div>`;

    page.children.forEach((child, i) => {
      const { x: left, y: top } = child.style.position;
      const { width, height } = child.style;

      html += `<div style="position: absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; background: rgba(255, 0, 0, 0.2); border: 1px solid #f00;">
        <div style="font-size: 10px; display: flex; align-items: center; justify-content: center; height: 100%;" title="Position: (${left}, ${top}), Size: ${width} x ${height}">
          ${i + 1}
        </div>
      </div>`;
    });

    html += `</div></div>`;
  });

  html += '</div>';
  return html;
}

function createPage(basePdf: BlankPdf) {
  const page = new Node();
  page.setPadding('top', basePdf.padding[0]);
  page.setPadding('right', basePdf.padding[1]);
  page.setPadding('bottom', basePdf.padding[2]);
  page.setPadding('left', basePdf.padding[3]);
  page.setWidth(basePdf.width);
  page.setHeight(basePdf.height);
  return page;
}

function createNode(arg: { position: { x: number; y: number }; width: number; height: number }) {
  const { position, width, height } = arg;
  const { x, y } = position;
  const node = new Node();
  node.setWidth(width);
  node.setHeight(height);
  node.setPosition('left', x);
  node.setPosition('top', y);
  return node;
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
      const node = new Node();
      node.setWidth(width);
      node.setHeight(height);

      let newY =
        schema.position.y + heights.reduce((acc, cur, i) => (i < index ? acc + cur : acc), 0);
      for (const [diffY, diff] of diffMap.entries()) {
        if (diffY <= schema.position.y) {
          newY += diff;
        }
      }

      node.setPosition('left', position.x);
      node.setPosition('top', newY);
      schemaPositions.push(newY + height + basePdf.padding[2]);
      page.insertChild(node, page.getChildCount());
    });
  }

  const pageHeight = Math.max(...schemaPositions, basePdf.height - basePdf.padding[2]);
  page.setHeight(pageHeight);
  return page;
}

function breakIntoPages(longPage: Node, basePdf: BlankPdf): Node[] {
  const pages = [];
  const [paddingTop, paddingBottom] = [basePdf.padding[0], basePdf.padding[2]];
  const effectivePageHeight = basePdf.height - paddingTop - paddingBottom;

  const totalHeight = longPage.style.height - paddingTop - paddingBottom;
  const numberOfPages = Math.ceil(totalHeight / effectivePageHeight);

  for (let i = 0; i < numberOfPages; i++) {
    pages.push(createPage(basePdf));
  }

  for (let i = 0; i < longPage.getChildCount(); i++) {
    const element = longPage.getChild(i);
    const top = element.style.position.y;
    const height = element.style.height;
    const width = element.style.width;

    const startPage = Math.floor(top / effectivePageHeight);
    const y = top - startPage * effectivePageHeight + (startPage > 0 ? paddingTop : 0);
    const x = element.style.position.x;

    const clonedElement = createNode({ position: { x, y }, width, height });

    if (startPage >= pages.length) {
      pages.push(createPage(basePdf));
    }

    pages[startPage].insertChild(clonedElement, pages[startPage].getChildCount());
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
    const lognPage = await createOnePage(
      basePdf,
      schemaObj,
      input,
      options,
      _cache,
      getDynamicHeights
    );
    const brokenPages = breakIntoPages(lognPage, basePdf);
    pages.push(...brokenPages);
  }

  document.getElementById('debug')!.innerHTML = generateDebugHTML(pages);

  // TODO Yogaのデータからテンプレートデータのschemaへ復元する処理
  // ページブレイクされたテーブルに関しては複数のスキーマに分割する必要がある
  // Yogaはレイアウト情報は持っているが、スキーマの情報は持っていないため、どうにかする必要がある。
  // しかし、ページブレイクの処理にバグがあるので現段階でゴニョゴニョするよりもまずはバグを修正するべき。

  // ---------------------------------------------
  // 下記のコードは将来的にリプレースされるので無視してください。
  const modifiedTemplate = await modifyTemplate(arg);

  const _diffMap = await calculateDiffMap({ ...arg, template: modifiedTemplate });

  return normalizePositionsAndPageBreak(modifiedTemplate, _diffMap);
};

export const calculateDiffMap = async (arg: ModifyTemplateForDynamicTableArg) => {
  const { template, input, _cache, options, getDynamicHeights } = arg;
  const basePdf = template.basePdf;
  const tmpDiffMap = new Map<number, number>();
  if (!isBlankPdf(basePdf)) {
    return tmpDiffMap;
  }
  const pageHeight = basePdf.height;
  let pageIndex = 0;
  for (const schemaObj of template.schemas) {
    for (const [key, schema] of Object.entries(schemaObj)) {
      const dynamicHeights = await getDynamicHeights(input?.[key] || '', {
        schema,
        basePdf,
        options,
        _cache,
      });
      const dynamicHeight = dynamicHeights.reduce((acc, cur) => acc + cur, 0);
      if (schema.height !== dynamicHeight) {
        tmpDiffMap.set(
          schema.position.y + schema.height + pageHeight * pageIndex,
          dynamicHeight - schema.height
        );
      }
    }
    pageIndex++;
  }

  const diffMap = new Map<number, number>();
  const keys = Array.from(tmpDiffMap.keys()).sort((a, b) => a - b);
  let additionalHeight = 0;

  for (const key of keys) {
    const value = tmpDiffMap.get(key) as number;
    const newValue = value + additionalHeight;
    diffMap.set(key + additionalHeight, newValue);
    additionalHeight += newValue;
  }

  return diffMap;
};

export const normalizePositionsAndPageBreak = (
  template: Template,
  diffMap: Map<number, number>
): Template => {
  if (!isBlankPdf(template.basePdf) || diffMap.size === 0) {
    return template;
  }

  const returnTemplate: Template = { schemas: [{}], basePdf: template.basePdf };
  const pages = returnTemplate.schemas;
  const pageHeight = template.basePdf.height;
  const paddingTop = template.basePdf.padding[0];
  const paddingBottom = template.basePdf.padding[2];

  for (let i = 0; i < template.schemas.length; i += 1) {
    const schemaObj = template.schemas[i];
    if (!pages[i]) pages[i] = {};

    for (const [key, schema] of Object.entries(schemaObj)) {
      const { position, height } = schema;
      let newY = position.y;
      let pageCursor = i;

      for (const [diffKey, diffValue] of diffMap) {
        if (newY > diffKey) {
          newY += diffValue;
        }
      }

      while (newY + height >= pageHeight - paddingBottom) {
        newY = newY + paddingTop - (pageHeight - paddingBottom) + paddingTop;
        pageCursor++;
      }

      if (!pages[pageCursor]) pages[pageCursor] = {};
      pages[pageCursor][key] = { ...schema, position: { ...position, y: newY } };
    }
  }

  return returnTemplate;
};
