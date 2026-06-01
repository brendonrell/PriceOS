'use client';

/*
 * presetStore — Gallery View Presets.
 *
 * Stores up to 3 named view presets per collection slug. Each preset
 * captures the full gallery view state: sort family + direction +
 * feedKind, active trait filters, category selections, myNotes,
 * searchQuery, priceMin, priceMax.
 *
 * Same module-singleton pattern as grailStore / muteStore / starStore.
 * Persistence: localStorage key `pd_presets_${slug}`.
 * Hydration is lazy — first read or subscribe pulls from storage.
 *
 * Auto-naming: savePreset derives a human-readable label from the
 * snapshot — e.g. "#ID ↑ · Layer:Crust" or "$PRICE ↓ · 0.1–0.5Ξ".
 * Pass an explicit `name` to override.
 *
 * "Currently loaded" tracking: loadedIndex (-1 = none / drifted) is
 * in-memory only. The caller resets it to -1 via setLoadedIndex()
 * whenever the user mutates view state after a recall.
 */

import type { SortKey, SortDir, FeedKind } from '../state/SortContext';
import type { TraitCategory, FeedCategory } from '../state/TraitsContext';

export interface PresetViewState {
    sort: SortKey;
    dir: SortDir;
    feedKind: FeedKind;
    activeFilters: Record<TraitCategory, string[]>;   // Set → array for JSON
    activeCategory: TraitCategory | null;
    activeFeedCategory: FeedCategory | null;
    activeSubFilter: string;
    myNotesActive: boolean;
    searchQuery: string;
    priceMin: string;
    priceMax: string;
}

export interface PresetEntry {
    name: string;
    state: PresetViewState;
}

export type SavePresetResult = 'saved' | 'replaced';

const MAX_PRESETS = 3;

/* ── Helpers ────────────────────────────────────────────────────── */

function storageKey(slug: string): string {
    return `pd_presets_${slug}`;
}

const SORT_LABEL: Record<SortKey, string> = {
    id:    '#ID',
    price: '$PRICE',
    feed:  'FEED',
    fog:   'FOG',
};

const DIR_GLYPH: Record<SortDir, string> = { asc: '↑', desc: '↓' };

function deriveName(state: PresetViewState): string {
    const base = `${SORT_LABEL[state.sort]} ${DIR_GLYPH[state.dir]}`;
    const cats = Object.keys(state.activeFilters) as TraitCategory[];
    for (const cat of cats) {
        const vals = state.activeFilters[cat];
        if (vals.length > 0) return `${base} · ${cat}:${vals[0]}`;
    }
    if (state.searchQuery.trim())
        return `${base} · "${state.searchQuery.trim().slice(0, 12)}"`;
    if (state.priceMin || state.priceMax) {
        const range = [state.priceMin || '0', state.priceMax || '∞'].join('–');
        return `${base} · ${range}Ξ`;
    }
    if (state.myNotesActive) return `${base} · Notes`;
    return base;
}

/* ── Per-slug store ─────────────────────────────────────────────── */

type Listener = (presets: readonly PresetEntry[], loadedIndex: number) => void;

interface SlugStore {
    presets: PresetEntry[];
    loadedIndex: number;
    hydrated: boolean;
    listeners: Set<Listener>;
}

const stores = new Map<string, SlugStore>();

function getStore(slug: string): SlugStore {
    if (!stores.has(slug)) {
        stores.set(slug, {
            presets: [],
            loadedIndex: -1,
            hydrated: false,
            listeners: new Set(),
        });
    }
    return stores.get(slug)!;
}

function hydrate(slug: string): void {
    const s = getStore(slug);
    if (s.hydrated) return;
    s.hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(storageKey(slug));
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            s.presets = (parsed as unknown[]).filter(
                (e): e is PresetEntry =>
                    typeof e === 'object' && e !== null &&
                    typeof (e as PresetEntry).name === 'string' &&
                    typeof (e as PresetEntry).state === 'object'
            ).slice(0, MAX_PRESETS);
        }
    } catch { /* ignore — bad JSON, quota, private mode */ }
}

function persist(slug: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            storageKey(slug),
            JSON.stringify(getStore(slug).presets)
        );
    } catch { /* ignore */ }
}

function emit(slug: string): void {
    const s = getStore(slug);
    const snapshot = s.presets.slice();
    s.listeners.forEach((l) => l(snapshot, s.loadedIndex));
}

/* ── Public API ─────────────────────────────────────────────────── */

export function getPresets(slug: string): readonly PresetEntry[] {
    hydrate(slug);
    return getStore(slug).presets;
}

export function getLoadedIndex(slug: string): number {
    return getStore(slug).loadedIndex;
}

export function savePreset(
    slug: string,
    state: PresetViewState,
    name?: string
): { result: SavePresetResult; index: number } {
    hydrate(slug);
    const s = getStore(slug);
    const entry: PresetEntry = { name: name ?? deriveName(state), state };
    let result: SavePresetResult;
    let index: number;

    if (s.presets.length < MAX_PRESETS) {
        s.presets = [...s.presets, entry];
        index = s.presets.length - 1;
        result = 'saved';
    } else {
        s.presets = [...s.presets.slice(1), entry];
        index = MAX_PRESETS - 1;
        result = 'replaced';
    }

    s.loadedIndex = index;
    persist(slug);
    emit(slug);
    return { result, index };
}

export function deletePreset(slug: string, index: number): boolean {
    hydrate(slug);
    const s = getStore(slug);
    if (index < 0 || index >= s.presets.length) return false;
    s.presets = s.presets.filter((_, i) => i !== index);
    if (s.loadedIndex === index) s.loadedIndex = -1;
    else if (s.loadedIndex > index) s.loadedIndex -= 1;
    persist(slug);
    emit(slug);
    return true;
}

export function setLoadedIndex(slug: string, index: number): void {
    const s = getStore(slug);
    if (s.loadedIndex === index) return;
    s.loadedIndex = index;
    emit(slug);
}

export function subscribePresets(
    slug: string,
    cb: Listener
): () => void {
    hydrate(slug);
    const s = getStore(slug);
    s.listeners.add(cb);
    return () => { s.listeners.delete(cb); };
}
