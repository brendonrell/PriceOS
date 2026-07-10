'use client';

/*
 * tokenNotes — the ONE key scheme for the viewer's private per-Output notes
 * (localStorage 'pd_token_notes').
 *
 * Per-project keying split (Brendon queue 2026-07-10): notes used to key by
 * bare numeric id, so #5 in two Projects shared one note. Notes now key by
 * `${slug}:${id}` (slug lowercase — same composite every pin/star store
 * already uses). The storage key name itself stays 'pd_token_notes' so no
 * blob migration is needed.
 *
 * Legacy notes (bare numeric keys) can't be attributed to a Project after
 * the fact — no record of where they were written exists. So reads FALL
 * BACK to the bare-id key when no slug-keyed note exists (old notes stay
 * visible exactly where they showed before), and the note editor UPGRADES
 * on save: saving under a resolved Project writes the slug key and deletes
 * the bare one. Old ambiguity drains out note-by-note; new notes are always
 * Project-exact.
 *
 * Every consumer (gallery caption, output modal, action row, bench, starred/
 * wishlist rows, Notes accordion, My Notes filter) reads through these
 * helpers so the lookup is byte-identical everywhere.
 */

export const NOTES_STORAGE_KEY = 'pd_token_notes';

/** Composite storage key. Null slug (unresolvable context) → legacy bare id. */
export function noteKey(slug: string | null, id: number): string {
    return slug ? `${slug.toLowerCase()}:${id}` : String(id);
}

/** The whole notes map, straight from storage. Empty object on any failure. */
export function readAllNotes(): Record<string, string> {
    try {
        const raw = typeof localStorage !== 'undefined'
            ? localStorage.getItem(NOTES_STORAGE_KEY)
            : null;
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}

/** One Output's note text — Project-exact key first, legacy bare-id key as
 *  the fallback. Empty string = no note. */
export function readNoteFor(slug: string | null, id: number): string {
    const notes = readAllNotes();
    const exact = slug ? notes[noteKey(slug, id)] : undefined;
    if (typeof exact === 'string') return exact;
    const legacy = notes[String(id)];
    return typeof legacy === 'string' ? legacy : '';
}

/** Parse a storage key back to its parts. Legacy bare-id keys → slug null. */
export function parseNoteKey(key: string): { slug: string | null; id: number } {
    const sep = key.lastIndexOf(':');
    if (sep === -1) return { slug: null, id: parseInt(key, 10) };
    return { slug: key.slice(0, sep) || null, id: parseInt(key.slice(sep + 1), 10) };
}
