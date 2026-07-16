# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

0. ✅ **2026-07-16 THE SIX-SHIP MARATHON — ALL on dev (tip `b7d6343`),
   auto-deployed, tree clean. Branch
   `claude/showcase-celestial-npc-passes-tfy9io` = merged trash (Brendon
   deletes).** One Fable session, six approved ships, in dev order:
   ① SHOWCASE + CELESTIAL + NPC round: Gen Curated wow (5 new recipe kinds
   incl. moon-phase/crown-jewels; FIXED Generative-never-shuffled-own-profile
   bug; ⑈ placard is DISPLAY-ONLY — fresh set per tab entry, Brendon's call);
   Celestial revamp (phase-TRUE lunarGlyph moons everywhere, clean 12px chip
   row on Output titles, project names wear the BARE hexagram — no word, no
   ☉☽↑ row, both Brendon's calls; card moon breathes); NPC menu awareness
   (~90 surface lines — Composer/Cartography/Spite Book/Friend Inspector/
   Tarot/Forge/etc; Celestia notices Celestial Tracker + Stargazing once per
   session; Dispatch glances; variety pass).
   ② WORKSPACES: defaults are WORK personas — Main · Zen · Appraiser ·
   Trader · Curator · Scout (`lib/state/workspaceDefaults.ts` = the shipped
   set + seed-version pass so existing users receive new dots once; high ids
   101+; load flourishes). ⛔ TOP-BAR RULE test-guarded: defaults never carry
   TBCL/HMMR/PLGO/ANON (tape IS fine — "low enough"); dead/consent-gated
   tokens banned everywhere (MOOD/ASTR/PRTL/FLAR/GRAV/SYBN/ARBT/PURL/PURD/
   INVS/PNOP). SPACES preset shelf in the create-workspace sheet (12 moods
   incl. retired Degen + the demoted Observatory/Museum/Village; no
   restrictions by Brendon's order); value-prompt sheet grew an optional
   single-select chip row (reusable). SETUP CODES proven 100%: 500-state
   fuzz roundtrip test + legacy ARTS token decode (tests/setup-code.test.ts
   + tests/workspace-defaults.test.ts).
   ③ AURA wow: halo = the piece's OWN sampled colours; rarity scales
   glow/reach; per-card breathing; rainbow fallback until colours hydrate.
   ④ LANE RUNNER revamp: logo L rebuilt (no more "Tane"); frame NEVER
   resizes mid-run (fixed 2-line status + hint); ONE lane per tap; odometer
   counts every other row + density ramps with depth (night 50 is a feat);
   8 stages (new: mile markers 100 · stanchions 1000 · blooms 1200 — PD
   milestone numbers); LED-padded score, spinout, deep-road tints, pauses
   while tab hidden.
   ⑤ CALENDAR SHEET: the + opens THE DAY as a modal (Workflows shell) —
   view (day nav ‹›, PriceDay, schedule, note, to-dos) + edit (builder,
   items now UPDATABLE). Calendar↔pings fine control: per-item `remind`
   column (off/attime/15m/1h/1d — migration `20260716_calendar_remind`
   APPLIED to live DB + mirrored, zero rows affected) with a lead-aware
   sweep (walks today+tomorrow) + per-account GLOBAL SCHEDULE PINGS switch
   (users.calendar_state.globalPings, read by the sweep).
   ⑥ ALBUMS: THE buffer bug KILLED — root cause was a CLASS COLLISION: the
   profile wall's `.albums-grid` name is owned by the project page's legacy
   albums tab in globals.css (padding 10px 40px / 20px mobile sides) — why
   every prior fix to styles/albums.css failed. Profile wall renamed
   `.albums-covers` (never rename back; pixel-proven vs compiled CSS:
   tile left 40→20px, +20px width). Square corners everywhere (Brendon).
   WOW: LIVING COVERS (mosaic cells drift through the whole membership,
   staggered crossfades; chosen covers stay still) + staggered piece
   entrances.
   **Notes for future sessions:** container HAS Playwright+Chromium at
   /opt/pw-browsers — static-harness pixel proofs against compiled CSS work
   great (the albums proof pattern). ClickUp: nothing closed/queued — the
   whole session was ad-hoc chat batches with no tasks of record.

0. ✅ **2026-07-16 THE PROJECT GNOME — figure + behaviours + wow pass ALL on
   dev (tip `eaa8fc9`), auto-deployed, tree clean. Branch
   `claude/gnome-build-r90zyr` = merged trash (Brendon deletes).**
   Fable session, full arc in one chat. ① THE FIGURE: `lib/project/gnome.ts`
   (embedded gen-art engine — deterministic per slug, True Name/Fate
   discipline; name · temperament · 5 hats/patch · 5 beards · 6 keepsakes ·
   girth/nose/tones · 0–3 hoard gems; **draw order = frozen contract, never
   reorder**) + `GnomePanel` (layered SVG, Replay/Genome card family).
   Hat+tunic wear the LIVE colorway (re-dresses on `pd:custom-color-changed`;
   creature never re-rolls). ② BEHAVIOURS (Brendon's picks from the ideas
   round): GREETINGS (tap → in-temperament speech bubble; stranger/holder/
   favoured tiers, seeded rotation — `lib/project/gnomeVoice.ts`) · MARKET
   MOOD (brows/pace/readout from page state, $0: mining / wary >20% listed /
   content) · FAVOUR→APPRAISER (`/api/project/[slug]/gnome`: favour = held
   ≥7d unbroken + unlisted; the keeper writes a true-facts-only case —
   isolation rank, one-of-one, early strike, Fate, strike date, door price,
   tenure — seeded stable per piece; honest progress line otherwise). ③ WOW:
   favoured-friend greeting tier, piece-picker pills, bubble tail + tap hop,
   per-slug breath/blink phase. Proof-sheeted mid-tone + dark via headless
   Chromium (container HAS Playwright+Chromium — /opt/pw-browsers).
   ClickUp: `86bafffka` + `86baka0hc` closed; umbrella `86baka0v2` holds the
   unbuilt idea pool (night watch, hoard recital, lore narrator, fool's gold,
   sightings, birthday, kin) for Brendon's next picks.

0. ✅ **2026-07-16 DISPATCH + PRICEDAY WOW PASS — on dev `f8463bd`,
   auto-deployed, tree clean.** Same Fable session as the Gossip ship.
   The Dispatch + almanac writing engines rebuilt on one voice kit
   (`lib/dispatch/voice.ts`): ~10× phrase pools; Dispatch uses ROTATION
   MEMORY (editions store `voice.used`; builder reads last 120 editions,
   LRU fallback — sim-verified repeat gap == pool size); almanac uses the
   stateless day-walk (`walkPick` — consecutive PriceDays guaranteed
   different lines; also killed the old picker bug that always chose
   option one, so calendar/PriceDay prose never varied). New data-gated
   desks: MARKET DESK (deltas/streaks/records vs archive) · PERSONS OF
   INTEREST · NUMBER OF THE DAY · ON THIS DAY (self-archive quotes) ·
   THE WEEK BRIEFLY (Sun) · odometer milestones in NOTED (≤10-multiples
   guard). Editions now store `tallies` + `voice`; old rows parse + render
   untouched (`desks` optional in DispatchPage). Smoke-verified read-only
   vs live ledger. New engine prints from tomorrow's 9AM edition.
   Newsletter digest already 3×/month (1st/11th/22nd) — Brendon confirmed
   cadence, no change. ClickUp `86b9fcn0d` commented.

0. ✅ **2026-07-16 GOSSIP PROTOCOL — on dev `cf0cdb2`, auto-deployed, tree
   clean. Branch `claude/gossip-protocol-build-936rtf` = merged trash (Brendon
   deletes).** Fable session. The ⑃ spell is real: when on, the ONE shared
   feed sentence (`FeedActorLine`) is told as a plain-English rumor —
   `lib/feed/gossip.tsx` template engine, 28 tellings (7 per event kind),
   seeded per event id so a row keeps its rumor across renders + surfaces.
   Project feed · profile feed · artwork page feed · Starred Tx rows all
   inherit; actor link (Spite treatment), token link, exact price preserved.
   Tribunal deliberately untouched (court record stays sworn). Cast toast
   "⑃ Rumor Has It… ⑃" (Cartel/Celestial precedent), plain OFF. Atlas Spell
   Book page refreshed (build-state now truth: 07-16 ships live, Gravity =
   ????); comment on `86bad5g4t`. **Spell stubs remaining: Sybil Net ·
   Arbitrage Map.** ⚠ Container note: this env's local `dev` was a stale
   unrelated snapshot — real dev is `origin/dev`; reset local dev onto it
   before merging (already handled this session).

0. ✅ **2026-07-16 SPELL BOOK BUILD-OUT — all on dev, auto-deployed, tree clean.
   Tip `1ba8ed1`. Branch `claude/tribunal-feature-s7dj1k` = merged trash (Brendon
   deletes).** Opus session — turning Spell Book stubs into real features
   (ClickUp `86bad5g4t`):
   ① **TRIBUNAL** — the Output +More gains a spell-gated "Tribunal" pill: an
   inline case file (Chain of Custody · The Money · On the Block · Standing
   Offers) built from the ledger + market already on the page; missing strands
   (past/withdrawn offers, view history) named OFF THE RECORD, not faked.
   `components/artwork/TribunalPanel.tsx` + `styles/tribunal.css`.
   ② **GRAVITY** pill → icon-less **"????"** mystery button (fires a "????"
   toast, never toggles — its coming-soon stub, reframed).
   ③ **DEACTIVATE** (spell_invisible) = "public ragequit, secretly still active",
   BOTH halves: (a) a visitor to a deactivated profile sees an understated
   IG-style "account deactivated" shell — server-derived from the owner's own
   saved setting, NO schema change (`getUserProfileByHandle` returns
   `deactivated`); owner still sees their real profile + a small cue. (b)
   presence drop-out — you stop broadcasting to the Panopticon overlay + Audience
   counts (one-way glass, still see the room). `styles/deactivated.css`.
   ④ **TAROT SPREAD** — the pill opens a themed reading modal
   (`TarotSpreadModal.tsx`, Spite Book precedent): 3 real Major Arcana
   (`lib/data/tarot.ts`) into Past/Present/Future, each wearing one of your
   Collected pieces as its face, real upright/reversed meanings + a woven read
   (`lib/tarot/reading.ts`), deterministic per local day + re-roll. **Gated at 22
   collected** (below = a face-down "the cards aren't ready · N/22" unlock).
   `styles/tarot.css`.
   ⑤ **GEN CURATED SHOWCASE gated at 100** — the MY PD showcase-style cycle skips
   Gen Curated below 100 with a "Gen Curated: N/100 TO UNLOCK" toast; backed by a
   light count endpoint `app/api/user/[address]/count`.
   ⑥ **ECHO CHAMBER** — recon found it's ALREADY LIVE (not a stub): mutuals-only
   filter on pings + the artists list via `body.echo-mode` CSS. Only change: its
   toast now reads **"MUTUALS ONLY"** on (explains itself).
   ⑦ **OFFER SHIELD** — when on, incoming offers under **50% of the collection
   floor** are hidden from Pings (`lib/pings/useOfferShield.ts` + `PingsBox.tsx`;
   floor from a new light endpoint `app/api/project/[slug]/floor`, fail-open so it
   can never eat a real ping). Plus a little **"ward goes up"** cast flourish on
   activation (`components/OfferShieldCast.tsx`, `.shield-cast`).
   ⑧ **OUTPUT STATS tab** — FLOOR now real (live lowest active listing, computed
   in the output market read — was a stale `projects.floor_price_eth` cache); the
   cramped top row redone as **tiles** (Holding · Sentiment · Anchor) matching the
   Market wall via AttrWall; the **⚓ Anchor is real here** now (opens the D17
   reference-price prompt, collection-keyed — was a coming-soon stub). ⚠ Sentiment
   tile wears **∿** (a picked mark — no canonical sentiment glyph existed;
   Brendon's iconography call to keep/swap).
   ⑨ Mobile-only Spell Book icon nudges (Price Ghost/Tarot/The Watch) + a
   `.claude` MCP allowlist (ClickUp/Supabase/Cloudflare/GitHub).
   **STILL STUB (not built this session):** Sybil Net · Gossip Protocol ·
   Arbitrage Map (specs on the Atlas "Spell Book" page). Gravity held as ????.

0. ✅ **2026-07-15 POLISH — all on dev, auto-deployed, tree clean. Tip `f8783aa`.**
   Ad-hoc visual batch (Opus session):
   ① **Composer Programs button** reverted to the filled grey pill (black text).
   ② **Profile Share button** back to the ▶ play icon — the ↗ share-glyph trial
   is REVERTED on the buttons; ↗ stays catalogued in GLYPHS.md, just not worn.
   (SUPERSEDES the old "apply ↗ to the share buttons" follow-up — that's DEAD.)
   ③ **Output "Full Screen"** now opens in-app via the smooth router (dropped the
   new-tab `target=_blank`); the fullscreen back arrow already prefers history.
   ④ **Identity Plate (PriceSprite modal) fully redone** — a King-Mode share card
   (3rd doc beside the Rarity/Trade receipts in `lib/output/receipt.ts`): live
   PriceSprite hero · @handle headline · PriceRank/Score/Streak/Achievements on
   the user's colorway accent, handed to the native share sheet (download
   fallback) — SAME path + reused `rarity-receipt-btn` (ticket-stub + busy pulse)
   as the Rarity Receipt. Accent = lighter of the user's text/bg colorway (≥70
   luma, else INK) so it reads on the near-black ground. Brendon tweaks: sprite
   glow halved · hero-box outline removed (faint colorway wash panel kept) · all
   secondary labels lifted to 0.9 (nothing faded).
   ⑤ **ASCII Backup panel:** the 3 copy buttons now lead with the ⧉ copy icon
   (matching MY FULL PD); COPY TXT/JSON flash inline **COPIED!** on tap (the two
   instant clipboard copies; PROJECT/FULL-PD keep their live count + SAVED — they
   download a file, matching each other).
   ⑥ **Home carousel ASCII aspect** fixed — a tile reached fresh in ASCII Mode
   kept the project's provisional aspect (squashed); now shapes to the painted
   ASCII canvas's real proportions in the existing `onReady`, mirroring the
   stored-image/canvas paths (no new mechanism — Brendon's steer).

✅ **2026-07-14 POLISH — all on dev, auto-deployed, tree clean.**
   **Morning batch (Opus, shipped):** seen pings fade not strike (strike = done
   to-dos ONLY) · gas modal GAS PULSE + landscape-fit + portrait text pinned ·
   Programs button = Composer-pill look · Friend Inspector glyph −1px · Price
   Lens ◎ 13→15px · Sticker/Auto-Scroll glyph nudges · artist-list star
   0.6→0.72 / note 0.28→0.5 · Portfolio hide icon 18→22px · Followers folds in
   projects that follow you · Artists A–Z 'Collected' pill · 10 AI artists now
   follow @brendon (live `follows` write).
   **Afternoon batch (Opus) — dev `f8d0582`:**
   ① **Dispatch news pill** was Montreal-locked "every morning · 9AM" → now
   shows each reader the drop time in THEIR own zone (9AM Montreal converted
   client-side after mount; server + first paint show plain "Prints daily", so
   no hydration mismatch).
   ② **VAULT sealed door** rebuilt into a compact card matching the open view
   (was a tall near-black slab w/ a 64px Courier ‰); the ‰ per-mille now renders
   in Inter in BOTH states.
   ③ **REVERTED** the morning's Composer launcher pill "less transparent" tweak
   — it was a 20%-text-color wash that read MORE faded on most colorways
   (opposite effect); back to the site fill token (Programs button left as
   restyled).
   ④ Two stray War "takeover" mentions → **"siege"** (keeps Takeover as the
   collector mechanic's exclusive brand; War stays Siege/Conquest).
   ⑤ **NEW CLAUDE.md §9 rule:** the ‰ is the PD LOGO → always Inter, never
   Courier unless genuinely required (Setup Codes).
   **Evening batch (Opus) — dev `f2c64f8` + `ecc83a6`:**
   ⑥ **↗ = the canonical PD share glyph** (Brendon's pick from a 20-option
   round, GLYPHS.md §7). Profile Share pill is now glyph-only ↗ so a Takeover
   fits beside it without reading as an account-flag.
   ⑦ **"Hostile Takeover" → "Takeover"** everywhere (button · cast sheet · About
   changelog · feature registry · both docs pages · glyph glossary).
   ⑧ **Takeover gating** — the profile Takeover action shows ONLY when a
   takeover is actually castable (target holds 3+ of one project); else the full
   Share button stands alone.
   ⑨ **Subtle podiums on every board** (PriceScore · Clubhouse · Lane Runner):
   faint descending row tint + medal numerals ❶❷❸, no colour; Clubhouse keeps ⛳
   for #1. Already DB-queryable via the daily social snapshot (no new plumbing
   for a future podium filter).
   ⑩ **Lane Runner launch screen** — a Y2K block-ASCII LANE RUNNER logo (road
   edge + lane dashes, scales to any width) with TAP TO START + LEADERBOARD; the
   game no longer auto-runs. Typing "lane runner" / "lanerunner" in Global
   Search now opens it (FNV-1a hashes beside the porsche word).
   ⑪ **Two rough docs sections** — What's Public / What's Private, wired into the
   docs nav.
   **Night batch (Opus) — dev `d4641be` (tip):**
   ⑫ **Sticker Marketplace** rows now wear the STORE's 3-sticker fan banner
   (shared `fanFor` moved to the catalog) · toast MARKET→MARKETPLACE · stacked
   store capped ~6 rows then scrolls (grid lacked `min-height:0`, so flex
   auto-min defeated its `max-height` — every row showed).
   ⑬ **Achievements +more** counts to the full **1,000** (mystery incl.), matching
   the PriceSprite modal (was 848, visible-only → `VISIBLE_COUNT`→`TOTAL_COUNT`).
   ⑭ **Vault:** sealed card ~2× taller (breathes); the ‰ now renders as the REAL
   logo SVG (`PerMilleMark`, same as the My PD toggle), never a font glyph.
   ⑮ **Sigil worn AS the bubble logo** — the forged mark sits where the ‰ goes on
   the blank faction bubble, in the CUTOUT ink so it's bold/legible, NOT a bare
   mark; carousel ring + corner-logo override both use new `SigilBubble`. Dropped
   the FORGE word from the forge tile.
   ⑯ **Profile share pill:** full ↗ SHARE when it stands alone, glyph-only ↗ ONLY
   when the Takeover pill is present; ↗ glyph +2 sizes (10→14px).
   ⑰ **Dispatch ×** recentred to top-middle (was top-right).
   ⑱ **liminal-ai** profile colour → lime `#A3E635` (a DB value in
   `users.profile_hex`, NOT code — profile colour is the user row, not projects).
   ⑲ **Cartography:** search moved below the top-right × (was covering the title)
   + a small close × beside the field; long-press-to-open 460→920ms.
   ⑳ **"The" dropped from Cartography & Composer** everywhere shown — app UI +
   public docs (URL slugs `/docs/app/the-*` + grammatical lowercase 'the' left
   intact); Cartography title 15→19px.
   **Late batch (Opus) — dev `a67144a` (tip):**
   ㉑ **Lane Runner launch screen themed** — logo + TAP TO START were keyed to
   `--text-color`, but the launch lives inside `.user-dropdown` which INVERTS the
   colorway (surface = `--text-color`), so they painted the same colour as the
   panel and vanished. Swapped to `--bg-color` ink: START = solid fill,
   LEADERBOARD = outlined. Comment warns not to swap back.
   ㉒ **Connect-pill Sigil ink** — with no faction flying it fell back to
   `SIGIL_BONE` (#E9EDF4) and washed out on the light pill; now passes
   `currentColor` so it inherits the pill ink. `.sigil-mark` gained a
   `-webkit-text-stroke: .4px` (+ `paint-order`) for weight — Courier tops out at
   700, so a stroke is the only lever. Connect-pill `.sigil-after-name` gap
   halved (6→3px, `.btn-user`-scoped; profile rows keep 6px).
   ㉓ **Sigil SHOW/HIDE — PLATFORM-WIDE (account column, not a view toggle).**
   Toggle on the Forge (forged state) shows/hides the mark that trails the @name.
   Hiding removes it for EVERYONE — the owner's own pill AND every visitor's
   render of their profile. New `users.sigil_hidden` (boolean, default false) +
   public SELECT grant, applied to Supabase and mirrored in
   `supabase/migrations/20260714_sigil_hidden.sql`. Written via a guarded
   `/api/me` verb (mirrors `forge_sigil`); read on `PUBLIC_USER_COLUMNS`; gated at
   render on the pill (viewer's own row via `useAuth().sigilHidden`, live
   `pd:sigil-visibility-changed` refetch) and the profile identity row (owner's
   `user.sigil_hidden`). The first local-only take (notifs flag + body class +
   CSS hide) was reverted — Brendon: "zero point hiding it for you only."
   **⚠ PENDING (Brendon's call):** he expected the Cartography long-press near
   3s; it was only 0.46s, now doubled to 0.92s — I offered the full 3s and am
   awaiting his word. Also still open (pre-existing): apply ↗ to the artwork +
   project share buttons too.
   **STILL QUEUED → ClickUp (02 · PriceOS UI, Backlog):** Completionism Zoom —
   3-depth completion (slider=depth, tap=cell) `86baxgv9y` · **Albums → public**
   `86baxgvhk` — a REAL build, NOT a gate flip: albums are stored per-viewer in
   private settings today and aren't even fetched for other profiles, so public
   = serve the owner's albums to visitors in a READ-ONLY view · Completionism
   **leaderboard** itself `86baxgvgj` (podium shipped; needs the ranking metric).
   **Done this session:** Takeover rename + ↗ + gating `86baxgvjg` (closed).
   Small open follow-up: ↗-on-share-buttons DROPPED 2026-07-15 (buttons wear ▶; ↗ = catalogued glyph only).
   **Raised earlier, NOT committed (ideas):** Portfolio wow-pass (real floor/
   last/avg/ATH — today only mint-mode is real) then hide empty stubs;
   Incognito Proxy = UI shell only (real = medium build).

-10. ✅ **SHARING · STUDIO · DIGEST ROUND (2026-07-13 evening, Fable; Brendon's
   4-item batch, pushes pre-approved in chat "when you have something ready
   push"). Three pushes on dev, all auto-deployed:**
   ① **Share unfurls fixed + art-first.** Root cause of the naked Discord
   embed: metadata's absolute-URL base still pointed at the DEAD pre-migration
   Vercel host (unfurlers fetched images from a corpse). Base now rides
   `NEXT_PUBLIC_SITE_URL` (.env.production). Output links unfurl with THE
   PIECE (stored preview, large card), project links with their showcase
   pick; the share image is gated on an R2 head-probe (outputs table is
   SPARSE — never use it as a minted signal; previews pin on first VIEW, so
   unviewed pieces have none). Verified live post-deploy.
   ② **Studio:** scroll-on-load bug dead (page pins to its top; #analytics/
   #stickers deep-links keep the jump — cold load measured clean, the drift
   was restore-path); visitor states sorted (signed-out = full workbench +
   bordered device-drafts callout; non-whitelisted = filter stated plainly in
   Publish + apply path; "gated by curation" copy corrected). Remaining to
   100% = phase-2 brief items (royalties · artist pings · soundtrack mgmt ·
   cross-device drafts · library envelope), `docs/briefs/studio-phase2.md`.
   ③ **THE DISPATCH DIGEST (newsletter) BUILT** — see ClickUp `86bax00un`.
   3×/month (1st·11th·21st, 9AM MTL), ledger-only content, art-first email,
   subscribe slip on /dispatch, 1,000-reader cap (free 3k sends). **DORMANT
   until Brendon's 2 taps** (2 DNS records + RESEND_API_KEY worker secret —
   assigned comment on the task has exact values; API key in chat 2026-07-13).
   Resend segment `fb22999d-a121-4feb-aaa8-84d69994492c` = the list of record.
   ④ **Sentinel audited** then — same evening, Brendon greenlit "build it
   all" — **SHIPPED server-side** (`86bax7dvz` CLOSED): one 1-min watcher
   for BUY-target to-dos + price/upload workflows vs live listings; ping +
   native push on crossing; exactly-once via `sentinel_fires` (applied +
   mirrored); render kinds sentinel ❍ / workflow ☇. ⑤ **Sentiment REAL**
   (both cards): Disagreement = measured held-vs-listed split (sentiment
   API extended); **PRICE TARGETS = the crowd game** — monthly window, one
   call/wallet, tap-a-rung ladder anchored on the real floor, SEALED
   (RLS, service-only `price_predictions`, applied + mirrored) until the
   month turns, then last window reveals as histogram vs floor.
   ⑥ **Sitewide open-at-top pin** (the studio scroll bug was global — now
   fixed in the shell; hash links + modal locks respected). ⑦ **Artist
   batch**: EARNED line (95% mints + 3% secondary — rates read from the
   contracts) · DROP KIT share pack · VOUCH (2 slots, whitelisted only,
   pings @brendon; `artist_vouches` applied + mirrored) · soundtrack
   manager (artist-wallet-gated PATCH) · artist profiles unfurl with
   their art. **Deferred deliberately: share-a-draft** (hosts artist
   scripts publicly — own build; noted on epic `86bavub9k`).
   ⑧ Digest polish per Brendon: THE STAMP (per-edition generative seal,
   frameless), JOIN THE CHAT CTA, loud one-tap unsubscribe, print-run
   scarcity line on the /dispatch slip (live seat count), days locked
   1st·11th·22nd.

-9. ✅ **THE HARDENING ROUND — 19 of 22 Architect-Report items DONE, on dev,
   DEPLOYED + VERIFIED LIVE, CI GREEN (2026-07-13, Fable; Brendon: "fix it
   all in this chat", wrapped on his AMAZING WORK).** End-state proof:
   /api/health returns ok on the live preview (db up, sweep heartbeat fresh,
   Dispatch printed) · telemetry beacon fired end-to-end into app_errors on
   prod and cleaned up · CI run #2 SUCCESS on dev 53f56fcd (run #1 failed
   only on the runner's Node 20 — supabase realtime needs Node 22's native
   WebSocket; pinned. Lesson: CI node must match the container, 22).
   Full per-item status lives IN the brief's checklist —
   **`docs/briefs/fundamentals-hardening.md` is the baton for this
   workstream**, read it before touching anything hardening-related.
   Highlights: CI gate (tsc+lint+27 tests+build) · error visibility
   (app_errors sink + /api/telemetry + /api/health) · settings clobber KILLED
   (server-side atomic merge + dirty-key client, scratch-row proven) ·
   idempotency keys on all 5 money routes · engine determinism harness
   (tools/engine-hashes, 112 projects, goldens committed — REQUIRED gate for
   any lib/art change) · daily economy audit sweep · DB advisor lint cleared ·
   migration mirror backfilled + generated types snapshot · CSP report-only ·
   secrets inventory · cutover contract DRAFT (his 5 calls pending) · 6
   ClickUp zombies closed. **Brendon taps: ClickUp `86bax31xd`** (Upstash =
   rate limiter is verifiably OFF in prod · uptime pinger · free-plan backup
   decision · cutover calls). Deferred to own sessions, reasons in brief:
   per-engine code-splitting (#12), giants split (#14), money-math queue
   remainder (#16). New migrations applied to live DB this round: perf lint
   fixes, app_errors (+fns), app_merge_user_state, idempotency_keys (+fn) —
   all mirrored in supabase/migrations/.

0. ⏳ **THE OPEN QUEUE (from the 2026-07-13 pre-launch batch — everything
   else that day SHIPPED, see -5):**
   - **SPELL BOOK STUBS — first build once Brendon says go.** Plan presented
     + ClickUp `86bad5g4t` commented: wire all 7 stubs for REAL (Tribunal ·
     Deactivate · Tarot Spread · Offer Shield · Sybil Net · Gossip Protocol
     · Arbitrage Map — specs on the Atlas "Spell Book" page); hold GRAVITY
     back post-launch, its pill shows **????**. Waiting ONLY on his word.
   - **DESKTOP PASS (perks for the big screen)** — full brief at
     `docs/briefs/desktop-pass.md`; meant for an OPUS chat (Fable never
     spawns subagents). Crash + QR are DONE — don't redo (see -5 ⑧⑨).
   - **CRASH FOLLOW-UP:** if Brendon still sees a Windows Chrome crash
     after `c3e1b07` deployed, ask for the HW-acceleration-off test result;
     the at-rest GPU blur load is already zero.
   - **PUSH FOLLOW-UP:** if lock-screen banners still don't arrive after
     the transport fix, the one remaining suspect is the WEBPUSH_PRIVATE_KEY
     secret on the Cloudflare worker (dash → Settings → Variables).
   - **NEWSLETTER** — Resend pure-data digest, ClickUp `86bax00un` (Ideas),
     awaiting greenlight.
   - Branch hygiene: `claude/pre-launch-edits-builds-3273du` is merged
     trash — Brendon deletes at
     https://github.com/brendonrell/PriceOS/branches.

-5. ✅ **PRE-LAUNCH BATCH — SHIPPED + AUTO-DEPLOYED (2026-07-13, dev
   `cfc19a6`; all Brendon's same-day list).** Live on dev:
   ① About PD: the 60-DAY COOLDOWN banner box + explainer up top + a BY THE
   NUMBERS row. ② Output timeline: time reads as distance — >1yr gap = 2×
   dashed connector, 5+yrs 3×, 10+yrs 4× (FEED order only). ③ Tape swap:
   top connect-menu glyph ▰ cycles THE TAPE (5-state), My PD ⏥ pill cycles
   the MENU TAPE — positions/glyphs unchanged, functions traded. ④ Calendar:
   to-dos layer ON by default AND the layer choice is account-backed
   (`users.calendar_state` — hydrate/write-through in CalendarContext via
   userState; day notes already rode the envelope). ⑤ Hothurt RING replaces
   every left tab/rail (pings `--high`, sentinel `.ready`); a completed P1
   keeps its ring at the done-fade (~half). ⑥ **NATIVE PUSH FIXED — the big
   one:** npm `web-push`'s Node transport HANGS FOREVER on the Workers
   runtime (proven in an isolated workerd harness) — every push since the
   Cloudflare migration died silently (inbox ping row landed on time = the
   "delayed badge"; banner never sent). Rebuilt delivery in
   `lib/push/transport.ts` (WebCrypto + fetch, RFC 8291 aes128gcm + RFC
   8292 VAPID), round-trip verified in Node AND workerd (encrypt → send →
   decrypt-as-device + JWT verify). **If banners still don't arrive:
   the ONLY remaining suspect is the WEBPUSH_PRIVATE_KEY secret missing on
   the Cloudflare worker (dash → Settings → Variables).** ⑦ **THE VAULT
   shipped** (Atlas King Candidates spec): +More › Vault pill on every
   profile — near-black door (spec's call), MiniDisc shutter slide, seal =
   forged Sigil in faction ink (⚐/‰ fallback), closed-door VERDICT LINE
   (faction · pieces · oath days), appraisal plates (pdRarity + edition
   rank) over real holdings, tap = enter the piece. ⑧ **WINDOWS CHROME
   CRASH FIXED:** the three always-mounted full-viewport overlays (Stickers
   · Spite Book · Panopticon) kept `backdrop-filter` while hidden — three
   whole-window GPU blur surfaces alive on EVERY page (the whole-app Chrome
   killer; phones too small to feel it). Blur now applies only on
   `.active`; verified zero at-rest blur layers post-build. Brendon's
   HW-accel-off test confirms/denies residual. ⑨ QR desktop login verified
   already working (Connect Wallet → WalletConnect → scan QR).
   **OPEN from the same list:** ⑩ SPELL BOOK stubs — plan presented, WAITING
   ON BRENDON'S WORD (wire all 7 for real; hold GRAVITY as the ???? pill) —
   ClickUp `86bad5g4t` commented. ⑪ DESKTOP PASS (perks for the big screen)
   — Opus brief ready at `docs/briefs/desktop-pass.md` (Brendon starts that
   chat). ⑫ NEWSLETTER — Resend pure-data weekly digest proposed, ClickUp
   `86bax00un` (Ideas), awaiting greenlight.
   Task branch `claude/pre-launch-edits-builds-3273du` = merged trash once
   the session ends — Brendon deletes at
   https://github.com/brendonrell/PriceOS/branches.

-4. ✅ **THE COMPOSER ⊚ — SHIPPED + AUTO-DEPLOYED (2026-07-13, dev
   `2cab4ea`; ClickUp `86b9eu9wn` CLOSED with the full ship comment).**
   The visual query builder, whole: v1 (builder · live grouped-gallery
   results · Programs saved locally) + wow pass (THE READOUT — the query
   reads itself back in plain English; count pop + ±N bite; ms brag;
   breathing ⊚; physicality = its signature, Brendon's order) + brand cut
   (site pill anatomy verbatim on a **deliberately dark-only stage** —
   Brendon's call, noted in Rule #2; never "fix" it back to colorway) +
   v1.1 rules (owner social classes ⚭⚯⚬△ + ⟁ CARTEL per-project from the
   Friend Inspector read · MY LISTS ★✛◰ · single-project scope unlocks
   that project's ⨝ trait vocabulary). **Launcher = the special first row
   of Global Search** (slick half-opacity fill row; Spell Book pill
   REMOVED). Glyph re-shuffle the same day: Composer ⊚ · Price Lens ◎ ·
   Genome ≎ · ⌾ freed — GLYPHS.md carries all of it.
   **SAME-DAY POST-SHIP ROUND (dev `3665456`):** Program-tap crash FIXED
   (cards need TraitsProvider inside the modal — reproduced w/ injected
   data, verified); launcher copy "launch Composer ⤤"; **v1.2** — results
   DO things: ❐ SELECT bulk mode (HomeMsFloatBar verbatim) · CART ALL ·
   ALBUM ALL (numbered snapshot vs live Program) · WISHLIST ALL · ⧉ LINK
   (?q= share URL opens the Composer onto the live query); **finale** —
   Σ listed value in the live strip · THE SPECTRUM (each Program wears
   its current answer's colour distribution) · THE LOOSENER (empty match
   names the strangling rule as a tappable "frees N" pill).
   **Remaining beats:** ① server-stored Programs table (wallet, name,
   query_json, created_at) — PROD MIGRATION, Brendon's §4 approval gate;
   ② iPhone device-verify ⊚ ◎ ≎ ⤤ (the #1 glyph gate); ③ phase 2/3 rules
   (birth facets need mint timestamps at chain cutover; ATH/hold-time/
   last-sold history predicates). Also shipped this
   session: search Recently-Viewed thumbs cover-crop (History fix
   ported); DEFAULT SORT truth pass (icon-only GROUP pill @13px, #ID/
   $PRICE tightened, AZ before FEED); **Rule #2 sharpened in CLAUDE.md**
   (no tiny/skinny/faint/low-opacity — the Composer washout, raised in
   fury); **CLAUDE.md deploy note: push-to-dev auto-deploys, NEVER ask
   for a Cloudflare token** (verified: build history all green).
   Task branch `claude/build-composer-wizvm8` is merged trash — Brendon
   deletes at https://github.com/brendonrell/PriceOS/branches.
-3. ✅ **THE SIGIL — SHIPPED + DEPLOYED (2026-07-13, dev `bfa1d2a`, worker
   version `40adaeef`, verified live; ClickUp `86b9erfwp` closed).** The
   final Factions beat, spec'd live with Brendon (4 concept rounds): a
   deterministic 3–4 glyph TEXT rune-string per wallet — NOT SVG, and never
   a face (no brackets-as-eyes) and never martial (no crosses/daggers);
   both bans are hard rules from the sprint, baked into GLYPHS.md §13 with
   the LOCKED pools (append-only, Brendon sign-off, device-verify). Live:
   THE FORGE = the profile-logo carousel's last tile → modal (`sigilForge`),
   set-once permanent write (`users.sigil_forged_at`, migration applied,
   public column); forged wallets gain the Sigil colour ring at the
   carousel's end (enlists exactly like the blanks — registry maps
   `plogo-sigil-*`); corner logo flies the owner's mark; **the Sigil trails
   the @name** (Sprite + Rank lead it): tape (the reserved per-user sigil
   slot, faction ink), navbar cluster, profile identity row; Marginalia
   margin hands upgrade sprite→Sigil server-side. Docs section added.
   **Remaining:** iOS device pass on the pool glyphs before mainnet lock.
-2. ✅ **FACTIONS END TO END — SHIPPED + DEPLOYED (2026-07-13, dev `87a8354`,
   worker version `ad61aa44`, verified live).** Spec v3.1 (Atlas → KING MODE →
   FACTIONS page) built whole, to the open-call recs (30d defection cooldown ·
   72h siege window · whale damping past 5 pieces). Live and verified on the
   preview: faction reveal toast (22 colour factions = the blank bubbles as-is;
   holo blank/solids/Petey/$PRICE stay neutral) · oath ledger riding the
   profile-logo save (defection = reset + cooldown + permanent scar) ·
   **marks-chain recorder running on the 1-min sweep** (one mark per wallet per
   token EVER; sales deep / passes faint; 12 slots → Relic; overflow → crypt +
   "Stone: STRUCK" ping) · grip/siege/conquest engine + **Book of Conquests
   (Age I — THE FOUNDING declared itself on first sweep)** · derived titles
   (Warden/First Blood/Founder's Hand/Kingmaker/The Struck) + grudges ·
   Marginalia ceremony on the artwork page (10s ceremonial hold → white
   generative frame, real-PriceSprite margin hands, enlisted-only corners +
   banner choreography) · Cartography: map-owned light ink + fixed-size
   decluttered labels (the dark-on-dark legibility bug is dead), search ⌕ /
   FIT / ME controls, tap place card w/ OPEN, **first-mint gate** (unminted
   projects invisible — verified: 5 territories, all minted>0), enlisted-only
   WAR layer (faction coastline rings, siege pulse, spread glow) · WAR BANNERS
   sticker sheet (cosmetics only) · tape war lines (enlisted) · NPC war gossip ·
   war glyphs (GLYPHS.md §13: ▟ ▞ ⚐ ≣ ‡) · extensive user docs
   (`/docs/app/the-factions` + Cartography doc updated). New tables live in
   Supabase (marks, marks_crypt, faction_oaths, war_state, book_of_conquests,
   war_meta — RLS anon-read, sweep-written). ClickUp `86baf786c` closed with
   the remaining-beats list: **regalia/commemorative/veteran/canonization
   sticker drops, Receipt bound-view, Rarity Labs Pedigree, Friend Inspector
   accents, faction gallery lens, achievements war ladder, profile war record,
   Discord broadcast worker, Sigil art (last — PriceSprite covers).**
   Task branch `claude/factions-end-to-end-s4ua9m` is merged trash — Brendon
   deletes at https://github.com/brendonrell/PriceOS/branches.
-1. ✅ **CONTRACTS: three-pass Opus audit APPLIED, merged to pd-contracts
   `main` (`9855fa0`, 2026-07-13). 313/313 tests green.** The three blind
   2026-07-11 Opus reviews are mirrored in `pd-contracts/audit/` (lineage
   README updated — start there). Shipped: the tokenURI data-URI fix (the
   always-present `#` truncated every token's metadata for standards
   consumers; separator is now a space — **Brendon signed off on dropping
   the `#`, 2026-07-13**; base64-ing the envelope measured 48.2M gas on
   p5-sized libraries, not viable), `#`/`%` rejected in name/symbol/
   description, comment corrections, new tests (ERC-20 reentrancy lock,
   per-token Minted event, cross-chunk scanner limit documented), README
   preview.webp→png. NOT changed per the findings themselves: admin
   centralization (deploy-day mitigation = multisig + tight fee ceiling)
   and the trait-grinding seed — its **commit-reveal build spec is
   GREENLIT** (`pd-contracts/BACKLOG.md` §4, Brendon 2026-07-11): own
   branch + full test pass + Sepolia rehearsal before mainnet. ClickUp
   `86b9v5wj4` (Mythic Audit Pass) commented. Next contracts session
   starts at BACKLOG §4.
0. ✅ **2026-07-13 batch LIVE (deployed version 5f13f570, verified on the
   preview).** Footer is COMPLETE: About PD modal + Support modal v1 +
   Dispatch × close, plus viewer-local times sitewide, the genesis-moment
   fix, and the sitewide **filtered-not-curated** correction (docs + ClickUp
   + CLAUDE.md wording lock). See SHIPPED 2026-07-13 below. Brendon to eyeball
   both new modals on device and edit copy from there (his stated plan).
1. ✅ **EVERYTHING IS LIVE (deployed 2026-07-12 evening, version 9727e7ff,
   verified end-to-end).** The pings WOW PASS + the entire mega-batch below
   are on the preview. Verified live: config baked (Supabase URL in the
   client chunk) · /api/social/mute 401 · /api/rewind Day 1 renders the
   newborn platform (37 projects, 0 mints) · /api/cartography serving real
   ledger · **The Dispatch printed its first edition BY ITSELF within a
   minute of deploy** (Weekend Edition · EDITION 31 · /dispatch/2026-07-12,
   immutable). Brendon's CF token was chat-only, NOT stored. Remaining
   device-side checks for Brendon: the four new glyphs (◫ ◄ ▤ ⚑) need the
   iOS monochrome-text gate, and the two title gestures + Takeover cast
   sheet deserve a real-thumb pass.
2. ✅ **Indexer sweep — LIVE (2026-07-11 afternoon).** `ALCHEMY_RPC_URL` set,
   the reconcile now walks the window in ≤10-block sips (Alchemy free-tier cap)
   with a targeted `?fromBlock=&toBlock=` backfill door; the app Worker was
   redeployed with this code. Token-2 backfilled via the door (block
   11218947) — all three pd-test-alpha tokens now indexed, exactly one XFER
   row each (idempotent). Rolling sweep verified clean at head, lookback back
   to default 50. See SHIPPED below. Road-to-mainnet step 1 DONE.
3. ✅ **PD sales feed — LIVE (2026-07-11).** `WEBHOOK_MAIN` points at the
   `#pd-sales-feed` Discord channel; the real Sepolia T9 sale was posted end-
   to-end as the go-live test. Posts every PD sale within ~1 min. $20 floor.
4. **Remaining Discord feeds → Workers (Opus-able).** The template is proven
   in prod (fx-sales, pd-sales, and now fx-listings all live). Port order +
   every hard-won fact:
   **`price-discussion` repo → `workers/README.md`** (+ the brief
   `docs/briefs/discord-feeds-worker-migration.md`). Still pending: ab-sales,
   verse, ab-listings, feature, artcoin, emerge-fund. Brendon supplies each
   Apps Script source; port faithfully; parallel-run; cutover. ClickUp
   `86b9g4e55` commented with full status.
5. **PDMCP — connectors-directory path** (custom domain + OAuth stub +
   privacy page, spec §) + a real Claude-session connect test. v1 is LIVE:
   `https://pd-mcp.pricediscussion.workers.dev/mcp`, all seven tools
   exercised against the deploy. ClickUp `86bavnrt7` commented.
6. **Stickers on-chain cutover** — unchanged, ClickUp `86baw12ek` (see its
   task; wrapper art done, chain shows zero sheets).
7. **PD Studio next phases** — unchanged (`docs/briefs/studio-phase2.md`,
   epic `86bavub9k`).

## ✅ SHIPPED 2026-07-13 (Fable) — FOOTER COMPLETE + TIMES + FILTERED-NOT-CURATED (on dev + DEPLOYED 5f13f570, verified live)

One push (merge ab1ee0b). ClickUp task `86bawpvpq` records the ship.
- **About PD modal** — the footer link (was a COMING SOON toast) now opens the
  real thing, built on the PriceosModal changelog chrome verbatim (figlet
  header + scale-to-fit, close-hint, collectors-list scroll body). Content:
  "FILTERED, NOT CURATED" ASCII statement box · two SVG diagrams (the loop:
  artist → filter → project → outputs → market → the talk; the stack: PriceOS
  social layer over the Ethereum art layer) · THE STORY timeline (NOV 19 2021
  #price-discussion channel → the sim → the real app → contracts → the
  language → $PRICE mainnet → the edge → the tools → NEXT: mainnet) · BY THE
  NUMBERS computed live from the real registries (projects, artists, edition
  range, achievements TOTAL_COUNT, MAX_PRICE_SCORE, True Names, 95% artist
  take, 100% on-chain art) · FIND US (X / Instagram / YouTube =
  @pricediscussion + Discord) · CONTACT (price@ + support@pricediscussion.com).
- **Support modal v1** — footer Support link (was a bare mailto) opens a
  prelim modal: support email + Discord fast lane. Brendon edits copy from
  this base (his stated plan for both modals).
- **The Dispatch ×** — standard close-hint fixed top-right on /dispatch;
  history-back when the reader came from inside the app, home on a cold link.
- **⛔ Viewer-local times, always and forever (new §9 rule in CLAUDE.md).**
  All displayed clock times now render in the USER's zone: news rail, home
  New-Uploads feed stamps, profile feed stamps (each had been pinned to UTC).
  Deliberate exceptions stay: day-keyed platform concepts (PriceDay, the
  Dispatch's covered day, natal, Mood Ring) + date-of-record stamps (member
  since / upload date, date-only, still UTC-keyed).
- **Genesis moment fixed** — `#price-discussion` started 11/19/21 08:28 EST;
  was stored 08:28Z (rendered 5h early for everyone). Now stored at its true
  instant **13:28Z**; verified on the live API. Closes the old QUEUED item.
- **Filtered, not curated — sitewide correction (Brendon's order).** The
  platform-level "curated / curation thesis" claim was my drafting mistake.
  Corrected: all `content/docs/` pages (glossary got a Filtered entry;
  user-level curation like Albums/Showcase/Gen Curated untouched) · README
  already correct · **CLAUDE.md §1 wording lock added** · ClickUp: banners on
  PD-Docs doc top page + pages 9 & 61, Atlas "Curation, Identity & Chrome" →
  "Taste, Identity & Chrome" (+ same in Reconciliation), wording note on the
  Master Feature List.
- Deploy: fresh chat-only CF token (NOT stored), OpenNext build + pinned
  wrangler per the recipe; verified live: Supabase URL in the client chunk,
  About modal in the served layout chunk, dp-close on /dispatch, 13:28Z from
  the feed API.

## ✅ SHIPPED 2026-07-13 (Fable, overnight) — THE ARCHITECT REPORT (docs only)

- **`docs/ARCHITECT_REPORT_2026-07-13.md`** — full architecture review Brendon
  ordered before bed: app + DB (live advisors read) + ClickUp + repos. Verdict:
  bones are strong; the gap is scaffolding. Top 5 blind spots: zero app tests ·
  no CI/error-visibility · settings-envelope last-write-wins clobber risk ·
  one-env/one-DB (staging needed at mainnet) · rate limiter likely OFF in prod
  (Upstash secrets unverified — 5-min check, do first). Consolidated 22-item
  homework list at the bottom, tagged Fable/Opus/Brendon. Docs-only push,
  pre-approved. **Waiting on Brendon: read report → pick homework → I'll cut
  ClickUp tasks + Opus briefs on his word.** Also flagged: ~6 zombie ClickUp
  tasks (shipped work still open) need his confirm before closing; CLAUDE.md
  §1 stack line + api-spec.md are stale (noted in report §4.7, not yet edited).
- **UPDATE (same night): Brendon approved ALL 22 items** ("fix all of them
  without disrupting the current flow"). Execution brief written:
  **`docs/briefs/fundamentals-hardening.md`** — the multi-session playbook
  (checklist IS the baton for that workstream; sessions flip its boxes).
  Brendon starts fresh Opus chats pointed at it. Ship gates + no-product-
  disruption rules are baked into the brief; Brendon-gated asks are batched.

## ✅ SHIPPED 2026-07-12/13 (Fable) — THE MEGA-BATCH (all on dev + DEPLOYED, verified live)

Six pushes, in dev order. ClickUp updated per feature (86b9eth7w, 86barg53e,
86b9fcn0d, 86b9g6c7c, 86bafgw65 all complete; 86b9fbrx9 commented).
- **Cartography ◫ (86b9eth7w):** living ecosystem map — territories from
  minted supply w/ seeded coastlines, holders as inhabitants, artist ✺ capital,
  shared-collector continents (periodic force layout), realtime event layer
  (mint ripple+growth, sale comets, listing beacons), 3 LOD depths, wallet
  focus mode. Canvas 2D, zero deps, /api/cartography seed + Realtime channel.
  ENTRY: long-press the home "Price Discussion" name (project-title gesture
  verbatim). WebGL deferred until scale demands (noted in task).
- **Engine perf pass (86bafgw65 + fleetwide):** all 84 engines benchmarked
  headless (playwright + esbuild harness in scratchpad); ~45 were 1-4s/piece.
  Shared grain/mottle/hazeSheet storms → bucket-batched path fills / pixel
  buffers (same rng order); bespoke fixes: vanguard (PIP dot culling, 4.2s →
  0.9s), goldenangle (layer-blur glow, 4.1s → 50ms), corallogic (int grid
  keys), diffusion (inlined laplacian), chladni (near-band mask + LUT
  deposits, 3.3s → 1.65s = current fleet worst). ⚠️ 9 projects' texture layer
  changed → ZEROED to 0 mints on Brendon's order (chladni pressroom ictus
  caustics cyanotype vanguard frost-fern conservatory topiary; holders/events/
  listings/offers rows deleted, aggregates reset). pd-test-alpha untouched.
- **The Rewind ◄ v1 (86barg53e):** triple-tap the home name → whole-OS docked
  at any PriceDay: banner + spine scrubber + RETURN TO NOW; as-of home (stats,
  lists, day log) + as-of project pages (stats-then, gallery capped to
  minted-by-then); read-only by construction (/api/rewind GET only).
  **Daily social tape STARTED** (social_snapshots table + cron — the
  can't-wait piece; R4 profile/leaderboard rewind now possible later).
- **The Dispatch ▤ (86b9fcn0d):** morning paper, 9AM Montreal, covers prior
  day; deterministic seeded prose off the almanac engine ($0/day); immutable
  editions in `dispatches` table; /dispatch + /dispatch/YYYY-MM-DD forever-
  URLs; entries = news-rail ▤ pill + footer 2nd row before Mood Ring.
- **HOSTILE TAKEOVER ⚑ (86b9g6c7c) + own-book offers decision (86b9fbrx9 =
  Option A, Brendon's call):** blanket premium bid on a 3+-piece position;
  1.2× premium enforced (lowest listing → floor → mint); 72h non-cancellable
  (cancel path refuses takeover offers); real per-piece offers w/
  offers.takeover_id; accept flow records yields live; sweep stamps
  COMPLETED/PARTIAL/WITHSTOOD (180d mark); profile ⚑ TAKEOVER action + cast
  sheet + inscription banners; Offers HQ badges blanket rows. NEW glyphs
  logged in GLYPHS.md: ◫ ◄ ▤ ⚑ (all need the iOS device gate).
- **PD-Docs:** new pages for all four tools + corrected the stale "PD does
  not operate a marketplace" claim (own book documented), grouping toggle
  documented, overview/discovery cross-links.
- New crons on the 1-min trigger (all probe-and-exit): social-snapshot,
  dispatch, takeover-sweep.
- DB migrations applied (live Supabase): social_snapshots, dispatches,
  takeovers + takeover_acceptances, offers.takeover_id.

## ✅ SHIPPED 2026-07-12 (Fable, night) — PINGS SYSTEM REDESIGN + ACHIEVEMENT DE-SPAM (dev; batch 1 LIVE)

Full spec + status in ClickUp `86bawky5p`. Two commits on dev:
- **be249c7 (LIVE on the preview):** read = SCROLLING the pings list (open
  marks nothing); unread on top, honest unread-only count; all five MY PINGS
  interest toggles wired to real fan-outs (mutuals / starred artists /
  starred projects / starred traits / rarity top-10 moves in held projects);
  push respect policy (money always, ambience budgeted 4/hr, achievements +
  follow-feed never, pills enforced server-side); to-do + calendar reminders
  → inbox + push; **Artist Push** (Studio, 1 preset ping/month/project to
  holders); achievements: 116 front-loaded trophies → far-climb rungs (still
  exactly 1,000; day-one unlockables 57→20; Mjölnir re-walled 231,000,
  verifier green); docs got a Pings SECTION (overview/controls/artist-push);
  GLYPHS.md updated (interest glyphs; "stars are silent" note revised).
- **a019bd3 (on dev, AWAITING REDEPLOY):** wow pass — push deep-links to the
  piece, sprite moods (awake/blink/yawn) on the lock screen, SEEN divider +
  open-anchor, long-press-to-quiet (unstar artist/project or mute actor —
  NEW POST /api/social/mute, first writer of the `muted` table), 30d+ streak
  guard at 19:00 Montreal, "while you were away" rollup (inbox-only), sweep
  heartbeat → ops ping to @brendon if the cron stalls 10min+ (1/hr max).
- Queued at chain cutover (in the ClickUp task): indexer on-chain sale/mint
  path gets the same interest fan-out.
- Facts future sessions need: interest fan-out rides `app_ping_wishlist_fanout`
  (kind-agnostic RPC) + the users.settings GIN index (artistStars/projectStars/
  traitStars containment probes); kind `PING` was already in the live CHECK
  constraint (no migration needed anywhere in this whole build — zero prod
  writes); pings read route only bumps the broadcast watermark on `all` or
  `broadcast_seen`, never on ids.

## ✅ SHIPPED 2026-07-12 (Fable, evening) — fx-listings-feed LIVE

- **fx-listings-feed LIVE** — fxhash *listings* Worker, objkt-sourced
  (`list_create` on the three fxhash FA2s; lister = event `creator`), old
  bot's compact embed (em-dash title, "Listed by … for …", thumbnail).
  Sheet config carried over: **min $20, single webhook** (`WEBHOOK_MAIN`).
  1-min cron, KV `fx-listings-feed-state`. Verified end-to-end: real card
  rendered in `#fx-listings-feed` + deployed worker manual-run clean. Code
  on `price-discussion` `main` (`workers/fx-listings-feed/`); README's
  pending-port list updated; ClickUp `86b9g4e55` commented.
- Brendon's fresh CF API token was chat-only again — NOT stored; he can
  revoke it anytime (told him).
- Old Apps Script listings trigger: Brendon to disable (it dead-polls the
  dead fxhash API; harmless but pointless).

## ✅ SHIPPED 2026-07-12 (Opus) — Sticker store + PriceSprite modal UI polish (all on dev)

All merged to `dev` + pushed. UI/content only — no data/logic.
- **Sticker store:** outputs sheet **3 cols** (was 4) with even, roomy gaps
  (mobile only); store grid row-cap attempted via plain CSS `max-height` +
  `align-content:start` — **⚠️ this did NOT actually clip (see batch 2 below for
  why + the real fix)**; "album" tab → **"MY
  ALBUM"**; news-ticker row **~⅓ shorter** (10px); header expand arrow **1.5×**
  (33px); card count forced-wraps "N" over "stickers".
- **Both store crawls rewritten (content only, formatting untouched):** store =
  onboard + buy; marketplace = its OWN crawl nudging **listing**, framed as
  recouping toward the next roll of stickers/art (deliberately NO profit/flip
  language). Cast: **all 100 familiars = endorsers**, **@brendon +
  @pricediscussion sprites = platform reps**; ALL placeholder @handles purged
  from the crawl. `lib/stickers/ticker.ts` (buildStoreTicker/buildMarketTicker),
  wired per-view in `components/StickersModal.tsx`.
- **PriceSprite modal achievements line:** the points line was spilling past the
  right margin — count now stays inline with the label, the score drops to its
  own full-width line pinned right; faint tally 0.5→**0.9** opacity.
- **DEFERRED (Brendon's call):** the PriceSprites **sheet you can buy** still
  lists placeholder @handles as its stickers — leave until more real users lock in.

## ✅ SHIPPED 2026-07-12 (Opus, batch 2) — ASCII tab + achievements line + store grid scroll (real fix) (on dev)

All merged to `dev` + pushed. UI/content only — no data/logic.
- **ASCII Backup tab:** button labels → ALLCAPS (`ACTIVATE ASCII MODE`); dropped
  the leading dots (`COPY TXT` / `COPY JSON`); long button `collection`→`COLLECTED`.
- **PriceSprite achievements:** the points line (was `[[ … PTS … ]]`) now **centered**
  and flanked by the canonical achievements icon **◍** each side (`lib/achievements/icon`).
- **⭐ Store stacked grid — the REAL scroll fix (3 failed rounds first).** Batch-1's
  `.ss-grid-view { max-height }` NEVER clipped: the grid is a **flex child of the
  modal column** (`.sticker-sheet`), so its flex auto-minimum = full content height,
  which overrides `max-height` → the modal just grew to show every row (Brendon:
  "forcing itself to show the full grid"). Deploy was NOT stale and the value WAS
  live — the mechanism was wrong. **Fix:** wrap the grid in a dedicated bounded
  scroll viewport **`.ss-grid-scroll`** (`min-height:0` + `max-height` + `overflow-y`);
  the grid keeps its exact layout, the wrapper caps to ~6 rows and scrolls the rest.
  Verified with a headless repro of the real modal structure (offline, file://):
  6 of 9 rows shown, scrolls, modal bounded 632/844px (was ballooning). `gridRef`
  (drag-scroll) + scroll-memory moved to the wrapper.
- **Marketplace button** added left of `MY ALBUM` (same style) → opens the
  marketplace; flips to **`BACK TO STORE`** while in the market and returns you there.
- **Lesson for next time:** when a CSS `max-height` "isn't working," suspect a
  **flex-child that won't shrink** before blaming cache/deploy — verify the served
  asset first (it was correct here), then reproduce the structure headless.

## ✅ SHIPPED 2026-07-11 (evening, Opus) — App security audit (2 fixes; prod DB locked)

Full app security pass (API routes · SIWE/session · Alchemy webhook · crons ·
money/economy; contracts excluded). Core verified solid — mostly prior hardening
held up. Full findings + queued cleanup live in ClickUp **86bawbb7j** (11 · Security).

- **🔴 Critical — LOCKED (prod + dev).** Four trade RPCs (`app_sticker_buy` /
  `app_sticker_accept` / `app_sticker_swap_accept` / `app_accept_criteria_offer`)
  were EXECUTE-able directly by the public anon key via PostgREST, bypassing
  route-level SIWE auth (SECURITY DEFINER, actor-identity-as-arg). The 3 main
  money RPCs were already `service_role`-only; these 4 were missed. Revoked
  anon/authenticated/public EXECUTE (service_role retains → app unaffected).
  Applied to prod + migration `20260711_revoke_public_execute_sticker_offer_rpcs.sql`
  (commit 3cb4eea). Verified live: anon blocked, service_role intact.
- **🟠 outputs/color → first-viewer-wins (dev, c57b13d).** Was an overwrite; any
  signed-in user could re-tag any token's colour/fingerprint with a valid-but-wrong
  bucket (cosmetic — attribute sheet + colour rarity). Now returns early if colour
  is already set, mirroring the write-once preview/ascii pins.
- **Queued (pre-mainnet, none blocking today — all in 86bawbb7j):** money-math
  conservation in the trade fns + `app_buy`/`app_accept_offer` (buyer debit skipped
  when payer has no users row → conjure play-ETH); revoke 11 dead anon SELECT grants;
  pin `search_path` on 3 fns; move `citext` out of `public`; add a script-src CSP;
  flip `SIGNUP_SIM_ETH_GRANT=0` at mainnet cutover.
- Branch: `claude/app-security-audit-s6d24p` (work went straight to `dev`).

## ✅ SHIPPED 2026-07-11 (evening, Opus) — Albums revert + Friend Inspector / Projects Pro UI batch (on dev; Worker NOT yet redeployed)

Merged to dev + pushed. **Preview still stale until the app Worker is manually
redeployed** (needs Brendon's Cloudflare token — see the DEPLOY RECIPE below).

- **Albums reverted** to last night's rebuild (34e03e7): removed this morning's
  90° corners + `width:100%` wrap (`styles/albums.css`) and the 3-across desktop
  block (`app/globals.css`). Kept the fable rebuild. Verified album surface ==
  34e03e7 exactly.
- **Friend Inspector view-as-another-user** — `FollowersModal` now takes a target
  address via the modal `slug` arg (ModalContext); the graph/projects/stats loads
  key on `targetAddrLc` (falls back to `siweAddress`). Profile followers stat opens
  `open('followers','followers', user.address)` → that user's circle, compact.
- **Projects Pro modal** (`components/ProjectsProModal.tsx`, ModalName
  `'projectsPro'`, mounted in PriceOSShell) — FI chrome (compact + PLUS), alphabetical
  `allProjects()` list, rows → `/art/{slug}`. Wired to the home hero PRO stat.
- **PriceSprite card** (`components/FriendSpritePopover.tsx`) — Fiat-bubble-style
  portal+tail popover off the sprite tap; PriceRank (tierFor) + score + circle stats;
  `@name` links to profile. Sprite tap added via `CollectedPair` optional `onSpriteTap`.
- **Full-opacity pill outlines** — `.pill-l2` (globals + modal.css) and `.ambient-chip`
  (ambient.css) borders → `var(--text-color)`; `.smgr-sheet-pill` opacity 0.5→1.
- **Wire/Map** → floating text: `.fi-preview-chip` drops the box, weight 400+op .6
  (de-selected) / 800 (selected); toggle nudged down 3px.
- **Profile stats toasts** — first two stats' values now fire `iconToastProps`;
  followers unchanged (opens inspector).
- **FI title glyph** `.smgr-title-ic` scoped to `.followers-pop/.followers-plus`:
  23px + top -2px; `.fm-icon` centred.

## ✅ SHIPPED 2026-07-11 (late afternoon, Opus) — indexer sweep live + APP WORKER REDEPLOYED

- **App Worker `pricediscussion` REDEPLOYED** (OpenNext build → `wrangler
  deploy`; version 31290bc0). This is a MANUAL deploy — there is NO
  auto-deploy from dev / no CI, and the preview had been stale since ~12:45,
  so this redeploy is what finally put ALL of today's dev-merged work LIVE on
  the preview (attributes stats, NPC pass, Lane Runner, albums-3col, indexer
  fix).
  > **⛔ DEPLOY RECIPE — read before EVER redeploying the app Worker (a bad
  > redeploy cost real time this session).** The app has NO auto-deploy / no
  > CI — the `pricediscussion` Worker is updated ONLY by a manual build+deploy.
  > Steps: (1) `export CLOUDFLARE_API_TOKEN=<Brendon's token>` (he creates a
  > fresh "Edit Cloudflare Workers" token per session; NOT stored). (2)
  > `rm -rf .open-next && npx opennextjs-cloudflare build` — this now reads the
  > COMMITTED **`.env.production`** (added this session: all 8 PUBLIC
  > NEXT_PUBLIC_* values, so the client bundle is correct automatically. BEFORE
  > that commit, a fresh-container build baked EMPTY config → wallet defaulted
  > to mainnet + browser Supabase/push broke; the file is the permanent fix,
  > do NOT delete it). (3) `./node_modules/.bin/wrangler deploy` — use the
  > PINNED local wrangler (4.105); `npx wrangler` may pull 4.110 which fails
  > "Could not detect static files". (4) VERIFY: fetch a client chunk from the
  > live site and grep for `zspxpfwlwikdxwavffjn` (Supabase URL present =
  > config baked). Worker SECRETS (service-role, webhook signing, webpush
  > private, CRON_SECRET, ALCHEMY_RPC_URL, SIGNUP_SIM_ETH_GRANT) live on the
  > Worker, survive redeploys, are NOT in `.env.production`. Mainnet cutover =
  > edit `.env.production` (`NEXT_PUBLIC_CHAIN_ID`→1, mainnet Alchemy URL).
- **Indexer reconcile chunking fix** — the sweep's single wide `eth_getLogs`
  failed on Alchemy's free tier (10-block range cap). Now reads the lookback
  window in ≤10-block windows, capped at 40 windows/run. Added a
  `?fromBlock=&toBlock=` targeted replay door (CRON_SECRET-gated) for surgical
  backfills. On dev + deployed. Verified: rolling sweep clean at head, token-2
  backfilled, idempotent re-runs write nothing.
- **New-account 1M sim-ETH grant (pre-mainnet)** — `POST /api/users/create`
  now seeds every BRAND-NEW account with `SIGNUP_SIM_ETH_GRANT` (default
  1,000,000) `sim_eth_balance` so signups can buy/mint in the test phase.
  Existing balances never overwritten. MANUAL mainnet off-switch (Brendon's
  call): `wrangler secret put SIGNUP_SIM_ETH_GRANT` = `0`. Live.
- **Reconcile sweep 2min → 1min** — one every-minute cron now fires BOTH the
  reminder + reconcile sweeps (custom-worker.ts calls both; wrangler crons =
  `["* * * * *"]`). Cloudflare cron floors at 1 min (30s not possible). Live
  (single schedule confirmed on deploy). Deployed version b0daef1f.

## ✅ SHIPPED 2026-07-11 (afternoon) — THE CLOUDFLARE SESSION (all live, trees clean)

**Deployed to the Cloudflare account (via Brendon's API token, in prod now):**
- **fx-sales-feed LIVE** — the fxhash Discord feed, ported off the dead
  fxhash API onto **objkt GraphQL v3**, running every minute with zero
  errors (verified via Workers analytics, not just manual runs). $20 floor
  kept (Brendon: intentional). All 5 webhooks verified + installed as
  secrets. Facts that must not be re-derived: objkt event roles are
  INVERTED vs fxhash issuer/target (proven on-chain via tzkt); collabs come
  decomposed in token.creators; project size = the token's fxhash gallery
  max_items; images = assets.objkt.media/…/artifact; **Tezos only** —
  fxhash ETH/Base sales have no data source anywhere anymore (flagged to
  Brendon). Code: `price-discussion` repo `workers/` (on `main`).
- **pd-sales-feed deployed dormant** — see NEXT UP #3.
- **PDMCP v1 LIVE** — see NEXT UP #5. Gotcha baked into code + README:
  same-account workers.dev→workers.dev fetches are BLOCKED by Cloudflare
  (error 1042); pd-mcp reaches the app through a **service binding**.
- **CRON_SECRET set** on the app Worker → reminder sweep + indexer
  reconcile crons are no longer failing closed (sweep verified healthy).
- Solved a standing unknown: **the app serves its stored previews
  publicly** at `/preview/{slug}/{id}.v2.png` (R2 binding route) — that IS
  the ART_IMAGE_BASE for pd-mcp and the PD feed.

**Shipped to dev (approved + pushed):**
- **Albums covers: 3 across on desktop** (2 rendered gigantic on
  widescreen; phones unchanged). Root cause of the earlier failed attempt:
  the project-page +More albums mock shares the `.albums-grid` class name
  in globals.css and its 2-col rule was winning — the fix is scoped via
  `.albums-wrap`.
- **Attributes tab: 5 new stats** (Brendon's picks, numerology excluded):
  PD Rarity RANK ("#3 rarest of 105", `pdRarityRank` in lib/output/rarity),
  percentile tags on every Fingerprint band (edition context from
  anon-readable outputs rows — `lib/output/editionStats.ts`, gated on ≥30%
  coverage), Mint Order + speed in Almanac ("3rd mint · 2 min after
  launch"), Closest Sibling via existing `nearestKin` (glyph ≍ — NEW, in
  GLYPHS.md), tappable hex Swatches sampled from the piece's own offscreen
  render (`lib/output/paletteChips.ts`, glyph ▧ — NEW; tap copies, toast
  `#HEX: COPIED`).
- **NPC Cast: bubble wrap FIXED** — `overflow-wrap: anywhere` let the
  width-hug binary search shatter words mid-word ("impatienc / e");
  bubbles + measurer now `break-word`. **Writers-room wow pass:** ~130 new
  lines/scenes in `lib/npc/scenarios.ts` — the "they see the SPECIFICS"
  layer (talk around the watching, show don't tell), new duet topics
  (wide/warm/cold/tilt/grain/centered), more sight lines per character on
  previously-unused axes, more exchanges/streaks/actions/night/morning.
  Selection machinery untouched (the used-ledger already prevents repeats;
  the bank is just much deeper now).
- **Lane Runner fixed**: status + hint lines wrap (nowrap was clipping
  above/below the board), tapping the score line opens the live top-10
  (refetches on open), standings refetch after a submit so REAL @handles
  show — the "@you" placeholder is gone.

## ⚠️ FINDINGS this session (know these)

- **Cloudflare error 1042** = a Worker fetching another workers.dev host on
  the same account. Use service bindings. This will bite ANY new worker
  that calls the app.
- Brendon's Cloudflare API token was pasted in-chat for this session only —
  NOT stored anywhere. Future sessions needing deploys: ask him for a fresh
  token (Create Token → "Edit Cloudflare Workers" template; he knows the
  drill now).
- The `users` table is anon-readable (address → handle) — feeds/tools can
  resolve PD names without auth.
- fx feed ops: manual run = GET the worker URL with `Bearer RUN_SECRET`
  (secret on the Worker). KV state keys: `cursor`, `posted`, `prices`.

## 🧭 WAITING ON BRENDON

- **Eyeball + edit the two new footer modals** (About PD · Support) on
  device — copy is v1, Brendon edits from there.
- **Delete the chat branches** — all merged trash, work is on dev:
  `claude/pd-polish-edits-wg8ao6` (this chat),
  `claude/pings-system-redesign-r5kbew`, `claude/pd-about-modal-history-3wpdyo`:
  https://github.com/brendonrell/PriceOS/branches
- **Ticker copy review (2026-07-12)** — Brendon to eyeball the new store +
  marketplace crawl lines and send any wording edits (he said he'd review shortly).
- Feature Atlas re-order · ASCII-Mode glyph ⠿ iPhone check · Lane Runner
  top-10 trigger spot (leaderboard now exists in-game via score-line tap —
  may satisfy this) · docs.pricediscussion.com wiring — all previously
  ClickUp'd.

## 🧭 THE ROAD TO MAINNET

1. ✅ Indexer sweep go-live + token-2 backfill — DONE 2026-07-11 (see SHIPPED).
2. Phase C — app talks to Sepolia (`docs/sepolia-test-phase.md` §3–4).
3. Mythic Audit Pass (`86b9v5wj4`) — the last gate.

## 📋 QUEUED (older, not started)

- Group sorts rework · Languages as a gen-art trait — discussion only.

## ⚠️ Known / deferred (older)

- ASCII 1/3-down line — faint artifact line, cause not isolated.
- Test prices (registry) — bulletin `0.2222`, reliquary `22.222` — REMOVE
  before mainnet.
