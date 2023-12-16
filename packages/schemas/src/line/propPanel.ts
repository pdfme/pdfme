import { PropPanel } from '@pdfme/common';
import type { LineSchema } from './types';
import { HEX_COLOR_PATTERN, DEFAULT_LINE_COLOR } from '../constants.js';

export const propPanel: PropPanel<LineSchema> = {
  schema: ({ i18n }) => {
    return {
      barColor: {
        title: i18n('schemas.line.color'),
        type: 'string',
        widget: 'color',
        rules: [
          {
            pattern: HEX_COLOR_PATTERN,
            message: i18n('hexColorPrompt'),
          },
        ],
      },
    };
  },
  defaultValue: '',
  defaultSchema: {
    type: 'line',
    position: { x: 0, y: 0 },
    width: 50,
    height: 1,
    rotate: 0,
    opacity: 1,
    readOnly: true,
    color: DEFAULT_LINE_COLOR,
  },
};
