#!/usr/bin/env tsx
/**
 * Preview ↔ Wallet fidelity iteration harness. Dev-only.
 *
 * For each pass style:
 *   1. Screenshots the /fidelity?style=X preview rendered at a fixed
 *      viewport via headless Chromium (Playwright).
 *   2. Generates a real .pkpass for that style using the signer
 *      configured in `.env.local`.
 *   3. Opens the .pkpass in macOS Pass Viewer (`open -a "Pass Viewer"`),
 *      screenshots the window region via `/usr/sbin/screencapture`, and
 *      closes the window.
 *   4. Writes both PNGs + a side-by-side comparison report to
 *      /tmp/wallet-fidelity/<style>/.
 *
 * This script is intentionally NOT shipped in production output — it
 * only exists so we can iterate preview CSS against Wallet's own
 * rendering without eyeballing screenshots. macOS only; Pass Viewer is
 * the only way to open a .pkpass without a device.
 *
 * Usage:
 *   npm run dev               # leave it running in another terminal
 *   npm run fidelity          # run the harness
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";

// Next's dev server loads .env.local automatically, but this script runs
// outside Next — parse the file ourselves. Regex must include digits or
// keys like APPLE_WWDR_CERT_BASE64 get silently skipped (see lessons.md).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import boardingPass from "../../tests/fixtures/passes/boardingPass.json";
import coupon from "../../tests/fixtures/passes/coupon.json";
import eventTicket from "../../tests/fixtures/passes/eventTicket.json";
import generic from "../../tests/fixtures/passes/generic.json";
import posterEventTicket from "../../tests/fixtures/passes/posterEventTicket.json";
import storeCard from "../../tests/fixtures/passes/storeCard.json";

const STYLES = [
  { key: "boardingPass", fixture: boardingPass },
  { key: "coupon", fixture: coupon },
  { key: "eventTicket", fixture: eventTicket },
  { key: "generic", fixture: generic },
  { key: "posterEventTicket", fixture: posterEventTicket },
  { key: "storeCard", fixture: storeCard },
] as const;

const OUT_ROOT = process.env.FIDELITY_OUT ?? "/tmp/wallet-fidelity";
const SHOW_BACK = process.env.FIDELITY_BACK === "1";
// Harness runs its own Next server on a non-standard port so it doesn't
// collide with an already-running `npm run dev`. We use production mode
// (`next start`) because Turbopack's HMR WebSocket doesn't reliably
// connect from Playwright — hydration stalls and the barcode canvas
// never finishes its render. A pre-built, static-chunk server
// side-steps that entirely.
const HARNESS_PORT = 31415;
const DEV_URL = process.env.FIDELITY_DEV_URL ?? `http://127.0.0.1:${HARNESS_PORT}`;

async function run() {
  rmSync(OUT_ROOT, { recursive: true, force: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  // If FIDELITY_DEV_URL is explicitly set, assume the caller is running
  // their own server (e.g., their existing `npm run dev`) and just poke
  // it. Otherwise launch a dedicated production server for the harness.
  let serverHandle: { stop: () => Promise<void> } | null = null;
  if (!process.env.FIDELITY_DEV_URL) {
    serverHandle = await startProductionServer();
  }
  await ensureDevServerReachable();

  const { generatePkpass, getSigner } = await import("@/lib/pass-generator");
  const { IMAGE_DIMENSION_RULES } = await import("@/lib/pass-spec");
  const { makePng } = await import("../../tests/pass-generator/helpers/tinyPng");

  const iconRule = IMAGE_DIMENSION_RULES.icon.exact!;
  const bgRule = IMAGE_DIMENSION_RULES.background.exact!;
  const classicAssets = {
    icon: {
      "1x": makePng(iconRule.width, iconRule.height),
      "2x": makePng(iconRule.width * 2, iconRule.height * 2),
      "3x": makePng(iconRule.width * 3, iconRule.height * 3),
    },
  } as const;
  // Poster-mode passes need a `background.png` set or Wallet silently
  // downgrades to the classic eventTicket scheme. See tasks/lessons.md.
  const posterAssets = {
    ...classicAssets,
    background: {
      "1x": makePng(bgRule.width, bgRule.height),
      "2x": makePng(bgRule.width * 2, bgRule.height * 2),
      "3x": makePng(bgRule.width * 3, bgRule.height * 3),
    },
  } as const;

  let signer;
  try {
    signer = getSigner();
  } catch (err) {
    console.error("Cannot load signer — .env.local is missing Apple creds.");
    console.error(err);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const { key, fixture } of STYLES) {
      const styleDir = join(OUT_ROOT, key);
      mkdirSync(styleDir, { recursive: true });

      const face = SHOW_BACK ? "back" : "front";

      console.log(`[${key}] capturing preview (${face})…`);
      const previewPath = join(styleDir, `preview-${face}.png`);
      await capturePreview(browser, key, face, previewPath);

      console.log(`[${key}] generating signed .pkpass…`);
      const assetsForStyle = key === "posterEventTicket" ? posterAssets : classicAssets;
      const { bytes } = generatePkpass({
        definition: fixture,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assets: assetsForStyle as any,
        signer,
      });
      const pkpassPath = join(styleDir, `${key}.pkpass`);
      writeFileSync(pkpassPath, bytes);

      console.log(`[${key}] opening in Pass Viewer…`);
      const walletPath = join(styleDir, `wallet-${face}.png`);
      try {
        // Pass Viewer titles its window after the pass's organizationName.
        // Gate the capture on that so we never screenshot a stale window
        // from the previous iteration.
        const expectedTitle = (fixture as { organizationName?: string })
          .organizationName ?? "Pass";
        await capturePassViewer(pkpassPath, walletPath, expectedTitle);
      } catch (err) {
        console.warn(`[${key}] Pass Viewer capture failed: ${err instanceof Error ? err.message : err}`);
      }

      writeReport(styleDir, key, previewPath, walletPath);
    }
    writeIndex();
    console.log(`\n✓ Report: ${join(OUT_ROOT, "index.md")}`);
  } finally {
    await browser.close();
    if (serverHandle) await serverHandle.stop();
  }
}

/**
 * Build (if stale) and start a Next production server on HARNESS_PORT.
 * Returns a handle whose `stop()` kills the child. Production mode
 * avoids the Turbopack HMR WebSocket that breaks client hydration
 * under Playwright.
 */
