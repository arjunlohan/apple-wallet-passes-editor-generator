"use client";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_CAPS } from "@/lib/pass-spec";
import type { FieldSection, PassStyle } from "@/lib/pass-spec";
import type { EditorFormValues } from "./defaults";

interface Props {
  section: FieldSection;
  style: PassStyle;
  title: string;
  hint?: string;
}

export function FieldSectionEditor({ section, style, title, hint }: Props) {
  const { control, register } = useFormContext<EditorFormValues>();
  const caps = FIELD_CAPS[style];
  const cap = caps?.[section]?.max;
  const { fields, append, remove } = useFieldArray<EditorFormValues>({
    control,
    name: section as "headerFields",
  });

  if (cap === undefined) return null;
  const atCap = fields.length >= cap;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        <Badge variant={atCap ? "secondary" : "outline"}>
          {fields.length}/{cap}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            data-field-path={`${section}.${index}`}
            className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2"
          >
            <Input
              placeholder="key"
              aria-label={`${title} key ${index + 1}`}
              {...register(`${section}.${index}.key` as const)}
            />
            <Input
              placeholder="label"
              aria-label={`${title} label ${index + 1}`}
              {...register(`${section}.${index}.label` as const)}
            />
            <Input
              placeholder="value"
              aria-label={`${title} value ${index + 1}`}
              {...register(`${section}.${index}.value` as const)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}
              onClick={() => remove(index)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={atCap}
        onClick={() => append({ key: "", label: "", value: "" })}
      >
        <PlusIcon data-icon="inline-start" /> Add field
      </Button>
    </div>
  );
}
