import type { DynamicLayoutArgs, DynamicLayoutResult } from '@pdfme/common';
import { TEXT_OVERFLOW_EXPAND } from './constants.js';
import {
  getTextLineHeightsWithBox,
  getTextSplitBoxStyle,
  measureTextLines,
  sumLineHeights,
} from './measure.js';
import type { TextSchema } from './types.js';
import { createTextLineSplitRange } from '../splitRange.js';

export const getDynamicLayoutForText = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  if (args.schema.type !== 'text') return { heights: [args.schema.height] };

  const schema = args.schema as TextSchema;
  if (schema.overflow !== TEXT_OVERFLOW_EXPAND) {
    return { heights: [schema.height] };
  }

  const { lineHeights } = await measureTextLines({
    value,
    schema,
    font: args.options.font,
    _cache: args._cache,
    // `expand` owns the height decision, so measuring against a shrink-to-fit font size
    // would make the field keep its original box instead of growing.
    ignoreDynamicFontSize: true,
  });
  const heights = getTextLineHeightsWithBox(lineHeights, schema);
  const measuredHeight = sumLineHeights(heights);

  if (measuredHeight <= schema.height || lineHeights.length === 0) {
    return {
      heights: [schema.height],
      patchSplitSchema: () => ({ dynamicFontSize: undefined }),
    };
  }

  return {
    heights: lineHeights.length === 1 ? [Math.max(schema.height, measuredHeight)] : heights,
    patchSplitSchema: ({ start, end, isSplit }) => ({
      dynamicFontSize: undefined,
      __splitRange: lineHeights.length === 1 ? undefined : createTextLineSplitRange(start, end),
      __isSplit: isSplit,
      ...getTextSplitBoxStyle(schema, { start, end }, lineHeights.length),
    }),
  };
};
