import crypto from 'crypto';

export interface EncryptedEnvelope {
  _encrypted: true;
  version: 1;
  algo: 'aes-256-gcm';
  kdf: 'scrypt';
  salt: string; // hex
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // base64
}

/**
 * Derives a 32-byte (256-bit) encryption key from a passphrase and salt.
 * If passphrase is an exact 64-character hex string (32 bytes), uses it directly.
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  const trimmed = passphrase.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return crypto.scryptSync(trimmed, salt, 32, { N: 16384, r: 8, p: 1 });
}

/**
 * Encrypts a UTF-8 string using AES-256-GCM authenticated encryption.
 */
export function encryptPayload(plaintext: string, passphrase: string): string {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(passphrase, salt);
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf-8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    _encrypted: true,
    version: 1,
    algo: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypts an AES-256-GCM envelope string back into plaintext UTF-8.
 * Returns raw string if not an encrypted envelope.
 */
export function decryptPayload(raw: string, passphrase: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return raw;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return raw;
  }

  if (!parsed || parsed._encrypted !== true) {
    return raw;
  }

  if (!passphrase || !passphrase.trim()) {
    throw new Error(
      'Database file on disk is encrypted with AES-256-GCM, but no ENCRYPTION_PASSPHRASE or ENCRYPTION_KEY environment variable was provided to decrypt it.'
    );
  }

  if (!parsed.salt || !parsed.iv || !parsed.authTag || !parsed.ciphertext) {
    throw new Error('Encrypted database envelope is malformed or corrupted.');
  }

  const salt = Buffer.from(parsed.salt, 'hex');
  const key = deriveKey(passphrase, salt);
  const iv = Buffer.from(parsed.iv, 'hex');
  const authTag = Buffer.from(parsed.authTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(parsed.ciphertext, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch (err: any) {
    throw new Error(
      'Decryption failed. The provided ENCRYPTION_PASSPHRASE is incorrect or the database file was tampered with.'
    );
  }
}

/**
 * Checks whether a given string is an encrypted JSON envelope.
 */
export function isEncryptedContent(raw: string): boolean {
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return false;
    const parsed = JSON.parse(trimmed);
    return parsed && parsed._encrypted === true;
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically strong 256-bit key and high-entropy passphrase.
 */
export function generateEncryptionCredentials(): {
  hexKey: string;
  suggestedPassphrase: string;
  sampleEnv: string;
} {
  const hexKey = crypto.randomBytes(32).toString('hex');
  
  const words = [
    'anchor', 'beacon', 'citadel', 'cadence', 'granite', 'harbor', 'summit',
    'timber', 'vanguard', 'zenith', 'prism', 'compass', 'solace', 'bastion',
    'shield', 'cipher', 'horizon', 'glacier', 'matrix', 'stride'
  ];
  
  const randomIndices = crypto.randomBytes(4);
  const selectedWords = [
    words[randomIndices[0] % words.length],
    words[randomIndices[1] % words.length],
    words[randomIndices[2] % words.length],
    words[randomIndices[3] % words.length],
    crypto.randomInt(100, 999).toString(),
  ];
  const suggestedPassphrase = selectedWords.join('-');

  return {
    hexKey,
    suggestedPassphrase,
    sampleEnv: `ENCRYPTION_PASSPHRASE="${suggestedPassphrase}"`,
  };
}
