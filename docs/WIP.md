# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## ✅ SHIPPED 2026-07-01 — HALO cohort (12 surreal projects, across -ai artists)

Opus 4.8 build over ~24h of tokens. A 12-way tournament (4-lens jury seeding +
3-juror bracket) of surreal "real-but-off" systems, each a CONTINUOUS seed-driven
engine with its own distinct palette world (hard variance pass killed preset
pseudo-dupes; proven at 16 outputs each). Champion **NARTHEX** (a freestanding
dusk arch framing another world; signature colorway **Grail** #FFC24A + Hiroshi
Yoshimura *Music for Nine Post Cards*), runner-up **Evening Rooms**. ALL 12 kept,
assigned to kindred -ai artists by style: narthex/veil, secondsun/filament,
slacktide/fathom, appointment/umbra, cabinet/lapidary, overcast/murmur, stillrain/
nightpour, papercountry/foolscap, ballast/lowgravity, saltmirror/headways,
eveningrooms/nightlawn, vestment/glyphfield. Ported to lib/art/engines + registered
(256 ed. ea, 333 Narthex, 0 mint). Build green; pushed to dev (8b4616d). R&D:
tools/halo/h4_*.js + jury/tournament workflow scripts. **REMAINING:** optional
Supabase `projects` rows (marketplace stats + new-gen recency) — needs Supabase
re-auth + Brendon's ok on prod data; projects already render from the static
registry like arcology.

## ✅ SHIPPED 2026-06-30 — Dead Reckoning (1 new HALO project, @opus4-8)

