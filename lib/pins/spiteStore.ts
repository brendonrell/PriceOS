'use client';

/*
 * spiteStore — the Spite Book's saved names.
 *
 * The book is a fixed grid of SLOTS (12 pages × 6 lines = 72). A name lives at
 * the exact slot it was written into, so tapping any blank line and inscribing a
 * foe keeps it THERE (Brendon, 2026-06-24). Empty slots are null.
 *
 * The site-wide spite matcher (dimming + strikethrough on spited handles) reads
 * the dense list of non-empty names, so per-slot placement never changes how
 * matching works.
 *
 * Persistence: localStorage `pd_spite_names`. Stored as the slot array (nulls
 * preserved). Legacy storage was a dense string[]; it hydrates into the first
 * slots in order.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'pd_spite_names';
const MAX_LEN = 40;       // a single name can't exceed this many chars
export const SPITE_SLOTS = 72; // 12 pages × 6 lines

type Listener = (names: readonly string[]) => void;

let slots: (string | null)[] = new Array(SPITE_SLOTS).fill(null);
let hydrated = false;
const listeners = new Set<Listener>();

/* Normalised form used for matching: lower-cased, trimmed, leading "@" stripped
   — so a spite entry of "@matty" matches "@matty", "matty", "MATTY". */
let matchSet: Set<string> = new Set();

export function normalizeHandle(raw: string): string {
    return (raw || '').trim().replace(/^@+/, '').toLowerCase();
}

function liveNames(): string[] {
    return slots.filter((s): s is string => !!s);
}

function rebuildMatchSet(): void {
    matchSet = new Set(liveNames().map(normalizeHandle).filter(Boolean));
}

export function isSpited(handle: string | null | undefined): boolean {
    if (!handle) return false;
    hydrate();
    const n = normalizeHandle(handle);
    return n.length > 0 && matchSet.has(n);
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) { rebuildMatchSet(); return; }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            // New shape: a slot array (strings + nulls), placed by index.
            // Legacy shape: a dense string[] → fills the first slots in order.
            parsed.forEach((n, i) => {
                if (i >= SPITE_SLOTS) return;
                const s = typeof n === 'string' ? n.trim() : '';
                slots[i] = s ? s.slice(0, MAX_LEN) : null;
            });
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
    rebuildMatchSet();
}

function persist(): void {
    rebuildMatchSet();
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    } catch {
        /* ignore */
    }
}

let version = 0;

function emit(): void {
    version += 1;
    const snapshot = liveNames();
    listeners.forEach((l) => l(snapshot));
}

export function useSpiteMatcher(): (handle: string | null | undefined) => boolean {
    useSyncExternalStore(subscribeSpite, () => version, () => 0);
    return isSpited;
}

/** Dense snapshot of the inscribed names (non-empty slots, in slot order). */
export function getSpiteNames(): readonly string[] {
    hydrate();
    return liveNames();
}

/** Per-slot snapshot (length SPITE_SLOTS); null = empty line. */
export function getSpiteSlots(): readonly (string | null)[] {
    hydrate();
    return slots.slice();
}

function isDup(name: string): boolean {
    const lower = name.toLowerCase();
    return slots.some((n) => n != null && n.toLowerCase() === lower);
}

/** Add a name into a SPECIFIC slot. Fails if the slot is taken, the name is
 *  blank, or it's already inscribed elsewhere. Returns true if placed. */
export function addSpiteNameAt(index: number, raw: string): boolean {
    hydrate();
    if (index < 0 || index >= SPITE_SLOTS) return false;
    if (slots[index]) return false;
    const name = (raw || '').trim().slice(0, MAX_LEN);
    if (!name || isDup(name)) return false;
    slots[index] = name;
    persist();
    emit();
    return true;
}

/** Add a name into the first free slot (kept for non-book callers). */
export function addSpiteName(raw: string): boolean {
    hydrate();
    const free = slots.findIndex((s) => s == null);
    if (free === -1) return false;
    return addSpiteNameAt(free, raw);
}

/** Clear a specific slot. Returns true if it held a name. */
export function removeSpiteAt(index: number): boolean {
    hydrate();
    if (index < 0 || index >= SPITE_SLOTS || !slots[index]) return false;
    slots[index] = null;
    persist();
    emit();
    return true;
}

/** Remove a name (exact, case-insensitive). Returns true if removed. */
export function removeSpiteName(name: string): boolean {
    hydrate();
    const lower = (name || '').trim().toLowerCase();
    const idx = slots.findIndex((n) => n != null && n.toLowerCase() === lower);
    if (idx === -1) return false;
    slots[idx] = null;
    persist();
    emit();
    return true;
}

export function subscribeSpite(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
