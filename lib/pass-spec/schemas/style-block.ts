import * as z from "zod";
import { FIELD_CAPS } from "../constants";
import type { PassStyle } from "../constants";
import { makePassFieldSchema } from "./common";

/**
 * Build a field-section schema for a given pass style. Applies per-section
 * caps from FIELD_CAPS; refuses `additionalInfoFields` on non-eventTicket;
 * permits `row` on boardingPass only.
 */
export function makeStyleBlockSchema(style: PassStyle) {
  const caps = FIELD_CAPS[style];
  const allowRow = style === "boardingPass";

  const nonBackField = makePassFieldSchema({ allowBackOnly: false, allowRow });
  const backField = makePassFieldSchema({ allowBackOnly: true, allowRow });

  function section(
    kind: "headerFields" | "primaryFields" | "secondaryFields" | "auxiliaryFields" | "additionalInfoFields",
  ) {
    const cap = caps[kind];
    if (!cap) {
      return z.undefined();
    }
    return z.array(nonBackField).max(cap.max).optional();
  }

  const backCap = caps.backFields?.max ?? 20;

  return z.object({
    headerFields: section("headerFields"),
    primaryFields: section("primaryFields"),
    secondaryFields: section("secondaryFields"),
    auxiliaryFields: section("auxiliaryFields"),
    backFields: z.array(backField).max(backCap).optional(),
    additionalInfoFields:
      style === "eventTicket" ? section("additionalInfoFields") : z.undefined(),
  });
}
