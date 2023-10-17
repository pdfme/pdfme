import { PDFRenderProps, Schema } from '@pdfme/common';
import { text, image, barcodes } from "@pdfme/schemas"
import type { Renderer } from './types';


const renderer: Renderer = {
    text: { render: text.pdf },
    image: { render: image.pdf, },
    ...Object.entries(barcodes).reduce((acc, [type, barcode]) => Object.assign(acc, { [type]: { render: barcode.pdf } }), {} as Record<string, { render: (arg: PDFRenderProps<Schema>) => Promise<void> }>)
}
export default renderer