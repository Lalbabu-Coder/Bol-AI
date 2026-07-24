import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Resolves and returns the binary buffer of the 32-byte encryption key from environments
 */
const getEncryptionKey = () => {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined.');
  }
  // Hex-encoded 32-byte key is 64 characters long
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters total).');
  }
  return Buffer.from(keyHex, 'hex');
};

/**
 * Encrypts cleartext string into iv:authTag:ciphertext format
 */
export const encrypt = (text) => {
  if (!text) return null;
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12-byte IV is standard and secure for AES-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts iv:authTag:ciphertext string back into cleartext
 * Returns the text as-is if it is not in the encrypted format (assumes legacy plaintext)
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return null;

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Graceful fallback for legacy plaintext parameters
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, ciphertext] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    process.stderr.write(`Decryption warning: ${err.message}. Returning original payload.\n`);
    return encryptedText;
  }
};
