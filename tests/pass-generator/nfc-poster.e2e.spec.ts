/**
 * End-to-end coverage for NFC + poster event ticket against Apple's spec.
 *
 * Source of truth (read 2026-04-26, archived in `.env.local`-adjacent docs):
 *   - developer.apple.com/documentation/walletpasses/pass/nfc-data.dictionary
 *   - developer.apple.com/documentation/walletpasses/creating-an-event-pass-using-semantic-tags
 *
 * We cannot activate poster mode in Wallet without Apple's NFC entitlement,
 * so the on-device render is out of scope. What these tests DO cover:
 *
 *   - The `nfc` block carries every property Apple documents (message,
 *     encryptionPublicKey, requiresAuthentication), with the right types
 *     and byte-limit enforcement.
 *   - An `nfc` block round-trips through generate → unzip → re-parse
 *     without loss.
 *   - The poster event ticket meets Apple's minimum-requirements list
 *     (preferredStyleSchemes + required semantic tags per event type).
 *   - Posters with missing required semantics are rejected at the schema
 *     boundary, which matches Wallet's documented "falls back to legacy
 *     event ticket" behavior at a layer we can test.
 *   - A poster pass with an NFC block is structurally valid (install-
 *     ready bytes); it just won't *activate* poster mode without the
 *     entitlement on the signing cert, which is a device-side concern.
 */
import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { generatePkpass } from "@/lib/pass-generator";
import {
  IMAGE_DIMENSION_RULES,
  LIMITS,
  PassDefinitionSchema,
  type PassAssets,
} from "@/lib/pass-spec";
import posterEventTicketWithNfc from "../fixtures/passes/posterEventTicketWithNfc.json";
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

// Real P-256 SubjectPublicKeyInfo generated via Node's crypto.generateKeyPairSync.
// 91 bytes decoded — squarely inside Apple's expected range. Throwaway key,
// not a secret; committing it is fine.
const VALID_P256_SPKI_BASE64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEZKEcmJj9gyNKkCMZ1IBpiDql/9I0Q3xBCuYsqPCcowL7tyaIG6RoF3APgZ4QsCPJoAH8Gv2x3IX1QeUqJzypIw==";

