import { describe, expect, it } from "vitest";
import { PassDefinitionSchema } from "@/lib/pass-spec";
import { buildDefinitionFromForm } from "@/app/editor/_components/buildDefinition";
import { defaultValues } from "@/app/editor/_components/defaults";

describe("buildDefinitionFromForm — field formatting + top-level metadata", () => {
  it("emits every top-level + per-field new property and passes the schema", () => {
    const v = defaultValues("boardingPass");
    v.expirationDate = "2026-12-31T23:59:00Z";
    v.sharingProhibited = true;
    v.suppressStripShine = true;
    v.groupingIdentifier = "trip-xrt9p2";
    v.appLaunchURL = "https://example.com/open";
    v.webServiceURL = "https://passes.example.com/v1";
    v.authenticationToken = "supersecret-token-that-is-long-enough-for-the-32-char-rule";
    v.associatedStoreIdentifiers = "1234567890, 9876543210";
    v.userInfoJson = JSON.stringify({ tripId: "trip-xrt9p2", tier: "gold" });
    v.beacons = [
      {
        proximityUUID: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
        major: "1",
        minor: "2",
        relevantText: "Gate B14",
      },
    ];
    v.auxiliaryFields[0].dateStyle = "PKDateStyleMedium";
    v.auxiliaryFields[0].timeStyle = "PKDateStyleShort";
    v.auxiliaryFields[0].row = "0";
    v.auxiliaryFields[1].row = "1";
    v.secondaryFields[0].textAlignment = "PKTextAlignmentLeft";
    v.backFields[0].changeMessage = "Confirmation updated to %@.";
    v.backFields[0].attributedValue = 'See <a href="https://example.com/help">help</a>.';
    v.backFields[0].dataDetectorTypes = "PKDataDetectorTypeLink, PKDataDetectorTypePhoneNumber";
    v.primaryFields[0].currencyCode = "usd"; // lowercase; should uppercase on emit.
    v.primaryFields[0].numberStyle = "PKNumberStyleDecimal";

    const def = buildDefinitionFromForm(v) as Record<string, any>;
    const parsed = PassDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      // Surface issues in the assertion message for fast diagnosis.
      const msg = parsed.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n");
      throw new Error("Schema rejected:\n" + msg);
    }

    expect(def.expirationDate).toBe("2026-12-31T23:59:00Z");
    expect(def.sharingProhibited).toBe(true);
    expect(def.suppressStripShine).toBe(true);
    expect(def.groupingIdentifier).toBe("trip-xrt9p2");
    expect(def.appLaunchURL).toBe("https://example.com/open");
    expect(def.webServiceURL).toBe("https://passes.example.com/v1");
    expect(def.authenticationToken.length).toBeGreaterThanOrEqual(32);
    expect(def.associatedStoreIdentifiers).toEqual([1234567890, 9876543210]);
    expect(def.userInfo).toEqual({ tripId: "trip-xrt9p2", tier: "gold" });
    expect(def.beacons).toHaveLength(1);
    expect(def.beacons[0]).toEqual({
      proximityUUID: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
      major: 1,
      minor: 2,
      relevantText: "Gate B14",
    });

    const aux0 = def.boardingPass.auxiliaryFields[0];
    expect(aux0.dateStyle).toBe("PKDateStyleMedium");
    expect(aux0.timeStyle).toBe("PKDateStyleShort");
    expect(aux0.row).toBe(0);
    expect(def.boardingPass.auxiliaryFields[1].row).toBe(1);
    expect(def.boardingPass.secondaryFields[0].textAlignment).toBe("PKTextAlignmentLeft");
    const back0 = def.boardingPass.backFields[0];
    expect(back0.changeMessage).toBe("Confirmation updated to %@.");
    expect(back0.attributedValue).toContain("<a href=");
    expect(back0.dataDetectorTypes).toEqual([
      "PKDataDetectorTypeLink",
      "PKDataDetectorTypePhoneNumber",
    ]);
    expect(def.boardingPass.primaryFields[0].currencyCode).toBe("USD");
    expect(def.boardingPass.primaryFields[0].numberStyle).toBe("PKNumberStyleDecimal");
  });

  it("omits unset fields cleanly — primary row with no formatting has only key/label/value", () => {
    const v = defaultValues("generic");
    const def = buildDefinitionFromForm(v) as Record<string, any>;
    const primary = def.generic.primaryFields[0];
    expect(Object.keys(primary).sort()).toEqual(["key", "label", "value"]);
    // No top-level advanced keys either.
    expect(def.expirationDate).toBeUndefined();
    expect(def.sharingProhibited).toBeUndefined();
    expect(def.webServiceURL).toBeUndefined();
    expect(def.authenticationToken).toBeUndefined();
    expect(def.userInfo).toBeUndefined();
    expect(def.beacons).toBeUndefined();
  });

  it("preview mode drops webServiceURL without a matching token so the live preview never throws", () => {
    const v = defaultValues("generic");
    v.webServiceURL = "https://passes.example.com/v1";
    const preview = buildDefinitionFromForm(v, "preview") as Record<string, unknown>;
    expect(preview.webServiceURL).toBeUndefined();
    expect(preview.authenticationToken).toBeUndefined();
  });

  it("validate mode keeps the unpaired webServiceURL so the issue tray flags the missing token", () => {
    const v = defaultValues("generic");
    v.webServiceURL = "https://passes.example.com/v1";
    const def = buildDefinitionFromForm(v, "validate");
    const parsed = PassDefinitionSchema.safeParse(def);
    expect(parsed.success).toBe(false);
  });

  it("validate mode surfaces malformed userInfo JSON through the schema", () => {
    const v = defaultValues("generic");
    v.userInfoJson = "{ not valid json";
    const def = buildDefinitionFromForm(v, "validate");
    const parsed = PassDefinitionSchema.safeParse(def);
    expect(parsed.success).toBe(false);
  });
});
