import * as z from "zod";
import { boardingPassDefinition } from "./boardingPass";
import { couponDefinition } from "./coupon";
import { eventTicketDefinition } from "./eventTicket";
import { genericDefinition } from "./generic";
import { storeCardDefinition } from "./storeCard";

/**
 * The single validation boundary for the whole project. Every caller that
 * crosses a trust boundary (form submit, API route, library consumer) MUST
 * pass its input through this schema before handing it to downstream code.
 */
export const PassDefinitionSchema = z.discriminatedUnion("style", [
  boardingPassDefinition,
  couponDefinition,
  eventTicketDefinition,
  genericDefinition,
  storeCardDefinition,
]);

export type PassDefinitionSchemaInput = z.input<typeof PassDefinitionSchema>;
export type PassDefinitionSchemaOutput = z.output<typeof PassDefinitionSchema>;

export {
  boardingPassDefinition,
  couponDefinition,
  eventTicketDefinition,
  genericDefinition,
  storeCardDefinition,
};
