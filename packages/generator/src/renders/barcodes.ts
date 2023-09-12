import {
    createBarCode,
    validateBarcodeInput,
    BarCodeType,
} from '@pdfme/common';
import type { RenderProps } from "../types"
import { calcX, calcY, convertSchemaDimensionsToPt, getCacheKey } from '../renderUtils'

export const barcodeRender = async (arg: RenderProps) => {
    const { input, templateSchema, pdfDoc, page, _cache } = arg;
    if (!validateBarcodeInput(templateSchema.type as BarCodeType, input)) return;

    const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
    const opt = {
        x: calcX(templateSchema.position.x, 'left', width, width),
        y: calcY(templateSchema.position.y, page.getHeight(), height),
        rotate,
        width,
        height,
    };
    const inputBarcodeCacheKey = getCacheKey(templateSchema, input);
    let image = _cache.get(inputBarcodeCacheKey);
    if (!image) {
        const imageBuf = await createBarCode(
            Object.assign(templateSchema, { type: templateSchema.type as BarCodeType, input })
        );
        image = await pdfDoc.embedPng(imageBuf);
        _cache.set(inputBarcodeCacheKey, image)
    }

    page.drawImage(image, opt);
}