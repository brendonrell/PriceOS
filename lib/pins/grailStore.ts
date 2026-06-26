'use client';

/*
 * grailStore — F50 (BUG-02), extended to all starred kinds (Brendon 2026-06-19).
 *
 * Module-singleton store for the Grail Pin system. Surfaces read + write the
 * same pinned set — TopBarRow renders the pills, ArtworkCard / OutputPreview
 * render the Output pin button, and the Starred list pins ANY kind (Output,
 * Project, Trait, Artist, Soundtrack). Caps at 5 (sim 12426), insertion order.
 *
 * A pin carries its `kind` plus the data each kind needs to resolve + render:
 *   - output     : slug + id
 *   - project    : slug
 *   - trait      : slug + category + value
 *   - artist     : slug (the @handle, no '@')
 *   - soundtrack : slug + playlistId (+ title for display)
 *
 * Backward-compatible: the original Output API (togglePin/isPinned/unpinGrail
 * keyed on slug+id) is preserved so ArtworkCard / OutputPreview / TopBarRow keep
 * working untouched. Legacy persisted entries (bare {slug,id}, pre-kind) hydrate
 * as Output pins.
 *
 * Persistence: localStorage `pd_grail_pins`.
 */

const STORAGE_KEY = 'pd_grail_pins';
const MAX_PINS = 10;
export const MAX_GRAIL_PINS = MAX_PINS;

import type { TxStar } from './txStarStore';

export type GrailKind = 'output' | 'wishlist' | 'project' | 'trait' | 'artist' | 'soundtrack' | 'tx';

export interface GrailPin {
    kind: GrailKind;
    /** Project slug — or, for an artist pin, the @handle (without '@'). For a tx
     *  pin, the slug of the token the transaction is about (for the pill label). */
    slug: string;
    /** Output id (output kind only). */
    id?: number;
    /** Trait category + value (trait kind only). */
    category?: string;
    value?: string;
    /** Soundtrack playlist id + display title (soundtrack kind only). */
    playlistId?: string;
    title?: string;
    /** The starred transaction's essentials (tx kind only) — enough to render
     *  the pill + open the token it concerns. */
    tx?: TxStar;
}

type Listener = (pins: readonly GrailPin[]) => void;

let pins: GrailPin[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

/** Stable identity for a pin — drives de-dupe, toggle, and React keys. */
export function grailKey(p: GrailPin): string {
    switch (p.kind) {
        case 'output': return `o:${p.slug}:${p.id}`;
        case 'wishlist': return `w:${p.slug}:${p.id}`;
        case 'project': return `p:${p.slug}`;
        case 'trait': return `t:${p.slug}|${p.category}|${p.value}`;
        case 'artist': return `a:${p.slug}`;
        case 'soundtrack': return `s:${p.slug}|${p.playlistId}`;
        case 'tx': return `x:${p.tx?.id}`;
        default: return `?:${p.slug}`;
    }
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            pins = parsed
                .map((p): GrailPin | null => {
                    if (!p || typeof p !== 'object' || typeof p.slug !== 'string') return null;
                    // Legacy entry (no kind) = an Output pin {slug, id}.
                    const kind: GrailKind = typeof p.kind === 'string' ? p.kind : 'output';
                    if (kind === 'output' || kind === 'wishlist') {
                        if (typeof p.id !== 'number' || !Number.isFinite(p.id)) return null;
                        return { kind, slug: p.slug, id: p.id };
                    }
                    if (kind === 'project') return { kind: 'project', slug: p.slug };
                    if (kind === 'trait') {
                        if (typeof p.category !== 'string' || typeof p.value !== 'string') return null;
                        return { kind: 'trait', slug: p.slug, category: p.category, value: p.value };
                    }
                    if (kind === 'artist') return { kind: 'artist', slug: p.slug };
                    if (kind === 'soundtrack') {
                        if (typeof p.playlistId !== 'string') return null;
                        return { kind: 'soundtrack', slug: p.slug, playlistId: p.playlistId, title: typeof p.title === 'string' ? p.title : undefined };
                    }
                    if (kind === 'tx') {
                        const tx = p.tx;
                        if (!tx || typeof tx !== 'object' || typeof tx.id !== 'string' || typeof tx.type !== 'string') return null;
                        return { kind: 'tx', slug: p.slug, tx: tx as TxStar };
                    }
                    return null;
                })
                .filter((p): p is GrailPin => p != null);
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot = pins.slice();
    listeners.forEach((l) => l(snapshot));
}

export type ToggleGrailResult = 'pinned' | 'unpinned' | 'limit';

/** Current pin list (read-only snapshot). Triggers hydrate on first call. */
export function getGrails(): readonly GrailPin[] {
    hydrate();
    return pins;
}

/* ── Kind-agnostic API (the Starred list uses these) ──────────────────── */

export function isPinnedItem(pin: GrailPin): boolean {
    hydrate();
    const k = grailKey(pin);
    return pins.some((p) => grailKey(p) === k);
}

export function togglePinItem(pin: GrailPin): ToggleGrailResult {
    hydrate();
    const k = grailKey(pin);
    const idx = pins.findIndex((p) => grailKey(p) === k);
    if (idx >= 0) {
        pins = pins.filter((_, i) => i !== idx);
        persist();
        emit();
        return 'unpinned';
    }
    if (pins.length >= MAX_PINS) return 'limit';
    pins = [...pins, pin];
    persist();
    emit();
    return 'pinned';
}

export function unpinGrailItem(pin: GrailPin): boolean {
    hydrate();
    const k = grailKey(pin);
    const idx = pins.findIndex((p) => grailKey(p) === k);
    if (idx < 0) return false;
    pins = pins.filter((_, i) => i !== idx);
    persist();
    emit();
    return true;
}

/* ── Output-specific API (unchanged signatures — ArtworkCard / OutputPreview /
   TopBarRow keep calling these) ───────────────────────────────────────── */

export function isPinned(slug: string, id: number): boolean {
    return isPinnedItem({ kind: 'output', slug, id });
}

export function togglePin(slug: string, id: number): ToggleGrailResult {
    return togglePinItem({ kind: 'output', slug, id });
}

export function unpinGrail(slug: string, id: number): boolean {
    return unpinGrailItem({ kind: 'output', slug, id });
}

/**
 * Subscribe to pin changes. Returns an unsubscribe function. Listener
 * is invoked with a snapshot, never the live array.
 */
export function subscribeGrails(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
