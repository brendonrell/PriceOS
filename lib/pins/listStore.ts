'use client';

/*
 * listStore — LISTS, the user's own named groupings of STARRED things
 * (Brendon, 2026-07-24; widened past Outputs 2026-07-25).
 *
 * Built ON TOP OF STARRED. Starred is the flat bookmark bucket ("like it, star
 * it, find it later"); a List is a NAMED slice of that bucket, so the same
 * saved thing can sit in as many lists as the user wants. Starring is
 * untouched — adding to a list never stars or unstars anything.
 *
 * The distinction from Albums, which look similar and are not: an Album is
 * NUMBERED by position and can never be named (Brendon, 2026-06-12 — users get
 * no public-facing writing). Lists are PRIVATE, like Starred, which is exactly
 * why the user CAN name them — nobody else ever reads the name.
 *
 * A list holds ANY starred kind — Output, Project, Trait, Artist/Collector,
 * Soundtrack, Transaction — because All Starred's row CTA is Add to List for
 * every row (Brendon, 2026-07-25). Members are keyed with the GRAIL PIN key
 * vocabulary (Rule #0 — grailKey already names every starred kind exactly
 * once), so a member key round-trips back to the pin that drew the row.
 *
 * State: ordered ListRecord { id, name, keys[], created_at }.
 *
 * Persistence: the createPinStore protocol (localStorage cache + account
 * write-through via the settings envelope `lists`), so lists follow the viewer
 * across devices exactly like their stars. Keys stored before the widening
 * were bare `${slug}:${id}` Outputs; they hydrate as Output members.
 */

import type { ListRecord } from '../supabase';
import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore } from './createPinStore';
import { grailKey, type GrailPin } from './grailStore';

/** Longest name we store — long enough to be descriptive, short enough that a
 *  list pill never wraps the sort row on an iPhone. */
export const LIST_NAME_MAX = 32;

/** A list member is exactly a grail pin — same vocabulary, same key. */
export type ListMember = GrailPin;

/** The member key for a pin (grail key: `o:` `p:` `t:` `a:` `s:` `x:`). */
export function listKeyOf(pin: ListMember): string {
    return grailKey(pin);
}

const KINDED = /^[opwatsx]:/;

/** Normalise a persisted key: pre-widening Outputs were stored bare. */
function normalizeKey(k: string): string | null {
    if (typeof k !== 'string' || !k.includes(':')) return null;
    if (KINDED.test(k)) return k;
    const i = k.lastIndexOf(':');
    return Number.isFinite(Number(k.slice(i + 1))) ? `o:${k}` : null;
}

/** One member, parsed back out of its key — what a row needs to render. */
export type ListMemberRef =
    | { kind: 'output'; key: string; slug: string; id: number }
    | { kind: 'project'; key: string; slug: string }
    | { kind: 'trait'; key: string; slug: string; category: string; value: string }
    | { kind: 'artist'; key: string; slug: string }
    | { kind: 'soundtrack'; key: string; slug: string; playlistId: string }
    | { kind: 'tx'; key: string; txId: string };

export function parseListKey(key: string): ListMemberRef | null {
    const rest = key.slice(2);
    if (!rest) return null;
    switch (key[0]) {
        case 'o':
        case 'w': {
            const i = rest.lastIndexOf(':');
            const id = Number(rest.slice(i + 1));
            if (i < 0 || !Number.isFinite(id)) return null;
            return { kind: 'output', key, slug: rest.slice(0, i), id };
        }
        case 'p': return { kind: 'project', key, slug: rest };
        case 't': {
            const parts = rest.split('|');
            if (parts.length < 3) return null;
            return { kind: 'trait', key, slug: parts[0], category: parts[1], value: parts.slice(2).join('|') };
        }
        case 'a': return { kind: 'artist', key, slug: rest };
        case 's': {
            const parts = rest.split('|');
            if (parts.length < 2) return null;
            return { kind: 'soundtrack', key, slug: parts[0], playlistId: parts.slice(1).join('|') };
        }
        case 'x': return { kind: 'tx', key, txId: rest };
        default: return null;
    }
}

/** Tolerate any cached shape; drop anything that isn't a usable record. */
function decodeLists(parsed: unknown): ListRecord[] {
    if (!Array.isArray(parsed)) return [];
    const out: ListRecord[] = [];
    for (const raw of parsed) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as Partial<ListRecord>;
        if (typeof r.id !== 'string' || !r.id) continue;
        const name = typeof r.name === 'string' ? r.name.trim().slice(0, LIST_NAME_MAX) : '';
        if (!name) continue; // a nameless list can't be shown or picked
        out.push({
            id: r.id,
            name,
            keys: Array.isArray(r.keys)
                ? r.keys
                    .map((k) => (typeof k === 'string' ? normalizeKey(k) : null))
                    .filter((k): k is string => k != null)
                : [],
            created_at: typeof r.created_at === 'number' ? r.created_at : Date.now(),
        });
    }
    return out;
}