async function startProductionServer(): Promise<{ stop: () => Promise<void> }> {
  // Always rebuild — fast on warm Turbopack cache, catches edits to
  // preview components between runs.
  console.log("[harness] next build…");
  await new Promise<void>((resolve, reject) => {
    const b = spawn("npx", ["next", "build"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let stderr = "";
    b.stderr?.on("data", (d) => (stderr += d.toString()));
    b.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`next build failed: ${stderr}`)),
    );
  });

  console.log(`[harness] next start on :${HARNESS_PORT}…`);
  const child = spawn("npx", ["next", "start", "-p", String(HARNESS_PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  child.stdout?.on("data", (d) => {
    const s = d.toString().trim();
    if (s) console.log(`[next] ${s}`);
  });
  child.stderr?.on("data", (d) => {
    const s = d.toString().trim();
    if (s) console.log(`[next:err] ${s}`);
  });

  // Poll until the server answers. next start takes ~500–1500 ms.
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${DEV_URL}/fidelity?style=generic&face=front`);
      if (res.ok) break;
    } catch {
      // still coming up
    }
    await sleep(200);
  }

  return {
    stop: async () => {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
    },
  };
}

async function ensureDevServerReachable(): Promise<void> {
  try {
    const res = await fetch(`${DEV_URL}/fidelity?style=generic&face=front`, {
      headers: { "user-agent": "fidelity-harness" },
    });
    if (!res.ok) {
      throw new Error(`dev server returned ${res.status}`);
    }
  } catch (err) {
    console.error(
      `Dev server not reachable at ${DEV_URL}. Start it with \`npm run dev\` in another terminal.`,
    );
    console.error(err);
    process.exit(1);
  }
}

