import type { CouponBlock, ValidatedPassDefinition } from "@/lib/pass-spec";
import type { LayoutBack, LayoutFront } from "../layoutTypes";
import { buildSections } from "./shared";

export function buildCouponLayout(
  definition: ValidatedPassDefinition & { style: "coupon"; coupon: CouponBlock },
  opts: { locale?: string } = {},
): { front: LayoutFront; back: LayoutBack } {
  const { front: frontSections, back: backSections } = buildSections(definition.coupon, {
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
    front: { style: "coupon", sections: frontSections, meta: {} },
    back: { sections: backSections },
  };
}
