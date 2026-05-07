import type { PropPanelSchema } from '@pdfme/common';

export type BoxDimension = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type BoxStyleSchema = {
  borderWidth?: Partial<BoxDimension>;
  padding?: Partial<BoxDimension>;
};

export type BoxLikeSchema = BoxStyleSchema & {
  position: { x: number; y: number };
  width: number;
  height: number;
};

export const createBoxDimension = (value = 0): BoxDimension => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

export const normalizeBoxDimension = (value?: Partial<BoxDimension>): BoxDimension => ({
  top: value?.top ?? 0,
  right: value?.right ?? 0,
  bottom: value?.bottom ?? 0,
  left: value?.left ?? 0,
});

export const getBoxInsets = (schema: BoxStyleSchema) => ({
  borderWidth: normalizeBoxDimension(schema.borderWidth),
  padding: normalizeBoxDimension(schema.padding),
});

export const getBoxHorizontalInset = (schema: BoxStyleSchema) => {
  const { borderWidth, padding } = getBoxInsets(schema);
  return borderWidth.left + borderWidth.right + padding.left + padding.right;
};

export const getBoxVerticalInset = (schema: BoxStyleSchema) => {
  const { borderWidth, padding } = getBoxInsets(schema);
  return borderWidth.top + borderWidth.bottom + padding.top + padding.bottom;
};

export const getBoxContentArea = <T extends BoxLikeSchema>(schema: T) => {
  const { borderWidth, padding } = getBoxInsets(schema);
  const leftInset = borderWidth.left + padding.left;
  const topInset = borderWidth.top + padding.top;
  const rightInset = borderWidth.right + padding.right;
  const bottomInset = borderWidth.bottom + padding.bottom;

  return {
    position: {
      x: schema.position.x + leftInset,
      y: schema.position.y + topInset,
    },
    width: Math.max(0, schema.width - leftInset - rightInset),
    height: Math.max(0, schema.height - topInset - bottomInset),
    leftInset,
    topInset,
    rightInset,
    bottomInset,
  };
};

export const hasBoxDimension = (dimension?: Partial<BoxDimension>) => {
  const resolved = normalizeBoxDimension(dimension);
  return resolved.top > 0 || resolved.right > 0 || resolved.bottom > 0 || resolved.left > 0;
};

export const getSplitBoxDimension = (
  dimension: Partial<BoxDimension> | undefined,
  range: { start: number; end?: number },
  totalUnits: number,
): BoxDimension => {
  const resolved = normalizeBoxDimension(dimension);
  const end = range.end ?? totalUnits;
  return {
    top: range.start === 0 ? resolved.top : 0,
    right: resolved.right,
    bottom: end >= totalUnits ? resolved.bottom : 0,
    left: resolved.left,
  };
};

export const getBoxDimensionPropPanelSchema = (step = 1): Record<string, PropPanelSchema> => {
  const getCommonProp = (): PropPanelSchema => ({
    type: 'number',
    widget: 'inputNumber',
    props: { min: 0, step },
    span: 6,
  });
  return {
    top: { title: 'Top', ...getCommonProp() },
    right: { title: 'Right', ...getCommonProp() },
    bottom: { title: 'Bottom', ...getCommonProp() },
    left: { title: 'Left', ...getCommonProp() },
  };
};
