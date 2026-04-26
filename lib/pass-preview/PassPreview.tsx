"use client";
import { useMemo } from "react";
import type { LayoutTree } from "@/lib/pass-layout";
import { buildLayout } from "@/lib/pass-layout";
import type { PassAssets } from "@/lib/pass-spec";
import { BackFace } from "./renderers/BackFace";
import { FrontFace } from "./renderers/FrontFace";
import { PosterBackFace } from "./renderers/PosterBackFace";
import { PosterFrontFace } from "./renderers/PosterFrontFace";
import { useFlip } from "./useFlip";

export interface PassPreviewProps {
  /** Raw definition object — validated internally. Throws on invalid input. */
  definition: unknown;
  /** Binary image variants keyed by slot. */
  assets?: PassAssets;
  /** Force a face; omit to use the internal flip state. */
  face?: "front" | "back";
  /** Locale for date/number formatting. Defaults to runtime locale. */
  locale?: string;
}

export function PassPreview({ definition, assets = {}, face, locale }: PassPreviewProps) {
  const tree: LayoutTree = useMemo(
    () => buildLayout(definition, { assets, locale }),
    [definition, assets, locale],
  );
  const flip = useFlip();
  const currentFace = face ?? flip.face;
  const isPoster = !!tree.poster;

  return (
    <div
      className="pass-preview"
      role="group"
      aria-label="Pass preview"
      data-scheme={isPoster ? "posterEventTicket" : undefined}
      onClick={face ? undefined : flip.flip}
    >
      {currentFace === "front" ? (
        isPoster ? (
          <PosterFrontFace tree={tree} assets={assets} />
        ) : (
          <FrontFace tree={tree} assets={assets} />
        )
      ) : isPoster ? (
        <PosterBackFace tree={tree} />
      ) : (
        <BackFace tree={tree} />
      )}
    </div>
  );
}
