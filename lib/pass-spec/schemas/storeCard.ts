import * as z from "zod";
import { addWebServiceRefinement, baseDefinition } from "./common";
import { makeStyleBlockSchema } from "./style-block";

export const storeCardDefinition = addWebServiceRefinement(
  baseDefinition.extend({
    style: z.literal("storeCard"),
    storeCard: makeStyleBlockSchema("storeCard"),
  }),
);
