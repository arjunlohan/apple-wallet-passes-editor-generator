# Lessons

Append after any user correction OR any Apple/pkpass surprise discovered during implementation. Each entry: the rule + why it exists (so we can judge edge cases later).

---

## Apple Wallet Pass format — seeded from spec research (before we write code)

- **Manifest uses SHA-1, not SHA-256.** The pkpass format predates modern hashing. Using SHA-256 in `manifest.json` silently invalidates the signature. (SHA-256 IS used *inside* the CMS signer attributes — two different hashes in two different layers.)
- **The signature signs `manifest.json` ONLY**, not the ZIP, not every file. Every other file is protected transitively by its SHA-1 entry in the manifest. `pass.json` is not signed directly.
- **Detached CMS**: `forge.pkcs7.createSignedData().sign({ detached: true })`. Including the content silently passes some validators and fails on-device in Wallet.
- **Manifest paths use forward slashes on every OS.** `logo@2x.png`, `en.lproj/pass.strings`. Never `path.sep`, never backslashes. Centralize with `assertPosixPath()` in `lib/pass-generator/zip.ts`.
- **PNG only** for all pass images. Validate magic bytes (`89 50 4E 47 0D 0A 1A 0A`) server-side AND client-side for instant feedback.
- **`strip` vs `background` vs `thumbnail`** are mutually exclusive in certain style layouts. Enforce with Zod `superRefine` per style.
- **`transitType` required on boardingPass**, enum `PKTransitType{Air,Boat,Bus,Generic,Train}`. A freeform string silently renders wrong.
- **Legacy `barcode` singular deprecated** in iOS 9+. Emit only the `barcodes` array.
- **`attributedValue` accepts only `<a href="...">`** — and only schemes `https:`, `http:`, `mailto:`, `tel:`. Sanitize.
- **`changeMessage` must contain exactly one `%@`** placeholder or Wallet drops the update notification silently.
- **Colors MUST be `rgb(r, g, b)`**. `rgba()`, hex, and CSS color names fail silently (render as black/white).
- **Time zones**: `ignoresTimeZone: true` means Wallet treats the ISO timestamp as device-local regardless of offset. Test on a device in a different TZ.
- **`relevantDate` (singular) deprecated** in favor of `relevantDates` array. `endDate` required if `startDate` present (iOS 18+ rule).
- **`authenticationToken`** — Apple requires ≥16 chars; we enforce ≥32 for safety.
- **`userInfo` size limit is 4096 bytes of serialized JSON**, not character count.
- **NFC `encryptionPublicKey`** is base64 DER of a SubjectPublicKeyInfo for ECDH on `prime256v1` (P-256). Raw public key bytes are wrong.
- **APNs topic for Wallet updates MUST be the `passTypeIdentifier`** (e.g., `pass.example.demo`), not your app bundle ID. Empty payload `{}`.
- **`expirationDate` past** → pass shown greyed out. `voided: true` → greyed out immediately. They are not interchangeable.
- **`pass.strings`** localization files with non-ASCII must be UTF-16 with BOM. Node's default UTF-8 write produces garbage.
- **`.lproj` folder naming**: `en.lproj`, `zh-Hans.lproj`. Case-sensitive on iOS; hyphens, not underscores.

## Next.js 16 / this repo

- **This is NOT the Next.js you know** (per `AGENTS.md`). Read `node_modules/next/dist/docs/` before writing any Next code. Route Handler APIs, `runtime` declarations, and caching semantics changed vs 14/15.
- Declare `export const runtime = 'nodejs'` on any route that imports the generator / signer — Edge runtime can't run `node-forge`'s crypto paths.
- Serverless body-response limits (~4.5 MB on Vercel Hobby). Dense passes with @3x dark backgrounds approach this — add a preflight size check before download.
- Cold-start private-key decryption is expensive; cache the decrypted `forge.pki.PrivateKey` at module scope.

### Next 16 deltas captured from local docs (15-route-handlers.md, version-16.md, package-bundling.md, environment-variables.md)

