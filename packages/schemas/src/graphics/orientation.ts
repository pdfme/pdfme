import { getImageOrientation, getImageRotation, Orientation } from './exif.js';
import { dataUrlToBuffer } from './imagehelper.js';

export async function normalizeImageOrientation(dataUrl: string): Promise<string> {
  try {
    if (dataUrl.startsWith('data:image/png;')) {
      return dataUrl;
    }

    const buffer = dataUrlToBuffer(dataUrl);

    const orientation = await getImageOrientation(buffer);

    if (!orientation || orientation === Orientation.Horizontal) {
      return dataUrl;
    }

    const rotation = await getImageRotation(buffer);
    if (!rotation) {
      return dataUrl;
    }

    const isBrowser = typeof document !== 'undefined';

    if (isBrowser) {
      const { applyRotationBrowser } = await import('./orientation.browser.js');
      return applyRotationBrowser(dataUrl, rotation);
    } else {
      try {
        const { applyRotationNode } = await import('./orientation.node.js');
        return applyRotationNode(dataUrl, rotation);
      } catch (error) {
        console.warn(
          '[@pdfme/schemas] canvas package not available. Image orientation will not be corrected.',
          error,
        );
        return dataUrl;
      }
    }
  } catch (error) {
    console.warn('[@pdfme/schemas] Failed to normalize image orientation:', error);
    return dataUrl;
  }
}
