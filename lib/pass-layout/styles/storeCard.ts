import type { StoreCardBlock, ValidatedPassDefinition } from "@/lib/pass-spec";
import type { LayoutBack, LayoutFront } from "../layoutTypes";
import { buildSections } from "./shared";

export function buildStoreCardLayout(
  definition: ValidatedPassDefinition & {
    style: "storeCard";
    storeCard: StoreCardBlock;
  },
  opts: { locale?: string } = {},
): { front: LayoutFront; back: LayoutBack } {
  const { front: frontSections, back: backSections } = buildSections(definition.storeCard, {
    frontSectionNames: ["headerFields", "primaryFields", "secondaryFields", "auxiliaryFields"],
    backSectionNames: ["backFields"],
    defaults: {
      headerFields: "end",
      primaryFields: "start",
      secondaryFields: "start",
      auxiliaryFields: "start",
    },
    locale: opts.locale,
  });

  return {
    front: { style: "storeCard", sections: frontSections, meta: {} },
    back: { sections: backSections },
  };
}
