import {
  ALIGNMENT,
  VERTICAL_ALIGNMENT,
  DYNAMIC_FONT_SIZE_FIT,
  TEXT_FORMAT,
  TEXT_OVERFLOW,
  FONT_VARIANT_FALLBACK,
} from './types.js';

export const DEFAULT_FONT_SIZE = 13;

export const ALIGN_LEFT = 'left' as ALIGNMENT;
export const ALIGN_CENTER = 'center' as ALIGNMENT;
export const ALIGN_RIGHT = 'right' as ALIGNMENT;
export const ALIGN_JUSTIFY = 'justify' as ALIGNMENT;
export const DEFAULT_ALIGNMENT = ALIGN_LEFT;
export const VERTICAL_ALIGN_TOP = 'top' as VERTICAL_ALIGNMENT;
export const VERTICAL_ALIGN_MIDDLE = 'middle' as VERTICAL_ALIGNMENT;
export const VERTICAL_ALIGN_BOTTOM = 'bottom' as VERTICAL_ALIGNMENT;
export const DEFAULT_VERTICAL_ALIGNMENT = VERTICAL_ALIGN_TOP;
export const DEFAULT_LINE_HEIGHT = 1;
export const DEFAULT_CHARACTER_SPACING = 0;
export const DEFAULT_FONT_COLOR = '#000000';
export const PLACEHOLDER_FONT_COLOR = '#A0A0A0';
export const TEXT_FORMAT_PLAIN = 'plain' as const satisfies TEXT_FORMAT;
export const TEXT_FORMAT_INLINE_MARKDOWN = 'inline-markdown' as const satisfies TEXT_FORMAT;
export const DEFAULT_TEXT_FORMAT = TEXT_FORMAT_PLAIN;
export const TEXT_OVERFLOW_VISIBLE = 'visible' as const satisfies TEXT_OVERFLOW;
export const TEXT_OVERFLOW_EXPAND = 'expand' as const satisfies TEXT_OVERFLOW;
export const DEFAULT_TEXT_OVERFLOW = TEXT_OVERFLOW_VISIBLE;
export const FONT_VARIANT_FALLBACK_SYNTHETIC = 'synthetic' as const satisfies FONT_VARIANT_FALLBACK;
export const FONT_VARIANT_FALLBACK_PLAIN = 'plain' as const satisfies FONT_VARIANT_FALLBACK;
export const FONT_VARIANT_FALLBACK_ERROR = 'error' as const satisfies FONT_VARIANT_FALLBACK;
export const DEFAULT_FONT_VARIANT_FALLBACK = FONT_VARIANT_FALLBACK_SYNTHETIC;
export const SYNTHETIC_BOLD_OFFSET_RATIO = 0.03;
export const SYNTHETIC_BOLD_PDF_EXTRA_DRAWS = 2;
export const SYNTHETIC_BOLD_CSS_TEXT_SHADOW = '0.025em 0 0 currentColor';
export const SYNTHETIC_ITALIC_SKEW_DEGREES = 12;
export const CODE_BACKGROUND_COLOR = '#f2f3f5';
export const CODE_HORIZONTAL_PADDING = 1.5;
export const DYNAMIC_FIT_VERTICAL = 'vertical' as DYNAMIC_FONT_SIZE_FIT;
export const DYNAMIC_FIT_HORIZONTAL = 'horizontal' as DYNAMIC_FONT_SIZE_FIT;
export const DEFAULT_DYNAMIC_FIT = DYNAMIC_FIT_VERTICAL;
export const DEFAULT_DYNAMIC_MIN_FONT_SIZE = 4;

export const DEFAULT_DYNAMIC_MAX_FONT_SIZE = 72;
export const FONT_SIZE_ADJUSTMENT = 0.25;

export const LINE_START_FORBIDDEN_CHARS = [
  // 句読点
  '、',
  '。',
  ',',
  '.',

  // 閉じカッコ類
  '」',
  '』',
  ')',
  '}',
  '】',
  '>',
  '≫',
  ']',

  // 記号
  '・',
  'ー',
  '―',
  '-',

  // 約物
  '!',
  '！',
  '?',
  '？',
  ':',
  '：',
  ';',
  '；',
  '/',
  '／',

  // 繰り返し記号
  'ゝ',
  '々',
  '〃',

  // 拗音・促音（小書きのかな）
  'ぁ',
  'ぃ',
  'ぅ',
  'ぇ',
  'ぉ',
  'っ',
  'ゃ',
  'ゅ',
  'ょ',
  'ァ',
  'ィ',
  'ゥ',
  'ェ',
  'ォ',
  'ッ',
  'ャ',
  'ュ',
  'ョ',
];

export const LINE_END_FORBIDDEN_CHARS = [
  // 始め括弧類
  '「',
  '『',
  '（',
  '｛',
  '【',
  '＜',
  '≪',
  '［',
  '〘',
  '〖',
  '〝',
  '‘',
  '“',
  '｟',
  '«',
];
