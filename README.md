# PriceOS

Front end for the **Price Discussion** platform — a web3 social platform where the community discussing secondary prices is the product. PD is **filtered**, not curated: artist whitelist as a quality floor, but no gatekeeping in the social layer.

- **Stack:** Next.js 14 (App Router) · React 18 · TypeScript · raw CSS
- **Deploy:** Vercel (auto-deploys `main`; `dev` for previews)
- **Design source of truth:** the latest HTML uploaded to the active Claude session (`sim__1_.html` as of Apr 29 2026). Pixel-perfect mockup; the React port is faithful, not a redesign.
- **Workflow:** Gemini designs (HTML/CSS/JS prototype) → Opus 4.7 ports faithfully to React.

## Status

**Phase 1 — Foundation.** Token system, layout shell, fonts, root meta, reserved-handle module. Random-gradient placeholder homepage. Old D1 route shells (`/collection`, `/profile`, `/token`, `/artist`, `/mint`) deleted; replaced by the locked URL architecture in Phase 2+.

## URL Architecture

Locked Apr 29 2026. Full spec lives in ClickUp under PD Master Brief → Front End → URL Architecture & Slug Routing. Quick map:

| URL | Resolves to |
|---|---|
| `/` | Home / global feed |
| `/{number}` | Token (artwork) — global PD ID, fxhash model |
| `/{handle}`, `/@{handle}` | Profile |
| `/art/{slug}` | Collection (mint UI inside) |
| `/art/{slug}/{localId}` | Token (alt URL) |
| `/{handle}/owned`, `/anointed`, `/wishlist`, `/stars`, `/notes`, `/albums` | Profile sub-routes |
| `/{handle}/albums/{slug}` | Specific album |
| `/artists` | Artists directory |
| `/search?q=...` | Search results |
| `/discord`, `/twitter`, `/farcaster`, `/x` | 302 → social accounts (Phase 6) |
| `/$price`, `/price` | Reserved (token redirect, Phase 6+) |

## Brand tokens (CSS vars, defined in `app/globals.css`)

| Token | Value | Role |
|---|---|---|
| `--hothurt` | `#FF0055` | Primary brand red |
| `--attention` | `#FFE600` | Primary brand yellow |
| `--dot` | `#111111` | Brand black |
| `--matrix` | `#E0E0E0` | Brand off-white |

## Routes

Phase 1 ships only `/` and 404 (implicit). Phase 2 adds `/art/[slug]`. Phases 3–6 fill out the rest per the URL architecture above.
