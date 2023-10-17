import { Schema } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';

export type FontWidthCalcValues = {
    font: FontKitFont;
    fontSize: number;
    characterSpacing: number;
    boxWidthInPt: number;
};
export interface TextSchema extends Schema {
    fontName?: string;
    alignment: 'left' | 'center' | 'right';
    verticalAlignment: 'top' | 'middle' | 'bottom';
    fontSize: number;
    lineHeight: number;
    characterSpacing: number;
    dynamicFontSize?: {
        min: number;
        max: number;
        fit: 'horizontal' | 'vertical';
    };

    fontColor: string;
    backgroundColor: string;
}