# BRIEF — To-Dos (the real feature: "Todoist in PD")

> **✅ SHIPPED to `dev` 2026-07-04 (build green) — v1 + most fast-follows.**
> One real store (`lib/todos/todoStore.ts` + `types.ts` + `parse.ts`,
> account-backed via the settings envelope) feeds ALL surfaces: the connect-menu
> accordion (Meta-chips layout, quick-add composer, war-chest line, Sentinel,
> **label filter row**), the calendar overlay AND the Top Bar Calendar (both read
> the store; the Top Bar Calendar was also wired to the real /api/calendar EVENTS
> feed Fable left on the seed), and the artwork "Make To-Do" buttons.
>
> Now shipped beyond the original v1:
> - **Recurring** — completing a recurring to-do advances it to the next
>   occurrence (`toggleTodo` → `advanceDue`); shown with a ↻ chip.
> - **Labels + filtering** — `#tag` labels, a filter-chip row narrows the list.
> - **Magic quick-add** (`lib/todos/parse.ts`) — "buy prisms 22 under .4 fri"
>   parses verb/piece/◊target/due/priority/#labels/recurrence.
> - **In-app due reminders** (`components/todos/TodoReminders.tsx`, mounted in the
>   shell) — pops a Pingtoast when an open dated to-do comes due; reminds once per
>   (id@due), backlog collapsed into one toast on load.
>
> **✅ Native closed-app reminders — NOW BUILT + wired (2026-07-04).** VAPID keys
> are in Cloudflare (Brendon). The sweep is `app/api/cron/todo-reminders/route.ts`
> (fail-closed on `CRON_SECRET`), dispatched **every minute** — users pick due
> times to the minute, so ~1-min latency is the ceiling. `wrangler.jsonc` carries
> two crons (`* * * * *` reminders, `*/2 * * * *` reconcile) and `custom-worker.ts`
> dispatches by which fired, so the indexer reconcile's RPC load stays at 2 min.
> Delivery via `sendTodoReminder` in `lib/push/webpush.ts` (reuses the exact
> subscription + Pingtoasts-mode + Silent-Mode gate as `sendNativePing`).
> Stateless exactly-once (window == the 1-min cadence, no prod-data write). Goes
> LIVE the moment `dev` is deployed to Cloudflare with a user who has "3D
> Pingtoasts" on. `nodejs_compat` is set, so `web-push` runs on the Worker.
> **v1 timing:** an HH:MM to-do fires at that minute; a date-only to-do fires at
> `TODO_REMINDER_UTC_HOUR` (default 13:00 UTC — set the env var to change it).
> Per-account timezone is a future refinement.
>
> **Cloudflare headroom (Workers Paid):** 2 crons of 250 allowed; ~66k cron
> invocations/mo of 10M included (<1%); CPU is trivial (sends are I/O, not CPU);
> per-tick subrequests are well under the 10k/invocation cap. **Scale-watch:** the
> per-minute sweep reads each push-subscriber's settings every minute — fine at
> current scale; once push-subscribers reach the thousands, narrow the query and
> drop the double settings read (sweep + sender both read it today).
>
> **Still deferred — needs Brendon:**
> 1. **War-chest "vs wallet ETH" line.** `useBalance` only resolves inside the
>    deferred WagmiProvider (WalletStack); the connect-menu accordion is outside
>    it, so it can't read balance without moving the meter or lifting provider
>    scope. Committed-total half ships now; the vs-wallet compare is deferred.
>
> Excluded per Brendon: Call Your Shot, Streaks.
>
> ⚠️ The done glyph ✓ (U+2713) is NEW — eyeball it on iPhone; swap if it tofus.

