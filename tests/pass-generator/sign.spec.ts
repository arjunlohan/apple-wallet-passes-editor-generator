import { describe, expect, it } from "vitest";
import forge from "node-forge";
import { signManifest } from "@/lib/pass-generator/sign";
import { makeTestSignerContext } from "./helpers/testSigner";

describe("signManifest", () => {
  it("produces a detached PKCS#7 CMS signature over manifest bytes", () => {
    const signer = makeTestSignerContext();
    const manifestBytes = new TextEncoder().encode('{"pass.json":"abc"}');

    const signature = signManifest(manifestBytes, signer);
    expect(signature.byteLength).toBeGreaterThan(100);

    // Re-parse the DER bytes back into node-forge's PKCS#7 object.
    let bin = "";
    for (let i = 0; i < signature.byteLength; i++) {
      bin += String.fromCharCode(signature[i]);
    }
    const asn1 = forge.asn1.fromDer(bin);
    const msg = forge.pkcs7.messageFromAsn1(asn1) as unknown as {
      content?: unknown;
      certificates: forge.pki.Certificate[];
    };

    // Detached: content is NOT embedded.
    expect(msg.content).toBeFalsy();

    // Both certs (leaf + root/WWDR stand-in) must be present in the CMS.
    expect(msg.certificates.length).toBe(2);
  });
});