12-way tournament run for a new surreal "real-but-off" cohort (4 directions ×
3 variations: Plumb Line family, Sunbleach family, Aftertaste family, Spoiled
Milk family), each rendered for real and jury-judged. Tournament champion was
**Sevenfold Skin**, but Brendon picked **Dead Reckoning** (Plumb Line family —
a surveyor's chalk-line/plumb-bob, string dead-straight, bob tilted off true)
straight out of the contact sheets before the bracket finished and called it
final — keep as-is, ship it, discard the other 11. Live on `dev`: engine
`lib/art/engines/deadreckoning.ts` + registry entry (colorway #7E8C91,
soundtrack Eluvium — Talk Amongst the Trees, 217 ed., 0 mint price) + the
`projects` row live in Supabase (project zspxpfwlwikdxwavffjn). Build verified
clean on a fresh clone before push. R&D source + the 11 discarded pieces'
working files were intentionally deleted, not committed — they only ever
existed in this session's scratch dir.

## ✅ SHIPPED 2026-06-30 — HALO cohort 2 (24 NEW abstract projects, under -ai artists)

Opus 4.8 build. A 24-team tournament: 12 non-objective (Suprematist/Constructivist/
Molnár/Kandinsky/Newman/Kline/Matisse/Frankenthaler/LeWitt/Kelly/Lissitzky/Tantra
in spirit, not pastiche) + 12 material-phenomenon (chladni, caustics, schlieren,
frost fern, cyanotype, kintsugi, efflorescence, evaporate, encaustic, patina,
frottage, fumage). Champion **Stillpoint**, runner-up **Kintsugi**. ALL kept.
Each rebuilt as a CONTINUOUS seed-driven system (no near-duplicate outputs — the
hard rule learned this session), distinct palette-world each, ported to
lib/art/engines + registered in registry.ts, assigned to existing -ai artists by
style. Stillpoint colorway #C0392B + Alice Coltrane soundtrack. Artist tender-ai
renamed → **foolscap-ai** (Brendon's call). Build green; on dev (deploys when
Vercel resumes). R&D source: tools/halo/{b_,z_}*.js + port24.mjs/wire24.mjs.

## ✅ SHIPPED 2026-06-30 — HALO art cohort (8 projects by @opus4-8)

A 12-way tournament of surreal, abstract "real-but-off" systems → 8 kept and
developed to gallery grade, each its own distinct palette world + value key:
**Long Noon, Sap Rising, Cold Joint, Rime, Last Lamp, Vanitas, Minium,
Noctilucent.** Live on `dev` (engines `lib/art/engines/*.ts` + registry + 8
`projects` rows in Supabase, 256 ed. each, 0 mints). 4 soundtracked
(Rime/Last Lamp/Noctilucent/Vanitas), 4 intentionally silent. Dropped from the
bracket: Flux, Chromatography, Meridian, Foxing. Visual preview pending Vercel
resume. R&D source engines kept under `tools/halo/` (`h3_*.js`) for re-porting.

---

## ⭐ ACTIVE TASK — CLOUDFLARE MIGRATION — **PARKED** (Brendon, 2026-06-29: "park it a few days"). READ THIS WHOLE BLOCK.

> **Step 1 (framework upgrade) is DONE and built green. The free-vs-paid cost
> question is SETTLED. Work is PARKED a few days at Brendon's call. EVERYTHING
> lives on branch `claude/baton-cloudflare-migration-six2of` — it is NOT on
> `dev`, the live app is untouched and fully reversible. DO NOT delete that
> branch; it holds all the parked work. ClickUp task: `86ban85nn` (assigned to
> Brendon, due 2026-07-02).**

**What Brendon decided (do not re-litigate):** move hosting **Vercel → Cloudflare
Workers via the OpenNext adapter** (`@opennextjs/cloudflare`; NOT the deprecated
`next-on-pages`). Cheaper at scale (free bandwidth, image-heavy app). His **#1
fear: the app must look + work IDENTICALLY after the move** — prime directive.

### ✅ STEP 1 — FRAMEWORK UPGRADE (DONE, built green, on the branch)
- **Next 14.2.35 → 15.5.19, React 18 → 19.2.7.** Targeted Next **15, not 16**
  on purpose: OpenNext needs ≥15.5.18, and a single major jump minimises
  look/feel risk (16 piles on a second major's breaking changes for no benefit
  here). 16 is also OpenNext-supported if Brendon ever wants it later.
- **Async request APIs** (the big Next 15 change): await params/searchParams/
  cookies/headers across all 13 dynamic routes + pages. Done via the official
  `@next/codemod next-async-request-api` + manual fixes to the `requireAuth`
  wrapper context type and the two handlers that read `ctx.params`.
- **Look/feel held identical.** The one feel-risk — Next 15 flips the client-nav
  cache default (dynamic staleTime 30s → 0s), which would refetch already-visited
  pages on revisit and feel slower — is re-pinned in `next.config.mjs`
  (`experimental.staleTimes` dynamic 30 / static 300 = the Next 14 values). No
  layout/styling/component/animation changes.
- **`middleware.ts` rate-limiter IP:** `req.ip` was removed from `NextRequest` in
  Next 15 → now reads `x-real-ip` first (the same platform-trusted value Vercel
  populated into `req.ip`), `x-forwarded-for` fallback. Behaviour-identical on
  Vercel. (The CF-Connecting-IP rewire is still a step-2 item.)
- Full production build passes on Next 15.5.19 + React 19.2.7.

### 💵 COST — SETTLED: needs the **$5/mo Workers Paid plan**
- First OpenNext Cloudflare build measured the packed server worker:
  **4.24 MB gzip** (`Total Upload 21.8 MB raw / 4.24 MB gzip`, via
  `wrangler deploy --dry-run`).
- Cloudflare caps (confirmed in their docs): **free 3 MB, paid 10 MB** gzipped.
  4.24 MB is over free, comfortably under paid → **$5 USD/mo (~$7 CAD).**
- Art + all static assets stay **free + unlimited** regardless of plan.
- Weight is the wallet/login/crypto libs. Maybe trimmable under 3 MB with
  deliberate work, no guarantee — not worth chasing for a $5 line item.
- Build scaffold committed: `open-next.config.ts`, `wrangler.jsonc`,
  `@opennextjs/cloudflare` + `wrangler` dev-deps, `.open-next`/`.wrangler`
  gitignored. Edge-runtime directive dropped on `/api/gas` + `/api/rpc-ping`
  (OpenNext packs one Workers bundle; both are disabled pollers).

### ▶️ NEXT (when Brendon un-parks)
1. **Get his go to put step 1 on `dev`** so he diffs look/feel against his
   screenshots, screen by screen. (He has the screenshots — does NOT need Vercel
   un-paused to verify.) **Ship gate: merge to `dev` needs his explicit go.**
2. **Finish step 2 Cloudflare seams:** rate-limiter IP → `CF-Connecting-IP`;
   `web-push` (`lib/push/webpush.ts`) Worker-compatible signing path (push isn't
   fully configured — VAPID key absent — low stakes, fiddliest item); re-tune
   timed-cache routes (stats 60s / price 10s / search 60s / gas 12s) on
   Cloudflare's cache mechanism; image serving Vercel optimizer → Cloudflare.
3. **Stand up the Cloudflare copy side-by-side, diff every screen, cut over only
   when identical.** Live Vercel app stays untouched the whole time — fully
   reversible.

---

## ⭐ INDEXER — serverless rebuild HARDENED + READY (2026-06-29). Fold-in deferred to Cloudflare cutover.

> The free serverless indexer (Alchemy webhook → app route → Supabase + reconcile
> sweep; **Railway removed, $0 at launch scale**) is built, audit-clean, and
> verified against live Supabase. All work is on indexer-repo branch
> **`claude/indexer-alchemy-setup-tuezqu`** (pushed) — **NOT** folded into PriceOS
> yet. DO NOT delete that branch.

- **This session:** cleared every priority finding from the 2026-06-14 security
  audit (`docs/security/findings/07-indexer.md`): F1 fake-mint hole (transfer path
  now allow-lists the tracked-`projects` set, +60s cache TTL), F2 cron fail-closed,
  F3 signing-key assertion, F4 payload validation + per-log fault isolation, F5
  registry address validation, F7 body-size + sweep fan-out caps. Typecheck clean.
- **Verified in live Supabase:** `events (tx_hash, log_index)` unique constraint
  present (idempotency depends on it) + all four writer RPCs exist with matching
  signatures. F6 (Seaport wash-trade ATH/volume inflation) is inherent — flagged
  for scoring, not a code fix.
- **Contract-deploy wallet (Brendon, 2026-06-29):** `0x146034ec25C277F30f63933B151297689E15B9B8`
  — the EOA that deploys PD contracts to Sepolia/mainnet; its deploy txs yield the
  Project addresses fed to the indexer. Recorded in the repo `docs/HANDOFF.md`.
- **DECISION (Brendon took the advice):** do NOT fold into PriceOS now — it's
  dormant until a contract is on Sepolia, so the fold-in rides the Cloudflare
  cutover (keeps the migration diff clean). Go-live steps in repo `docs/HANDOFF.md`.
- **ClickUp:** "Indexer Architecture" doc (`2kyd6gx6-2154`) given a SUPERSEDED
  banner — the old Ponder/Railway/$5 body was stale and misled a fresh session
  into thinking the rebuild didn't exist.

---

- **⚠️ VERCEL PAUSED + BACKGROUND POLLERS HARD-OFF (Brendon, 2026-06-27):**
  Vercel paused the project (`live:false`) on the **free-tier usage cap** — the
  latest build is healthy, so it's a usage limit, NOT a bad deploy or the commits.
  To stop the ongoing drain, the two background pollers are **disabled behind
  flags** (flip to `false` to restore):
  - **`RPC_PING_DISABLED`** (`lib/rpc/rpcEngine.ts`) — the latency ⌁ pill that
    polled `/api/rpc-ping` every 4–8s/tab. ⌁ button is now inert.
  - **`PINGS_POLL_DISABLED`** (`lib/state/PingsContext.tsx`) — the unread-pings
    `/api/pings/count` poll (15s) + its live-event nudge + visibility refetch.
    The pings menu still pulls once when it opens.
  NOT the missing VAPID push secret — that path configures once, no-ops when the
  key's absent, never retries. **Un-pausing the live site is Brendon's Vercel
  account action** (free-tier cap reset / upgrade); re-enable the flags after.
  **POLLERS STAY OFF (Brendon, 2026-06-28) — do NOT re-enable until he says so.**
- **HALO surreal cohort SHIPPED (Brendon, 2026-06-28) — dev + DB.** 9 projects across
  4 new -ai artists, built via a 12-engine jury tournament then Brendon's keeper list:
  - `tender-ai` — The Loaded Question (winner, 777, yellow-on-ink chat-as-weather, ‰ removed,
    20 palettes), Provenance (redacted price-ledgers), Datum (parametric impossible-object drafting).
  - `newsprint-ai` — Off Register (riso, 13 palettes), Interference (soft moiré).
  - `veil-ai` — Against The Light (composed smoked-polycarbonate), Drapery (tonal cloth/shroud).
  - `umbra-ai` — Vestibule (de Chirico plaza). **Heliodon built + committed but HELD off the live
    list** (`registry.ts` — not imported/registered) for umbra-ai's later staggered drop.
  - `fathom-ai` — Noise From Below 2 (strata core-sample sequel).
  Live-DB seeded via `tools/halo/seed-halo-artists.sql` (4 users + allowlist + 9 project rows,
  mint 0, 60-day cooldowns). R&D engines live in `tools/halo/`; production engines in `lib/art/engines/`.
- **Branch:** all work is on `dev`, pushed (origin/dev `d43baf9`), tree clean.
  This chat's task branch `claude/halo-project-opus4-8-1h8lkh` is trash (work is
  on dev) — Brendon deletes on GitHub. Stale local-dev self-heals via the hook.
