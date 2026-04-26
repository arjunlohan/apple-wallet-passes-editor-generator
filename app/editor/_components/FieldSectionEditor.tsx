"use client";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DATE_STYLES,
  FIELD_CAPS,
  NUMBER_STYLES,
  TEXT_ALIGNMENTS,
} from "@/lib/pass-spec";
import type { FieldSection, PassStyle } from "@/lib/pass-spec";
import { emptyField, type EditorFormValues } from "./defaults";

interface Props {
  section: FieldSection;
  style: PassStyle;
  title: string;
  hint?: string;
}

// Radix Select refuses empty-string values, so we use a sentinel "__default__"
// for the "unset" option and translate on the way in/out of form state.
const UNSET = "__default__";

function toSelectValue(stored: string): string {
  return stored === "" ? UNSET : stored;
}
function fromSelectValue(selected: string): string {
  return selected === UNSET ? "" : selected;
}

const DATE_STYLE_OPTIONS = [
  { value: UNSET, label: "Default (no formatting)" },
  { value: "PKDateStyleNone", label: "None — hide this component" },
  { value: "PKDateStyleShort", label: "Short — 1/1/26, 3:30 PM" },
  { value: "PKDateStyleMedium", label: "Medium — Jan 1, 2026" },
  { value: "PKDateStyleLong", label: "Long — January 1, 2026" },
  { value: "PKDateStyleFull", label: "Full — Thursday, January 1, 2026" },
];

const NUMBER_STYLE_OPTIONS = [
  { value: UNSET, label: "Default (no formatting)" },
  { value: "PKNumberStyleDecimal", label: "Decimal — 1,234.56" },
  { value: "PKNumberStylePercent", label: "Percent — 34%" },
  { value: "PKNumberStyleScientific", label: "Scientific — 1.23E3" },
  { value: "PKNumberStyleSpellOut", label: "Spell Out — twelve" },
];

const ALIGN_OPTIONS = [
  { value: UNSET, label: "Default" },
  { value: "PKTextAlignmentLeft", label: "Left" },
  { value: "PKTextAlignmentCenter", label: "Center" },
  { value: "PKTextAlignmentRight", label: "Right" },
  { value: "PKTextAlignmentNatural", label: "Natural (locale)" },
];

const ROW_OPTIONS = [
  { value: UNSET, label: "Default" },
  { value: "0", label: "Row 0 (top)" },
  { value: "1", label: "Row 1 (bottom)" },
];

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
  const isBack = section === "backFields";
  const allowRow = style === "boardingPass";

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
      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            data-field-path={`${section}.${index}`}
            className="flex flex-col gap-2 rounded-2xl ring-1 ring-border/60 bg-card/30 p-3"
          >
            <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2">
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
            <FieldFormatting
              section={section}
              index={index}
              isBack={isBack}
              allowRow={allowRow}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={atCap}
        onClick={() => append(emptyField())}
      >
        <PlusIcon data-icon="inline-start" /> Add field
      </Button>
    </div>
  );
}

/**
 * Per-row "Formatting" disclosure. Collapsed by default so simple rows stay
 * visually quiet. Exposes dateStyle / timeStyle / numberStyle / currencyCode
 * / textAlignment / changeMessage / ignoresTimeZone / isRelative, plus
 * back-only (attributedValue + dataDetectorTypes) and boardingPass-only
 * (row) controls.
 */