async function capturePreview(
  browser: Browser,
  style: string,
  face: "front" | "back",
  outPath: string,
): Promise<void> {
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 720 },
    deviceScaleFactor: 3,
  });
  const page: Page = await ctx.newPage();
  try {
    // Cache-bust every request so Next's dev server / Turbopack HMR
    // never serves a stale tree for a different style.
    const bust = Date.now();
    await page.goto(
      `${DEV_URL}/fidelity?style=${style}&face=${face}&_=${bust}`,
      { waitUntil: "networkidle" },
    );
    // bwip-js renders into a <canvas> asynchronously — networkidle fires
    // before React hydrates the client chunk and before bwip-js's
    // dynamic import resolves. BarcodeBlock sets `data-barcode-ready=1`
    // on the canvas once the draw completes; wait on that signal.
    await page
      .waitForFunction(
        () => {
          const canvas = document.querySelector(
            "[data-fidelity-target] canvas",
          ) as HTMLCanvasElement | null;
          if (!canvas) return true; // No barcode on this face — e.g., poster front.
          return canvas.dataset.barcodeReady === "1" ||
            canvas.dataset.barcodeError !== undefined;
        },
        null,
        { timeout: 8000 },
      )
      .catch(() => void 0);
    // Small settle for font metrics / animations.
    await page.waitForTimeout(150);
    const target = page.locator("[data-fidelity-target]");
    await target.screenshot({ path: outPath, omitBackground: false });
  } finally {
    await ctx.close();
  }
}

async function capturePassViewer(
  pkpassPath: string,
  outPath: string,
  expectedTitle: string,
): Promise<void> {
  // Fully quit Pass Viewer between iterations. Without this, stale
  // windows from the previous pass linger and their old bounds leak
  // into the next iteration's screencapture.
  await exec("osascript", ["-e", 'tell application "Pass Viewer" to quit']).catch(
    () => void 0,
  );
  // Wait until the process is actually gone before opening the next one
  // — an empty `pgrep` tells us WindowServer has destroyed the old
  // windows so their bounds can't be returned by AppleScript anymore.
  await waitForProcessGone("Pass Viewer", 4000);
  // Launch Services needs a brief pause after quit or `open` returns
  // -600 (procNotFound). 250 ms is empirically reliable on Sequoia.
  await sleep(250);

  // Up to 3 tries: if `open` races the Launch Services daemon, retry.
  let openErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await exec("open", ["-a", "Pass Viewer", pkpassPath]);
      openErr = null;
      break;
    } catch (err) {
      openErr = err;
      await sleep(500);
    }
  }
  if (openErr) throw openErr;

  // Wait for a Pass Viewer window whose title matches the expected style
  // — this ensures we screenshot the pass we just opened, not a stale
  // window from a previous iteration. Then re-read bounds in case the
  // window moved during its resize animation.
  const bounds = await pollForTitledWindowBounds(
    "Pass Viewer",
    expectedTitle,
    10000,
  );
  if (!bounds) {
    throw new Error(
      `Pass Viewer window titled "${expectedTitle}" did not appear in time`,
    );
  }
  // Let the render animation settle. 400 ms is enough for the barcode
  // canvas + text to finalize without making the harness feel slow.
  await sleep(500);

  // Bring Pass Viewer to the front before screencapture so the terminal
  // or IDE window doesn't occlude the pass. `open -a` should do this on
  // its own, but in practice the focus doesn't always shift if the
  // terminal was already active.
  await exec("osascript", [
    "-e",
    'tell application "Pass Viewer" to activate',
  ]).catch(() => void 0);
  // Give WindowServer a beat to restack, then re-read bounds in case
  // activate moved the window (common with multi-display setups).
  await sleep(400);
  const latest = await pollForTitledWindowBounds(
    "Pass Viewer",
    expectedTitle,
    1500,
  );
  const rect = latest ?? bounds;

  // `screencapture -R x,y,w,h` captures a screen region. -x silences the
  // shutter sound. This avoids the window-id path entirely, which was
  // failing with "could not create image from window" when Screen
  // Recording permission hasn't been granted to the terminal.
  const { x, y, width, height } = rect;
  await exec("/usr/sbin/screencapture", [
    "-x",
    "-t",
    "png",
    "-R",
    `${x},${y},${width},${height}`,
    outPath,
  ]);
}

