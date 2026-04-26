# Apple Wallet Pass Editor + Generator — Tasks

Full design document: `.claude/plans/dapper-weaving-eich.md` (local, gitignored).

**Goal for v0.1.0 (MIT-licensed)**: open-source editor + generator producing Apple-verified `.pkpass` files for all 5 classic styles (boardingPass, coupon, eventTicket, generic, storeCard) with QR/PDF417/Aztec/Code128 barcodes and full @1x/@2x/@3x + `~dark` image asset matrix. Preview in editor must match downloaded pass 1:1. Self-hosted Wallet web service and personalization are explicitly out of scope for v0.1.0.

---

## Phase 0 — Foundations ✅

- [x] `npm install` (nothing else runs without it)
- [x] Read Next 16 docs under `node_modules/next/dist/docs/` — Route Handlers, runtime, caching, client/server, metadata, `serverExternalPackages`. Deltas captured in `tasks/lessons.md`.
- [x] Runtime deps: `zod` (v4), `node-forge`, `fflate`, `bwip-js`, `react-hook-form`, `@hookform/resolvers`, `server-only`, `@peculiar/x509`, `react-colorful`
- [x] Dev deps: `@types/node-forge`, `vitest` (v4), `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`, `tsx` (Playwright deferred — not needed for unit tests)
- [x] `LICENSE` (MIT, 2026 Arjun Lohan)
- [x] `.env.example`
- [x] `.gitignore` — added `/tests/fixtures/certs/`
- [x] `tasks/todo.md` + `tasks/lessons.md` seeded
- [x] `next.config.ts` — `serverExternalPackages: ['node-forge']`
- [x] `vitest.config.ts` + `tests/setup.ts`
- [x] `package.json` scripts: `test`, `test:watch`, `verify-pkpass`

## Phase 1 — Pass spec (types + Zod schemas + constants) ✅

- [x] `lib/pass-spec/constants.ts`
- [x] `lib/pass-spec/types.ts` (incl. branded `ValidatedPassDefinition`)
- [x] `lib/pass-spec/color.ts` (hex ↔ rgb helpers)
- [x] `lib/pass-spec/errors.ts` (`formatZodError`, `PassSpecError`)
- [x] `lib/pass-spec/schemas/common.ts`
- [x] `lib/pass-spec/schemas/style-block.ts` (shared section builder)
- [x] `lib/pass-spec/schemas/generic.ts` / `storeCard.ts` / `coupon.ts` / `eventTicket.ts` / `boardingPass.ts`
- [x] `lib/pass-spec/schemas/index.ts` (`PassDefinitionSchema` discriminated union)
- [x] `lib/pass-spec/index.ts` (public barrel)
- [x] Fixtures: one per style under `tests/fixtures/passes/`
- [x] Tests: `tests/pass-spec/schemas.spec.ts` — 18 passing (5 valid + 13 invalid)

## Phase 2 — Layout engine (fidelity anchor) ✅

- [x] `lib/pass-layout/layoutTypes.ts`
- [x] `lib/pass-layout/formatters/date.ts`, `number.ts`, `attributed.ts`
- [x] `lib/pass-layout/textAlignment.ts`
- [x] `lib/pass-layout/resolveField.ts` (shared per-field resolver)
- [x] `lib/pass-layout/images.ts` (slot-group resolver per style)
- [x] `lib/pass-layout/styles/{generic,storeCard,coupon,eventTicket,boardingPass}.ts` + `shared.ts`
- [x] `lib/pass-layout/buildLayout.ts` (the ONE place layout decisions live)
- [x] `lib/pass-layout/index.ts` (public barrel)
- [x] `tests/pass-layout/buildLayout.spec.ts` — 12 passing (ordering, formatters, attributed sanitization, idempotency)

## Phase 3 — Preview (React) ✅

- [x] `lib/pass-preview/css/preview.module.css` (CSS modules for isolation)
- [x] `lib/pass-preview/assets.ts` (bytes → data URL + variant picker with dark-mode preference)
- [x] `lib/pass-preview/renderers/FieldRow.tsx` / `BarcodeBlock.tsx` / `FrontFace.tsx` / `BackFace.tsx`
- [x] `lib/pass-preview/useFlip.ts`
- [x] `lib/pass-preview/PassPreview.tsx`
- [x] `lib/pass-preview/index.ts`
- [x] `tests/pass-preview/fidelity.spec.tsx` — 13 tests, every field from layout tree surfaces in DOM per style

## Phase 4 — Generator (server-only) ✅

