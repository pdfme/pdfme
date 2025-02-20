import { PDFDocument } from '@pdfme/pdf-lib';
import type { ImageType } from './types.js';

export interface Img2PdfOptions {
  scale?: number;
  imageType?: ImageType;
  merge?: boolean;
}


export async function img2pdf(
  imgs: ArrayBuffer[],
  options: Img2PdfOptions = {},
): Promise<ArrayBuffer[]> {
  // TODO: 画像をPDFに変換する
  // pdf-libで可能（単ページ or 複数画像を1ファイル）画像を embedJpg() / embedPng() で取り込み、drawImage やページ追加により「画像を敷き詰めたPDF」を作る。
  // merge オプションが true の場合は、複数画像を1ファイルにまとめる
  return [];
}