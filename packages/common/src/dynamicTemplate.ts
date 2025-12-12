import { Schema, Template, BasePdf, BlankPdf, CommonOptions } from './types.js';
import { cloneDeep, isBlankPdf } from './helper.js';

/** Floating point tolerance for comparisons */
const EPSILON = 0.01;

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

interface LayoutItem {
  schema: Schema;
  baseY: number;
  height: number;
}

/** Calculate the content height of a page (drawable area excluding padding) */
const getContentHeight = (basePdf: BlankPdf): number =>
  basePdf.height - basePdf.padding[0] - basePdf.padding[2];

/** Get the input value for a schema */
const getSchemaValue = (schema: Schema, input: Record<string, string>): string =>
  (schema.readOnly ? schema.content : input?.[schema.name]) || '';

/**
 * Flatten all schemas into a continuous coordinate system.
 * Treats multi-page templates as a single long coordinate space.
 */
function normalizeSchemas(
  templateSchemas: Schema[][],
  basePdf: BlankPdf,
): { items: LayoutItem[]; orderMap: Map<string, number> } {
  const items: LayoutItem[] = [];
  const orderMap = new Map<string, number>();
  const contentHeight = getContentHeight(basePdf);
  const paddingTop = basePdf.padding[0];
  let globalOrder = 0;

  templateSchemas.forEach((pageSchemas, pageIndex) => {
    const pageYOffset = pageIndex * contentHeight;

    pageSchemas.forEach((schema) => {
      const localY = schema.position.y - paddingTop;
      items.push({
        schema: cloneDeep(schema),
        baseY: pageYOffset + localY,
        height: schema.height,
      });

      if (!orderMap.has(schema.name)) {
        orderMap.set(schema.name, globalOrder++);
      }
    });
  });

  // Sort by Y coordinate (preserve original order for same position)
  items.sort((a, b) => {
    if (Math.abs(a.baseY - b.baseY) > EPSILON) {
      return a.baseY - b.baseY;
    }
    return (orderMap.get(a.schema.name) ?? 0) - (orderMap.get(b.schema.name) ?? 0);
  });

  return { items, orderMap };
}

/**
 * Place rows on pages, splitting across pages as needed.
 * @returns The final global Y coordinate after placement
 */
function placeRowsOnPages(
  schema: Schema,
  dynamicHeights: number[],
  startGlobalY: number,
  contentHeight: number,
  paddingTop: number,
  pages: Schema[][],
): number {
  let currentRowIndex = 0;
  let currentPageIndex = Math.floor(startGlobalY / contentHeight);
  let currentYInPage = startGlobalY % contentHeight;

  if (currentYInPage < 0) currentYInPage = 0;

  let actualGlobalEndY = 0;
  const isSplittable = dynamicHeights.length > 1;

  while (currentRowIndex < dynamicHeights.length) {
    // Ensure page exists
    while (pages.length <= currentPageIndex) pages.push([]);

    const spaceLeft = contentHeight - currentYInPage;
    const rowHeight = dynamicHeights[currentRowIndex];

    // If row doesn't fit, move to next page
    if (rowHeight > spaceLeft + EPSILON) {
      const isAtPageStart = Math.abs(spaceLeft - contentHeight) <= EPSILON;

      if (!isAtPageStart) {
        currentPageIndex++;
        currentYInPage = 0;
        continue;
      }
      // Force placement for oversized rows that don't fit even on a fresh page
    }

    // Pack as many rows as possible on this page
    let chunkHeight = 0;
    const startRowIndex = currentRowIndex;

    while (currentRowIndex < dynamicHeights.length) {
      const h = dynamicHeights[currentRowIndex];
      if (currentYInPage + chunkHeight + h <= contentHeight + EPSILON) {
        chunkHeight += h;
        currentRowIndex++;
      } else {
        break;
      }
    }

    // Don't leave header alone on a page without any data rows
    // If only header fits and there are data rows remaining, move everything to next page
    // BUT: if already at page top, don't move (prevents infinite loop when data row is too large)
    const isAtPageTop = currentYInPage <= EPSILON;
    if (
      isSplittable &&
      startRowIndex === 0 &&
      currentRowIndex === 1 &&
      dynamicHeights.length > 1 &&
      !isAtPageTop
    ) {
      currentRowIndex = 0;
      currentPageIndex++;
      currentYInPage = 0;
      continue;
    }

    // Force at least one row to prevent infinite loop
    if (currentRowIndex === startRowIndex) {
      chunkHeight += dynamicHeights[currentRowIndex];
      currentRowIndex++;
    }

    // Create schema for this chunk
    const newSchema: Schema = {
      ...schema,
      height: chunkHeight,
      position: { ...schema.position, y: currentYInPage + paddingTop },
    };

    // Set bodyRange for splittable elements
    // dynamicHeights[0] = header row, dynamicHeights[1] = body[0]
    // So subtract 1 to convert to body index
    if (isSplittable) {
      newSchema.__bodyRange = {
        start: startRowIndex === 0 ? 0 : startRowIndex - 1,
        end: currentRowIndex - 1,
      };
      newSchema.__isSplit = startRowIndex > 0;
    }

    pages[currentPageIndex].push(newSchema);

    // Update position
    currentYInPage += chunkHeight;

    if (currentYInPage >= contentHeight - EPSILON) {
      currentPageIndex++;
      currentYInPage = 0;
    }

    actualGlobalEndY = currentPageIndex * contentHeight + currentYInPage;
  }

  return actualGlobalEndY;
}

