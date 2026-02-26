import * as crypto from 'node:crypto';

import { AES256Cipher } from '../../src/core/crypto';

describe('AES256Cipher', () => {
  it('should correctly decrypt a single AES-256-ECB block', () => {
    const key = crypto.randomBytes(32);
    const plaintext = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
    cipher.setAutoPadding(false);
    const encrypted = new Uint8Array(cipher.update(plaintext));

    const aesCipher = new AES256Cipher(new Uint8Array(key));
    const decrypted = aesCipher._decrypt(encrypted, aesCipher._key);

    expect(Buffer.from(decrypted)).toEqual(Buffer.from(plaintext));
  });

  it('should correctly decrypt multiple random blocks', () => {
    const key = crypto.randomBytes(32);

    for (let i = 0; i < 10; i++) {
      const plaintext = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
      cipher.setAutoPadding(false);
      const encrypted = new Uint8Array(cipher.update(plaintext));

      const aesCipher = new AES256Cipher(new Uint8Array(key));
      const decrypted = aesCipher._decrypt(encrypted, aesCipher._key);

      expect(Buffer.from(decrypted)).toEqual(Buffer.from(plaintext));
    }
  });

  it('should decrypt NIST AES-256 test vector (FIPS 197 C.3)', () => {
    const key = new Uint8Array([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
      0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15,
      0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
    ]);
    const plaintext = new Uint8Array([
      0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
      0xbb, 0xcc, 0xdd, 0xee, 0xff,
    ]);
    const expectedCiphertext = new Uint8Array([
      0x8e, 0xa2, 0xb7, 0xca, 0x51, 0x67, 0x45, 0xbf, 0xea, 0xfc, 0x49,
      0x90, 0x4b, 0x49, 0x60, 0x89,
    ]);

    const aesCipher = new AES256Cipher(key);
    const decrypted = aesCipher._decrypt(expectedCiphertext, aesCipher._key);

    expect(Buffer.from(decrypted)).toEqual(Buffer.from(plaintext));
  });

  it('should produce output matching Node.js crypto for all key/plaintext combinations', () => {
    // Exhaustive comparison: the AES256Cipher._decrypt output must match
    // Node.js crypto (OpenSSL) for every random key and plaintext pair.
    // This catches subtle bugs that only manifest with certain key schedules.
    for (let i = 0; i < 50; i++) {
      const key = crypto.randomBytes(32);
      const plaintext = crypto.randomBytes(16);

      // Encrypt with Node.js
      const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
      cipher.setAutoPadding(false);
      const encrypted = new Uint8Array(cipher.update(plaintext));

      // Decrypt with AES256Cipher
      const aesCipher = new AES256Cipher(new Uint8Array(key));
      const decrypted = aesCipher._decrypt(encrypted, aesCipher._key);

      expect(Buffer.from(decrypted)).toEqual(Buffer.from(plaintext));
    }
  });
});
