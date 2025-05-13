import { toMatchImageSnapshot } from 'jest-image-snapshot';
expect.extend({ toMatchImageSnapshot });

if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
    static fromMatrix() { return new global.DOMMatrix(); }
    static fromFloat32Array() { return new global.DOMMatrix(); }
    static fromFloat64Array() { return new global.DOMMatrix(); }
  };
}
