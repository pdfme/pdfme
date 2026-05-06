import { isBlankPdf, type BasePdf } from '@pdfme/common';
import { TEXT_OVERFLOW_EXPAND } from './constants.js';
import type { TextSchema } from './types.js';

const TEXT_OVERFLOW_EXPAND_SCHEMA_TYPES = new Set(['text', 'multiVariableText']);

type TextOverflowSchema = Pick<TextSchema, 'overflow'> & Partial<Pick<TextSchema, 'type'>>;

const isTextOverflowExpandSchema = (schema: Partial<Pick<TextSchema, 'type'>>) =>
  schema.type === undefined || TEXT_OVERFLOW_EXPAND_SCHEMA_TYPES.has(schema.type);

export const canUseTextOverflowExpand = (
  schema: Partial<Pick<TextSchema, 'type'>>,
  basePdf?: BasePdf,
) => !isTextOverflowExpandSchema(schema) || basePdf === undefined || isBlankPdf(basePdf);

export const isTextOverflowExpand = (schema: TextOverflowSchema, basePdf?: BasePdf) =>
  canUseTextOverflowExpand(schema, basePdf) && schema.overflow === TEXT_OVERFLOW_EXPAND;

export const shouldUseDynamicFontSize = (
  schema: Pick<TextSchema, 'dynamicFontSize' | 'overflow'> & Partial<Pick<TextSchema, 'type'>>,
  basePdf?: BasePdf,
) => Boolean(schema.dynamicFontSize) && !isTextOverflowExpand(schema, basePdf);
