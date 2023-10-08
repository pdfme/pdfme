import type { PropPanelSchema } from '../types'

export const getBarcodeSchemaByType = (barcodeType: string) => {
    const barcodeHasText = barcodeType !== 'qrcode' && barcodeType !== 'gs1datamatrix';

    const schema: PropPanelSchema = {
        barcolor: {
            title: 'Bar Color',
            type: 'string',
            widget: 'color',
        },
        backgroundColor: {
            title: 'Background',
            type: 'string',
            widget: 'color',
        }
    }

    if (barcodeHasText) {
        schema.textcolor = {
            title: 'Text Color',
            type: 'string',
            widget: 'color',
        };
    }

    return schema
}