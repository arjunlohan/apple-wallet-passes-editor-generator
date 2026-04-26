import * as z from "zod";
import { TRANSIT_TYPES } from "../constants";
import { addWebServiceRefinement, baseDefinition } from "./common";
import { makeStyleBlockSchema } from "./style-block";

const boardingPassBlock = makeStyleBlockSchema("boardingPass").extend({
  transitType: z.enum(TRANSIT_TYPES),
});

export const boardingPassDefinition = addWebServiceRefinement(
  baseDefinition.extend({
    style: z.literal("boardingPass"),
    boardingPass: boardingPassBlock,
  }),
);
