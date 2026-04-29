"use client";
import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { PassPreview } from "@/lib/pass-preview";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import type { PassAssets, ImageSlot, ImageVariants } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "./buildDefinition";
import type { EditorFormValues } from "./defaults";

// Placeholders used *only* for the live preview path when the user hasn't
// filled in real identifiers yet. The form state is untouched, so the
// moment a user types their own passTypeIdentifier / teamIdentifier those
// flow through to the preview and — if set — to the signed pkpass.
// Signing still requires real Apple credentials; this only unblocks
// preview + customization so the editor is usable without them.
const PREVIEW_PASS_TYPE_ID = "pass.preview.unsigned";
const PREVIEW_TEAM_ID = "PREVIEW000";

export function PreviewPanel() {
  const { watch } = useFormContext<EditorFormValues>();
  const values = watch();

  let definition: unknown = null;
  let buildError: string | null = null;
  try {
    // Patch in placeholders for the two identity fields so a fresh
    // deploy without APPLE_* env vars still renders a preview.
    const previewValues: EditorFormValues = {
      ...values,
      passTypeIdentifier: values.passTypeIdentifier || PREVIEW_PASS_TYPE_ID,
      teamIdentifier: values.teamIdentifier || PREVIEW_TEAM_ID,
    };
    definition = buildDefinitionFromForm(previewValues);
  } catch (err) {
    buildError = err instanceof Error ? err.message : "failed to build definition";
  }
  const assets = assetsFromForm(values.assets);

  // `buildLayout()` inside `<PassPreview>` calls `PassDefinitionSchema.parse`
  // at render time and throws on invalid input — which would unmount the
  // whole page. Preflight with `safeParse` so the editor stays alive while
  // the user is mid-edit; the issue tray surfaces the real errors.
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
          The live preview couldn&apos;t be built — check the issue tray for
          details on what to fix.
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
