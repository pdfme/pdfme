import type { BarCodeType } from '@pdfme/common';
import type { Renderer } from './types';
import { renderText } from './renders/text';
import { renderImage } from './renders/image';
import { renderBarcode } from './renders/barcodes';

const barCodeTypes: BarCodeType[] = ['qrcode', 'japanpost', 'ean13', 'ean8', 'code39', 'code128', 'nw7', 'itf14', 'upca', 'upce', 'gs1datamatrix']

const renderer: Renderer = {
    text: { render: renderText, },
    image: { render: renderImage, },
    ...barCodeTypes.reduce((acc, barcodeType) => Object.assign(acc, { [barcodeType]: { render: renderBarcode } }), {}),
}
export default renderer