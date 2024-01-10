import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types';
import type { Schema } from '@pdfme/common';

interface BoxDimensions {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CellSchema extends Schema {
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

// TODO ここから
/*
ヘッダー、ボディ、カラム単位でカスタマイズできるようにする。
基本的にCellSchemaでできることが設定できるはず。
どんなふうに設定するかは考える必要がある。
ヘッダー、ボディは全体で、カラムはカラム単位で設定できるようにする？
*/
export interface TableSchema extends Schema {
  head: string[];
  headWidthsPercentage: number[];
  fontName?: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
  bgColor: string;

  cellPadding: number;
  // ただのアイデアだがrowのmin,max,readOnlyがあるといいかも
}
