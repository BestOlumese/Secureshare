import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("quotes ordinary values", () => {
    expect(csvCell("Ana Diaz")).toBe('"Ana Diaz"');
  });

  it("doubles embedded quotes", () => {
    expect(csvCell('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("keeps commas and newlines inside the quoted field", () => {
    expect(csvCell("Diaz, Ana")).toBe('"Diaz, Ana"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null and undefined as empty", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("neutralises formula-injection prefixes", () => {
    // A display name is user-controlled and lands in the export verbatim.
    // Without the guard, opening the CSV runs this.
    for (const attack of [
      '=HYPERLINK("http://evil.test","click")',
      "+1+1",
      "-1+1",
      "@SUM(A1:A9)",
      "\tcmd",
      "\rcmd",
    ]) {
      const cell = csvCell(attack);
      expect(cell.startsWith(`"'`)).toBe(true);
      // The original text survives, just no longer as a formula.
      expect(cell).toContain(attack.replace(/"/g, '""'));
    }
  });

  it("leaves a value that merely contains an equals sign alone", () => {
    expect(csvCell("a=b")).toBe('"a=b"');
  });
});

describe("toCsv", () => {
  it("writes a header and rows separated by CRLF", () => {
    const csv = toCsv(["Name", "Count"], [["Ana", 2], ["Ben", 0]]);
    expect(csv).toBe('"Name","Count"\r\n"Ana","2"\r\n"Ben","0"');
  });

  it("guards user-controlled values in the body", () => {
    const csv = toCsv(["Name"], [["=1+1"]]);
    expect(csv).toContain(`"'=1+1"`);
  });

  it("handles an empty body", () => {
    expect(toCsv(["Name"], [])).toBe('"Name"');
  });
});
