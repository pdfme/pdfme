export {
  parseRichText,
  parseInlineStyles,
  isRichText,
  stripRichText,
  HEADING_SIZE_MULTIPLIERS,
} from './parser.js';

export type { TextBlock, TextSegment, TextLine, HeadingLevel, ListItem, TableData } from '../types.js';

export {
  BOLD_STROKE_WIDTH_RATIO,
  BOLD_STROKE_WIDTH_CSS,
  CODE_BG_COLOR,
  CODE_BORDER_COLOR,
  CODE_FONT_SIZE_RATIO,
  BLOCKQUOTE_BORDER_COLOR,
  BLOCKQUOTE_TEXT_COLOR,
  BLOCKQUOTE_BORDER_WIDTH,
  BLOCKQUOTE_PADDING_LEFT,
  LIST_INDENT_PER_LEVEL,
  LIST_MARKER_WIDTH,
  LIST_BULLET_CHAR,
  LIST_ITEM_SPACING,
  TABLE_BORDER_COLOR,
  TABLE_HEADER_BG_COLOR,
  TABLE_BORDER_WIDTH,
  TABLE_CELL_PADDING,
  TABLE_CELL_MIN_WIDTH,
} from './constants.js';

export { renderRichTextBlocks, drawSegments, hexToRgb } from './pdfRender.js';
export type { RenderRichTextParams } from './pdfRender.js';

export { richTextToHtml, segmentToHtml } from './uiRender.js';
