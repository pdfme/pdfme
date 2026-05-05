import type { DynamicLayoutArgs, DynamicLayoutResult } from '@pdfme/common';
import { TEXT_OVERFLOW_EXPAND } from './constants.js';
import { measureTextHeight } from './measure.js';
import type { TextSchema } from './types.js';

export const getDynamicLayoutForText = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  if (args.schema.type !== 'text') return { heights: [args.schema.height] };

  const schema = args.schema as TextSchema;
  if (schema.overflow !== TEXT_OVERFLOW_EXPAND) {
    return { heights: [schema.height] };
  }

  const measuredHeight = await measureTextHeight({
    value,
    schema,
    font: args.options.font,
    _cache: args._cache,
    // `expand` owns the height decision, so measuring against a shrink-to-fit font size
    // would make the field keep its original box instead of growing.
    ignoreDynamicFontSize: true,
  });

  return {
    heights: [Math.max(schema.height, measuredHeight)],
    patchSplitSchema: () => ({ dynamicFontSize: undefined }),
  };
};
