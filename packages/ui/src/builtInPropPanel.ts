import { barcodeSchemaTypes } from '@pdfme/common';
import { text, image, barcodes } from "@pdfme/schemas"
import { PropPanelObject } from './types';

const propPanel: PropPanelObject = {
    text: text.propPanel,
    image: image.propPanel,
    ...barcodeSchemaTypes.reduce((acc, type) => Object.assign(acc, {
        [type]: barcodes[type].propPanel
    }), {}),
}
export default propPanel