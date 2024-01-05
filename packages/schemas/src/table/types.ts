import type { Schema } from '@pdfme/common';

// TODO ここにカスタマイズ可能なプロパティを追加する
export interface TableSchema extends Schema {
  borderColor: string;
  textColor: string;
  bgColor: string;
}
