# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## ✅ SHIPPED 2026-07-05 — SEPOLIA-READY: free-mint revert · 512px previews · DB completed to 120

On `dev` (8a83cb0). Contracts + previews + data, all verified. This chat's task
branch `claude/smart-contracts-sepolia-hchcub` is trash once Brendon deletes it
(same-named branch in pd-contracts is NOT trash — see below).

- **pd-contracts: genesis free-mint bands + direct-deploy REVERTED (Brendon's
  call).** No free bands, no hand-deployed genesis — every project deploys via
  the factory, every token pays mintPrice + storage fee. PDProject is back to
  the audited pre-band signature; the single-pass upload scanner + its
  equivalence fuzz suite (unrelated, same original commit) KEPT. 290 tests
  green. Lives on pd-contracts branch `claude/smart-contracts-sepolia-hchcub`
  (7089780) — **the Sepolia deploy candidate now; fold to `main` at deploy
  time.** Full 6-contract review re-run: clean, no open items.
- **Previews 384px → 512px** (`lib/art/storePreview.ts` PREVIEW_PX, writer cap
  700KB → 1.2MB). MEASURED, not guessed: headless-rendered all 120 projects at
  6 candidate sizes, supply-weighted. Full sell-out (19,980) = ~7.7GB at 512px
  — under the 10GB R2 tier with buffer; 640px would be ~11.6GB (~3¢/mo over if
  Brendon ever wants it). Display seam draws stored PNG at natural size, so
  512 is the whole sharpness story.
- **/deploy launcher artifacts REFRESHED** (`lib/deploy/artifacts.json`) to the
  reverted build — factory bytecode changed; registry/stickers byte-identical.
  Never deploy from a build older than this.
- **Supabase completed to 120 project rows** (was 90 — the surreal-vista +
  texture cohorts never got rows; Opus's zero-pass didn't miss them, they were
  never inserted). 30 rows inserted matching the live shape (0 stats, real
  supplies, registry soundtracks, computed project sprites, uploaded_at=now)
  + 6 new -ai artist users (0xa2…05–10). DB now = registry exactly: 60×222 +
  60×111 = 19,980. Verified: all shared rows' supplies matched registry before
  insert; collection zeroed everywhere (0 mints/outputs/holders/events).
- **R2 bucket emptied by Brendon** (old 384px pins gone — write-once would have
  blocked fresh pins). Bucket exists, empty, fills per-mint at 512px.