describe("NFC dictionary (Apple Pass.NFC spec)", () => {
  it("accepts the three documented properties and round-trips verbatim", () => {
    const input = {
      ...posterEventTicketWithNfc,
      nfc: {
        message: "store-vas-123",
        encryptionPublicKey: VALID_P256_SPKI_BASE64,
        requiresAuthentication: true,
      },
    };
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: input,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));

    expect(passJson.nfc).toEqual({
      message: "store-vas-123",
      encryptionPublicKey: VALID_P256_SPKI_BASE64,
      requiresAuthentication: true,
    });
  });

  it("omits requiresAuthentication when false (Apple documents default=false)", () => {
    const input = {
      ...posterEventTicketWithNfc,
      nfc: {
        message: "store-vas-123",
        encryptionPublicKey: VALID_P256_SPKI_BASE64,
      },
    };
    const parsed = PassDefinitionSchema.parse(input);
    expect(parsed.nfc?.requiresAuthentication).toBeUndefined();
  });

  it("rejects nfc.message over 64 bytes (Apple: 'no more than 64 bytes, longer messages are truncated')", () => {
    const input = {
      ...posterEventTicketWithNfc,
      nfc: {
        message: "x".repeat(LIMITS.NFC_MESSAGE_BYTES + 1),
        encryptionPublicKey: VALID_P256_SPKI_BASE64,
      },
    };
    const result = PassDefinitionSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "nfc.message",
      );
      expect(issue).toBeDefined();
    }
  });

  it("counts nfc.message in BYTES not characters (multi-byte UTF-8)", () => {
    // 32 characters of 3-byte UTF-8 runes = 96 bytes > 64.
    const msg = "☃".repeat(32); // snowman
    expect(msg.length).toBe(32);
    expect(new TextEncoder().encode(msg).byteLength).toBe(96);
    const input = {
      ...posterEventTicketWithNfc,
      nfc: {
        message: msg,
        encryptionPublicKey: VALID_P256_SPKI_BASE64,
      },
    };
    const result = PassDefinitionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-base64 encryptionPublicKey", () => {
    const input = {
      ...posterEventTicketWithNfc,
      nfc: { message: "ok", encryptionPublicKey: "not_base64!!!" },
    };
    const result = PassDefinitionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects encryptionPublicKey outside the P-256 SPKI byte range", () => {
    // 10 bytes of valid base64 — far too short for an SPKI.
    const input = {
      ...posterEventTicketWithNfc,
      nfc: { message: "ok", encryptionPublicKey: "AAAAAAAAAAAAAAA=" },
    };
    const result = PassDefinitionSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "nfc.encryptionPublicKey",
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toMatch(/SPKI P-256/);
    }
  });

  it("survives SHA-1 manifest inclusion — nfc pass.json is hashed with the rest", () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: posterEventTicketWithNfc,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
    // manifest.json hashes pass.json; pass.json contains the nfc block;
    // so the nfc dictionary IS protected (transitively through the
    // pass.json SHA-1 entry) by the CMS signature over manifest.json.
    expect(manifest["pass.json"]).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("Poster event ticket (Apple poster event pass spec)", () => {
  it("preserves preferredStyleSchemes + required semantic tags + nfc end-to-end", () => {
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: posterEventTicketWithNfc,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));

    // Apple's minimum requirements for the poster scheme:
    expect(passJson.preferredStyleSchemes).toEqual([
      "posterEventTicket",
      "eventTicket", // MUST be the trailing fallback or Wallet rejects the scheme.
    ]);
    // Required semantic tags for ALL event passes:
    expect(passJson.semantics?.eventName).toBe("Fallen Voices Live");
    expect(passJson.semantics?.venueName).toBe("Apollo Theater");
    expect(passJson.semantics?.venueRegionName).toBe("New York, NY");
    expect(passJson.semantics?.venueRoom).toBe("Main Stage");
    // Required for live performance:
    expect(passJson.semantics?.performerNames).toEqual([
      "Phoenix Rivers",
      "The Outliers",
    ]);
    // NFC is what lets Wallet actually activate the poster layout on device:
    expect(passJson.nfc).toBeDefined();
    expect(passJson.nfc.message).toBe("poster-vas-payload-0001");
  });

  it("round-trips a sports-style poster with team abbreviations", () => {
    const input = {
      ...posterEventTicketWithNfc,
      serialNumber: "poster-sports-0001",
      semantics: {
        eventName: "Angels at Giants",
        venueName: "Oracle Park",
        venueRegionName: "San Francisco, CA",
        venueRoom: "Main Field",
        eventType: "PKEventTypeSports",
        eventStartDate: "2026-08-10T19:30:00Z",
        awayTeamAbbreviation: "LAA",
        homeTeamAbbreviation: "SFG",
      },
    };
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: input,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));
    expect(passJson.semantics.awayTeamAbbreviation).toBe("LAA");
    expect(passJson.semantics.homeTeamAbbreviation).toBe("SFG");
    expect(passJson.semantics.eventType).toBe("PKEventTypeSports");
  });

  it("round-trips a generic-type poster (no extra required tags)", () => {
    const input = {
      ...posterEventTicketWithNfc,
      serialNumber: "poster-generic-0001",
      semantics: {
        eventName: "Dev Conference 2026",
        venueName: "Moscone Center",
        venueRegionName: "San Francisco, CA",
        venueRoom: "Hall A",
        eventType: "PKEventTypeGeneric",
        eventStartDate: "2026-11-15T09:00:00Z",
      },
    };
    const signer = makeTestSignerContext();
    const { bytes } = generatePkpass({
      definition: input,
      assets: minimalAssets(),
      signer,
    });
    const entries = unzipSync(bytes);
    const passJson = JSON.parse(new TextDecoder().decode(entries["pass.json"]));
    expect(passJson.semantics.eventType).toBe("PKEventTypeGeneric");
    // Wallet never requires team/performer tags for a generic event.
    expect(passJson.semantics.awayTeamAbbreviation).toBeUndefined();
    expect(passJson.semantics.performerNames).toBeUndefined();
  });

  it("schema enforces the preferredStyleSchemes trailing-fallback rule", () => {
    // Apple is explicit: "Always provide `eventTicket` as the last entry so
    // pre-iOS-26 devices render the pass." Our schema's superRefine rejects
    // any list that doesn't have eventTicket as the trailing fallback.
    const input = {
      ...posterEventTicketWithNfc,
      preferredStyleSchemes: ["posterEventTicket"], // missing fallback
    };
    const result = PassDefinitionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("schema rejects a poster pass missing any required semantic tag", () => {
    const input = {
      ...posterEventTicketWithNfc,
      semantics: {
        // venueRoom intentionally missing
        eventName: "Fallen Voices Live",
        venueName: "Apollo Theater",
        venueRegionName: "New York, NY",
        eventType: "PKEventTypeLivePerformance",
        performerNames: ["Phoenix Rivers"],
      },
    };
    const result = PassDefinitionSchema.safeParse(input);
    // Schema-level check catches missing poster-required tags so Wallet
    // never has to silently fall back to the legacy layout on device.
    expect(result.success).toBe(false);
  });
});
