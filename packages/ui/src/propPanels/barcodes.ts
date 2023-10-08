import { BarCodeType, Schema } from '@pdfme/common';
import type { PropPanelSchema } from '../types'

type PartOf<T> = {
    [K in keyof T]?: T[K];
};

const defaultColors = { backgroundColor: '', barColor: '#000000', };

const defaultTextColors = { textColor: '#000000', };

const default40x20 = { width: 40, height: 20, };

const barcodeDefaults: Record<BarCodeType, { defaultValue: string; defaultSchema: PartOf<Schema>; }> = {
    qrcode: {
        defaultValue: 'https://pdfme.com/',
        defaultSchema: { ...defaultColors, width: 30, height: 30, },
    },
    japanpost: {
        defaultValue: '6540123789-A-K-Z',
        defaultSchema: { ...defaultColors, ...defaultTextColors, width: 80, height: 7.2, },
    },
    ean13: {
        defaultValue: '2112345678900',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, height: 16, },
    },
    ean8: {
        defaultValue: '02345673',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, },
    },
    code39: {
        defaultValue: 'THIS IS CODE 39',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, },
    },
    code128: {
        defaultValue: 'This is Code 128!',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, },
    },
    nw7: {
        defaultValue: 'A0123456789B',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, },
    },
    itf14: {
        defaultValue: '04601234567893',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, height: 12, },
    },
    upca: {
        defaultValue: '416000336108',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, height: 16, },
    },
    upce: {
        defaultValue: '00123457',
        defaultSchema: { ...defaultColors, ...defaultTextColors, ...default40x20, },
    },
    gs1datamatrix: {
        defaultValue: '(01)03453120000011(17)191125(10)ABCD1234',
        defaultSchema: { ...defaultColors, width: 30, height: 30, },
    }
};


export const getBarcodePropPanel = (barcodeType: BarCodeType) => {
    const barcodeHasText = barcodeType !== 'qrcode' && barcodeType !== 'gs1datamatrix';

    const schema: PropPanelSchema = {
        barColor: { title: 'Bar Color', type: 'string', widget: 'color', },
        backgroundColor: { title: 'Background', type: 'string', widget: 'color', }
    }

    if (barcodeHasText) {
        schema.textColor = { title: 'Text Color', type: 'string', widget: 'color', };
    }

    const defaults = barcodeDefaults[barcodeType];

    return { schema, ...defaults };
}