- **Route Handler `params` is now a `Promise`** and must be `await`-ed: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`. New in v15, still true in v16. For our POST we have no params, so no impact — but all future parameterized routes MUST await.
- **GET is NOT cached by default** in v15+ (changed from v14). For our POST this is moot (POST never cached), but worth knowing for any GET read endpoints we add later.
- **`serverExternalPackages` is now top-level** in `next.config.ts`, NOT under `experimental.serverComponentsExternalPackages` (that key is deprecated). Example: `{ serverExternalPackages: ['node-forge'] }`.
- **Use native `Response` for binary**, not `NextResponse`. `return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/vnd.apple.pkpass', 'Content-Disposition': 'attachment; filename="..."' } })`.
- **`export const dynamic = 'force-dynamic'`** + **`export const runtime = 'nodejs'`** on the generate route. `dynamic = 'force-dynamic'` makes it explicit even though POST defaults to uncached.
- **Turbopack is the default bundler** in Next 16. `next dev` / `next build` use it automatically — no `--turbopack` flag needed. Custom webpack configs now need `--webpack` to opt out (we don't have a custom webpack config, so no change needed).
- **React 19.2 canary** is built into the App Router. Pages Router uses the installed React version. We're on App Router only.
- **`import 'server-only'`** is still the recommended guard. When a client bundle accidentally imports a server-only module, the build fails at import time with a clear error.
- **`'use client'`** still required at the top of any component using hooks / event handlers. Route Handlers are always server; no directive needed.
- **Secrets**: `.env.local` is gitignored (it already is via `.env*` in this repo); accessed via `process.env.*` in Route Handlers. Only `NEXT_PUBLIC_*` vars are inlined to the client bundle. For build-time-vs-runtime evaluation, `connection()` from `next/server` defers evaluation to request time — not needed for our use because our route is `force-dynamic`.
- **Turbopack caveat**: if we ever need custom module resolution or loader, read the Turbopack API reference (`03-api-reference/08-turbopack.md`) first.

## Process

- `npm install` is step one. This repo has NO `node_modules/` yet; no tool run, no code written will succeed without it.
- `tasks/todo.md` is the living checklist. Tick items as they land. Add a **Review** section entries at the end of each phase.
- Append to this file on every correction from the user or any Apple/pkpass gotcha discovered in practice — with the rule AND the reason so edge cases can be judged later.
- **Never write real credentials via the Write tool.** Long base64 strings can get mangled — on 2026-04-25 I wrote a 2 KB Apple WWDR base64 and the tool substituted 5 Cyrillic characters into it, silently corrupting the secret. If secrets need to land on disk, ask the user to paste them themselves (e.g., via `cat > .env.local`) or write them via a Bash heredoc from a known source — don't use Write for any blob over a few hundred bytes of base64/hex/PEM.
- **fflate requires mtime ≥ 1980-01-01** (DOS epoch floor). `mtime: 0` (Unix epoch = 1970) throws "date not in range 1980-2099". Use `new Date(1980, 0, 1)` for deterministic ZIPs.
- **fflate does NOT export `crc32`.** It's not in the public API. Roll your own CRC32 (256-entry table + 5-line loop) when you need it for PNG chunks in tests.
- **`server-only` throws under vitest** because the package is keyed to the React server-component resolver. Alias it to `node_modules/server-only/empty.js` in `vitest.config.ts` so test suites can import server modules.
- **`.env` parsers: allow digits in key names.** The obvious `/^([A-Z_]+)=(.*)$/` regex silently skips `APPLE_WWDR_CERT_BASE64` because `_` + `BASE` matches but the `64` is not in the character class. Use `[A-Z0-9_]+`. Happened 2026-04-25 when the smoke-signer script reported "missing env var" even though `.env.local` was populated correctly. Next loads `.env.local` itself, so this bit only standalone scripts.

- **Editor default form values must reflect live credentials, not placeholders.** On 2026-04-25 a user signed passes using the `pass.example.demo` / `ABCDE12345` defaults — Apple's Wallet silently rejected them (Team ID on signer cert ≠ `teamIdentifier` in pass.json). Fix: read real identifiers from env in the server component (`app/editor/page.tsx`) and thread them into the client form's `defaultValues`. Generally: whenever a form has a default that's meant to be replaced by a real value, it should either be empty OR sourced from the real config, never a placeholder string that will pass schema validation.

- **Apple Wallet requires `icon.png` + `icon@2x.png` + `icon@3x.png`.** A pass with only `manifest.json`, `pass.json`, and `signature` fails Apple's structural check with `Pass does not contain icon.png/icon@2x.png/icon@3x.png`. The editor must block download until those assets are present, and the API route must reject requests missing them (400 with issue list). Don't rely on Apple's runtime validator — fail loudly at the editor's seam so the user knows immediately.

- **`/usr/bin/log show --predicate ...` is the right command to debug Wallet failures on macOS.** `log show` aliases to something else in some shells. Run `/usr/bin/log show --last 10m --predicate 'subsystem == "com.apple.passkit"'` to see `passd` and `Pass Viewer` diagnostics — they print exact error strings like "Invalid data error reading pass X. Pass does not contain icon.png...".

- **Poster event ticket is iOS 26, not iOS 18.** The local docs (and common blog posts) conflate two features: `additionalInfoFields` is iOS 18.0+/iPadOS 18.0+/watchOS 11.0+, but the full poster layout rendering (`preferredStyleSchemes: ["posterEventTicket", "eventTicket"]`) only activates on iOS 26/watchOS 26. Trust `developer.apple.com_documentation_walletpasses_creating-an-event-pass-using-semantic-tags.json`: the exact sentence is "In iOS 26 and later and watchOS 26 and later you can provide an engaging event ticket experience by creating a poster event tickets using semantic tags." On pre-iOS-26 devices the pass falls back to the classic event layout if `eventTicket` is in the preferred-schemes array.

- **Poster schemes MUST include `eventTicket` as the trailing fallback**, otherwise Wallet rejects the whole scheme list and refuses to honor either. Apple confirms this in the same doc: "Always provide `eventTicket` as the last entry so pre-iOS-26 devices render the pass." Our schema encodes this as a superRefinement on `eventTicketDefinition`.

- **Poster-mode live preview guard**: turning on a "use poster layout" toggle in the editor form cannot immediately emit `preferredStyleSchemes` — if the user hasn't yet filled in `eventName`/`venueName`/etc., the schema rejects the whole pass and the live preview blows up on every keystroke. Only write the scheme into the definition once all required semantics are populated (`isPosterReady()` gate in `buildDefinition.ts`). Otherwise the editor feels broken even though the feature works end-to-end.

- **macOS Pass Viewer window title is the pass's `organizationName`**, not the style. When automating Pass Viewer for the fidelity harness, gate screenshot timing on that title via `osascript` — otherwise you capture the PREVIOUS iteration's still-visible window. Discovered 2026-04-25 when boardingPass/wallet-front.png kept capturing the last-iteration's storeCard even after `tell application "Pass Viewer" to quit`.

- **`osascript`'s `&` operator on integer lists produces garbage**. Returning `(item 1 of p) & "," & (item 2 of p)` gave `491, ,, 202, ,, 350, ,, 525` — commas and spaces interleaved. Correct pattern: set `AppleScript's text item delimiters to ","` and cast lists `as text`. Lesson: for any multi-integer AppleScript extraction, use delimiters + `as text`, never manual `&` concatenation.

- **Launch Services returns error -600 (procNotFound) for ~250 ms after `tell app to quit`.** `open -a "Pass Viewer" path.pkpass` fails during that window. Retry with a 500 ms backoff OR wait until `pgrep -x "Pass Viewer"` returns no match AND sleep 250 ms before the next `open`. Captured 2026-04-25 in the fidelity harness.

- **macOS `screencapture` permission failures all emit the same message ("could not create image from window/rect")** regardless of whether you're using `-l <window-id>` or `-R x,y,w,h`. Grant Screen Recording permission to the terminal via System Settings → Privacy & Security; `tccutil reset ScreenCapture` resets it if you need to re-prompt. Without permission, region captures still write a non-empty PNG of just the desktop wallpaper, which is worse than a loud failure.

- **Playwright can't hydrate against a Next 16 dev server** — Turbopack's HMR WebSocket (`/_next/webpack-hmr`) fails with `net::ERR_INVALID_HTTP_RESPONSE`, which blocks React hydration; `useEffect`s in `"use client"` components never fire. The fidelity harness got blank QR canvases for ~an hour before we realized the client never hydrated. Fix: harness runs `next build` + `next start` on its own port (`31415`) instead of piggybacking the user's `npm run dev`. Keep `FIDELITY_DEV_URL` as an escape hatch if someone already has a prod server running.

- **Barcode readiness needs an explicit signal, not a pixel poll.** `canvas.width > 0` is set by bwip-js before pixels commit, so the "width > 0" gate passes too early. `getImageData` alpha sampling sounds like the right answer but sometimes reports non-zero on the canvas's initial transparent clear. The reliable gate is: `BarcodeBlock` sets `canvas.dataset.barcodeReady = "1"` on draw success (and `barcodeError` on throw), and the harness waits on those data attributes. Discovered 2026-04-26 iterating the fidelity harness.

- **`eventStartDateInfo` / `eventEndDateInfo` are `SemanticTagType.EventDateInfo` dictionaries, not strings.** Apple's saved doc calls it "event info dictionary" with shape `{ date: ISO8601, timeZone?: string, ignoreTimeComponents?: boolean, unannounced?: boolean, undetermined?: boolean }`. Passing a free-form caption like `"Doors 7:00 PM"` lets the pass through Zod's old loose `semantics: z.record(z.unknown())` but Wallet silently rejects install with `Invalid data error reading pass ... Value "Doors 7:00 PM" for semantic key "eventStartDateInfo" is not a dictionary, must be a event info dictionary`. Fix: (a) tighten the schema to `looseObject({ eventStartDateInfo: EventDateInfo.optional(), ... })` so the error surfaces at parse time, not at install time; (b) if you need "Doors open" caption text, use `additionalInfoFields` on the back — there is NO caption field on the poster layout. Discovered 2026-04-26 debugging a poster pass that wouldn't install on iOS 26.

- **iOS 26 poster scheme requires either `artwork.png` or `background.png`** (each with @2x/@3x). Pass Viewer's exact error: `Failed to validate "posterEventTicket" scheme for pass: Pass does not contain artwork.png/artwork@2x.png/artwork@3x.png or background.png/background@2x.png/background@3x.png.` Without one of those two asset groups, Wallet falls back to the classic `eventTicket` scheme even when `preferredStyleSchemes: ["posterEventTicket", "eventTicket"]` is set. So: a poster-mode pass that ships without a hero image opens but doesn't render as a poster — the fallback is silent on Mac but behaves the same on iOS 26. Our `background` slot already covers this; editor should warn when poster is enabled but `background` is empty. Discovered 2026-04-26.

- **Don't pair `{...register(name)}` with your own `onChange` on a radio group that calls `reset()` from that handler.** RHF (v7) registers the radio's ref AND an onChange; spreading it then overriding the onChange means RHF's internal change propagation races against our reset. On most transitions it works, but generic → storeCard reliably produced one render with `style= null` before settling, crashing every downstream `FIELD_CAPS[style]` lookup. Fix: if the radio drives a full-template swap via `reset()`, do NOT register it — own the `checked` / `onChange` manually (use a distinct `name` so RHF doesn't grab it), and treat `style` as a plain field that `reset(template)` sets to the right value. Discovered 2026-04-26 when a user hit "Cannot read properties of undefined (reading 'headerFields')" switching to Store card. Defense-in-depth: also made `FIELD_CAPS[style]` lookups tolerate an unknown style (return null cap → render nothing) so any future transient `style= null` renders don't whitescreen.

- **node-forge `util.binary.raw.encode` is `String.fromCharCode.apply(null, bytes)` — overflows V8's argument stack for any buffer larger than ~65K bytes.** Our `sha1Hex` in `lib/pass-generator/manifest.ts` used to call it; the generator worked with tiny test fixtures (icon PNGs <3KB) but threw `Maximum call stack size exceeded` the instant a user uploaded a real-sized background image (e.g. a 58×58 source upscaled to 540×660 → ~1MB PNG bytes). The stack trace was `sha1Hex → util.binary.raw.encode` inside node-forge. Fix: use Node's built-in `crypto.createHash("sha1").update(bytes)` — it accepts Uint8Array directly without the `apply`-spread pattern. Lesson applies anywhere else we touch big buffers: never use `String.fromCharCode.apply(null, bigArray)` or `forge.util.binary.raw.encode(bigBytes)`; chunk at ≤0x8000 or use a native API. Discovered 2026-04-26 when a user clicked Download and got "Maximum call stack size exceeded" as the error banner.

- **Poster event tickets ALSO require `nfc` / VAS information — barcode-based entry is not allowed.** Apple's doc is explicit: "Poster event tickets aren't compatible with tickets that require a QR code or barcode for entry." After supplying the background image we hit the next Pass Viewer error: `Failed to validate "posterEventTicket" scheme for pass: Pass does not contain VAS information.` VAS = Value Added Services protocol; Wallet reads it from the pass's `nfc` dictionary (`message` + `encryptionPublicKey` = base64 X.509 SPKI of an ECDH P-256 public key). **Adding NFC to a pass requires a special entitlement from Apple** — most developers don't have it. Practical consequence: an out-of-the-box open-source generator can ship the poster JSON + assets, but the *actual poster rendering* on iOS 26 will not activate without an NFC entitlement. Without entitlement the pass still installs and renders as classic `eventTicket` (the fallback scheme). Editor/docs must be explicit about this — don't pretend poster works end-to-end without NFC. Discovered 2026-04-26.
