import { createBarCode, validateBarcodeInput, BarCodeType, PDFRenderProps } from '@pdfme/common';
import { calcX, calcY, convertSchemaDimensionsToPt, getCacheKey } from '../renderUtils'
import type { BarcodeSchema } from './types';

export const pdfRender = async (arg: PDFRenderProps<BarcodeSchema>) => {
    const { value, schema, pdfDoc, page, _cache } = arg;
    if (!validateBarcodeInput(schema.type as BarCodeType, value)) return;

    const { width, height, rotate } = convertSchemaDimensionsToPt(schema);
    const opt = {
        x: calcX(schema.position.x, 'left', width, width),
        y: calcY(schema.position.y, page.getHeight(), height),
        rotate,
        width,
        height,
    };
    const inputBarcodeCacheKey = getCacheKey(schema, value);
    let image = _cache.get(inputBarcodeCacheKey);
    if (!image) {
        const imageBuf = await createBarCode(
            Object.assign(schema, { type: schema.type as BarCodeType, input: value })
        );
        image = await pdfDoc.embedPng(imageBuf);
        _cache.set(inputBarcodeCacheKey, image)
    }

    page.drawImage(image, opt);
}