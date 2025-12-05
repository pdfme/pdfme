import exifr from 'exifr';
import { Rotation } from './types';

export enum Orientation {
  Horizontal = 1,
  MirrorHorizontal = 2,
  Rotate180 = 3,
  MirrorVertical = 4,
  MirrorHorizontalAndRotate270CW = 5,
  Rotate90CW = 6,
  MirrorHorizontalAndRotate90CW = 7,
  Rotate270CW = 8,
}

export async function getImageOrientation(buffer: ArrayBuffer): Promise<Orientation | undefined> {
  try {
    return await exifr.orientation(buffer);
  } catch (error) {
    console.warn('[@pdfme/schemas] Failed to read EXIF orientation:', error);
    return undefined;
  }
}

export async function getImageRotation(buffer: ArrayBuffer): Promise<Rotation | undefined> {
  try {
    return await exifr.rotation(buffer);
  } catch (error) {
    console.warn('[@pdfme/schemas] Failed to read EXIF rotation:', error);
    return undefined;
  }
}
