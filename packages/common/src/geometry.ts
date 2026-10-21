/**
 * Page-bounds geometry for schema boxes.
 *
 * `position`, `width` and `height` always describe the un-rotated box. `rotate`
 * (degrees) pivots on the box centre, so the visible box shares that centre but
 * can be wider or narrower than the un-rotated one on each axis. Every bounds
 * check here works on the visible box.
 */

export type GeometryBox = {
  position: { x: number; y: number };
  width: number;
  height: number;
  rotate?: number;
};

export type Rect = { x: number; y: number; width: number; height: number };

export type Range = { min: number; max: number };

/** Page size plus the optional blank-PDF padding `[top, right, bottom, left]`. */
export type PageArea = {
  width: number;
  height: number;
  padding?: [number, number, number, number];
};

/**
 * @internal Exported so that @pdfme/ui uses the same tolerance. Not part of the public API.
 *
 * Tolerance in mm. The Designer stores geometry rounded to 2 decimals, so a value
 * this close to a limit counts as on it and is never moved.
 */
export const GEOMETRY_EPSILON = 0.01;

const PRECISION = 1e4;
const roundGeometry = (n: number) => Math.round(n * PRECISION) / PRECISION;

const getTrig = (rotate = 0) => {
  const angle = ((rotate % 360) + 360) % 360;
  // Exact values for right angles keep 90deg boxes free of float noise.
  if (angle % 90 === 0) {
    const cos = angle % 180 === 0 ? 1 : 0;
    return { cos, sin: 1 - cos };
  }
  const rad = (angle * Math.PI) / 180;
  return { cos: Math.abs(Math.cos(rad)), sin: Math.abs(Math.sin(rad)) };
};

const getLimits = (page: PageArea) => {
  const [top, right, bottom, left] = page.padding ?? [0, 0, 0, 0];
  return { left, top, right: page.width - right, bottom: page.height - bottom };
};

const toRange = (a: number, b: number): Range => {
  const min = roundGeometry(a);
  const max = roundGeometry(b);
  return min <= max ? { min, max } : { min: max, max: min };
};

/**
 * @internal Exported for @pdfme/ui. Not part of the public API.
 *
 * Clamp into a range, leaving values within GEOMETRY_EPSILON of it untouched.
 */
export const clampToRange = (value: number, { min, max }: Range): number => {
  if (value < min - GEOMETRY_EPSILON) return min;
  if (value > max + GEOMETRY_EPSILON) return max;
  return value;
};

/** The axis-aligned bounding box of the box as drawn after rotation. */
export const getRotatedBoundingBox = (box: GeometryBox): Rect => {
  const { position, width, height, rotate } = box;
  const { cos, sin } = getTrig(rotate);
  const visibleWidth = width * cos + height * sin;
  const visibleHeight = width * sin + height * cos;
  return {
    x: position.x + (width - visibleWidth) / 2,
    y: position.y + (height - visibleHeight) / 2,
    width: visibleWidth,
    height: visibleHeight,
  };
};

/**
 * Allowed `position.x` / `position.y` that keep the visible box inside the page
 * area at the box's current size and rotation. When the visible box is larger
 * than the area on an axis, the interval is swapped so the box can still move
 * between the two edges instead of being pinned to one of them.
 */
export const getPositionRange = (box: GeometryBox, page: PageArea): { x: Range; y: Range } => {
  const { left, top, right, bottom } = getLimits(page);
  const visible = getRotatedBoundingBox(box);
  const offsetX = visible.x - box.position.x;
  const offsetY = visible.y - box.position.y;
  return {
    x: toRange(left - offsetX, right - offsetX - visible.width),
    y: toRange(top - offsetY, bottom - offsetY - visible.height),
  };
};

export const clampPositionIntoPage = (
  box: GeometryBox,
  page: PageArea,
): { x: number; y: number } => {
  const range = getPositionRange(box, page);
  return {
    x: clampToRange(box.position.x, range.x),
    y: clampToRange(box.position.y, range.y),
  };
};

