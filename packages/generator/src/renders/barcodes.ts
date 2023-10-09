import {
    createBarCode,
    validateBarcodeInput,
    BarCodeType,
} from '@pdfme/common';
import type { RenderProps } from "../types"
import { getCacheKey, convertForPdfLayoutProps } from '../renderUtils'

export const renderBarcode = async (arg: RenderProps) => {
    const { value, schema, pdfDoc, page, _cache } = arg;
    if (!validateBarcodeInput(schema.type as BarCodeType, value)) return;

    const inputBarcodeCacheKey = getCacheKey(schema, value);
    let image = _cache.get(inputBarcodeCacheKey);
    if (!image) {
        const imageBuf = await createBarCode(
            Object.assign(schema, { type: schema.type as BarCodeType, input: value })
        );
        image = await pdfDoc.embedPng(imageBuf);
        _cache.set(inputBarcodeCacheKey, image)
    }

    const pageHeight = page.getHeight();
    const { width, height, rotate, position: { x, y } } = convertForPdfLayoutProps({ schema, pageHeight });

    page.drawImage(image, { x, y, rotate, width, height });
}