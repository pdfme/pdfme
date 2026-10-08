// @vitest-environment jsdom

import { uiRender } from '../src/barcodes/uiRender.js';
import type { BarcodeSchema } from '../src/barcodes/types.js';

vi.mock('../src/barcodes/helper.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/barcodes/helper.js')>();
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  return {
    ...actual,
    createBarCode: async () => tinyPng,
  };
});

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

const renderBarcodeContainer = async (schema: BarcodeSchema, value = '') => {
  const rootElement = document.createElement('div');
  await uiRender({
    value,
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

  test('locked types render an SVG image with object-fit contain', async () => {
    const container = await renderBarcodeContainer(
      getBarcodeSchema({ type: 'qrcode', width: 60, height: 30 }),
      'https://pdfme.com/',
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.style.objectFit).toBe('contain');
    expect(img?.src.startsWith('data:image/svg+xml')).toBe(true);
  });

  test('1D types render a stretched PNG', async () => {
    const container = await renderBarcodeContainer(
      getBarcodeSchema({ type: 'code128', width: 60, height: 30 }),
      'ABC-123',
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src.startsWith('data:image/png')).toBe(true);
    expect(img?.style.objectFit).not.toBe('contain');
  });
});
