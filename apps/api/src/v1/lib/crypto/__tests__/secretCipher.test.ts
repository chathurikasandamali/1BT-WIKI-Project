import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt } from '../secretCipher.js';

describe('secretCipher', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
  });

  it('round-trips plaintext through encrypt and decrypt', () => {
    const plaintext = 'AIzaSyD-super-secret-gemini-key';

    const ciphertext = encrypt(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const plaintext = 'same-input-every-time';

    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it('throws when the auth tag has been tampered with', () => {
    const ciphertext = encrypt('some-api-key');
    const [iv, authTag, data] = ciphertext.split(':');
    const tampered = [iv, authTag.slice(0, -2) + (authTag.slice(-2) === 'AA' ? 'BB' : 'AA'), data].join(
      ':'
    );

    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws when the ciphertext has been tampered with', () => {
    const ciphertext = encrypt('some-api-key');
    const [iv, authTag, data] = ciphertext.split(':');
    const tampered = [iv, authTag, data.slice(0, -2) + (data.slice(-2) === 'AA' ? 'BB' : 'AA')].join(
      ':'
    );

    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws when decrypting with the wrong key', async () => {
    const ciphertext = encrypt('some-api-key');

    // secretCipher caches the key on first use within a module instance, so
    // a fresh instance (via resetModules) is needed to pick up a new key.
    jest.resetModules();
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const { decrypt: freshDecrypt } = await import('../secretCipher.js');

    expect(() => freshDecrypt(ciphertext)).toThrow();
  });

  it('rejects malformed ciphertext', () => {
    expect(() => decrypt('not-a-valid-format')).toThrow('Malformed ciphertext');
  });
});

describe('secretCipher key validation', () => {
  it('throws a clear error when ENCRYPTION_KEY is missing', async () => {
    jest.resetModules();
    delete process.env.ENCRYPTION_KEY;
    const { encrypt: freshEncrypt } = await import('../secretCipher.js');

    expect(() => freshEncrypt('value')).toThrow('ENCRYPTION_KEY environment variable is not set');
  });

  it('throws a clear error when ENCRYPTION_KEY is the wrong length', async () => {
    jest.resetModules();
    process.env.ENCRYPTION_KEY = Buffer.from('too-short').toString('base64');
    const { encrypt: freshEncrypt } = await import('../secretCipher.js');

    expect(() => freshEncrypt('value')).toThrow('must decode to 32 bytes');
  });
});
