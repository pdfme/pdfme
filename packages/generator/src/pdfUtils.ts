import { PDFPage, PDFDocument, PDFEmbeddedPage, TransformationMatrix } from '@pdfme/pdf-lib';
import { getB64BasePdf, BasePdf } from '@pdfme/common';
import type { EmbedPdfBox } from './types';

export const getEmbeddedPagesAndEmbedPdfBoxes = async (arg: {
  pdfDoc: PDFDocument;
  basePdf: BasePdf;
}) => {
  const { pdfDoc, basePdf } = arg;
  let embeddedPages: PDFEmbeddedPage[] = [];
  let embedPdfBoxes: EmbedPdfBox[] = [];
  const willLoadPdf = typeof basePdf === 'string' ? await getB64BasePdf(basePdf) : basePdf;
  const embedPdf = await PDFDocument.load(willLoadPdf);
  const embedPdfPages = embedPdf.getPages();

  embedPdfBoxes = embedPdfPages.map((p) => ({
    mediaBox: p.getMediaBox(),
    bleedBox: p.getBleedBox(),
    trimBox: p.getTrimBox(),
  }));

  const boundingBoxes = embedPdfPages.map((p) => {
    const { x, y, width, height } = p.getMediaBox();

    return { left: x, bottom: y, right: width, top: height + y };
  });

  const transformationMatrices = embedPdfPages.map(
    () => [1, 0, 0, 1, 0, 0] as TransformationMatrix
  );

  embeddedPages = await pdfDoc.embedPages(embedPdfPages, boundingBoxes, transformationMatrices);

  return { embeddedPages, embedPdfBoxes };
};

export const drawEmbeddedPage = (arg: {
  page: PDFPage;
  embeddedPage: PDFEmbeddedPage;
  embedPdfBox: EmbedPdfBox;
}) => {
  const { page, embeddedPage, embedPdfBox } = arg;
  page.drawPage(embeddedPage);
  const { mediaBox: mb, bleedBox: bb, trimBox: tb } = embedPdfBox;
  page.setMediaBox(mb.x, mb.y, mb.width, mb.height);
  page.setBleedBox(bb.x, bb.y, bb.width, bb.height);
  page.setTrimBox(tb.x, tb.y, tb.width, tb.height);
};
