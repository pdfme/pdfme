import type { Renderer } from './types';
import type { UIRenderProps,Schema } from '@pdfme/common';
import { text, image, barcodes } from "@pdfme/schemas"

const renderer: Renderer = {
    text: { render: text.ui, },
    image: { render: image.ui, },
    ...Object.entries(barcodes).reduce((acc, [type, barcode]) => Object.assign(acc, { [type]: { render: barcode.ui } }), {} as Record<string, { render: (arg: UIRenderProps<Schema>) => Promise<void> }>)
}
export default renderer