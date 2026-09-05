import { describe, expect, it } from "vitest";
import { fileKeyFromUrl } from "@/lib/cleanup";

describe("fileKeyFromUrl", () => {
  it("pulls the key off a standard UploadThing URL", () => {
    expect(fileKeyFromUrl("https://abc123.ufs.sh/f/KEY_abc123def456")).toBe("KEY_abc123def456");
  });

  it("handles the legacy utfs.io host", () => {
    expect(fileKeyFromUrl("https://utfs.io/f/9d4a1b2c-file.enc")).toBe("9d4a1b2c-file.enc");
  });

  it("ignores a query string", () => {
    expect(fileKeyFromUrl("https://abc.ufs.sh/f/SOMEKEY?v=2")).toBe("SOMEKEY");
  });

  it("returns null rather than throwing on unusable input", () => {
    // A null key is skipped by the purge; a throw would abort the whole run
    // and leave every later blob in place.
    expect(fileKeyFromUrl(null)).toBeNull();
    expect(fileKeyFromUrl("")).toBeNull();
    expect(fileKeyFromUrl("not a url")).toBeNull();
  });

  it("returns null for a URL with no path segment to use", () => {
    expect(fileKeyFromUrl("https://abc.ufs.sh/")).toBeNull();
  });
});
