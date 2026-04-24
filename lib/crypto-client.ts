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
 * Derives a cryptographic key from a password using PBKDF2.
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt,
      iterations: 100000,
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
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptionKey = await deriveKeyFromPassword(password, salt);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    privateKeyBuffer
  );

  return {
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypts the RSA Private Key using the Master Password.
 */
export async function decryptPrivateKeyFromSync(
  encryptedKeyBase64: string,
  password: string,
  saltBase64: string,
  ivBase64: string
): Promise<ArrayBuffer> {
  const salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
  const encryptedKey = new Uint8Array(atob(encryptedKeyBase64).split("").map(c => c.charCodeAt(0)));

  const decryptionKey = await deriveKeyFromPassword(password, salt);
  
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
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  // We use the same sync logic but with the recovery key
  return encryptPrivateKeyForSync(privateKeyBuffer, recoveryKey);
}
