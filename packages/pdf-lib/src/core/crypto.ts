/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { arrayAsString, isArrayEqual } from '../utils/arrays';
import { stringAsByteArray } from '../utils/strings';
import PDFBool from './objects/PDFBool.js';
import PDFDict from './objects/PDFDict.js';
import PDFName from './objects/PDFName.js';
import PDFNumber from './objects/PDFNumber.js';
import PDFString from './objects/PDFString.js';
import DecryptStream from './streams/DecryptStream.js';
import { StreamType } from './streams/Stream.js';

class ARCFourCipher {
  private s: Uint8Array;
  private a: number;
  private b: number;

  constructor(key: Uint8Array) {
    this.a = 0;
    this.b = 0;
    const s = new Uint8Array(256);
    const keyLength = key.length;

    for (let i = 0; i < 256; ++i) {
      s[i] = i;
    }
    for (let i = 0, j = 0; i < 256; ++i) {
      const tmp = s[i];
      j = (j + tmp + key[i % keyLength]) & 0xff;
      s[i] = s[j];
      s[j] = tmp;
    }
    this.s = s;
  }

  encryptBlock(data: Uint8Array) {
    let a = this.a,
      b = this.b;
    const s = this.s;
    const n = data.length;
    const output = new Uint8Array(n);
    for (let i = 0; i < n; ++i) {
      a = (a + 1) & 0xff;
      const tmp = s[a];
      b = (b + tmp) & 0xff;
      const tmp2 = s[b];
      s[a] = tmp2;
      s[b] = tmp;
      output[i] = data[i] ^ s[(tmp + tmp2) & 0xff];
    }
    this.a = a;
    this.b = b;
    return output;
  }

  decryptBlock(data: Uint8Array) {
    return this.encryptBlock(data);
  }

  encrypt(data: Uint8Array) {
    return this.encryptBlock(data);
  }
}

const calculateMD5 = (function calculateMD5Closure() {
  const r = new Uint8Array([
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]);

  const k = new Int32Array([
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983,
    1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329,
    -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734,
    -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640,
    681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799,
    1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551,
  ]);

  function hash(data: Uint8Array, offset: number, length: number) {
    let h0 = 1732584193,
      h1 = -271733879,
      h2 = -1732584194,
      h3 = 271733878;
    // pre-processing
    const paddedLength = (length + 72) & ~63; // data + 9 extra bytes
    const padded = new Uint8Array(paddedLength);
    let i, j;
    for (i = 0; i < length; ++i) {
      padded[i] = data[offset++];
    }
    padded[i++] = 0x80;
    const n = paddedLength - 8;
    while (i < n) {
      padded[i++] = 0;
    }
    padded[i++] = (length << 3) & 0xff;
    padded[i++] = (length >> 5) & 0xff;
    padded[i++] = (length >> 13) & 0xff;
    padded[i++] = (length >> 21) & 0xff;
    padded[i++] = (length >>> 29) & 0xff;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    const w = new Int32Array(16);
    for (i = 0; i < paddedLength; ) {
      for (j = 0; j < 16; ++j, i += 4) {
        w[j] = padded[i] | (padded[i + 1] << 8) | (padded[i + 2] << 16) | (padded[i + 3] << 24);
      }
      let a = h0,
        b = h1,
        c = h2,
        d = h3,
        f,
        g;
      for (j = 0; j < 64; ++j) {
        if (j < 16) {
          f = (b & c) | (~b & d);
          g = j;
        } else if (j < 32) {
          f = (d & b) | (~d & c);
          g = (5 * j + 1) & 15;
        } else if (j < 48) {
          f = b ^ c ^ d;
          g = (3 * j + 5) & 15;
        } else {
          f = c ^ (b | ~d);
          g = (7 * j) & 15;
        }
        const tmp = d,
          rotateArg = (a + f + k[j] + w[g]) | 0,
          rotate = r[j];
        d = c;
        c = b;
        b = (b + ((rotateArg << rotate) | (rotateArg >>> (32 - rotate)))) | 0;
        a = tmp;
      }
      h0 = (h0 + a) | 0;
      h1 = (h1 + b) | 0;
      h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0;
    }
    // prettier-ignore
    return new Uint8Array([
      h0 & 0xFF, (h0 >> 8) & 0xFF, (h0 >> 16) & 0xFF, (h0 >>> 24) & 0xFF,
      h1 & 0xFF, (h1 >> 8) & 0xFF, (h1 >> 16) & 0xFF, (h1 >>> 24) & 0xFF,
      h2 & 0xFF, (h2 >> 8) & 0xFF, (h2 >> 16) & 0xFF, (h2 >>> 24) & 0xFF,
      h3 & 0xFF, (h3 >> 8) & 0xFF, (h3 >> 16) & 0xFF, (h3 >>> 24) & 0xFF
    ]);
  }

  return hash;
})();

class Word64 {
  private low: number;
  private high: number;

  constructor(highInteger: number, lowInteger: number) {
    this.high = highInteger | 0;
    this.low = lowInteger | 0;
  }

  and(word: Word64) {
    this.high &= word.high;
    this.low &= word.low;
  }

  xor(word: Word64) {
    this.high ^= word.high;
    this.low ^= word.low;
  }

  or(word: Word64) {
    this.high |= word.high;
    this.low |= word.low;
  }

  shiftRight(places: number) {
    if (places >= 32) {
      this.low = (this.high >>> (places - 32)) | 0;
      this.high = 0;
    } else {
      this.low = (this.low >>> places) | (this.high << (32 - places));
      this.high = (this.high >>> places) | 0;
    }
  }

  shiftLeft(places: number) {
    if (places >= 32) {
      this.high = this.low << (places - 32);
      this.low = 0;
    } else {
      this.high = (this.high << places) | (this.low >>> (32 - places));
      this.low <<= places;
    }
  }

  rotateRight(places: number) {
    let low, high;
    if (places & 32) {
      high = this.low;
      low = this.high;
    } else {
      low = this.low;
      high = this.high;
    }
    places &= 31;
    this.low = (low >>> places) | (high << (32 - places));
    this.high = (high >>> places) | (low << (32 - places));
  }

  not() {
    this.high = ~this.high;
    this.low = ~this.low;
  }

  add(word: Word64) {
    const lowAdd = (this.low >>> 0) + (word.low >>> 0);
    let highAdd = (this.high >>> 0) + (word.high >>> 0);
    if (lowAdd > 0xffffffff) {
      highAdd += 1;
    }
    this.low = lowAdd | 0;
    this.high = highAdd | 0;
  }

  copyTo(bytes: Uint8Array, offset: number) {
    bytes[offset] = (this.high >>> 24) & 0xff;
    bytes[offset + 1] = (this.high >> 16) & 0xff;
    bytes[offset + 2] = (this.high >> 8) & 0xff;
    bytes[offset + 3] = this.high & 0xff;
    bytes[offset + 4] = (this.low >>> 24) & 0xff;
    bytes[offset + 5] = (this.low >> 16) & 0xff;
    bytes[offset + 6] = (this.low >> 8) & 0xff;
    bytes[offset + 7] = this.low & 0xff;
  }

  assign(word: Word64) {
    this.high = word.high;
    this.low = word.low;
  }
}

