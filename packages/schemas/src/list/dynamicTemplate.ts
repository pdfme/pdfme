import type { DynamicLayoutArgs, DynamicLayoutResult } from '@pdfme/common';
import type { ListSchema } from './types.js';
import { calculateListLayout, normalizeListItems } from './helper.js';
import { createListItemSplitRange } from '../splitRange.js';

export const getDynamicLayoutForList = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  if (args.schema.type !== 'list') return { heights: [args.schema.height] };

  const schema = args.schema as ListSchema;
  const items = normalizeListItems(value);
  if (items.length === 0) return { heights: [0] };

  const layout = await calculateListLayout({
    schema,
    items,
    startIndex: 0,
    options: args.options,
    _cache: args._cache,
  });

  return {
    heights: layout.items.map((item) => item.height),
    avoidFirstUnitOnly: false,
    patchSplitSchema: ({ start, end, isSplit }) => ({
      __splitRange: createListItemSplitRange(start, end),
      __isSplit: isSplit,
    }),
  };
};
