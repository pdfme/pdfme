import type { Gradient, GradientColorStop } from './types.js';
import {
  DEFAULT_GRADIENT_START_OFFSET,
  DEFAULT_GRADIENT_END_OFFSET,
} from './constants.js';

/**
 * Get gradient color stops with fallback to default values
 */
export const getGradientColorStops = (
  gradient: Gradient | undefined,
  fallbackColor: string,
): GradientColorStop[] => {
  if (gradient?.colorStops && gradient.colorStops.length > 0) {
    return gradient.colorStops;
  }
  return [
    { offset: DEFAULT_GRADIENT_START_OFFSET, color: fallbackColor },
    { offset: DEFAULT_GRADIENT_END_OFFSET, color: fallbackColor },
  ];
};

/**
 * Check if gradient is active (not none and has valid type)
 */
export const isGradientActive = (gradient: Gradient | undefined): boolean => {
  return !!(gradient?.type && gradient.type !== 'none');
};