const calculateSHA256 = (function calculateSHA256Closure() {
  function rotr(x: number, n: number) {
    return (x >>> n) | (x << (32 - n));
  }

  function ch(x: number, y: number, z: number) {
    return (x & y) ^ (~x & z);
  }

  function maj(x: number, y: number, z: number) {
    return (x & y) ^ (x & z) ^ (y & z);
  }

  function sigma(x: number) {
    return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  }

  function sigmaPrime(x: number) {
    return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  }

  function littleSigma(x: number) {
    return rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  }

  function littleSigmaPrime(x: number) {
    return rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
  }

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function hash(data: Uint8Array, offset: number, length: number) {
    // initial hash values
    let h0 = 0x6a09e667,
      h1 = 0xbb67ae85,
      h2 = 0x3c6ef372,
      h3 = 0xa54ff53a,
      h4 = 0x510e527f,
      h5 = 0x9b05688c,
      h6 = 0x1f83d9ab,
      h7 = 0x5be0cd19;
    // pre-processing
    const paddedLength = Math.ceil((length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    let i, j;
    for (i = 0; i < length; ++i) {
      padded[i] = data[offset++];
    }
    padded[i++] = 0x80;
    const n = paddedLength - 8;
    while (i < n) {
      padded[i++] = 0;
    }
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = (length >>> 29) & 0xff;
    padded[i++] = (length >> 21) & 0xff;
    padded[i++] = (length >> 13) & 0xff;
    padded[i++] = (length >> 5) & 0xff;
    padded[i++] = (length << 3) & 0xff;
    const w = new Uint32Array(64);
    // for each 512 bit block
    for (i = 0; i < paddedLength; ) {
      for (j = 0; j < 16; ++j) {
        w[j] = (padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3];
        i += 4;
      }

      for (j = 16; j < 64; ++j) {
        w[j] = (littleSigmaPrime(w[j - 2]) + w[j - 7] + littleSigma(w[j - 15]) + w[j - 16]) | 0;
      }
      let a = h0,
        b = h1,
        c = h2,
        d = h3,
        e = h4,
        f = h5,
        g = h6,
        h = h7,
        t1,
        t2;
      for (j = 0; j < 64; ++j) {
        t1 = h + sigmaPrime(e) + ch(e, f, g) + k[j] + w[j];
        t2 = sigma(a) + maj(a, b, c);
        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0;
      h1 = (h1 + b) | 0;
      h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0;
      h5 = (h5 + f) | 0;
      h6 = (h6 + g) | 0;
      h7 = (h7 + h) | 0;
    }
    // prettier-ignore
    return new Uint8Array([
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, (h0) & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, (h1) & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, (h2) & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, (h3) & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, (h4) & 0xFF,
      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, (h5) & 0xFF,
      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, (h6) & 0xFF,
      (h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, (h7) & 0xFF
    ]);
  }

  return hash;
})();

const calculateSHA512 = (function calculateSHA512Closure() {
  function ch(result: Word64, x: Word64, y: Word64, z: Word64, tmp: Word64) {
    result.assign(x);
    result.and(y);
    tmp.assign(x);
    tmp.not();
    tmp.and(z);
    result.xor(tmp);
  }

  function maj(result: Word64, x: Word64, y: Word64, z: Word64, tmp: Word64) {
    result.assign(x);
    result.and(y);
    tmp.assign(x);
    tmp.and(z);
    result.xor(tmp);
    tmp.assign(y);
    tmp.and(z);
    result.xor(tmp);
  }

  function sigma(result: Word64, x: Word64, tmp: Word64) {
    result.assign(x);
    result.rotateRight(28);
    tmp.assign(x);
    tmp.rotateRight(34);
    result.xor(tmp);
    tmp.assign(x);
    tmp.rotateRight(39);
    result.xor(tmp);
  }

  function sigmaPrime(result: Word64, x: Word64, tmp: Word64) {
    result.assign(x);
    result.rotateRight(14);
    tmp.assign(x);
    tmp.rotateRight(18);
    result.xor(tmp);
    tmp.assign(x);
    tmp.rotateRight(41);
    result.xor(tmp);
  }

  function littleSigma(result: Word64, x: Word64, tmp: Word64) {
    result.assign(x);
    result.rotateRight(1);
    tmp.assign(x);
    tmp.rotateRight(8);
    result.xor(tmp);
    tmp.assign(x);
    tmp.shiftRight(7);
    result.xor(tmp);
  }

  function littleSigmaPrime(result: Word64, x: Word64, tmp: Word64) {
    result.assign(x);
    result.rotateRight(19);
    tmp.assign(x);
    tmp.rotateRight(61);
    result.xor(tmp);
    tmp.assign(x);
    tmp.shiftRight(6);
    result.xor(tmp);
  }

  // prettier-ignore
  const k = [
    new Word64(0x428a2f98, 0xd728ae22), new Word64(0x71374491, 0x23ef65cd),
    new Word64(0xb5c0fbcf, 0xec4d3b2f), new Word64(0xe9b5dba5, 0x8189dbbc),
    new Word64(0x3956c25b, 0xf348b538), new Word64(0x59f111f1, 0xb605d019),
    new Word64(0x923f82a4, 0xaf194f9b), new Word64(0xab1c5ed5, 0xda6d8118),
    new Word64(0xd807aa98, 0xa3030242), new Word64(0x12835b01, 0x45706fbe),
    new Word64(0x243185be, 0x4ee4b28c), new Word64(0x550c7dc3, 0xd5ffb4e2),
    new Word64(0x72be5d74, 0xf27b896f), new Word64(0x80deb1fe, 0x3b1696b1),
    new Word64(0x9bdc06a7, 0x25c71235), new Word64(0xc19bf174, 0xcf692694),
    new Word64(0xe49b69c1, 0x9ef14ad2), new Word64(0xefbe4786, 0x384f25e3),
    new Word64(0x0fc19dc6, 0x8b8cd5b5), new Word64(0x240ca1cc, 0x77ac9c65),
    new Word64(0x2de92c6f, 0x592b0275), new Word64(0x4a7484aa, 0x6ea6e483),
    new Word64(0x5cb0a9dc, 0xbd41fbd4), new Word64(0x76f988da, 0x831153b5),
    new Word64(0x983e5152, 0xee66dfab), new Word64(0xa831c66d, 0x2db43210),
    new Word64(0xb00327c8, 0x98fb213f), new Word64(0xbf597fc7, 0xbeef0ee4),
    new Word64(0xc6e00bf3, 0x3da88fc2), new Word64(0xd5a79147, 0x930aa725),
    new Word64(0x06ca6351, 0xe003826f), new Word64(0x14292967, 0x0a0e6e70),
    new Word64(0x27b70a85, 0x46d22ffc), new Word64(0x2e1b2138, 0x5c26c926),
    new Word64(0x4d2c6dfc, 0x5ac42aed), new Word64(0x53380d13, 0x9d95b3df),
    new Word64(0x650a7354, 0x8baf63de), new Word64(0x766a0abb, 0x3c77b2a8),
    new Word64(0x81c2c92e, 0x47edaee6), new Word64(0x92722c85, 0x1482353b),
    new Word64(0xa2bfe8a1, 0x4cf10364), new Word64(0xa81a664b, 0xbc423001),
    new Word64(0xc24b8b70, 0xd0f89791), new Word64(0xc76c51a3, 0x0654be30),
    new Word64(0xd192e819, 0xd6ef5218), new Word64(0xd6990624, 0x5565a910),
    new Word64(0xf40e3585, 0x5771202a), new Word64(0x106aa070, 0x32bbd1b8),
    new Word64(0x19a4c116, 0xb8d2d0c8), new Word64(0x1e376c08, 0x5141ab53),
    new Word64(0x2748774c, 0xdf8eeb99), new Word64(0x34b0bcb5, 0xe19b48a8),
    new Word64(0x391c0cb3, 0xc5c95a63), new Word64(0x4ed8aa4a, 0xe3418acb),
    new Word64(0x5b9cca4f, 0x7763e373), new Word64(0x682e6ff3, 0xd6b2b8a3),
    new Word64(0x748f82ee, 0x5defb2fc), new Word64(0x78a5636f, 0x43172f60),
    new Word64(0x84c87814, 0xa1f0ab72), new Word64(0x8cc70208, 0x1a6439ec),
    new Word64(0x90befffa, 0x23631e28), new Word64(0xa4506ceb, 0xde82bde9),
    new Word64(0xbef9a3f7, 0xb2c67915), new Word64(0xc67178f2, 0xe372532b),
    new Word64(0xca273ece, 0xea26619c), new Word64(0xd186b8c7, 0x21c0c207),
    new Word64(0xeada7dd6, 0xcde0eb1e), new Word64(0xf57d4f7f, 0xee6ed178),
    new Word64(0x06f067aa, 0x72176fba), new Word64(0x0a637dc5, 0xa2c898a6),
    new Word64(0x113f9804, 0xbef90dae), new Word64(0x1b710b35, 0x131c471b),
    new Word64(0x28db77f5, 0x23047d84), new Word64(0x32caab7b, 0x40c72493),
    new Word64(0x3c9ebe0a, 0x15c9bebc), new Word64(0x431d67c4, 0x9c100d4c),
    new Word64(0x4cc5d4be, 0xcb3e42b6), new Word64(0x597f299c, 0xfc657e2a),
    new Word64(0x5fcb6fab, 0x3ad6faec), new Word64(0x6c44198c, 0x4a475817)];

  function hash(data: Uint8Array, offset: number, length: number, mode384: boolean = false) {
    // initial hash values
    let h0, h1, h2, h3, h4, h5, h6, h7;
    if (!mode384) {
      h0 = new Word64(0x6a09e667, 0xf3bcc908);
      h1 = new Word64(0xbb67ae85, 0x84caa73b);
      h2 = new Word64(0x3c6ef372, 0xfe94f82b);
      h3 = new Word64(0xa54ff53a, 0x5f1d36f1);
      h4 = new Word64(0x510e527f, 0xade682d1);
      h5 = new Word64(0x9b05688c, 0x2b3e6c1f);
      h6 = new Word64(0x1f83d9ab, 0xfb41bd6b);
      h7 = new Word64(0x5be0cd19, 0x137e2179);
    } else {
      // SHA384 is exactly the same
      // except with different starting values and a trimmed result
      h0 = new Word64(0xcbbb9d5d, 0xc1059ed8);
      h1 = new Word64(0x629a292a, 0x367cd507);
      h2 = new Word64(0x9159015a, 0x3070dd17);
      h3 = new Word64(0x152fecd8, 0xf70e5939);
      h4 = new Word64(0x67332667, 0xffc00b31);
      h5 = new Word64(0x8eb44a87, 0x68581511);
      h6 = new Word64(0xdb0c2e0d, 0x64f98fa7);
      h7 = new Word64(0x47b5481d, 0xbefa4fa4);
    }

    // pre-processing
    const paddedLength = Math.ceil((length + 17) / 128) * 128;
    const padded = new Uint8Array(paddedLength);
    let i, j;
    for (i = 0; i < length; ++i) {
      padded[i] = data[offset++];
    }
    padded[i++] = 0x80;
    const n = paddedLength - 16;
    while (i < n) {
      padded[i++] = 0;
    }
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = (length >>> 29) & 0xff;
    padded[i++] = (length >> 21) & 0xff;
    padded[i++] = (length >> 13) & 0xff;
    padded[i++] = (length >> 5) & 0xff;
    padded[i++] = (length << 3) & 0xff;

    const w = new Array(80);
    for (i = 0; i < 80; i++) {
      w[i] = new Word64(0, 0);
    }
    let a = new Word64(0, 0),
      b = new Word64(0, 0),
      c = new Word64(0, 0);
    let d = new Word64(0, 0),
      e = new Word64(0, 0),
      f = new Word64(0, 0);
    let g = new Word64(0, 0),
      h = new Word64(0, 0);
    const t1 = new Word64(0, 0),
      t2 = new Word64(0, 0);
    const tmp1 = new Word64(0, 0),
      tmp2 = new Word64(0, 0);
    let tmp3;

    // for each 1024 bit block
    for (i = 0; i < paddedLength; ) {
      for (j = 0; j < 16; ++j) {
        w[j].high =
          (padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3];
        w[j].low =
          (padded[i + 4] << 24) | (padded[i + 5] << 16) | (padded[i + 6] << 8) | padded[i + 7];
        i += 8;
      }
      for (j = 16; j < 80; ++j) {
        tmp3 = w[j];
        littleSigmaPrime(tmp3, w[j - 2], tmp2);
        tmp3.add(w[j - 7]);
        littleSigma(tmp1, w[j - 15], tmp2);
        tmp3.add(tmp1);
        tmp3.add(w[j - 16]);
      }

      a.assign(h0);
      b.assign(h1);
      c.assign(h2);
      d.assign(h3);
      e.assign(h4);
      f.assign(h5);
      g.assign(h6);
      h.assign(h7);
      for (j = 0; j < 80; ++j) {
        t1.assign(h);
        sigmaPrime(tmp1, e, tmp2);
        t1.add(tmp1);
        ch(tmp1, e, f, g, tmp2);
        t1.add(tmp1);
        t1.add(k[j]);
        t1.add(w[j]);

        sigma(t2, a, tmp2);
        maj(tmp1, a, b, c, tmp2);
        t2.add(tmp1);

        tmp3 = h;
        h = g;
        g = f;
        f = e;
        d.add(t1);
        e = d;
        d = c;
        c = b;
        b = a;
        tmp3.assign(t1);
        tmp3.add(t2);
        a = tmp3;
      }
      h0.add(a);
      h1.add(b);
      h2.add(c);
      h3.add(d);
      h4.add(e);
      h5.add(f);
      h6.add(g);
      h7.add(h);
    }

    let result;
    if (!mode384) {
      result = new Uint8Array(64);
      h0.copyTo(result, 0);
      h1.copyTo(result, 8);
      h2.copyTo(result, 16);
      h3.copyTo(result, 24);
      h4.copyTo(result, 32);
      h5.copyTo(result, 40);
      h6.copyTo(result, 48);
      h7.copyTo(result, 56);
    } else {
      result = new Uint8Array(48);
      h0.copyTo(result, 0);
      h1.copyTo(result, 8);
      h2.copyTo(result, 16);
      h3.copyTo(result, 24);
      h4.copyTo(result, 32);
      h5.copyTo(result, 40);
    }
    return result;
  }

  return hash;
})();

function calculateSHA384(data: Uint8Array, offset: number, length: number) {
  return calculateSHA512(data, offset, length, /* mode384 = */ true);
}

class NullCipher {
  decryptBlock(data: Uint8Array) {
    return data;
  }

  encrypt(data: Uint8Array) {
    return data;
  }
}

class AESBaseCipher {
  protected _s: Uint8Array;
  protected _keySize!: number;
  protected _key!: Uint8Array;
  protected _cyclesOfRepetition!: number;
  private _inv_s: Uint8Array;
  private _mix: Uint32Array;
  private _mixCol: Uint8Array;
  buffer: Uint8Array;
  bufferPosition: number;
  bufferLength!: number;
  iv!: Uint8Array;

  constructor() {
    if (this.constructor === AESBaseCipher) {
      throw new Error('Cannot initialize AESBaseCipher.');
    }

    this._s = new Uint8Array([
      0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab,
      0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4,
      0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71,
      0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2,
      0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6,
      0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb,
      0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45,
      0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
      0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44,
      0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a,
      0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49,
      0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d,
      0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
      0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e,
      0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1,
      0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
      0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb,
      0x16,
    ]);

    this._inv_s = new Uint8Array([
      0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7,
      0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde,
      0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42,
      0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49,
      0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c,
      0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15,
      0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7,
      0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02,
      0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc,
      0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad,
      0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d,
      0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b,
      0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8,
      0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51,
      0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0,
      0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
      0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c,
      0x7d,
    ]);

    this._mix = new Uint32Array([
      0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927, 0x24362e3a,
      0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45, 0x486c5c74, 0x4665517f,
      0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb, 0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c,
      0xd6bde997, 0xc4a6fe8a, 0xcaaff381, 0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5,
      0xa8fc8cc4, 0xa6f581cf, 0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d,
      0xc920ac66, 0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28,
      0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012, 0x3bab6bcb,
      0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec, 0x1f9d45f1, 0x119448fa,
      0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e, 0x73c737bf, 0x7dce3ab4, 0x6fd52da9,
      0x61dc20a2, 0xad766df6, 0xa37f60fd, 0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1,
      0x894043cc, 0x87494ec7, 0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182,
      0xeb133c89, 0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b,
      0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815, 0x21bccf08,
      0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f, 0x764dd68d, 0x7844db86,
      0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa, 0x527bf8b7, 0x5c72f5bc, 0x0605bed5,
      0x080cb3de, 0x1a17a4c3, 0x141ea9c8, 0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4,
      0x96dd063d, 0x98d40b36, 0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807,
      0xbce2250c, 0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742,
      0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea, 0x79c8eedb,
      0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4, 0x2db6a8b9, 0x23bfa5b2,
      0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e, 0xa17c0a47, 0xaf75074c, 0xbd6e1051,
      0xb3671d5a, 0x99583e6b, 0x97513360, 0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14,
      0xcd267809, 0xc32f7502, 0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c,
      0x94de6c87, 0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd,
      0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3, 0xcea927ee,
      0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621, 0x42638510, 0x4c6a881b,
      0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f, 0x161dc372, 0x1814ce79, 0x322bed48,
      0x3c22e043, 0x2e39f75e, 0x2030fa55, 0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c,
      0xd4be832d, 0xdab78e26, 0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f,
      0x8ec9c844, 0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba,
      0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480, 0x7c420fe9,
      0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce, 0x587421d3, 0x567d2cd8,
      0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67, 0x0f853856, 0x018c355d, 0x13972240,
      0x1d9e2f4b, 0x47e96422, 0x49e06929, 0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05,
      0x63df4a18, 0x6dd64713, 0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6,
      0xe11ce5ed, 0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f,
      0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3,
    ]);

    this._mixCol = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      if (i < 128) {
        this._mixCol[i] = i << 1;
      } else {
        this._mixCol[i] = (i << 1) ^ 0x1b;
      }
    }

    this.buffer = new Uint8Array(16);
    this.bufferPosition = 0;
  }

  _expandKey(_cipherKey: Uint8Array) {
    throw new Error('Cannot call `_expandKey` on the base class');
  }

  _decrypt(input: Uint8Array, key: Uint8Array) {
    let t, u, v;
    const state = new Uint8Array(16);
    state.set(input);

    // AddRoundKey
    for (let j = 0, k = this._keySize; j < 16; ++j, ++k) {
      state[j] ^= key[k];
    }
    for (let i = this._cyclesOfRepetition - 1; i >= 1; --i) {
      // InvShiftRows
      t = state[13];
      state[13] = state[9];
      state[9] = state[5];
      state[5] = state[1];
      state[1] = t;
      t = state[14];
      u = state[10];
      state[14] = state[6];
      state[10] = state[2];
      state[6] = t;
      state[2] = u;
      t = state[15];
      u = state[11];
      v = state[7];
      state[15] = state[3];
      state[11] = t;
      state[7] = u;
      state[3] = v;
      // InvSubBytes
      for (let j = 0; j < 16; ++j) {
        state[j] = this._inv_s[state[j]];
      }
      // AddRoundKey
      for (let j = 0, k = i * 16; j < 16; ++j, ++k) {
        state[j] ^= key[k];
      }
      // InvMixColumns
      for (let j = 0; j < 16; j += 4) {
        const s0 = this._mix[state[j]];
        const s1 = this._mix[state[j + 1]];
        const s2 = this._mix[state[j + 2]];
        const s3 = this._mix[state[j + 3]];
        t = s0 ^ (s1 >>> 8) ^ (s1 << 24) ^ (s2 >>> 16) ^ (s2 << 16) ^ (s3 >>> 24) ^ (s3 << 8);
        state[j] = (t >>> 24) & 0xff;
        state[j + 1] = (t >> 16) & 0xff;
        state[j + 2] = (t >> 8) & 0xff;
        state[j + 3] = t & 0xff;
      }
    }
    // InvShiftRows
    t = state[13];
    state[13] = state[9];
    state[9] = state[5];
    state[5] = state[1];
    state[1] = t;
    t = state[14];
    u = state[10];
    state[14] = state[6];
    state[10] = state[2];
    state[6] = t;
    state[2] = u;
    t = state[15];
    u = state[11];
    v = state[7];
    state[15] = state[3];
    state[11] = t;
    state[7] = u;
    state[3] = v;
    for (let j = 0; j < 16; ++j) {
      // InvSubBytes
      state[j] = this._inv_s[state[j]];
      // AddRoundKey
      state[j] ^= key[j];
    }
    return state;
  }

  _encrypt(input: Uint8Array, key: Uint8Array) {
    const s = this._s;

    let t, u, v;
    const state = new Uint8Array(16);
    state.set(input);

    for (let j = 0; j < 16; ++j) {
      // AddRoundKey
      state[j] ^= key[j];
    }

    for (let i = 1; i < this._cyclesOfRepetition; i++) {
      // SubBytes
      for (let j = 0; j < 16; ++j) {
        state[j] = s[state[j]];
      }
      // ShiftRows
      v = state[1];
      state[1] = state[5];
      state[5] = state[9];
      state[9] = state[13];
      state[13] = v;
      v = state[2];
      u = state[6];
      state[2] = state[10];
      state[6] = state[14];
      state[10] = v;
      state[14] = u;
      v = state[3];
      u = state[7];
      t = state[11];
      state[3] = state[15];
      state[7] = v;
      state[11] = u;
      state[15] = t;
      // MixColumns
      for (let j = 0; j < 16; j += 4) {
        const s0 = state[j + 0];
        const s1 = state[j + 1];
        const s2 = state[j + 2];
        const s3 = state[j + 3];
        t = s0 ^ s1 ^ s2 ^ s3;
        state[j + 0] ^= t ^ this._mixCol[s0 ^ s1];
        state[j + 1] ^= t ^ this._mixCol[s1 ^ s2];
        state[j + 2] ^= t ^ this._mixCol[s2 ^ s3];
        state[j + 3] ^= t ^ this._mixCol[s3 ^ s0];
      }
      // AddRoundKey
      for (let j = 0, k = i * 16; j < 16; ++j, ++k) {
        state[j] ^= key[k];
      }
    }

    // SubBytes
    for (let j = 0; j < 16; ++j) {
      state[j] = s[state[j]];
    }
    // ShiftRows
    v = state[1];
    state[1] = state[5];
    state[5] = state[9];
    state[9] = state[13];
    state[13] = v;
    v = state[2];
    u = state[6];
    state[2] = state[10];
    state[6] = state[14];
    state[10] = v;
    state[14] = u;
    v = state[3];
    u = state[7];
    t = state[11];
    state[3] = state[15];
    state[7] = v;
    state[11] = u;
    state[15] = t;
    // AddRoundKey
    for (let j = 0, k = this._keySize; j < 16; ++j, ++k) {
      state[j] ^= key[k];
    }
    return state;
  }

  _decryptBlock2(data: Uint8Array, finalize: boolean) {
    const sourceLength = data.length;
    let buffer = this.buffer,
      bufferLength = this.bufferPosition;
    const result: Uint8Array[] = [];
    let iv = this.iv;

    for (let i = 0; i < sourceLength; ++i) {
      buffer[bufferLength] = data[i];
      ++bufferLength;
      if (bufferLength < 16) {
        continue;
      }
      // buffer is full, decrypting
      const plain = this._decrypt(buffer, this._key);
      // xor-ing the IV vector to get plain text
      for (let j = 0; j < 16; ++j) {
        plain[j] ^= iv[j];
      }
      iv = buffer;
      result.push(plain);
      buffer = new Uint8Array(16);
      bufferLength = 0;
    }
    // saving incomplete buffer
    this.buffer = buffer;
    this.bufferLength = bufferLength;
    this.iv = iv;
    if (result.length === 0) {
      return new Uint8Array(0);
    }
    // combining plain text blocks into one
    let outputLength = 16 * result.length;
    if (finalize) {
      // undo a padding that is described in RFC 2898
      const lastBlock = result[result.length - 1];
      let psLen = lastBlock[15];
      if (psLen <= 16) {
        for (let i = 15, ii = 16 - psLen; i >= ii; --i) {
          if (lastBlock[i] !== psLen) {
            // Invalid padding, assume that the block has no padding.
            psLen = 0;
            break;
          }
        }
        outputLength -= psLen;
        result[result.length - 1] = lastBlock.subarray(0, 16 - psLen);
      }
    }
    const output = new Uint8Array(outputLength);
    for (let i = 0, j = 0, ii = result.length; i < ii; ++i, j += 16) {
      output.set(result[i], j);
    }
    return output;
  }

  decryptBlock(data: Uint8Array, finalize: boolean, iv?: Uint8Array): Uint8Array {
    const sourceLength = data.length;
    const buffer = this.buffer;
    let bufferLength = this.bufferPosition;
    // If an IV is not supplied, wait for IV values. They are at the start
    // of the stream.
    if (iv) {
      this.iv = iv;
    } else {
      for (let i = 0; bufferLength < 16 && i < sourceLength; ++i, ++bufferLength) {
        buffer[bufferLength] = data[i];
      }
      if (bufferLength < 16) {
        // Need more data.
        this.bufferLength = bufferLength;
        return new Uint8Array(0);
      }
      this.iv = buffer;
      data = data.subarray(16);
    }
    this.buffer = new Uint8Array(16);
    this.bufferLength = 0;
    // starting decryption
    this.decryptBlock = this._decryptBlock2;
    return this.decryptBlock(data, finalize);
  }

  encrypt(data: Uint8Array, iv: Uint8Array) {
    const sourceLength = data.length;
    let buffer = this.buffer,
      bufferLength = this.bufferPosition;
    const result = [];

    if (!iv) {
      iv = new Uint8Array(16);
    }
    for (let i = 0; i < sourceLength; ++i) {
      buffer[bufferLength] = data[i];
      ++bufferLength;
      if (bufferLength < 16) {
        continue;
      }

      for (let j = 0; j < 16; ++j) {
        buffer[j] ^= iv[j];
      }

      // buffer is full, encrypting
      const cipher = this._encrypt(buffer, this._key);
      iv = cipher;
      result.push(cipher);
      buffer = new Uint8Array(16);
      bufferLength = 0;
    }
    // saving incomplete buffer
    this.buffer = buffer;
    this.bufferLength = bufferLength;
    this.iv = iv;
    if (result.length === 0) {
      return new Uint8Array(0);
    }
    // combining plain text blocks into one
    const outputLength = 16 * result.length;
    const output = new Uint8Array(outputLength);
    for (let i = 0, j = 0, ii = result.length; i < ii; ++i, j += 16) {
      output.set(result[i], j);
    }
    return output;
  }
}

class AES128Cipher extends AESBaseCipher {
  private _rcon: Uint8Array;

  constructor(key: Uint8Array) {
    super();

    this._cyclesOfRepetition = 10;
    this._keySize = 160; // bits

    this._rcon = new Uint8Array([
      0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d,
      0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5,
      0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc,
      0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80,
      0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a,
      0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f,
      0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02,
      0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e,
      0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72,
      0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a,
      0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c,
      0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d,
      0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94,
      0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10,
      0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6,
      0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd,
      0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb,
      0x8d,
    ]);

    this._key = this._expandKey(key);
  }

  _expandKey(cipherKey: Uint8Array) {
    const b = 176;
    const s = this._s;
    const rcon = this._rcon;

    const result = new Uint8Array(b);
    result.set(cipherKey);

    for (let j = 16, i = 1; j < b; ++i) {
      // RotWord
      let t1 = result[j - 3];
      let t2 = result[j - 2];
      let t3 = result[j - 1];
      let t4 = result[j - 4];
      // SubWord
      t1 = s[t1];
      t2 = s[t2];
      t3 = s[t3];
      t4 = s[t4];
      // Rcon
      t1 ^= rcon[i];
      for (let n = 0; n < 4; ++n) {
        result[j] = t1 ^= result[j - 16];
        j++;
        result[j] = t2 ^= result[j - 16];
        j++;
        result[j] = t3 ^= result[j - 16];
        j++;
        result[j] = t4 ^= result[j - 16];
        j++;
      }
    }
    return result;
  }
}

class AES256Cipher extends AESBaseCipher {
  constructor(key: Uint8Array) {
    super();

    this._cyclesOfRepetition = 14;
    this._keySize = 224; // bits

    this._key = this._expandKey(key);
  }

  _expandKey(cipherKey: Uint8Array) {
    const b = 240;
    const s = this._s;

    const result = new Uint8Array(b);
    result.set(cipherKey);

    let r = 1;
    let t1 = 0,
      t2 = 0,
      t3 = 0,
      t4 = 0;
    for (let j = 32, i = 1; j < b; ++i) {
      if (j % 32 === 16) {
        t1 = s[t1];
        t2 = s[t2];
        t3 = s[t3];
        t4 = s[t4];
      } else if (j % 32 === 0) {
        // RotWord
        t1 = result[j - 3];
        t2 = result[j - 2];
        t3 = result[j - 1];
        t4 = result[j - 4];
        // SubWord
        t1 = s[t1];
        t2 = s[t2];
        t3 = s[t3];
        t4 = s[t4];
        // Rcon
        t1 ^= r;
        if ((r <<= 1) >= 256) {
          r = (r ^ 0x1b) & 0xff;
        }
      }

      for (let n = 0; n < 4; ++n) {
        result[j] = t1 ^= result[j - 32];
        j++;
        result[j] = t2 ^= result[j - 32];
        j++;
        result[j] = t3 ^= result[j - 32];
        j++;
        result[j] = t4 ^= result[j - 32];
        j++;
      }
    }
    return result;
  }
}

class PDF17 {
  checkOwnerPassword(
    password: Uint8Array,
    ownerValidationSalt: Uint8Array,
    userBytes: Uint8Array,
    ownerPassword: Uint8Array,
  ) {
    const hashData = new Uint8Array(password.length + 56);
    hashData.set(password, 0);
    hashData.set(ownerValidationSalt, password.length);
    hashData.set(userBytes, password.length + ownerValidationSalt.length);
    const result = calculateSHA256(hashData, 0, hashData.length);
    return isArrayEqual(result, ownerPassword);
  }

  checkUserPassword(
    password: Uint8Array,
    userValidationSalt: Uint8Array,
    userPassword: Uint8Array,
  ) {
    const hashData = new Uint8Array(password.length + 8);
    hashData.set(password, 0);
    hashData.set(userValidationSalt, password.length);
    const result = calculateSHA256(hashData, 0, hashData.length);
    return isArrayEqual(result, userPassword);
  }

  getOwnerKey(
    password: Uint8Array,
    ownerKeySalt: Uint8Array,
    userBytes: Uint8Array,
    ownerEncryption: Uint8Array,
  ) {
    const hashData = new Uint8Array(password.length + 56);
    hashData.set(password, 0);
    hashData.set(ownerKeySalt, password.length);
    hashData.set(userBytes, password.length + ownerKeySalt.length);
    const key = calculateSHA256(hashData, 0, hashData.length);
    const cipher = new AES256Cipher(key);
    return cipher.decryptBlock(ownerEncryption, false, new Uint8Array(16));
  }

  getUserKey(password: Uint8Array, userKeySalt: Uint8Array, userEncryption: Uint8Array) {
    const hashData = new Uint8Array(password.length + 8);
    hashData.set(password, 0);
    hashData.set(userKeySalt, password.length);
    // `key` is the decryption key for the UE string.
    const key = calculateSHA256(hashData, 0, hashData.length);
    const cipher = new AES256Cipher(key);
    return cipher.decryptBlock(userEncryption, false, new Uint8Array(16));
  }
}

class PDF20 {
  calculatePDF20Hash(password: Uint8Array, input: Uint8Array, userBytes: Uint8Array) {
    // This refers to Algorithm 2.B as defined in ISO 32000-2.
    let k = calculateSHA256(input, 0, input.length).subarray(0, 32);
    let e: Uint8Array = new Uint8Array([0]);
    let i = 0;
    while (i < 64 || e[e.length - 1] > i - 32) {
      const combinedLength = password.length + k.length + userBytes.length,
        combinedArray = new Uint8Array(combinedLength);
      let writeOffset = 0;
      combinedArray.set(password, writeOffset);
      writeOffset += password.length;
      combinedArray.set(k, writeOffset);
      writeOffset += k.length;
      combinedArray.set(userBytes, writeOffset);

      const k1 = new Uint8Array(combinedLength * 64);
      for (let j = 0, pos = 0; j < 64; j++, pos += combinedLength) {
        k1.set(combinedArray, pos);
      }
      // AES128 CBC NO PADDING with first 16 bytes of k as the key
      // and the second 16 as the iv.
      const cipher = new AES128Cipher(k.subarray(0, 16));
      e = cipher.encrypt(k1, k.subarray(16, 32));
      // Now we have to take the first 16 bytes of an unsigned big endian
      // integer and compute the remainder modulo 3. That is a fairly large
      // number and JavaScript isn't going to handle that well.
      // The number is e0 + 256 * e1 + 256^2 * e2... and 256 % 3 === 1, hence
      // the powers of 256 are === 1 modulo 3 and finally the number modulo 3
      // is equal to the remainder modulo 3 of the sum of the e_n.
      const remainder = e.slice(0, 16).reduce((a, b) => a + b, 0) % 3;
      if (remainder === 0) {
        k = calculateSHA256(e, 0, e.length);
      } else if (remainder === 1) {
        k = calculateSHA384(e, 0, e.length);
      } else if (remainder === 2) {
        k = calculateSHA512(e, 0, e.length);
      }
      i++;
    }
    return k.subarray(0, 32);
  }

  hash(password: Uint8Array, concatBytes: Uint8Array, userBytes: Uint8Array) {
    return this.calculatePDF20Hash(password, concatBytes, userBytes);
  }

  checkOwnerPassword(
    password: Uint8Array,
    ownerValidationSalt: Uint8Array,
    userBytes: Uint8Array,
    ownerPassword: Uint8Array,
  ) {
    const hashData = new Uint8Array(password.length + 56);
    hashData.set(password, 0);
    hashData.set(ownerValidationSalt, password.length);
    hashData.set(userBytes, password.length + ownerValidationSalt.length);
    const result = this.calculatePDF20Hash(password, hashData, userBytes);
    return isArrayEqual(result, ownerPassword);
  }

  checkUserPassword(
    password: Uint8Array,
    userValidationSalt: Uint8Array,
    userPassword: Uint8Array,
  ) {
    const hashData = new Uint8Array(password.length + 8);
    hashData.set(password, 0);
    hashData.set(userValidationSalt, password.length);
    const result = this.calculatePDF20Hash(password, hashData, new Uint8Array());
    return isArrayEqual(result, userPassword);
  }

  getOwnerKey(
    password: Uint8Array,
    ownerKeySalt: Uint8Array,
    userBytes: Uint8Array,
    ownerEncryption: Uint8Array,
  ) {
    const hashData = new Uint8Array(password.length + 56);
    hashData.set(password, 0);
    hashData.set(ownerKeySalt, password.length);
    hashData.set(userBytes, password.length + ownerKeySalt.length);
    const key = this.calculatePDF20Hash(password, hashData, userBytes);
    const cipher = new AES256Cipher(key);
    return cipher.decryptBlock(ownerEncryption, false, new Uint8Array(16));
  }

  getUserKey(password: Uint8Array, userKeySalt: Uint8Array, userEncryption: Uint8Array) {
    const hashData = new Uint8Array(password.length + 8);
    hashData.set(password, 0);
    hashData.set(userKeySalt, password.length);
    // `key` is the decryption key for the UE string.
    const key = this.calculatePDF20Hash(password, hashData, new Uint8Array());
    const cipher = new AES256Cipher(key);
    return cipher.decryptBlock(userEncryption, false, new Uint8Array(16));
  }
}

type Cipher = ARCFourCipher | NullCipher | AES128Cipher | AES256Cipher;
class CipherTransform {
  private StringCipherConstructor: () => Cipher;
  private StreamCipherConstructor: () => Cipher;

  constructor(stringCipherConstructor: () => Cipher, streamCipherConstructor: () => Cipher) {
    this.StringCipherConstructor = stringCipherConstructor;
    this.StreamCipherConstructor = streamCipherConstructor;
  }

  createStream(stream: StreamType, length: number) {
    const cipher = this.StreamCipherConstructor();
    return new DecryptStream(
      stream,
      function cipherTransformDecryptStream(data, finalize) {
        return cipher.decryptBlock(data as Uint8Array, finalize);
      },
      length,
    );
  }

  decryptString(s: string) {
    const cipher = this.StringCipherConstructor();
    let data = stringAsByteArray(s);
    data = cipher.decryptBlock(data, true);
    return arrayAsString(data);
  }

  decryptBytes(d: Uint8Array) {
    const cipher = this.StringCipherConstructor();
    return cipher.decryptBlock(d, true);
  }

  encryptString(s: string) {
    const cipher = this.StringCipherConstructor();
    if (cipher instanceof AESBaseCipher) {
      // Append some chars equal to "16 - (M mod 16)"
      // where M is the string length (see section 7.6.2 in PDF specification)
      // to have a final string where the length is a multiple of 16.
      // Special note:
      //   "Note that the pad is present when M is evenly divisible by 16;
      //   it contains 16 bytes of 0x10."
      const strLen = s.length;
      const pad = 16 - (strLen % 16);
      s += String.fromCharCode(pad).repeat(pad);

      // Generate an initialization vector
      const iv = new Uint8Array(16);
      if (typeof crypto !== 'undefined') {
        crypto.getRandomValues(iv);
      } else {
        for (let i = 0; i < 16; i++) {
          iv[i] = Math.floor(256 * Math.random());
        }
      }

      let data = stringAsByteArray(s);
      data = cipher.encrypt(data, iv);

      const buf = new Uint8Array(16 + data.length);
      buf.set(iv);
      buf.set(data, 16);

      return arrayAsString(buf);
    }

    let data = stringAsByteArray(s);
    data = cipher.encrypt(data);
    return arrayAsString(data);
  }
}

// eslint-disable-next-line no-shadow
class CipherTransformFactory {
  encryptMetadata: boolean;
  encryptionKey: Uint8Array;
  algorithm: number;
  filterName: string;
  dict: PDFDict;
  cf!: PDFDict;
  stmf!: PDFName;
  strf!: PDFName;
  eff!: PDFName;

  private defaultPasswordBytes = new Uint8Array([
    0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
    0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
  ]);
  private identityName = PDFName.of('Identity');

  constructor(dict: PDFDict, fileIdBytes: Uint8Array, password?: string) {
    const filter = dict.get(PDFName.of('Filter')) as PDFName;
    if (filter.asString() !== '/Standard') {
      throw new Error('unknown encryption method');
    }
    this.filterName = filter.asString();
    this.dict = dict;
    const algorithm = (dict.get(PDFName.of('V')) as PDFNumber).asNumber();
    if (
      !Number.isInteger(algorithm) ||
      (algorithm !== 1 && algorithm !== 2 && algorithm !== 4 && algorithm !== 5)
    ) {
      throw new Error('unsupported encryption algorithm');
    }
    this.algorithm = algorithm;
    let keyLength = (dict.get(PDFName.of('Length')) as PDFNumber).asNumber();
    if (!keyLength) {
      // Spec asks to rely on encryption dictionary's Length entry, however
      // some PDFs don't have it. Trying to recover.
      if (algorithm <= 3) {
        // For 1 and 2 it's fixed to 40-bit, for 3 40-bit is a minimal value.
        keyLength = 40;
      } else {
        // Trying to find default handler -- it usually has Length.
        const cfDict = dict.get(PDFName.of('CF')) as PDFDict;
        const streamCryptoName = dict.get(PDFName.of('StmF')) as PDFName;
        if (cfDict instanceof PDFDict && streamCryptoName instanceof PDFName) {
          cfDict.suppressEncryption = true;
          const handlerDict = cfDict.get(PDFName.of(streamCryptoName.asString())) as PDFDict;
          let keyLen: PDFNumber | null = null;
          if (handlerDict) {
            keyLen = handlerDict.get(PDFName.of('Length')) as PDFNumber;
          }
          keyLength = (keyLen && keyLen.asNumber()) || 128;
          if (keyLength < 40) {
            // Sometimes it's incorrect value of bits, generators specify
            // bytes.
            keyLength <<= 3;
          }
        }
      }
    }
    if (!Number.isInteger(keyLength) || keyLength < 40 || keyLength % 8 !== 0) {
      throw new Error('invalid key length');
    }

    const oPdfStr = (dict.get(PDFName.of('O')) as PDFString).asBytes();
    const uPdfStr = (dict.get(PDFName.of('U')) as PDFString).asBytes();
    // prepare keys
    const ownerPassword = oPdfStr.subarray(0, 32);
    const userPassword = uPdfStr.subarray(0, 32);
    const flags = (dict.get(PDFName.of('P')) as PDFNumber).asNumber();
    const revision = (dict.get(PDFName.of('R')) as PDFNumber).asNumber();
    // meaningful when V is 4 or 5
    const encryptMetadata =
      (algorithm === 4 || algorithm === 5) &&
      (dict.get(PDFName.of('EncryptMetadata')) as PDFBool)?.asBoolean() !== false;
    this.encryptMetadata = encryptMetadata;

    let passwordBytes: Uint8Array | undefined;
    if (password) {
      if (revision === 6) {
        try {
          password = unescape(encodeURIComponent(password));
        } catch (ex) {
          console.warn('CipherTransformFactory: ' + 'Unable to convert UTF8 encoded password.');
        }
      }
      passwordBytes = stringAsByteArray(password!);
    }

    let encryptionKey;
    if (algorithm !== 5) {
      encryptionKey = this.prepareKeyData(
        fileIdBytes,
        passwordBytes,
        ownerPassword,
        userPassword,
        flags,
        revision,
        keyLength,
        encryptMetadata,
      );
    } else {
      const ownerValidationSalt = oPdfStr.subarray(32, 40);
      const ownerKeySalt = oPdfStr.subarray(40, 48);
      const uBytes = uPdfStr.subarray(0, 48);
      const userValidationSalt = uPdfStr.subarray(32, 40);
      const userKeySalt = uPdfStr.subarray(40, 48);

      const ownerEncryption = (dict.get(PDFName.of('OE')) as PDFString).asBytes();
      const userEncryption = (dict.get(PDFName.of('UE')) as PDFString).asBytes();
      const perms = (dict.get(PDFName.of('Perms')) as PDFString).asBytes();
      encryptionKey = this.createEncryptionKey20(
        revision,
        passwordBytes,
        ownerPassword,
        ownerValidationSalt,
        ownerKeySalt,
        uBytes,
        userPassword,
        userValidationSalt,
        userKeySalt,
        ownerEncryption,
        userEncryption,
        perms,
      );
    }
    if (!encryptionKey && !password) {
      throw new Error('NEEDS PASSWORD');
    } else if (!encryptionKey && password) {
      // Attempting use the password as an owner password
      const decodedPassword = this.decodeUserPassword(
        passwordBytes!,
        ownerPassword,
        revision,
        keyLength,
      );
      encryptionKey = this.prepareKeyData(
        fileIdBytes,
        decodedPassword,
        ownerPassword,
        userPassword,
        flags,
        revision,
        keyLength,
        encryptMetadata,
      );
    }

    if (!encryptionKey) {
      throw new Error('Password incorrect');
    }

    this.encryptionKey = encryptionKey;

    if (algorithm >= 4) {
      const cf = dict.get(PDFName.of('CF')) as PDFDict;
      if (cf instanceof PDFDict) {
        // The 'CF' dictionary itself should not be encrypted, and by setting
        // `suppressEncryption` we can prevent an infinite loop inside of
        // `XRef_fetchUncompressed` if the dictionary contains indirect
        // objects (fixes issue7665.pdf).
        cf.suppressEncryption = true;
      }
      this.cf = cf;
      this.stmf = (dict.get(PDFName.of('StmF')) as PDFName) || this.identityName;
      this.strf = (dict.get(PDFName.of('StrF')) as PDFName) || this.identityName;
      this.eff = (dict.get(PDFName.of('EFF')) as PDFName) || this.stmf;
    }
  }

  createCipherTransform(num: number, gen: number) {
    if (this.algorithm === 4 || this.algorithm === 5) {
      return new CipherTransform(
        this.buildCipherConstructor(this.cf, this.strf, num, gen, this.encryptionKey),
        this.buildCipherConstructor(this.cf, this.stmf, num, gen, this.encryptionKey),
      );
    }
    // algorithms 1 and 2
    const key = this.buildObjectKey(num, gen, this.encryptionKey, /* isAes = */ false);
    const cipherConstructor = function buildCipherCipherConstructor() {
      return new ARCFourCipher(key);
    };
    return new CipherTransform(cipherConstructor, cipherConstructor);
  }

  createEncryptionKey20(
    revision: number,
    password: Uint8Array | undefined,
    ownerPassword: Uint8Array,
    ownerValidationSalt: Uint8Array,
    ownerKeySalt: Uint8Array,
    uBytes: Uint8Array,
    userPassword: Uint8Array,
    userValidationSalt: Uint8Array,
    userKeySalt: Uint8Array,
    ownerEncryption: Uint8Array,
    userEncryption: Uint8Array,
    _perms: Uint8Array,
  ) {
    if (password) {
      const passwordLength = Math.min(127, password.length);
      password = password.subarray(0, passwordLength);
    } else {
      password = new Uint8Array();
    }
    let pdfAlgorithm;
    if (revision === 6) {
      pdfAlgorithm = new PDF20();
    } else {
      pdfAlgorithm = new PDF17();
    }

    if (pdfAlgorithm.checkUserPassword(password, userValidationSalt, userPassword)) {
      return pdfAlgorithm.getUserKey(password, userKeySalt, userEncryption);
    } else if (
      password.length &&
      pdfAlgorithm.checkOwnerPassword(password, ownerValidationSalt, uBytes, ownerPassword)
    ) {
      return pdfAlgorithm.getOwnerKey(password, ownerKeySalt, uBytes, ownerEncryption);
    }

    return null;
  }

  prepareKeyData(
    fileId: Uint8Array,
    password: Uint8Array | undefined,
    ownerPassword: Uint8Array,
    userPassword: Uint8Array,
    flags: number,
    revision: number,
    keyLength: number,
    encryptMetadata: boolean,
  ) {
    const hashDataSize = 40 + ownerPassword.length + fileId.length;
    const hashData = new Uint8Array(hashDataSize);
    let i = 0,
      j,
      n;
    if (password) {
      n = Math.min(32, password.length);
      for (; i < n; ++i) {
        hashData[i] = password[i];
      }
    }
    j = 0;
    while (i < 32) {
      hashData[i++] = this.defaultPasswordBytes[j++];
    }
    // as now the padded password in the hashData[0..i]
    for (j = 0, n = ownerPassword.length; j < n; ++j) {
      hashData[i++] = ownerPassword[j];
    }
    hashData[i++] = flags & 0xff;
    hashData[i++] = (flags >> 8) & 0xff;
    hashData[i++] = (flags >> 16) & 0xff;
    hashData[i++] = (flags >>> 24) & 0xff;
    for (j = 0, n = fileId.length; j < n; ++j) {
      hashData[i++] = fileId[j];
    }
    if (revision >= 4 && !encryptMetadata) {
      hashData[i++] = 0xff;
      hashData[i++] = 0xff;
      hashData[i++] = 0xff;
      hashData[i++] = 0xff;
    }
    let hash = calculateMD5(hashData, 0, i);
    const keyLengthInBytes = keyLength >> 3;
    if (revision >= 3) {
      for (j = 0; j < 50; ++j) {
        hash = calculateMD5(hash, 0, keyLengthInBytes);
      }
    }
    const encryptionKey = hash.subarray(0, keyLengthInBytes);
    let cipher, checkData;

    if (revision >= 3) {
      for (i = 0; i < 32; ++i) {
        hashData[i] = this.defaultPasswordBytes[i];
      }
      for (j = 0, n = fileId.length; j < n; ++j) {
        hashData[i++] = fileId[j];
      }
      cipher = new ARCFourCipher(encryptionKey);
      checkData = cipher.encryptBlock(calculateMD5(hashData, 0, i));
      n = encryptionKey.length;
      const derivedKey = new Uint8Array(n);
      for (j = 1; j <= 19; ++j) {
        for (let k = 0; k < n; ++k) {
          derivedKey[k] = encryptionKey[k] ^ j;
        }
        cipher = new ARCFourCipher(derivedKey);
        checkData = cipher.encryptBlock(checkData);
      }
      for (j = 0, n = checkData.length; j < n; ++j) {
        if (userPassword[j] !== checkData[j]) {
          return null;
        }
      }
    } else {
      cipher = new ARCFourCipher(encryptionKey);
      checkData = cipher.encryptBlock(this.defaultPasswordBytes);
      for (j = 0, n = checkData.length; j < n; ++j) {
        if (userPassword[j] !== checkData[j]) {
          return null;
        }
      }
    }
    return encryptionKey;
  }

  decodeUserPassword(
    password: Uint8Array,
    ownerPassword: Uint8Array,
    revision: number,
    keyLength: number,
  ) {
    const hashData = new Uint8Array(32);
    let i = 0;
    const n = Math.min(32, password.length);
    for (; i < n; ++i) {
      hashData[i] = password[i];
    }
    let j = 0;
    while (i < 32) {
      hashData[i++] = this.defaultPasswordBytes[j++];
    }
    let hash = calculateMD5(hashData, 0, i);
    const keyLengthInBytes = keyLength >> 3;
    if (revision >= 3) {
      for (j = 0; j < 50; ++j) {
        hash = calculateMD5(hash, 0, hash.length);
      }
    }

    let cipher, userPassword;
    if (revision >= 3) {
      userPassword = ownerPassword;
      const derivedKey = new Uint8Array(keyLengthInBytes);
      for (j = 19; j >= 0; j--) {
        for (let k = 0; k < keyLengthInBytes; ++k) {
          derivedKey[k] = hash[k] ^ j;
        }
        cipher = new ARCFourCipher(derivedKey);
        userPassword = cipher.encryptBlock(userPassword);
      }
    } else {
      cipher = new ARCFourCipher(hash.subarray(0, keyLengthInBytes));
      userPassword = cipher.encryptBlock(ownerPassword);
    }
    return userPassword;
  }

  buildObjectKey(num: number, gen: number, encryptionKey: Uint8Array, isAes: boolean = false) {
    const key = new Uint8Array(encryptionKey.length + 9);
    const n = encryptionKey.length;
    let i;
    for (i = 0; i < n; ++i) {
      key[i] = encryptionKey[i];
    }
    key[i++] = num & 0xff;
    key[i++] = (num >> 8) & 0xff;
    key[i++] = (num >> 16) & 0xff;
    key[i++] = gen & 0xff;
    key[i++] = (gen >> 8) & 0xff;
    if (isAes) {
      key[i++] = 0x73;
      key[i++] = 0x41;
      key[i++] = 0x6c;
      key[i++] = 0x54;
    }
    const hash = calculateMD5(key, 0, i);
    return hash.subarray(0, Math.min(encryptionKey.length + 5, 16));
  }

  buildCipherConstructor(cf: PDFDict, name: PDFName, num: number, gen: number, key: Uint8Array) {
    if (!(name instanceof PDFName)) {
      throw new Error('Invalid crypt filter name.');
    }
    const cryptFilter = cf.get(PDFName.of(name.asString().replace('/', ''))) as PDFDict;
    let cfm;
    if (cryptFilter !== null && cryptFilter !== undefined) {
      cfm = cryptFilter.get(PDFName.of('CFM')) as PDFName;
    }
    if (!cfm || cfm.asString() === '/None') {
      return function cipherTransformFactoryBuildCipherConstructorNone() {
        return new NullCipher();
      };
    }
    if (cfm.asString() === '/V2') {
      return () => new ARCFourCipher(this.buildObjectKey(num, gen, key, /* isAes = */ false));
    }
    if (cfm.asString() === '/AESV2') {
      return () => new AES128Cipher(this.buildObjectKey(num, gen, key, /* isAes = */ true));
    }
    if (cfm.asString() === '/AESV3') {
      return () => new AES256Cipher(key);
    }
    throw new Error('Unknown crypto method');
  }
}

export {
  AES128Cipher,
  AES256Cipher,
  ARCFourCipher,
  calculateMD5,
  calculateSHA256,
  calculateSHA384,
  calculateSHA512,
  CipherTransformFactory,
  CipherTransform,
  PDF17,
  PDF20,
};
