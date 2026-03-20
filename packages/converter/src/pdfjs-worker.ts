type Uint8ArrayPrototypeWithToHex = Uint8Array & {
  toHex?: () => string;
};

const uint8ArrayPrototype = Uint8Array.prototype as Uint8ArrayPrototypeWithToHex;

if (!uint8ArrayPrototype.toHex) {
  Object.defineProperty(Uint8Array.prototype, 'toHex', {
    configurable: true,
    value() {
      let result = '';

      for (let i = 0; i < this.length; i += 1) {
        const hex = this[i].toString(16);
        result += hex.length === 1 ? `0${hex}` : hex;
      }

      return result;
    },
    writable: true,
  });
}

void import('pdfjs-dist/build/pdf.worker.mjs');
