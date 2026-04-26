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
  /** When true, treat the ISO string as device-local time regardless of offset. */
  ignoresTimeZone?: boolean;
  /** When true, render as a relative date ("in 2 hours"). */
  isRelative?: boolean;
  /** Locale, for testing. Defaults to runtime locale. */
  locale?: string;
  /** Used only when ignoresTimeZone: true; defaults to "UTC" for determinism. */
  timeZone?: string;
}

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
  if (opts.ignoresTimeZone) options.timeZone = opts.timeZone ?? "UTC";

  return new Intl.DateTimeFormat(opts.locale, options).format(date);
}
