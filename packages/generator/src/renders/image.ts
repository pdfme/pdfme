import type { RenderProps } from "../types"
import { calcX, calcY, convertSchemaDimensionsToPt, getCacheKey } from '../renderUtils'


export const renderImage = async (arg: RenderProps) => {
    const { input, templateSchema, pdfDoc, page, _cache } = arg;

    const { width, height, rotate } = convertSchemaDimensionsToPt(templateSchema);
    const opt = {
        x: calcX(templateSchema.position.x, 'left', width, width),
        y: calcY(templateSchema.position.y, page.getHeight(), height),
        rotate,
        width,
        height,
    };
    const inputImageCacheKey = getCacheKey(templateSchema, input);
    let image = _cache.get(inputImageCacheKey);
    if (!image) {
        const isPng = input.startsWith('data:image/png;');
        image = await (isPng ? pdfDoc.embedPng(input) : pdfDoc.embedJpg(input));
        _cache.set(inputImageCacheKey, image);
    }
    page.drawImage(image, opt);
}