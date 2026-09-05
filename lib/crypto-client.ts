/**
 * Client-side cryptographic operations for SecureShare.
 * Uses Web Crypto API for maximum security and performance.
 */

/**
 * Generates a random 256-bit AES-GCM key.
 */
export async function generateAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a file (Blob) using AES-GCM.
 * Returns the IV and the encrypted data.
 */
export async function encryptFile(
  file: Blob,
  key: CryptoKey
): Promise<{ encryptedBlob: Blob }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = await file.arrayBuffer();

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data
  );

  // Prepend IV to the encrypted data for storage
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return { encryptedBlob: new Blob([combined]) };
}

/**
 * Encrypts a string using AES-GCM.
 * Returns the IV and encrypted data combined as a base64 string.
 */
export async function encryptString(
  text: string,
  key: CryptoKey
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Wraps (encrypts) the AES key using the receiver's RSA-OAEP Public Key.
 */
export async function wrapAesKey(
  aesKey: CryptoKey,
  publicKeyBase64: string
): Promise<string> {
  const binaryDerString = window.atob(publicKeyBase64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const wrappedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    exportedAesKey
  );

  return btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
}

/**
 * Decrypts data using AES-GCM.
 */
export async function decryptData(
  combinedData: ArrayBuffer,
  aesKey: CryptoKey
): Promise<ArrayBuffer> {
  const fullData = new Uint8Array(combinedData);
  const iv = fullData.slice(0, 12);
  const encryptedContent = fullData.slice(12);

  return window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    encryptedContent
  );
}

/**
 * Decrypts a base64 encoded string using AES-GCM.
 */
export async function decryptString(
  base64Data: string,
  aesKey: CryptoKey
): Promise<string> {
  const binaryString = atob(base64Data);
  const fullData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    fullData[i] = binaryString.charCodeAt(i);
  }

  const iv = fullData.slice(0, 12);
  const encryptedContent = fullData.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    encryptedContent
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Unwraps (decrypts) the AES key using the user's RSA-OAEP Private Key.
 */
export async function unwrapAesKey(
  wrappedKeyBase64: string,
  privateKeyBuffer: ArrayBuffer
): Promise<CryptoKey> {
  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  const wrappedKey = new Uint8Array(
    atob(wrappedKeyBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const aesKeyRaw = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    wrappedKey
  );

  return window.crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * PBKDF2 rounds for newly derived keys. OWASP's current floor for
 * PBKDF2-SHA256; each round is work an offline password guesser must repeat.
 */
export const PBKDF2_ITERATIONS = 600_000;

/**
 * What keys used before the count was recorded. Anything with a null
 * kdfIterations was derived with this and must keep using it, or it stops
 * decrypting.
 */
export const LEGACY_PBKDF2_ITERATIONS = 100_000;

/**
 * Derives a cryptographic key from a password using PBKDF2.
 */
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts the RSA Private Key with a Master Password for server-side sync.
 */
export async function encryptPrivateKeyForSync(
  privateKeyBuffer: ArrayBuffer,
  password: string
): Promise<{ encryptedKey: string; salt: string; iv: string; iterations: number }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptionKey = await deriveKeyFromPassword(password, salt, PBKDF2_ITERATIONS);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    privateKeyBuffer
  );

  return {
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    // Stored alongside the blob so it can still be decrypted after this
    // constant changes again.
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Decrypts the RSA Private Key using the Master Password.
 */
export async function decryptPrivateKeyFromSync(
  encryptedKeyBase64: string,
  password: string,
  saltBase64: string,
  ivBase64: string,
  iterations?: number | null
): Promise<ArrayBuffer> {
  const salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
  const encryptedKey = new Uint8Array(atob(encryptedKeyBase64).split("").map(c => c.charCodeAt(0)));

  // A missing count means the blob predates the column: it was 100k.
  const decryptionKey = await deriveKeyFromPassword(
    password,
    salt,
    iterations ?? LEGACY_PBKDF2_ITERATIONS
  );
  
  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    decryptionKey,
    encryptedKey
  );
}

/**
 * Generates a high-entropy 32-character recovery key.
 */
export function generateRecoveryKey(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Exports the raw Private Key buffer to a base64 string for manual backup.
 */
export function exportPrivateKeyForManualBackup(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Imports a raw Private Key buffer from a base64 string.
 */
export function importPrivateKeyFromManualBackup(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}

/**
 * Encrypts the Private Key using a recovery key as the "password".
 */
export async function encryptPrivateKeyWithRecoveryKey(
  privateKeyBuffer: ArrayBuffer,
  recoveryKey: string
): Promise<{ encryptedKey: string; salt: string; iv: string; iterations: number }> {
  // We use the same sync logic but with the recovery key
  return encryptPrivateKeyForSync(privateKeyBuffer, recoveryKey);
}

/**
 * Attempts to decrypt a base64 AES-GCM payload, returning null instead of
 * throwing when the value isn't valid ciphertext (e.g. legacy plaintext rows).
 */
export async function tryDecryptString(
  base64Data: string | null | undefined,
  aesKey: CryptoKey
): Promise<string | null> {
  if (!base64Data) return null;
  try {
    return await decryptString(base64Data, aesKey);
  } catch {
    return null;
  }
}

/**
 * Builds an opaque upload name so the storage provider never sees the real
 * file name. The extension is kept because the upload router keys off it.
 */
export function opaqueUploadName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase() : "";
  const rand = Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return ext ? `${rand}.${ext}` : rand;
}
