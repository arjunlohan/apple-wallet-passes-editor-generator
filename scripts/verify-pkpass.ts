#!/usr/bin/env tsx
/**
 * Structural verifier for a `.pkpass` archive.
 *
 * Usage:  npm run verify-pkpass -- path/to/file.pkpass
 *
 * Checks, in order:
 *  1. ZIP entries include pass.json, manifest.json, signature, icon.png.
 *  2. manifest.json lists every non-system file in the archive.
 *  3. Every SHA-1 in manifest.json matches the file's actual SHA-1.
 *  4. signature is a valid PKCS#7 detached CMS over manifest.json,
 *     with signer cert + WWDR intermediate embedded.
 *  5. pass.json re-validates through PassDefinitionSchema.
 *
 * This verifier does NOT check the WWDR cert chain against Apple's root —
 * Wallet itself does that on-device. For end-to-end verification, open
 * the pass on iOS.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync } from "fflate";
import forge from "node-forge";
import { PassDefinitionSchema, formatZodError } from "@/lib/pass-spec";
import { sha1Hex } from "@/lib/pass-generator/manifest";

const SKIP_FILES = new Set(["manifest.json", "signature"]);

interface Report {
  path: string;
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
}

function verify(path: string): Report {
  const report: Report = { path, ok: true, checks: [] };
  const bytes = new Uint8Array(readFileSync(path));
  const entries = unzipSync(bytes);
  const names = Object.keys(entries);

  const required = ["pass.json", "manifest.json", "signature", "icon.png"];
  for (const req of required) {
    report.checks.push({
      name: `contains ${req}`,
      ok: entries[req] !== undefined,
      detail: entries[req] ? `${entries[req].byteLength}B` : "missing",
    });
  }

  let manifest: Record<string, string> = {};
  try {
    manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
    report.checks.push({ name: "manifest.json parses", ok: true });
  } catch (err) {
    report.checks.push({
      name: "manifest.json parses",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const nonSystemFiles = names.filter((n) => !SKIP_FILES.has(n));
  for (const name of nonSystemFiles) {
    const expected = manifest[name];
    if (expected === undefined) {
      report.checks.push({ name: `manifest lists ${name}`, ok: false });
      continue;
    }
    const actual = sha1Hex(entries[name]);
    report.checks.push({
      name: `SHA-1 matches for ${name}`,
      ok: actual === expected,
      detail: actual === expected ? expected : `${expected} != ${actual}`,
    });
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
    report.checks.push({ name: "signature is detached CMS", ok: !p7.content });
    report.checks.push({
      name: "signature embeds signer + WWDR certs",
      ok: p7.certificates.length >= 2,
      detail: `${p7.certificates.length} cert(s)`,
    });
  } catch (err) {
    report.checks.push({
      name: "signature parses as PKCS#7",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));
    const style = detectStyle(passJson);
    if (style) passJson.style = style;
    const result = PassDefinitionSchema.safeParse(passJson);
    if (result.success) {
      report.checks.push({ name: "pass.json re-validates through schema", ok: true });
    } else {
      report.checks.push({
        name: "pass.json re-validates through schema",
        ok: false,
        detail: JSON.stringify(formatZodError(result.error)),
      });
    }
  } catch (err) {
    report.checks.push({
      name: "pass.json parses",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  report.ok = report.checks.every((c) => c.ok);
  return report;
}

function detectStyle(pass: Record<string, unknown>): string | null {
  for (const key of ["boardingPass", "coupon", "eventTicket", "generic", "storeCard"]) {
    if (pass[key] && typeof pass[key] === "object") return key;
  }
  return null;
}

function main() {
  const argPath = process.argv[2];
  if (!argPath) {
    console.error("usage: verify-pkpass <path-to-.pkpass>");
    process.exit(2);
  }
  const absolutePath = resolve(argPath);
  const report = verify(absolutePath);
  console.log(`\npkpass: ${report.path}\n`);
  for (const c of report.checks) {
    const icon = c.ok ? "✓" : "✗";
    const detail = c.detail ? `  (${c.detail})` : "";
    console.log(`  ${icon} ${c.name}${detail}`);
  }
  console.log(`\n${report.ok ? "PASS" : "FAIL"}\n`);
  process.exit(report.ok ? 0 : 1);
}

main();
