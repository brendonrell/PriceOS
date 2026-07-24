'use client';

/*
 * listStore — LISTS, the user's own named groupings of saved Outputs
 * (Brendon, 2026-07-24).
 *
 * Built ON TOP OF STARRED. Starred is the flat bookmark bucket ("like it, star
 * it, find it later"); a List is a NAMED slice of that bucket, so the same
 * saved piece can sit in as many lists as the user wants. Starring is
 * untouched — adding to a list never stars or unstars anything.
 *
 * The distinction from Albums, which look similar and are not: an Album is
 * NUMBERED by position and can never be named (Brendon, 2026-06-12 — users get
 * no public-facing writing). Lists are PRIVATE, like Starred, which is exactly
 * why the user CAN name them — nobody else ever reads the name.
 *
 * State: ordered ListRecord { id, name, keys[], created_at }; keys are
 * `${slug}:${id}` (Project-exact, same as starStore — a bare token number
 * collides across Projects).
 *
 * Persistence: the createPinStore protocol (localStorage cache + account
 * write-through via the settings envelope `lists`), so lists follow the viewer
 * across devices exactly like their stars.
 */

import type { ListRecord } from '../supabase';
import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore } from './createPinStore';

/** Longest name we store — long enough to be descriptive, short enough that a
 *  list pill never wraps the sort row on an iPhone. */
export const LIST_NAME_MAX = 32;

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
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
                ? r.keys.filter((k): k is string => typeof k === 'string' && k.includes(':'))
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
 * Add Outputs to a list, de-duped and insertion-ordered. Returns how many were
 * actually added (0 = every one was already in), or null for an unknown list.
 */
export function addToList(
    listId: string,
    items: ReadonlyArray<{ slug: string; id: number }>,
): number | null {
    const lists = snapshot(store.get());
    const list = lists.find((l) => l.id === listId);
    if (!list) return null;
    const have = new Set(list.keys);
    let added = 0;
    for (const it of items) {
        const k = keyOf(it.slug, it.id);
        if (have.has(k)) continue;
        have.add(k);
        list.keys.push(k);
        added++;
    }
    if (added > 0) store.set(lists);
    return added;
}

/** Drop Outputs from a list. Returns how many were removed, or null if unknown. */
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

/** Whether an Output is already in a given list. */
export function isInList(listId: string, slug: string, id: number): boolean {
    const list = store.get().find((l) => l.id === listId);
    return !!list && list.keys.includes(keyOf(slug, id));
}

/** Every list an Output belongs to — powers the "already in" ticks. */
export function listsContaining(slug: string, id: number): ReadonlyArray<ListRecord> {
    const k = keyOf(slug, id);
    return snapshot(store.get().filter((l) => l.keys.includes(k)));
}

/** Member keys of a list, or null when the list is gone. */
export function listKeys(listId: string): ReadonlyArray<string> | null {
    const list = store.get().find((l) => l.id === listId);
    return list ? [...list.keys] : null;
}
