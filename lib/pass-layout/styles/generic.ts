import type { GenericBlock, ValidatedPassDefinition } from "@/lib/pass-spec";
import type { LayoutBack, LayoutFront } from "../layoutTypes";
import { buildSections } from "./shared";

export function buildGenericLayout(
  definition: ValidatedPassDefinition & { style: "generic"; generic: GenericBlock },
  opts: { locale?: string } = {},
): { front: LayoutFront; back: LayoutBack } {
  const { front: frontSections, back: backSections } = buildSections(definition.generic, {
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
    front: { style: "generic", sections: frontSections, meta: {} },
    back: { sections: backSections },
  };
}
