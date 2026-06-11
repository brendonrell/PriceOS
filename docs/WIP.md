# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`. Start fresh from `dev`. THREE task branches are
  trash once their work is on dev — Brendon to delete on GitHub:
  `claude/trusting-knuth-uiin6t` (mega-pass), `claude/vibrant-curie-61o123`
  (perf batch), `claude/elegant-carson-vsfayc` (ClickUp alignment — empty).
- **Updated:** 2026-06-11 (ClickUp alignment session — no app changes)

## ✅ THIS SESSION (2026-06-11) — ClickUp is the PM home again
Full ClickUp ↔ repo alignment pass (ClickUp task 86bacbynf, closed):
- **Closed 19 stale tasks** verified done/superseded in the repos: UI scaffold
  era (Next.js setup, profile page, API routes, pings system + MY PINGS UI),
  Supabase schema, $PRICE code transfer + Etherscan-ready package, the
  **PaymentSplitter ratio bug (fixed in the rewrite — 60/40 secondary, 95/5
  primary)**, the entire no-chain-beta BET/OPS set in 13 · Launch (superseded
  2026-05-14; SIWE + virtualizer closed as BUILT), plus dupes + settled
  decisions.
- **Added 8 tasks mirroring this file's queue:** Home page real build, Global
  Search wiring, spell-book stubs + polish batch, showcase ghosts, real-wallet
  SIWE smoke test, Magic Hour rebuild (02 · PriceOS); writer-bot/linter updates
  (01 · Contracts); indexer first live run vs Sepolia (03 · Indexer).
- **Runescape trading interface FOUND:** it's `FEATURE · The Exchange ⇄`
  (86ba0apqr) — WIP pointer resolved, comment left on the task.
- Backlog truth now lives in ClickUp; this file stays the in-flight baton.

## ✅ SHIPPED THIS SESSION (all on `dev`, Brendon-approved)
The big front-end fix list, ~30 items:
1. **Navigation hang fixed two ways:** every Supabase request has an 8s hard
   ceiling (timeout fetch wrapper on both clients — a stalled query used to
   freeze server page renders forever), and `app/loading.tsx` gives instant
   breathing-dots feedback on every route change (§9 motion rule).
2. **Footer mystery SOLVED:** the deferred wallet stack mounts an empty
   `[data-rk]` div as the last body child; its old `min-height:100dvh` rule
   added a screen of dead space below the footer 1–2s after every load.
   Rule neutralized (`flex:none`). Footer is a normal sticky footer now.
3. **Modal scroll lock** centralised in `lib/state/bodyScrollLock.ts`
   (refcounted; scrollbar-width compensation — no more sideways page jump;
   note-over-artwork no longer unlocks early). Used by ModalContext + note +
   value prompts.
4. **Toast format sweep** (~60 strings): house format `Descriptor: STATUS`,
   e.g. `$PRICE Balance: HIDDEN`. Inline copies say `COPIED!` (no ✓).
