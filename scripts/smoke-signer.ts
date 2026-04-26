#!/usr/bin/env tsx
/**
 * Smoke-test: load real Apple signer creds from .env.local, generate a
 * signed .pkpass, and verify it. Useful as a first check after populating
 * the env file — proves cert/key/passphrase are all correct.
 */
import { writeFileSync } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "fflate";
import { loadSignerFromEnv, generatePkpass } from "@/lib/pass-generator";
import type { PassAssets } from "@/lib/pass-spec";

// Load .env.local manually (Next does this for us in the dev server; here
// we're outside of Next so we parse it ourselves).
const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error(`no .env.local at ${envPath}`);
  process.exit(1);
}
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

// Minimal PNG helper (shared pattern with emit-sample).
const MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.byteLength; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n: number) {
  const v = new Uint8Array(4);
  new DataView(v.buffer).setUint32(0, n, false);
  return v;
}
function chunk(type: string, data: Uint8Array) {
  const t = new TextEncoder().encode(type);
  const payload = new Uint8Array(t.byteLength + data.byteLength);
  payload.set(t, 0);
  payload.set(data, t.byteLength);
  const crc = u32(crc32(payload));
  const buf = new Uint8Array(4 + payload.byteLength + 4);
  buf.set(u32(data.byteLength), 0);
  buf.set(payload, 4);
  buf.set(crc, 4 + payload.byteLength);
  return buf;
}
function makePng(w: number, h: number): Uint8Array {
  const ihdrData = new Uint8Array(13);
  const dv = new DataView(ihdrData.buffer);
  dv.setUint32(0, w, false);
  dv.setUint32(4, h, false);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  const raw = new Uint8Array(h * (w * 3 + 1));
  const ihdr = chunk("IHDR", ihdrData);
  const idat = chunk("IDAT", deflateSync(raw));
  const iend = chunk("IEND", new Uint8Array(0));
  const out = new Uint8Array(MAGIC.byteLength + ihdr.byteLength + idat.byteLength + iend.byteLength);
  let off = 0;
  out.set(MAGIC, off); off += MAGIC.byteLength;
  out.set(ihdr, off); off += ihdr.byteLength;
  out.set(idat, off); off += idat.byteLength;
  out.set(iend, off);
  return out;
}

console.log("[1/3] loading signer from env…");
const signer = loadSignerFromEnv();
console.log(
  `      signer cert loaded (${signer.signerCertPem.length}B), ` +
    `WWDR loaded (${signer.wwdrCertPem.length}B), ` +
    `private key decrypted (${signer.privateKeyPem.length}B)`,
);

console.log("[2/3] generating signed .pkpass…");
const definition = {
  formatVersion: 1,
  passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER!,
  teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER!,
  serialNumber: "smoke-0001",
  organizationName: "Apple Wallet Pass Editor (smoke test)",
  description: "Smoke-test pass signed with real Apple creds",
  backgroundColor: "rgb(30, 41, 59)",
  foregroundColor: "rgb(248, 250, 252)",
  labelColor: "rgb(148, 163, 184)",
  logoText: "Smoke test",
  style: "generic",
  generic: {
    primaryFields: [{ key: "name", label: "NAME", value: "Sample Passholder" }],
  },
  barcodes: [
    {
      format: "PKBarcodeFormatQR",
      message: "smoke-0001",
      messageEncoding: "iso-8859-1",
    },
  ],
};
const assets: PassAssets = {
  icon: { "1x": makePng(29, 29), "2x": makePng(58, 58), "3x": makePng(87, 87) },
};
const out = generatePkpass({ definition, assets, signer });
const outPath = resolve(process.argv[2] ?? "/tmp/smoke.pkpass");
writeFileSync(outPath, out.bytes);
console.log(`      wrote ${outPath} (${out.bytes.byteLength}B)`);

console.log("[3/3] done. run `npm run verify-pkpass -- " + outPath + "` to check it.");
