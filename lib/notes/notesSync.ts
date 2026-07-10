'use client';

/*
 * notesSync — the account-backed half of Notes (Brendon, 2026-07-10).
 *
 * Every note the viewer writes — per-Output, per-artist, per-day — now lives
 * in the account record's settings envelope (`settings.notes` on public.users)
 * as LINK-AWARE records: each note says what it's attached to. A fourth kind,
 * 'free' (attached to nothing), is fully supported at this layer so the
 * backend is ready the day the Thoughts & Memories front end lands — free
 * notes round-trip through hydrate/push untouched even though no surface
 * renders them yet.
 *
 * Local stores stay exactly what they are (the instant-paint write-through
 * caches, same doctrine as userState):
 *   - pd_token_notes  — per-Output notes, keyed `${slug}:${id}` (legacy bare id)
 *   - pd_artist_notes — per-artist notes, keyed by artist name
 *   - pd_day_notes    — calendar day notes, keyed 'YYYY-MM-DD'
 *
 * Flow mirrors every other envelope citizen:
 *   hydrate: userState.hydrateFromRow → hydrateNotesToLocal(s.notes) writes the
 *     three caches + fires the change events the live surfaces already listen
 *     to. Seed ONLY when the account carries the key (grails/mutes precedent) —
 *     a pre-sync device's notes are never wiped; its first save pushes them up.
 *   push: every save/delete funnels through NotePromptContext / NotesBox,
 *     which call scheduleNotesPush(). The push is deferred a tick so the
 *     setState-updater localStorage writes have landed, then assembles the
 *     full record list from the caches and pushSettings({ notes }).
 *
 * Timestamps: each record carries `t` (epoch ms of last text change), kept
 * stable across pushes by diffing against the last known set — future
 * cross-device merges have a winner to pick.
 */

import { pushSettings } from '../state/userState';
import type { NoteRecord } from '../supabase';
import { NOTES_STORAGE_KEY, noteKey, parseNoteKey, readAllNotes } from './tokenNotes';

const ARTIST_NOTES_KEY = 'pd_artist_notes';
const DAY_NOTES_KEY = 'pd_day_notes';

/** Records with no local surface yet ('free' + any future kind), retained
 *  verbatim from hydrate so a push never drops them. */
let _passthrough: NoteRecord[] = [];

/** Last known record per identity — keeps `t` stable when text is unchanged. */
let _lastByIdentity = new Map<string, NoteRecord>();

let _pushTimer: ReturnType<typeof setTimeout> | null = null;

function readMap(key: string): Record<string, string> {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, string>)
            : {};
    } catch {
        return {};
    }
}

/** Stable identity for a record — what it's linked to (not its text). */
function identityOf(n: NoteRecord): string {
    switch (n.kind) {
        case 'output': return `output|${n.slug ?? ''}|${n.id ?? ''}`;
        case 'artist': return `artist|${n.artist ?? ''}`;
        case 'day': return `day|${n.day ?? ''}`;
        default: return `${n.kind}|${n.nid ?? ''}`;
    }
}

function stamp(n: NoteRecord): NoteRecord {
    const prev = _lastByIdentity.get(identityOf(n));
    return { ...n, t: prev && prev.text === n.text ? (prev.t ?? Date.now()) : Date.now() };
}

/** Assemble the complete link-aware record list from the local caches
 *  (+ passthrough kinds). */
export function collectNotes(): NoteRecord[] {
    const out: NoteRecord[] = [];
    for (const [k, text] of Object.entries(readAllNotes())) {
        if (typeof text !== 'string' || !text.trim()) continue;
        const { slug, id } = parseNoteKey(k);
        if (Number.isNaN(id)) continue;
        out.push(stamp({ kind: 'output', slug, id, text }));
    }
    for (const [artist, text] of Object.entries(readMap(ARTIST_NOTES_KEY))) {
        if (typeof text !== 'string' || !text.trim()) continue;
        out.push(stamp({ kind: 'artist', artist, text }));
    }
    for (const [day, text] of Object.entries(readMap(DAY_NOTES_KEY))) {
        if (typeof text !== 'string' || !text.trim()) continue;
        out.push(stamp({ kind: 'day', day, text }));
    }
    out.push(..._passthrough);
    _lastByIdentity = new Map(out.map((n) => [identityOf(n), n]));
    return out;
}

/** Push the account's notes after the in-flight setState/localStorage writes
 *  settle (they run inside updaters — a tick later they're readable). Multiple
 *  saves in the same tick coalesce to one PATCH. */
export function scheduleNotesPush(): void {
    if (typeof window === 'undefined') return;
    if (_pushTimer != null) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => {
        _pushTimer = null;
        pushSettings({ notes: collectNotes() });
    }, 0);
}

/**
 * Server snapshot → local caches. Called by userState.hydrateFromRow (server
 * wins). Only runs when the account actually carries a notes array — absent
 * key = account never synced notes; local stays (first save pushes it up).
 * Fires the change events the live note surfaces already re-read on.
 */
export function hydrateNotesToLocal(notes: NoteRecord[] | undefined): void {
    if (!Array.isArray(notes) || typeof window === 'undefined') return;
    const token: Record<string, string> = {};
    const artist: Record<string, string> = {};
    const day: Record<string, string> = {};
    const passthrough: NoteRecord[] = [];
    for (const n of notes) {
        if (!n || typeof n !== 'object' || typeof n.text !== 'string') continue;
        if (n.kind === 'output' && typeof n.id === 'number') {
            token[noteKey(n.slug ?? null, n.id)] = n.text;
        } else if (n.kind === 'artist' && typeof n.artist === 'string') {
            artist[n.artist] = n.text;
        } else if (n.kind === 'day' && typeof n.day === 'string') {
            day[n.day] = n.text;
        } else {
            passthrough.push(n);
        }
    }
    _passthrough = passthrough;
    _lastByIdentity = new Map(notes.map((n) => [identityOf(n), n]));
    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(token));
        localStorage.setItem(ARTIST_NOTES_KEY, JSON.stringify(artist));
        localStorage.setItem(DAY_NOTES_KEY, JSON.stringify(day));
    } catch { /* quota / private mode — in-memory surfaces still work */ }
    window.dispatchEvent(new Event('pd:notes-changed'));
    window.dispatchEvent(new Event('pd:artist-notes-changed'));
}

/** Sign-out — drop the retained records so a different identity signing in
 *  next can never inherit them. Called by userState.resetUserState. */
export function resetNotesSync(): void {
    if (_pushTimer != null) { clearTimeout(_pushTimer); _pushTimer = null; }
    _passthrough = [];
    _lastByIdentity = new Map();
}