- **Updated:** 2026-06-28 (session 5 — HALO tournament → two new projects). Shipped to `dev` + DB:
  1. **VESPERS — the platform halo (flagship), by `firstchannel-ai`.** Monumental
     drowned architecture mirrored in still water; 8 scene families × 10 cool-jewel
     colourways; surreal "real but off" + faint instrument substrate. 444 supply ·
     0.2 ETH · soundtrack Stars of the Lid. Self-contained engine, deterministic,
     trait casts verified to match the R&D renders seed-for-seed.
  2. **ARMILLARY — the tournament runner-up, by `lapidary-ai`.** Floating precision
     instrument (orrery/rings) in coloured haze; 6 scenes × 10 hot colourways;
     palette-clamped iridescence. 360 supply · 0.15 ETH · soundtrack Vangelis
     *Albedo 0.39*.
  3. Built via a 12-contestant jury TOURNAMENT (4 directions APHELION/MIRADOR/
     VESPERS/ARMILLARY × 3 colourways → bracket → Brendon picked VESPERS+ARMILLARY,
     VESPERS = halo). Losers APHELION + MIRADOR parked in `tools/halo/` (kept, not
     deleted). R&D harness: `tools/halo/` (kit.js + render.mjs + h_*_v*.js;
     `PW_EXEC=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`).
  4. Both **spread to existing AI artists with distinct wallets (NOT opus4-8)** per
     Brendon. DB rows inserted (prod): minted 0 → show under **New Uploads / new
     gen art**, staggered uploads (VESPERS newest, ARMILLARY ~13 min earlier).
     Won't render until Vercel un-pauses; nothing else needed.
