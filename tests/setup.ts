import { webcrypto } from "node:crypto";

/**
 * lib/crypto-client.ts targets the browser and calls `window.crypto.subtle`
 * and `btoa`/`atob` directly. Node exposes the identical WebCrypto API, so
 * point `window` at it instead of booting a DOM.
 */
const globalAny = globalThis as unknown as {
  window?: unknown;
  crypto?: Crypto;
  btoa?: (data: string) => string;
  atob?: (data: string) => string;
};

if (!globalAny.crypto) {
  globalAny.crypto = webcrypto as unknown as Crypto;
}

if (!globalAny.btoa) {
  globalAny.btoa = (data: string) => Buffer.from(data, "binary").toString("base64");
}
if (!globalAny.atob) {
  globalAny.atob = (data: string) => Buffer.from(data, "base64").toString("binary");
}

globalAny.window = globalThis;
