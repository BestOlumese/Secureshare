import { describe, expect, it } from "vitest";
import { assessPassword, MIN_MASTER_PASSWORD_LENGTH } from "@/lib/password-strength";

describe("assessPassword", () => {
  it("rejects an empty password", () => {
    const result = assessPassword("");
    expect(result.acceptable).toBe(false);
    expect(result.score).toBe(0);
  });

  it("rejects anything under the minimum length", () => {
    const result = assessPassword("Ab1!xyz");
    expect(result.acceptable).toBe(false);
    expect(result.hints.join(" ")).toContain(String(MIN_MASTER_PASSWORD_LENGTH));
  });

  it("rejects a long password made of one repeated character", () => {
    expect(assessPassword("aaaaaaaaaaaaaaaa").acceptable).toBe(false);
  });

  it("rejects a common password even at full length", () => {
    // Long enough to pass the length gate, still the first thing anyone tries.
    expect(assessPassword("password1234").acceptable).toBe(false);
    expect(assessPassword("Password1234".toLowerCase()).acceptable).toBe(false);
  });

  it("rejects a long password with too little variety", () => {
    expect(assessPassword("abcdefghijklmnop").acceptable).toBe(false);
  });

  it("accepts a long password with mixed character classes", () => {
    const result = assessPassword("Tr0ubador&Horse");
    expect(result.acceptable).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it("scores a long, fully mixed password as strong", () => {
    const result = assessPassword("Xk9$mQw2!vRt7@Lp4#Zb");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Strong");
  });

  it("penalises sequential runs", () => {
    const withRun = assessPassword("Abcd1234!xyzQ");
    const without = assessPassword("Ax9k2mQ7!vRtZ");
    expect(withRun.score).toBeLessThan(without.score);
  });

  it("always explains itself when it rejects", () => {
    for (const candidate of ["short", "aaaaaaaaaaaaaaaa", "password1234", "abcdefghijklmnop"]) {
      const result = assessPassword(candidate);
      expect(result.acceptable).toBe(false);
      expect(result.hints.length).toBeGreaterThan(0);
    }
  });
});
