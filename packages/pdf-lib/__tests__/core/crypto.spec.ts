import * as nodeCrypto from 'node:crypto';

import { AES256Cipher } from '../../src/core/crypto';

const nistAes256Key = new Uint8Array([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
]);

const nistAes256Plaintext = new Uint8Array([
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
  0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
]);

const nistAes256Ciphertext = new Uint8Array([
  0x8e, 0xa2, 0xb7, 0xca, 0x51, 0x67, 0x45, 0xbf,
  0xea, 0xfc, 0x49, 0x90, 0x4b, 0x49, 0x60, 0x89,
]);

const decryptWithPdfLib = (key: Uint8Array, ciphertext: Uint8Array) => {
  const cipher = new AES256Cipher(key);
  return cipher._decrypt(ciphertext, cipher._key);
};

const encryptWithNodeAes256Ecb = (key: Uint8Array, plaintext: Uint8Array) => {
  const cipher = nodeCrypto.createCipheriv('aes-256-ecb', key, null);
  cipher.setAutoPadding(false);
  return new Uint8Array(cipher.update(plaintext));
};

describe('AES256Cipher', () => {
  test('decrypts the NIST FIPS 197 C.3 AES-256 ECB vector', () => {
    const decrypted = decryptWithPdfLib(nistAes256Key, nistAes256Ciphertext);

    expect(Array.from(decrypted)).toEqual(Array.from(nistAes256Plaintext));
  });

  test('matches Node.js crypto for a deterministic AES-256 ECB block', () => {
    const key = Uint8Array.from({ length: 32 }, (_, index) => (index * 7 + 3) & 0xff);
    const plaintext = Uint8Array.from({ length: 16 }, (_, index) => (index * 11 + 5) & 0xff);
    const encrypted = encryptWithNodeAes256Ecb(key, plaintext);
    const decrypted = decryptWithPdfLib(key, encrypted);

    expect(Array.from(decrypted)).toEqual(Array.from(plaintext));
  });
});
