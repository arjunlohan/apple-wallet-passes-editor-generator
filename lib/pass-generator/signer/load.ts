import "server-only";
import forge from "node-forge";
import type { SignerContext } from "../types";

/**
 * Read Apple signer credentials from env vars, decrypt the PKCS#8 key using
 * `APPLE_SIGNER_KEY_PASSPHRASE`, and return a reusable `SignerContext`.
 *
 * Decryption is expensive; callers that invoke this in a hot path should
 * reuse the result. `getSigner()` below provides a module-scoped cache.
 */
export function loadSignerFromEnv(): SignerContext {
  const wwdr = requireEnv("APPLE_WWDR_CERT_BASE64");
  const signer = requireEnv("APPLE_SIGNER_CERT_BASE64");
  const keyB64 = requireEnv("APPLE_SIGNER_KEY_BASE64");
  const passphrase = requireEnv("APPLE_SIGNER_KEY_PASSPHRASE");

  const wwdrPem = extractPem(base64Decode(wwdr), "CERTIFICATE");
  const signerPem = extractPem(base64Decode(signer), "CERTIFICATE");
  const encryptedKeyPem = base64Decode(keyB64);

  // node-forge decrypts PKCS#8-encrypted private keys.
  const decryptedKey = forge.pki.decryptRsaPrivateKey(encryptedKeyPem, passphrase);
  if (!decryptedKey) {
    throw new Error(
      "failed to decrypt APPLE_SIGNER_KEY_BASE64 — passphrase wrong or key format unexpected",
    );
  }
  const privateKeyPem = forge.pki.privateKeyToPem(decryptedKey);

  return { signerCertPem: signerPem, wwdrCertPem: wwdrPem, privateKeyPem };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env var: ${name}`);
  return value;
}

function base64Decode(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf8");
}

/**
 * Input from the env is a base64-encoded blob which may contain PEM
 * preamble (friendlyName / localKeyID from `openssl pkcs12`). Extract the
 * first `-----BEGIN <label>-----...-----END <label>-----` block.
 */
function extractPem(input: string, label: string): string {
  const re = new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`);
  const match = re.exec(input);
  if (!match) throw new Error(`PEM block not found for ${label}`);
  return `-----BEGIN ${label}-----${match[1]}-----END ${label}-----\n`;
}

let cached: SignerContext | null = null;

/** Module-scoped cache. Warm after first call; re-decrypted per cold start. */
export function getSigner(): SignerContext {
  if (!cached) cached = loadSignerFromEnv();
  return cached;
}

/** Test-only escape hatch so suites can reset the cache. */
export function __resetSignerCache(): void {
  cached = null;
}
