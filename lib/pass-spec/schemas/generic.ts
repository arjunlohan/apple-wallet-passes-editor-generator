import * as z from "zod";
import { addWebServiceRefinement, baseDefinition } from "./common";
import { makeStyleBlockSchema } from "./style-block";

export const genericDefinition = addWebServiceRefinement(
  baseDefinition.extend({
    style: z.literal("generic"),
    generic: makeStyleBlockSchema("generic"),
  }),
);
