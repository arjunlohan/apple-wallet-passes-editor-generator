"use client";
import { ChevronDownIcon, CloudUploadIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ALLOWED_IMAGE_SLOTS,
  IMAGE_DIMENSION_RULES,
  LIMITS,
  type ImageSlot,
  type PassStyle,
} from "@/lib/pass-spec";
import { cn } from "@/lib/utils";
import type { EditorFormValues } from "./defaults";
import { resizePngToExact, resizePngToFitMax } from "./resizePng";

type Scale = 1 | 2 | 3;
type VariantKey = "1x" | "2x" | "3x" | "1x~dark" | "2x~dark" | "3x~dark";

interface Props {
  style: PassStyle;
}

const LIGHT_VARIANTS: { key: Extract<VariantKey, "1x" | "2x" | "3x">; scale: Scale }[] = [
  { key: "1x", scale: 1 },
  { key: "2x", scale: 2 },
  { key: "3x", scale: 3 },
];

const DARK_VARIANTS: {
  key: Extract<VariantKey, "1x~dark" | "2x~dark" | "3x~dark">;
  scale: Scale;
}[] = [
  { key: "1x~dark", scale: 1 },
  { key: "2x~dark", scale: 2 },
  { key: "3x~dark", scale: 3 },
];

const SLOT_DESCRIPTIONS: Record<ImageSlot, string> = {
  icon: "Shown in notifications and the lock screen. Required.",
  logo: "Top-left mark inside the pass.",
  thumbnail: "Right-side square image; good for posters and artwork.",
  strip: "Full-width banner behind the primary fields.",
  background: "Large image that fills the whole pass.",
  footer: "Strip above the barcode on boarding passes.",
};

export function ImageSlotUploader({ style }: Props) {
  const { watch, setValue } = useFormContext<EditorFormValues>();
  const assets = watch("assets") ?? {};

  const slots = useMemo(() => {
    const list = [...ALLOWED_IMAGE_SLOTS[style]];
    return list.sort((a, b) => {
      if (a === "icon") return -1;
      if (b === "icon") return 1;
      return a.localeCompare(b);
    });
  }, [style]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {slots.map((slot) => (
        <SlotCard
          key={slot}
          slot={slot}
          assets={assets}
          onChange={(next) => setValue("assets", next, { shouldDirty: true })}
        />
      ))}
    </div>
  );
}

interface SlotCardProps {
  slot: ImageSlot;
  assets: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

function SlotCard({ slot, assets, onChange }: SlotCardProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState<"light" | "dark" | null>(null);
  const darkHasAny = DARK_VARIANTS.some((v) => assets[`${slot}.${v.key}`]);
  const [darkOpen, setDarkOpen] = useState(darkHasAny);

  const lightFilled = LIGHT_VARIANTS.every((v) => assets[`${slot}.${v.key}`]);
  const lightCount = LIGHT_VARIANTS.filter((v) => assets[`${slot}.${v.key}`]).length;
  const isIcon = slot === "icon";

  async function handleFile(file: File, dark: boolean): Promise<void> {
    setIsDragOver(null);
    const variants = dark ? DARK_VARIANTS : LIGHT_VARIANTS;
    const primaryKey = `${slot}.${variants[0].key}`;
    try {
      const raw = new Uint8Array(await file.arrayBuffer());
      assertPngMagic(raw);
      const next = { ...assets };
      let lastHint = "";
      for (const v of variants) {
        const resized = await resizeForScale(slot, v.scale, raw);
        next[`${slot}.${v.key}`] = arrayBufferToBase64(resized.bytes);
        if (resized.hint && v.scale === 3) lastHint = resized.hint;
      }
      onChange(next);
      clearKeyFamily(slot, dark, setErrors);
      setHints((prev) => ({
        ...prev,
        [primaryKey]: lastHint || `Auto-generated @1x, @2x, @3x${dark ? " dark" : ""} scales.`,
      }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [primaryKey]: err instanceof Error ? err.message : "invalid image",
      }));
    }
  }

