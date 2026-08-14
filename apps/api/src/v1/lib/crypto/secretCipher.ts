/**
 * AES-256-GCM helpers for encrypting sensitive setting values (e.g. LLM API
 * keys) before they are persisted, and decrypting them on read.
 *
 * Symmetric + reversible by design — unlike password hashing, callers need
 * the real value back (e.g. `quizProviderFactory` needs the plaintext key to
 * call Gemini), so this cannot be a one-way hash.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

/** Resolves and validates ENCRYPTION_KEY lazily so tests can set it up front. */
const getKey = (): Buffer => {
  if (cachedKey) {
    return cachedKey;
  }

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. Generate one with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (base64-encoded); got ${key.length}`
    );
  }

  cachedKey = key;
  return cachedKey;
};

/** Encrypts a plaintext string. Output format: base64(iv):base64(authTag):base64(ciphertext). */
export const encrypt = (plaintext: string): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':'
  );
};

/** Decrypts a string produced by {@link encrypt}. Throws if tampered or the key is wrong. */
export const decrypt = (ciphertext: string): string => {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed ciphertext: expected "iv:authTag:ciphertext"');
  }
  const [ivPart, authTagPart, dataPart] = parts;

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagPart, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};
