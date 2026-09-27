import generate from '../src/generate.js';
import { getDefaultFont, Template } from '@pdfme/common';
import { text } from '@pdfme/schemas';

describe('generate with invalid custom font data (#1636)', () => {
  test('rejects once without emitting an unhandled rejection', async () => {
    const template: Template = {
      basePdf: { width: 100, height: 50, padding: [0, 0, 0, 0] },
      schemas: [
        [
          {
            name: 'missing',
            type: 'text',
            content: 'x',
            position: { x: 10, y: 10 },
            width: 80,
            height: 12,
            fontName: 'MissingFont',
          },
        ],
      ],
    };

    // Temporarily take over unhandled-rejection reporting so we can assert on it.
    const originalListeners = process.listeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    const unhandled: unknown[] = [];
    const capture = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', capture);

    try {
      await expect(
        generate({
          template,
          // The font embed path is only reached when the field has a non-empty value.
          inputs: [{ missing: 'x' }],
          plugins: { text },
          options: {
            font: { ...getDefaultFont(), MissingFont: { fallback: false, data: 'not-a-font' } },
          },
        }),
      ).rejects.toThrow('Unknown font format');

      // Node only reports unhandled rejections after the microtask queue drains,
      // so cross macrotask boundaries before asserting nothing leaked.
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(unhandled).toEqual([]);
    } finally {
      process.removeListener('unhandledRejection', capture);
      for (const listener of originalListeners) {
        process.on('unhandledRejection', listener);
      }
    }
  });
});