  async function handleOverride(
    variant: VariantKey,
    scale: Scale,
    file: File | null,
  ): Promise<void> {
    const key = `${slot}.${variant}`;
    if (!file) {
      const next = { ...assets };
      delete next[key];
      onChange(next);
      clearKey(key, setErrors);
      clearKey(key, setHints);
      return;
    }
    try {
      const raw = new Uint8Array(await file.arrayBuffer());
      assertPngMagic(raw);
      const resized = await resizeForScale(slot, scale, raw);
      onChange({ ...assets, [key]: arrayBufferToBase64(resized.bytes) });
      clearKey(key, setErrors);
      if (resized.hint) setHints((prev) => ({ ...prev, [key]: resized.hint! }));
      else clearKey(key, setHints);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "invalid image",
      }));
    }
  }

  function clearSlot(dark: boolean): void {
    const next = { ...assets };
    for (const v of dark ? DARK_VARIANTS : LIGHT_VARIANTS) delete next[`${slot}.${v.key}`];
    onChange(next);
    clearKeyFamily(slot, dark, setErrors);
    clearKeyFamily(slot, dark, setHints);
  }

  const lightPreview = assets[`${slot}.3x`] ?? assets[`${slot}.2x`] ?? assets[`${slot}.1x`];
  const darkPreview =
    assets[`${slot}.3x~dark`] ?? assets[`${slot}.2x~dark`] ?? assets[`${slot}.1x~dark`];
  const lightHint = hints[`${slot}.1x`];
  const lightError = errors[`${slot}.1x`];

  return (
    <Card className="gap-4 py-4">
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium capitalize">{slot}</div>
              {isIcon ? (
                <Badge variant={lightFilled ? "secondary" : "destructive"}>
                  {lightFilled ? "Ready" : "Required"}
                </Badge>
              ) : lightCount > 0 ? (
                <Badge variant="secondary">{lightCount}/3</Badge>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">{SLOT_DESCRIPTIONS[slot]}</div>
          </div>
          {lightPreview ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Clear ${slot}`}
              onClick={() => clearSlot(false)}
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </div>

        <DropZone
          active={isDragOver === "light"}
          preview={lightPreview}
          onDragEnter={() => setIsDragOver("light")}
          onDragLeave={() => setIsDragOver(null)}
          onFile={(file) => void handleFile(file, false)}
          inputId={`${slot}-light`}
          cta={lightPreview ? "Replace image" : "Drop a PNG or browse"}
          sub={dimensionHint(slot)}
        />

        {lightError ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t use that PNG</AlertTitle>
            <AlertDescription>{lightError}</AlertDescription>
          </Alert>
        ) : lightHint ? (
          <div className="text-xs text-muted-foreground">{lightHint}</div>
        ) : null}

        <Collapsible open={darkOpen} onOpenChange={setDarkOpen}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id={`${slot}-dark-toggle`}
                checked={darkOpen}
                onCheckedChange={(on) => {
                  setDarkOpen(on);
                  if (!on) clearSlot(true);
                }}
              />
              <Label htmlFor={`${slot}-dark-toggle`}>Dark mode variant</Label>
            </div>
            {darkHasAny ? <Badge variant="outline">Added</Badge> : null}
          </div>
          <CollapsibleContent className="mt-3">
            <DropZone
              active={isDragOver === "dark"}
              preview={darkPreview}
              onDragEnter={() => setIsDragOver("dark")}
              onDragLeave={() => setIsDragOver(null)}
              onFile={(file) => void handleFile(file, true)}
              inputId={`${slot}-dark`}
              cta={darkPreview ? "Replace dark image" : "Drop dark-mode PNG"}
              sub="Shown when the device is in dark mode."
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-between self-stretch rounded-2xl"
            >
              <span className="text-xs text-muted-foreground">Advanced: per-scale overrides</span>
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[...LIGHT_VARIANTS, ...(darkOpen ? DARK_VARIANTS : [])].map((v) => {
                const key = `${slot}.${v.key}`;
                const has = !!assets[key];
                return (
                  <label
                    key={v.key}
                    className={cn(
                      "flex flex-col gap-1 rounded-2xl border border-dashed border-border px-2 py-2 text-xs",
                      has && "border-solid border-primary/40 bg-primary/5",
                    )}
                  >
                    <span className="font-medium">{v.key}</span>
                    <input
                      type="file"
                      accept="image/png"
                      className="text-[11px] file:mr-1.5 file:rounded-full file:border-0 file:bg-muted file:px-2 file:py-0.5 file:text-[11px]"
                      onChange={(e) =>
                        void handleOverride(v.key, v.scale, e.target.files?.[0] ?? null)
                      }
                    />
                    {errors[key] ? (
                      <span className="text-[11px] text-destructive">{errors[key]}</span>
                    ) : hints[key] ? (
                      <span className="text-[11px] italic text-muted-foreground">
                        {hints[key]}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

interface DropZoneProps {
  preview?: string;
  active: boolean;
  cta: string;
  sub: string;
  inputId: string;
  onFile: (file: File) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
}

function DropZone({
  preview,
  active,
  cta,
  sub,
  inputId,
  onFile,
  onDragEnter,
  onDragLeave,
}: DropZoneProps) {
  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "group/dropzone relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm transition-colors",
        active && "border-primary/70 bg-primary/5",
        preview && "py-4",
      )}
    >
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Slot preview"
            src={`data:image/png;base64,${preview}`}
            className="size-12 shrink-0 rounded-xl bg-background object-contain ring-1 ring-foreground/10"
          />
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium">{cta}</span>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </div>
        </div>
      ) : (
        <>
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {active ? <CloudUploadIcon className="size-4" /> : <ImageIcon className="size-4" />}
          </span>
          <span className="text-xs font-medium">{cta}</span>
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        </>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

async function resizeForScale(
  slot: ImageSlot,
  scale: Scale,
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; hint?: string }> {
  const rule = IMAGE_DIMENSION_RULES[slot];
  if (rule.exact) {
    const target = { width: rule.exact.width * scale, height: rule.exact.height * scale };
    const result = await resizePngToExact(bytes, target);
    if (result.resized && result.from) {
      return {
        bytes: result.bytes,
        hint: `Resized ${result.from.width}×${result.from.height} → ${target.width}×${target.height}.`,
      };
    }
    return { bytes: result.bytes };
  }
  if (rule.width?.max && rule.height?.max) {
    const result = await resizePngToFitMax(bytes, {
      maxWidth: rule.width.max * scale,
      maxHeight: rule.height.max * scale,
    });
    if (result.resized && result.from) {
      return {
        bytes: result.bytes,
        hint: `Scaled down ${result.from.width}×${result.from.height} → ${result.to.width}×${result.to.height} to fit the slot.`,
      };
    }
    return { bytes: result.bytes };
  }
  return { bytes };
}

function dimensionHint(slot: ImageSlot): string {
  const rule = IMAGE_DIMENSION_RULES[slot];
  if (rule.exact) {
    const { width, height } = rule.exact;
    return `Recommended ${width * 3}×${height * 3} — we'll auto-generate @1x/@2x/@3x.`;
  }
  if (rule.width?.max && rule.height?.max) {
    return `Up to ${rule.width.max * 3}×${rule.height.max * 3}, we'll scale down as needed.`;
  }
  return "PNG only.";
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.byteLength))),
    );
  }
  return btoa(bin);
}

function assertPngMagic(bytes: Uint8Array): void {
  const magic = LIMITS.PNG_MAGIC;
  if (bytes.byteLength < magic.byteLength) throw new Error("file is too small to be a PNG");
  for (let i = 0; i < magic.byteLength; i++) {
    if (bytes[i] !== magic[i]) throw new Error("file is not a PNG");
  }
}

function clearKey(
  key: string,
  setState: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): void {
  setState((prev) => {
    if (!(key in prev)) return prev;
    const { [key]: _, ...rest } = prev;
    void _;
    return rest;
  });
}

function clearKeyFamily(
  slot: ImageSlot,
  dark: boolean,
  setState: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): void {
  const variants = dark ? DARK_VARIANTS : LIGHT_VARIANTS;
  setState((prev) => {
    const next = { ...prev };
    let changed = false;
    for (const v of variants) {
      const k = `${slot}.${v.key}`;
      if (k in next) {
        delete next[k];
        changed = true;
      }
    }
    return changed ? next : prev;
  });
}
