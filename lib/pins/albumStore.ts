/*
 * albumStore — REAL Albums (Brendon, 2026-06-12).
 *
 * Albums are NUMBERED, ordered collections of Outputs the viewer curates —
 * the third leg of the save triad (Star = flag it, Wishlist = want it,
 * Album = shelve it). Albums are never NAMED (Brendon, 2026-06-12): users
 * get no public-facing writing beyond their handle, so every surface
 * renders an album as its 1-based position — "so-and-so's album #1", #2, …
 * No album cap — as many as the user wants. This store is the single
 * source of truth consumed by the Add-to-Album picker (multi-select bars),
 * the card/modal album icons, and the profile Albums surfaces when those
 * graduate from shells.
 *
 * State shape: ordered list of AlbumRecord { id, name, keys[], created_at },
 * keys are `${slug}:${id}` (Project-exact — same reasoning as starStore).
 * `name` is a legacy field: pre-numbering records carry their old string,
 * new records carry '' — display NEVER reads it, only position.
 * Same module-singleton + subscribe pattern as starStore / muteStore.
 *
 * Persistence: localStorage `pd_albums`, account write-through via the
 * settings envelope (pushSettings) — albums follow the viewer across
 * devices exactly like stars/wishlist.
 *
 * PUBLIC (Brendon, 2026-08-02): albums are a public shelf — anyone can see an
 * album and who made it. The project page's Albums tab reads every album
 * holding that project via /api/project/[slug]/albums; the social feed reads
 * the graph's shelves. Nothing else in the settings envelope changed — Starred,
 * Wishlist, Lists and History stay private.
 */

import type { AlbumRecord } from '../supabase';
import {
    pushSettings,
    STATE_CACHE_KEYS,
    USERSTATE_HYDRATED_EVENT,
} from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.albums;

type Listener = (albums: ReadonlyArray<AlbumRecord>) => void;

let albums: AlbumRecord[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

function sanitize(parsed: unknown): AlbumRecord[] {
    if (!Array.isArray(parsed)) return [];
    const out: AlbumRecord[] = [];
    for (const a of parsed) {
        if (!a || typeof a !== 'object') continue;
        const r = a as Partial<AlbumRecord>;
        if (typeof r.id !== 'string') continue;
        out.push({
            id: r.id,
            name: typeof r.name === 'string' ? r.name : '',
            keys: Array.isArray(r.keys)
                ? r.keys.filter((k): k is string => typeof k === 'string' && k.includes(':'))
                : [],
            created_at: typeof r.created_at === 'number' ? r.created_at : 0,
            ...(typeof r.cover === 'string' && r.cover.includes(':') ? { cover: r.cover } : {}),
        });
    }
    return out;
}

function loadFromCache(): AlbumRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return sanitize(JSON.parse(raw));
    } catch {
        return [];
    }
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    albums = loadFromCache();
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
        } catch {
            /* ignore */
        }
    }
    // Account write-through — same envelope ride as stars/wishlist. No-op
    // until an authed snapshot has hydrated (userState guards this).
    pushSettings({ albums: albums.map((a) => ({ ...a, keys: [...a.keys] })) });
}

function emit(): void {
    const snapshot: ReadonlyArray<AlbumRecord> = albums.map((a) => ({
        ...a,
        keys: [...a.keys],
    }));
    listeners.forEach((l) => l(snapshot));
}

/* Server snapshot landed (login on any device) — re-read the cache userState
   just overwrote and refresh subscribers. Same pattern as starStore. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        albums = loadFromCache();
        emit();
    });
}

/** Snapshot of the viewer's albums, insertion-ordered. Triggers hydrate. */
export function getAlbums(): ReadonlyArray<AlbumRecord> {
    hydrate();
    return albums.map((a) => ({ ...a, keys: [...a.keys] }));
}

/**
 * Create an album. Albums are numbered by position, never named (the
 * legacy `name` field stays '' on new records); there is no cap. The new
 * album's display number is its 1-based index in getAlbums().
 */
export function createAlbum(): AlbumRecord {
    hydrate();
    const record: AlbumRecord = {
        id: `alb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: '',
        keys: [],
        created_at: Date.now(),
    };
    albums.push(record);
    persist();
    emit();
    return { ...record, keys: [...record.keys] };
}

/**
 * Add Outputs to an album (de-duped, insertion-ordered). Returns the count
 * actually added (0 = all were already in), or null for an unknown album.
 */
export function addToAlbum(
    albumId: string,
    items: ReadonlyArray<{ slug: string; id: number }>,
): number | null {
    hydrate();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return null;
    const have = new Set(album.keys);
    let added = 0;
    for (const it of items) {
        const k = keyOf(it.slug, it.id);
        if (have.has(k)) continue;
        have.add(k);
        album.keys.push(k);
        added++;
    }
    if (added > 0) {
        persist();
        emit();
    }
    return added;
}

/** Whether an Output is already in a given album. */
export function isInAlbum(albumId: string, slug: string, id: number): boolean {
    hydrate();
    const album = albums.find((a) => a.id === albumId);
    return !!album && album.keys.includes(keyOf(slug, id));
}

/** Every album that CONTAINS an Output, with each album's 1-based number. */
export function albumsContaining(slug: string, id: number): { album: AlbumRecord; number: number }[] {
    hydrate();
    const k = keyOf(slug, id);
    const out: { album: AlbumRecord; number: number }[] = [];
    albums.forEach((a, i) => {
        if (a.keys.includes(k)) out.push({ album: { ...a, keys: [...a.keys] }, number: i + 1 });
    });
    return out;
}

/** Remove Outputs from an album. Clears the cover if it was removed.
 *  Returns the count removed, or null for an unknown album. */
export function removeFromAlbum(albumId: string, keys: ReadonlyArray<string>): number | null {
    hydrate();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return null;
    const drop = new Set(keys);
    const before = album.keys.length;
    album.keys = album.keys.filter((k) => !drop.has(k));
    if (album.cover && drop.has(album.cover)) delete album.cover;
    const removed = before - album.keys.length;
    if (removed > 0) {
        persist();
        emit();
    }
    return removed;
}

/** Delete an album outright. Later albums renumber implicitly (position). */
export function deleteAlbum(albumId: string): boolean {
    hydrate();
    const before = albums.length;
    albums = albums.filter((a) => a.id !== albumId);
    if (albums.length === before) return false;
    persist();
    emit();
    return true;
}

/** Set (or clear, with null) an album's cover. The key must be a member. */
export function setAlbumCover(albumId: string, key: string | null): boolean {
    hydrate();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return false;
    if (key === null) delete album.cover;
    else if (album.keys.includes(key)) album.cover = key;
    else return false;
    persist();
    emit();
    return true;
}

/** Move member keys to the FRONT of an album, preserving their order —
 *  the lightweight power-reorder until full drag lands. */
export function moveToFront(albumId: string, keys: ReadonlyArray<string>): boolean {
    hydrate();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return false;
    const pick = new Set(keys);
    const front = album.keys.filter((k) => pick.has(k));
    if (front.length === 0) return false;
    album.keys = [...front, ...album.keys.filter((k) => !pick.has(k))];
    persist();
    emit();
    return true;
}

/** Subscribe to album changes. Returns an unsubscribe function. */
export function subscribeAlbums(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
