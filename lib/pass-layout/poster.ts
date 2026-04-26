import type { ValidatedPassDefinition } from "@/lib/pass-spec";
import type { LayoutPoster } from "./layoutTypes";
import { formatDateValue } from "./formatters/date";

/**
 * Derive the `LayoutPoster` block for an eventTicket definition whose
 * preferred scheme is `posterEventTicket`. Returns `undefined` when the
 * pass is not in poster mode — classic rendering applies in that case.
 *
 * Semantics validity is enforced at the schema boundary; this function
 * assumes every required tag is present and typed correctly.
 */
export function resolvePoster(
  definition: ValidatedPassDefinition,
  locale: string | undefined,
): LayoutPoster | undefined {
  if (definition.style !== "eventTicket") return undefined;
  const schemes = definition.preferredStyleSchemes;
  if (!schemes || schemes.length === 0) return undefined;
  if (schemes[0] !== "posterEventTicket") return undefined;

  const semantics = (definition.semantics ?? {}) as Record<string, unknown>;
  const readString = (k: string): string | undefined => {
    const v = semantics[k];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  const readStringArray = (k: string): readonly string[] | undefined => {
    const v = semantics[k];
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
    return out.length ? out : undefined;
  };

  const eventDateText = formatPosterDate(semantics.eventStartDate, locale);

  return {
    active: true,
    eventName: readString("eventName") ?? "",
    venueName: readString("venueName") ?? "",
    venueRegionName: readString("venueRegionName") ?? "",
    venueRoom: readString("venueRoom") ?? "",
    eventDateText,
    eventType: readString("eventType"),
    performerNames: readStringArray("performerNames"),
    awayTeamAbbreviation: readString("awayTeamAbbreviation"),
    homeTeamAbbreviation: readString("homeTeamAbbreviation"),
    suppressHeaderDarkening: definition.suppressHeaderDarkening === true,
  };
}

function formatPosterDate(raw: unknown, locale: string | undefined): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  // Apple's poster header uses a medium date + short time. Match Wallet.
  const text = formatDateValue(raw, {
    dateStyle: "PKDateStyleMedium",
    timeStyle: "PKDateStyleShort",
    ignoresTimeZone: false,
    locale,
  });
  return text && text !== raw ? text : text || undefined;
}
