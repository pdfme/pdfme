import type { PropPanel } from './types';
import { barcodeSchemaTypes } from '@pdfme/common';
import { text, image, barcodes } from "@pdfme/schemas"

const propPanel: PropPanel = {
    text: text.propPanel(),
    image: image.propPanel(),
    ...barcodeSchemaTypes.reduce((acc, type) =>
        Object.assign(acc, {
            [type]: barcodes.propPanel(type)
        }), {}),
}
export default propPanel