import { isBlankPdf, type BasePdf } from '@pdfme/common';
import { TEXT_OVERFLOW_EXPAND } from './constants.js';
import type { TextSchema } from './types.js';

export const canUseTextOverflowExpand = (basePdf?: BasePdf) =>
  basePdf === undefined || isBlankPdf(basePdf);

export const isTextOverflowExpand = (schema: Pick<TextSchema, 'overflow'>, basePdf?: BasePdf) =>
  canUseTextOverflowExpand(basePdf) && schema.overflow === TEXT_OVERFLOW_EXPAND;

export const shouldUseDynamicFontSize = (
  schema: Pick<TextSchema, 'dynamicFontSize' | 'overflow'>,
  basePdf?: BasePdf,
) => Boolean(schema.dynamicFontSize) && !isTextOverflowExpand(schema, basePdf);
