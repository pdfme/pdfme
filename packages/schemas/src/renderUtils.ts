import { degrees, degreesToRadians } from '@pdfme/pdf-lib';
import { Schema, mm2pt } from '@pdfme/common';

export const convertForPdfLayoutProps = ({
  schema,
  pageHeight,
  applyRotateTranslate = true,
}: {
  schema: Schema;
  pageHeight: number;
  applyRotateTranslate?: boolean;
}) => {
  const { width: mmWidth, height: mmHeight, position, rotate } = schema;
  const { x: mmX, y: mmY } = position;

  const rotateDegrees = rotate ? -rotate : 0;
  const width = mm2pt(mmWidth);
  const height = mm2pt(mmHeight);
  let x = mm2pt(mmX);
  // PDF coordinate system is from bottom left, UI is top left, so we need to flip the y axis
  let y = pageHeight - mm2pt(mmY) - height;

  if (rotateDegrees && applyRotateTranslate) {
    // If rotating we must pivot around the same point as the UI performs its rotation.
    // The UI performs rotation around the objects center point (the pivot point below),
    // pdflib rotates around the bottom left corner of the object.
    // We must therefore adjust the X and Y by rotating the bottom left corner by this pivot point.
    const pivotPoint = { x: x + width / 2, y: pageHeight - mm2pt(mmY) - height / 2 };
    const rotatedPoint = rotatePoint({ x, y }, pivotPoint, rotateDegrees);
    x = rotatedPoint.x;
    y = rotatedPoint.y;
  }

  return {
    position: {
      x: x,
      y: y,
    },
    height: height,
    width: width,
    rotate: degrees(rotateDegrees),
  };
};

export const rotatePoint = (
  point: { x: number; y: number },
  pivot: { x: number; y: number },
  angleDegrees: number
): { x: number; y: number } => {
  const angleRadians = degreesToRadians(angleDegrees);

  const x =
    Math.cos(angleRadians) * (point.x - pivot.x) -
    Math.sin(angleRadians) * (point.y - pivot.y) +
    pivot.x;
  const y =
    Math.sin(angleRadians) * (point.x - pivot.x) +
    Math.cos(angleRadians) * (point.y - pivot.y) +
    pivot.y;

  return { x, y };
};
