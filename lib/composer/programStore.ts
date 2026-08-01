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
 * ACCOUNT-BACKED 2026-08-01 (Brendon: "almost no device stuff… db everything
 * is one of our signatures"). Programs ride the account settings envelope
 * (`composerPrograms`) with localStorage as the instant read — the same
 * write-through + USERSTATE_HYDRATED_EVENT dance every other saved list uses.
 * No new table was needed: the envelope already carries the user's saved
 * shapes, so this went in without a migration.
 */

import type { ComposerQuery } from './query';
import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

export interface ComposerProgram {
    name: string;
    query: ComposerQuery;
    created_at: string;
}

const CACHE_KEY = STATE_CACHE_KEYS.composerPrograms;
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
    // Account write-through — no-op until an authed snapshot has hydrated.
    pushSettings({ composerPrograms: programs as unknown as Array<Record<string, unknown>> });
}

/* The account's snapshot landed — re-read the cache userState just wrote so an
   open Composer shows the account's programs without a reload. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = false;
        hydrateOnce();
        emit();
    });
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
