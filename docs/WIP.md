# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

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
- **Branch:** all work is on `dev`, pushed, tree clean. This chat's task branch
  `claude/output-activity-feed-q5poor` is trash (work is on dev) —
  Brendon deletes on GitHub. Stale local-dev self-heals via the SessionStart hook.
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
