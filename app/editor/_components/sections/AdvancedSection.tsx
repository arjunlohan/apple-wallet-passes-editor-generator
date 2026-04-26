"use client";
import type { PassStyle } from "@/lib/pass-spec";
import { Separator } from "@/components/ui/separator";
import { MetadataEditor } from "../MetadataEditor";
import { NfcEditor } from "../NfcEditor";
import { PosterEventTicketEditor } from "../PosterEventTicketEditor";
import { RelevanceEditor } from "../RelevanceEditor";

interface Props {
  style: PassStyle;
}

export function AdvancedSection({ style }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <RelevanceEditor />
      <Separator />
      <MetadataEditor />
      <Separator />
      <NfcEditor />
      {style === "eventTicket" ? (
        <>
          <Separator />
          <PosterEventTicketEditor />
        </>
      ) : null}
    </div>
  );
}
