import type { PassAssets, RgbColor, ValidatedPassDefinition } from "@/lib/pass-spec";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import type { LayoutTree } from "./layoutTypes";
import { resolveImages } from "./images";
import { resolvePoster } from "./poster";
import { buildBoardingPassLayout } from "./styles/boardingPass";
import { buildCouponLayout } from "./styles/coupon";
import { buildEventTicketLayout } from "./styles/eventTicket";
import { buildGenericLayout } from "./styles/generic";
import { buildStoreCardLayout } from "./styles/storeCard";

const DEFAULT_BACKGROUND = "rgb(255, 255, 255)" as RgbColor;
const DEFAULT_FOREGROUND = "rgb(0, 0, 0)" as RgbColor;
const DEFAULT_LABEL = "rgb(102, 102, 102)" as RgbColor;

export interface BuildLayoutOptions {
  assets?: PassAssets;
  locale?: string;
}

/**
 * The single place layout decisions are made. Preview and generator BOTH
 * consume the returned LayoutTree — neither is allowed to interpret the
 * PassDefinition independently. Any layout change MUST happen here.
 *
 * Input is accepted as `unknown` because the whole point of this function
 * is to run the Zod parse that enforces the spec. Callers that already
 * hold a `ValidatedPassDefinition` can still pass it — parsing is idempotent.
 */
export function buildLayout(
  input: unknown,
  options: BuildLayoutOptions = {},
): LayoutTree {
  const definition = PassDefinitionSchema.parse(input) as ValidatedPassDefinition;

  let body: { front: LayoutTree["front"]; back: LayoutTree["back"] };
  switch (definition.style) {
    case "boardingPass":
      body = buildBoardingPassLayout(definition, { locale: options.locale });
      break;
    case "coupon":
      body = buildCouponLayout(definition, { locale: options.locale });
      break;
    case "eventTicket":
      body = buildEventTicketLayout(definition, { locale: options.locale });
      break;
    case "generic":
      body = buildGenericLayout(definition, { locale: options.locale });
      break;
    case "storeCard":
      body = buildStoreCardLayout(definition, { locale: options.locale });
      break;
  }

  const poster = resolvePoster(definition, options.locale);

  return {
    style: definition.style,
    passTypeIdentifier: definition.passTypeIdentifier,
    serialNumber: definition.serialNumber,
    organizationName: definition.organizationName,
    description: definition.description,
    logoText: definition.logoText,
    colors: {
      background: (definition.backgroundColor ?? DEFAULT_BACKGROUND) as RgbColor,
      foreground: (definition.foregroundColor ?? DEFAULT_FOREGROUND) as RgbColor,
      label: (definition.labelColor ?? DEFAULT_LABEL) as RgbColor,
    },
    front: body.front,
    back: body.back,
    barcodes: (definition.barcodes ?? []).map((b) => ({
      format: b.format,
      message: b.message,
      messageEncoding: b.messageEncoding,
      altText: b.altText,
    })),
    images: resolveImages(definition.style, options.assets ?? {}),
    ...(poster ? { poster } : {}),
    definition,
  };
}
