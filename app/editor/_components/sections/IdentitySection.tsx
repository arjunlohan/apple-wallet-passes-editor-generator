"use client";
import { Controller, useFormContext } from "react-hook-form";
import { ColorField } from "../ColorField";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSIT_TYPES, type PassStyle } from "@/lib/pass-spec";
import type { EditorFormValues } from "../defaults";

interface Props {
  style: PassStyle;
}

export function IdentitySection({ style }: Props) {
  const { register, control } = useFormContext<EditorFormValues>();

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field data-field-path="organizationName">
          <FieldLabel htmlFor="organizationName">Organization name</FieldLabel>
          <Input
            id="organizationName"
            placeholder="Example Co"
            {...register("organizationName")}
          />
        </Field>
        <Field data-field-path="description">
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            placeholder="Short human-readable description"
            {...register("description")}
          />
        </Field>
        <Field data-field-path="logoText">
          <FieldLabel htmlFor="logoText">Logo text</FieldLabel>
          <Input id="logoText" placeholder="Optional top-left text" {...register("logoText")} />
        </Field>
        <Field data-field-path="serialNumber">
          <FieldLabel htmlFor="serialNumber">Serial number</FieldLabel>
          <Input
            id="serialNumber"
            placeholder="unique-id"
            {...register("serialNumber")}
          />
        </Field>
      </div>

      {style === "boardingPass" ? (
        <Field>
          <FieldLabel htmlFor="transitType">Transit type</FieldLabel>
          <Controller
            name="transitType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="transitType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace("PKTransitType", "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorField name="backgroundColorHex" label="Background" control={control} />
        <ColorField name="foregroundColorHex" label="Foreground" control={control} />
        <ColorField name="labelColorHex" label="Label" control={control} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field data-field-path="passTypeIdentifier">
          <FieldLabel htmlFor="passTypeIdentifier">Pass Type Identifier</FieldLabel>
          <Input
            id="passTypeIdentifier"
            placeholder="pass.example.demo"
            {...register("passTypeIdentifier")}
          />
          <FieldDescription>
            Must match the identifier on your signing certificate.
          </FieldDescription>
        </Field>
        <Field data-field-path="teamIdentifier">
          <FieldLabel htmlFor="teamIdentifier">Team Identifier</FieldLabel>
          <Input
            id="teamIdentifier"
            placeholder="ABCDE12345"
            {...register("teamIdentifier")}
          />
          <FieldDescription>Your Apple Developer Team ID.</FieldDescription>
        </Field>
      </div>
    </FieldGroup>
  );
}
