import type { PassField } from "@/lib/pass-spec";
import type { LayoutField } from "./layoutTypes";
import { formatDateValue } from "./formatters/date";
import { formatNumberValue } from "./formatters/number";
import { sanitizeAttributedValue } from "./formatters/attributed";
import { mapTextAlignment } from "./textAlignment";

export interface ResolveFieldOptions {
  /** Default alignment for the section (primary fields are typically left). */
  sectionDefaultAlign?: "left" | "center" | "right" | "start" | "end";
  locale?: string;
}

/**
 * Resolve a single pass field into its layout representation.
 * Applies in order: formatters (date or number), text-alignment default,
 * and attributed-value sanitization.
 */
export function resolveField(
  field: PassField,
  opts: ResolveFieldOptions = {},
): LayoutField {
  let formatted: string;
  if (field.dateStyle || field.timeStyle) {
    formatted = formatDateValue(field.value, {
      dateStyle: field.dateStyle,
      timeStyle: field.timeStyle,
      ignoresTimeZone: field.ignoresTimeZone,
      isRelative: field.isRelative,
      locale: opts.locale,
    });
  } else if (field.numberStyle || field.currencyCode) {
    formatted = formatNumberValue(field.value, {
      numberStyle: field.numberStyle,
      currencyCode: field.currencyCode,
      locale: opts.locale,
    });
  } else {
    formatted = String(field.value);
  }

  const sanitizedHtml = field.attributedValue
    ? sanitizeAttributedValue(field.attributedValue)
    : undefined;

  const cssTextAlign = mapTextAlignment(
    field.textAlignment,
    opts.sectionDefaultAlign ?? "start",
  );

  return {
    key: field.key,
    label: field.label,
    formattedValue: formatted,
    cssTextAlign,
    sanitizedHtml,
    raw: {
      value: field.value,
      label: field.label,
      attributedValue: field.attributedValue,
      changeMessage: field.changeMessage,
      textAlignment: field.textAlignment,
      dateStyle: field.dateStyle,
      timeStyle: field.timeStyle,
      numberStyle: field.numberStyle,
      currencyCode: field.currencyCode,
      ignoresTimeZone: field.ignoresTimeZone,
      isRelative: field.isRelative,
      dataDetectorTypes: field.dataDetectorTypes,
      row: field.row,
    },
  };
}
