import "server-only";
import { buildLayout } from "@/lib/pass-layout";
import type { GenerateInput, GenerateOutput, SignerContext } from "./types";
import { passJsonBytes } from "./serialize";
import { buildManifest } from "./manifest";
import { normalizeAssets } from "./images/normalize";
import { signManifest } from "./sign";
import { buildZip } from "./zip";

export type { GenerateInput, GenerateOutput, SignerContext } from "./types";
export { loadSignerFromEnv, getSigner } from "./signer/load";
export { verifyPkpassBytes } from "./verify";
export type { VerifyIssue, VerifyReport } from "./verify";

/**
 * Generate a signed `.pkpass` byte buffer from a validated definition and
 * its associated assets. This is the one public entry point on the server.
 */
export function generatePkpass(input: GenerateInput): GenerateOutput {
  const tree = buildLayout(input.definition, {
    assets: input.assets,
    locale: input.locale,
  });

  const files: Record<string, Uint8Array> = {};
  // pass.json first — it's the heart of the archive.
  files["pass.json"] = passJsonBytes(tree);

  // Image assets, with Apple's canonical filenames.
  const imageFiles = normalizeAssets(input.assets);
  for (const [name, bytes] of Object.entries(imageFiles)) {
    files[name] = bytes;
  }

  // manifest.json over every file in the archive (NOT including itself or the signature).
  const { bytes: manifestBytes } = buildManifest(files);
  files["manifest.json"] = manifestBytes;

  // Detached PKCS#7 CMS signature over manifest.json only.
  files["signature"] = signManifest(manifestBytes, input.signer);

  const bytes = buildZip(files);
  const baseName = sanitizeBaseName(tree.serialNumber);
  return { bytes, baseName };
}

function sanitizeBaseName(serial: string): string {
  return serial.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64) || "pass";
}
