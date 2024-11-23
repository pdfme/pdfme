import {
  Strikethrough,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide';
import { createSvgStr } from '../../utils.js';

export const TextStrikethroughIcon = createSvgStr(Strikethrough);

export const TextUnderlineIcon = createSvgStr(Underline);

export const TextAlignLeftIcon = createSvgStr(AlignLeft);

export const TextAlignCenterIcon = createSvgStr(AlignCenter);

export const TextAlignRightIcon = createSvgStr(AlignRight);

export const TextVerticalAlignTopIcon = createSvgStr(ArrowUpToLine);

// svg icons are material icons from https://www.xicons.org
export const TextVerticalAlignMiddleIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M8 19h3v4h2v-4h3l-4-4l-4 4zm8-14h-3V1h-2v4H8l4 4l4-4zM4 11v2h16v-2H4z" fill="currentColor"></path></svg>`;

export const TextVerticalAlignBottomIcon = createSvgStr(ArrowDownToLine);
