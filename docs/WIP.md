# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — THE ROAD TO MAINNET (Brendon's pick-up point, 2026-07-09)

Sepolia rehearsal is functionally COMPLETE: contracts deployed + wired,
tester 12/12 (incl. a real Seaport sale), all five contracts
Etherscan-verified, indexer live-proven on transfers AND priced sales.
Tool pages: /deploy (contract launcher) · /test (readiness matrix) — both
bare routes, both live on the preview. Test stack addresses:
`docs/sepolia-test-phase.md` §0.5. Three steps remain, in order:

1. **Sweep go-live + token-2 backfill** (~30 min) — step-by-step work order
   at the TOP of `docs/briefs/mainnet-tester.md` ("OPUS: START HERE").
   Needs Brendon's three Cloudflare vars, then fire + verify + schedule.
2. **Phase C — the app talks to Sepolia** (a real build session) — Sepolia
   env profile behind a switch, dev preview only, Brendon-only (scope call
   2026-07-06: NO user cohort on testnet). Exit proof: connect on the
   preview → mint from the real UI → see it in the feed. Spec §3 Phase C +
   config matrix §4 in `docs/sepolia-test-phase.md`.
3. **Mythic Audit Pass** (`86b9v5wj4` — the LAST gate, multi-session) —
   five-phase plan lives in the ClickUp Audit Plan page; fold in the
   Sepolia observation material (gas table = the /test COPY REPORT output,
   ClickUp task 86b9v5w77 comments). Task says "Opus 4.7" — run on the
   strongest available model and update the task text.

Then MAINNET DAY is a rerun of proven moves: /deploy re-pointed at mainnet
→ Etherscan verify (same staged flow) → port /test (brief's mainnet
section) → point the Alchemy webhook at mainnet → app cutover. Cleanup
before public: delete the `pd-test-alpha` projects row + its events
(test-only data), remove test branches.

---

## ✅ SHIPPED 2026-07-09 — MARKETPLACE SALES PATH PROVEN · TESTER 12/12 (dev, tree clean)

- OpenSea killed testnets (2025-07) → /test gained **T9: a real Seaport 1.6
  sale** (signed listing + creator-earnings consideration + on-chain
  fulfillment — the exact mechanics OpenSea runs). 12/12 PASS live; the 5%
  royalty landed on the splitter to the wei.
- **Indexer sale enrichment proven live**: token-1 XFER row carries
  price_eth 0.002 + LIST_FILL; apply_sale/upsert_holder fired. Every indexer
  path is now live-proven EXCEPT the scheduled sweep (see the OPUS work order
  in docs/briefs/mainnet-tester.md — sweep go-live + token-2 backfill).
- OpenSea-WEBSITE render/royalty-policy check moved to MAINNET day
  (no testnet OpenSea exists anymore — industry-wide).

## ✅ SHIPPED 2026-07-09 (dev, tree clean, build green)

- **Onboarding + PriceSprite chooser legibility** — removed the washed-out
  half-opacity on the signup modal (title, section labels, the four sprite
  cells + archetype labels, the @ prefix). All full-strength/legible now;
  selection still reads via the heavier border, not by dimming the others.
- **Home owned-check gap** — halved the space between the ✓ and the project
  name on the homepage carousels.
- **Reserved @name owner claim** — the claim-side override already existed
  (deployer wallet `0x1460…B9B8` = designated owner of `@pricediscussion`).
  Fixed the two spots that still blocked it in signup: the live availability
  check ran anonymously (couldn't see the owner) and the signup screen
  greyed reserved names on the spot. Now the PD wallet can claim
  `@pricediscussion` end-to-end. Only that one name is tied to that wallet.
- **Pings inbox — live + windowed.** Was frozen: it only reloaded when a new
  *directed* ping bumped the unread count, and opening the panel never
  refetched. Now: (a) refetches on open; (b) any live activity
  (mint/sale/list/offer/follow) pulls the full list so follow-feed pings land
  at the top in ~1s; (c) holds a rolling window of the newest 100 — older seen
  pings fall off the bottom as fresh ones arrive.
- **Brendon's pings wiped** — his 271 old rows deleted for a clean-slate test
  (his ask). Account `0x65c3…9395` / `@brendon`.

## 🔧 FINISH THE JOB — desktop only (Cloudflare secret, Brendon at desktop)

**iOS/native push never fires — server private signing key is the last piece.**
Everything else is verified good: Brendon's mode is COMBO (native on), Silent
off, his iPhone IS registered (Apple push endpoint on file), the send code runs
on every ping, and the PUBLIC key is live on the Worker:
`BOPqWQbNecDto-qTIeXEoJbjM-Hg7epdQffUarzccIH-Hust4NJoIbuxfsFlSxsuzFzpPOeu79u_vLxJThQWlBg`
Yet zero native pushes land → the Worker's **private** half is missing or
doesn't match that public key.

Desktop steps (Cloudflare Worker `pricediscussion` → Settings → Variables/Secrets):
1. **If you have the private half of the public key above:** set secret
   `WEBPUSH_PRIVATE_KEY` to it. Done — existing device subs keep working.
2. **If you don't:** generate a fresh VAPID pair (`npx web-push generate-vapid-keys`),
   set BOTH `NEXT_PUBLIC_WEBPUSH_KEY` (public) and `WEBPUSH_PRIVATE_KEY`
   (private) as Worker secrets. ⚠️ Changing the public key invalidates every
   existing subscription (incl. Brendon's iPhone sub from 07-07) — each device
   must re-open PD and re-allow notifications to re-subscribe.
3. Redeploy the Worker, then test: unlock any achievement (self-ping runs the
   native send path) → the iPhone should buzz within ~1s.

Code side is DONE — the send path, gating, and dead-sub pruning are all in place
and inert until the key matches.

## 📋 QUEUED (not started)

- **Genesis message timeline is wrong** (first item in all-outputs timelines).
  We converted the wrong direction. PD genesis = **11/19/21 08:28 Montreal
  (EST = UTC−5) → 13:28 UTC**; timelines are UTC-based, so the stored base
  should be **13:28 UTC**. Fix the conversion for that entry.
- **Group sorts rework** — discussion/scope only. Current system: a group-by
  modifier folded into the grid sort button (none/owner/color/last-sold/rarity
  on projects; +artist/project combos on the collected grid). Brendon wants to
  rethink how it works — needs his direction on what's wrong before any build.
- **Languages / programming-languages as a gen-art trait** — discussion only.
  Options to weigh: artist declares on upload vs auto-detect; surface in
  attributes; enable a group-sort dimension. No build until Brendon picks.

## 💡 ANSWERED (no build)

- **ASCII backup inside the token + JSON?** Full-colour artifact ≈ 75KB;
  plain text-only ≈ 22KB. One permanent on-chain slot caps ~24KB → text-only
  fits in one, full-colour needs ~4 shards + real per-mint gas. It's also fully
  rebuildable from the seed, so on-chain only earns its keep as a
  "permanent-on-chain, no storage dependency" pitch. Call: if it goes in the
  token, text-only; colour stays the pinned artifact.

## ⚠️ Known / deferred (older)

- **ASCII 1/3-down line** — faint horizontal line ~1/3 down on every backup;
  cause not isolated (no browser to pixel-inspect). Left untouched.
- **Test prices (registry)** — bulletin `0.2222`, reliquary `22.222` (0-mint)
  for fiat-fit checks — REMOVE before mainnet.
