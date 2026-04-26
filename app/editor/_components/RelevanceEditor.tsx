"use client";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LIMITS } from "@/lib/pass-spec";
import type { EditorFormValues } from "./defaults";

const DATES_CAP = 20;

/**
 * Lock-screen surfacing rules. Locations geofence the pass; relevantDates
 * surface it near a moment or window. Both optional.
 */
export function RelevanceEditor() {
  const { control, register } = useFormContext<EditorFormValues>();
  const locations = useFieldArray<EditorFormValues>({ control, name: "locations" });
  const dates = useFieldArray<EditorFormValues>({ control, name: "relevantDates" });
  const locationCap = LIMITS.LOCATIONS_MAX;
  const locationsAtCap = locations.fields.length >= locationCap;
  const datesAtCap = dates.fields.length >= DATES_CAP;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Locations</div>
            <FieldDescription>
              Surface the pass when the device is within ~100 m of a point.
            </FieldDescription>
          </div>
          <Badge variant={locationsAtCap ? "secondary" : "outline"}>
            {locations.fields.length}/{locationCap}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          {locations.fields.map((field, index) => (
            <div
              key={field.id}
              data-field-path={`locations.${index}`}
              className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2"
            >
              <Input
                placeholder="latitude"
                inputMode="decimal"
                {...register(`locations.${index}.latitude` as const)}
              />
              <Input
                placeholder="longitude"
                inputMode="decimal"
                {...register(`locations.${index}.longitude` as const)}
              />
              <Input
                placeholder="altitude (m)"
                inputMode="decimal"
                {...register(`locations.${index}.altitude` as const)}
              />
              <Input
                placeholder="relevant text"
                {...register(`locations.${index}.relevantText` as const)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove location"
                onClick={() => locations.remove(index)}
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
          disabled={locationsAtCap}
          onClick={() =>
            locations.append({
              latitude: "",
              longitude: "",
              altitude: "",
              relevantText: "",
            })
          }
        >
          <PlusIcon data-icon="inline-start" /> Add location
        </Button>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Relevant dates</div>
            <FieldDescription>
              Use either a single <code>date</code> OR a <code>startDate</code> +{" "}
              <code>endDate</code> pair. iOS 18+ requires an end date whenever a
              start date is set.
            </FieldDescription>
          </div>
          <Badge variant={datesAtCap ? "secondary" : "outline"}>
            {dates.fields.length}/{DATES_CAP}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          {dates.fields.map((field, index) => (
            <div
              key={field.id}
              data-field-path={`relevantDates.${index}`}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Field>
                <FieldLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Date
                </FieldLabel>
                <Input
                  placeholder="2026-06-10T19:00:00Z"
                  {...register(`relevantDates.${index}.date` as const)}
                />
              </Field>
              <Field>
                <FieldLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Start
                </FieldLabel>
                <Input
                  placeholder="2026-06-10T18:30:00Z"
                  {...register(`relevantDates.${index}.startDate` as const)}
                />
              </Field>
              <Field>
                <FieldLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  End
                </FieldLabel>
                <Input
                  placeholder="2026-06-10T23:00:00Z"
                  {...register(`relevantDates.${index}.endDate` as const)}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="self-end"
                aria-label="Remove relevant date"
                onClick={() => dates.remove(index)}
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
          disabled={datesAtCap}
          onClick={() => dates.append({ date: "", startDate: "", endDate: "" })}
        >
          <PlusIcon data-icon="inline-start" /> Add relevant date
        </Button>
      </section>
    </div>
  );
}
