"use client";
import type { PassStyle } from "@/lib/pass-spec";
import { Separator } from "@/components/ui/separator";
import { PosterEventTicketEditor } from "../PosterEventTicketEditor";
import { RelevanceEditor } from "../RelevanceEditor";

interface Props {
  style: PassStyle;
}

export function AdvancedSection({ style }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <RelevanceEditor />
      {style === "eventTicket" ? (
        <>
          <Separator />
          <PosterEventTicketEditor />
        </>
      ) : null}
    </div>
  );
}
