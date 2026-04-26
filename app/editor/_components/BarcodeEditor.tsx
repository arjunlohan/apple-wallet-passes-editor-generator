"use client";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BARCODE_ENCODINGS, BARCODE_FORMATS } from "@/lib/pass-spec";
import type { EditorFormValues } from "./defaults";

const FORMAT_HINTS: Record<(typeof BARCODE_FORMATS)[number], string> = {
  PKBarcodeFormatQR: "QR — versatile; best for URLs and short strings.",
  PKBarcodeFormatPDF417: "PDF417 — 2D, large capacity; airline + boarding passes.",
  PKBarcodeFormatAztec: "Aztec — 2D; transit tickets, rail boarding.",
  PKBarcodeFormatCode128: "Code128 — 1D; retail SKUs, ticket IDs.",
};

export function BarcodeEditor() {
  const { register, control, watch } = useFormContext<EditorFormValues>();
  const format = watch("barcodeFormat") as (typeof BARCODE_FORMATS)[number];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="barcodeFormat">Format</FieldLabel>
          <Controller
            name="barcodeFormat"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="barcodeFormat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARCODE_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.replace("PKBarcodeFormat", "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {format ? <FieldDescription>{FORMAT_HINTS[format]}</FieldDescription> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="barcodeEncoding">Message encoding</FieldLabel>
          <Controller
            name="barcodeEncoding"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="barcodeEncoding" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BARCODE_ENCODINGS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>
            Default <code>iso-8859-1</code> is safest for most scanners.
          </FieldDescription>
        </Field>
      </div>
      <Field data-field-path="barcodeMessage">
        <FieldLabel htmlFor="barcodeMessage">Message</FieldLabel>
        <Input
          id="barcodeMessage"
          placeholder="Payload to encode"
          {...register("barcodeMessage")}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="barcodeAltText">Alt text (optional)</FieldLabel>
        <Input
          id="barcodeAltText"
          placeholder="Shown below the barcode"
          {...register("barcodeAltText")}
        />
      </Field>
    </div>
  );
}
