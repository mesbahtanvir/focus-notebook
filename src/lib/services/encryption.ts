/**
 * Encryption Service for Plaid Access Tokens
 *
 * In production, this should use Google Cloud KMS.
 * For MVP/development, using AES-256-GCM with environment-based key.
 *
 * IMPORTANT: Replace with actual KMS integration before production deployment.
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get the encryption key from environment
 * In production, this should be retrieved from KMS
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || process.env.PLAID_SECRET;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  return key;
}

/**
 * Derive a key from the master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data (e.g., Plaid access token)
 * @param plaintext - The data to encrypt
 * @returns KMS reference string in format: kms://encrypted_data
 */
export function encrypt(plaintext: string): string {
  try {
    const masterKey = getEncryptionKey();

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key
    const key = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);

    // Return as KMS reference
    return `kms://${combined.toString('base64')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data from KMS reference
 * @param kmsRef - The KMS reference string (format: kms://encrypted_data)
 * @returns Decrypted plaintext
 */
export function decrypt(kmsRef: string): string {
  try {
    if (!kmsRef.startsWith('kms://')) {
      throw new Error('Invalid KMS reference format');
    }

    const masterKey = getEncryptionKey();

    // Extract encrypted data from KMS reference
    const encryptedData = kmsRef.substring(6); // Remove 'kms://' prefix
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive key from master key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure encryption key for environment variable
 * This should be run once and stored securely
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate KMS reference format
 */
export function isValidKmsRef(kmsRef: string): boolean {
  return kmsRef.startsWith('kms://') && kmsRef.length > 6;
}

// ============================================================================
// Google Cloud KMS Integration (Production)
// ============================================================================

/**
 * TODO: Implement Google Cloud KMS integration for production
 *
 * Example implementation:
 *
 * import { KeyManagementServiceClient } from '@google-cloud/kms';
 *
 * const kmsClient = new KeyManagementServiceClient();
 *
 * export async function encryptWithKMS(plaintext: string): Promise<string> {
 *   const projectId = process.env.GOOGLE_CLOUD_PROJECT;
 *   const locationId = 'us-central1';
 *   const keyRingId = 'plaid-tokens';
 *   const keyId = 'access-token-key';
 *
 *   const keyName = kmsClient.cryptoKeyPath(projectId, locationId, keyRingId, keyId);
 *
 *   const [encryptResponse] = await kmsClient.encrypt({
 *     name: keyName,
 *     plaintext: Buffer.from(plaintext, 'utf8'),
 *   });
 *
 *   return `kms://${encryptResponse.ciphertext.toString('base64')}`;
 * }
 *
 * export async function decryptWithKMS(kmsRef: string): Promise<string> {
 *   const projectId = process.env.GOOGLE_CLOUD_PROJECT;
 *   const locationId = 'us-central1';
 *   const keyRingId = 'plaid-tokens';
 *   const keyId = 'access-token-key';
 *
 *   const keyName = kmsClient.cryptoKeyPath(projectId, locationId, keyRingId, keyId);
 *   const ciphertext = Buffer.from(kmsRef.substring(6), 'base64');
 *
 *   const [decryptResponse] = await kmsClient.decrypt({
 *     name: keyName,
 *     ciphertext,
 *   });
 *
 *   return decryptResponse.plaintext.toString('utf8');
 * }
 */
