import { Schema } from '@pdfme/common';
import {
  DOT_TYPES,
  CORNER_SQUARE_TYPES,
  CORNER_DOT_TYPES,
  ERROR_CORRECTION_LEVELS,
} from './constants.js';

export type DotType = (typeof DOT_TYPES)[number];
export type CornerSquareType = (typeof CORNER_SQUARE_TYPES)[number];
export type CornerDotType = (typeof CORNER_DOT_TYPES)[number];
export type ErrorCorrectionLevel = (typeof ERROR_CORRECTION_LEVELS)[number];

export interface GradientColorStop {
  offset: number;
  color: string;
}

export interface Gradient {
  type: 'linear' | 'radial' | 'none';
  rotation?: number;
  colorStops?: GradientColorStop[];
}

export interface DotsOptions {
  color?: string;
  type?: DotType;
  gradient?: Gradient;
}

export interface CornersSquareOptions {
  color?: string;
  type?: CornerSquareType;
  gradient?: Gradient;
}

export interface CornersDotOptions {
  color?: string;
  type?: CornerDotType;
  gradient?: Gradient;
}

export interface BackgroundOptions {
  color?: string | null;
  gradient?: Gradient;
}

export interface ImageOptions {
  image?: string;
  imageSourceType?: 'url' | 'upload';
  margin?: number;
}

export interface QROptions {
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

export interface StyledQrCodeSchema extends Schema {
  type: 'styled-qr-code';
  dotsOptions?: DotsOptions;
  cornersSquareOptions?: CornersSquareOptions;
  cornersDotOptions?: CornersDotOptions;
  backgroundOptions?: BackgroundOptions;
  imageOptions?: ImageOptions;
  qrOptions?: QROptions;
}

