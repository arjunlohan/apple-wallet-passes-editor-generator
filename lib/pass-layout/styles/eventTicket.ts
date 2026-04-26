import type { EventTicketBlock, ValidatedPassDefinition } from "@/lib/pass-spec";
import type { LayoutBack, LayoutFront } from "../layoutTypes";
import { buildSections } from "./shared";

export function buildEventTicketLayout(
  definition: ValidatedPassDefinition & {
    style: "eventTicket";
    eventTicket: EventTicketBlock;
  },
  opts: { locale?: string } = {},
): { front: LayoutFront; back: LayoutBack } {
  const { front: frontSections, back: backSections } = buildSections(definition.eventTicket, {
    frontSectionNames: ["headerFields", "primaryFields", "secondaryFields", "auxiliaryFields"],
    // additionalInfoFields renders on the back face (iOS shows them in
    // the detail view below the back fields).
    backSectionNames: ["backFields", "additionalInfoFields"],
    defaults: {
      headerFields: "end",
      primaryFields: "start",
      secondaryFields: "start",
      auxiliaryFields: "start",
    },
    locale: opts.locale,
  });

  return {
    front: { style: "eventTicket", sections: frontSections, meta: {} },
    back: { sections: backSections },
  };
}
