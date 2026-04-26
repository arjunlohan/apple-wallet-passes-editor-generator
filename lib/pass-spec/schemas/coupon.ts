import * as z from "zod";
import { addWebServiceRefinement, baseDefinition } from "./common";
import { makeStyleBlockSchema } from "./style-block";

export const couponDefinition = addWebServiceRefinement(
  baseDefinition.extend({
    style: z.literal("coupon"),
    coupon: makeStyleBlockSchema("coupon"),
  }),
);
