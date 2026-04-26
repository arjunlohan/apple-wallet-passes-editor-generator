"use client";
import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { PassPreview } from "@/lib/pass-preview";
import type { PassAssets } from "@/lib/pass-spec";
import type { ImageSlot, ImageVariants } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "./buildDefinition";
import type { EditorFormValues } from "./defaults";

export function PreviewPanel() {
  const { watch } = useFormContext<EditorFormValues>();
  const values = watch();

  let definition: unknown = null;
  let buildError: string | null = null;
  try {
    definition = buildDefinitionFromForm(values);
  } catch (err) {
    buildError = err instanceof Error ? err.message : "failed to build definition";
  }
  const assets = assetsFromForm(values.assets);

  return (
    <Card className="flex items-center justify-center gap-0 bg-muted/30 p-6">
      {buildError ? (
        <div className="max-w-80 text-center text-sm text-destructive">{buildError}</div>
      ) : definition ? (
        <PreviewSafe definition={definition} assets={assets} />
      ) : null}
    </Card>
  );
}

function PreviewSafe({ definition, assets }: { definition: unknown; assets: PassAssets }) {
  try {
    // eslint-disable-next-line react-hooks/error-boundaries
    return <PassPreview definition={definition} assets={assets} />;
  } catch (err) {
    return (
      <div className="max-w-80 text-center text-sm text-destructive">
        {err instanceof Error ? err.message : "invalid definition"}
      </div>
    );
  }
}

function assetsFromForm(entries: Record<string, string>): PassAssets {
  const out: PassAssets = {};
  for (const [compositeKey, b64] of Object.entries(entries)) {
    const [slot, variant] = compositeKey.split(".") as [ImageSlot, keyof ImageVariants];
    if (!out[slot]) out[slot] = {};
    out[slot]![variant] = base64ToBytes(b64);
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