**THE SEPOLIA RUNWAY (all that's left):** ① Brendon farms ~0.05–0.1 Sepolia
ETH → ② deploys from /deploy on the NEW dev build → ③ pastes each contract
address into its projects row (= indexer cutover). Domain: stays stealth on
workers.dev through Sepolia; wire pricediscussion.com (Namecheap → CF DNS) at
public launch. OPEN: confirm `NEXT_PUBLIC_ART_IMAGE_BASE` build var + bucket
public read are actually set in CF (previews display live-render fallback
until they are).

---

## ✅ SHIPPED 2026-07-05 — Homepage news carousel + preview self-heal + To-Dos chips

All on `dev` (7f1a1b3). Branch this chat: `claude/homepage-news-carousel-hdfiey`
(trash once merged — delete it).

- **Featured-news carousel** above Join The Chat: always-visible rich-pill strip
  scrolling on the Tape engine (`components/home/NewsCarousel.tsx`). Auto pills =
  live Uploaded / Graduated / Sold-Out moments (`lib/home/news.ts`, reuses
  FEED_LIFECYCLE). Curated slot wired in but EMPTY — fills from Brendon's future
  admin studio. Sprite/@name pill type built (reuses PriceSprite engine) for the
  studio/collector moments. New-stickers + ENS-subdomain ads = same rail later.
- **Pill readability:** half-opacity pill kept; text is full-strength
  `--text-color` (no opacity) + a THEME-AWARE halo — deep tint of the colorway
  behind light lettering, light tint behind dark lettering (`body.theme-bright`
  flag drives the split). Right padding +5px for even inner buffer. Scroll loop
  keyed on a content signature so parent re-renders stop resetting it.
- **Preview self-heal (real bug fixed):** stored PNG previews were pinned only by
  the minter's browser, best-effort, one-shot — an interrupted mint orphaned
  pieces forever (Noise From Below #8–22 were blank → home crawled on live
  fallback). Now: the display seam fires `pd:preview-miss`, `PreviewHealer`
  (mounted in PriceOSShell) pins a fresh deterministic render for ANY viewer;
  the pin route (`/api/preview/[slug]/[id]`) dropped the holder+auth gate (kept
  minted-token check + write-once). Backfilled the 15 missing NFB pieces via a
  headless-render script.
- **To-Dos add composer** rebuilt to the APPROVED chips (`◷ due · ◊ price · ! P1`
  + Add) with optically-centred glyphs; fits the 310px menu, no clipping
  (`styles/todos.css`).
- **CLAUDE.md Rule #-1 added** (top rule): reply INSTANTLY to every message,
  confirming receipt + understanding, before any tool/thinking.

---

## ✅ SHIPPED 2026-07-05 — To-Dos add-panel visibility + connect badge

On `dev` (4d7e588). To-Dos composer no longer washed out: solid outlines +
near-full-opacity hint text, low-alpha fills killed. Fields locked to their
original height (only the numerals enlarged). Header `+` turns red when active
(no filled box), doesn't inflate the header, hidden until the To-Dos menu is
open. Removed the clipped connect-button pings badge — the `(count)` beside the
header is the badge. CLAUDE.md **Rule #2** added: UI must be human-visible, no
default half-opacity.

**QUEUED (not built) — Pings unread behavior (Brendon, 2026-07-05):** header
`(count)` should show the TRUE unread total and tick DOWN as pings are seen; new
pings arrive fresh at the top; a ping is NOT "seen" on panel open — only once the
user SCROLLS the menu (proves they looked). Today it clears unread the instant
the panel opens. Also: Brendon wants his pings cleaned out (live data).

---

## 🔧 IN FLIGHT 2026-07-04 — SWITCH APP TO PNG THUMBNAILS (simulate Arweave via Cloudflare)

**Branch `claude/arweave-sepolia-cloudflare-yc9566` (NOT on dev yet).** THE TASK,
plainly: the app showed LIVE ARTWORK everywhere — switch it to **PNG thumbnails
instead, everywhere except the Output feature page** (which stays live). PNGs live
in Cloudflare storage, standing in for Arweave.

**DONE (committed on the branch):**
- **App seam switched.** `renderArtwork`/`paintOutput` now draw the STORED PNG
  (`${ART_IMAGE_BASE}/{slug}/{tokenId}.png`) onto the same canvas every surface
  already uses, UNLESS the caller asks for `live`. `ArtworkLive` (feature page +
  fullscreen) and the `receipt` share-card pass `live:true` → still render the
  real engine. Card fingerprint samplers skipped in image mode. Base =
  `process.env.NEXT_PUBLIC_ART_IMAGE_BASE`; empty ⇒ falls back to live render
  (safe). One seam flips the whole app.
- **All 132 projects → 222 max supply** (uniform, edited in place in the
  registry — NOT a central constant, Brendon's call). Keeps the full preview set
  inside R2's 10GB free tier (132×222×~222KB ≈ 6.2GB at 384px thumbnails).
- **CLAUDE.md §9:** PNG-only preview rule added — **WebP is banned**, ignore it
  every time.
- **Cloudflare R2 bucket `pd-art-previews` created.** Account
  `9ac4108b1b152994d7a91d4979908317`. Token "pd-art-previews" = Object Read &
  Write (Brendon holds the value; it is NOT in the repo — re-supply it next chat).
  ⚠ Public read NOT enabled — the R/W token can't (needs Admin); **Brendon flips
  public access in the dashboard**, OR serve reads through the Worker's R2 binding.
- **Supabase ZEROED (Brendon's order):** outputs/holders/events/output_views/
  pings/market rows deleted; 102 project rows reset to 0 mints + 0 stats. Verified
  empty — collection is empty, fresh-launch state. Users/artists/allowlist/
  achievements kept.

**THE REAL REMAINING WORK (next chat) — Brendon's two hard corrections:**
1. **Preview generation MUST mirror the real Arweave flow** — a deterministic
   render → store, NOT a browser-canvas snapshot. A snapshot won't work: the art
   is lazy/virtualized and isn't always painted (has to scroll to render). Figure
   out how the real Arweave preview PNG is produced (see pd-contracts — factory
   embeds `preview.png`, the ~$2 mint storage fee) and simulate THAT into the R2
   bucket at `{slug}/{tokenId}.png` when a piece mints.
2. **No bulk pre-rendering.** Brendon stopped that repeatedly — do not render the
   whole catalog. Previews come into existence per-mint, the Arweave way.
- Then: enable public read + set `NEXT_PUBLIC_ART_IMAGE_BASE` to the bucket URL →
  build → **Brendon's dev push** (app switch is merge-gated).
- `tools/simrender/` holds a proven headless renderer (real engines → PNG) — a
  rendering PRIMITIVE only, reuse if the Arweave-style mechanism needs to render
  server-side; NOT for bulk runs.

---

## ⚠ OPEN BUG (unsolved 2026-07-04) — mobile Safari notch cutoff on the CTA row

Content should flow behind the top notch/Dynamic Island; it does on page load,
but after scrolling the **CTA row** (Follow/Share on profile, Buy/List/Offer on
output — all the shared `.action-row`) shows a hard cutoff at the notch line
while the rest of the page flows behind fine. **Ruled OUT:** the `position:
sticky` on `.action-row` — removed it globally, verified live on the dev preview
CSS, cutoff persisted, reverted. So sticky is NOT the cause. Not the `is-pwa`
frosted band either (PWA-only; this is a Safari tab). Real cause still unknown —
next session start fresh, don't re-chase sticky.

---

## 🎨 SPEC DRAFTED 2026-07-04 — FACTIONS (Sigil · Marginalia · Quadrants) — Brendon sleeping on it

**No code — a spec/planning session. Nothing in flight, tree clean.** Combined
king-feature spec written to ClickUp Atlas → KING MODE SECTION → new page
**"FACTIONS (Sigil · Marginalia · Quadrants)"** (`2kyd6gx6-5994`). The
session's working name **"Dominion"** is renamed **FACTIONS**; it now unifies
three threads:
- **Sigil** = NEW opt-in art (distinct from the account-creation **PriceSprite**,
  which is universal). Making one appends Sigil options to the END of the profile
  logo carousel. Artwork stamps default to PriceSprite, upgrade to Sigil.
- **Factions = the colour.** Two tiers: **24 sub-factions** (the 28 non-holo blank
  bubbles culled by 4) rolling up into **group factions** (the colour wheel, 6 or
  12). Flag colour locked to the set. Faction toast fires ONLY on the blanks
  (not holo blank) + Sigil options; everything else silent.
- **Marginalia** = 10s ceremonial hold → MiniDisc pop-out → generative border
  (seeded from project address). Edges = PriceSprite chain (sale strikes deep /
  pass faint; 12 slots; Relic; crypt). **4 corners = faction quadrants** (bare
  until a hold-line crossed, sweep all 4 = Conquered). Worth: Pedigree/Untouched/
  Relic/Spread. Faction king layer: grip → Held/Siege/Stronghold → Conquest →
  Book of Conquests.

**OPEN CALLS (Brendon, on wake):** (1) group factions **6 or 12**; (2) **which 4**
of the 28 blanks get cut → 24; (3) toast names **sub vs group** (rec: sub).
Then it's buildable. **Nothing has been approved to build — spec only.**
Live colorway distribution (56 profiles) captured on the ClickUp page.

---

## ✅ SHIPPED 2026-07-04 — TO-DOS v1 ("Todoist in PD")

**All on `dev`, tree clean, build green.** The To-Dos feature is now real — one
store (`lib/todos/todoStore.ts` + `types.ts`, account-backed via the settings
envelope, mirrors the Notes/starred pattern) feeds every surface:
- **Connect-menu accordion** (`components/dropdown/TodosBox.tsx`) — Meta-chips
  layout (Brendon's pick): title + chips (due · ◊ price · Pn). Quick-add composer
  behind the header **+** (Brendon to re-home the +), check→✓ + strike + sink,
  priorities (P1 = red rail), live count, per-row delete, **war-chest** line
  (total ◊ earmarked across open targets), and **the Sentinel** — a BUY to-do
  with an ◊ target flips to **READY** when the piece's live listing price hits,
  read from the SAME feed the grail pins use (`starredPriceStore`).
- **Calendar + Top Bar Calendar** both read the store for dated to-dos (red dot +
  row, complete-on-tap). Bonus: the **Top Bar Calendar was also wired to the real
  `/api/calendar` EVENTS feed** (Fable had left it on the static seed).
- **Artwork "Make To-Do"** (page action row + gallery hover row) now write real
  output to-dos (deep-link back to the piece), with dedupe.
- Mock sources deleted (`mockTodos.ts`, `CAL_TODOS`, dead toasts). GLYPHS.md:
  **◊ (U+25CA)** documented as the secondary ETH mark; done glyph **✓** noted
  (device-verify on iPhone — new glyph).

Also shipped (second pass, same night): **recurring** to-dos (complete → advances
to next occurrence, ↻ chip), **labels + filter row** (`#tag`), **magic quick-add**
(`lib/todos/parse.ts` — "buy prisms 22 under .4 fri" fills everything), and
**in-app due reminders** (`components/todos/TodoReminders.tsx`, mounted in the
shell — Pingtoast when a dated to-do comes due).

**Native closed-app reminders — NOW BUILT (2026-07-04).** VAPID keys are in
Cloudflare (Brendon). Sweep = `app/api/cron/todo-reminders/route.ts` (fail-closed
on `CRON_SECRET`), dispatched every 2 min by `custom-worker.ts` alongside the
indexer reconcile, delivering via `sendTodoReminder` in `lib/push/webpush.ts`
(same subscription + Pingtoasts-mode + Silent-Mode gate as `sendNativePing`).
Stateless exactly-once (window == cadence, no prod write). Goes live once `dev`
deploys to Cloudflare + a user has 3D Pingtoasts on. v1 timing: HH:MM to-dos fire
at that time, date-only fire at `TODO_REMINDER_UTC_HOUR` (default 13:00 UTC);
per-account timezone is a future refinement.

**Still deferred — needs Brendon:** **war-chest vs-wallet line** — `useBalance`
only resolves inside the wallet provider tree; connect-menu is outside it.
Excluded: Call Your Shot, Streaks. Details in `docs/briefs/todos-feature.md`.

---

## ✅ SHIPPED 2026-07-04 — PD RARITY (Genome + 3 lenses + wow layer + Receipt)

**All on `dev`, tree clean, build green.** Output-rarity Option C, built as
**PD Rarity** (ClickUp decision `86b9f1weg` closed). Every number is computed
from a piece's REAL traits/colour/light — nothing fabricated (Brendon's bar).
- **The Genome ◎** — the +More placeholder is now a real interactive
  parameter-space map (`lib/output/genome.ts` + `components/project/GenomePanel`,
  built in the Replay widget family). Each minted piece is a point placed by its
  real trait/Fate/palette vector; **Isolation** = k-NN distance across the whole
  edition set. Deterministic, $0, calc-only (never renders art). 2-D is an honest
  random projection of the real vectors; the score runs on the true vectors.
- **Character sheet breakdown** (`lib/output/attributes.ts`): a **PD Rarity**
  headline (classic rarity blended with Isolation, glyph ❖) + three living lenses
  — **Isolation** (◎ Genome), **Attention** (✢ anoint conduit votes, added as a
  parallel count on `/api/output/[id]`), **Hand** (⌂ diamond-hands from the real
  ledger, `lib/output/hand.ts`: Original→Diamond→Held→Fresh). Classic trait
  rarities stay the default face.
- **Fingerprint v3** (`lib/output/derive.ts`): **Value Key** + **Colour Story** —
  accurate composites of the real captured scalars, gated on their data.
- **Wow layer (GenomePanel):** **Kin** (tap a piece → its nearest relatives light
  up, lines drawn; `nearestKin` in genome.ts), **Your Constellation** (your
  holdings ringed + MINE lens joins them), **live market pulse** (listed pieces
  breathe, one rAF loop).
- **Rarity Receipt** (`lib/output/receipt.ts` + `components/artwork/
  RarityReceiptButton`, at the head of the character sheet): a share card with
  the piece's canonical art rendered live (`renderArtwork`) + PD Rarity +
  Isolation + a mini-Genome position, near-black/mono/colorway per King-Mode
  card rules. Native share sheet with download fallback. `rarity.ts pdRarity()`
  is the shared headline so the card + sheet always agree.
- **ClickUp:** "The Kindred" WOW feature renamed **PriceTwin** (the wallet
  taste-twin — freed "Kin" for the piece-level Genome feature). Rarity-stance
  decision `86b9f1weg` marked complete with a shipped summary.
- This chat's task branch `claude/priceos-rarity-labs-features-buzsol` is trash
  once the work's on dev — safe to delete.
- **NEXT (not built):** fold rarity into the FULL greenlit Receipt Keeper (sale
  P&L, milestones) later; **PriceTwin** stays an Ideas-tier WOW (needs the
  indexer + nightly wallet embeddings).

---

## ✅ SHIPPED 2026-07-04 — POST-MIGRATION SPOT-EDIT BUNDLE (dev @ c5bce01)

Bot-spot-edit session, all on dev, tree clean. App changes:
- **Attributes / +More UI:** every +More section frame went dashed → solid with
  Attributes' corner radius (unified). Notable tiles: dropped the left side-bar;
  now full-opacity border + full-opacity label + italic value.
- **PriceDay popover:** "The Day" line wraps instead of clipping; popover now
  **tracks the date stamp on scroll** (was screen-pinned/floating) on all four
  surfaces (home, project, profile, artwork).
- **PriceSprite modal:** achievements header shows the full **1,000** denominator
  (secrets counted — aspirational), % after both scores, `[[ … ]]` on the total
  line, count/score on two lines, breathing room above/below. Streak + Anointment
  sub-lines split to two lines with a trailing comma on line 1.
- **Sticker Manager+ preview:** fixed doubled top/bottom buffer (box-sizing) —
  stickers sit snug + overflow slightly again.
- **Narthex** project colorway: warm gold → dark charcoal `#2A2B2F`.
- **Matrix White colorway pill** (profile egg row): was a no-op because its hex
  `#E0E0E0` equals the "unset" default sentinel, so the live repaint skipped it.
  Now paints like every other pill.
- **Account data (Brendon's own row):** zeroed all stars/wishlists/albums +
  history + showcase (they survived the project-zeroing).

Task branch `claude/bot-spot-edit-ui-mz11dk` is empty/trash (all work went
straight to dev) — safe to delete.

---

## ✅ SHIPPED 2026-07-03 — CLOUDFLARE MIGRATION LIVE. THE APP MOVED.

**dev is on Cloudflare. `https://pricediscussion.pricediscussion.workers.dev`
IS the app now** (Workers Builds: push to `dev` → production build → that URL;
side branches build as rehearsals via `npx opennextjs-cloudflare upload`).
Vercel = untouched rollback only; when Brendon declares the CF copy verified,
delete the Vercel project + uninstall its GitHub app — that's the whole cleanup.
- Shipped to dev (PR #28, merged on Brendon's push): Next 15.5/React 19.2
  (look/feel pinned), OpenNext + worker config (cron + KV cache bindings),
  CF seams (CF-Connecting-IP limiter, caches, images, worker-safe push
  signing), **indexer folded in** (webhook + reconcile routes + 2-min cron;
  dormant until `projects.contract_address` is set).
- Account side (Brendon, same day): Workers Paid $5/mo bought (payment
  needed desktop after mobile checkout failed); repo connected; secrets
  copied Vercel→CF runtime + the 3 NEXT_PUBLIC ones into Build vars;
  + CRON_SECRET. **Discord pair NOT copied** (Vercel marked them
  unreadable) — grab from Discord dev portal when Discord-link matters.
- Brendon: iPhone feels SNAPPIER than Vercel ever did. He's thrilled.
- **⛔ TOKEN PROTOCOL (Brendon, hard):** his FABLE metering is small —
  Fable sessions NEVER spawn subagents (rule now in CLAUDE.md §3). Bulk
  work → paste-ready briefs in `docs/briefs/`, Brendon runs them in fresh
  Opus 4.8 chats (Opus may use subagents).
- **NEXT — the launch-hardening bundle (ClickUp `86bar1uxr`, order set):**
  ① Desktop home-page crash (Windows+Chrome tab-crash; iPhone fine) —
  **Opus brief ready: `docs/briefs/desktop-home-crash.md`**, recon started:
  suspect = live-art canvas count on wide viewports (HomePageBody carousels
  + canvasVirtualizer). ② Wallet/auth/ENS reliability review (launch gate).
  ③ Architecture/tech-debt audit → Opus-executable briefs. ④ Snappiness
  pass. ⑤ Re-enable both pollers the CF-cheap way (cached, visible-only;
  10M req/mo included — the Vercel CPU fear doesn't transfer).
- Same day, separate session: **$PRICE deployed to MAINNET**
  (`0x173a…4638`) — recorded in CLAUDE.md §2.
- This chat's task branch `claude/cloudflare-pages-migration-wyh1z5` is
  trash once Brendon deletes it on GitHub (work is on dev).

---

## ✅ SHIPPED 2026-07-02 — SPOT EDITS + FULL CLICKUP ATLAS ACCURACY PASS

**dev @ 30ce64c, tree clean, build green.**

**App (on dev):** The Bench title in Rubik (was Courier) · grid presets now
capture the grouping dimension (project + collected) · shareable `?sort=`
slugs (turn on at the first sort tap, clean URL by default, paste-to-apply,
clears on fresh project) · Sticker store subtitle "FOR YOUR PROFILE" → "BY PD".

**ClickUp — PriceOS + API Feature Atlas, fully code-verified 2026-07-02**
(docs only, nothing in the app touched). Ran 5 parallel code-reading agents
over every surface, then rewrote each spec page against confirmed facts:
- **Master Index** rebuilt: numbered, sections alphabetical, each name links to
  its spec page, statuses read from code (LIVE / mock-data / stub / spec / idea),
  + an explicit "Not in the app" section. Art/projects/artists deliberately
  EXCLUDED (test content, per Brendon).
- Rewrote: App Shell, Global UI, Spell Book, OS Tools, Discovery, Project,
  Output, Profile, Artist, Settings, Pings, Platform Systems, Dedicated Tools,
  Showcase Engine, API Surface (34 route groups), Reconciliation. Storage / User
  State / Spec Locks / Subtraits / ID Rectangles verified accurate, left as-is.
- **Corrections found:** NOT built — Whisper, Cooling Pool, Burn Pile, Hermitage,
  Price Target, P2P-ping compose, output Genome marker, "MARKET wall." Ships but
  mock-data — Price Ghost, Incognito, Sentiment Weather, TopBar calendar events,
  Price Lens floor, Replay history, sticker buying + whole secondary market (SIM).
  Further along than notes — Celestial/Spite/Panopticon live, achievements = 1,000
  (not 281), Fingerprint v3. "Deactivate shows Invisible" bug is NOT real.
- **Deferred (Brendon's call):** Indexer + Smart-Contract ClickUp sections — their
  repos aren't attached to this session; do them in a chat with those repos in scope.

---

## ✅ SHIPPED 2026-07-02 — THE LOOP: PRICEDAY SEARCH POWERUP + DAY STORIES + REAL CALENDAR

**dev @ HEAD, tree clean, build green.** The stack Brendon named — secondary
→ completionism → PriceDay → search powerup → calendar — is now one loop.
- Search: `priceday 55` / `pd 55` / `priceday` → full inline day almanac
  (date · THE DAY · story beats · biggest sale · top mints/arrivals ·
  tallies, tappable). Engine extracted to `lib/priceday/almanac.server.ts`
  (feeds priceday route + search + calendar; days now carry `story[]`).
- Calendar REAL: `calendar_items` (applied live + in repo), `/api/calendar`
  (month = stored global+personal + AUTO milestones from projects
  uploaded/graduated/sold_out + busy-minting retrospectives (≥8 mints,
  posthumous only) + month pseudo-story on closed months). CalendarPanel:
  + composer beside the Day Note icon (personal; GLOBAL toggle for
  @brendon via handle check), deletable own items, real dots, selected-day
  column leads with PriceDay # + THE DAY. CAL_EVENTS mock still shows
  (untouched).
- Sim genesis: current epoch = sim (PRISMS as sim genesis); real reset =
  one line (`PRICEDAY_EPOCH` → first real upload), noted in the engine.

---

## ✅ SHIPPED 2026-07-02 — PRICEDAY IS REAL + THE STICKER WOW TWELVE

**dev @ HEAD, tree clean, build green.**
- **PriceDay live forever:** `/api/priceday/[n]` — any day's true happenings
  (Montreal-day window, DST-correct): real mints/uploads/biggest sale + THE
  DAY (seeded line written from the day's real numbers). `usePriceDay` hook
  (seeded fallback → live swap, per-day cache) wired into ALL FOUR built
  PriceDay modals + THE DAY section added to each. Epoch re-anchors to the
  genesis mint in one line (`PRICEDAY_EPOCH`).
- **Sticker wow, all 12:** THE PEEL (drag-to-peel sealed overlay, server
  PEEL events), SEALED % everywhere, SWAPS (escrow at propose +
  `app_sticker_swap_accept` RPC + confirm + ping), DOUBLES + LIST DOUBLES @
  FLOOR, need/have matchmaking line, GIFTING (@friend + note → wrapped XFER
  ping), WANT-list (✛ + instant WISHLIST_HIT ping on list), pack-pull =
  the peel reveal (odds panel at PDStickers), toy-shop price tags, restock
  countdown support (`SheetMeta.restockAt`, dormant), ticker leads with the
  live book. Migration `sticker_market_wow` applied live + in repo.
- **Sticker economics (Brendon):** secondary fuels primary — 100% primary,
  5% secondary royalty at the contract. The store IS the ecosystem.

---

## ✅ SHIPPED 2026-07-02 — COMPLETIONISM (outputs + stickers) + MY STICKER ALBUM

**dev @ HEAD, tree clean.** Tap your own ⬚ collected stat → COMPLETIONISM
modal (cart shell): month-by-month release checklist off the PriceDay spine
(`/api/completionism`; uploaded_at, cooldown−60d fallback), ✓/❐ checks,
COMPLETE months, rows link to projects; STICKER COMPLETIONISM section rides
the same modal. Sticker Exchange header gained ALB → MY STICKER ALBUM
(slot-per-sticker pages, dimmed missing slots, page tallies, total).
**Queued in ClickUp (Brendon loved, not yet called):** peel-gesture theatre,
sealed-% stat, sticker swaps, doubles language, need/have matchmaking,
gifting, pack-pull moments, softer market skin, restock countdowns, sticker
wishlist, live ticker quotes. Sticker angle: toy-like/game-like vs the
market-like projects side (Brendon's design note).

---

## ✅ SHIPPED 2026-07-02 — STICKER SECONDARY (in-store market, the only place it lives)

**dev @ d226c10, tree clean.** MKT toggle in the Sticker Exchange header →
the market inside the same shell: per-sheet summary (floor · ✦ best offer ·
listed/wanted/sold) → per-sheet BOOK (asks w/ BUY+qty+confirm, bids w/
SELL-into+confirm / CANCEL own, SELL + OFFER composers, duration pills,
partial fills). Server-side 1155 semantics applied live + in repo:
`sticker_holdings/listings/offers/events` + `app_sticker_buy/accept` RPCs
(escrow-on-list, same sim ETH balance). Primary sheet buys now record a
server CLAIM; pre-market device sheets claim_sync once. SALE/OFFER_ACCEPTED
pings instant. Order columns ready for the PDStickers cutover (same signed-
order pattern as the art market). Sticker trading lives ONLY here + OpenSea
post-chain (Brendon's call).

---

## ✅ SHIPPED 2026-07-02 — SECONDARY MARKET, WHOLE (Seaport order book + wow pass + PRICE STORY)

**dev @ 70733c9, tree clean. Two merges (2d35c12 core, 70733c9 wow pass).
Renders when hosting resumes.** Brendon-approved push-alls, built blind
against the paused preview.

- **Two rails, one book:** every project trades SIM today; setting
  `projects.contract_address` flips THAT project to real Seaport trading —
  same UI, same tables, same pings. Listings = signed orders (ETH, royalty
  5%→splitter enforced IN the order at post time); offers = WETH
  (auto-wrap), item/collection/TRAIT scopes (criteria orders, merkle for
  traits, identifiers server-derived); fills client-side, indexer
  authoritative; optimistic book-close + instant pings via our routes.
- **Schema (applied live + in repo):** listings/offers gained order fields
  (order_hash/json, start/end, currency, source, scope, criteria, tx_hash)
  + `offers.resolved_at` + `listings.listed_at` (full offer lifecycle — the
  Atlas sweep found ~20 planned features need exactly that history);
  `projects.royalty_receiver` cache; sim RPCs expiry-aware + criteria
  accept RPC; COUNTER ping kind. Engine: @opensea/seaport-js + ethers,
  DYNAMIC IMPORT only (main bundle unchanged, engine is its own chunk).
  TS target ES2017→ES2020 (typecheck floor only).
- **Surfaces:** artwork page + modal CTAs live (list w/ duration sheet,
  unlist, offer); ✦ offers pill → offers panel (accept w/ confirm card,
  decline, cancel, COUNTER w/ inline price → re-list + COUNTER ping);
  ✹ EDIT pill (price-in-place; chain raise cancels old order first);
  batch List/Re-List + Make Offer in all three ms bars (one signature);
  TRAIT OFFER = 1-selected general tool (full trait sheet picker) + ✦
  chips on attribute tiles + StarredList + wishlist rows; trait pills
  show standing bids (✦ amount); real sweep (sim RPC + one Seaport tx,
  confirm card); Fill Budget (active budget → cheapest listed → cart);
  ping rows are links (offer family lands with panel open); floor
  thermometer, sheet context line, spread readout, N-pieces-match.
- **PRICE STORY (signature feature):** `/api/output/[id]/story` +
  `/api/project/[slug]/story` — market-biography chapters from the real
  ledger (Birth → First Light → Courtship w/ offer fates → First Sale →
  Peak → Quiet → Today; project: Genesis → First Blood → Graduated →
  Ascension → First Trade → Peak → Today), deterministic seeded prose,
  canonical glyphs, one panel renders both (+More ▸ Price Story tabs).
- **+More fills (attributes-box or replay-plain only):** OFFERS books
  (output + project), THE MARKET wall (AttrWall tiles: floor/last/ATH/
  volume/ask/best offer/spread/sales), SENTIMENT (ledger-honest labels,
  `/api/project/[slug]/sentiment` also feeds REAL ATH & HOLDERS +
  percent-listed tiles — were mock). Existing Seal/Disagreement/Genome
  cards untouched. Expiry-aware floor/search/reads everywhere.
- **ClickUp:** offer-infra task `86b9fbrx9` commented (shipped + the two
  deferred: OpenSea API cross-post/ingest when key lands; listing-expiry
  pings need the scheduled-job rail at Cloudflare cutover).
- **NEXT:** Brendon queue — sticker-store secondary scoping (discussion
  first), Discord sales/listings feeds (later; tail our ledger tables).
  At Sepolia: first real fill smoke test. Wagmi chain profile is env-gated
  (`NEXT_PUBLIC_CHAIN_ID=11155111` per the test-phase spec).

---

## ✅ SHIPPED 2026-07-02 — GLOBAL SEARCH IS REAL (the whole thing, Brendon-approved, on dev)

**dev @ 4c1eb91, tree clean. Renders when hosting resumes (Vercel paused;
Cloudflare Pages move planned "a day or two" from 07-02).** Four pushes,
each on Brendon's explicit go:

- **Search v1** — the dropdown placeholder became real sectioned search
  (`app/api/search` + `lib/search/parse` + GlobalSearchBar): PROJECTS /
  COLLECTORS / OUTPUTS, natural-language visual search over the stored
  fingerprint (colour/mood/bands live on all ~1,600 pieces; Reads-As
  scene sentences populate on view post-deploy), True Names, collector
  rows = PriceSprite + @name + ⬚⟠⚬ stats (NO ID Rectangle — Brendon
  reformatted it out), history-aware ordering via breadcrumbs.
- **Search v2** — the power grammar (`by:` `project:` `holder:` `color:`
  `mood:` `listed/sold/offers` `under:/over:` `sort:` `followers:>n`
  `sun:`), inline answers (floor/volume/ath/who-holds/spent), Enter=go,
  PAGES nav ("home"/"artists"/"settings"…), live 36px art thumbnails,
  SOUNDTRACKS + TRAITS sections, typo forgiveness (edit-distance
  fallback), `+N more` expanders, RECENTLY VIEWED / NOW MINTING empty
  state + syntax hint, `search_log` table (service-role only; migration
  applied live + in repo).
- **Nomenclature** — results say OUTPUTS (locked noun, never "Artworks");
  `porsche`/`odin`/`thor` added to reserved handles (T2).
- **The side door** — type a certain word (FNV-1a-hashed trigger,
  1562394851 — never in the bundle) → LED-handheld 3-lane runner in the
  results box (`components/dropdown/LaneRunner.tsx`). Tap-a-lane, 911
  hero with clear headlights, cartoon hazards (oil slides you, cones/
  potholes = WIPEOUT), human pace (520→240ms/row), milestone moments
  (LUCKY 22 ♧ · NIGHT SHIFT 50 · CENTURY Ⅽ · HOTHURT 111 · HALO ⬭ 777).
- **ClickUp:** feature-reference doc for user docs (`2kyd6gx6-1214`) +
  follow-up task `86baq897j` (post-resume: fingerprint backfill sweep,
  verify on dev preview, watch search_log).

**Next session:** when hosting is live — run the fingerprint backfill
sweep (scene sentences → "two yellow circles" works everywhere), verify
search on the real dev preview mobile-first, then the Cloudflare cutover
work per the parked plan. Local-dev note: search verified end-to-end via
local prod build + Playwright (dev-login), screenshots in-session.

---

## ⛔ LOCKED 2026-07-02 — THE INDEXER = $0 ALCHEMY SERVERLESS. PONDER/RAILWAY IS DEAD. DOCS ARE FOR USERS.

**(Brendon, raised in anger after TWO sessions grabbed the wrong indexer —
including the fix round below, which went to the dead code.)**
- **THE indexer** = serverless Alchemy webhook → app route → Supabase +
  reconcile sweep. **$0. No Railway — never set up, pay for, or mention it.**
  Lives on indexer-repo branch `claude/indexer-alchemy-setup-tuezqu` (do NOT
  delete); go-live in its `docs/HANDOFF.md`. Indexer-repo **`main` = dead
  Ponder/Railway code** — ⛔ banner now in its README; never touch it.
- Locked everywhere a session can enter: **CLAUDE.md §2 banner + §5 docs
  rule · indexer `main` README banner · ClickUp bootstrap page top lock ·
  ClickUp "Indexer Architecture" doc retitled ⛔ SUPERSEDED · Sepolia test
  phase doc rewritten (Phase B = webhook, not Railway).**
- **Docs are DRAFT FOR USERS, not for Claude (Brendon, verbatim).** PD-Docs
  AND ClickUp content/architecture write-ups: never source current
  architecture/status from a Doc body. Truth = code + specs → CLAUDE.md →
  WIP → ClickUp tasks.
- **Fallout from the fix round below:** the app-side + DB fixes all stand
  (architecture-independent — contract_address, cutover guard, pings, API
  auth, social graph, wallet-volume trigger). The indexer-repo commit on
  `main` is donor code only. Railway-Postgres console tap is VOID
  (corrected in the assigned comment on `86b9v5w77`).
- **Railway leftover discovered + neutralized (same night):** a Railway
  service is STILL wired to the indexer repo (project "exquisite-caring")
  and auto-deploys every push to its `main` — the session's pushes woke it,
  Ponder OOM-crashed, crash emails hit Brendon. `main`'s railway.json now
  idles instead of running anything (no crashes, no emails, ~zero usage).
  **Brendon's tap: DELETE that Railway service** — under the serverless
  plan Railway shouldn't exist at all. Until deleted, do NOT push to the
  indexer repo more than necessary (every push = a Railway deploy).
- **✅ REAL indexer fixed same day (ClickUp `86baq7mcz` complete).** Full
  review of the rebuild branch run (06-29 hardening holds: replay-gated
  counting, null→set volume booking, HMAC, fail-closed cron, fault
  isolation), then the three gaps fixed + pushed (ebbfcf3, typecheck
  clean): address→slug bridge over `projects.contract_address` (tracked
  cache was slug-keyed — dropped every event; sweep fed slugs to
  eth_getLogs), per-token sale enrichment (tx-only match mispriced
  sweeps), and on-chain SALE→seller + artist MINT-milestone pings
  (spec/README/handoff updated — the "notifications trigger" they
  described never existed live). Go-live unchanged: paste the contract
  address onto the projects row.

## ✅ SHIPPED 2026-07-02 — LAUNCH-READINESS FIX ROUND (API · indexer · pings · social)

**On `dev` (de4c2de) + indexer `main` (1ac5e2c), trees clean. Renders when
hosting resumes (Vercel still paused — no deploy since 06-27; July pushes
build on resume).** Full pipeline review (4 parallel reviewers, findings
re-verified in code), then Brendon's "fix all of these and push":
- **Pings:** 23505-recovery bump now ignores the 6h window (unread rollup
  older than the window silently ate every new OFFER); wishlist fan-out via
  new `app_ping_wishlist_fanout` RPC (per-row upsert — one duplicate no
  longer kills a 500-row chunk; bumps count + resurfaces instead). RPC
  smoke-tested live (insert→bump→cleanup).
- **API:** `outputs/color` + `outputs/traits` now requireAuth (were
  unauthenticated service-role writes — anyone could rewrite every token's
  stored fingerprint); color validates the project. Middleware: sensitive
  bucket is method-aware — follow-surface GETs ride the normal bucket (a
  profile page could 429 itself), writes keep 15/min; output-follows +
  outputs writes added.
- **Social graph:** relation mode (`?viewer=`) on all three follow reads —
  buttons/useArtistSocial check the single edge instead of downloading
  capped lists (wrong state past 1000 followers); exact counts via count
  queries; lists explicitly capped, newest-first; parallel arrays derived
  from one filtered pair list (modal zip desync). Re-follow = true no-op
  (no created_at reset, NO re-fired ping — spam vector closed; clients
  accept the 200). `follows` rows now write BOTH address columns (rename
  trigger/cascades/self-follow CHECK alive); 23 existing rows backfilled;
  `follows(following_name)` index added.
- **Indexer (was NOT launch-ready — my earlier standalone OK missed it):**
  `projects.contract_address` = address→slug bridge + per-project cutover
  flag (set it ⇒ indexer maps the contract, app sim mint/market REFUSES that
  slug). Handlers write slugs; aggregates fire only on fresh event rows
  (replays no longer double-count); sale enrichment per (tx, project,
  token) returning rowcount (sweeps + matchOrders can't double volume);
  on-chain SALE pings the seller + artist MINT-milestone pings (mirrors app
  semantics, PD-users only, mutes respected); wallets volume trigger on
  price-UPDATE (sql/0005, applied live); DATABASE_URL documented/required,
  /health healthcheck + always-restart, start-block "" guard.
- **Migrations applied live:** app_ping_wishlist_fanout ·
  follows_index_and_address_backfill · projects_contract_address ·
  wallet_volume_on_enrichment.
- **Brendon console taps (assigned ClickUp comment on 86b9v5w77):**
  ① Vercel: confirm UPSTASH_REDIS_REST_URL/TOKEN set (else prod rate limiter
  is per-instance only). ② Railway (at indexer go-live): Postgres +
  DATABASE_URL. ③ At Sepolia deploy: paste each collection's contract
  address into its projects row — that IS the cutover switch.
- **Deferred (known, not fixed — smaller):** pings cursor-pagination
  duplicate (client never paginates), broadcast-feed URL-length cliff for
  huge follow graphs (→ RPC later), OUTPUT_FOLLOW retention tier, /api/stats
  full-table aggregation at scale, ProjectCreated factory auto-discovery +
  Minted tokenHash ingestion (needed before real Sepolia drops at volume).

## ✅ SHIPPED 2026-07-02 — ACHIEVEMENTS 1000 + the two-year Mjölnir wall + LEADERBOARD

**On `dev` (2cc7d9f), tree clean. Renders when hosting resumes (Vercel paused).**
- **LEADERBOARD (same session, second approval):** tap the PriceRank medallion
  in the PriceSprite modal → Top-100 popup on the Followers Manager compact
  shell (fm-row treatment verbatim): position · PriceSprite+@name
  (CollectedPair) · PriceScore ◍. Own row highlighted (.lb-me). New
  `GET /api/leaderboard` (anon RLS; named + scored accounts only; ties → older
  account). New modal name `leaderboard` in ModalContext; mounted in the shell.
  **Stats columns deliberately deferred** — queued as ClickUp `86baq4g03`
  (Ideas), which also notes: wiring `leaderboard.bestRank` persistence later
  makes the dormant leaderboard/season achievements live → re-run the verifier,
  Mjölnir wall re-tunes.
- **Catalog is EXACTLY 1,000** (was 281) across 6 modules: core + ladders +
  **myth** (NEW — the Odin arc, 15 rows, hinted-not-hardcore per Brendon; new
  MYTH wall section, glyph ⍟ shared with Stargazing, noted in GLYPHS.md) +
  **numbers** (88 deadpan token eggs, contract range 22–9999, + the engine's
  dormant math predicates) + **depth** (575 dense ladders, every family) +
  **tenure** (40 — the calendar spine). Zero engine changes — all existing
  trigger paths.
- **`tools/achievements/verify.js` — run after ANY catalog edit.** Proves:
  exactly 1000 · unique ids · no 666 · only Mjölnir (+world_first) ≥1000 pts ·
  token range · **THE TWO-YEAR WALL** (max safe score at day 729 < Mjölnir ≤
  day 730). Loads the real TS modules; gameable prefixes parsed from engine.
- **Mjölnir = score 186,000** (was 10,000). The 730-day tenure block (850-pt
  "Two-Year Oath" + 2-year anniversary) is the wall — un-buyable early.
  **RANK_TIERS re-spread** to the ~215k economy (Apex 120,000). ⚠ When dead
  paths go live later (leaderboard/seasons, offer-accept linkage, identity/
  client eggs), re-run the verifier — the wall band shifts and Mjölnir's
  threshold gets re-tuned then (nobody will have it yet; safe).
- **Sub-#22 eggs retargeted** (contracts floor is #22): The One → Firstborn
  (#22, deliberately shares Lucky 22's trigger — double pop), Master Number →
  #1818.
- **Pop spam fixed** (PriceRankSync): >3 unlocks at once = biggest one by name
  + one "N MORE UNLOCKED" summary toast. ≤3 unchanged (staggered).
- **PriceSprite modal**: NEW **PRICESTREAK** row (current run / best /
  activation hint — anoint-socket treatment, ◈); achievements rail now browses
  **one category at a time** via a pill row (glyph + label + done/total);
  category maps exported from AchievementsGrid (single source).
- Streak criteria confirmed already-built to Brendon's spec (real actions
  only, never logins; 60-day activation; gameable-capped so unfakeable at
  rank level). ClickUp "FEATURE · The Streak" (86b9erg8f) commented with
  status; task stays open for the bigger feature (calendar view etc.).
- This chat's task branch `claude/achievements-system-overhaul-et1hvo` is
  trash once Brendon deletes it on GitHub (work is on dev).

## ✅ SHIPPED 2026-07-01 — NPC round 2: actions + convergence + Fingerprint v3 + mute

**On `dev` (ed65e91), tree clean. Same session as round 1 below.**
- **Fingerprint v3 — the QUANTITATIVE read (Brendon: humans notice counts,
  not adjectives).** `lib/art/scene.ts` + a 48×48 connected-region pass in
  the sampler: distinct colour shapes (circle/square/bar/shape), arrangement
  (stripes/field/scatter), and the generated human sentence ("two blue
  squares and a yellow circle"). Leads the attribute wall as **Reads As**;
  stored on `outputs` (scene, shape_count, pattern, shapes jsonb — migration
  20260701_outputs_fingerprint_v3 APPLIED live). Brendon flagged: feeds
  future natural-language site search + shape-based groupings.
- **NPC actions (`lib/npc/actions.ts`).** One tap in ToastContext classifies
  EVERY toast into typed action events — star/wishlist/cart/bench/grail/
  album/todo/note/follow/mint/buy/sell/list/offer/sweep/colorway/achievement/
  zen. Director priority 0: the couch pounces in ~2–5s (per-kind 45s
  cooldowns; counts accumulate → "{n} today" lines). Convergence gates
  (action × sight × session facts). Couch scenes for big moves. Wishlist
  arms buy bets → resolved on mint/buy (hit by the caller, miss read into
  the record by a neighbour).
- **Duet composer** — topic-tagged openers × matched replies assemble into
  whole scenes; with template fills the bank now plays out in the THOUSANDS
  of distinct moments, all pre-written, all through the no-repeat ledger.
- **Favourites form** — every distinct viewed piece scores each resident's
  taste (fp-based); a clear leader ADOPTS you (persisted): announcement
  scene once, loyalty lines after (rare, cooldown).
- **Once-EVER Familiar crossover** (persisted flag) — the cast notices your
  familiar by species name. **Familiar witnesses mints** live via the same
  action bus, naming the piece (once per piece; tier-voiced pools).
- **Per-resident MUTE (Brendon approved the how).** Long-press a bubble
  ~0.7s → muted (persisted; hidden mid-scene; filtered everywhere by riding
  the busy set). Window-level hit-test — the cast keeps pointer-events:none,
  nothing is ever click-blocked. Survivors react ("They muted him."
  "…Lucky."); the cast spills the mechanic themselves (couch scenes). NPC
  spell off→on clears all mutes (the reset, no UI).

## ✅ SHIPPED 2026-07-01 — NPC Cast writers' room + Fingerprint v2 + Familiar 100

**On `dev` (46dbcff), tree clean. Renders when hosting resumes (Vercel paused).**
- **NPC Cast awareness layer BUILT (ClickUp 86b9fcp11, rungs 1–4).** New
  `lib/npc/{scenarios,director,memory,inview}.ts`: the cast SEES the piece on
  screen (live pixel sample published from the artwork page) and reacts through
  each locked lens; multi-beat exchanges; colour streaks; revisits; predictions
  w/ hit-miss callbacks (misses read out by a neighbour); idle boredom; pacing;
  cold opens w/ cross-session memory (localStorage — sessions, last obsession,
  ~400-line no-repeat ledger); theme-flip + late-night reactions; rare direct
  address; once-a-session fourth-wall jolt (names the real piece). Cadence is
  scene-based (14–90s lulls, quick reaction when a new piece appears). REACTIVE
  FIRST (Brendon): gossiping audience, not companion. Bubble "butt" FIXED
  (binary-search exact-hug width; old rect-measure over-reported on wraps —
  widthAdjust hack removed); bubbles 16→15px, cap 168→152; entrance anims
  polished per character; Romy → serif italic, Mimi → sans bold italic (Mick
  untouched).
- **Fingerprint v2 (feature name: Fingerprint).** Sampler reads 8 new axes in
  the same 24×24 pass: accent colour, palette count, contrast, measured warmth,
  gravity, symmetry, air, texture. Persisted on `outputs` (migration
  20260701_outputs_fingerprint_v2 APPLIED to live Supabase — additive) +
  denormalised bands; attributes "Form" group renamed **Fingerprint** and now a
  wall of tiles; scalars stored for future sort groupings beyond dominant
  colour.
- **Digital Familiar → 100** (40 BitDaemons / 24 Titans / 20 Ascended / 16 Old
  Gods): 29 new creatures, ALL 100 animated + unique personas (Ghibli-ensemble
  register — bubbly Navi-ish little ones, gentle-giant Titans, luminous
  Ascended spirits, Mononoke forest-god Old Gods). Companion cadence: idle
  moments are half gestures/italic thoughts, 28–55s spacing. Omniscience v2:
  total spent/earned, boldest buy, lightning flips, never-sold, favourite
  project, minting-day + after-midnight habits, first move ever.
- NOTE: this container's local `dev` was WEEKS stale on checkout — fixed via
  `git checkout -B dev origin/dev` before the merge. Future sessions: verify
  local dev matches origin before merging.

## ✅ SHIPPED 2026-07-01 — Sepolia contract candidates FINAL + /deploy launcher (Fable 5)

**pd-contracts `main` is the Sepolia deploy candidate — 284 tests green.**
Shipped: Output range **22–9,999**; all three audit-backlog hardening items
closed (assembly differential-fuzz-proven, strict UTF-8 metadata gate, size
caps — name/symbol 50 per locked naming policy / description 1,024 / chunks 32);
**previews back to Arweave** (Brendon's call — pre-May audited design restored,
art stays 100% on-chain); **PDStickers v2 rewrite**: sealed sheets + peel
(sealed stack on OpenSea; peel burns → delivers), FIXED default + PACK random
pulls (peel-time draw, project-mint entropy, EOA-only, capped rares drop out,
open-edition floor so packs can't brick), per-sheet collab splits on primary AND
5% royalty (StickerSplitter vaults), zero custody, repriceable, restockable,
1–99/sheet. **Cooldown stays hardcoded 60 days — SPEC (Brendon, hard): the
chastity belt is never a parameter; a deploy-param version was shipped
un-asked and REVERTED. Do not reintroduce.**

**PriceOS dev:** `/deploy` — phone-first Sepolia launcher (Rainbow/WalletConnect,
page-local Sepolia-only wallet stack; registry → factory → wire → stickers, four
taps; embedded bytecode = the proven build). NOT visible yet: Vercel paused
(free-tier CPU cap) — NOTHING pushed to dev has built since 06-27; renders when
hosting resumes or lands with the Cloudflare cutover.

**Indexer:** serverless build (branch `claude/indexer-alchemy-setup-tuezqu`)
re-verified against the finals — **code-ready, zero edits**; go-live is
operational only and rides the Cloudflare migration (see parked block below).
NOTE: repo `main`'s Ponder code is HISTORICAL — never build on it.

**NEXT / waiting on Brendon:** Sepolia ETH (Google Cloud faucet or
sepolia-faucet.pk910.de, ~0.05–0.1 needed) → deploy (via /deploy when hosting
is back, or Remix). Queued in ClickUp: bulk-create ~100-project test catalog
(86baq09e9 — BLOCKED on Brendon's approach call: one throwaway whitelisted
wallet per project, cooldown untouched), studio + stickerstudio sites, indexer
stickers surface. Discord-ready contract synopsis lives in this session's chat.

## ✅ SHIPPED 2026-07-01 — HALO cohort (12 surreal projects, across -ai artists)

Opus 4.8 build over ~24h of tokens. A 12-way tournament (4-lens jury seeding +
3-juror bracket) of surreal "real-but-off" systems, each a CONTINUOUS seed-driven
engine with its own distinct palette world (hard variance pass killed preset
pseudo-dupes; proven at 16 outputs each). Champion **NARTHEX** (a freestanding
dusk arch framing another world; signature colorway **Grail** #FFC24A + Hiroshi
Yoshimura *Music for Nine Post Cards*), runner-up **Evening Rooms**. ALL 12 kept,
assigned to -ai artists WITH real DB wallets by style: narthex/veil, secondsun/
filament, slacktide/fathom, appointment/umbra, cabinet/lapidary, overcast/murmur,
stillrain/deepend, papercountry/graincount, ballast/stellar, saltmirror/flatsea,
eveningrooms/afterhours, vestment/glyphfield. (5 reassigned off registry-only
handles that had no DB identity.) Ported to lib/art/engines + registered (256 ed.
ea, 333 Narthex, 0 mint). Supabase `projects` rows inserted for all 12 @ 0 mints.
Build green; on dev (f7b9ebb). R&D: tools/halo/h4_*.js + jury/tournament workflow
scripts. Losers all kept. COMPLETE.

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

### 🔗 INDEXER RIDES THIS MIGRATION (added 2026-07-01)
- The serverless indexer (Alchemy webhook → API route → Supabase; branch
  `claude/indexer-alchemy-setup-tuezqu` in PriceOS-indexer) is **code-ready and
  verified against the final Sepolia-candidate contracts — zero edits needed.**
  Its fold-in was already deferred to this cutover (Brendon, 2026-06-29), so the
  migration session ALSO lands: the two transplant routes, the scheduled
  reconcile sweep on Cloudflare's cron equivalent (Vercel cron entry never
  ships), and the indexer env vars on Cloudflare. ClickUp: `86baq097e`.
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
