import type { NumberStyle } from "@/lib/pass-spec";

const STYLE_MAP: Record<
  NumberStyle,
  Intl.NumberFormatOptions | undefined
> = {
  PKNumberStyleDecimal: { style: "decimal" },
  PKNumberStylePercent: { style: "percent" },
  PKNumberStyleScientific: { notation: "scientific" },
  PKNumberStyleSpellOut: undefined, // Intl has no direct spell-out; Apple uses OS-level fallback.
};

export interface FormatNumberOptions {
  numberStyle?: NumberStyle;
  currencyCode?: string;
  locale?: string;
}

export function formatNumberValue(
  value: string | number,
  opts: FormatNumberOptions,
): string {
  if (typeof value === "string") {
    if (opts.currencyCode) {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber)) return formatCurrency(asNumber, opts.currencyCode, opts.locale);
    }
    if (!opts.numberStyle) return value;
    const asNumber = Number(value);
    if (Number.isNaN(asNumber)) return value;
    return applyStyle(asNumber, opts);
  }
  if (opts.currencyCode) return formatCurrency(value, opts.currencyCode, opts.locale);
  return applyStyle(value, opts);
}

function applyStyle(n: number, opts: FormatNumberOptions): string {
  if (!opts.numberStyle) return String(n);
  const mapped = STYLE_MAP[opts.numberStyle];
  if (!mapped) return String(n);
  return new Intl.NumberFormat(opts.locale, mapped).format(n);
}

function formatCurrency(n: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
}