- [x] `lib/pass-generator/images/validate.ts` (PNG magic + IHDR; per-slot dimension rules)
- [x] `lib/pass-generator/images/normalize.ts` (Apple filename assembly)
- [x] `lib/pass-generator/serialize.ts` (deterministic key order)
- [x] `lib/pass-generator/manifest.ts` (SHA-1 per file; POSIX path assertion)
- [x] `lib/pass-generator/types.ts`
- [x] `lib/pass-generator/signer/load.ts` (env → cert chain + decrypted key, module-scoped cache)
- [x] `lib/pass-generator/sign.ts` (PKCS#7 detached CMS via node-forge; SHA-256 inside CMS, SHA-1 in manifest)
- [x] `lib/pass-generator/zip.ts` (fflate, POSIX paths, fixed mtime 1980-01-01 — DOS epoch)
- [x] `lib/pass-generator/index.ts` (`generatePkpass`)
- [x] `import 'server-only'` at top of every generator module
- [x] Tests all green (42/42):
  - [x] `manifest.spec.ts` — deterministic, SHA-1 hex, POSIX path guards
  - [x] `sign.spec.ts` — detached CMS round-trip, both certs embedded
  - [x] `e2e.spec.ts` — all 5 styles → unzip → manifest re-verify → signature re-verify → schema re-parse
- [ ] `lib/shared/env.ts` (typed env accessor) — deferred to Phase 5 API route
- [ ] Real-cert integration test — deferred: requires user to provide `.env.local` (my attempted write corrupted the WWDR base64)

## Phase 5 — API route + editor UI ✅

- [x] `lib/shared/env.ts` — Zod-validated env accessor
- [x] `app/api/passes/generate/route.ts` — `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, returns `application/vnd.apple.pkpass`
- [x] Editor components: `StylePicker`, `TopLevelFields`, `ColorField` (react-colorful), `FieldSectionEditor` (RHF `useFieldArray` with per-style caps), `BarcodeEditor`, `ImageSlotUploader` (PNG validation shared with server), `PreviewPanel` (live `<PassPreview/>`), `DownloadButton` (fetch → blob → download), `EditorShell`
- [x] `app/editor/editor.css` — scoped editor styling
- [x] `app/editor/page.tsx`
- [x] `app/page.tsx` — landing with `/editor` CTA
- [x] `app/layout.tsx` — metadata updated
- [x] **Next.js production build clean** (3 static routes + 1 dynamic API route; Turbopack, no warnings)
- [x] **Dev server smoke test**: `/` 200, `/editor` 200, `POST /api/passes/generate` with invalid body → 400 with `{path,message}` issues

## Phase 6 — Verification + v0.1.0 ✅ (structural; manual sign-off pending)

- [x] `scripts/verify-pkpass.ts` — CLI: unzip + re-verify manifest SHA-1 + CMS + schema
- [x] `scripts/emit-sample-pkpass.ts` — generates a sample .pkpass with a throwaway signer for smoke tests
- [x] Both scripts run via `tsx --conditions=react-server` so `server-only` imports resolve to the empty marker
- [x] End-to-end proof: `npm run emit-sample-pkpass -- /tmp/s.pkpass && npm run verify-pkpass -- /tmp/s.pkpass` → all 12 checks PASS
- [x] `README.md` for forks / users with public-API snippets
- [x] Final: 55/55 tests green, `tsc --noEmit` clean, `next build` clean

**Deferred to user (gated on physical device):**
- [ ] Fill `.env.local` with real Apple creds and generate a pass via the running editor
- [ ] AirDrop one generated pass per style to iPhone; opens in Wallet with no warning banner
- [ ] Side-by-side screenshot vs editor preview, visual diff < 0.5%
- [ ] Barcode scan check per format (QR, PDF417, Aztec, Code128)
- [ ] Tag `v0.1.0`

---

## Review (post-implementation summary)

**Shipped (v0.1.0-rc)**:
- All 5 classic pass styles with per-style field caps and validations
- `z.discriminatedUnion` boundary; 18 schema tests (5 valid fixtures, 13 invalid cases)
- Pure layout engine with style-dispatched `buildLayout` → `LayoutTree`
- `Intl.DateTimeFormat` + `Intl.NumberFormat` formatters keyed to Apple's enums
- Safe `<a href>` sanitizer with URL-scheme safelist
- Per-style image-slot groups (`strip` vs `background+thumbnail` for eventTicket, etc.)
- React preview: live flip, pixel-accurate Wallet styling via CSS modules, bwip-js barcode
- Server-only generator: deterministic key order, SHA-1 manifest, PKCS#7 detached CMS via node-forge, fflate ZIP at fixed mtime
- Next 16 API route (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`)
- Editor UI: style picker, top-level fields, hex color pickers → rgb() at boundary, RHF field-section arrays with caps, PNG-validated image uploader, barcode editor, download button
- `verify-pkpass` CLI proves round-trip structural integrity

**Surprises / deviations**:
- Zod v4 (not v3) — API mostly identical; `z.input/z.output` + brand types used
- `server-only` is tricky under non-Next runtimes — alias in vitest.config.ts, `--conditions=react-server` for tsx scripts
- `fflate` rejects `mtime: 0` (pre-1980 DOS epoch); use 1980-01-01
- fflate does NOT export `crc32`; roll your own for test PNG helpers

