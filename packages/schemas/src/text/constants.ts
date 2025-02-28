import { ALIGNMENT, VERTICAL_ALIGNMENT, DYNAMIC_FONT_SIZE_FIT } from './types.js';

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
