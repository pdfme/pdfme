import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { TextSchema } from './types.js';
import { TextCursorInput } from 'lucide';
import { createSvgStr } from '../utils.js';

export { getDynamicHeightsForText } from './dynamicTemplate.js';
export {
  parseRichText,
  parseInlineStyles,
  isRichText,
  stripRichText,
  HEADING_SIZE_MULTIPLIERS,
} from './richText/index.js';
export type {
  TextSchema,
  TextSegment,
  TextLine,
  TextBlock,
  HeadingLevel,
} from './types.js';

const textSchema: Plugin<TextSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel,
  icon: createSvgStr(TextCursorInput),
};

export default textSchema;