function FieldFormatting({
  section,
  index,
  isBack,
  allowRow,
}: {
  section: FieldSection;
  index: number;
  isBack: boolean;
  allowRow: boolean;
}) {
  const { control, register } = useFormContext<EditorFormValues>();
  const rowPath = `${section}.${index}` as const;
  return (
    <Collapsible className="group/formatting">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
        >
          <span>Formatting &amp; behavior</span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              "group-data-[state=open]/formatting:rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            control={control}
            name={`${rowPath}.dateStyle` as const}
            render={({ field }) => (
              <Field>
                <FieldLabel>Date style</FieldLabel>
                <Select
                  value={toSelectValue(field.value as string)}
                  onValueChange={(v) => field.onChange(fromSelectValue(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_STYLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  For ISO 8601 values. Use <code>PKDateStyleNone</code> with a time
                  style to show just the time.
                </FieldDescription>
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`${rowPath}.timeStyle` as const}
            render={({ field }) => (
              <Field>
                <FieldLabel>Time style</FieldLabel>
                <Select
                  value={toSelectValue(field.value as string)}
                  onValueChange={(v) => field.onChange(fromSelectValue(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_STYLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`${rowPath}.numberStyle` as const}
            render={({ field }) => (
              <Field>
                <FieldLabel>Number style</FieldLabel>
                <Select
                  value={toSelectValue(field.value as string)}
                  onValueChange={(v) => field.onChange(fromSelectValue(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMBER_STYLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Field>
            <FieldLabel>Currency code (ISO 4217)</FieldLabel>
            <Input
              placeholder="USD"
              maxLength={3}
              {...register(`${rowPath}.currencyCode` as const)}
            />
            <FieldDescription>Pairs with a numeric value. E.g. USD, EUR, JPY.</FieldDescription>
          </Field>
          <Controller
            control={control}
            name={`${rowPath}.textAlignment` as const}
            render={({ field }) => (
              <Field>
                <FieldLabel>Text alignment</FieldLabel>
                <Select
                  value={toSelectValue(field.value as string)}
                  onValueChange={(v) => field.onChange(fromSelectValue(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          {allowRow ? (
            <Controller
              control={control}
              name={`${rowPath}.row` as const}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Row (boarding pass auxiliary)</FieldLabel>
                  <Select
                  value={toSelectValue(field.value as string)}
                  onValueChange={(v) => field.onChange(fromSelectValue(v))}
                >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROW_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>Apple allows two rows of auxiliary fields on boarding passes.</FieldDescription>
                </Field>
              )}
            />
          ) : null}
          <Field className="md:col-span-2">
            <FieldLabel>Change message</FieldLabel>
            <Input
              placeholder="Gate changed to %@."
              {...register(`${rowPath}.changeMessage` as const)}
            />
            <FieldDescription>
              Shown as a Wallet update banner when the value changes. Must contain
              exactly one <code>%@</code> placeholder.
            </FieldDescription>
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-2xl bg-muted/30 px-3 py-2">
            <div className="flex flex-col">
              <Label className="text-xs">Ignore timezone</Label>
              <span className="text-[11px] text-muted-foreground">
                Render the date in the value&rsquo;s timezone, not the device&rsquo;s.
              </span>
            </div>
            <Controller
              control={control}
              name={`${rowPath}.ignoresTimeZone` as const}
              render={({ field }) => (
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-2xl bg-muted/30 px-3 py-2">
            <div className="flex flex-col">
              <Label className="text-xs">Relative date</Label>
              <span className="text-[11px] text-muted-foreground">
                Show as &ldquo;in 2 hours&rdquo; instead of an absolute time.
              </span>
            </div>
            <Controller
              control={control}
              name={`${rowPath}.isRelative` as const}
              render={({ field }) => (
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          {isBack ? (
            <>
              <Field className="md:col-span-2">
                <FieldLabel>Attributed value (back field only)</FieldLabel>
                <Textarea
                  rows={3}
                  placeholder={`Visit our site at <a href="https://example.com">example.com</a>.`}
                  {...register(`${rowPath}.attributedValue` as const)}
                />
                <FieldDescription>
                  HTML anchors only. Allowed schemes: <code>https</code>, <code>http</code>,
                  <code> mailto</code>, <code>tel</code>.
                </FieldDescription>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>Data detectors (comma separated)</FieldLabel>
                <Input
                  placeholder="PKDataDetectorTypeLink, PKDataDetectorTypePhoneNumber"
                  {...register(`${rowPath}.dataDetectorTypes` as const)}
                />
                <FieldDescription>
                  Subset of{" "}
                  <code>PKDataDetectorTypePhoneNumber / Link / Address / CalendarEvent</code>.
                  Empty = auto-detect everything.
                </FieldDescription>
              </Field>
            </>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Expose constants for downstream validation mapping.
export const FIELD_FORMATTING_CONSTANTS = {
  DATE_STYLES,
  NUMBER_STYLES,
  TEXT_ALIGNMENTS,
} as const;
