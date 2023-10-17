import type { Renderer, Render } from './types';
import { text, image, barcodes } from "@pdfme/schemas"

const renderer: Renderer = {
    text: { render: text.ui as Render },
    image: { render: image.ui as Render },
    ...Object.entries(barcodes).reduce((acc, [type, barcode]) => Object.assign(acc, { [type]: { render: barcode.ui as Render } }), {})
}
export default renderer