import "server-only";
import forge from "node-forge";
import type { SignerContext } from "./types";

/**
 * Produce a PKCS#7 detached CMS signature over the given manifest bytes.
 * The returned DER-encoded bytes are what Apple's Wallet verifies.
 *
 * Key decisions:
 *  - Detached: `.sign({ detached: true })`. The signature must NOT embed the
 *    manifest content — Wallet fails verification if it does.
 *  - SHA-256 is used INSIDE the CMS signer attributes for the message digest.
 *    This is distinct from the SHA-1 used in `manifest.json` for each file's
 *    hash. Two layers of hashing, two different algorithms.
 *  - Both the signer cert and the WWDR intermediate are embedded in the CMS.
 *  - Authenticated attributes include content-type, message digest, and
 *    signing time (the minimum set Apple's verifier expects).
 */
export function signManifest(
  manifestBytes: Uint8Array,
  signer: SignerContext,
): Uint8Array {
  const signerCert = forge.pki.certificateFromPem(signer.signerCertPem);
  const wwdrCert = forge.pki.certificateFromPem(signer.wwdrCertPem);
  const privateKey = forge.pki.privateKeyFromPem(signer.privateKeyPem);

  const p7 = forge.pkcs7.createSignedData();
  // Build the binary-string content in chunks. forge's own
  // `util.binary.raw.encode` does `String.fromCharCode.apply(null, bytes)`,
  // which overflows V8's argument stack on buffers over ~65K bytes —
  // rare for a manifest but cheap to defend against.
  p7.content = forge.util.createBuffer(bytesToBinaryString(manifestBytes), "raw");
  p7.addCertificate(signerCert);
  p7.addCertificate(wwdrCert);
  p7.addSigner({
    key: privateKey,
    certificate: signerCert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest /* value computed by forge */ },
      { type: forge.pki.oids.signingTime /* value computed by forge */ },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const out = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) out[i] = der.charCodeAt(i) & 0xff;
  return out;
}

function bytesToBinaryString(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    out += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.byteLength))),
    );
  }
  return out;
}
