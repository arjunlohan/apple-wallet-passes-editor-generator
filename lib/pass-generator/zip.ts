import "server-only";
import { zipSync, type Zippable } from "fflate";
import { assertPosixPath } from "./manifest";

// DOS timestamps start at 1980-01-01. Using that as the fixed mtime keeps
// ZIP output byte-identical for the same input across runs and machines.
const FIXED_MTIME = new Date(1980, 0, 1, 0, 0, 0);

/**
 * ZIP a set of POSIX-path -> bytes entries into a deterministic archive.
 */
export function buildZip(files: Record<string, Uint8Array>): Uint8Array {
  const zippable: Zippable = {};
  for (const path of Object.keys(files).sort()) {
    assertPosixPath(path);
    zippable[path] = [files[path], { mtime: FIXED_MTIME }];
  }
  return zipSync(zippable, { level: 9 });
}
