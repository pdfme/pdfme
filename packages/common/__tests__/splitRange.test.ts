import { describe, expect, test } from 'vitest';
import { createDynamicLayoutSplitRange, getDynamicLayoutSplitRange } from '../src/index.js';
import { Schema } from '../src/schema.js';

describe('dynamic layout split range', () => {
  test('creates a generic split range', () => {
    expect(createDynamicLayoutSplitRange('textLine', 1, 3)).toEqual({
      unit: 'textLine',
      start: 1,
      end: 3,
    });
  });

  test('reads matching ranges and ignores non-matching units', () => {
    const schema = {
      __splitRange: { unit: 'textLine', start: 2, end: 4 },
    };

    expect(getDynamicLayoutSplitRange(schema, 'textLine')).toEqual({
      start: 2,
      end: 4,
    });
    expect(getDynamicLayoutSplitRange(schema, 'listItem')).toBeUndefined();
  });

  test('requires non-empty split range units', () => {
    const result = Schema.safeParse({
      name: 'field',
      type: 'text',
      content: '',
      position: { x: 0, y: 0 },
      width: 10,
      height: 10,
      __splitRange: { unit: '', start: 0 },
    });

    expect(result.success).toBe(false);
  });
});
