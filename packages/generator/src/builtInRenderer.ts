import { barcodeSchemaTypes } from '@pdfme/common';
import type { Renderer } from './types';
import { text, image, barcodes } from "@pdfme/schemas"

const renderer: Renderer = {
    text: { render: text.pdf },
    image: { render: image.pdf, },
    ...barcodeSchemaTypes.reduce((acc, barcodeType) => Object.assign(acc, {
        [barcodeType]: { render: barcodes.pdf }
    }), {}),
}
export default renderer