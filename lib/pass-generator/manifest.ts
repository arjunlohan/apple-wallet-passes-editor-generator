import "server-only";
import { createHash } from "node:crypto";

/**
 * Compute the SHA-1 hex digest of a byte buffer. Apple's pkpass manifest
 * uses SHA-1 — NOT SHA-256. See tasks/lessons.md for the reasoning.
 *
 * Uses Node's built-in crypto instead of node-forge because forge's
 * `util.binary.raw.encode` is `String.fromCharCode.apply(null, bytes)`,
 * which overflows the V8 argument stack for buffers over ~65K bytes.
 * Real user uploads (e.g. a 58×58 PNG upscaled to 540×660) exceed that
 * easily; 2026-04-26 a user hit this on Download with the error
 * "Maximum call stack size exceeded". See tasks/lessons.md.
 */
export function sha1Hex(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

/**
 * Build `manifest.json` bytes from a map of POSIX relative paths -> file bytes.
 * Paths must use forward slashes on all OSes. Output keys are sorted
 * alphabetically for a stable digest.
 */
export function buildManifest(
  files: Record<string, Uint8Array>,
): { manifest: Record<string, string>; bytes: Uint8Array } {
  const manifest: Record<string, string> = {};
  const paths = Object.keys(files).sort();
  for (const path of paths) {
    assertPosixPath(path);
    manifest[path] = sha1Hex(files[path]);
  }
  const json = JSON.stringify(manifest);
  return { manifest, bytes: new TextEncoder().encode(json) };
}

export function assertPosixPath(path: string): void {
  if (path.includes("\\")) {
    throw new Error(`manifest path contains backslash: ${path}`);
  }
  if (path.startsWith("/")) {
    throw new Error(`manifest path must be relative: ${path}`);
  }
}
