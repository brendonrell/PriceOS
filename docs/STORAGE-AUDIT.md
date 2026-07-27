# Storage audit — what follows the account, what stays on the phone

_2026-07-27. Asked for by Brendon alongside "the bench needs to be fully db not
localstorage"._

## The bench: already done

The Bench has been database-backed since **2026-06-15** — its own `bench_items`
table with row-level security, its own owner-scoped endpoint, and cross-device
sync that unions the phone's set with the server's on sign-in and saves on every
change after. `pd_bench` in localStorage is the **write-through cache**, not the
source of truth, exactly as the app's storage doctrine intends. The Cart works
the same way.

Nothing to migrate. The one honest caveat: **logged out, the bench is
device-only** — there is no account to write to. That is by design, not a gap.

---

## How to read this

localStorage being present is not itself a fault. The documented pattern is:
*the server row is the source of truth, localStorage is a write-through cache so
the app paints before React mounts and keeps working offline.* A key is only a
problem when **nothing ever writes it to the server** — then it is real user work
that dies when they switch devices.

Every key below was classified by whether its owning module writes to the
account at all (`pushSettings` / `pushState` / `/api/me` / a collection sync).

**111 keys total. 65 are account-backed. 46 are device-only**, and those 46 split
three ways.

---

## 1. Device-only and WRONG — real work that dies on a second device

Ordered by how much it would hurt to lose.

| Key | What it is |
|---|---|
| `pd_workspaces`, `pd_active_workspace` | The user's whole workspace set. **The `workspaces` column already exists** in the users table and the merge function already writes it — the client simply never calls it. The plumbing is built and unused. |
| `pd_composer_programs` | Saved Composer programs. |
| `pd_starred_presets` | Saved grid-view presets. |
| `pd_budgets` | The budget engine's saved budgets. |
| `pd_anchors` | Anchor pins. |
| `pd_day_notes`, `pd_token_notes` | Day notes and per-token note flags. (Artist notes DO sync — `notesSync` — so notes are half-migrated.) |
| `pd_sticker_align`/`arrange`/`border`/`density`/`expand`/`flip`/`rows`/`seed`/`tilt` | The hero sticker arrangement prefs. Sticker ownership and hand-placements ARE backed (`sticker_state`); these nine prefs that shape the same hero are not. |
| `pd_settings_group` | The saved DEFAULT grouping. A settings-row preference that doesn't travel — worth noting since the grouping work of 2026-07-26/27 leans on it. |
| `pd_fiat_currency` | Display-currency choice. |
| `pd_portfolio_group_mode`, `pd_portfolio_price_mode`, `pd_portfolio_hidden` | Portfolio view state, including which holdings are hidden. |
| `pd_more_sort`, `pd_lists_price_mode` | Sort/price-mode prefs on the More and Lists surfaces. |

**The cheapest real win is workspaces** — the column and the merge path already
exist, so it is a client-side wiring job rather than a schema change.

## 2. Device-only and CORRECT — leave alone

- **Session:** `pd_siwe_session`.
- **Caches** (re-fetchable, and stale data would be worse than none):
  `pd_ens_cache`, `pd_fiat_fx`, `pd_pings_cache`, `pd_user_row_cache`.
- **One-shot / idempotency flags** — syncing these would *suppress* a first-run
  on a device that never had it: `pd_3d_firstrun_asked`, `pd_notes_seeded`,
  `pd_notes_reset_v1`, `pd_stickers_reset_v2`, `pd_ws_defaults_seeded`,
  `pd_sticker_claim_sync`, `pd_todo_reminded`, `pd_streak_pinged_`.
- **Debug:** `pd_debug_persona`.

## 3. Device-only and ARGUABLE — transient UI state

Panel open/closed, scroll and drag positions, and which page of a manager you
were on. Syncing these is defensible but low value, and some would be actively
annoying across devices (a drag position from a phone applied on a desktop).

`pd_watch_pos`, `pd_sticker_rail_x`, `pd_sticker_mgr_page`, `pd_sticker_peeled`,
`pd_fi_lens`, `pd_fi_preview`, `pd_carto_war`, `pd_notes_open`, `pd_tape_open`,
`pd_todos_open`, `pd_ambient_page`, `pd_lr_best` (a game high score — the one
here with a real claim to syncing).

---

## Reproducing this

The classification is mechanical, not a judgement call — collect every `pd_*`
key, then ask whether the file owning it writes to the account:

```
grep -rho "['\"\`]pd_[a-zA-Z0-9_.:-]*" lib components app \
  --include=*.ts --include=*.tsx | tr -d "'\"\`" | sort -u
```

then for each key, check its owning file for `pushSettings`, `pushState`,
`/api/me` or `useCollectionSync`. Bucketing 1/2/3 above is the only human step.
