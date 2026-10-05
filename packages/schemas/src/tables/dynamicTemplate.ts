import {
  Schema,
  BasePdf,
  BlankPdf,
  CommonOptions,
  DynamicLayoutArgs,
  DynamicLayoutResult,
  isBlankPdf,
} from '@pdfme/common';
import { createSingleTable } from './tableHelper.js';
import { getBodyWithRange, getBody } from './helper.js';
import { TableSchema } from './types.js';
import { createTableBodySplitRange, getTableBodyRange } from '../splitRange.js';

export const getDynamicHeightsForTable = async (
  value: string,
  args: {
    schema: Schema;
    basePdf: BasePdf;
    options: CommonOptions;
    _cache: Map<string | number, unknown>;
  },
): Promise<number[]> => {
  if (args.schema.type !== 'table') return Promise.resolve([args.schema.height]);
  const schema = args.schema as TableSchema;
  const bodyRange = getTableBodyRange(schema);
  const body = bodyRange?.start === 0 ? getBody(value) : getBodyWithRange(value, bodyRange);
  const table = await createSingleTable(body, args);

  const baseHeights = schema.showHead
    ? table.allRows().map((row) => row.height)
    : [0].concat(table.body.map((row) => row.height));

  const headerHeight = schema.showHead ? table.getHeadHeight() : 0;
  const shouldRepeatHeader = schema.repeatHead && isBlankPdf(args.basePdf) && headerHeight > 0;

  if (!shouldRepeatHeader) {
    return baseHeights;
  }

  const basePdf = args.basePdf as BlankPdf;
  const [paddingTop, , paddingBottom] = basePdf.padding;
  const pageContentHeight = basePdf.height - paddingTop - paddingBottom;
  const getPageStartY = (pageIndex: number) => pageIndex * pageContentHeight + paddingTop;

  const initialPageIndex = Math.max(
    0,
    Math.floor((schema.position.y - paddingTop) / pageContentHeight),
  );
  const headRowCount = schema.showHead ? table.head.length : 0;
  const SAFETY_MARGIN = 0.5;
  // Same tolerance as placeUnitsOnPages in @pdfme/common.
  const EPSILON = 0.01;

  let currentPageIndex = initialPageIndex;
  let currentPageY = schema.position.y;
  let rowsOnCurrentPage = 0;
  // avoidFirstUnitOnly moves the header unit with the first body row. That row
  // must not also include a repeated header, or the fresh page cannot fit it.
  let headerTravelsWithBody = false;

  const result: number[] = [];

  for (let i = 0; i < baseHeights.length; i++) {
    const isBodyRow = i >= headRowCount;
    const rowHeight = baseHeights[i];

    while (true) {
      const currentPageStartY = getPageStartY(currentPageIndex);
      const remainingHeight = currentPageStartY + pageContentHeight - currentPageY;
      const needsHeader =
        isBodyRow &&
        rowsOnCurrentPage === 0 &&
        currentPageIndex > initialPageIndex &&
        !headerTravelsWithBody;
      const totalRowHeight = rowHeight + (needsHeader ? headerHeight : 0);

      if (totalRowHeight > remainingHeight - SAFETY_MARGIN + EPSILON) {
        if (rowsOnCurrentPage === 0 && Math.abs(currentPageY - currentPageStartY) < SAFETY_MARGIN) {
          result.push(totalRowHeight);
          currentPageY += totalRowHeight;
          rowsOnCurrentPage++;
          headerTravelsWithBody = false;
          break;
        }
        const headerWouldBeAlone =
          !headerTravelsWithBody &&
          currentPageIndex === initialPageIndex &&
          isBodyRow &&
          headRowCount > 0 &&
          result.length === headRowCount &&
          rowsOnCurrentPage === headRowCount;
        currentPageIndex++;
        if (headerWouldBeAlone) {
          headerTravelsWithBody = true;
          currentPageY = getPageStartY(currentPageIndex) + headerHeight;
          rowsOnCurrentPage = headRowCount;
        } else {
          headerTravelsWithBody = false;
          currentPageY = getPageStartY(currentPageIndex);
          rowsOnCurrentPage = 0;
        }
        continue;
      }

      result.push(totalRowHeight);
      currentPageY += totalRowHeight;
      rowsOnCurrentPage++;
      if (isBodyRow) headerTravelsWithBody = false;

      if (currentPageY >= currentPageStartY + pageContentHeight - SAFETY_MARGIN) {
        currentPageIndex++;
        currentPageY = getPageStartY(currentPageIndex);
        rowsOnCurrentPage = 0;
        headerTravelsWithBody = false;
      }
      break;
    }
  }

  return result;
};

export const getDynamicLayoutForTable = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  const heights = await getDynamicHeightsForTable(value, args);

  return {
    heights,
    avoidFirstUnitOnly: true,
    patchSplitSchema: ({ start, end, isSplit }) => {
      const range = {
        start: start === 0 ? 0 : start - 1,
        end: end - 1,
      };
      return {
        __splitRange: createTableBodySplitRange(range.start, range.end),
        __isSplit: isSplit,
      };
    },
  };
};
