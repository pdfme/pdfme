import { UIRenderProps, b64toUint8Array } from '@pdfme/common';
import { pdf2img } from '@pdfme/converter';
import { getCacheKey } from './cacheKey';
import { ImageSchema } from './image';

export function isPdf(content: string): boolean {
  return content.startsWith('data:application/pdf;');
}

/**
 * convert pdf to blob image url
 * @param content
 */
export const pdfToImage = async ({
  schema,
  value,
  _cache,
}: UIRenderProps<ImageSchema>): Promise<string> => {
  // using value from cache to prevent rerending pdf to image
  const pdfImageCacheKey = getCacheKey(schema, value);
  const imageSrc = _cache.get(pdfImageCacheKey);
  if (imageSrc) return imageSrc;

  const images = await pdf2img(b64toUint8Array(value), {
    imageType: 'png',
    range: { end: 1 },
  });
  const image = URL.createObjectURL(new Blob([images[0]], { type: 'image/png' }));

  _cache.set(pdfImageCacheKey, image);
  return image;
};
