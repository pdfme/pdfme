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

/** Clamp into a range, leaving values within GEOMETRY_EPSILON of it untouched. */
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

/**
 * Allowed `width` or `height` with the position and the other side held fixed.
 * Each visible edge is affine in the size, so two samples give its slope and
 * every page edge turns into a lower or upper bound.
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

  let min = 0;
  let max = Infinity;
  for (const { start, end, limit, lower } of edges) {
    const slope = end - start;
    if (Math.abs(slope) < 1e-9) continue;
    const bound = (limit - start) / slope;
    // A lower edge must stay >= limit and an upper edge <= limit; a negative slope flips it.
    if (lower === slope > 0) min = Math.max(min, bound);
    else max = Math.min(max, bound);
  }
  return toRange(min, max);
};

/**
 * Fit a box into the page area: translate first, then shrink.
 *
 * The position is clamped at `positionSize` (default: the box's own size). Pass
 * the size from before an edit so a resize that overflows shrinks back instead of
 * pushing the box away. The size is then clamped with that position held, and a
 * final translation covers boxes that cannot fit at their clamped position.
 */
export const fitIntoPage = (
  box: GeometryBox,
  page: PageArea,
  options: { positionSize?: { width: number; height: number } } = {},
): { position: { x: number; y: number }; width: number; height: number } => {
  let position = clampPositionIntoPage({ ...box, ...options.positionSize }, page);
  const width = Math.max(
    0,
    clampToRange(box.width, getSizeRange({ ...box, position }, page, 'width')),
  );
  const height = Math.max(
    0,
    clampToRange(box.height, getSizeRange({ ...box, position, width }, page, 'height')),
  );
  position = clampPositionIntoPage({ ...box, position, width, height }, page);
  return { position, width, height };
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
