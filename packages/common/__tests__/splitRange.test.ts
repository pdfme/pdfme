import { describe, expect, test } from 'vitest';
import { createDynamicLayoutSplitRange, getDynamicLayoutSplitRange } from '../src/index.js';

describe('dynamic layout split range', () => {
  test('creates a generic split range', () => {
    expect(createDynamicLayoutSplitRange('textLine', 1, 3)).toEqual({
      unit: 'textLine',
      start: 1,
      end: 3,
    });
  });

  test('reads matching ranges and falls back for non-matching units', () => {
    const schema = {
      __splitRange: { unit: 'textLine', start: 2, end: 4 },
    };
    const fallback = { start: 0, end: 1 };

    expect(getDynamicLayoutSplitRange(schema, 'textLine', fallback)).toEqual({
      start: 2,
      end: 4,
    });
    expect(getDynamicLayoutSplitRange(schema, 'listItem', fallback)).toEqual(fallback);
  });
});
