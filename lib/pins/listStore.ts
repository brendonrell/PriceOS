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
 * Soundtrack, Transaction, PriceDay, Album, Vault — because All Starred's row
 * CTA is + List for every row (Brendon, 2026-07-25). Members are keyed with
 * the GRAIL PIN key vocabulary (Rule #0 — grailKey already names every
 * starred kind exactly once), so a member key round-trips back to the pin
 * that drew the row. PriceDay/Album/Vault have no Grail Pin equivalent (not
 * pinnable in the top bar), so they're kept OUT of GrailKind/GrailPin and
 * live in their own small ListOnlyPin union instead — List-only, same key
 * vocabulary, zero risk to the unrelated Grail Pin rendering surfaces.
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

/** The three starred kinds with no Grail Pin equivalent — PriceDay, Album,
 *  Vault. Kept out of GrailKind so widening List support never touches the
 *  Grail Pin pill-rendering surfaces (TopBarRow, ArtworkCard, etc). */
export type ListOnlyKind = 'priceday' | 'album' | 'vault';
export interface ListOnlyPin {
    kind: ListOnlyKind;
    /** PriceDay kind only. */
    priceDayNumber?: number;
    /** Album/Vault kind only — whose shelf it's starred from. */
    ownerAddress?: string;
    albumId?: string;
    vaultId?: string;
}

/** A list member is a grail pin, or one of the three List-only kinds. */
export type ListMember = GrailPin | ListOnlyPin;

/** The member key for a pin (grail key: `o:` `p:` `t:` `a:` `s:` `x:`; List-
 *  only: `d:` PriceDay, `b:` Album, `v:` Vault). */
export function listKeyOf(pin: ListMember): string {
    switch (pin.kind) {
        case 'priceday': return `d:${pin.priceDayNumber}`;
        case 'album': return `b:${pin.ownerAddress}:${pin.albumId}`;
        case 'vault': return `v:${pin.ownerAddress}:${pin.vaultId}`;
        default: return grailKey(pin);
    }
}

const KINDED = /^[opwatsxdbv]:/;

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
    | { kind: 'tx'; key: string; txId: string }
    | { kind: 'priceday'; key: string; number: number }
    | { kind: 'album'; key: string; ownerAddress: string; albumId: string }
    | { kind: 'vault'; key: string; ownerAddress: string; vaultId: string };

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
        case 'd': {
            const n = Number(rest);
            return Number.isFinite(n) ? { kind: 'priceday', key, number: n } : null;
        }
        case 'b':
        case 'v': {
            const i = rest.lastIndexOf(':');
            if (i < 0) return null;
            const ownerAddress = rest.slice(0, i);
            const id = rest.slice(i + 1);
            return key[0] === 'b'
                ? { kind: 'album', key, ownerAddress, albumId: id }
                : { kind: 'vault', key, ownerAddress, vaultId: id };
        }
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

/**
 * Move one member so it lands where another currently sits (Brendon,
 * 2026-07-25 — drag to reorder inside a list). Members render in stored order,
 * so this IS the order the user reads. No-ops when either key is missing or
 * they're the same, and returns whether anything moved.
 */
export function moveInList(listId: string, key: string, ontoKey: string): boolean {
    if (key === ontoKey) return false;
    const lists = snapshot(store.get());
    const list = lists.find((l) => l.id === listId);
    if (!list) return false;
    const from = list.keys.indexOf(key);
    const onto = list.keys.indexOf(ontoKey);
    if (from < 0 || onto < 0) return false;
    list.keys.splice(from, 1);
    list.keys.splice(onto, 0, key);
    store.set(lists);
    return true;
}

/**
 * Move a whole LIST so it lands where another currently sits (Brendon,
 * 2026-07-28 — drag the lists themselves, not just the rows inside). Lists are
 * stored in an order and the panel can read that order instead of A→Z, so this
 * IS the order the user sees once they've arranged. Same contract as
 * moveInList: no-ops on unknown/identical ids, reports whether anything moved.
 */
export function moveList(listId: string, ontoId: string): boolean {
    if (listId === ontoId) return false;
    const lists = snapshot(store.get());
    const from = lists.findIndex((l) => l.id === listId);
    const onto = lists.findIndex((l) => l.id === ontoId);
    if (from < 0 || onto < 0) return false;
    const [moved] = lists.splice(from, 1);
    lists.splice(onto, 0, moved);
    store.set(lists);
    return true;
}

/**
 * Rewrite the stored order to match the ids given (any list the caller didn't
 * name keeps its place at the end). This is how "arrange" starts from what the
 * user is currently looking at — the A→Z they've been reading becomes the
 * baseline they drag against, instead of the creation order they've never seen.
 */
export function setListOrder(ids: ReadonlyArray<string>): void {
    const lists = snapshot(store.get());
    const rank = new Map(ids.map((id, i) => [id, i]));
    lists.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
    store.set(lists);
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
