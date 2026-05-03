import type { PDFDocument, PDFPage } from '@pdfme/pdf-lib';
import { PDFName, PDFString } from '@pdfme/pdf-lib';

export type LinkAnnotationRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const addUriLinkAnnotation = (arg: {
  pdfDoc: PDFDocument;
  page: PDFPage;
  uri: string;
  rect: LinkAnnotationRect;
  borderWidth?: number;
}) => {
  const { pdfDoc, page, uri, rect, borderWidth = 0 } = arg;
  if (!uri || rect.width <= 0 || rect.height <= 0) return;

  const annotationRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
      Border: [0, 0, borderWidth],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(uri),
      },
    }),
  );

  page.node.addAnnot(annotationRef);
};
