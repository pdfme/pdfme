import { Schema, BasePdf, CommonOptions, isBlankPdf } from '@pdfme/common';
import { createSingleTable } from './tableHelper.js';
import { getBodyWithRange, getBody } from './helper.js';
import { TableSchema } from './types.js';

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
  const body =
    schema.__bodyRange?.start === 0 ? getBody(value) : getBodyWithRange(value, schema.__bodyRange);
  const table = await createSingleTable(body, args);

  const heights = schema.showHead
    ? table.allRows().map((row) => row.getMaxCellHeight(table.columns))
    : [0].concat(table.body.map((row) => row.height));

  if (!isBlankPdf(args.basePdf) || !schema.repeatHead || !schema.showHead) {
    return heights;
  }

  const [paddingTop, , paddingBottom] = args.basePdf.padding;

  const pageHeight = args.basePdf.height - paddingBottom;
  const headerHeight = table.getHeadHeight();
  let currentY = schema.position.y;
  const adjustedHeights: number[] = [];

  let pageBreak = false;

  for (let i = 0; i < heights.length; i++) {
    const rowHeight = heights[i];

    if (currentY + rowHeight > pageHeight - (pageBreak ? paddingTop : 0)) {
      adjustedHeights.push(headerHeight);
      pageBreak = true;
      currentY = paddingTop + headerHeight;
    }

    adjustedHeights.push(rowHeight);
    currentY += rowHeight;
  }

  return adjustedHeights;
};
