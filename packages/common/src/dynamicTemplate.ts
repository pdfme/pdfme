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

  // Calculate reserved space by staticSchema elements at the bottom of the page
  const getReservedBottomSpace = () => {
    if (!('staticSchema' in basePdf) || !basePdf.staticSchema) {
      return 0;
    }
    
    let minStaticY = basePdf.height;
    for (const staticSchema of basePdf.staticSchema) {
      const staticY = staticSchema.position.y;
      if (staticY < minStaticY) {
        minStaticY = staticY;
      }
    }
    
    // Reserve space from minStaticY to bottom of page, excluding bottom padding
    // This ensures content doesn't overlap with staticSchema elements
    const reservedSpace = basePdf.height - minStaticY;
    
    return reservedSpace;
  };

  const reservedBottomSpace = getReservedBottomSpace();
  
  // Get maximum Y position before staticSchema starts (if any)
  const getMaxContentY = () => {
    if (reservedBottomSpace > 0) {
      return basePdf.height - reservedBottomSpace;
    }
    return basePdf.height - paddingBottom;
  };

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
  
  // Track tables with repeatHead to identify which elements need layout adjustments
  const tablesWithRepeatHead = new Map<string, { firstPage: number; headerHeight: number }>();
  const tableRowsOnPages = new Map<string, Map<number, number>>(); // table name -> (page -> first row index)
  
  // First pass: identify tables and their pages
  for (let i = 0; i < children.length; i++) {
    const { schema, position, height } = children[i];
    const { y } = position;

    let targetPageIndex = Math.floor(y / getPageHeight(pages.length - 1));
    let newY = calculateNewY(y, targetPageIndex);

    // Check for normal page overflow first
    if (newY + height > getPageHeight(targetPageIndex)) {
      targetPageIndex++;
      newY = calculateNewY(y, targetPageIndex);
    }
    
    // Additional check for staticSchema collision
    const maxContentY = getMaxContentY();
    if (reservedBottomSpace > 0 && newY + height > maxContentY) {
      targetPageIndex++;
      newY = calculateNewY(y, targetPageIndex);
    }
    
    if (schema && schema.type === 'table' && 'repeatHead' in schema && schema.repeatHead === true && 'showHead' in schema && schema.showHead !== false) {
      const tableName = schema.name;
      
      if (!tablesWithRepeatHead.has(tableName)) {
        const headerHeight = 20;
        tablesWithRepeatHead.set(tableName, {
          firstPage: targetPageIndex,
          headerHeight: headerHeight
        });
        tableRowsOnPages.set(tableName, new Map());
      }
      
      const tablePageMap = tableRowsOnPages.get(tableName)!;
      if (!tablePageMap.has(targetPageIndex)) {
        tablePageMap.set(targetPageIndex, i);
      }
    }
  }
  
  // Second pass: place elements with header adjustments for subsequent pages
  for (let i = 0; i < children.length; i++) {
    const { schema, position, height, width } = children[i];
    const { y, x } = position;

    let targetPageIndex = Math.floor(y / getPageHeight(pages.length - 1));
    let newY = calculateNewY(y, targetPageIndex);

    // Check for normal page overflow first
    if (newY + height > getPageHeight(targetPageIndex)) {
      targetPageIndex++;
      newY = calculateNewY(y, targetPageIndex);
    }
    
    // Additional check for staticSchema collision
    const maxContentY = getMaxContentY();
    if (reservedBottomSpace > 0 && newY + height > maxContentY) {
      targetPageIndex++;
      newY = calculateNewY(y, targetPageIndex);
    }

    if (!schema) throw new Error('[@pdfme/common] schema is undefined');
    
    let headerAdjustment = 0;
    const appliedAdjustments = new Set<string>();
    for (const [tableName, tableInfo] of tablesWithRepeatHead.entries()) {
      const tablePageMap = tableRowsOnPages.get(tableName)!;
      const firstRowOnThisPage = tablePageMap.get(targetPageIndex);
      
      if (firstRowOnThisPage !== undefined && targetPageIndex > tableInfo.firstPage) {
        if (i > firstRowOnThisPage && !appliedAdjustments.has(tableName)) {
          headerAdjustment += tableInfo.headerHeight;
          appliedAdjustments.add(tableName);
        }
      }
    }
    
    newY += headerAdjustment;
    
    // Mark table as split if it's not on its first page
    if (schema.type === 'table') {
      const tableName = schema.name;
      const tableInfo = tablesWithRepeatHead.get(tableName);
      if (tableInfo && targetPageIndex > tableInfo.firstPage) {
        schema.__isSplit = true;
      }
    }

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
