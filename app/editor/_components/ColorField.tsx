"use client";
import { HexColorPicker } from "react-colorful";
import { Controller, type Control } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EditorFormValues } from "./defaults";

interface ColorFieldProps {
  name: keyof EditorFormValues;
  label: string;
  control: Control<EditorFormValues>;
}

export function ColorField({ name, label, control }: ColorFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value = String(field.value ?? "");
        return (
          <Field>
            <FieldLabel>{label}</FieldLabel>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Pick ${label.toLowerCase()} color`}
                    className="size-9 shrink-0 rounded-2xl ring-1 ring-foreground/10 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: value || "transparent" }}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto p-2 [&_.react-colorful]:h-40 [&_.react-colorful]:w-40"
                >
                  <HexColorPicker color={value} onChange={field.onChange} />
                </PopoverContent>
              </Popover>
              <Input
                className="font-mono text-xs"
                value={value}
                onChange={(e) => field.onChange(e.target.value)}
                spellCheck={false}
                placeholder="#1e293b"
              />
            </div>
          </Field>
        );
      }}
    />
  );
}
