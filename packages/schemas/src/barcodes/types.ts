import { Schema } from '@pdfme/common';

export interface BarcodeSchema extends Schema {
    backgroundColor: string;
    barColor: string;
    textColor?: string;
}