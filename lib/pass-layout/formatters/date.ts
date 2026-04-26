import type { DateStyle } from "@/lib/pass-spec";

/**
 * Map Apple's `PKDateStyle` / `PKTimeStyle` to `Intl.DateTimeFormat` options.
 * This is the ONE place both preview and generator agree on formatting —
 * any drift between environments would break the fidelity invariant.
 *
 * Apple's mapping (confirmed via Wallet rendering):
 *   PKDateStyleNone   → no date output
 *   PKDateStyleShort  → "short" (e.g., 6/10/26)
 *   PKDateStyleMedium → "medium" (Jun 10, 2026)
 *   PKDateStyleLong   → "long" (June 10, 2026)
 *   PKDateStyleFull   → "full" (Wednesday, June 10, 2026)
 */
const STYLE_MAP: Record<DateStyle, "short" | "medium" | "long" | "full" | undefined> = {
  PKDateStyleNone: undefined,
  PKDateStyleShort: "short",
  PKDateStyleMedium: "medium",
  PKDateStyleLong: "long",
  PKDateStyleFull: "full",
};

export interface FormatDateOptions {
  dateStyle?: DateStyle;
  timeStyle?: DateStyle;
  /**
   * Apple-documented behavior (PassFieldContent.ignoresTimeZone):
   *   false (default) — render in the device's current timezone.
   *   true            — render the wall-clock encoded in `value`, i.e. use
   *                     the timezone associated with the ISO string itself.
   *
   * Note the semantics: `true` does NOT mean "UTC". It means "whatever
   * timezone the author wrote into the value." A value like
   * `2026-09-12T20:00:00-04:00` with ignoresTimeZone=true should render
   * `8:00 PM` (the author's wall-clock), not `12:00 AM` (UTC) and not
   * the device-local translation.
   */
  ignoresTimeZone?: boolean;
  /** When true, render as a relative date ("in 2 hours"). */
  isRelative?: boolean;
  /** Locale, for testing. Defaults to runtime locale. */
  locale?: string;
}

// Capture the wall-clock fields + timezone suffix of an ISO 8601 value. The
// suffix group is optional so bare values (no offset) round-trip as
// "floating local" time — same behavior Apple documents for values that
// omit a timezone designator.
const ISO_PARTS_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2})?$/;

export function formatDateValue(
  value: string | number,
  opts: FormatDateOptions,
): string {
  if (typeof value === "number") return String(value);
  if (!opts.dateStyle && !opts.timeStyle) return value;
  if (opts.dateStyle === "PKDateStyleNone" && opts.timeStyle === "PKDateStyleNone") {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (opts.isRelative) {
    const rtf = new Intl.RelativeTimeFormat(opts.locale, { numeric: "auto" });
    const diffMs = date.getTime() - Date.now();
    const diffMin = Math.round(diffMs / 60000);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHr = Math.round(diffMs / 3600000);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
    const diffDay = Math.round(diffMs / 86400000);
    return rtf.format(diffDay, "day");
  }

  const options: Intl.DateTimeFormatOptions = {};
  const dateMapped = opts.dateStyle ? STYLE_MAP[opts.dateStyle] : undefined;
  const timeMapped = opts.timeStyle ? STYLE_MAP[opts.timeStyle] : undefined;
  if (dateMapped) options.dateStyle = dateMapped;
  if (timeMapped) options.timeStyle = timeMapped;

  // When ignoresTimeZone is true, the visible string must match the wall-
  // clock encoded in `value` — independent of the device's timezone. We
  // parse the literal Y/M/D/H/M/S fields out of the ISO string, rebuild a
  // Date as if those fields were UTC, and then ask Intl to format it in
  // UTC. That gives "8:00 PM" for "2026-09-12T20:00:00-04:00" and
  // "3:30 PM" for "2026-09-12T15:30:00" (bare local) regardless of the
  // runtime TZ.
  if (opts.ignoresTimeZone) {
    const m = ISO_PARTS_RE.exec(value);
    if (m) {
      const [, y, mo, d, hh, mm, ss = "0", ms = "0"] = m;
      const wall = new Date(
        Date.UTC(
          Number(y),
          Number(mo) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          Number(ss),
          Number(ms.padEnd(3, "0")),
        ),
      );
      options.timeZone = "UTC";
      return new Intl.DateTimeFormat(opts.locale, options).format(wall);
    }
    // ISO didn't match — fall through to the device-tz path rather than
    // producing a misleading UTC render.
  }

  return new Intl.DateTimeFormat(opts.locale, options).format(date);
}
