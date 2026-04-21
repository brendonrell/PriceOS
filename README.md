# PriceOS

Front end for the Price Discussion platform.

- **Stack:** Next.js 14 (App Router) · React 18 · TypeScript · raw CSS
- **Deploy:** Vercel (auto-deploys main)
- **Design source of truth:** pdsim2.netlify.app
- **Workflow:** Gemini (design) → Sonnet (spec) → Opus (build)

## Status

**D1 — Scaffold.** Route shells exist, brand tokens wired, fonts loaded. No
screens ported yet. The live URL should render a dark "pipeline confirmed"
homepage with brand colors and Rubik Mono One visible.

## Routes (shells)

- `/` — homepage / feed (placeholder)
- `/collection/[slug]` — collection page *(port target for D2)*
- `/profile/[handle]` — user profile
- `/token/[id]` — single token page
- `/artist/[handle]` — artist page
- `/mint/[slug]` — mint page

## Brand tokens (CSS vars, defined in `app/globals.css`)

- `--ink: #111111`
- `--hothurt: #FF0055`
- `--attention: #FFE600`
- `--paper: #e0e0e0`