5. **PriceRank: ONE name, default 0** (Brendon hard spec). `account_level`
   concept retired from every surface — context exposes `priceRank` only
   (navbar badge ⓿, modal readout, rank/XP labels). DB columns both default
   0; the stray `account_level=1` rows are dead data (column unused; retire
   in a future migration — Brendon's call, prod).
6. **Pure Light/Dark**: pressing ALWAYS lands you in that mode (drift
   re-assert); flags are INDEPENDENT — both may be ON (per-mode modifiers).
   NOT mutually exclusive (Brendon correction). Sim updated to match.
7. **Colorway picker** always shows a selection (null = Custom); light/dark
   square-glyph 22px size compensation now desktop too; chromatic haze
   slowed to 60s/rev (ambient).
8. **Profile fixes:** date popover is the normal PriceDay almanac (JOINED
   first; bespoke "origin" card deleted); wallet/ENS links to Etherscan;
   CTA decoupled from project mint sizing (`.btn-follow{width:auto}`);
   ENS subdomain italics removed; ‰ logo button 13px (Windows crispness).
9. **Ghost rows** (`components/profile/GhostRows.tsx`): 1:1 stand-ins of the
   REAL rows (ride `.starred-row` chrome; fate+star / price+cart variants),
   shown ONLY on your own empty Starred/Wishlist. **Privacy rule: those
   sections (pills + content) DO NOT EXIST on other users' profiles.**
   All null-state copy deleted (show, don't tell — hard preference).
10. **Content-aware landing:** empty profile showcase lands on Collected;
    unminted project lands on Artworks. Saved project-tab pref wins.
11. **Fog mode:** ghost cards reveal on tap like real cards
    (`body.fog-mode .ghost-card{pointer-events:auto}`).
12. **Stargazing:** global-search field/globe/results legible (lavender) —
    was a sim bug ported faithfully; Brendon's polish order wins parity.
13. **Workspaces:** EVERYTHING deletable, defaults included (they're
    suggestions); zero-workspace state is legit and persists (empty saved
    array honored; activeId nullable). Defaults popover: RESTORE + DELETE.
14. **ENS row drag-to-pan** on desktop (`lib/hooks/useDragScroll.ts`,
    reusable for other horizontal rows; mouse-only, click-suppressed).
15. **ASCII logos: 80 total** — 22 new Brendon-curated figlets added
    (branded/janky candidates cut: Rammstein, Star Wars, Fender, Whimsy,
    Rozzo, Bloody). Old "54" count was stale (was 58).
16. **Artists list real:** @brendon + @opus4-6 only. Artist-note icon 14px
    (matches output-card ⊟). Mutuals icon: no more `cursor:help` "?".
17. **Windows sprite eyebrows:** `SpriteEyeSlot` + `lib/sprites/winBrow.ts`
    — Windows-only overlay of the brow's spacing twin over the eye.
    ⚠ HARD LESSON LOGGED: an earlier font-swap attempt (Consolas) changed
    the sprite's look and did NOT fix the brows — Brendon-reverted, trust
    burn. NEVER change sprite font/glyphs; Apple devices must be
    structurally unaffected (overlay node only exists on Windows UA).
    Position verified once by Brendon (lift removed); re-check welcome.

## 🚧 NEXT — Brendon's list, remaining (all greenlit, build + present)
- **Showcase ghosts:** per-account LOCKED aspect ratios (seed from address,
  not slot index) + react to static/generative toggle (reshuffle on
  generative, original order on static). Recon done: ghosts memo has `[]`
  deps in ProfilePageBody (~line 192); seed from `user.address`.
- **Spell book:** 17 of 19 spells are toast-only stubs (only Familiar +
  Stargazing real; Hammer badge partial). Each has a sim spec — grep the
  spell name in `reference/sim.html`. Build in batches.
- **Digital Familiar 10/10:** engine is COMPLETE vs sim; the lift is the
  customization layer (species picker, dialogue frequency, outline toggle,
  placement) — 4 new pdNotifs fields + FamiliarModal controls (currently a
  placeholder shell, lines ~92-103).
- **Global Search:** component renders DUMMY results; `/api/search` exists
  but is never called. Build: wire + debounce, real grouped results
  (projects/users), click-to-navigate, keyboard nav, recents, ranking via
  ilike-prefix-then-substring (own DB, NO Algolia). Schema is ready.
- **+More pill tabs across the site** (same tab system, per-surface values).
- **Feeds on every page** (Feed is a default sort).
- **Prisms art:** restore original gradients (check art lib + history).
- **Incognito proxy mode:** make real (lib/incognito exists).
- **Favicon engine:** more per-feature favicons (lib/favicon exists).
- **PriceSprite placement on user profiles** (without breaking visual lang).
- **ASCII-ID button icon ideas** (unicode only — suggest options).
- **Runescape trading interface** — ✅ found: FEATURE · The Exchange ⇄ (86ba0apqr).
- **Docs/ClickUp ↔ repo alignment audit** — ✅ task side done 2026-06-11;
  drafted ClickUp doc pages still unreviewed.
- **PriceSprite modal achievements** (xbox-like + points; badges TBD).
- **Per-mille blur:** 13px shipped; if still soft on Brendon's screen the
  next step is SVG-tracing Inter's ‰ outline (vector-crisp, still "Inter").
- **Brendon is sorting HIMSELF (do not build):** own-profile CTA purpose,
  showcase created-vs-top-6 + project-vs-output grid marker, soundtrack
  button use. Wait for his specs.

## 🗒️ Process notes from this session (READ — earned the hard way)
- Pure modes are NOT exclusive. PriceRank starts at ZERO. Defaults are
  suggestions. Private sections don't exist for visitors. Ghosts mimic the
  REAL feature 1:1, never generic skeletons.
- Verify the FEATURE renders, not just that the build compiles — two
  "done" claims failed because the empty-state branch never mounted the
  component. Find every branch that renders a surface before claiming it.
- Never ship an unverifiable rendering guess as "done" (Windows font swap).
  Visual fixes Brendon must eyeball go up labeled as needing his look.
- CLAUDE.md gained: NEVER ask permission to ask (raise the question itself
  with a recommendation attached).

## ✅ ALSO SHIPPED TODAY (separate session, earlier on `dev`) — perf batch
Engineering audit → invisible speed pass, one commit (`52f02ef`), zero
intended visual change (Brendon approved "implement it all"):
- **Wallet stack deferred.** wagmi + RainbowKit + connector SDKs out of the
  first load — `components/wallet/WalletStack.tsx` (dynamic import; mounts
  on first idle, or instantly on a connect tap) behind the
  `lib/wallet/walletBus.ts` seam; eager `WalletProviders` runs the auth
  state machine on server-read SIWE. Root cause fixed too: layout.tsx now
  imports `cookieToInitialState` from `@wagmi/core` (the `wagmi` barrel was
  registering every hook as a client entry). `serverSignOut` split into
  `lib/wallet/siweSession.ts` so siwe+ethers defer as well. **Layout
  first-load JS: 1958KB → 589KB raw (174KB gz).** Connected-but-unsigned
  visitors see the verify prompt ~1s later (stack mounts post-paint).
- **Known fallout, already fixed:** the deferred stack's empty `[data-rk]`
  div caused the footer dead-space bug — caught and neutralized by the
  mega-pass session (item 2 above).
- Engines pause in hidden tabs (familiar tickers, sentiment, rpc-ping);
  haze loops skip duplicate color writes.
- Profile holdings + both follow counts ship with the server HTML
  (`lib/profile/getUserHoldings.ts`, shared with the API route); mount
  fetches dropped, event refetches kept, client-nav identity reset added.
- 8s abort guards on Alchemy routes; browser Cache-Control on
  gas/price/stats (feed skipped — own-action staleness risk).
- `ethers` + `next-pwa` removed from deps; AuthContext value memoized.
- **STILL PENDING: real-wallet smoke test (connect → sign → SIWE) on the
  dev preview post-split** — the mega-pass session worked on top of the
  split but the wallet flow itself hasn't been exercised end-to-end.
- Home page: still the `HomePageBody` placeholder — Brendon starting the
  real one "tomorrow"; expect that as the next front-end session's task.

## 🗒️ Prior context (still true)
- Contracts steps 1–3 built + pushed (pd-contracts@main, 220 tests); next:
  linter/writer-bot updates → audit pass → Sepolia gates → mainnet.
- Showcase curation wiring ("Add to Showcase" buttons) still coming-soon
  toasts. Albums sub-tab needs its own build. Collected activity feed
  deferred. Magic Hour project page needs rebuild (artist @petey).
- Indexer = own event DB on Alchemy free tier; white-label Seaport for
  secondary; stay on Vercel.

## Process / gates
- **PUSH = merge to `dev` + push `dev`, instantly** (CLAUDE.md §0). App pushes
  need Brendon's approval; docs/process pre-approved.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).
- Prod Supabase writes = gate #3, surface first.

## main / production — untouched
