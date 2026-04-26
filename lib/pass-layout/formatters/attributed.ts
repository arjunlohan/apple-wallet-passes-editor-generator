import { ALLOWED_URL_SCHEMES } from "@/lib/pass-spec";

/**
 * Sanitize an attributedValue string down to a safe `<a href>` subset.
 * Used by the back-face renderer. Returns an HTML string suitable for
 * `dangerouslySetInnerHTML` after escape-and-rewrap.
 *
 * Non-anchor HTML is stripped (schema validation rejects it upstream,
 * but we sanitize defensively). Anchors with disallowed schemes are
 * stripped to plain text.
 */
export function sanitizeAttributedValue(input: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const anchorRe = /<a\s+href=(?:"([^"]*)"|'([^']*)')[^>]*>(.*?)<\/a>/gi;
  const parts: string[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(input)) !== null) {
    parts.push(escape(input.slice(cursor, m.index)));
    const href = m[1] ?? m[2] ?? "";
    const text = m[3] ?? "";
    let ok = false;
    try {
      const scheme = new URL(href).protocol.toLowerCase();
      ok = (ALLOWED_URL_SCHEMES as readonly string[]).includes(scheme);
    } catch {
      ok = false;
    }
    if (ok) {
      parts.push(
        `<a href="${escape(href)}" rel="noopener noreferrer">${escape(text)}</a>`,
      );
    } else {
      parts.push(escape(text));
    }
    cursor = m.index + m[0].length;
  }
  parts.push(escape(input.slice(cursor)));
  return parts.join("");
}
