# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## ✅ SHIPPED 2026-07-08 — FIAT PRICING + ETH DISPLAY RULE + polish (dev @ 558535b, tree clean)

**Mint CTA fiat readout (heavily iterated — the fragile bit):** fixed 224px pill,
MINT always one size, the ETH+fiat NUMBERS expand/shrink to fill the space beside
it (bounded by width AND height so stacked fiat never spills) — fiat mode only,
normal mode untouched. Measured in `useLayoutEffect` (transform-independent
offsetWidth) so no flash on paint. **No flash on load:** FiatContext now reads the
saved currency AND last-known rate synchronously (persists each rate to
localStorage `pd_fiat_fx`), so the ~fiat is on the first paint. iOS Safari
mis-sized the earlier flex measurement — that's why it clipped; the two-cell
(MINT fixed / numbers scale) structure fixed it.


Big product session (Brendon driving). All on `dev`, verified via build.

- **Fiat pricing (opt-in).** `$` picker in Wallet settings (between copy +
  incognito) → attention-yellow bubble: OFF · USD · CAD · GBP · EUR · JPY.
  Default USD, set-and-forget. Shows `~fiat` stacked (amount over currency
  code) after the ETH price on the mint + floor CTAs. Rate service
  `/api/fx` — CoinGecko (5 currencies) cross-checked against the Chainlink
  ETH/USD anchor; hides the number unless the two agree (trusted). Per-locale
  formatting (EUR `22,34`, JPY no decimals). CAD shows `$`. Toasts:
  `Display Currency: FIAT $CAD` / `Currency: SOVEREIGN`.
- **ETH display rule — 4 digits, floating decimal** (`lib/format/eth.ts`):
  `23.45` · `234.6` · `.2234` · `22.22`. Leading `0.` shows except in fiat
  mode. Swept SITE-WIDE (feed, offers, floor, ATH, volume, portfolio, cart,
  bench, market sheets, stickers, workflows, top-bar grails, calc, todos).
  Input pre-fills deliberately left raw.
- **Attributes/Offers search** now sits BESIDE the +More trait pills (reuses
  the gen-art `⌕` search-btn) on BOTH project + artwork pages. Filters tiles /
  offers live.
- **Golf Clubhouse** — tapping the Golf Score attribute opens a leaderboard
  (reuses the Leaderboard modal shell); the ARTIST leads (smallest engine
  wins) with project shown; ⛳ touch.
- **ASCII Backup** — box + title removed (just the art, full width, two copy
  buttons below); brightness now a gamma lift (dark ink reads brighter).
- **Pull-to-refresh (PWA)** — skinny longish pill, no icon/text, ~⅓ tall,
  colours + armed inversion kept; eases smoothly to rest (no finger jitter).
  Longer pull threshold.
- **Local-time events** — on-chain event feeds render in the VIEWER's local
  time (base stays the chain's UTC ts). PriceDay Montreal day-spine untouched.
- **ENS pills** — subdomains render plain (italics/em wrapper ripped out),
  fixing the missing space after the ↳.
- **Test prices (registry):** bulletin `0.2222`, reliquary `22.222` (both
  0-mint) for fiat-fit checks — REMOVE before mainnet.

## ⚠️ Known / deferred
- **ASCII 1/3-down line** — a faint horizontal line ~1/3 down appears on every
  piece's backup. Couldn't isolate the cause without risking the feature
  (no browser to pixel-inspect); left untouched per Brendon's original call.
  Needs a proper render-pipeline look. (Brightness IS boosted — gamma lift
  `pow(c/255,.4)*369.75+30`, verified in the compiled bundle.)
- **Search rollout** — live on Attributes + Offers (project + artwork). Albums
  is placeholder mock, Anointed is an action panel — skipped. User/profile
  +More would need its own search surface. Say go to extend.