- **Updated:** 2026-06-27 (session 4 — output activity feed + timeline polish).
  Shipped to `dev`:
  1. **Output activity feed / timeline** — full feed below the output art: real tx
     rows + pinned platform-genesis + identity markers (#price-discussion channel
     started · PriceOS 1.0 released · $PRICE airdrop · artist joined/added · minter).
     Search row = EXACT projects search-row copy (text + min/max ETH range + ✕,
     ends at the page inset). Middle hero stat changed VOL→**ATH** (all-time-high
     price paid; mint price until first trade). Feed ETH amount italic (bold read
     identical in Courier, so italic stays). Tap art → opens project modal. Share
     image = PWA icon; proper-cased title; PriceDay date beside the name; soundtrack ♫.
  2. **‰ PriceOS mark = Inter, bold** — root cause of "Inter dropped": newer iOS
     forces a fallback font off the hidden text-presentation selector (`︎`)
     after ‰. Removed it on BOTH the timeline ‰ and the settings Price Logo →
     real Inter is back. (Inter font itself loads fine; this was the only break.)
  3. **Action-row / hover active states** — note + grail buttons (and the gallery
     card hover grail) now light up when the output already has that thing; star
     and wishlist already did. Albums/todos exempt. Share button matched to the
     glyph squares' exact height/box model.
  4. **Landscape output art** — fills the space (taller cap on short viewports) and
     no longer overflows into horizontal scroll (stage/foot padding kept inside width).
- **⚠️ OPEN — spell-book / settings icon nudges look WRONG (Brendon, end of session,
  angry):** the recent per-icon nudges (tarot, price ghost, hammer, first blood,
  cartel) render FAR larger than the px value set — "not remotely a pixel." Pushed
  as-is on his "push what you have and wrap." NOT diagnosed yet. Suspect the inline
  `position:relative; top:Npx` is compounding with existing `.st-icon`
  `transform: translateY()` + per-id `#sb-*`/`#sn-*` transforms/font-sizes (some
  `!important`), so the net shift is bigger than intended. NEXT: read every `.st-icon`
  / per-id override before re-nudging; set the FINAL top once, don't stack. Also
  confirm the settings Price Logo actually renders BOLD on device (code has
  `fontWeight:'bold'`; SettingsToggle forwards full `iconStyle` via `style=`).
