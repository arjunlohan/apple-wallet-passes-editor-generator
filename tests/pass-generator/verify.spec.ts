import { describe, expect, it } from "vitest";
import { unzipSync, zipSync } from "fflate";
import { generatePkpass, verifyPkpassBytes } from "@/lib/pass-generator";
import { IMAGE_DIMENSION_RULES, type PassAssets } from "@/lib/pass-spec";
import generic from "../fixtures/passes/generic.json";
import { makeTestSignerContext } from "./helpers/testSigner";
import { makePng } from "./helpers/tinyPng";

function minimalAssets(): PassAssets {
  const icon = IMAGE_DIMENSION_RULES.icon.exact!;
  return {
    icon: {
      "1x": makePng(icon.width, icon.height),
      "2x": makePng(icon.width * 2, icon.height * 2),
      "3x": makePng(icon.width * 3, icon.height * 3),
    },
  };
}

// fflate requires mtime >= 1980-01-01 (DOS epoch floor).
const FIXED_MTIME = new Date(1980, 0, 1, 0, 0, 0);

describe("verifyPkpassBytes", () => {
  it("reports ok on a well-formed archive from generatePkpass", () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: generic,
      assets: minimalAssets(),
      signer,
    });
    const report = verifyPkpassBytes(bytes);
    expect(report.ok, JSON.stringify(report.issues)).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("rejects an archive with a tampered file (SHA-1 mismatch)", () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: generic,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    // Flip one byte inside pass.json; the manifest's SHA-1 will not match.
    const tampered = new Uint8Array(entries["pass.json"]);
    tampered[tampered.length - 2] ^= 0xff;
    entries["pass.json"] = tampered;
    const repacked = zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, data]) => [
          name,
          [data, { mtime: FIXED_MTIME }],
        ]),
      ) as Record<string, [Uint8Array, { mtime: Date }]>,
    );
    const report = verifyPkpassBytes(repacked);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.name.includes("SHA-1 matches for pass.json"))).toBe(true);
  });

  it("rejects an archive missing the signature", () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: generic,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    delete entries["signature"];
    const repacked = zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, data]) => [
          name,
          [data, { mtime: FIXED_MTIME }],
        ]),
      ) as Record<string, [Uint8Array, { mtime: Date }]>,
    );
    const report = verifyPkpassBytes(repacked);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.name === "contains signature")).toBe(true);
  });
});
