"use client";
import { Controller, useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EditorFormValues } from "./defaults";

/**
 * NFC (Value Added Services) editor. Apple requires a special entitlement
 * for passes that include an `nfc` block — without it, Wallet ignores the
 * keys at install time. The fields are exposed anyway so entitled
 * developers can use the editor; the copy is explicit about the gate.
 */
export function NfcEditor() {
  const { register, control, watch } = useFormContext<EditorFormValues>();
  const active = watch("useNfc");
  const message = watch("nfcMessage");
  const messageBytes = new TextEncoder().encode(message ?? "").byteLength;
  const messageOver = messageBytes > 64;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <Label htmlFor="useNfc">Add NFC (Value Added Services)</Label>
          <span className="text-xs text-muted-foreground">
            Requires Apple&rsquo;s NFC Pass entitlement. Without it Wallet ignores the
            block and installs the pass without NFC. Request access at{" "}
            <a
              href="https://developer.apple.com/contact/request/wallet-nfc"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              developer.apple.com/contact/request/wallet-nfc
            </a>
            .
          </span>
        </div>
        <Controller
          name="useNfc"
          control={control}
          render={({ field }) => (
            <Switch
              id="useNfc"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {active ? (
        <div className="flex flex-col gap-4">
          <Field data-field-path="nfcMessage">
            <FieldLabel htmlFor="nfcMessage">Message</FieldLabel>
            <Input
              id="nfcMessage"
              placeholder="Payload sent to the Apple Pay terminal"
              {...register("nfcMessage")}
            />
            <FieldDescription
              className={messageOver ? "text-destructive" : undefined}
            >
              {messageBytes}/64 bytes. Wallet truncates longer messages.
            </FieldDescription>
          </Field>

          <Field data-field-path="nfcEncryptionPublicKey">
            <FieldLabel htmlFor="nfcEncryptionPublicKey">
              Encryption public key
            </FieldLabel>
            <Textarea
              id="nfcEncryptionPublicKey"
              placeholder="Base64 DER SubjectPublicKeyInfo (ECDH P-256)"
              rows={4}
              className="font-mono text-xs"
              {...register("nfcEncryptionPublicKey")}
            />
            <FieldDescription>
              Base64-encoded X.509 SubjectPublicKeyInfo containing an ECDH public
              key on curve <code>prime256v1</code> (P-256). Generate with{" "}
              <code>openssl ec -pubout -outform DER | base64</code>.
            </FieldDescription>
          </Field>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <Label htmlFor="nfcRequiresAuthentication">
                Require authentication each use
              </Label>
              <span className="text-xs text-muted-foreground">
                iOS 13.1+. Prompts the user to authenticate every time the pass is
                tapped. Pair with <code>sharingProhibited</code> on the parent
                pass to prevent older-iOS bypass.
              </span>
            </div>
            <Controller
              name="nfcRequiresAuthentication"
              control={control}
              render={({ field }) => (
                <Switch
                  id="nfcRequiresAuthentication"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <Alert>
            <AlertTitle>Can&rsquo;t test locally without the entitlement</AlertTitle>
            <AlertDescription>
              The pass will sign and install on any device, but the NFC dictionary
              only activates on passes signed against an NFC-entitled certificate.
              Validate the fields here, then generate and test with your entitled
              certificate in place.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
