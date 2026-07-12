// lib/pings/artistPushPresets.ts — pure, shared client/server.
//
// ARTIST PUSH — the Studio perk: an artist may ping ALL holders of one of
// their Projects ONCE PER MONTH per project. The message is chosen from this
// preset list (no free text in v1 — the perk stays a perk, never a spam
// channel). The server enforces both the artist check and the monthly rate.

export interface ArtistPushPreset {
  id: string;
  /** Short label shown in the Studio picker. */
  label: string;
  /** The message holders receive (rendered as "@artist <message> · @project"). */
  message: string;
}

export const ARTIST_PUSH_PRESETS: readonly ArtistPushPreset[] = [
  { id: 'new_work',   label: 'NEW WORK',      message: 'has new work on the way — keep your eyes on the project' },
  { id: 'drop_live',  label: 'DROP LIVE',     message: 'just went live — minting now' },
  { id: 'thank_you',  label: 'THANK YOU',     message: 'sends thanks to every holder — this project exists because of you' },
  { id: 'milestone',  label: 'MILESTONE',     message: 'just crossed a milestone with you — thank you, holders' },
  { id: 'secondary',  label: 'ON THE MARKET', message: 'notes fresh pieces just hit the secondary market' },
  { id: 'last_call',  label: 'LAST CALL',     message: 'says only a handful remain — the edition is nearly sold out' },
] as const;

export function artistPushPreset(id: string): ArtistPushPreset | null {
  return ARTIST_PUSH_PRESETS.find((p) => p.id === id) ?? null;
}

/** One push per project per this many days. */
export const ARTIST_PUSH_COOLDOWN_DAYS = 30;

/** The rate-limit marker every Artist Push row carries (group_key). */
export function artistPushGroupKey(slug: string): string {
  return `APUSH:${slug}`;
}
