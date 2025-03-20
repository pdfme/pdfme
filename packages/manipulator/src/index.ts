import { PDFDocument, RotationTypes } from '@pdfme/pdf-lib';

const merge = async (pdfs: (ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> => {
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

const split = async (
  pdf: ArrayBuffer | Uint8Array,
  ranges: { start?: number; end?: number }[],
): Promise<Uint8Array[]> => {
  if (!ranges.length) {
    throw new Error('[@pdfme/manipulator] At least one range is required for splitting');
  }

  const originalPdf = await PDFDocument.load(pdf);
  const numPages = originalPdf.getPages().length;
  const result: Uint8Array[] = [];

  for (const { start = 0, end = numPages - 1 } of ranges) {
    if (start < 0 || end >= numPages || start > end) {
      throw new Error(
        `[@pdfme/manipulator] Invalid range: start=${start}, end=${end}, total pages=${numPages}`,
      );
    }

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(
      originalPdf,
      Array.from({ length: end - start + 1 }, (_, i) => i + start),
    );
    pages.forEach((page) => newPdf.addPage(page));
    result.push(await newPdf.save());
  }
  return result;
};

const remove = async (pdf: ArrayBuffer | Uint8Array, pages: number[]): Promise<Uint8Array> => {
  if (!pages.length) {
    throw new Error('[@pdfme/manipulator] At least one page number is required for removal');
  }

  const pdfDoc = await PDFDocument.load(pdf);
  const numPages = pdfDoc.getPageCount();

  if (pages.some((page) => page < 0 || page >= numPages)) {
    throw new Error(
      `[@pdfme/manipulator] Invalid page number: pages must be between 0 and ${numPages - 1}`,
    );
  }

  pages.sort((a, b) => b - a).forEach((pageIndex) => pdfDoc.removePage(pageIndex));
  return pdfDoc.save();
};

const insert = async (
  basePdf: ArrayBuffer | Uint8Array,
  inserts: { pdf: ArrayBuffer | Uint8Array; position: number }[],
): Promise<Uint8Array> => {
  inserts.sort((a, b) => a.position - b.position);

  let currentPdf = basePdf;
  let offset = 0;

  for (let i = 0; i < inserts.length; i++) {
    const { pdf, position } = inserts[i];
    const actualPos = position + offset;

    const basePdfDoc = await PDFDocument.load(currentPdf);
    const insertDoc = await PDFDocument.load(pdf);
    const numPages = basePdfDoc.getPageCount();

    if (actualPos < 0 || actualPos > numPages) {
      throw new Error(`[@pdfme/manipulator] Invalid position: must be between 0 and ${numPages}`);
    }

    const newPdfDoc = await PDFDocument.create();

    if (actualPos > 0) {
      const beforePages = await newPdfDoc.copyPages(
        basePdfDoc,
        Array.from({ length: actualPos }, (_, idx) => idx),
      );
      beforePages.forEach((page) => newPdfDoc.addPage(page));
    }

    const insertPages = await newPdfDoc.copyPages(insertDoc, insertDoc.getPageIndices());
    insertPages.forEach((page) => newPdfDoc.addPage(page));

    if (actualPos < numPages) {
      const afterPages = await newPdfDoc.copyPages(
        basePdfDoc,
        Array.from({ length: numPages - actualPos }, (_, idx) => idx + actualPos),
      );
      afterPages.forEach((page) => newPdfDoc.addPage(page));
    }

    currentPdf = await newPdfDoc.save();

    offset += insertDoc.getPageCount();
  }

  const pdfDoc = await PDFDocument.load(currentPdf);
  return pdfDoc.save();
};

const rotate = async (
  pdf: ArrayBuffer | Uint8Array,
  degrees: 0 | 90 | 180 | 270 | 360,
  pageNumbers?: number[],
): Promise<Uint8Array> => {
  if (!Number.isInteger(degrees) || degrees % 90 !== 0) {
    throw new Error('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  }

  const pdfDoc = await PDFDocument.load(pdf);
  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error('[@pdfme/manipulator] PDF has no pages to rotate');
  }

  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  if (normalizedDegrees % 90 !== 0) {
    throw new Error('[@pdfme/manipulator] Rotation degrees must be a multiple of 90');
  }

  if (pageNumbers) {
    if (pageNumbers.some((page) => page < 0 || page >= pages.length)) {
      throw new Error(
        `[@pdfme/manipulator] Invalid page number: pages must be between 0 and ${pages.length - 1}`,
      );
    }
  }

  const pagesToRotate = pageNumbers || pages.map((_, i) => i);
  pagesToRotate.forEach((pageNum) => {
    const page = pages[pageNum];
    if (page) {
      page.setRotation({
        type: RotationTypes.Degrees,
        angle: normalizedDegrees % 360,
      });
    }
  });
  return pdfDoc.save();
};

const move = async (
  pdf: ArrayBuffer | Uint8Array,
  operation: { from: number; to: number },
): Promise<Uint8Array> => {
  const { from, to } = operation;
  const pdfDoc = await PDFDocument.load(pdf);
  const currentPageCount = pdfDoc.getPageCount();

  if (from < 0 || from >= currentPageCount || to < 0 || to >= currentPageCount) {
    throw new Error(
      `[@pdfme/manipulator] Invalid page number: from=${from}, to=${to}, total pages=${currentPageCount}`,
    );
  }

  if (from === to) {
    return pdfDoc.save();
  }

  const page = pdfDoc.getPage(from);
  pdfDoc.removePage(from);

  const adjustedTo = from < to ? to - 1 : to;
  pdfDoc.insertPage(adjustedTo, page);

  return pdfDoc.save();
};

const organize = async (
  pdf: ArrayBuffer | Uint8Array,
  actions: Array<
    | { type: 'remove'; data: { position: number } }
    | { type: 'insert'; data: { pdf: ArrayBuffer | Uint8Array; position: number } }
    | { type: 'replace'; data: { pdf: ArrayBuffer | Uint8Array; position: number } }
    | { type: 'rotate'; data: { position: number; degrees: 0 | 90 | 180 | 270 | 360 } }
    | { type: 'move'; data: { from: number; to: number } }
  >,
): Promise<Uint8Array> => {
  if (!actions.length) {
    throw new Error('[@pdfme/manipulator] At least one action is required');
  }

  let currentPdf = await PDFDocument.load(pdf);

  for (const action of actions) {
    const currentBuffer = await currentPdf.save();

    switch (action.type) {
      case 'remove':
        currentPdf = await PDFDocument.load(await remove(currentBuffer, [action.data.position]));
        break;

      case 'insert':
        currentPdf = await PDFDocument.load(await insert(currentBuffer, [action.data]));
        break;

      case 'replace': {
        const withoutTarget = await remove(currentBuffer, [action.data.position]);
        currentPdf = await PDFDocument.load(await insert(withoutTarget, [action.data]));
        break;
      }

      case 'rotate':
        currentPdf = await PDFDocument.load(
          await rotate(currentBuffer, action.data.degrees, [action.data.position]),
        );
        break;

      case 'move':
        currentPdf = await PDFDocument.load(await move(currentBuffer, action.data));
        break;

      default:
        throw new Error(
          `[@pdfme/manipulator] Unknown action type: ${(action as { type: string }).type}`,
        );
    }
  }

  return currentPdf.save();
};

export { merge, split, remove, insert, rotate, move, organize };