**Backlog for post-v0.1.0 milestones**: self-hosted web service (register/unregister/update/APNs), personalization flow, localization (`.lproj` + `pass.strings`), NFC runtime, other semantic-tags-driven layouts (airline boarding semantics, more).

## Fidelity harness notes (2026-04-25)

First harness run against real signer credentials produced preview + wallet screenshots at `/tmp/wallet-fidelity/` for all 5 classic styles (poster event ticket isn't renderable by macOS Pass Viewer — iOS 26 only). Surfaced the following real fidelity gaps that drive subsequent preview-CSS iterations:

- Boarding pass: Wallet renders a plane icon between origin/destination `primaryFields`; preview has none. Wallet places `PASSENGER` as an auxiliary next to `FLIGHT`/`SEAT`/`GROUP`; preview stacks it on its own row.
- Boarding pass QR canvas was blank on first capture — bwip-js lazy import still races Playwright's `networkidle`; `waitForFunction` over `canvas.width > 0` isn't reliable. Try an explicit `domcontentloaded` + wait for the bwip-js script URL in the network log, or render barcodes synchronously.
- All styles: Preview lacks the "Add to Wallet" footer + ellipsis context menu icons Wallet shows (harmless — those are OS chrome, not pass chrome).

These aren't blockers for the harness itself — they're the iteration targets the harness was built to find.

## Harness quirks worth remembering

- Pass Viewer window title is the pass's `organizationName`, not the style. Gate window-capture polling on that title or you capture stale windows.
- `osascript` `&` concatenation on integer lists produces garbage (`491, ,, 202, ,, 350, ,, 525`). Use `AppleScript's text item delimiters` + `as text` to get `x,y,w,h`.
- After `tell … to quit`, Launch Services returns `-600 (procNotFound)` for ~250 ms. Retry `open -a` with a short backoff.
- macOS Pass Viewer's `screencapture -R` requires Screen Recording permission; `-l <window-id>` silently fails with the same message if permission is missing.

## Poster event ticket (iOS 26+) — shipped

- Spec: added `preferredStyleSchemes`, `suppressHeaderDarkening`, and poster-only auxiliary URL keys to `BasePassDefinition`. `eventTicketDefinition` now runs a superRefinement that enforces every required semantic tag (`eventName`, `venueName`, `venueRegionName`, `venueRoom`) plus per-event-type extras (sports → team abbreviations; live performance → `performerNames`).
- Layout: `LayoutPoster` resolved from `semantics` when the first preferred scheme is `posterEventTicket`. Classic sections still build for the pre-iOS-26 fallback.
- Preview: new `PosterFrontFace` (full-bleed, title block, gradient overlay) and `PosterBackFace` (barcode at top + classic back fields). `PassPreview` dispatches on `tree.poster`.
- Editor: `PosterEventTicketEditor` appears only when style is `eventTicket`. Toggle, required semantic inputs, conditional sports/performer fields, suppress-darkening checkbox. `buildDefinitionFromForm` only emits `preferredStyleSchemes` once every required tag is filled — so the live preview keeps rendering the classic layout while the user types.
- Generator: canonical key order in `serialize.ts` extended; `preferredStyleSchemes` + `suppressHeaderDarkening` + poster URLs all survive round-trip.
- Fixture: `tests/fixtures/passes/posterEventTicket.json` (live performance). 72 tests green (was 55).

Gotchas:
- Apple docs gate the **rendering** on iOS 26 (not iOS 18 as the task name implied). `additionalInfoFields` itself is iOS 18.0+, but the full poster UI only kicks in on iOS 26.
- A `posterEventTicket` scheme without a trailing `eventTicket` fallback is rejected — pre-iOS 26 devices need the classic layout to render.
- Toggle-on in the editor must NOT emit the scheme until required semantics are set; otherwise the live preview pipeline throws ZodError on every keystroke.

## Relevance (locations + relevantDates) — shipped

- Spec already accepted both keys via `baseDefinition` (`location` + `relevantDates` schemas, incl. the `endDate required when startDate set` refinement). No schema changes; added 7 explicit tests for lat/long bounds, the 10-location cap, and the `date` OR `startDate`/`endDate` pair semantics.
- Editor: `RelevanceEditor.tsx` with RHF `useFieldArray` for both collections. Location rows take lat/lon/alt/relevantText; date rows take either `date` OR a `startDate`/`endDate` pair. Cap of 10 locations (Apple's limit); soft cap of 20 date rows.
- `buildDefinitionFromForm` parses lat/lon/alt strings into numbers and drops any row that's missing a required field — so the preview stays valid while the user is typing a coordinate. Tested in `tests/editor/buildDefinition.relevance.spec.ts` (4 tests).
- 83 tests green (was 72).

---

## Review (fill in as work proceeds)

- [ ] Summary of each phase completion
- [ ] Surprises / deviations from plan
- [ ] Post-v0.1.0 backlog (web service, personalization, iOS 18 poster, localization, NFC runtime, semantics, relevance)