const store = createPinStore<ListRecord[]>({
    storageKey: STATE_CACHE_KEYS.lists,
    empty: () => [],
    decode: decodeLists,
    encode: (lists) => lists.map((l) => ({ ...l, keys: [...l.keys] })),
    push: (encoded) => pushSettings({ lists: encoded as ListRecord[] }),
});

/** Deep copy so callers can never mutate store state in place. */
function snapshot(lists: ReadonlyArray<ListRecord>): ListRecord[] {
    return lists.map((l) => ({ ...l, keys: [...l.keys] }));
}

/** The viewer's lists, in creation order. */
export function getLists(): ReadonlyArray<ListRecord> {
    return snapshot(store.get());
}

export function subscribeLists(cb: (lists: ReadonlyArray<ListRecord>) => void): () => void {
    return store.subscribe((s) => cb(snapshot(s)));
}

/**
 * Create a named list. The name is trimmed and capped; an empty name is
 * rejected (returns null) — a list with no name can't be picked out of a
 * lineup. Duplicate names are allowed: they're private, and the user may well
 * want two takes on the same idea.
 */
export function createList(rawName: string): ListRecord | null {
    const name = rawName.trim().slice(0, LIST_NAME_MAX);
    if (!name) return null;
    const record: ListRecord = {
        id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        keys: [],
        created_at: Date.now(),
    };
    store.set([...store.get(), record]);
    return { ...record, keys: [] };
}

/**
 * Add starred things to a list, de-duped and insertion-ordered. Returns how
 * many were actually added (0 = every one was already in), or null for an
 * unknown list.
 */
export function addToList(
    listId: string,
    items: ReadonlyArray<ListMember>,
): number | null {
    const lists = snapshot(store.get());
    const list = lists.find((l) => l.id === listId);
    if (!list) return null;
    const have = new Set(list.keys);
    let added = 0;
    for (const it of items) {
        const k = listKeyOf(it);
        if (have.has(k)) continue;
        have.add(k);
        list.keys.push(k);
        added++;
    }
    if (added > 0) store.set(lists);
    return added;
}

/** Drop members from a list. Returns how many were removed, or null if unknown. */
export function removeFromList(
    listId: string,
    keys: ReadonlyArray<string>,
): number | null {
    const lists = snapshot(store.get());
    const list = lists.find((l) => l.id === listId);
    if (!list) return null;
    const drop = new Set(keys);
    const before = list.keys.length;
    list.keys = list.keys.filter((k) => !drop.has(k));
    const removed = before - list.keys.length;
    if (removed > 0) store.set(lists);
    return removed;
}

/** Whether a starred thing is already in a given list. */
export function isInList(listId: string, member: ListMember): boolean {
    const list = store.get().find((l) => l.id === listId);
    return !!list && list.keys.includes(listKeyOf(member));
}

/** Every list a starred thing belongs to — powers the "already in" ticks. */
export function listsContaining(member: ListMember): ReadonlyArray<ListRecord> {
    const k = listKeyOf(member);
    return snapshot(store.get().filter((l) => l.keys.includes(k)));
}

/**
 * Rename a list. Same trim + cap as creation; an empty name is rejected
 * (returns false) so a list can never lose the only thing identifying it.
 */
export function renameList(listId: string, rawName: string): boolean {
    const name = rawName.trim().slice(0, LIST_NAME_MAX);
    if (!name) return false;
    const lists = snapshot(store.get());
    const list = lists.find((l) => l.id === listId);
    if (!list || list.name === name) return false;
    list.name = name;
    store.set(lists);
    return true;
}

/**
 * Delete a list. Only the grouping goes — the pieces themselves stay starred,
 * because a List is a VIEW of Starred, never the thing holding them.
 */
export function deleteList(listId: string): boolean {
    const lists = store.get();
    const next = lists.filter((l) => l.id !== listId);
    if (next.length === lists.length) return false;
    store.set(snapshot(next));
    return true;
}

/** Member keys of a list, or null when the list is gone. */
export function listKeys(listId: string): ReadonlyArray<string> | null {
    const list = store.get().find((l) => l.id === listId);
    return list ? [...list.keys] : null;
}
