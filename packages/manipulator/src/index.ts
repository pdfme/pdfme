/**
 * @file Manipulator.ts
 * @description
 * PDF のマージ、分割、ページ削除、挿入、抽出、回転、再編成などをまとめたインターフェース。
 * すべて `pdf-lib` を利用して実装可能。
 *
 * 注意:
 * - `pdf-lib` はバイナリ単位での合成ではなく、ページの複製と再配置イメージ。
 * - 添付ファイルやアウトラインなど一部メタ情報はうまく継承されない場合がある。
 */

import { PDFDocument } from '@pdfme/pdf-lib';
import { RotationTypes } from '@pdfme/pdf-lib';

/**
 * 複数の PDF を結合する。
 *
 * @param pdfs - 結合対象の PDF (ArrayBuffer) の配列
 * @returns 結合された PDF の ArrayBuffer
 */
export const merge = async (pdfs: ArrayBuffer[]): Promise<ArrayBuffer> => {
  if (!pdfs.length) {
    throw new Error('[@pdfme/manipulator] At least one PDF is required for merging');
  }

  const mergedPdf = await PDFDocument.create();
  for (const buffer of pdfs) {
    const srcDoc = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
};

/**
 * PDF を指定したページ範囲ごとに分割する。
 *
 * @param pdf - 分割対象の PDF
 * @param ranges - ページ範囲の配列 (start/end は0-based想定)
 * @returns 分割後の PDF の ArrayBuffer の配列
 */
export const split = async (
  pdf: ArrayBuffer,
  ranges: { start?: number; end?: number }[]
): Promise<ArrayBuffer[]> => {
  if (!ranges.length) {
    throw new Error('[@pdfme/manipulator] At least one range is required for splitting');
  }

  const originalPdf = await PDFDocument.load(pdf);
  const numPages = originalPdf.getPages().length;
  const result: ArrayBuffer[] = [];

  for (const { start = 0, end = numPages - 1 } of ranges) {
    if (start < 0 || end >= numPages || start > end) {
      throw new Error(
        `[@pdfme/manipulator] Invalid range: start=${start}, end=${end}, total pages=${numPages}`
      );
    }

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(
      originalPdf,
      Array.from({ length: end - start + 1 }, (_, i) => i + start)
    );
    pages.forEach((page) => newPdf.addPage(page));
    result.push(await newPdf.save());
  }
  return result;
};

/**
 * PDF から指定ページを削除する。
 *
 * @param pdf - 削除対象の PDF
 * @param pages - 削除したいページ番号 (0-based)
 * @returns ページ削除後の PDF の ArrayBuffer
 */
export const remove = async (pdf: ArrayBuffer, pages: number[]): Promise<ArrayBuffer> => {
  if (!pages.length) {
    throw new Error('[@pdfme/manipulator] At least one page number is required for removal');
  }

  const pdfDoc = await PDFDocument.load(pdf);
  const numPages = pdfDoc.getPageCount();

  // Validate page numbers
  if (pages.some(page => page < 0 || page >= numPages)) {
    throw new Error(
      `[@pdfme/manipulator] Invalid page number: pages must be between 0 and ${numPages - 1}`
    );
  }

  // Sort pages in descending order to avoid index shifting
  pages.sort((a, b) => b - a).forEach((pageIndex) => pdfDoc.removePage(pageIndex));
  return pdfDoc.save();
};

/**
 * ある PDF に、複数ページ (PDF) を特定の位置へ挿入する。
 *
 * @param pdf - 挿入対象の PDF
 * @param insertPdf - 挿入したい PDF (ArrayBuffer)
 * @param position - 挿入先のページインデックス (0-based)
 * @returns 挿入完了後の PDF の ArrayBuffer
 */
export const insert = async (
  pdf: ArrayBuffer,
  insertPdf: ArrayBuffer,
  position: number
): Promise<ArrayBuffer> => {
  const basePdf = await PDFDocument.load(pdf);
  const insertDoc = await PDFDocument.load(insertPdf);
  const numPages = basePdf.getPageCount();

  if (position < 0 || position > numPages) {
    throw new Error(
      `[@pdfme/manipulator] Invalid position: must be between 0 and ${numPages}`
    );
  }

  const newPdf = await PDFDocument.create();
  
  // Copy pages before insertion point
  if (position > 0) {
    const beforePages = await newPdf.copyPages(basePdf, Array.from({ length: position }, (_, i) => i));
    beforePages.forEach(page => newPdf.addPage(page));
  }

  // Copy pages from insertPdf
  const insertPages = await newPdf.copyPages(insertDoc, insertDoc.getPageIndices());
  insertPages.forEach(page => newPdf.addPage(page));

  // Copy remaining pages from original
  if (position < numPages) {
    const afterPages = await newPdf.copyPages(
      basePdf,
      Array.from({ length: numPages - position }, (_, i) => i + position)
    );
    afterPages.forEach(page => newPdf.addPage(page));
  }

  return newPdf.save();
};

/**
 * PDF から指定ページだけを抽出する。
 *
 * @param pdf - 抽出対象の PDF
 * @param pages - 抽出したいページ番号 (0-based)
 * @returns 抽出ページだけを含む PDF の ArrayBuffer の配列
 */
export const extract = async (pdf: ArrayBuffer, pages: number[]): Promise<ArrayBuffer[]> => {
  if (!pages.length) {
    throw new Error('[@pdfme/manipulator] At least one page number is required for extraction');
  }

  const original = await PDFDocument.load(pdf);
  const numPages = original.getPageCount();

  // Validate page numbers
  if (pages.some(page => page < 0 || page >= numPages)) {
    throw new Error(
      `[@pdfme/manipulator] Invalid page number: pages must be between 0 and ${numPages - 1}`
    );
  }

  return Promise.all(
    pages.map(async (pageIndex) => {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(original, [pageIndex]);
      newPdf.addPage(copiedPage);
      return newPdf.save();
    })
  );
};

/**
 * PDF 全ページを回転させる (一律)。
 *
 * @param pdf - 回転対象の PDF
 * @param degrees - 回転角度 (度数法)。90,180,270など
 * @returns 回転後の PDF の ArrayBuffer
 */
export const rotate = async (pdf: ArrayBuffer, degrees: number): Promise<ArrayBuffer> => {
  if (!Number.isInteger(degrees) || degrees % 90 !== 0) {
    throw new Error('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  }

  const pdfDoc = await PDFDocument.load(pdf);
  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error('[@pdfme/manipulator] PDF has no pages to rotate');
  }

  // Normalize degrees to be between 0 and 360
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  
  // Ensure rotation is a multiple of 90 degrees
  if (normalizedDegrees % 90 !== 0) {
    throw new Error('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  }

  // Set rotation in degrees
  pages.forEach((page) => {
    // Set rotation using the Rotation type
    page.setRotation({
      type: RotationTypes.Degrees,
      angle: normalizedDegrees % 360
    });
  });
  return pdfDoc.save();
};

/**
 * PDF 内のページをまとめて操作する (削除・挿入・差し替え・回転など)。
 *
 * @param pdf - 操作対象の PDF
 * @param actions - 操作の配列 (例: { type: 'remove', data: { pages: number[] } } など)
 * @returns 操作後の PDF の ArrayBuffer
 */
export const organize = async (
  pdf: ArrayBuffer,
  actions: Array<
    | { type: 'remove'; data: { pages: number[] } }
    | { type: 'insert'; data: { pdfs: ArrayBuffer[]; position: number } }
    | { type: 'replace'; data: { targetPage: number; pdf: ArrayBuffer } }
    | { type: 'rotate'; data: { pages: number[]; degrees: number } }
  >
): Promise<ArrayBuffer> => {
  // 例:
  //   const pdfDoc = await PDFDocument.load(pdf);
  //   // actions を順に実行
  //   // remove の場合 → removePage
  //   // insert の場合 → copyPages() & insertPage()
  //   // replace の場合 → removePage() & insertPage()
  //   // rotate の場合 → 対象ページを setRotation()
  //   return pdfDoc.save();
  return new ArrayBuffer(0);
};
