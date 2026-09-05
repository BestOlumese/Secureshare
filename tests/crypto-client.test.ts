import { describe, expect, it } from "vitest";
import {
  decryptData,
  decryptPrivateKeyFromSync,
  decryptString,
  encryptFile,
  encryptPrivateKeyForSync,
  encryptString,
  generateAesKey,
  generateRecoveryKey,
  exportPrivateKeyForManualBackup,
  importPrivateKeyFromManualBackup,
  opaqueUploadName,
  tryDecryptString,
  unwrapAesKey,
  wrapAesKey,
  LEGACY_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
} from "@/lib/crypto-client";

async function generateRsaPair() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  return {
    publicKeyBase64: btoa(String.fromCharCode(...new Uint8Array(spki))),
    privateKeyBuffer: pkcs8,
  };
}

describe("string encryption", () => {
  it("round-trips text", async () => {
    const key = await generateAesKey();
    const plaintext = "Quarterly report — final.pdf";
    expect(await decryptString(await encryptString(plaintext, key), key)).toBe(plaintext);
  });

  it("produces different ciphertext each time for the same input", async () => {
    const key = await generateAesKey();
    // A fresh IV per call; identical file names must not be linkable.
    expect(await encryptString("invoice.pdf", key)).not.toBe(
      await encryptString("invoice.pdf", key)
    );
  });

  it("fails to decrypt with the wrong key", async () => {
    const ciphertext = await encryptString("secret", await generateAesKey());
    await expect(decryptString(ciphertext, await generateAesKey())).rejects.toThrow();
  });
});

describe("tryDecryptString", () => {
  it("returns the plaintext when the value is real ciphertext", async () => {
    const key = await generateAesKey();
    expect(await tryDecryptString(await encryptString("report.pdf", key), key)).toBe("report.pdf");
  });

  it("returns null for a legacy plaintext file name instead of throwing", async () => {
    // Rows written before names were encrypted must fall back, not crash.
    expect(await tryDecryptString("budget.xlsx", await generateAesKey())).toBeNull();
  });

  it("returns null for empty input", async () => {
    const key = await generateAesKey();
    expect(await tryDecryptString(null, key)).toBeNull();
    expect(await tryDecryptString("", key)).toBeNull();
  });

  it("returns null when the key is wrong", async () => {
    const ciphertext = await encryptString("payroll.csv", await generateAesKey());
    expect(await tryDecryptString(ciphertext, await generateAesKey())).toBeNull();
  });
});

describe("file encryption", () => {
  it("round-trips binary content", async () => {
    const key = await generateAesKey();
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    const { encryptedBlob } = await encryptFile(new Blob([bytes]), key);
    const decrypted = new Uint8Array(await decryptData(await encryptedBlob.arrayBuffer(), key));
    expect(Array.from(decrypted)).toEqual(Array.from(bytes));
  });

  it("does not leave the plaintext in the encrypted blob", async () => {
    const key = await generateAesKey();
    const bytes = new TextEncoder().encode("BEGIN CONFIDENTIAL");
    const { encryptedBlob } = await encryptFile(new Blob([bytes]), key);
    const raw = new Uint8Array(await encryptedBlob.arrayBuffer());
    expect(new TextDecoder().decode(raw)).not.toContain("BEGIN CONFIDENTIAL");
  });
});

describe("opaqueUploadName", () => {
  it("drops the original name but keeps the extension", () => {
    const name = opaqueUploadName("Board Minutes 2026.pdf");
    expect(name).toMatch(/^[0-9a-f]{32}\.pdf$/);
    expect(name.toLowerCase()).not.toContain("board");
    expect(name.toLowerCase()).not.toContain("minutes");
  });

  it("handles a name with no extension", () => {
    expect(opaqueUploadName("READ_ME")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is unique per call", () => {
    const names = new Set(Array.from({ length: 50 }, () => opaqueUploadName("a.txt")));
    expect(names.size).toBe(50);
  });
});

describe("AES key wrapping", () => {
  it("unwraps to a key that decrypts the original payload", async () => {
    const { publicKeyBase64, privateKeyBuffer } = await generateRsaPair();
    const aesKey = await generateAesKey();
    const ciphertext = await encryptString("hello", aesKey);

    const unwrapped = await unwrapAesKey(await wrapAesKey(aesKey, publicKeyBase64), privateKeyBuffer);
    expect(await decryptString(ciphertext, unwrapped)).toBe("hello");
  });
});

describe("private key sync", () => {
  it("round-trips the private key with the right password", async () => {
    const { privateKeyBuffer } = await generateRsaPair();
    const { encryptedKey, salt, iv, iterations } = await encryptPrivateKeyForSync(
      privateKeyBuffer,
      "correct horse battery staple"
    );
    const recovered = await decryptPrivateKeyFromSync(
      encryptedKey, "correct horse battery staple", salt, iv, iterations
    );
    expect(new Uint8Array(recovered)).toEqual(new Uint8Array(privateKeyBuffer));
  });

  it("rejects the wrong password", async () => {
    const { privateKeyBuffer } = await generateRsaPair();
    const { encryptedKey, salt, iv, iterations } = await encryptPrivateKeyForSync(privateKeyBuffer, "right-password-here");
    await expect(
      decryptPrivateKeyFromSync(encryptedKey, "wrong-password-here", salt, iv, iterations)
    ).rejects.toThrow();
  });

  it("records the current iteration count", async () => {
    const { privateKeyBuffer } = await generateRsaPair();
    const { iterations } = await encryptPrivateKeyForSync(privateKeyBuffer, "a-strong-password-1");
    expect(iterations).toBe(PBKDF2_ITERATIONS);
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  it("treats a missing iteration count as the legacy value", async () => {
    // Keys written before the column existed used 100k and must still open.
    const { privateKeyBuffer } = await generateRsaPair();
    const password = "legacy-vault-password";
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const passwordKey = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const legacyKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: LEGACY_PBKDF2_ITERATIONS, hash: "SHA-256" },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, legacyKey, privateKeyBuffer);

    const recovered = await decryptPrivateKeyFromSync(
      btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      password,
      btoa(String.fromCharCode(...salt)),
      btoa(String.fromCharCode(...iv)),
      // No count stored — the legacy default must be applied.
      null
    );
    expect(new Uint8Array(recovered)).toEqual(new Uint8Array(privateKeyBuffer));
  });

  it("does not decrypt a legacy blob at the new iteration count", async () => {
    const { privateKeyBuffer } = await generateRsaPair();
    const { encryptedKey, salt, iv } = await encryptPrivateKeyForSync(privateKeyBuffer, "another-password-x");
    // Reading a 600k blob as if it were 100k must fail, not silently succeed.
    await expect(
      decryptPrivateKeyFromSync(encryptedKey, "another-password-x", salt, iv, LEGACY_PBKDF2_ITERATIONS)
    ).rejects.toThrow();
  });
});

describe("recovery key", () => {
  it("is 48 hex characters of randomness", () => {
    const key = generateRecoveryKey();
    expect(key).toMatch(/^[0-9a-f]{48}$/);
    expect(generateRecoveryKey()).not.toBe(key);
  });
});

describe("manual key backup", () => {
  it("round-trips through base64", async () => {
    const { privateKeyBuffer } = await generateRsaPair();
    const restored = importPrivateKeyFromManualBackup(
      exportPrivateKeyForManualBackup(privateKeyBuffer)
    );
    expect(new Uint8Array(restored)).toEqual(new Uint8Array(privateKeyBuffer));
  });
});
