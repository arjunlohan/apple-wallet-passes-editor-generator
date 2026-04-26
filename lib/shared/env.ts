import "server-only";
import * as z from "zod";

/**
 * Runtime env accessor. Parses once per process. Never cross-contaminates
 * the client bundle because of the `server-only` import above.
 */
const EnvSchema = z.object({
  APPLE_PASS_TYPE_IDENTIFIER: z.string().min(1),
  APPLE_TEAM_IDENTIFIER: z.string().regex(/^[A-Z0-9]{10}$/),
  APPLE_SIGNER_KEY_PASSPHRASE: z.string().min(1),
  APPLE_WWDR_CERT_BASE64: z.string().min(1),
  APPLE_SIGNER_CERT_BASE64: z.string().min(1),
  APPLE_SIGNER_KEY_BASE64: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(
        `Missing or invalid Apple Wallet env vars: ${missing}. Copy .env.example to .env.local and fill in the values from your Apple Developer account.`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}

export function __resetEnvCache(): void {
  cached = null;
}
