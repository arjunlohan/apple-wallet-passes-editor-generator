# Apple Wallet Pass Editor & Generator

Open-source, ground-up editor and generator for Apple Wallet `.pkpass` files. What you see in the live preview matches the signed pass Apple Wallet opens — pixel-for-pixel, field-for-field.

MIT licensed. Designed to be forked and embedded in other apps: the spec, layout engine, preview, and generator are separate importable modules with a stable public API.

## Status

**v0.1.0** ships all five classic pass styles — `boardingPass`, `coupon`, `eventTicket`, `generic`, `storeCard` — with the full barcode set (QR, PDF417, Aztec, Code128) and the complete image asset matrix (1x / 2x / 3x + `~dark` variants). The editor surfaces lock-screen relevance (locations + relevant dates) and the iOS 26 poster event ticket as opt-in controls.

The editor UI uses shadcn/ui on Tailwind v4: a 5-card template gallery at the top, per-style drafts that survive template swaps, an accordion for `Identity · Content · Media · Barcode · Advanced`, inline Zod validation with a sticky issue tray, and a single-drop image uploader that auto-generates @1x/@2x/@3x with an optional dark-mode variant.

Out of scope for v0.1.0 (tracked in `tasks/todo.md` for later milestones):
- Self-hosted Wallet web service (register/unregister/update endpoints, APNs push).
- Personalization token exchange.
- Localization (`.lproj`).

Library-complete / editor does not expose yet:
- **iOS 26 poster event ticket.** The schema, layout, and generator fully support it — library consumers can build a poster pass by passing `preferredStyleSchemes: ["posterEventTicket", "eventTicket"]` + semantic tags + an `nfc` block. The editor collects the semantic tags so the pass.json round-trips cleanly, but intentionally does NOT emit `preferredStyleSchemes` because it can't populate an `nfc` block — Apple would ignore the scheme without NFC and fall back to the classic layout. The editor preview matches what Apple Wallet will actually render: classic.
- **NFC.** Schema accepts and signs an `nfc` dictionary; the editor does not expose a form for it. Adding NFC support is gated on having [Apple's NFC Pass entitlement](https://developer.apple.com/contact/request/wallet-nfc).

## Architecture

One validated definition → one layout tree → two adapters (preview + generator). Neither adapter makes layout decisions independently, so the fidelity invariant is structural, not aspirational.

```
lib/pass-spec     → PassDefinition types + Zod schemas (single validation boundary)
lib/pass-layout   → buildLayout() produces LayoutTree (style-dispatched, pure)
lib/pass-preview  → React renderer, consumes LayoutTree
lib/pass-generator → server-only: serialize + manifest (SHA-1) + CMS sign + fflate ZIP
```

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in your Apple Pass Type ID credentials in .env.local

npm run dev          # editor at http://localhost:3000/editor
npm test             # 89 tests across spec, layout, preview, generator
npm run build        # Next.js production build
```

## Using the library in a fork

```ts
// Validation — browser or server:
import { PassDefinitionSchema } from "./lib/pass-spec";
const parsed = PassDefinitionSchema.parse(myDefinition);

// Preview — browser only:
import { PassPreview } from "./lib/pass-preview";
<PassPreview definition={parsed} assets={myAssets} />

// Generator — server only (will refuse to bundle into a client component):
import { generatePkpass, getSigner } from "./lib/pass-generator";
const { bytes } = generatePkpass({ definition: parsed, assets: myAssets, signer: getSigner() });
```

## Verifying a generated pass

```bash
npm run verify-pkpass -- path/to/your.pkpass
```

Checks ZIP contents, re-computes every manifest SHA-1, verifies the PKCS#7 detached CMS signature embeds the signer + WWDR intermediate, and re-parses `pass.json` through the schema. Run against any `.pkpass` from any source.

## Requirements

- Node.js 20+
- An Apple Developer account with a Pass Type ID registered at [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list/passTypeId). The `.env.example` file lists every required variable.

## License

MIT — see [`LICENSE`](./LICENSE).