/** Whether the visible box lies inside the page area, within GEOMETRY_EPSILON. */
export const isWithinPage = (box: GeometryBox, page: PageArea): boolean => {
  const { left, top, right, bottom } = getLimits(page);
  const visible = getRotatedBoundingBox(box);
  return (
    visible.x >= left - GEOMETRY_EPSILON &&
    visible.y >= top - GEOMETRY_EPSILON &&
    visible.x + visible.width <= right + GEOMETRY_EPSILON &&
    visible.y + visible.height <= bottom + GEOMETRY_EPSILON
  );
};

/**
 * @internal Exported for @pdfme/ui. Not part of the public API.
 *
 * Largest `width` or `height` with the position and the other side held fixed;
 * `min` is always 0, so a size is never raised. Each visible edge is affine in the
 * size, so two samples give its slope. Only edges that move outward as the size
 * grows limit it, and an edge that is already out at size 0 is left to translation.
 */
export const getSizeRange = (box: GeometryBox, page: PageArea, key: 'width' | 'height'): Range => {
  const { left, top, right, bottom } = getLimits(page);
  const at0 = getRotatedBoundingBox({ ...box, [key]: 0 });
  const at1 = getRotatedBoundingBox({ ...box, [key]: 1 });
  const edges = [
    { start: at0.x, end: at1.x, limit: left, lower: true },
    { start: at0.y, end: at1.y, limit: top, lower: true },
    { start: at0.x + at0.width, end: at1.x + at1.width, limit: right, lower: false },
    { start: at0.y + at0.height, end: at1.y + at1.height, limit: bottom, lower: false },
  ];

  let max = Infinity;
  for (const { start, end, limit, lower } of edges) {
    const slope = end - start;
    // A lower edge limits growth only when it moves down (left/up); an upper edge when it moves up.
    if (lower ? slope >= -1e-9 : slope <= 1e-9) continue;
    const bound = (limit - start) / slope;
    if (bound >= 0) max = Math.min(max, bound);
  }
  return { min: 0, max: roundGeometry(max) };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * @internal Exported for @pdfme/ui. Not part of the public API.
 *
 * Fit an edited box into the page area. A box already inside is returned as is.
 * Otherwise:
 * 1. each size in `editedSizeKeys` is capped at its held-position maximum;
 * 2. the box is translated inside at its new size;
 * 3. with `shrink`, a visible box still larger than the area is scaled down to fit.
 * Without `shrink` (a move or a rotation), an oversized box keeps the swapped
 * position interval from `getPositionRange`. The result is rounded to 2 decimals.
 */
export const fitIntoPage = (
  box: GeometryBox,
  page: PageArea,
  options: { editedSizeKeys?: ('width' | 'height')[]; shrink?: boolean } = {},
): { position: { x: number; y: number }; width: number; height: number } => {
  if (isWithinPage(box, page)) {
    return { position: { ...box.position }, width: box.width, height: box.height };
  }

  const size = { width: box.width, height: box.height };
  for (const key of options.editedSizeKeys ?? []) {
    size[key] = clampToRange(size[key], getSizeRange({ ...box, ...size }, page, key));
  }
  let position = clampPositionIntoPage({ ...box, ...size }, page);

  if (options.shrink) {
    const { left, top, right, bottom } = getLimits(page);
    const visible = getRotatedBoundingBox({ ...box, ...size, position });
    const scale = Math.min(
      1,
      visible.width > 0 ? Math.max(0, right - left) / visible.width : 1,
      visible.height > 0 ? Math.max(0, bottom - top) / visible.height : 1,
    );
    if (scale < 1) {
      size.width *= scale;
      size.height *= scale;
      position = clampPositionIntoPage({ ...box, ...size, position }, page);
    }
  }

  return {
    position: { x: round2(position.x), y: round2(position.y) },
    width: round2(size.width),
    height: round2(size.height),
  };
};
