# Integrating this editor into another project

This file is for **consumer projects** that want to embed the editor, preview,
layout, generator, or spec in their own Next.js / React app. If you're working
_inside_ this repo as a maintainer, read `CLAUDE.md` instead — this guide is
deliberately narrower.

> **If you are a Claude Code agent in a different project pointed at this
> public repo**: read this file top-to-bottom before copying anything. Do
> _not_ follow the workflow in `tasks/todo.md` — that's the maintainer's
> backlog. Your job is to lift pieces out, not to edit this repo.

## TL;DR — the shape of the library

Four library modules + one editor tree. No npm package (yet); consumer
projects copy the directories they need and wire them up. The public types
are stable; the internals are not.

```
lib/pass-spec        Zod schemas + PassDefinition types. Browser-safe.
lib/pass-layout      buildLayout() → LayoutTree. Isomorphic, pure.
lib/pass-preview     React renderer. Client-only.
lib/pass-generator   server-only: serialize + manifest + sign + ZIP.
app/editor/_components
                     The shadcn/ui editor. Client-only. Framework-agnostic
                     after you inject `onGenerate`.
app/api/passes/generate/route.ts
                     Reference backend. Copy verbatim as a starting point.
```

## Decide what you need

Pick the smallest scope that solves your problem:

| Goal | Copy |
|---|---|
| Validate a pass JSON server-side | `lib/pass-spec` |
| Render a read-only preview of an existing pass | `lib/pass-spec` + `lib/pass-layout` + `lib/pass-preview` |
| Generate a signed `.pkpass` from your own backend | `lib/pass-spec` + `lib/pass-layout` + `lib/pass-generator` |
| Embed the full editor UI | everything, plus `components/ui/*` + Tailwind v4 + `@base-ui/react` |

## Public contracts you can rely on

These are the types + functions you should import in your own code. Paths
assume you've preserved the `lib/` layout — rewrite to match your tree.

```ts
// lib/pass-spec
import {
  PassDefinitionSchema,    // Zod schema, .safeParse() the whole pass.json
  formatZodError,          // Zod issues → { path, message }[]
} from "@/lib/pass-spec";
import type {
  PassDefinition,          // canonical shape of pass.json
  PassAssets,               // { icon?: { "1x"?: Uint8Array; ... }; ... }
  PassStyle,                // "boardingPass" | "coupon" | ...
  ImageSlot, ImageVariants,
  PassValidationIssue,      // { path, message } — shared on-wire shape
} from "@/lib/pass-spec";

// lib/pass-layout
import { buildLayout, resolvePoster } from "@/lib/pass-layout";
import type { LayoutTree } from "@/lib/pass-layout";

// lib/pass-preview  — client only
import { PassPreview } from "@/lib/pass-preview";
// <PassPreview definition={def} assets={assets} face="front" />

// lib/pass-generator  — server only (imports "server-only")
import {
  generatePkpass,           // { definition, assets, signer } → { bytes, baseName }
  getSigner,                // reads APPLE_* env vars, caches
  loadSignerFromEnv,        // same but no caching
  verifyPkpassBytes,        // round-trip a .pkpass through the schema + CMS verify
} from "@/lib/pass-generator";
import type { SignerContext, GenerateInput, GenerateOutput } from "@/lib/pass-generator";

// app/editor/_components/EditorShell  — client only
import { EditorShell } from "@/app/editor/_components/EditorShell";
import type { EditorShellProps, EditorFormValues } from "@/app/editor/_components/defaults";
// <EditorShell defaults={{ passTypeIdentifier, teamIdentifier }} onGenerate={...} />
```

Everything else (file names in `renderers/`, the `FieldSectionEditor`
internals, `buildDefinitionFromForm`, `editorDrafts.ts`, etc.) is private.
Don't import from there directly — copy the files if you need to fork
behavior, and expect changes without warning.

## Peer-deps shopping list

One block, exact majors matched to what this repo ships. Paste into your
consumer project, then run `npm install`:

```bash
# Library runtime (needed for preview, layout, generator, spec)
npm install \
  zod@^4.3.6 \
  fflate@^0.8.2 \
  node-forge@^1.4.0 \
  @peculiar/x509@^2.0.0 \
  bwip-js@^4.10.1 \
  lucide-react@^1.11.0 \
  server-only@^0.0.1

# Editor runtime (add on top of the library runtime)
npm install \
  react-hook-form@^7.74.0 \
  @hookform/resolvers@^5.2.2 \
  react-colorful@^5.6.1 \
  sonner@^2.0.7 \
  @base-ui/react@^1.4.1 \
  radix-ui@^1.4.3 \
  class-variance-authority@^0.7.1 \
  clsx@^2.1.1 \
  tailwind-merge@^3.5.0

# Editor styling (dev-deps; the editor is Tailwind v4 only)
npm install -D \
  tailwindcss@^4 \
  @tailwindcss/postcss@^4 \
  tw-animate-css@^1.4.0

# Generator-only server typing
npm install -D @types/node-forge@^1.3.14
```

Assumes React 19 and Next.js 16 (or any React-19-compatible framework for the
library bits). The preview and editor do not use Next APIs directly.

## shadcn/ui primitives to copy

The editor uses **exactly these 16** from `components/ui/`. Either run
`npx shadcn add <name>` in your project, or copy the files across verbatim:

```
accordion  alert  badge  button  card  collapsible  field
input  label  popover  scroll-area  select  separator
spinner  switch  textarea
```

Plus `lib/utils.ts` (the `cn()` helper) and your `globals.css` needs the
Tailwind v4 theme tokens (copy `app/globals.css` from this repo — OKLCH
values + `.dark` scope). Without those tokens, `text-muted-foreground` and
friends render blank.

## The one wiring decision: `onGenerate`

The editor's download button POSTs a JSON body to a backend. In this repo
it defaults to `/api/passes/generate`. In your app, you almost certainly
want to route that somewhere else — a different path, a different host,
a server action, a tRPC call, whatever. Pass `onGenerate`:

```tsx
"use client";
import { EditorShell } from "@/app/editor/_components/EditorShell";
import type { OnGenerate } from "@/app/editor/_components/DownloadButton";

const onGenerate: OnGenerate = async (body) => {
  // body = { definition: PassDefinition, assets: { slot: { variant: base64 } } }
  const res = await fetch("/your/backend/path", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      issues?: { path: string; message: string }[];
    };
    return { ok: false, error: err.error ?? `HTTP ${res.status}`, issues: err.issues };
  }
  return { ok: true, bytes: await res.blob() };
};

export function MyEditorPage() {
  return <EditorShell onGenerate={onGenerate} />;
}
```

On the server side, `app/api/passes/generate/route.ts` is the reference
implementation — 130 lines, already handles schema re-validation, base64
→ Uint8Array, `getSigner()`, `generatePkpass()`, `verifyPkpassBytes()`
round-trip, and the `Content-Type: application/vnd.apple.pkpass` response.
Port that to whatever backend framework you're on.

## Signer credentials

`lib/pass-generator/signer/load.ts` reads five env vars. These are required
only on the machine that generates `.pkpass` files — the editor and preview
work with none of them set.

```
APPLE_PASS_TYPE_IDENTIFIER   Your registered pass.* identifier
APPLE_TEAM_IDENTIFIER        10-char alphanumeric team ID
APPLE_WWDR_CERT_BASE64       base64 of Apple WWDR G4 PEM
APPLE_SIGNER_CERT_BASE64     base64 of your signer cert PEM
APPLE_SIGNER_KEY_BASE64      base64 of your encrypted PKCS#8 PEM
APPLE_SIGNER_KEY_PASSPHRASE  passphrase for the key above
```

If your secret store shape differs, call `loadSignerFromEnv` manually with
a custom `process.env`-like object, or skip it entirely and construct a
`SignerContext = { signerCertPem, wwdrCertPem, privateKeyPem }` yourself.

## Pitfalls the other agent will hit

- **`@/` alias must point at whatever you rename the library root to.**
  Every `lib/` file imports sibling modules via `@/lib/...`. If you move
  things, update `tsconfig.json` `paths` to match or the imports break.
