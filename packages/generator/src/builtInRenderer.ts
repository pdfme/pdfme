import { text, image, barcodes } from "@pdfme/schemas"
import type { Renderer, Render } from './types';

const renderer: Renderer = {
    text: { render: text.pdf as Render },
    image: { render: image.pdf as Render, },
    ...Object.entries(barcodes).reduce((acc, [type, barcode]) => Object.assign(acc, { [type]: { render: barcode.pdf as Render } }), {})
}
export default renderer