/** Sort elements within each page by their original order */
function sortPagesByOrder(pages: Schema[][], orderMap: Map<string, number>): void {
  pages.forEach((page) => {
    page.sort((a, b) => (orderMap.get(a.name) ?? 0) - (orderMap.get(b.name) ?? 0));
  });
}

/** Remove trailing empty pages */
function removeTrailingEmptyPages(pages: Schema[][]): void {
  while (pages.length > 1 && pages[pages.length - 1].length === 0) {
    pages.pop();
  }
}

/**
 * Process a template containing tables with dynamic heights
 * and generate a new template with proper page breaks.
 */
export const getDynamicTemplate = async (
  arg: ModifyTemplateForDynamicTableArg,
): Promise<Template> => {
  const { template, input, options, _cache, getDynamicHeights } = arg;
  const basePdf = template.basePdf;

  if (!isBlankPdf(basePdf)) {
    return template;
  }

  // 1. Flatten schemas and establish ordering
  const { items, orderMap } = normalizeSchemas(template.schemas, basePdf);

  // 2. Calculate all dynamic heights in parallel with concurrency limit
  // Limits parallel execution to prevent memory issues with large templates
  const PARALLEL_LIMIT = 10;
  const dynamicHeightsList: number[][] = [];

  for (let i = 0; i < items.length; i += PARALLEL_LIMIT) {
    const chunk = items.slice(i, i + PARALLEL_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map((item) => {
        const value = getSchemaValue(item.schema, input);
        return getDynamicHeights(value, {
          schema: item.schema,
          basePdf,
          options,
          _cache,
        }).then((heights) => (heights.length === 0 ? [0] : heights));
      }),
    );
    dynamicHeightsList.push(...chunkResults);
  }

  // 3. Check if any heights changed (using pre-calculated results)
  let hasChange = false;
  for (let i = 0; i < items.length; i++) {
    const totalHeight = dynamicHeightsList[i].reduce((a, b) => a + b, 0);
    if (Math.abs(totalHeight - items[i].height) > EPSILON) {
      hasChange = true;
      break;
    }
  }

  // Return original template if no height changes
  if (!hasChange) {
    return template;
  }

  // 4. Layout calculation (pure numeric computation, no async)
  const contentHeight = getContentHeight(basePdf);
  const paddingTop = basePdf.padding[0];
  const pages: Schema[][] = [];
  let totalYOffset = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dynamicHeights = dynamicHeightsList[i];

    const currentGlobalStartY = item.baseY + totalYOffset;

    const actualGlobalEndY = placeRowsOnPages(
      item.schema,
      dynamicHeights,
      currentGlobalStartY,
      contentHeight,
      paddingTop,
      pages,
    );

    // Update offset: difference between actual and original end position
    const originalGlobalEndY = item.baseY + item.height;
    totalYOffset = actualGlobalEndY - originalGlobalEndY;
  }

  sortPagesByOrder(pages, orderMap);
  removeTrailingEmptyPages(pages);

  return { basePdf, schemas: pages };
};
