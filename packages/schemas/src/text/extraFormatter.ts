import { Dict } from '@pdfme/common';
import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  TextVerticalAlignBottomIcon,
  TextVerticalAlignMiddleIcon,
  TextVerticalAlignTopIcon,
} from './icons';
import {
  ALIGN_CENTER,
  ALIGN_RIGHT,
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  VERTICAL_ALIGN_BOTTOM,
  VERTICAL_ALIGN_MIDDLE,
} from './constants';

export enum Formatter {
  STRIKETHROUGH = 'strikethrough',
  UNDERLINE = 'underline',
  ALIGNMENT = 'alignment',
  VERTICAL_ALIGNMENT = 'verticalAlignment',
}

interface GroupButtonBoolean {
  key: Formatter;
  icon: string;
  type: 'boolean';
}

interface GroupButtonString {
  key: Formatter;
  icon: string;
  type: 'select';
  value: string;
}

export type GroupButton = GroupButtonBoolean | GroupButtonString;

export function getExtraFormatterSchema(i18n: (key: keyof Dict | string) => string): {
  title: string;
  widget: string;
  buttons: GroupButton[];
  span: number;
} {
  const buttons: GroupButton[] = [
    { key: Formatter.STRIKETHROUGH, icon: TextStrikethroughIcon, type: 'boolean' },
    { key: Formatter.UNDERLINE, icon: TextUnderlineIcon, type: 'boolean' },
    { key: Formatter.ALIGNMENT, icon: TextAlignLeftIcon, type: 'select', value: DEFAULT_ALIGNMENT },
    { key: Formatter.ALIGNMENT, icon: TextAlignCenterIcon, type: 'select', value: ALIGN_CENTER },
    { key: Formatter.ALIGNMENT, icon: TextAlignRightIcon, type: 'select', value: ALIGN_RIGHT },
    {
      key: Formatter.VERTICAL_ALIGNMENT,
      icon: TextVerticalAlignTopIcon,
      type: 'select',
      value: DEFAULT_VERTICAL_ALIGNMENT,
    },
    {
      key: Formatter.VERTICAL_ALIGNMENT,
      icon: TextVerticalAlignMiddleIcon,
      type: 'select',
      value: VERTICAL_ALIGN_MIDDLE,
    },
    {
      key: Formatter.VERTICAL_ALIGNMENT,
      icon: TextVerticalAlignBottomIcon,
      type: 'select',
      value: VERTICAL_ALIGN_BOTTOM,
    },
  ];
  return {
    title: i18n('schemas.text.format'),
    widget: 'ButtonGroup',
    buttons,
    span: 17,
  };
}
