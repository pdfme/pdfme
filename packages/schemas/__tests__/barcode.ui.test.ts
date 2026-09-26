// @vitest-environment jsdom

import { uiRender } from '../src/barcodes/uiRender.js';
import type { BarcodeSchema } from '../src/barcodes/types.js';

const getBarcodeSchema = (overrides: Partial<BarcodeSchema> = {}): BarcodeSchema => ({
  name: 'barcode',
  type: 'code128',
  content: '',
  position: { x: 0, y: 0 },
  width: 40,
  height: 20,
  backgroundColor: '#ffffff',
  barColor: '#000000',
  ...overrides,
});

const renderBarcodeContainer = async (schema: BarcodeSchema) => {
  const rootElement = document.createElement('div');
  await uiRender({
    value: '',
    schema,
    rootElement,
    mode: 'viewer',
    theme: { colorWhite: '#ffffff' },
  } as Parameters<typeof uiRender>[0]);
  return rootElement.firstElementChild as HTMLElement;
};

describe('barcode UI rendering', () => {
  test('applies the configured background color to the schema-sized container', async () => {
    const container = await renderBarcodeContainer(
      getBarcodeSchema({ backgroundColor: '#ff66cc' }),
    );
    expect(container.style.backgroundColor).toBe('rgb(255, 102, 204)');
  });

  test('accepts bwip-js style hex colors without a leading hash', async () => {
    const container = await renderBarcodeContainer(getBarcodeSchema({ backgroundColor: 'ff66cc' }));
    expect(container.style.backgroundColor).toBe('rgb(255, 102, 204)');
  });

  test('keeps the container transparent when no background color is set', async () => {
    const container = await renderBarcodeContainer(getBarcodeSchema({ backgroundColor: '' }));
    expect(container.style.backgroundColor).toBe('transparent');
  });
});
