import { describe, expect, it } from "vitest";
import { MESSAGE_SELECT, notExpired } from "@/lib/message-filters";

describe("notExpired", () => {
  // The union member carrying `gt` — narrowed once for all assertions below.
  const futureBound = () => {
    const clause = notExpired().OR[1].expiryDate;
    if (clause === null) throw new Error("expected a comparison clause");
    return clause.gt;
  };

  it("matches rows with no expiry or an expiry in the future", () => {
    expect(notExpired().OR[0]).toEqual({ expiryDate: null });
    expect(futureBound()).toBeInstanceOf(Date);
  });

  it("evaluates against the current time on each call", async () => {
    const first = futureBound();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = futureBound();
    // A module-level constant would freeze at import time and let expired
    // messages back into the list as the process stayed up.
    expect(second.getTime()).toBeGreaterThan(first.getTime());
  });
});

describe("MESSAGE_SELECT", () => {
  // These assertions are the regression test for the payload leak: a `select`
  // that grows a `true` on a User relation ships private key material to the
  // browser again.
  const KEY_FIELDS = [
    "encryptedPrivateKey",
    "privateKeySalt",
    "privateKeyIV",
    "recoveryEncryptedPrivateKey",
    "recoverySalt",
    "recoveryIV",
  ];

  it("never selects key material for the sender", () => {
    const fields = Object.keys(MESSAGE_SELECT.sender.select);
    for (const field of KEY_FIELDS) expect(fields).not.toContain(field);
  });

  it("never selects key material for recipients", () => {
    const fields = Object.keys(MESSAGE_SELECT.recipients.select.user.select);
    for (const field of KEY_FIELDS) expect(fields).not.toContain(field);
  });

  it("selects the sender and recipient as an explicit field list, not `true`", () => {
    // `sender: true` is what returned every column in the first place.
    expect(typeof MESSAGE_SELECT.sender).toBe("object");
    expect(typeof MESSAGE_SELECT.recipients.select.user).toBe("object");
  });

  it("omits fileUrl so blobs can't be fetched around the access checks", () => {
    expect(Object.keys(MESSAGE_SELECT.documents.select)).not.toContain("fileUrl");
  });

  it("still selects what the dashboard renders", () => {
    expect(Object.keys(MESSAGE_SELECT)).toEqual(
      expect.arrayContaining(["id", "senderId", "subject", "content", "createdAt"])
    );
    expect(Object.keys(MESSAGE_SELECT.recipients.select)).toEqual(
      expect.arrayContaining(["userId", "role", "readAt"])
    );
  });
});
