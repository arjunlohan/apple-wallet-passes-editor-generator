#!/usr/bin/env tsx
/**
 * Emit a sample .pkpass signed with a throwaway cert. Use it to smoke-test
 * the verifier (`npm run verify-pkpass -- sample.pkpass`).
 *
 * This script does NOT touch the real Apple credentials in .env.local.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import forge from "node-forge";
import { deflateSync } from "fflate";
import { generatePkpass } from "@/lib/pass-generator";
import type { PassAssets } from "@/lib/pass-spec";

function makeSigner() {
  const root = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const rootCert = forge.pki.createCertificate();
  rootCert.publicKey = root.publicKey;
  rootCert.serialNumber = "01";
  rootCert.validity.notBefore = new Date();
  rootCert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const sub = [
    { name: "commonName", value: "Sample WWDR" },
    { name: "organizationName", value: "Sample" },
  ];
  rootCert.setSubject(sub);
  rootCert.setIssuer(sub);
  rootCert.setExtensions([{ name: "basicConstraints", cA: true }]);
  rootCert.sign(root.privateKey, forge.md.sha256.create());

  const leaf = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const leafCert = forge.pki.createCertificate();
  leafCert.publicKey = leaf.publicKey;
  leafCert.serialNumber = "02";
  leafCert.validity.notBefore = new Date();
  leafCert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  leafCert.setSubject([
    { name: "commonName", value: "Pass Type ID: sample" },
    { name: "organizationName", value: "Sample" },
  ]);
  leafCert.setIssuer(sub);
  leafCert.sign(root.privateKey, forge.md.sha256.create());

  return {
    signerCertPem: forge.pki.certificateToPem(leafCert),
    wwdrCertPem: forge.pki.certificateToPem(rootCert),
    privateKeyPem: forge.pki.privateKeyToPem(leaf.privateKey),
  };
}

function makePng(w: number, h: number): Uint8Array {
  // Minimal valid PNG — same scheme used in tests.
  const MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return (bytes: Uint8Array) => {
      let c = 0xffffffff;
      for (let i = 0; i < bytes.byteLength; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
  })();
  const u32 = (n: number) => {
    const v = new Uint8Array(4);
    new DataView(v.buffer).setUint32(0, n, false);
    return v;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const t = new TextEncoder().encode(type);
    const payload = new Uint8Array(t.byteLength + data.byteLength);
    payload.set(t, 0);
    payload.set(data, t.byteLength);
    const crc = u32(CRC(payload));
    const buf = new Uint8Array(4 + payload.byteLength + 4);
    buf.set(u32(data.byteLength), 0);
    buf.set(payload, 4);
    buf.set(crc, 4 + payload.byteLength);
    return buf;
  };
  const ihdrData = new Uint8Array(13);
  const dv = new DataView(ihdrData.buffer);
  dv.setUint32(0, w, false);
  dv.setUint32(4, h, false);
  ihdrData[8] = 8; ihdrData[9] = 2;
  const raw = new Uint8Array(h * (w * 3 + 1));
  const idat = chunk("IDAT", deflateSync(raw));
  const ihdr = chunk("IHDR", ihdrData);
  const iend = chunk("IEND", new Uint8Array(0));
  const out = new Uint8Array(MAGIC.byteLength + ihdr.byteLength + idat.byteLength + iend.byteLength);
  let off = 0;
  out.set(MAGIC, off); off += MAGIC.byteLength;
  out.set(ihdr, off); off += ihdr.byteLength;
  out.set(idat, off); off += idat.byteLength;
  out.set(iend, off);
  return out;
}

const definition = {
  formatVersion: 1,
  passTypeIdentifier: "pass.sample.demo",
  teamIdentifier: "ABCDE12345",
  serialNumber: "sample-0001",
  organizationName: "Sample Co",
  description: "Sample pass (throwaway signer)",
  backgroundColor: "rgb(30, 41, 59)",
  foregroundColor: "rgb(248, 250, 252)",
  labelColor: "rgb(148, 163, 184)",
  style: "generic",
  generic: {
    primaryFields: [{ key: "name", label: "NAME", value: "Liz Chetelat" }],
  },
  barcodes: [
    {
      format: "PKBarcodeFormatQR",
      message: "sample-0001",
      messageEncoding: "iso-8859-1",
    },
  ],
};

const assets: PassAssets = {
  icon: {
    "1x": makePng(29, 29),
    "2x": makePng(58, 58),
    "3x": makePng(87, 87),
  },
};

const out = generatePkpass({ definition, assets, signer: makeSigner() });
const outPath = resolve(process.argv[2] ?? "sample.pkpass");
writeFileSync(outPath, out.bytes);
console.log(`wrote ${outPath} (${out.bytes.byteLength} bytes, ${out.baseName})`);
