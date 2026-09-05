/**
 * CSV serialisation for exports.
 *
 * The leading-character guard is the important part. Spreadsheet software
 * treats a cell beginning with =, +, -, @ (or a tab/carriage return) as a
 * formula, so an attacker who can set their display name to
 * `=HYPERLINK("http://evil","click")` gets code running in whoever opens the
 * export. Audit exports carry exactly that kind of user-controlled text.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Joins a header row and body rows into a CSV document (CRLF, per RFC 4180). */
export function toCsv(
  header: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  return [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
}
