import * as z from "zod";
import { POSTER_REQUIRED_SEMANTIC_TAGS } from "../constants";
import { addWebServiceRefinement, baseDefinition } from "./common";
import { makeStyleBlockSchema } from "./style-block";

const base = baseDefinition.extend({
  style: z.literal("eventTicket"),
  eventTicket: makeStyleBlockSchema("eventTicket"),
});

/**
 * Poster mode rules (iOS 26+):
 *  - If `preferredStyleSchemes` lists "posterEventTicket", every tag in
 *    POSTER_REQUIRED_SEMANTIC_TAGS must be present (eventName, venueName,
 *    venueRegionName, venueRoom).
 *  - Sports events additionally require both team abbreviations.
 *  - Live performances additionally require a non-empty performerNames.
 *  - `additionalInfoFields` is only meaningful in poster mode — we don't
 *    reject it outside poster mode (Apple silently ignores on <iOS 18).
 *  - A trailing "eventTicket" fallback is required so pre-iOS 26 devices
 *    still render the pass.
 *  - `suppressHeaderDarkening` is poster-only; outside poster mode it's a
 *    no-op. We permit it everywhere to keep the editor form simple.
 */
const withPosterRefinement = base.superRefine((value, ctx) => {
  const schemes = value.preferredStyleSchemes;
  if (!schemes || schemes.length === 0) return;
  const posterRequested = schemes[0] === "posterEventTicket";
  if (!posterRequested) return;

  if (!schemes.includes("eventTicket")) {
    ctx.addIssue({
      code: "custom",
      path: ["preferredStyleSchemes"],
      message:
        "posterEventTicket must be followed by eventTicket as the fallback scheme (pre-iOS 26 devices)",
    });
  }

  const semantics = (value.semantics ?? {}) as Record<string, unknown>;
  for (const tag of POSTER_REQUIRED_SEMANTIC_TAGS) {
    const v = semantics[tag];
    if (typeof v !== "string" || v.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["semantics", tag],
        message: `posterEventTicket requires semantics.${tag}`,
      });
    }
  }

  const eventType = typeof semantics.eventType === "string" ? semantics.eventType : undefined;
  if (eventType === "PKEventTypeSports") {
    for (const tag of ["awayTeamAbbreviation", "homeTeamAbbreviation"] as const) {
      if (typeof semantics[tag] !== "string" || (semantics[tag] as string).trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["semantics", tag],
          message: `PKEventTypeSports posters require semantics.${tag}`,
        });
      }
    }
  }
  if (eventType === "PKEventTypeLivePerformance") {
    const performers = semantics.performerNames;
    const ok = Array.isArray(performers) && performers.some((p) => typeof p === "string" && p.trim() !== "");
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["semantics", "performerNames"],
        message:
          "PKEventTypeLivePerformance posters require semantics.performerNames to be a non-empty string array",
      });
    }
  }
});

export const eventTicketDefinition = addWebServiceRefinement(withPosterRefinement);
