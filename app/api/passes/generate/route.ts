import { PassDefinitionSchema, formatZodError } from "@/lib/pass-spec";
import type { ImageSlot, ImageVariants, PassAssets } from "@/lib/pass-spec";
import { generatePkpass, getSigner, verifyPkpassBytes } from "@/lib/pass-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssetVariantKey = keyof ImageVariants;

interface GenerateRequestBody {
  definition: unknown;
  assets: Partial<Record<ImageSlot, Partial<Record<AssetVariantKey, string>>>>;
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = PassDefinitionSchema.safeParse(body.definition);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid pass definition", issues: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const assets = decodeAssets(body.assets);

  const missing = requiredMissing(assets);
  if (missing.length > 0) {
    return Response.json(
      {
        error: "pass is missing required icon variants",
        issues: missing.map((key) => ({
          path: `assets.${key}`,
          message: "required",
        })),
      },
      { status: 400 },
    );
  }

  let signer;
  try {
    signer = getSigner();
  } catch (err) {
    // The signer env vars aren't set on this deploy (common on a public
    // Vercel preview deployment — see README "Requirements" section).
    // Rewrite to a user-facing message so the download button shows
    // something actionable instead of a cryptic env var name.
    const detail = err instanceof Error ? err.message : "signer unavailable";
    const missingEnv = /^missing required env var: /.test(detail);
    return Response.json(
      {
        error: missingEnv
          ? "This deployment isn't configured to sign passes. Set APPLE_WWDR_CERT_BASE64, APPLE_SIGNER_CERT_BASE64, APPLE_SIGNER_KEY_BASE64, and APPLE_SIGNER_KEY_PASSPHRASE in the hosting env, or clone the repo and run it locally with your own Apple Developer credentials."
          : detail,
      },
      { status: missingEnv ? 503 : 500 },
    );
  }

  let output;
  try {
    output = generatePkpass({ definition: parsed.data, assets, signer });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "generation failed" },
      { status: 500 },
    );
  }

  // Verify-before-download: manifest + detached CMS + schema round-trip.
  // If an invariant is broken we short-circuit with a diagnostic rather
  // than ship a corrupt .pkpass the user has to debug on-device.
  const verify = verifyPkpassBytes(output.bytes);
  if (!verify.ok) {
    console.error("[pkpass] self-verification failed", verify.issues);
    return Response.json(
      {
        error: "generator produced a malformed pkpass",
        issues: verify.issues.map((i) => ({
          path: `pkpass.${i.name}`,
          message: i.detail ?? "failed",
        })),
        schemaIssues: verify.schemaIssues,
      },
      { status: 500 },
    );
  }

  const filename = `${output.baseName}.pkpass`;
  const arrayBuffer = output.bytes.buffer.slice(
    output.bytes.byteOffset,
    output.bytes.byteOffset + output.bytes.byteLength,
  ) as ArrayBuffer;
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function decodeAssets(
  assets: GenerateRequestBody["assets"] | undefined,
): PassAssets {
  if (!assets) return {};
  const out: PassAssets = {};
  for (const [slotKey, variants] of Object.entries(assets)) {
    if (!variants) continue;
    const slot = slotKey as ImageSlot;
    const normalized: ImageVariants = {};
    for (const [variantKey, b64] of Object.entries(variants)) {
      if (typeof b64 !== "string" || b64.length === 0) continue;
      normalized[variantKey as AssetVariantKey] = base64ToBytes(b64);
    }
    if (Object.keys(normalized).length > 0) out[slot] = normalized;
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

function requiredMissing(assets: PassAssets): string[] {
  const icon = assets.icon;
  const have = (v: AssetVariantKey) => icon?.[v] instanceof Uint8Array;
  const missing: string[] = [];
  if (!have("1x")) missing.push("icon.1x");
  if (!have("2x")) missing.push("icon.2x");
  if (!have("3x")) missing.push("icon.3x");
  return missing;
}