- **`"server-only"` is load-bearing.** `lib/pass-generator` imports it at
  the top of `index.ts`. If you import it from a client component the
  build fails loudly — that's intentional, do not remove the import.
- **The preview CSS is a plain CSS Module** (`lib/pass-preview/css/preview.module.css`),
  not Tailwind. Don't try to Tailwind-ify it; Apple's on-device layout
  rules are encoded there and shared between the preview and the fidelity
  harness. Copy it verbatim.
- **Do not regenerate shadcn primitives from `npx shadcn add` blindly** —
  the project is on `@base-ui/react` + `radix-ui` on Tailwind v4, which
  has slightly different defaults than the v3 shadcn docs. Copy from this
  repo's `components/ui/` if your project doesn't already match.
- **`bwip-js` is a CommonJS module.** On newer bundlers (Turbopack,
  ESM-first Rollup configs) you may need `transpilePackages: ["bwip-js"]`
  in `next.config.js` or equivalent. This repo uses Next 16 which handles
  it automatically.
- **`lucide-react` v1 has breaking icon renames vs v0.x.** Don't downgrade
  to match an older project without updating the import names.
- **Do not emit `preferredStyleSchemes` without an NFC block.** Wallet on
  iOS 26 silently falls back to the classic event ticket otherwise; the
  preview honors this. See `CLAUDE.md` memory notes for the full incident.
- **Tailwind v4 only.** There is no v3 config. If your consumer project is
  on v3, either upgrade or re-port `app/globals.css` and every editor
  component's utility classes by hand. Upgrading is faster.
- **The `.pkpass` format is a ZIP**, and the manifest + CMS signature are
  order-sensitive. Don't try to round-trip through your own ZIP logic;
  use `generatePkpass()` exactly as it is.
- **Anything under `tests/fixtures/passes/` is not sample data for
  production** — it uses the placeholder `pass.example.demo` / `ABCDE12345`
  identifiers that Apple will reject on-device. Swap to your real
  identifiers before signing.
- **The editor's per-style drafts store is in-memory only.** Hard refresh
  drops user edits. If you want persistence, wire a `useEffect` to
  localStorage at the `EditorShell` layer — the store is just React
  state, not a global.
- **Fonts are Next-specific.** `app/layout.tsx` uses `next/font/google` for
  Geist + Public Sans. If you're not on Next.js, remove those imports and
  provide your own font-face — the editor falls back to system sans just
  fine.

## Minimum viable integration, end-to-end

```
your-app/
├─ lib/pass-spec/…          (copied verbatim from this repo)
├─ lib/pass-layout/…
├─ lib/pass-preview/…
├─ lib/pass-generator/…
├─ lib/utils.ts
├─ components/ui/…          (the 16 primitives listed above)
├─ app/
│  ├─ globals.css           (Tailwind v4 + OKLCH tokens from this repo)
│  ├─ layout.tsx            (your own; include Tailwind)
│  ├─ editor/
│  │  └─ _components/…      (the editor tree, copied verbatim)
│  └─ api/passes/generate/
│     └─ route.ts           (copy this repo's reference impl)
├─ .env.local               (APPLE_* signer credentials)
└─ next.config.ts           (enable whatever you need — no special flags)
```

Wire `<EditorShell onGenerate={…}/>` from your own page. Done.

## Staying in sync with upstream

This repo ships no semver contract. If you want to pull bug fixes without
merging the whole tree:

1. `git remote add upstream https://github.com/arjunlohan/apple-wallet-passes-editor-generator.git`
2. `git fetch upstream main`
3. `git log --oneline upstream/main -- lib/ app/editor/_components/ components/ui/ app/api/passes/`
4. Cherry-pick the commits that touch files you've copied. Ignore
   commits that only touch `app/page.tsx`, `app/layout.tsx`, `tasks/`,
   `scripts/fidelity/`, or the `tests/` tree — those are maintainer-only.

The public types listed at the top of this file are where we try to keep
backwards compatibility. If we change a field on `PassDefinition` or the
`EditorShell` props shape, it will be called out in the commit message.
