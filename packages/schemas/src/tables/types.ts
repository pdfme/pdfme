import type { Schema } from '@pdfme/common';

// TODO ここにカスタマイズ可能なプロパティを追加する
// headStyles, bodyStyles はここに追加する
// tableLineColor, tableLineWidthは別で必要
/*
  - テーブルのスタイル
      - ヘッダー、ボディ、カラム単位でカスタマイズできるようにする
          - 基本的にテキストスキーマでできることができる
      - ボーダーの細かいカスタム
      - パディングの細かいカスタム
  ただのアイデアだがrowのmin,max,readOnlyがあるといいかも
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
  test: {
    nestTest1: string;
    nestTest2: string;
  };
}
