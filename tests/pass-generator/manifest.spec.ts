import { describe, expect, it } from "vitest";
import { buildManifest, sha1Hex } from "@/lib/pass-generator/manifest";

describe("buildManifest", () => {
  it("hashes each file with SHA-1 hex (not SHA-256)", () => {
    const files = { "pass.json": new TextEncoder().encode("{}") };
    const { manifest } = buildManifest(files);
    expect(manifest["pass.json"]).toMatch(/^[0-9a-f]{40}$/); // 160 bits hex = 40 chars
  });

  it("is deterministic across runs", () => {
    const files = {
      "icon.png": new Uint8Array([1, 2, 3]),
      "pass.json": new TextEncoder().encode('{"a":1}'),
    };
    const a = buildManifest(files);
    const b = buildManifest(files);
    expect(a.bytes).toEqual(b.bytes);
  });

  it("rejects Windows-style paths", () => {
    expect(() =>
      buildManifest({ "en\\strings": new Uint8Array(1) }),
    ).toThrow(/backslash/);
  });

  it("rejects absolute paths", () => {
    expect(() => buildManifest({ "/pass.json": new Uint8Array(1) })).toThrow(/relative/);
  });

  it("sha1Hex matches the Apple test vector", () => {
    // "abc" -> a9993e364706816aba3e25717850c26c9cd0d89d
    const hash = sha1Hex(new TextEncoder().encode("abc"));
    expect(hash).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("sha1Hex handles buffers over V8's argument-count limit", () => {
    // Regression: real user PNGs (resized 58×58 → 540×660) are ~1 MB
    // which blew node-forge's `String.fromCharCode.apply(null, bytes)`
    // with "Maximum call stack size exceeded". Discovered 2026-04-26.
    const big = new Uint8Array(2 * 1024 * 1024);
    for (let i = 0; i < big.byteLength; i++) big[i] = i & 0xff;
    const hash = sha1Hex(big);
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
    // Second call with the same bytes must produce the same digest.
    expect(sha1Hex(big)).toBe(hash);
  });
});
