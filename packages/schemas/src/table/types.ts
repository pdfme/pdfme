import type { Schema } from '@pdfme/common';

export interface TableSchema extends Schema {
  borderColor: string;
  textColor: string;
  bgColor: string;
}