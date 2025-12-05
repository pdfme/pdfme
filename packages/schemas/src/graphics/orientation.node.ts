import { createCanvas, loadImage } from 'canvas';
import { Rotation } from './types';

export async function applyRotationNode(
  dataUrl: string,
  rotation: Rotation
): Promise<string> {
  const img = await loadImage(dataUrl);

  const canvasWidth = rotation.dimensionSwapped ? img.height : img.width;
  const canvasHeight = rotation.dimensionSwapped ? img.width : img.height;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Set the origin at the center of the canvas.
  ctx.translate(canvasWidth / 2, canvasHeight / 2);

  ctx.rotate(rotation.rad);
  ctx.scale(rotation.scaleX, rotation.scaleY);

  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  if (dataUrl.startsWith('data:image/png;')) {
    return canvas.toDataURL('image/png');
  } else {
    return canvas.toDataURL('image/jpeg');
  }
}
