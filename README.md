# PriceOS

Front end for the **Price Discussion** platform — a web3 social platform where the community discussing secondary prices is the product. PD is **filtered**, not curated: artist whitelist as a quality floor, but no gatekeeping in the social layer.

- **Stack:** Next.js 14 (App Router) · React 18 · TypeScript · raw CSS
- **Deploy:** Vercel (auto-deploys `main`; `dev` for previews)
- **Design source of truth:** the latest HTML uploaded to the active Claude session (`sim__1_.html` as of Apr 29 2026). Pixel-perfect mockup; the React port is faithful, not a redesign.
- **Workflow:** Gemini designs (HTML/CSS/JS prototype) → Opus 4.7 ports faithfully to React.

## Status

URL architecture and nomenclature both locked May 9 2026 (see sections below). API surfaces (project, output, feed, search, stats, artist, follows, notifications, price, user) scaffolded with typed mock responses; production data lands when the indexer is live. Project page renders sim's hero lockup + gallery at `/art/[slug]`; profile shells render at `/{handle}` and sub-routes. Wallet auth, mint flow, and calendar internals are the next surfaces.

## Nomenclature

Platform vocabulary, sharpened May 9 2026:

- **Project** — what the platform releases (Kiki, Portals). Artist's body of work, mintable.
- **Output** — the individual minted unit. The vessel that bundles the artwork, token, and metadata. The unit of scarcity.
- **Artwork** — the visual content inside an output (rendered canvas).
- **Token** — the ERC-721 inside an output (chain primitive only).
- **Metadata** — the manifest inside an output (mint data, traits, provenance, edition number).
- **Collection** — a user's gathered outputs, across many projects.
- **Edition** — total mintable supply per project ("edition of 256").

## URL Architecture

Locked Apr 29 2026. Nomenclature pass May 9 2026. Full spec lives in ClickUp under PD Master Brief → Front End → URL Architecture & Slug Routing. Quick map:

| URL | Resolves to |
|---|---|
| `/` | Home / global feed |
| `/{number}` | Output — global PD ID, fxhash model |
| `/{handle}`, `/@{handle}` | Profile |
| `/art/{slug}` | Project (mint UI inside) |
| `/art/{slug}/{localId}` | Output (alt URL) |
| `/{handle}/collection`, `/anointed`, `/wishlist`, `/starred`, `/notes`, `/albums` | Profile sub-routes |
| `/{handle}/albums/{slug}` | Specific album |
| `/artists` | Artists directory |
| `/search?q=...` | Search results |
| `/settings` | URL-addressable modal (lives in menu, not top-nav) |
| `/discord`, `/twitter`, `/farcaster`, `/x` | 302 → social accounts |
| `/$price`, `/price` | Reserved (token redirect, Phase 6+) |

The URL prefix `/art/` is a public-facing brand asset; the entity noun is "project." URL doesn't have to match the internal noun.

## Brand tokens (CSS vars, defined in `app/globals.css`)

| Token | Value | Role |
|---|---|---|
| `--hothurt` | `#FF0055` | Primary brand red |
| `--attention` | `#FFE600` | Primary brand yellow |
| `--dot` | `#111111` | Brand black |
| `--matrix` | `#E0E0E0` | Brand off-white |

## Routes

`/` (home) and `/art/[slug]` (project page) render. Profile shells at `/{handle}` and `/{handle}/collection|anointed|wishlist|starred|notes|albums` exist as placeholder bodies. Wallet auth, full mint flow, and the calendar surfaces are the next ships.
