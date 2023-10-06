import type { PropPanel } from './types';
import { barcodeSchemaTypes } from '@pdfme/common';
import { textSchema, textWidgets } from './propPanels/text';
import { barcodeSchema } from './propPanels/barcodes';

const propPanel: PropPanel = {
    text: { schema: textSchema, widgets: textWidgets },
    image: {},
    ...barcodeSchemaTypes.reduce((acc, barcodeType) =>
        Object.assign(acc, {
            [barcodeType]: {
                schema: barcodeSchema
            }
        }), {}),
}
export default propPanel