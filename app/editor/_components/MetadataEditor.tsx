"use client";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/pass-spec";
import type { EditorFormValues } from "./defaults";

/**
 * Advanced top-level pass metadata: lifecycle (expirationDate, voided),
 * UX flags (sharingProhibited, suppressStripShine, groupingIdentifier,
 * appLaunchURL), optional web-service pair, associated store IDs, beacons,
 * and userInfo. Everything is optional — the schema only complains when
 * the user actually fills a value.
 */
export function MetadataEditor() {
  const { register, control } = useFormContext<EditorFormValues>();
  const beacons = useFieldArray<EditorFormValues>({ control, name: "beacons" });
  const beaconsAtCap = beacons.fields.length >= LIMITS.BEACONS_MAX;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-medium">Lifecycle</div>
          <FieldDescription>
            Wallet uses these to mark the pass invalid or stop surfacing it.
          </FieldDescription>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field data-field-path="expirationDate">
            <FieldLabel htmlFor="expirationDate">Expiration date</FieldLabel>
            <Input
              id="expirationDate"
              placeholder="2026-12-31T23:59:00Z"
              {...register("expirationDate")}
            />
            <FieldDescription>
              ISO 8601. After this instant Wallet grays the pass out.
            </FieldDescription>
          </Field>
          <Field data-field-path="groupingIdentifier">
            <FieldLabel htmlFor="groupingIdentifier">Grouping identifier</FieldLabel>
            <Input
              id="groupingIdentifier"
              placeholder="trip-xrt9p2"
              {...register("groupingIdentifier")}
            />
            <FieldDescription>
              Groups related passes (e.g. multi-leg boarding) in Wallet.
            </FieldDescription>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SwitchRow
            label="Voided"
            hint="Marks the pass permanently invalid. Devices stop showing it."
            name="voided"
          />
          <SwitchRow
            label="Sharing prohibited"
            hint="Removes the share button in Wallet (iOS 13.1+)."
            name="sharingProhibited"
          />
          <SwitchRow
            label="Suppress strip shine"
            hint="Removes the default gloss overlay on strip images."
            name="suppressStripShine"
          />
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-medium">App &amp; store links</div>
          <FieldDescription>
            Optional handoff into a native app or App Store listing.
          </FieldDescription>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field data-field-path="appLaunchURL">
            <FieldLabel htmlFor="appLaunchURL">App launch URL</FieldLabel>
            <Input
              id="appLaunchURL"
              placeholder="yourapp://open?pass=abc"
              {...register("appLaunchURL")}
            />
            <FieldDescription>
              Pair with a matching associated store ID so the button appears.
            </FieldDescription>
          </Field>
          <Field data-field-path="associatedStoreIdentifiers">
            <FieldLabel htmlFor="associatedStoreIdentifiers">
              Associated store IDs
            </FieldLabel>
            <Input
              id="associatedStoreIdentifiers"
              placeholder="1234567890, 9876543210"
              {...register("associatedStoreIdentifiers")}
            />
            <FieldDescription>Comma-separated App Store numeric IDs.</FieldDescription>
          </Field>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-medium">Update web service</div>
          <FieldDescription>
            Set both keys if you run a Wallet web service. Leave both blank
            otherwise — the schema requires them together.
          </FieldDescription>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field data-field-path="webServiceURL">
            <FieldLabel htmlFor="webServiceURL">Web service URL</FieldLabel>
            <Input
              id="webServiceURL"
              placeholder="https://passes.example.com/v1"
              {...register("webServiceURL")}
            />
          </Field>
          <Field data-field-path="authenticationToken">
            <FieldLabel htmlFor="authenticationToken">Authentication token</FieldLabel>
            <Input
              id="authenticationToken"
              type="password"
              placeholder="at least 32 characters"
              autoComplete="off"
              {...register("authenticationToken")}
            />
            <FieldDescription>
              Schema requires ≥ {LIMITS.AUTHENTICATION_TOKEN_MIN_CHARS} chars.
            </FieldDescription>
          </Field>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Beacons</div>
            <FieldDescription>
              Surface the pass when within range of a Bluetooth beacon (UUID +
              optional major/minor).
            </FieldDescription>
          </div>
          <Badge variant={beaconsAtCap ? "secondary" : "outline"}>
            {beacons.fields.length}/{LIMITS.BEACONS_MAX}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          {beacons.fields.map((field, index) => (
            <div
              key={field.id}
              data-field-path={`beacons.${index}`}
              className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_2fr_auto]"
            >
              <Input
                placeholder="proximity UUID"
                aria-label={`Beacon ${index + 1} UUID`}
                {...register(`beacons.${index}.proximityUUID` as const)}
              />
              <Input
                placeholder="major"
                inputMode="numeric"
                aria-label={`Beacon ${index + 1} major`}
                {...register(`beacons.${index}.major` as const)}
              />
              <Input
                placeholder="minor"
                inputMode="numeric"
                aria-label={`Beacon ${index + 1} minor`}
                {...register(`beacons.${index}.minor` as const)}
              />
              <Input
                placeholder="relevant text"
                aria-label={`Beacon ${index + 1} relevant text`}
                {...register(`beacons.${index}.relevantText` as const)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove beacon ${index + 1}`}
                onClick={() => beacons.remove(index)}
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
          disabled={beaconsAtCap}
          onClick={() =>
            beacons.append({
              proximityUUID: "",
              major: "",
              minor: "",
              relevantText: "",
            })
          }
        >
          <PlusIcon data-icon="inline-start" /> Add beacon
        </Button>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-medium">User info (custom JSON)</div>
          <FieldDescription>
            Passthrough payload your own app reads back after the pass is
            added. Up to {LIMITS.USER_INFO_BYTES} bytes.
          </FieldDescription>
        </div>
        <Field data-field-path="userInfoJson">
          <FieldLabel htmlFor="userInfoJson">userInfo JSON</FieldLabel>
          <Textarea
            id="userInfoJson"
            rows={4}
            className="font-mono text-xs"
            placeholder={`{"internalId": "trip-9982", "accountType": "gold"}`}
            {...register("userInfoJson")}
          />
        </Field>
      </section>
    </div>
  );
}

/**
 * A small labeled Switch row. Split out to keep MetadataEditor readable.
 * `<Label>` sits as a sibling of `<Switch>` (not a wrapper) because a
 * nested `htmlFor` causes a double-fire on shadcn's Switch.
 */
function SwitchRow({
  label,
  hint,
  name,
}: {
  label: string;
  hint: string;
  name: "voided" | "sharingProhibited" | "suppressStripShine";
}) {
  const { control } = useFormContext<EditorFormValues>();
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted/20 px-3 py-2">
      <div className="flex flex-col">
        <Label className="text-xs">{label}</Label>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        )}
      />
    </div>
  );
}
