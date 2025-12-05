import { Rotation } from './types';

export async function applyRotationBrowser(dataUrl: string, rotation: Rotation): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Rotation is already applied.
        if (!rotation.canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        } else {
          canvas.width = rotation.dimensionSwapped ? img.height : img.width;
          canvas.height = rotation.dimensionSwapped ? img.width : img.height;

          // Set the origin at the center of the canvas.
          ctx.translate(canvas.width / 2, canvas.height / 2);

          ctx.rotate(rotation.rad);
          ctx.scale(rotation.scaleX, rotation.scaleY);

          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }

        const mimeType = dataUrl.startsWith('data:image/png;') ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mimeType));
      } catch {
        reject(new Error("[@pdfme/schemas] Failed to draw canvas image"));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