- **(prior) Updated:** 2026-06-25 (session 3 — lunar glyphs + Safari research). Shipped to `dev`:
  1. **Lunar Phase = monochrome glyphs (no emoji)** — the Lunar Phase tile in
     project + output Attributes was using colour emoji moons (🌑–🌘), banned. Now
     flat circle glyphs tracing the cycle (● new, ○ full, ◑ waxing / ◐ waning
     quarters, ◕/◔ crescent↔gibbous). Single source `lunarGlyph`, covers both
     surfaces. Name + "% lit" unchanged.
  - **Two Safari attempts tried + REVERTED (both did nothing on-device):**
    - *Top-bar/notch band (browser):* removing the chrome-colour tag — newest iOS
      Safari (26) DROPPED `theme-color` entirely, so that tag is already dead; the
      top/bottom bar colour is now auto-sampled from `position:fixed`/`sticky`
      elements' `background-color` + `backdrop-filter` within ~4px of the viewport
      edge, falling back to html/body bg. Our persistent top chrome (navbar) is
      transparent + body is page-colour → should be seamless; the band is most
      likely a full-screen BLURRED cover (loader / route-loading / ptr-refresh,
      all `backdrop-filter: blur` fixed at top:0) bleeding into the bar during a
      transition. NOT yet pinned — needs on-device confirm (does the band STAY
      after load = the bar itself, or only FLASH during = the frosted cover). Do
      NOT strip the loader frost to test (NO-AMPUTATION; it's that exact loader).
    - *External links out of PWA:* CONFIRMED impossible — iOS gives an installed
      PWA no way to eject a link to the real Safari APP; all nav stays in-webview.
      `_system` is Cordova-only (myth for us). Current code's `location.href`
      traps the user in the chrome-less shell (worst case). Ceiling Apple allows =
      `window.open('_blank')` → slide-up Safari panel (chrome + Done). Shipped that,
      Brendon said it changed nothing on his device → reverted. Left as-is.
- **Updated:** 2026-06-25 (session 2 — link responsiveness / bg flash). Shipped to `dev`:
  1. **In-app navigation** — internal links route client-side (global interceptor
     in the shell, bubble-phase, fully guarded; `<main key={pathname}>` for a fresh
     per-route subtree). Page never tears down → snappy native feel + the theme
     background glides old→new (existing 0.3s fade rides nav) instead of black flash.
     Open overlays (modal/cart/dropdown) close on a real route change. Petey bubble
     closes on Home tap ($PRICE deliberately doesn't).
  2. **Profile colour first-frame** — server-known `profile_hex` painted into the
     first frame via an inline boot script (cold load) + owner hex set in a layout
     effect (in-app nav) → no grey flash on profiles.
  3. **Carousel preload** — per-track IntersectionObserver (rooted on the scroller,
     ~2-tile horizontal margin) paints tiles two over via `forceRenderKeys`, so the
     pop-in happens offscreen. NOTE: a viewport-side rootMargin does NOT work for
     carousels (the track clips its own off-screen tiles) — must measure from the track.
  4. **Starred social pills** — Followers / Following / Mutuals promoted from
     Collectors-only sub-pills to TOP-LEVEL pills right after Artists. Filter
     collectors + artists (people follow graph) + projects (held = project follows
     you / explicit follow = you follow it / mutual = both). `/api/project-follows`
     now tags each project with `held` + `following`. Outputs excluded until their
     watch/fandom follow is wired. No count badge on the 3 pills (tally is live-graph).
  5. **CLAUDE.md** — "caveats are not a reflex" rule added (§7) + the rules-reminder
     hook line reworded (no caveat unless one urgently matters).
  6. **Output follows** — outputs are now followable, mirroring the project follow
     stack. New `output_follows` table (additive, applied + verified live) +
     `OUTPUT_FOLLOW` ping kind. `/api/output-follows` (follow/unfollow/read);
     following an output pings its OWNER. Parent project always follows its own
     output (synthesised +1 at read time → never 0, no minting change).
     `OutputFollowButton` + output +More **Social** tab (mirrors project's: output
     @name @oracle234, the PROJECT's PriceSprite since outputs have none, owner,
     follower count, Follow/Share). Output hero follower count now = the output's
     own. Starred **Following** pill now includes outputs you follow (outputs only
     ever under Following — they never follow you back).
- **Link-lag / profile / connect-menu (2026-06-25, late session):** all on `dev`.
  1. **Profile loads like any other** — colour painted from the DB `profile_hex`
     for EVERY profile (incl. your own); login/live-edit is a separate overlay
     applied AFTER, never gating the paint. Killed the own-profile white flash.
  2. **Link lag, part 1** — profile page no longer blocks its render on the heavy
     collected-grid query; the body already re-fetches grid + count on mount, so
     the page paints the instant the profile row resolves, grid fills in after.
  3. **Link lag, part 2** — prefetch the destination on **pointerdown** (press),
     deduped, same guards as the click router. NEVER on hover/scroll (that storm
     was the freeze last time). Pages now lighter, so warming is cheap.
  4. **Connect menu** — artists list routed in-app (was a full reload every tap).
  5. **PWA pull-to-refresh** — guard now skips ANY real inner scroller (was only
     skipping ones already scrolled down), so pulling the artists/portfolio list
     no longer refreshes the whole app.
  6. **Portfolio is real** — `lib/portfolio/livePortfolio.ts` builds the tree from
     the logged-in wallet's real holdings (artist→project→pieces, valued at live
     floor ?? mint price); ENS detects `*.pricediscussion.eth` on the account
     (empty until registered); Sticker/Shadow empty (no real dataset). Mock gone.
  - **HARD-WON LESSON (this session):** the connect menu was the missed surface
     the whole time. Also: NEVER prefetch on hover/scroll (server choke → freeze);
     NEVER bolt on a spinner/fade Brendon didn't ask for; the two issues
     (link lag vs own-profile white flash) are SEPARATE — don't conflate them.
- **OPEN / NEXT:**
  - Output-follow **ping details/surfacing** — the follow + owner ping land now;
    richer watch/fandom ping behaviour ("cult of the image") is later (Brendon).
  - **Button-flash polish** — on nav the bg is instant but the new page's buttons/
    bubble lag until its data loads (force-dynamic fetch window). Fix = render the
    page frame instantly + stream data, so buttons land WITH the bg. Bg must stay
    instant — never defer it (Brendon, hard constraint). Own focused pass.
  - **Outputs social follow** — wire the watch/fandom output-follow, then add outputs
    (Followers-only) to the Starred social pills.
  - Safari compact-mode black line at top: wait out iOS27 (Brendon's call).
- **Prior session (still live on `dev`):**
  1. **Project graduation visual analysis** — graduated projects (≥18 mints) gain
     an aggregate character sheet in Attributes (collection Form, palette spectrum,
     trait/fate spread + rarest/most-average piece, Collective Fingerprint); first
     22 editions rendered on demand, rest lazy. Milestone badges on every project.
  2. **Followers Manager** — rebuilt the old full-screen followers modal on the
     Sticker Manager shell: COMPACT floating popup (FIXED height, matches Sticker
     Manager, no jump) + PLUS full-screen (`100dvh`, empty preview slot reserved at
     top). Rows = two clean lines (sprite+@name, then icon+number stats:
     ⬚ collected · ⟠ spent · ⚬ followers), sortable; relationship tag + ✺ artist
     badge; projects show ✺ creator · ⬚ minted/supply · ⟁ Cartel mutuals, with real
     @name + PriceSprite. Stars reuse the DB-backed artist/project star sets, pinned
     to top + alphabetised. STICKERS store button in the header.
     New `/api/social/circle-stats` (batch collected/spent/followers/artist) +
     enriched `/api/project-follows`.
  3. **Sticker Manager** — colour-filter row now leads with a clear (×) circle.
  4. **Profile Starred → Collectors** — Followers / Following / Mutuals sub-pills
     filtering starred collectors by the viewer's real follow graph.
  5. **CLAUDE.md** — added the hard rule: stop firing permission prompts, all
     permission pre-granted (§7).
- **QUEUED (not built):** milestones-on-the-tape; My Network "Fresh Wallets"
  (Alchemy first-tx). Followers Manager preview slot is intentionally empty
  (Brendon has plans for it).
- **HARD-WON LESSON (this session):** the followers list cut-off was a reused
  `.collectors-list` (fixed 250px scroll box) — when reusing a shell, check its
  classes don't impose height/overflow. Compact = FIXED height + inner scroll;
  PLUS = full screen. Don't add borders/placeholders Brendon didn't ask for.
