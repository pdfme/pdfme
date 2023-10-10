import { barcodeSchemaTypes } from '@pdfme/common';
import type { Renderer } from './types';
import { text, image, barcodes } from "@pdfme/schemas"

const renderer: Renderer = {
    text: { render: text.ui, },
    image: { render: image.ui, },
    ...barcodeSchemaTypes.reduce((acc, barcodeType) => Object.assign(acc, {
        [barcodeType]: { render: barcodes.ui }
    }), {}),
}
export default renderer