import type { TextAlignment } from "@/lib/pass-spec";

/** Map Apple's PKTextAlignment enum to CSS text-align. */
export function mapTextAlignment(
  value: TextAlignment | undefined,
  fallback: "left" | "center" | "right" | "start" | "end" = "start",
): "left" | "center" | "right" | "start" | "end" {
  switch (value) {
    case "PKTextAlignmentLeft":
      return "left";
    case "PKTextAlignmentCenter":
      return "center";
    case "PKTextAlignmentRight":
      return "right";
    case "PKTextAlignmentNatural":
      return "start";
    default:
      return fallback;
  }
}
