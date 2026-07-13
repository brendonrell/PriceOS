'use client';

/*
 * programStore — the Composer's saved Programs.
 *
 * A Program is a named, persistent ComposerQuery — a stored CONFIG, never
 * stored results, so every open re-runs live (auto-updating by
 * construction). Follows the presetStore pattern (lib/pins/presetStore):
 * module-level store + localStorage persistence + subscribe for live
 * React reads.
 *
 * v1 storage is LOCAL ONLY (`pd_composer_programs`). The server-side
 * Programs table (wallet, name, query_json, created_at — per the ClickUp
 * spec) is the flagged fast-follow: it needs a prod Supabase migration,
 * which is a §4 approval gate. When it lands, this store grows the same
 * write-through + USERSTATE_HYDRATED_EVENT dance presetStore has.
 */

import type { ComposerQuery } from './query';

export interface ComposerProgram {
    name: string;
    query: ComposerQuery;
    created_at: string;
}

const CACHE_KEY = 'pd_composer_programs';
/* Soft safety cap — not a product limit (Brendon set no cap for v1). */
const MAX_PROGRAMS = 50;

type Listener = (programs: readonly ComposerProgram[]) => void;

let programs: ComposerProgram[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function sanitize(v: unknown): ComposerProgram[] {
    if (!Array.isArray(v)) return [];
    return (v as unknown[])
        .filter(
            (e): e is ComposerProgram =>
                typeof e === 'object' && e !== null &&
                typeof (e as ComposerProgram).name === 'string' &&
                typeof (e as ComposerProgram).query === 'object' &&
                (e as ComposerProgram).query !== null &&
                Array.isArray((e as ComposerProgram).query.rules),
        )
        .slice(0, MAX_PROGRAMS);
}

function hydrateOnce(): void {
    if (hydrated || typeof window === 'undefined') return;
    hydrated = true;
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (raw) programs = sanitize(JSON.parse(raw));
    } catch { /* bad JSON / private mode — start empty */ }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(programs));
    } catch { /* quota / private mode */ }
}

function emit(): void {
    const snapshot = programs.slice();
    listeners.forEach((l) => l(snapshot));
}

export function getPrograms(): readonly ComposerProgram[] {
    hydrateOnce();
    return programs;
}

/** Save (append) a Program. Duplicate names get " 2", " 3"… suffixed. */
export function saveProgram(name: string, query: ComposerQuery): ComposerProgram {
    hydrateOnce();
    const base = name.trim() || 'UNTITLED';
    let final = base;
    let n = 2;
    while (programs.some((p) => p.name.toLowerCase() === final.toLowerCase())) {
        final = `${base} ${n++}`;
    }
    const entry: ComposerProgram = {
        name: final,
        // Deep-clone so later builder edits never mutate the stored config.
        query: JSON.parse(JSON.stringify(query)) as ComposerQuery,
        created_at: new Date().toISOString(),
    };
    programs = [...programs.slice(-(MAX_PROGRAMS - 1)), entry];
    persist();
    emit();
    return entry;
}

export function renameProgram(index: number, name: string): boolean {
    hydrateOnce();
    if (index < 0 || index >= programs.length || !name.trim()) return false;
    programs = programs.map((p, i) => (i === index ? { ...p, name: name.trim() } : p));
    persist();
    emit();
    return true;
}

export function deleteProgram(index: number): boolean {
    hydrateOnce();
    if (index < 0 || index >= programs.length) return false;
    programs = programs.filter((_, i) => i !== index);
    persist();
    emit();
    return true;
}

export function subscribePrograms(cb: Listener): () => void {
    hydrateOnce();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
