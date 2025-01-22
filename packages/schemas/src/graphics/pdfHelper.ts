import { UIRenderProps } from '@pdfme/common';
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
}: // TODO pdfJsは削除されているので、代替案を検討する
// pdfJs,
UIRenderProps<ImageSchema>): Promise<string> => {
  // using value from cache to prevent rerending pdf to image
  // const pdfImageCacheKey = getCacheKey(schema, value);
  // const imageSrc = _cache.get(pdfImageCacheKey);
  // if (imageSrc) return imageSrc;

  // const pdfDoc = await pdfJs.getDocument({ url: value }).promise;
  // const page = await pdfDoc.getPage(1);

  // const canvas = document.createElement('canvas');
  // const viewport = page.getViewport({ scale: 1 });
  // canvas.width = viewport.width;
  // canvas.height = viewport.height;
  // const canvasContext = canvas.getContext('2d')!;

  // await page.render({ canvasContext, viewport }).promise;
  // const image = await _canvasToObjectUrl(canvas);

  // _cache.set(pdfImageCacheKey, image);
  // return image;
  return '';
};

/**
 * convert canvas to blob url
 * @param canvas
 */
const _canvasToObjectUrl = async (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(function (blob) {
      if (!blob) {
        reject('inavlid canvas');
      } else {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }
    });
  });
};
