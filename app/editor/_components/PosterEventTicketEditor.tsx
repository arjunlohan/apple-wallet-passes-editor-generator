"use client";
import { AlertTriangleIcon, CheckCircle2Icon, CircleIcon } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { POSTER_EVENT_TYPES } from "@/lib/pass-spec";
import { cn } from "@/lib/utils";
import type { EditorFormValues } from "./defaults";

/**
 * iOS 26+ full-bleed poster layout. Toggle off → classic event ticket.
 * The classic fields are still edited via the regular field-section editors.
 */
export function PosterEventTicketEditor() {
  const { register, control, watch } = useFormContext<EditorFormValues>();
  const active = watch("useEventTicketPoster");
  const eventType = watch("posterEventType");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <Label htmlFor="useEventTicketPoster">Use iOS 26 poster layout</Label>
          <span className="text-xs text-muted-foreground">
            Enables the full-bleed poster layout on iOS 26+. Classic event ticket
            is the fallback on earlier iOS versions.
          </span>
        </div>
        <Controller
          name="useEventTicketPoster"
          control={control}
          render={({ field }) => (
            <Switch
              id="useEventTicketPoster"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {active ? (
        <div className="flex flex-col gap-4">
          <PosterRequirementsChecklist />
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <Label htmlFor="suppressHeaderDarkening">Suppress header darkening</Label>
              <span className="text-xs text-muted-foreground">
                Skip the bottom gradient overlay on the poster.
              </span>
            </div>
            <Controller
              name="suppressHeaderDarkening"
              control={control}
              render={({ field }) => (
                <Switch
                  id="suppressHeaderDarkening"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field data-field-path="posterEventName">
              <FieldLabel htmlFor="posterEventName">Event name</FieldLabel>
              <Input
                id="posterEventName"
                placeholder="Fallen Voices Live"
                {...register("posterEventName")}
              />
            </Field>
            <Field data-field-path="posterVenueName">
              <FieldLabel htmlFor="posterVenueName">Venue name</FieldLabel>
              <Input
                id="posterVenueName"
                placeholder="Apollo Theater"
                {...register("posterVenueName")}
              />
            </Field>
            <Field data-field-path="posterVenueRegionName">
              <FieldLabel htmlFor="posterVenueRegionName">Venue region</FieldLabel>
              <Input
                id="posterVenueRegionName"
                placeholder="New York, NY"
                {...register("posterVenueRegionName")}
              />
            </Field>
            <Field data-field-path="posterVenueRoom">
              <FieldLabel htmlFor="posterVenueRoom">Venue room</FieldLabel>
              <Input
                id="posterVenueRoom"
                placeholder="Main Stage"
                {...register("posterVenueRoom")}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="posterEventType">Event type</FieldLabel>
            <Controller
              name="posterEventType"
              control={control}
              render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                  <SelectTrigger id="posterEventType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Generic poster</SelectItem>
                    {POSTER_EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("PKEventType", "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="posterEventStartDate">Event start (ISO 8601)</FieldLabel>
            <Input
              id="posterEventStartDate"
              placeholder="2026-09-12T20:00:00Z"
              {...register("posterEventStartDate")}
            />
            <FieldDescription>
              Need a &ldquo;Doors 7 PM&rdquo; caption? Add it under{" "}
              <strong>Additional info fields</strong>. Apple&rsquo;s{" "}
              <code>eventStartDateInfo</code> is a date dictionary, not a caption.
            </FieldDescription>
          </Field>

          {eventType === "PKEventTypeSports" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-field-path="posterAwayTeamAbbreviation">
                <FieldLabel htmlFor="posterAwayTeamAbbreviation">
                  Away team abbreviation
                </FieldLabel>
                <Input
                  id="posterAwayTeamAbbreviation"
                  placeholder="LAA"
                  {...register("posterAwayTeamAbbreviation")}
                />
              </Field>
              <Field data-field-path="posterHomeTeamAbbreviation">
                <FieldLabel htmlFor="posterHomeTeamAbbreviation">
                  Home team abbreviation
                </FieldLabel>
                <Input
                  id="posterHomeTeamAbbreviation"
                  placeholder="SFG"
                  {...register("posterHomeTeamAbbreviation")}
                />
              </Field>
            </div>
          ) : null}

          {eventType === "PKEventTypeLivePerformance" ? (
            <Field data-field-path="posterPerformerNames">
              <FieldLabel htmlFor="posterPerformerNames">Performer names</FieldLabel>
              <Input
                id="posterPerformerNames"
                placeholder="Phoenix Rivers, The Outliers"
                {...register("posterPerformerNames")}
              />
              <FieldDescription>Comma-separated list.</FieldDescription>
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PosterRequirementsChecklist() {
  const { watch } = useFormContext<EditorFormValues>();
  const [
    eventName,
    venueName,
    venueRegionName,
    venueRoom,
    eventType,
    awayAbbr,
    homeAbbr,
    performers,
    assets,
  ] = watch([
    "posterEventName",
    "posterVenueName",
    "posterVenueRegionName",
    "posterVenueRoom",
    "posterEventType",
    "posterAwayTeamAbbreviation",
    "posterHomeTeamAbbreviation",
    "posterPerformerNames",
    "assets",
  ]);

  const filled = (v: string) => v.trim().length > 0;
  const hasBackground =
    !!assets["background.1x"] && !!assets["background.2x"] && !!assets["background.3x"];
  const semanticsOK =
    filled(eventName) &&
    filled(venueName) &&
    filled(venueRegionName) &&
    filled(venueRoom) &&
    (eventType !== "PKEventTypeSports" || (filled(awayAbbr) && filled(homeAbbr))) &&
    (eventType !== "PKEventTypeLivePerformance" ||
      performers.split(",").some((p) => filled(p)));

  return (
    <Alert>
      <AlertTitle>Poster activation checklist (iOS 26+)</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 flex flex-col gap-2.5">
          <CheckRow
            state={semanticsOK ? "ok" : "miss"}
            label="Required semantic tags filled"
            note="Event name, venue name, venue region, venue room (+ team or performer names when applicable)."
          />
          <CheckRow
            state={hasBackground ? "ok" : "miss"}
            label="Hero background image (1x/2x/3x)"
            note="Upload a background image at 180×220 (1x). Wallet needs background.* or artwork.* for poster rendering."
          />
          <CheckRow
            state="warn"
            label="NFC entitlement + nfc dictionary"
            note="Apple requires poster passes to ship with an NFC block — which needs a special entitlement. Without it, the pass installs but renders as classic event ticket. Poster passes are NOT barcode-scannable."
          />
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function CheckRow({
  state,
  label,
  note,
}: {
  state: "ok" | "miss" | "warn";
  label: string;
  note: string;
}) {
  const Icon = state === "ok" ? CheckCircle2Icon : state === "warn" ? AlertTriangleIcon : CircleIcon;
  const color =
    state === "ok"
      ? "text-emerald-500"
      : state === "warn"
        ? "text-amber-500"
        : "text-muted-foreground";
  return (
    <li className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} aria-hidden />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
    </li>
  );
}
