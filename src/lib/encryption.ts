/**
 * Encryption and Compression Utilities
 *
 * Zero-knowledge encryption: All encryption/decryption happens client-side.
 * Server never sees plaintext content.
 */

// ============================================================================
// Types
// ============================================================================

export interface EncryptionResult {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
}

export interface CompressionResult {
  compressed: Uint8Array;
}

// ============================================================================
// DEK Model: Data Encryption Key Generation
// ============================================================================

/**
 * Generates a random 256-bit Data Encryption Key (DEK)
 * This key will be used to encrypt all journal entries
 * @returns CryptoKey for AES-GCM encryption
 */
export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256, // 256-bit key
    },
    true, // Extractable (we need to encrypt it with KEKs)
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random salt for key derivation
 * @returns Base64-encoded random salt
 */
export function generateSalt(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, ""); // URL-safe base64
}

// ============================================================================
// KEK Derivation (Key Encryption Keys)
// ============================================================================

/**
 * Derives a Key Encryption Key (KEK) from a passphrase using PBKDF2
 * This KEK is used to encrypt/decrypt the DEK
 * @param passphrase - User's journal passphrase
 * @param salt - Salt for key derivation (stored server-side)
 * @returns CryptoKey for encrypting/decrypting the DEK
 */
export async function deriveKEKFromPassphrase(
  passphrase: string,
  salt: string
): Promise<CryptoKey> {
  // Convert passphrase and salt to ArrayBuffer
  const passphraseBuffer = new TextEncoder().encode(passphrase);
  const saltBuffer = new TextEncoder().encode(salt);

  // Import passphrase as a key for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passphraseBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000, // High iteration count for security
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256, // 256-bit key
    },
    false, // Not extractable
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

/**
 * Derives a Key Encryption Key (KEK) from a recovery key using PBKDF2
 * This KEK is used to encrypt/decrypt the DEK for recovery purposes
 * @param recoveryKey - User's recovery key
 * @param salt - Salt for key derivation (stored server-side)
 * @returns CryptoKey for encrypting/decrypting the DEK
 */
export async function deriveKEKFromRecoveryKey(
  recoveryKey: string,
  salt: string
): Promise<CryptoKey> {
  // Convert recovery key and salt to ArrayBuffer
  const recoveryKeyBuffer = new TextEncoder().encode(recoveryKey);
  const saltBuffer = new TextEncoder().encode(salt);

  // Import recovery key as a key for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    recoveryKeyBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000, // High iteration count for security
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256, // 256-bit key
    },
    false, // Not extractable
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

/**
 * Generates a recovery key (random string)
 * This can be used to recover the journal if passphrase is lost
 * @returns A random recovery key string
 */
export function generateRecoveryKey(): string {
  // Generate 32 random bytes and encode as base64
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, ""); // URL-safe base64
}

// ============================================================================
// DEK Encryption/Decryption with KEKs
// ============================================================================

/**
 * Encrypts a DEK (Data Encryption Key) using a KEK (Key Encryption Key)
 * @param dek - The DEK to encrypt (as CryptoKey)
 * @param kek - The KEK to encrypt with
 * @returns Encrypted DEK with IV
 */
export async function encryptDEK(
  dek: CryptoKey,
  kek: CryptoKey
): Promise<EncryptionResult> {
  // Export DEK as raw bytes
  const dekBytes = await crypto.subtle.exportKey("raw", dek);

  // Encrypt DEK bytes with KEK
  return encryptData(new Uint8Array(dekBytes), kek);
}

/**
 * Decrypts an encrypted DEK using a KEK
 * @param encryptedDek - Encrypted DEK data (base64)
 * @param iv - Initialization vector (base64)
 * @param kek - The KEK to decrypt with
 * @returns Decrypted DEK as CryptoKey
 */
export async function decryptDEK(
  encryptedDek: string,
  iv: string,
  kek: CryptoKey
): Promise<CryptoKey> {
  // Decrypt DEK bytes
  const dekBytes = await decryptData(encryptedDek, iv, kek);

  // Import decrypted bytes as CryptoKey
  return crypto.subtle.importKey(
    "raw",
    dekBytes as BufferSource,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // Not extractable
    ["encrypt", "decrypt"]
  );
}

// ============================================================================
// Compression (using CompressionStream API)
// ============================================================================

/**
 * Compresses text using gzip compression
 * @param text - Plain text to compress
 * @returns Compressed Uint8Array
 */
export async function compressText(text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  // Write text to compression stream
  writer.write(encoder.encode(text));
  writer.close();

  // Read compressed chunks
  const chunks: Uint8Array[] = [];
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) {
      chunks.push(value);
    }
  }

  // Combine all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Decompresses gzip-compressed data back to text
 * @param compressed - Compressed Uint8Array
 * @returns Decompressed plain text
 */
export async function decompressText(compressed: Uint8Array): Promise<string> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  // Write compressed data to decompression stream
  writer.write(compressed as BufferSource);
  writer.close();

  // Read decompressed chunks
  const chunks: Uint8Array[] = [];
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) {
      chunks.push(value);
    }
  }

  // Combine all chunks and decode to text
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(result);
}

// ============================================================================
// Encryption (AES-GCM)
// ============================================================================

/**
 * Encrypts data using AES-GCM
 * @param data - Data to encrypt (Uint8Array)
 * @param key - CryptoKey for encryption
 * @returns Encrypted data with IV
 */
export async function encryptData(
  data: Uint8Array,
  key: CryptoKey
): Promise<EncryptionResult> {
  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt data
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
    },
    key,
    data as BufferSource
  );

  // Convert to base64 for storage
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypts AES-GCM encrypted data
 * @param encryptedData - Base64 encoded encrypted data
 * @param iv - Base64 encoded initialization vector
 * @param key - CryptoKey for decryption
 * @returns Decrypted Uint8Array
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer as BufferSource,
    },
    key,
    encryptedBuffer as BufferSource
  );

  return new Uint8Array(decrypted);
}

// ============================================================================
// Combined: Compress + Encrypt
// ============================================================================

/**
 * Compresses and encrypts text content
 * This is the main function for saving journal entries
 * @param text - Plain text content
 * @param key - Encryption key derived from passphrase
 * @returns Encrypted result ready for storage
 */
export async function compressAndEncrypt(
  text: string,
  key: CryptoKey
): Promise<EncryptionResult> {
  // Step 1: Compress
  const compressed = await compressText(text);

  // Step 2: Encrypt
  return encryptData(compressed, key);
}

/**
 * Decrypts and decompresses content
 * This is the main function for reading journal entries
 * @param encryptedData - Base64 encoded encrypted data
 * @param iv - Base64 encoded initialization vector
 * @param key - Encryption key derived from passphrase
 * @returns Decrypted and decompressed plain text
 */
export async function decryptAndDecompress(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  // Step 1: Decrypt
  const decrypted = await decryptData(encryptedData, iv, key);

  // Step 2: Decompress
  return decompressText(decrypted);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); // URL-safe base64
}

/**
 * Converts base64 string to Uint8Array
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  // Add padding if needed
  let padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// Word Count Utility
// ============================================================================

/**
 * Calculates word count from text
 * Used for metadata storage
 */
export function calculateWordCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}
