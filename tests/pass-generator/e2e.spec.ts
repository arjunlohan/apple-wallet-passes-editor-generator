import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import forge from "node-forge";
import { generatePkpass } from "@/lib/pass-generator";
import type { PassAssets } from "@/lib/pass-spec";
import { IMAGE_DIMENSION_RULES } from "@/lib/pass-spec";
import boardingPass from "../fixtures/passes/boardingPass.json";
import coupon from "../fixtures/passes/coupon.json";
import eventTicket from "../fixtures/passes/eventTicket.json";
import generic from "../fixtures/passes/generic.json";
import posterEventTicket from "../fixtures/passes/posterEventTicket.json";
import storeCard from "../fixtures/passes/storeCard.json";
import { makeTestSignerContext } from "./helpers/testSigner";
import { makePng } from "./helpers/tinyPng";

// Minimum legal asset set: icon (1x/2x/3x).
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

const FIXTURES = [
  ["boardingPass", boardingPass],
  ["coupon", coupon],
  ["eventTicket", eventTicket],
  ["generic", generic],
  ["posterEventTicket", posterEventTicket],
  ["storeCard", storeCard],
] as const;

describe("generatePkpass end-to-end", () => {
  it.each(FIXTURES)(
    "generates and verifies a round-trippable pkpass for %s",
    (_name, fixture) => {
      const signer = makeTestSignerContext();
      const { bytes, baseName } = generatePkpass({
        definition: fixture,
        assets: minimalAssets(),
        signer,
      });
      expect(baseName).toMatch(/^[a-zA-Z0-9._-]+$/);
      expect(bytes.byteLength).toBeGreaterThan(200);

      const entries = unzipSync(bytes);
      expect(entries["pass.json"]).toBeDefined();
      expect(entries["manifest.json"]).toBeDefined();
      expect(entries["signature"]).toBeDefined();
      expect(entries["icon.png"]).toBeDefined();
      expect(entries["icon@2x.png"]).toBeDefined();
      expect(entries["icon@3x.png"]).toBeDefined();

      // Every file in the manifest must be present in the archive
      // and its SHA-1 digest must match.
      const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
      for (const [path, expected] of Object.entries(manifest)) {
        expect(entries[path], `missing ${path} in zip`).toBeDefined();
        const md = forge.md.sha1.create();
        md.update(forge.util.binary.raw.encode(entries[path]), "raw");
        expect(md.digest().toHex()).toBe(expected);
      }

      // The signature MUST be detached and cover manifest.json.
      let bin = "";
      const sig = entries["signature"];
      for (let i = 0; i < sig.byteLength; i++) bin += String.fromCharCode(sig[i]);
      const p7 = forge.pkcs7.messageFromAsn1(
        forge.asn1.fromDer(bin),
      ) as unknown as { content?: unknown; certificates: forge.pki.Certificate[] };
      expect(p7.content).toBeFalsy();
      expect(p7.certificates.length).toBe(2);
    },
  );

  it("pass.json inside the archive re-parses through the schema", async () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: generic,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));
    const { PassDefinitionSchema } = await import("@/lib/pass-spec");

    // Re-inject the discriminator we dropped at serialize time — this is
    // what a downstream consumer re-validating an on-device pass would do.
    passJson.style = "generic";
    const result = PassDefinitionSchema.safeParse(passJson);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });

  it("poster-mode pass.json preserves preferredStyleSchemes + semantic tags end-to-end", async () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: posterEventTicket,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));
    expect(passJson.preferredStyleSchemes).toEqual([
      "posterEventTicket",
      "eventTicket",
    ]);
    expect(passJson.semantics?.eventName).toBe("Fallen Voices Live");
    expect(passJson.semantics?.venueRoom).toBe("Main Stage");
    expect(passJson.eventTicket?.additionalInfoFields?.length).toBe(2);

    const { PassDefinitionSchema } = await import("@/lib/pass-spec");
    passJson.style = "eventTicket";
    const result = PassDefinitionSchema.safeParse(passJson);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });
});
