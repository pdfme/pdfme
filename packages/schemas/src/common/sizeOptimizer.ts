/**
 * Common size optimization utilities
 */

export interface SizeOptimizationOptions {
  initialSize: number;
  min: number;
  max: number;
  step?: number;
  shouldGrow?: (size: number) => boolean;
  shouldShrink?: (size: number) => boolean;
}

/**
 * Find optimal size by iteratively adjusting within constraints
 */
export function findOptimalSize(options: SizeOptimizationOptions): number {
  const { initialSize, min, max, step = 1, shouldGrow, shouldShrink } = options;
  let size = Math.min(Math.max(initialSize, min), max);

  // Growing phase
  if (shouldGrow) {
    while (size < max) {
      const nextSize = size + step;
      if (nextSize > max || !shouldGrow(nextSize)) {
        break;
      }
      size = nextSize;
    }
  }

  // Shrinking phase
  if (shouldShrink) {
    while (size > min && shouldShrink(size)) {
      size = Math.max(size - step, min);
    }
  }

  return size;
}

/**
 * Binary search for optimal size
 */
export function binarySearchOptimalSize(
  min: number,
  max: number,
  isValid: (size: number) => boolean,
  precision: number = 0.01
): number {
  let low = min;
  let high = max;
  let result = min;

  while (high - low > precision) {
    const mid = (low + high) / 2;
    if (isValid(mid)) {
      result = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return result;
}