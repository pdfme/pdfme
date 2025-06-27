/**
 * Common unit conversion utilities
 */

// Conversion constants
export const MM_TO_PT_RATIO = 2.83465;
export const MM_TO_PX_RATIO = 3.77953;
export const PT_TO_PX_RATIO = 1.33333;

/**
 * Convert millimeters to points
 */
export const mm2pt = (mm: number): number => mm * MM_TO_PT_RATIO;

/**
 * Convert points to millimeters
 */
export const pt2mm = (pt: number): number => pt / MM_TO_PT_RATIO;

/**
 * Convert millimeters to pixels
 */
export const mm2px = (mm: number): number => mm * MM_TO_PX_RATIO;

/**
 * Convert pixels to millimeters
 */
export const px2mm = (px: number): number => px / MM_TO_PX_RATIO;

/**
 * Convert points to pixels
 */
export const pt2px = (pt: number): number => pt * PT_TO_PX_RATIO;

/**
 * Convert pixels to points
 */
export const px2pt = (px: number): number => px / PT_TO_PX_RATIO;

/**
 * Scale ratio calculator
 */
export const calculateScaleRatio = (
  targetValue: number,
  currentTotal: number,
  remainingTotal: number
): number => {
  if (remainingTotal === 0) return 0;
  return (currentTotal - targetValue) / remainingTotal;
};