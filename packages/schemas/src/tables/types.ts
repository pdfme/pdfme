import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types';
import type { Schema } from '@pdfme/common';

interface BoxDimensions {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CellStyle {
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

export type CellSchema = Schema & CellStyle;

export interface TableSchema extends Schema {
  head: string[];
  headWidthPercentages: number[];
  headStyles: CellStyle;
  bodyStyles: CellStyle & { alternateBackgroundColor: string };
  tableBorderColor: string;
  tableBorderWidth: number;

  // TODO ただのアイデアだがrowのmin,maxがあるといいかも
}