**For a fresh Opus 4.8 session. Read CLAUDE.md first; subagents allowed.**
**REUSE, NEVER REINVENT (Rule #0): the finished Notes feature is the blueprint —
copy its store/list/create/delete pattern; do not hand-roll a new one.**

## The ask (Brendon, 2026-07-04)

Make To-Dos a real feature — the ambition is "Todoist in this baby": a to-do
system people would genuinely use as their main to-do app. Two ways in: raw
free-text todos, AND todos created from an Output ("BUY this artwork"). Ship a
usable v1, then layer the Todoist-grade extras.

## Current state — three FAKE surfaces, none connected (all show the same 5 mock rows)

1. **Connect-menu TO-DOS accordion** — `components/dropdown/TodosBox.tsx` renders
   `lib/data/mockTodos.ts` (5 hardcoded rows, count frozen at `(5)`). Static.
2. **Calendar To-Dos overlay** — `components/CalendarPanel.tsx` reads
   `lib/calendar/data.ts` `CAL_TODOS` (hardcoded map) behind the To-Dos toggle:
   red dot on the grid day + a `.cal-event-todo` row in the day column. Static.
3. **"Make To-Do" button** — `components/artwork/OutputActionRow.tsx` (and the
   gallery hover row in `components/ArtworkCard.tsx`). Fires a toast
   `Added to To-Dos` and **writes nothing**. Dead button.

**The one real thing already built:** the calendar has a live dated-item backend
(`/api/calendar`, `CalendarPanel` compose/delete, personal + global scopes). That
backend is for **events**, not the home of todos — see the architecture call.

## Architecture (Brendon's call, 2026-07-04)

- **Todos are their OWN store** — must hold many **dateless** todos happily
  (someone may have 50, none with a date). They are NOT calendar items.
- **A todo WITH a due date re-dresses onto the calendar** — one direction only.
  The calendar overlay reads from the todo store; the fake `CAL_TODOS` is deleted.
- **One store feeds all three surfaces.** Blueprint = the Notes store
  (`components/dropdown/NotesBox.tsx`): a localStorage store + a change event the
  three surfaces subscribe to, with account write-through so it follows the user
  across devices (same pattern as `pushSettings` in `PdNotifsContext`, and the
  server-wins re-read on `USERSTATE_HYDRATED_EVENT`).

## Data model (v1 shape — extend, don't over-build)

A todo item:
- `id`
- `text` — the freeform title (raw todo), OR the action label for an output todo
- `kind` — `'raw' | 'output'`
- `source` — for output todos: `{ slug, tokenId, verb }` (verb = BUY/OFFER/LIST/
  DELIST/SEND — the existing mock vocabulary) so the row can deep-link to the piece
- `due` — optional ISO date (+ optional time). Absent = dateless, list-only
- `priority` — P1–P4 (default none/P4)
- `priceEth` — **optional ETH amount** on a todo (a target / budget, e.g.
  "snipe floor · ◊0.4"). Rendered as a small chip using **◊ (U+25CA, the lozenge)
  — the ETH mark the sticker store uses** (`components/stickers/BuySheetButton.tsx`,
  `◊︎ {price}`). NOT the Greek Xi (Ξ), NOT the lined lozenge ⟠ (that's the *volume*
  icon).
- `done` — boolean
- `createdAt`
Own storage key (e.g. `pd_todos`), account write-through like notes/notifs.

**GLYPH QUEUE ITEM (build time):** ◊ (U+25CA) is NOT in `docs/GLYPHS.md` yet —
document it as the **secondary ETH symbol** (per Brendon). Then purge Ξ everywhere
it wrongly stands in for ETH (known spot: the price-memory ghost in
`components/ArtworkCard.tsx`, `LAST · {eth} Ξ`).

## Collector wow features (APPROVED — part of the build, Brendon 2026-07-04)

What makes PD todos more than Todoist — they ride the market data, calendar,
pings, and Familiar already in the app. Tiered by real effort.

**In v1 (cheap — no new plumbing):**
- **War-chest / budget meter** — sum `priceEth` across open buy-todos into a
  "committed spend" line (e.g. "◊2.3 across 6 targets"), optionally vs wallet
  balance. Pure client math over the store.
- **Calendar drop → one-tap todo** — on a calendar event (drops/mints already in
  `CAL_EVENTS` + the `/api/calendar` ledger), a one-tap "add as todo" seeds a dated
  todo (e.g. "mint Strata · 22:00") with a reminder. The shared calendar becomes
  personal action items.

**Fast-follow (need a price-feed hook and/or the scheduled push):**
- **THE SENTINEL — a todo that watches the market.** A price-target todo ("BUY
  Prisms #22 under ◊0.4") watches the live floor/offer; when it crosses, the row
  flips ❍ → glowing **READY**, fires a Pingtoast, and carries a one-tap deep-link
  to act. The headline feature. Reuses the ping pipeline; needs a market-price hook
  (`lib/market/` already exists). Native-closed alert rides the 3D push plumbing.
- **Floor-guard todos (defensive Sentinel)** — "tell me if Strata #37 floor breaks
  ◊0.1." Same watcher, downside trigger. Protects holdings.
- **The Familiar as todo agent** — the Digital Familiar surfaces/suggests todos
  unprompted ("wishlist floor dropped 20% — snipe todo?") and nudges stale ones.
  Wires into the existing Familiar engine (`lib/engines/familiarEngine.ts`,
  `lib/familiar/`).
- **Magic quick-add** — natural-language parse: "buy prisms 22 under .4 fri" →
  structured output todo with piece + `priceEth` + `due`. Project/#id aware.

**EXCLUDED — do NOT build (Brendon, 2026-07-04):**
- **Call Your Shot** (broadcasting a public target to the tape/feed) — NO.
- **Streaks / karma** for completing todos — OUT for now.

## The three surfaces (all read the one store)

1. **Connect-menu accordion** (`TodosBox.tsx`) — live list + live count. Each row:
   pending glyph, text, optional due chip, priority tint. Tap the circle to
   complete. Raw-todo create happens via a "+" **(Brendon will place the +)** —
   build the add affordance/composer reusing the calendar compose input pattern
   (`.cal-compose`), wired to the todo store, but leave final placement to him.
   Per-row delete = the Notes `.notif-item-delete` × on hover, verbatim.
2. **Calendar** (`CalendarPanel.tsx` + `lib/calendar/data.ts`) — replace
   `CAL_TODOS` with a read of dated todos from the store. Keep the existing red
   `.cal-day-todo-dot` on the grid and the `.cal-event-todo` row in the day
   column, behind the existing To-Dos toggle. Completing from the calendar row
   updates the same store. Delete `CAL_TODOS` and its import.
3. **"Make To-Do" button** (`OutputActionRow.tsx` + `ArtworkCard.tsx`) — becomes
   real: creates an `output` todo `{ verb:'BUY', slug, tokenId }` rendered as
   `BUY PRISMS #22`, tapping the row deep-links to the piece. Keep the same glyph
   + toast; the toast now reflects a real write. **v1 = remind + tap-through, it
   does NOT execute the buy/list/offer** — wiring the verb to actually fire the
   action is a later feature on its own.

## Glyphs (obey docs/GLYPHS.md — device-verify any NEW glyph on iOS before locking)

- **Pending todo** = `❍` (U+274D) — already the canonical To-Do glyph (GLYPHS §3),
  used on the button and both fake surfaces. Keep it.
- **Done todo** = **needs a NEW glyph.** Do NOT use a filled circle `●` (U+25CF) —
  that is the Audience presence dot (GLYPHS §10, three uses) and reads as the wrong
  thing. Recommended: a check mark `✓` (U+2713), which shares nothing with the
  circle family. It is not yet in the vocabulary → **device-verify it renders as
  monochrome TEXT on iOS (the #1 glyph gate) before locking**, and add it to
  GLYPHS.md once confirmed.
- **Completed treatment** = **strike-through** the text (Brendon), and sink
  completed rows to the bottom of the list (they stay, struck, not deleted).

## Reminders

- **In-app (Pingtoasts, app open)** — a due todo fires a Pingtoast + connect-icon
  badge via the existing pipeline (`PdNotifsContext` `pingToasts`, `lib/pings`).
  This is the cheap path and is v1.
- **Native "3D" reminders (app CLOSED)** — real new plumbing: the phone isn't
  running our JS when PD is closed, so a due-time native notification needs a
  **scheduled server-side push**. This is a fast-follow, NOT free — scope it
  honestly (a scheduler + push-send against installed-PWA subscriptions). Do not
  claim native-closed reminders work until this is built and verified.

## Scope tiers

**v1 (feels like Todoist day one):** one real todo store; live connect-menu list +
count; raw quick-add composer; real "Make To-Do" output todos with deep-link;
due dates (+ time) that re-dress onto the calendar; check-to-complete with
strike-through + sink; priorities (P1–P4, flag + colour); in-app Pingtoast
reminders; **war-chest / budget meter; calendar drop → one-tap todo.** Delete all
three mock sources (`mockTodos.ts`, `CAL_TODOS`, the dead toast path).

**Fast-follow:** **the Sentinel (market-watching price targets) + floor-guard; the
Familiar as todo agent; magic natural-language quick-add;** recurring todos ("every
Monday"); native "3D" closed-app reminders (scheduled push); labels/tags +
filtering.

**Later (Todoist-deep):** sub-tasks; projects/sections; comments;
sharing/collaboration. (Streaks/karma + Call Your Shot are EXCLUDED — see above.)

## Constraints

- Rule #0 / Rule "build to spec": reuse the Notes + calendar-compose components
  verbatim; add ONLY what this brief names. No bonus affordances. The "+" exists
  but Brendon places it — build the composer, not a new nav entry point.
- Present Brendon a numbered CEO-level list; merge to `dev` ONLY on his explicit
  "push"/"approved". NO AMPUTATION of existing calendar/notes behaviour.
- Verify with the real production build; device-check the done glyph on iPhone.
- Delete this brief in the same PR that completes v1.

## NOT part of this brief (separate tiny task, queued 2026-07-04)

**Seen pings → 25% opacity, not struck.** Read pings already carry a "seen"
state (`.notif-item.read` in `PingsBox.tsx`); dim them to 25% opacity. One-line
CSS change, unrelated to todos — do it on its own, don't fold it in here.
