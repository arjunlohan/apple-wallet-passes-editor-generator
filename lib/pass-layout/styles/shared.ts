import type { FieldSections, PassField } from "@/lib/pass-spec";
import type { LayoutSection } from "../layoutTypes";
import { resolveField } from "../resolveField";

export interface BuildSectionsOptions {
  frontSectionNames: readonly LayoutSection["name"][];
  backSectionNames: readonly LayoutSection["name"][];
  defaults?: Partial<Record<LayoutSection["name"], "left" | "center" | "right" | "start" | "end">>;
  locale?: string;
}

/**
 * Generic front/back section builder used by every classic style.
 * Respects the input order of fields; never reorders across sections.
 */
export function buildSections(
  sections: FieldSections,
  opts: BuildSectionsOptions,
): { front: LayoutSection[]; back: LayoutSection[] } {
  const frontSet = new Set(opts.frontSectionNames);
  const backSet = new Set(opts.backSectionNames);
  const front: LayoutSection[] = [];
  const back: LayoutSection[] = [];

  for (const name of opts.frontSectionNames) {
    const arr = sections[name];
    if (!arr) continue;
    const defaultAlign = opts.defaults?.[name];
    front.push({
      name,
      fields: arr.map((f: PassField) =>
        resolveField(f, { sectionDefaultAlign: defaultAlign, locale: opts.locale }),
      ),
    });
  }
  for (const name of opts.backSectionNames) {
    const arr = sections[name];
    if (!arr) continue;
    back.push({
      name,
      fields: arr.map((f: PassField) =>
        resolveField(f, { sectionDefaultAlign: "start", locale: opts.locale }),
      ),
    });
  }
  // Silence "unused" in some lint modes.
  void frontSet;
  void backSet;

  return { front, back };
}
