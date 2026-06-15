'use client';

/*
 * presetStore — Gallery (Grid) View Presets.
 *
 * Up to 3 named view presets PER SCOPE. Two scopes are in use:
 *   'project'   — shared across ALL Projects (one set of 3, not per-Project).
 *   'collected' — the profile Collected tab's own 3 (facet-driven).
 * Each preset captures the full view state: sort family + direction + feedKind,
 * active filters, category selections, myNotes, searchQuery, priceMin, priceMax,
 * plus the Project slug it was captured on (savedSlug) for graceful cross-
 * Project restore on the shared 'project' scope.
 *
 * Persistence — ACCOUNT-BACKED ("log in anywhere, exactly as you left it"):
 *   - The server `users.grid_presets` jsonb column is the source of truth.
 *     Shape mirrors this store: `{ project: PresetEntry[], collected: [...] }`.
 *   - localStorage key `pd_grid_presets` is a write-through cache so the app
 *     works offline / logged-out and second-device hydrate has a warm start.
 *   - On login, userState.hydrateFromRow writes the server blob into the cache
 *     key and fires USERSTATE_HYDRATED_EVENT; this store re-reads it live.
 *   - Every save/delete writes the cache AND fire-and-forgets PATCH /api/me via
 *     userState.pushState (a no-op until an authed snapshot has hydrated, so a
 *     logged-out save never tries to write an account and never clobbers it).
 *
 * Auto-naming: savePreset derives a human-readable label from the snapshot —
 * e.g. "#ID ↑ · Layer:Crust" or "$PRICE ↓ · 0.1–0.5Ξ". Pass `name` to override.
 *
 * "Currently loaded" tracking: loadedIndex (-1 = none / drifted) is in-memory
 * only. The caller resets it via setLoadedIndex() when view state drifts.
 */

import type { SortKey, SortDir, FeedKind } from '../state/SortContext';
import type { TraitCategory, FeedCategory } from '../state/TraitsContext';
import { pushState, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

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
    /** Project slug this preset was captured on. The shared 'project' scope
     *  restores trait filters only when you're back on the same Project; absent
     *  on the 'collected' scope (its facet vocabulary is universal). */
    savedSlug?: string;
}

export interface PresetEntry {
    name: string;
    state: PresetViewState;
}

export type SavePresetResult = 'saved' | 'replaced';

const MAX_PRESETS = 3;

/** Unified cache blob `{ [scope]: PresetEntry[] }`, mirroring users.grid_presets. */
const CACHE_KEY = STATE_CACHE_KEYS.gridPresets;

/* ── Auto-naming ────────────────────────────────────────────────────── */

const SORT_LABEL: Record<SortKey, string> = {
    id:    '#ID',
    price: '$PRICE',
    feed:  'FEED',
    fog:   'FOG',
    az:    'A–Z',
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

/* ── Per-scope store ────────────────────────────────────────────────── */

type Listener = (presets: readonly PresetEntry[], loadedIndex: number) => void;

interface ScopeStore {
    presets: PresetEntry[];
    loadedIndex: number;
    listeners: Set<Listener>;
}

const stores = new Map<string, ScopeStore>();
let hydrated = false;

function getStore(scope: string): ScopeStore {
    if (!stores.has(scope)) {
        stores.set(scope, { presets: [], loadedIndex: -1, listeners: new Set() });
    }
    return stores.get(scope)!;
}

function sanitizeList(v: unknown): PresetEntry[] {
    if (!Array.isArray(v)) return [];
    return (v as unknown[])
        .filter(
            (e): e is PresetEntry =>
                typeof e === 'object' && e !== null &&
                typeof (e as PresetEntry).name === 'string' &&
                typeof (e as PresetEntry).state === 'object'
        )
        .slice(0, MAX_PRESETS);
}

function readCacheBlob(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch { /* ignore — bad JSON, quota, private mode */ }
    return {};
}

/** Load the blob into every scope's in-memory state. `emitChanges` re-notifies
 *  live subscribers (used when the server snapshot lands after mount). */
function applyBlob(blob: Record<string, unknown>, emitChanges: boolean): void {
    const scopes = new Set<string>([...stores.keys(), ...Object.keys(blob)]);
    for (const scope of scopes) {
        const s = getStore(scope);
        s.presets = sanitizeList(blob[scope]);
        if (s.loadedIndex >= s.presets.length) s.loadedIndex = -1;
        if (emitChanges) emit(scope);
    }
}

function hydrateOnce(): void {
    if (hydrated) return;
    hydrated = true;
    applyBlob(readCacheBlob(), false);
}

/** Serialise every scope back to the cache key AND fire-and-forget the account
 *  write-through. pushState is a no-op until an authed snapshot has hydrated. */
function persist(): void {
    const blob: Record<string, PresetEntry[]> = {};
    for (const [scope, s] of stores) blob[scope] = s.presets;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(blob));
        } catch { /* ignore */ }
    }
    pushState({ grid_presets: blob });
}

function emit(scope: string): void {
    const s = getStore(scope);
    const snapshot = s.presets.slice();
    s.listeners.forEach((l) => l(snapshot, s.loadedIndex));
}

/* Server snapshot landed (or a sibling tab/device synced) — re-read the cache
   userState just overwrote and refresh every live scope. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        applyBlob(readCacheBlob(), true);
    });
}

/* ── Public API ─────────────────────────────────────────────────────── */

export function getPresets(scope: string): readonly PresetEntry[] {
    hydrateOnce();
    return getStore(scope).presets;
}

export function getLoadedIndex(scope: string): number {
    hydrateOnce();
    return getStore(scope).loadedIndex;
}

export function savePreset(
    scope: string,
    state: PresetViewState,
    name?: string
): { result: SavePresetResult; index: number } {
    hydrateOnce();
    const s = getStore(scope);
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
    persist();
    emit(scope);
    return { result, index };
}

export function deletePreset(scope: string, index: number): boolean {
    hydrateOnce();
    const s = getStore(scope);
    if (index < 0 || index >= s.presets.length) return false;
    s.presets = s.presets.filter((_, i) => i !== index);
    if (s.loadedIndex === index) s.loadedIndex = -1;
    else if (s.loadedIndex > index) s.loadedIndex -= 1;
    persist();
    emit(scope);
    return true;
}

export function setLoadedIndex(scope: string, index: number): void {
    const s = getStore(scope);
    if (s.loadedIndex === index) return;
    s.loadedIndex = index;
    emit(scope);
}

export function subscribePresets(scope: string, cb: Listener): () => void {
    hydrateOnce();
    const s = getStore(scope);
    s.listeners.add(cb);
    return () => { s.listeners.delete(cb); };
}
