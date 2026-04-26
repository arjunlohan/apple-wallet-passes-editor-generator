"use client";
import { FIELD_SECTIONS, type FieldSection, type PassStyle } from "@/lib/pass-spec";
import { Separator } from "@/components/ui/separator";
import { FieldSectionEditor } from "../FieldSectionEditor";

interface Props {
  style: PassStyle;
}

const SECTION_META: Record<FieldSection, { title: string; hint?: string }> = {
  headerFields: {
    title: "Header fields",
    hint: "Top-right corner. Short labels only (e.g. gate, seat number, tier).",
  },
  primaryFields: {
    title: "Primary fields",
    hint: "The most prominent data — origin/destination, offer value, event title.",
  },
  secondaryFields: {
    title: "Secondary fields",
    hint: "Mid-weight supporting data below the primary row.",
  },
  auxiliaryFields: {
    title: "Auxiliary fields",
    hint: "Tertiary details, small type near the footer.",
  },
  backFields: {
    title: "Back fields",
    hint: "Anything that fits on the flip side: terms, policies, long text.",
  },
  additionalInfoFields: {
    title: "Additional info",
    hint: "Event-ticket-only extras like age limits or parking notes.",
  },
};

export function ContentSection({ style }: Props) {
  const visible = FIELD_SECTIONS.filter((s) => {
    if (s === "additionalInfoFields") return style === "eventTicket";
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {visible.map((section, i) => (
        <div key={section} className="flex flex-col gap-3">
          {i > 0 ? <Separator /> : null}
          <FieldSectionEditor
            section={section}
            style={style}
            title={SECTION_META[section].title}
            hint={SECTION_META[section].hint}
          />
        </div>
      ))}
    </div>
  );
}
