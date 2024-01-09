import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types';
import {
  DEFAULT_ALIGNMENT,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from '../text/constants';
import type { Schema, Plugin, PDFRenderProps, UIRenderProps } from '@pdfme/common';

const DEFAULT_BORDER_COLOR = '#000000';

interface BoxDimensions {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface CellSchema extends Schema {
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  lineHeight: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: BoxDimensions;
  padding: BoxDimensions;
}

const cellSchema: Plugin<CellSchema> = {
  pdf: (arg: PDFRenderProps<CellSchema>) => {},
  ui: (arg: UIRenderProps<CellSchema>) => {},
  propPanel: {
    schema: ({ i18n }) => ({
      // TODO ここから
    }),
    defaultSchema: {
      type: 'cell',
      position: { x: 0, y: 0 },
      width: 50,
      height: 10,
      fontName: undefined,
      alignment: DEFAULT_ALIGNMENT,
      verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
      fontSize: DEFAULT_FONT_SIZE,
      lineHeight: DEFAULT_LINE_HEIGHT,
      characterSpacing: DEFAULT_CHARACTER_SPACING,
      fontColor: DEFAULT_FONT_COLOR,
      backgroundColor: '',
      borderColor: DEFAULT_BORDER_COLOR,
      borderWidth: { top: 0, bottom: 0, left: 0, right: 0 },
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  },
};
export default cellSchema;
