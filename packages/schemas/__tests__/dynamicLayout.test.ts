import { describe, expect, it } from 'vitest';
import type { Schema } from '@pdfme/common';
import { hasDynamicLayoutSchema } from '../src/dynamicLayout.js';

const schema = (over: Partial<Schema>): Schema => ({
  name: 'f',
  type: 'text',
  position: { x: 0, y: 0 },
  width: 10,
  height: 10,
  ...over,
});

describe('hasDynamicLayoutSchema', () => {
  it('is false for templates with only fixed-size schemas', () => {
    expect(hasDynamicLayoutSchema([[schema({})], []])).toBe(false);
    expect(hasDynamicLayoutSchema([])).toBe(false);
  });

  it('detects tables, lists and expanding text on any page', () => {
    expect(hasDynamicLayoutSchema([[schema({})], [schema({ type: 'table' })]])).toBe(true);
    expect(hasDynamicLayoutSchema([[schema({ type: 'list' })]])).toBe(true);
    expect(hasDynamicLayoutSchema([[schema({ overflow: 'expand' } as Partial<Schema>)]])).toBe(
      true,
    );
  });
});