async function waitForProcessGone(name: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // pgrep exits non-zero when no match — that's our success signal.
      await exec("pgrep", ["-x", name]);
      // Still alive — keep waiting.
      await sleep(150);
    } catch {
      return;
    }
  }
}

/**
 * Poll AppleScript until Pass Viewer exposes a window whose title
 * matches `expectedTitle`. Returns the window's bounds as a rect
 * suitable for `screencapture -R`. Every new `.pkpass` shown by Pass
 * Viewer gets a title like "Boarding Pass" / "Coupon" / "Event Ticket"
 * — matching that gate keeps stale windows from leaking into the shot.
 */
async function pollForTitledWindowBounds(
  appName: string,
  expectedTitle: string,
  timeoutMs: number,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const script = `tell application "System Events"
    tell process "${appName}"
      repeat with w in (every window)
        if name of w is "${expectedTitle}" then
          set p to position of w
          set s to size of w
          set AppleScript's text item delimiters to ","
          set out to ((p as list) & (s as list)) as text
          set AppleScript's text item delimiters to ""
          return out
        end if
      end repeat
      return "none"
    end tell
  end tell`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const raw = (await exec("osascript", ["-e", script])).trim();
      if (raw && raw !== "none") {
        const parts = raw
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((n) => parseInt(n, 10))
          .filter((n) => Number.isFinite(n));
        if (parts.length >= 4) {
          const [x, y, width, height] = parts;
          if (width > 20 && height > 20) return { x, y, width, height };
        }
      }
    } catch {
      // Usually means the process hasn't fully spawned yet.
    }
    await sleep(200);
  }
  return null;
}


function writeReport(
  styleDir: string,
  style: string,
  previewPath: string,
  walletPath: string,
): void {
  const md = `# ${style} — fidelity comparison

Generated ${new Date().toISOString()}

| Editor preview | Opened .pkpass (Pass Viewer) |
|---|---|
| ![preview](${relativeFromDir(styleDir, previewPath)}) | ![wallet](${relativeFromDir(styleDir, walletPath)}) |

Pass file: \`${style}.pkpass\` (in this folder; re-open with \`open ${style}.pkpass\`).
`;
  writeFileSync(join(styleDir, "report.md"), md);
}

function writeIndex(): void {
  const lines = [
    "# Wallet fidelity report",
    "",
    `Generated ${new Date().toISOString()}`,
    "",
    "| Style | Preview | Wallet | Diff report |",
    "|---|---|---|---|",
    ...STYLES.map(({ key }) => {
      const face = SHOW_BACK ? "back" : "front";
      return `| \`${key}\` | [preview](${key}/preview-${face}.png) | [wallet](${key}/wallet-${face}.png) | [report.md](${key}/report.md) |`;
    }),
    "",
    "Regenerate with `npm run fidelity`. To compare back faces, `FIDELITY_BACK=1 npm run fidelity`.",
  ];
  writeFileSync(join(OUT_ROOT, "index.md"), lines.join("\n"));
}

function relativeFromDir(from: string, to: string): string {
  const prefix = from.endsWith("/") ? from : `${from}/`;
  return to.startsWith(prefix) ? to.slice(prefix.length) : to;
}

function exec(
  bin: string,
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error(`${bin} timed out after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs)
      : null;
    child.on("exit", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${bin} exit ${code}: ${stderr.trim() || stdout.trim()}`));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Import-dynamic requires the TS path alias to resolve under tsx.
void resolve;

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
