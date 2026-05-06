import type { DynamicLayoutRange, DynamicLayoutSplitRange } from './types.js';

export const createDynamicLayoutSplitRange = (
  unit: string,
  start: number,
  end?: number,
): DynamicLayoutSplitRange => ({
  unit,
  start,
  ...(end === undefined ? {} : { end }),
});

export const getDynamicLayoutSplitRange = (
  schema: { __splitRange?: DynamicLayoutSplitRange },
  unit: string,
  fallback?: DynamicLayoutRange,
): DynamicLayoutRange | undefined => {
  const range = schema.__splitRange;
  if (range?.unit !== unit) return fallback;

  return {
    start: range.start,
    ...(range.end === undefined ? {} : { end: range.end }),
  };
};
