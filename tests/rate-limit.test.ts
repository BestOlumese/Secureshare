import { describe, expect, it } from "vitest";
import { limitAction, rateLimit } from "@/lib/rate-limit";

// The limiter is module-level state, so every test uses a distinct key.
let counter = 0;
const uniqueKey = (label: string) => `${label}-${counter++}-${Math.random()}`;

describe("rateLimit", () => {
  it("allows calls up to the limit and refuses the next one", () => {
    const key = uniqueKey("basic");
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).success).toBe(true);
    }
    expect(rateLimit(key, 3, 60_000).success).toBe(false);
  });

  it("counts down remaining and never reports a negative", () => {
    const key = uniqueKey("remaining");
    expect(rateLimit(key, 2, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 2, 60_000).remaining).toBe(0);
    expect(rateLimit(key, 2, 60_000).remaining).toBe(0);
  });

  it("starts a fresh window once the old one lapses", async () => {
    const key = uniqueKey("window");
    expect(rateLimit(key, 1, 1).success).toBe(true);
    expect(rateLimit(key, 1, 1).success).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(rateLimit(key, 1, 1).success).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = uniqueKey("a");
    const b = uniqueKey("b");
    expect(rateLimit(a, 1, 60_000).success).toBe(true);
    expect(rateLimit(a, 1, 60_000).success).toBe(false);
    expect(rateLimit(b, 1, 60_000).success).toBe(true);
  });
});

describe("limitAction", () => {
  it("stays quiet under the limit", () => {
    const user = uniqueKey("user");
    expect(() => limitAction("send", user, 2, 60_000)).not.toThrow();
    expect(() => limitAction("send", user, 2, 60_000)).not.toThrow();
  });

  it("throws with a retry hint once the limit is passed", () => {
    const user = uniqueKey("user");
    limitAction("send", user, 1, 60_000);
    expect(() => limitAction("send", user, 1, 60_000)).toThrow(/Too many requests/);
  });

  it("keeps separate budgets per action", () => {
    const user = uniqueKey("user");
    limitAction("invite", user, 1, 60_000);
    expect(() => limitAction("invite", user, 1, 60_000)).toThrow();
    // A different action for the same user must be unaffected.
    expect(() => limitAction("search", user, 1, 60_000)).not.toThrow();
  });
});
