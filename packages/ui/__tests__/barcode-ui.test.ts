import { barcodes } from '@pdfme/schemas';

describe('barcode UI rendering', () => {
  test('uses the configured background color for the schema-sized preview container', async () => {
    const rootElement = document.createElement('div');

    await barcodes.code128.ui?.({
      value: '',
      rootElement,
      mode: 'viewer',
      schema: {
        id: 'barcode-bg',
        name: 'barcode',
        type: 'code128',
        content: '',
        position: { x: 0, y: 0 },
        width: 40,
        height: 20,
        backgroundColor: '#ff66cc',
        barColor: '#000000',
      },
      theme: { colorWhite: '#ffffff' },
    } as Parameters<NonNullable<typeof barcodes.code128.ui>>[0]);

    expect((rootElement.firstElementChild as HTMLElement | null)?.style.backgroundColor).toBe(
      'rgb(255, 102, 204)',
    );
  });
});
