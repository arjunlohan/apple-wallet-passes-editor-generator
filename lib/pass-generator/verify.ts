import "server-only";
import { unzipSync } from "fflate";
import forge from "node-forge";
import { PassDefinitionSchema, formatZodError } from "@/lib/pass-spec";
import type { PassValidationIssue } from "@/lib/pass-spec";
import { sha1Hex } from "./manifest";

/**
 * Structural verification of a `.pkpass` byte buffer. Unlike the dev CLI,
 * this is called INSIDE the generate endpoint before bytes go out —
 * so a user never downloads a file the server knows is malformed.
 *
 * Checks (in order, fail-fast on the first broken invariant):
 *   1. Archive contains pass.json / manifest.json / signature / icon.png*.
 *   2. manifest.json parses as JSON.
 *   3. Every non-system file in the archive has a manifest entry, and the
 *      recorded SHA-1 matches the actual file bytes.
 *   4. `signature` is detached PKCS#7 with at least two certificates
 *      (signer + WWDR intermediate).
 *   5. pass.json re-parses through `PassDefinitionSchema`.
 *
 * Does NOT verify the WWDR chain against Apple's root — that check runs
 * on-device when Wallet opens the pass.
 */

const SKIP_FILES = new Set(["manifest.json", "signature"]);

export interface VerifyIssue {
  name: string;
  detail?: string;
}

export interface VerifyReport {
  ok: boolean;
  issues: VerifyIssue[];
  /** Non-fatal schema issues, included for diagnostics. */
  schemaIssues?: PassValidationIssue[];
}

export function verifyPkpassBytes(bytes: Uint8Array): VerifyReport {
  const issues: VerifyIssue[] = [];
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (err) {
    return {
      ok: false,
      issues: [
        { name: "zip parses", detail: err instanceof Error ? err.message : String(err) },
      ],
    };
  }

  for (const required of ["pass.json", "manifest.json", "signature"]) {
    if (!entries[required]) {
      issues.push({ name: `contains ${required}`, detail: "missing" });
    }
  }
  // Icon is Apple-required; Wallet rejects the pass without at least one
  // of the three scales. Our API also blocks upstream, but double-check.
  if (!entries["icon.png"] && !entries["icon@2x.png"] && !entries["icon@3x.png"]) {
    issues.push({ name: "contains icon.png*", detail: "all three scales missing" });
  }

  if (issues.length > 0) return { ok: false, issues };

  let manifest: Record<string, string>;
  try {
    manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
  } catch (err) {
    return {
      ok: false,
      issues: [
        { name: "manifest.json parses", detail: err instanceof Error ? err.message : String(err) },
      ],
    };
  }

  const names = Object.keys(entries).filter((n) => !SKIP_FILES.has(n));
  for (const name of names) {
    const expected = manifest[name];
    if (expected === undefined) {
      issues.push({ name: `manifest lists ${name}`, detail: "file not referenced" });
      continue;
    }
    const actual = sha1Hex(entries[name]);
    if (actual !== expected) {
      issues.push({
        name: `SHA-1 matches for ${name}`,
        detail: `expected ${expected}, got ${actual}`,
      });
    }
  }
  for (const listed of Object.keys(manifest)) {
    if (!entries[listed]) {
      issues.push({ name: `archive contains ${listed}`, detail: "manifest lists file not in zip" });
    }
  }

  try {
    const sigBytes = entries["signature"];
    let bin = "";
    for (let i = 0; i < sigBytes.byteLength; i++) bin += String.fromCharCode(sigBytes[i]);
    const asn1 = forge.asn1.fromDer(bin);
    const p7 = forge.pkcs7.messageFromAsn1(asn1) as unknown as {
      content?: unknown;
      certificates: forge.pki.Certificate[];
    };
    if (p7.content) {
      issues.push({ name: "signature is detached", detail: "content is attached" });
    }
    if (!Array.isArray(p7.certificates) || p7.certificates.length < 2) {
      issues.push({
        name: "signature embeds signer + WWDR",
        detail: `cert count = ${p7.certificates?.length ?? 0}`,
      });
    }
  } catch (err) {
    issues.push({
      name: "signature parses as PKCS#7",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  let schemaIssues: PassValidationIssue[] | undefined;
  try {
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));
    const style = detectStyle(passJson);
    if (style) passJson.style = style;
    const result = PassDefinitionSchema.safeParse(passJson);
    if (!result.success) {
      schemaIssues = formatZodError(result.error);
      issues.push({
        name: "pass.json re-validates through schema",
        detail: `${schemaIssues.length} issue(s)`,
      });
    }
  } catch (err) {
    issues.push({
      name: "pass.json parses",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return { ok: issues.length === 0, issues, schemaIssues };
}

function detectStyle(pass: Record<string, unknown>): string | null {
  for (const key of ["boardingPass", "coupon", "eventTicket", "generic", "storeCard"]) {
    if (pass[key] && typeof pass[key] === "object") return key;
  }
  return null;
}
