import { createBarCode, resolveBarcodeRenderRuntime } from '../src/barcodes/helper.js';

const mocks = vi.hoisted(() => {
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const toCanvas = vi.fn((canvas: { width: number; height: number }) => {
    canvas.width = 21;
    canvas.height = 21;
  });
  const toBuffer = vi.fn(async () => pngMagic);
  return {
    pngMagic,
    toCanvas,
    toBuffer,
    bwipjs: {
      toCanvas,
      toBuffer,
    } as {
      toCanvas?: typeof toCanvas;
      toBuffer?: typeof toBuffer;
    },
  };
});

vi.mock('bwip-js', () => ({
  default: mocks.bwipjs,
}));

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {};
  }

  async convertToBlob() {
    return new Blob([new Uint8Array(PNG_MAGIC)], { type: 'image/png' });
  }
}

const restoreBwipjs = () => {
  mocks.bwipjs.toCanvas = mocks.toCanvas;
  mocks.bwipjs.toBuffer = mocks.toBuffer;
};

describe('createBarCode Worker path', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.toCanvas.mockClear();
    mocks.toBuffer.mockClear();
    restoreBwipjs();
  });

  test('renders via OffscreenCanvas and does not call toBuffer', async () => {
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

    const buffer = await createBarCode({
      type: 'qrcode',
      input: 'https://pdfme.com/worker',
      width: 10,
      height: 10,
      backgroundColor: 'ffffff',
    });

    expect(resolveBarcodeRenderRuntime()).toBe('offscreencanvas');
    expect(mocks.toBuffer).not.toHaveBeenCalled();
    expect(mocks.toCanvas).toHaveBeenCalledTimes(1);
    expect(mocks.toCanvas.mock.calls[0][0]).toBeInstanceOf(MockOffscreenCanvas);
    expect(buffer.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });
});

describe('createBarCode Node export with OffscreenCanvas', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.toCanvas.mockClear();
    mocks.toBuffer.mockClear();
    restoreBwipjs();
  });

  test('falls back to toBuffer when OffscreenCanvas exists but toCanvas does not', async () => {
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);
    delete mocks.bwipjs.toCanvas;

    expect(resolveBarcodeRenderRuntime()).toBe('node-buffer');

    const buffer = await createBarCode({
      type: 'qrcode',
      input: 'https://pdfme.com/node-export',
      width: 10,
      height: 10,
    });

    expect(mocks.toCanvas).not.toHaveBeenCalled();
    expect(mocks.toBuffer).toHaveBeenCalledTimes(1);
    expect(buffer.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });
});

describe('createBarCode missing capabilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mocks.toCanvas.mockClear();
    mocks.toBuffer.mockClear();
    restoreBwipjs();
  });

  test('throws a capability error instead of toBuffer is not a function', async () => {
    delete mocks.bwipjs.toBuffer;

    await expect(
      createBarCode({
        type: 'qrcode',
        input: 'https://pdfme.com/worker',
        width: 10,
        height: 10,
      }),
    ).rejects.toThrow(
      '[@pdfme/schemas] Barcode rendering requires a document canvas, OffscreenCanvas, or bwip-js toBuffer().',
    );
    expect(mocks.toBuffer).not.toHaveBeenCalled();
  });
});
