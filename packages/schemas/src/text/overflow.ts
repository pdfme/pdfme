import { TEXT_OVERFLOW_EXPAND } from './constants.js';
import type { TextSchema } from './types.js';

export const isTextOverflowExpand = (schema: Pick<TextSchema, 'overflow'>) =>
  schema.overflow === TEXT_OVERFLOW_EXPAND;

export const shouldUseDynamicFontSize = (
  schema: Pick<TextSchema, 'dynamicFontSize' | 'overflow'>,
) => Boolean(schema.dynamicFontSize) && !isTextOverflowExpand(schema);
