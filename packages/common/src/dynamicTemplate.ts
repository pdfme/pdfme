import { Schema, Template, BasePdf, BlankPdf, CommonOptions } from './types.js';
import { cloneDeep, isBlankPdf } from './helper.js';

interface ModifyTemplateForDynamicTableArg {
  template: Template;
  input: Record<string, string>;
  _cache: Map<string | number, unknown>;
  options: CommonOptions;
  getDynamicHeights: (
    value: string,
    args: {
      schema: Schema;
      basePdf: BasePdf;
      options: CommonOptions;
      _cache: Map<string | number, unknown>;
    },
  ) => Promise<number[]>;
}

class LayoutNode {
  index = 0;

  schema?: Schema;

  children: LayoutNode[] = [];

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

  setSchema(schema: Schema): void {
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

  insertChild(child: LayoutNode): void {
    const index = this.getChildCount();
    child.setIndex(index);
    this.children.splice(index, 0, child);
  }

  getChildCount(): number {
    return this.children.length;
  }

  getChild(index: number): LayoutNode {
    return this.children[index];
  }
}

function createPage(basePdf: BlankPdf) {
  const page = new LayoutNode({ ...basePdf });
  page.setPadding(basePdf.padding);
  return page;
}

function createNode(arg: {
  schema: Schema;
  position: { x: number; y: number };
  width: number;
  height: number;
}) {
  const { position, width, height, schema } = arg;
  const node = new LayoutNode({ width, height });
  node.setPosition(position);
  node.setSchema(schema);
  return node;
}

function resortChildren(page: LayoutNode, orderMap: Map<string, number>): void {
  page.children = page.children
    .sort((a, b) => {
      const orderA = orderMap.get(a.schema?.name ?? '');
      const orderB = orderMap.get(b.schema?.name ?? '');
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
    schemaPage: Schema[];
    orderMap: Map<string, number>;
  } & Omit<ModifyTemplateForDynamicTableArg, 'template'>,
): Promise<LayoutNode> {
  const { basePdf, schemaPage, orderMap, input, options, _cache, getDynamicHeights } = arg;
  const page = createPage(basePdf);

  const schemaPositions: number[] = [];
  const sortedSchemaEntries = cloneDeep(schemaPage).sort((a, b) => a.position.y - b.position.y);
  const diffMap = new Map();
  for (const schema of sortedSchemaEntries) {
    const { position, width } = schema;

    const opt = { schema, basePdf, options, _cache };
    const value = (schema.readOnly ? schema.content : input?.[schema.name]) || '';
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
      const node = createNode({ schema, position: { ...position, y }, width, height });

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
  longPage: LayoutNode;
  orderMap: Map<string, number>;
  basePdf: BlankPdf;
}): LayoutNode[] {
  const { longPage, orderMap, basePdf } = arg;
  const pages: LayoutNode[] = [createPage(basePdf)];
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

  const calculateTargetPageIndex = (y: number) => {
    let accumulatedHeight = 0;
    let pageIndex = 0;

    while (true) {
      const currentPageHeight = getPageHeight(pageIndex);

      if (y <= accumulatedHeight + currentPageHeight) {
        return pageIndex;
      }

      accumulatedHeight += currentPageHeight;
      pageIndex++;
    }
  };

  const children = longPage.children.sort((a, b) => a.position.y - b.position.y);
  for (let i = 0; i < children.length; i++) {
    const { schema, position, height, width } = children[i];
    const { y, x } = position;

    let targetPageIndex = calculateTargetPageIndex(y);
    let newY = calculateNewY(y, targetPageIndex);

    if (newY + height > basePdf.height - paddingBottom) {
      targetPageIndex++;
      newY = calculateNewY(y, targetPageIndex);
    }

    if (!schema) throw new Error('[@pdfme/common] schema is undefined');

    const clonedElement = createNode({ schema, position: { x, y: newY }, width, height });
    pages[targetPageIndex].insertChild(clonedElement);
  }

  pages.forEach((page) => resortChildren(page, orderMap));

  return pages;
}

function createNewTemplate(pages: LayoutNode[], basePdf: BlankPdf): Template {
  const newTemplate: Template = {
    schemas: Array.from({ length: pages.length }, () => [] as Schema[]),
    basePdf: basePdf,
  };

  const nameToSchemas = new Map<string, LayoutNode[]>();

  cloneDeep(pages).forEach((page, pageIndex) => {
    page.children.forEach((child) => {
      const { schema } = child;
      if (!schema) throw new Error('[@pdfme/common] schema is undefined');

      const name = schema.name;
      if (!nameToSchemas.has(name)) {
        nameToSchemas.set(name, []);
      }
      nameToSchemas.get(name)!.push(child);

      const sameNameSchemas = page.children.filter((c) => c.schema?.name === name);
      const start = nameToSchemas.get(name)!.length - sameNameSchemas.length;

      if (sameNameSchemas.length > 0) {
        if (!sameNameSchemas[0].schema) {
          throw new Error('[@pdfme/common] schema is undefined');
        }

        // Use the first schema to get the schema and position
        const schema = sameNameSchemas[0].schema;
        const height = sameNameSchemas.reduce((acc, cur) => acc + cur.height, 0);
        const position = sameNameSchemas[0].position;

        // Currently, __bodyRange exists for table schemas, but if we make it more abstract,
        // it could be used for other schemas as well to render schemas that have been split by page breaks, starting from the middle.
        schema.__bodyRange = {
          start: Math.max(start - 1, 0),
          end: start + sameNameSchemas.length - 1,
        };

        // Currently, this is used to determine whether to display the header when a table is split.
        schema.__isSplit = start > 0;

        const newSchema = Object.assign({}, schema, { position, height });
        const index = newTemplate.schemas[pageIndex].findIndex((s) => s.name === name);
        if (index !== -1) {
          newTemplate.schemas[pageIndex][index] = newSchema;
        } else {
          newTemplate.schemas[pageIndex].push(newSchema);
        }
      }
    });
  });

  return newTemplate;
}

export const getDynamicTemplate = async (
  arg: ModifyTemplateForDynamicTableArg,
): Promise<Template> => {
  const { template } = arg;
  if (!isBlankPdf(template.basePdf)) {
    return template;
  }

  const basePdf = template.basePdf;
  const pages: LayoutNode[] = [];

  for (const schemaPage of template.schemas) {
    const orderMap = new Map(schemaPage.map((schema, index) => [schema.name, index]));
    const longPage = await createOnePage({ basePdf, schemaPage, orderMap, ...arg });
    const brokenPages = breakIntoPages({ longPage, basePdf, orderMap });
    pages.push(...brokenPages);
  }

  return createNewTemplate(pages, template.basePdf);
};
