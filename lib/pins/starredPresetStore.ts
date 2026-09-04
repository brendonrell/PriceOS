'use client';

/*
 * starredPresetStore — "Starred Presets": up to 3 named view presets for the
 * Starred surface (Brendon 2026-06-19). Works exactly like Grid Presets, but
 * captures the Starred view instead of a gallery: which filter (mode), the sort
 * + direction, the grouping, and the search text.
 *
 * Persistence: localStorage `pd_starred_presets` (device-side — the starred view
 * is a per-device convenience; account-sync can be layered on later the same way
 * grid presets do it).
 */

import { useEffect, useReducer } from 'react';

export interface StarredPresetState {
    mode: string;   // active filter pill (all / artists / collectors / ...)
    sort: string;   // recent / project(AZ) / price / followers
    dir: 'asc' | 'desc';
    group: string;  // none / color / project / artist
    query: string;  // search text
}

export interface StarredPreset {
    name: string;
    state: StarredPresetState;
}

const STORAGE_KEY = 'pd_starred_presets';
const MAX_PRESETS = 3;

let presets: StarredPreset[] = [];
let loadedIndex = -1;
let hydrated = false;
const listeners = new Set<(p: readonly StarredPreset[], idx: number) => void>();

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            presets = parsed
                .filter((e): e is StarredPreset => !!e && typeof e.name === 'string' && typeof e.state === 'object')
                .slice(0, MAX_PRESETS);
        }
    } catch { /* ignore */ }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)); } catch { /* ignore */ }
}

function emit(): void {
    const snap = presets.slice();
    listeners.forEach((l) => l(snap, loadedIndex));
}

/* Human label from the captured view — e.g. "Collectors · FLWRS ↓ · Colour". */
const MODE_LABEL: Record<string, string> = {
    all: 'All', artists: 'Artists', collectors: 'Collectors', outputs: 'Outputs',
    traits: 'Traits', soundtracks: 'Soundtracks', projects: 'Projects',
};
const SORT_LABEL: Record<string, string> = {
    recent: 'Recent', id: '#ID', project: 'AZ', price: '$PRICE', followers: '\u263B\ufe0e',
};
const GROUP_LABEL: Record<string, string> = { color: 'Colour', project: 'Project', artist: 'Artist' };
function deriveName(s: StarredPresetState): string {
    const bits = [MODE_LABEL[s.mode] ?? s.mode];
    const arrow = s.dir === 'asc' ? '↑' : '↓';
    bits.push(`${SORT_LABEL[s.sort] ?? s.sort} ${arrow}`);
    if (s.group && s.group !== 'none') bits.push(GROUP_LABEL[s.group] ?? s.group);
    return bits.join(' · ');
}

export function getStarredPresets(): readonly StarredPreset[] { hydrate(); return presets; }
export function getStarredLoadedIndex(): number { hydrate(); return loadedIndex; }

export function saveStarredPreset(state: StarredPresetState, name?: string): { result: 'saved' | 'replaced'; index: number } {
    hydrate();
    const entry: StarredPreset = { name: name ?? deriveName(state), state };
    let result: 'saved' | 'replaced';
    let index: number;
    if (presets.length < MAX_PRESETS) {
        presets = [...presets, entry];
        index = presets.length - 1;
        result = 'saved';
    } else {
        presets = [...presets.slice(1), entry];
        index = MAX_PRESETS - 1;
        result = 'replaced';
    }
    loadedIndex = index;
    persist();
    emit();
    return { result, index };
}

export function deleteStarredPreset(index: number): void {
    hydrate();
    if (index < 0 || index >= presets.length) return;
    presets = presets.filter((_, i) => i !== index);
    if (loadedIndex === index) loadedIndex = -1;
    else if (loadedIndex > index) loadedIndex -= 1;
    persist();
    emit();
}

export function setStarredLoadedIndex(index: number): void {
    hydrate();
    loadedIndex = index;
    emit();
}

export function subscribeStarredPresets(cb: (p: readonly StarredPreset[], idx: number) => void): () => void {
    hydrate();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
