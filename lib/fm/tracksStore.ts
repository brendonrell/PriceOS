'use client';

/*
 * tracksStore — YOUR TRACKS, the viewer's OWN miniplayer stations (Brendon,
 * 2026-07-28: "the ability for users to make a personal playlist of up to 22 YT
 * playlists, same criteria as the artist one except this is a personal private
 * list they can change anytime").
 *
 * PRIVATE, and that is the whole point: this rides the settings envelope with
 * `starred` and its family, so it never appears on a profile, is never returned
 * by a public read, and belongs to nobody but its owner. It follows the account
 * across devices like every other envelope key.
 *
 * SAME CRITERIA AS THE ARTIST'S: what counts as a valid station here is exactly
 * what counts for a Project soundtrack — a public YouTube playlist (or a single
 * full-album video), normalised by lib/project/soundtrack and health-checked by
 * /api/studio/playlist, the very route the Studio uses. One gate, one answer;
 * a link the artists' surface would reject is rejected here too.
 *
 * Key format: `${playlistId}|${label}` — a playlist id never contains a pipe,
 * so the label is simply the remainder and may contain anything. Persistence
 * protocol lives in createPinStore.
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringList } from '../pins/createPinStore';

const SEP = '|';

/** Brendon's number. The list is a cassette wallet, not a library. */
export const MAX_TRACKS = 22;

export interface FmTrack {
    playlistId: string;
    label: string;
}

function parseKey(k: string): FmTrack | null {
    const i = k.indexOf(SEP);
    if (i <= 0) return null;
    const playlistId = k.slice(0, i);
    const label = k.slice(i + 1);
    if (!playlistId) return null;
    return { playlistId, label: label || playlistId };
}

const store = createPinStore<string[]>({
    storageKey: STATE_CACHE_KEYS.fmTracks,
    empty: () => [],
    decode: (parsed) => decodeStringList(parsed).filter((k) => parseKey(k) != null).slice(0, MAX_TRACKS),
    encode: (keys) => keys,
    push: (encoded) => pushSettings({ fmTracks: encoded as string[] }),
});

/** The viewer's own stations, in the order they added them. */
export function getTracks(): ReadonlyArray<FmTrack> {
    return store.get()
        .map(parseKey)
        .filter((t): t is FmTrack => t != null);
}

export function hasTrack(playlistId: string): boolean {
    return store.get().some((k) => k.slice(0, k.indexOf(SEP)) === playlistId);
}

export type AddTrackResult = 'added' | 'duplicate' | 'full';

/** Add a station. Refuses a duplicate and refuses to pass 22. */
export function addTrack(playlistId: string, label: string): AddTrackResult {
    const cur = store.get();
    if (cur.some((k) => k.slice(0, k.indexOf(SEP)) === playlistId)) return 'duplicate';
    if (cur.length >= MAX_TRACKS) return 'full';
    store.set([...cur, `${playlistId}${SEP}${label.replace(/\s+/g, ' ').trim() || playlistId}`]);
    return 'added';
}

/** Drop a station. Changeable any time — that was the ask. */
export function removeTrack(playlistId: string): void {
    store.set(store.get().filter((k) => k.slice(0, k.indexOf(SEP)) !== playlistId));
}

export function subscribeTracks(cb: (keys: string[]) => void): () => void {
    return store.subscribe(cb);
}
