# Brief · PD.fm (for a fresh Fable session)

**From:** the 2026-07-19 Opus ideation session. **Read `CLAUDE.md` first.**
Work on `dev` rules; present before pushing. Brendon's name for the feature is
**PD.fm**.

## What it is

A **persistent bottom mini-player** that streams the platform's soundtracks. The
soundtracks are **public YouTube playlists** (per-project, in the registry —
`soundtrack.label` + the playlist id; Global Search already surfaces them). Build
the whole thing on **that YT source only** — no hosted audio.

## ⛔ The honest limit — write it INTO the UI, don't hide it

- The player uses the **YouTube IFrame Player API** (embedded player, playlist
  playback). It lives in the **shell** so it keeps playing across the whole app
  as you navigate (SPA — never unmounts on client nav).
- **Phones STOP YouTube audio the moment the screen locks or the app backgrounds.**
  YouTube does this on purpose (to push Premium + their native app). **No embed
  trick beats it.** So PD.fm is a **"session radio"** — it plays *while PD is open*,
  **not** in your pocket. The UI must be honest about this; never imply background
  play.
- **Autoplay needs one user tap first** (browser rule) — fine for a "press play"
  station.
- **True background / lock-screen audio is impossible on this source** — it would
  require hosting our own audio files, which YT's ToS forbids for their content and
  which we don't have. Not on the table. (A future "real radio" is a separate
  project if artists ever hand over actual audio files.)
- **iOS PWA** (we're going hard there): the YT iframe player works foreground in an
  installed iOS PWA; the same lock-screen limit applies.

## Shape

- A **thin persistent mini-player** at the bottom: one tap to start, **skip / next**,
  **play / pause**.
- **Auto-tunes to context:** a project's own soundtrack when you're on its page;
  otherwise a platform **"station"** (what's minting / trending).
- Reuse the registry soundtracks + the Global Search soundtrack rows.

## Note

Keep the visible player present (YT ToS wants the embed reasonably visible; a
fully-hidden audio-only player is against their rules and is blocked anyway). A
small, legible mini-bar is the right shape.
