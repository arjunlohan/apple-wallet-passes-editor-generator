import "server-only";
import type { PassAssets } from "@/lib/pass-spec";

export interface SignerContext {
  /** PEM certificate (signer / Pass Type ID cert). */
  signerCertPem: string;
  /** WWDR intermediate PEM. */
  wwdrCertPem: string;
  /**
   * Decrypted RSA private key in PEM format. Callers supply this only when
   * they've already decrypted a passphrase-protected PKCS#8 key; most
   * callers should prefer `loadSignerFromEnv`.
   */
  privateKeyPem: string;
}

export interface GenerateInput {
  /** Raw or validated definition; re-validated on the server for safety. */
  definition: unknown;
  assets: PassAssets;
  signer: SignerContext;
  /** Optional locale for date/number formatting. Defaults to runtime locale. */
  locale?: string;
}

export interface GenerateOutput {
  /** The `.pkpass` ZIP bytes. */
  bytes: Uint8Array;
  /** Suggested download filename (no extension). */
  baseName: string;
}
