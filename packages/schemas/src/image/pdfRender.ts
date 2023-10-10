import type { PDFRenderProps } from "../types"
import { calcX, calcY, convertSchemaDimensionsToPt, getCacheKey } from '../renderUtils'


export const pdfRender = async (arg: PDFRenderProps) => {
    const { value, schema, pdfDoc, page, _cache } = arg;

    const { width, height, rotate } = convertSchemaDimensionsToPt(schema);
    const opt = {
        x: calcX(schema.position.x, 'left', width, width),
        y: calcY(schema.position.y, page.getHeight(), height),
        rotate,
        width,
        height,
    };
    const inputImageCacheKey = getCacheKey(schema, value);
    let image = _cache.get(inputImageCacheKey);
    if (!image) {
        const isPng = value.startsWith('data:image/png;');
        image = await (isPng ? pdfDoc.embedPng(value) : pdfDoc.embedJpg(value));
        _cache.set(inputImageCacheKey, image);
    }
    page.drawImage(image, opt);
}