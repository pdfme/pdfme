import type { DynamicLayoutArgs, DynamicLayoutResult } from '@pdfme/common';
import { TEXT_OVERFLOW_EXPAND } from '../text/constants.js';
import { measureTextHeight } from '../text/measure.js';
import { isInlineMarkdownTextSchema } from '../text/richText.js';
import type { MultiVariableTextSchema } from './types.js';
import {
  substituteVariables,
  substituteVariablesAsInlineMarkdownLiterals,
  validateVariables,
} from './helper.js';

export const getDynamicLayoutForMultiVariableText = async (
  value: string,
  args: DynamicLayoutArgs,
): Promise<DynamicLayoutResult> => {
  if (args.schema.type !== 'multiVariableText') return { heights: [args.schema.height] };

  const schema = args.schema as MultiVariableTextSchema;
  if (schema.overflow !== TEXT_OVERFLOW_EXPAND) {
    return { heights: [schema.height] };
  }

  if (!validateVariables(value, schema)) {
    return { heights: [schema.height] };
  }

  const renderValue = isInlineMarkdownTextSchema(schema)
    ? substituteVariablesAsInlineMarkdownLiterals(schema.text || '', value)
    : substituteVariables(schema.text || '', value);
  const measuredHeight = await measureTextHeight({
    value: renderValue,
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
