"use client";
import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { PassPreview } from "@/lib/pass-preview";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import type { PassAssets, ImageSlot, ImageVariants } from "@/lib/pass-spec";
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

  // `buildLayout()` inside `<PassPreview>` calls `PassDefinitionSchema.parse`
  // at render time — which throws and unmounts the whole page if the form
  // is missing required fields (e.g. no env creds on a fresh deploy).
  // Preflight with `safeParse` so the editor stays alive while the user is
  // still filling things in; the issue tray already surfaces the real errors.
  const parsed = definition ? PassDefinitionSchema.safeParse(definition) : null;
  const canRender = parsed?.success === true;

  return (
    <Card className="flex items-center justify-center gap-0 bg-muted/30 p-6">
      {buildError ? (
        <div className="max-w-80 text-center text-sm text-destructive">{buildError}</div>
      ) : canRender ? (
        <PassPreview definition={definition} assets={assets} />
      ) : (
        <div className="max-w-80 text-center text-sm text-muted-foreground">
          Fill in the required identity fields to see the live preview.
          Details are listed in the issue tray below.
        </div>
      )}
    </Card>
  );
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
