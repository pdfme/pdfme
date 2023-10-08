import type { PropPanel } from './types';
import { barcodeSchemaTypes } from '@pdfme/common';
import { textSchema, textWidgets } from './propPanels/text';
import { getBarcodeSchemaByType } from './propPanels/barcodes';

const propPanel: PropPanel = {
    text: { schema: textSchema, widgets: textWidgets },
    image: { schema: {} },
    ...barcodeSchemaTypes.reduce((acc, type) =>
        Object.assign(acc, {
            [type]: { schema: getBarcodeSchemaByType(type) }
        }), {}),
}
export default propPanel