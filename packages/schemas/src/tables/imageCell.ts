import { Buffer } from 'buffer';
import { hashImageDataUrl, getImageDimension } from '../graphics/imagehelper.js';
import {
  detectImageFormat,
  getJpegOrientation,
  getPngOrientation,
  orientationSwapsDimensions,
} from '../graphics/orientation.js';
import type { ImageObjectPosition } from '../graphics/image.js';
import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types.js';
import {
  DEFAULT_TABLE_IMAGE_HEIGHT,
  DEFAULT_TABLE_IMAGE_HEIGHT_MODE,
  TABLE_IMAGE_DATA_URL_PATTERN,
} from './constants.js';
import { TABLE_CELL_TYPES, type TableCellType, type TableImageHeightMode } from './types.js';

export type TableImageDimension = { width: number; height: number };

const DIMENSION_CACHE_PREFIX = 'tableImageDim:';
const WARN_CACHE_PREFIX = 'tableImageWarned:';

const isTableCellType = (value: unknown): value is TableCellType =>
  typeof value === 'string' && TABLE_CELL_TYPES.some((cellType) => cellType === value);

const isDimension = (value: unknown): value is TableImageDimension => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.width === 'number' && typeof record.height === 'number';
};

const dataUrlToBytes = (value: string): Uint8Array => {
  const marker = ';base64,';
  const index = value.indexOf(marker);
  const base64 = index >= 0 ? value.slice(index + marker.length) : value;
  return new Uint8Array(Buffer.from(base64, 'base64'));
};

const applyOrientation = (
  dimension: TableImageDimension,
  bytes: Uint8Array,
): TableImageDimension => {
  const format = detectImageFormat(bytes);
  const orientation =
    format === 'jpeg'
      ? getJpegOrientation(bytes)
      : format === 'png'
        ? getPngOrientation(bytes)
        : undefined;
  // image.pdf bakes EXIF into the embedded pixels, so measurement has to swap too.
  if (orientation !== undefined && orientationSwapsDimensions(orientation)) {
    return { width: dimension.height, height: dimension.width };
  }
  return dimension;
};

export const isTableImageDataUrl = (value: string): boolean =>
  TABLE_IMAGE_DATA_URL_PATTERN.test(value);

export const resolveImageDimension = (
  value: string,
  cache: Map<string | number, unknown>,
): TableImageDimension | undefined => {
  if (!isTableImageDataUrl(value)) return undefined;
  const key = `${DIMENSION_CACHE_PREFIX}${hashImageDataUrl(value)}`;
  const cached = cache.get(key);
  if (isDimension(cached)) return cached;
  try {
    const dimension = applyOrientation(getImageDimension(value), dataUrlToBytes(value));
    cache.set(key, dimension);
    return dimension;
  } catch {
    return undefined;
  }
};

export const warnInvalidTableImageOnce = (
  value: string | null | undefined,
  columnIndex: number,
  cache: Map<string | number, unknown>,
) => {
  if (value == null || value === '') return;
  const key = `${WARN_CACHE_PREFIX}${hashImageDataUrl(value)}`;
  if (cache.has(key)) return;
  cache.set(key, true);
  console.warn(
    `[@pdfme/schemas/table] unsupported image in column ${columnIndex}; only PNG/JPEG data URL is supported`,
  );
};

export const normalizeTableCellType = (
  value: unknown,
  columnIndex: number,
  cache: Map<string | number, unknown>,
): TableCellType | undefined => {
  if (value === undefined) return undefined;
  if (isTableCellType(value)) return value;
  const warnKey = `tableCellTypeWarned:${String(value)}`;
  if (!cache.has(warnKey)) {
    cache.set(warnKey, true);
    console.warn(
      `[@pdfme/schemas/table] unsupported cell type "${String(value)}" in column ${columnIndex}; treating as text`,
    );
  }
  return 'text';
};

export const normalizeTableImageHeightMode = (value: unknown): TableImageHeightMode | undefined =>
  value === 'fixed' || value === 'auto' ? value : undefined;

export const normalizeTableImageHeight = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const getTableImageObjectPosition = (
  alignment: ALIGNMENT | undefined,
  verticalAlignment: VERTICAL_ALIGNMENT | undefined,
): ImageObjectPosition => {
  const horizontal = alignment === 'center' || alignment === 'right' ? alignment : 'left';
  const vertical =
    verticalAlignment === 'top' ? 'top' : verticalAlignment === 'bottom' ? 'bottom' : 'center';
  return `${horizontal} ${vertical}`;
};

export const resolveFixedTableImageHeight = (imageHeight: number | undefined): number =>
  typeof imageHeight === 'number' && Number.isFinite(imageHeight) && imageHeight > 0
    ? imageHeight
    : DEFAULT_TABLE_IMAGE_HEIGHT;

/**
 * Fixed height is kept for empty and invalid values so rows in the column stay aligned.
 * Auto height is 0 unless a PNG/JPEG data URL resolves.
 */
export const resolveTableImageContentHeight = (arg: {
  value: string;
  mode: TableImageHeightMode | undefined;
  imageHeight: number | undefined;
  contentWidth: number;
  columnIndex: number;
  cache: Map<string | number, unknown>;
}): number => {
  const mode = arg.mode ?? DEFAULT_TABLE_IMAGE_HEIGHT_MODE;
  if (!arg.value) {
    return mode === 'auto' ? 0 : resolveFixedTableImageHeight(arg.imageHeight);
  }
  const dimension = resolveImageDimension(arg.value, arg.cache);
  if (!dimension || dimension.width <= 0) {
    warnInvalidTableImageOnce(arg.value, arg.columnIndex, arg.cache);
    return mode === 'auto' ? 0 : resolveFixedTableImageHeight(arg.imageHeight);
  }
  if (mode === 'auto') {
    return (arg.contentWidth * dimension.height) / dimension.width;
  }
  return resolveFixedTableImageHeight(arg.imageHeight);
};
