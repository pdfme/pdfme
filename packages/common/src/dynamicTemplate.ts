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
  dynamicHeights: number[];
}

/** Calculate the content height of a page (drawable area excluding padding) */
const getContentHeight = (basePdf: BlankPdf): number =>
  basePdf.height - basePdf.padding[0] - basePdf.padding[2];

/** Get the input value for a schema */
const getSchemaValue = (schema: Schema, input: Record<string, string>): string =>
  (schema.readOnly ? schema.content : input?.[schema.name]) || '';

/**
 * Normalize schemas within a single page into layout items.
 * Returns items sorted by Y coordinate with their order preserved.
 */
function normalizePageSchemas(
  pageSchemas: Schema[],
  paddingTop: number,
): { items: LayoutItem[]; orderMap: Map<string, number> } {
  const items: LayoutItem[] = [];
  const orderMap = new Map<string, number>();

  pageSchemas.forEach((schema, index) => {
    const localY = schema.position.y - paddingTop;
    items.push({
      schema: cloneDeep(schema),
      baseY: localY,
      height: schema.height,
      dynamicHeights: [schema.height], // Will be updated later
    });
    orderMap.set(schema.name, index);
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
 * Process a single template page that has dynamic content.
 * Uses the same layout algorithm as the original implementation,
 * but scoped to a single page's schemas.
 */
function processDynamicPage(
  items: LayoutItem[],
  orderMap: Map<string, number>,
  contentHeight: number,
  paddingTop: number,
): Schema[][] {
  const pages: Schema[][] = [];
  let totalYOffset = 0;

  for (const item of items) {
    const currentGlobalStartY = item.baseY + totalYOffset;

    const actualGlobalEndY = placeRowsOnPages(
      item.schema,
      item.dynamicHeights,
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

  return pages;
}

/**
 * Process a template containing tables with dynamic heights
 * and generate a new template with proper page breaks.
 *
 * Processing is done page-by-page:
 * - Pages with height changes are processed with full layout calculations
 * - Pages without height changes are copied as-is (no offset propagation between pages)
 *
 * This reduces computation cost by:
 * 1. Limiting layout calculations to pages that need them
 * 2. Avoiding cross-page offset propagation for static pages
 */
export const getDynamicTemplate = async (
  arg: ModifyTemplateForDynamicTableArg,
): Promise<Template> => {
  const { template, input, options, _cache, getDynamicHeights } = arg;
  const basePdf = template.basePdf;

  if (!isBlankPdf(basePdf)) {
    return template;
  }

  const contentHeight = getContentHeight(basePdf);
  const paddingTop = basePdf.padding[0];
  const resultPages: Schema[][] = [];
  const PARALLEL_LIMIT = 10;

  // Process each template page independently
  for (let pageIndex = 0; pageIndex < template.schemas.length; pageIndex++) {
    const pageSchemas = template.schemas[pageIndex];

    // Normalize this page's schemas
    const { items, orderMap } = normalizePageSchemas(pageSchemas, paddingTop);

    // Calculate dynamic heights for this page's schemas with concurrency limit
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
      // Update items with calculated heights
      for (let j = 0; j < chunkResults.length; j++) {
        items[i + j].dynamicHeights = chunkResults[j];
      }
    }

    // Process all pages independently (no cross-page offset propagation)
    const processedPages = processDynamicPage(items, orderMap, contentHeight, paddingTop);
    resultPages.push(...processedPages);
  }

  removeTrailingEmptyPages(resultPages);

  // Check if anything changed - return original template if not
  if (resultPages.length === template.schemas.length) {
    let unchanged = true;
    for (let i = 0; i < resultPages.length && unchanged; i++) {
      if (resultPages[i].length !== template.schemas[i].length) {
        unchanged = false;
        break;
      }
      for (let j = 0; j < resultPages[i].length && unchanged; j++) {
        const orig = template.schemas[i][j];
        const result = resultPages[i][j];
        if (
          Math.abs(orig.height - result.height) > EPSILON ||
          Math.abs(orig.position.y - result.position.y) > EPSILON
        ) {
          unchanged = false;
        }
      }
    }
    if (unchanged) {
      return template;
    }
  }

  return { basePdf, schemas: resultPages };
};
