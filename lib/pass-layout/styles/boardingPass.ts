import type { BoardingPassBlock, ValidatedPassDefinition } from "@/lib/pass-spec";
import type { LayoutBack, LayoutFront } from "../layoutTypes";
import { buildSections } from "./shared";

export function buildBoardingPassLayout(
  definition: ValidatedPassDefinition & {
    style: "boardingPass";
    boardingPass: BoardingPassBlock;
  },
  opts: { locale?: string } = {},
): { front: LayoutFront; back: LayoutBack } {
  const { front: frontSections, back: backSections } = buildSections(definition.boardingPass, {
    frontSectionNames: ["headerFields", "primaryFields", "secondaryFields", "auxiliaryFields"],
    backSectionNames: ["backFields"],
    defaults: {
      headerFields: "end",
      primaryFields: "center",
      secondaryFields: "start",
      auxiliaryFields: "start",
    },
    locale: opts.locale,
  });

  return {
    front: {
      style: "boardingPass",
      sections: frontSections,
      meta: { transitType: definition.boardingPass.transitType },
    },
    back: { sections: backSections },
  };
}
