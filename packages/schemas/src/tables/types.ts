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
  // contentではなくbodyを使うのもありという気がする
  // body: string[][];
  headWidthsPercentage: number[];
  // TODO Stylesを配列にするか、それともカラムと分けるか
  // カラムにした場合、細かく設定できるが複雑になる。どの程度の設定が必要か見極める必要がある。
  // もしかしたらカラム単位で設定できるようにした方がいいかもしれない。
  headStyles: CellStyle;
  bodyStyles: CellStyle;

  // TODO どこにあるのがいいのか
  // alternateRowStyles
  // もしかしたらbodyStylesに入れ込んでbackgroundColorだけでいいかもしれない

  // 下記はテーブルに対するスタイル。これ、オブジェクトに入れた方がいいか？
  fontName?: string; // これ、ないほうがいいかも?
  tableBorderColor: string;
  tableBorderWidth: number;

  // ただのアイデアだがrowのmin,maxがあるといいかも
}
