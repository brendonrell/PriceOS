'use client';

/*
 * fmBus — the pd miniplayer's tiny control bus (module singleton).
 *
 * ONE player exists (FmBar, mounted in the shell). Other surfaces — the
 * Command Stone's "miniplayer mini" widget first — control it and read
 * its state through this bus, so the audio never duplicates and never
 * skips when the controlling surface unmounts.
 *
 * FmBar registers itself as the driver + publishes snapshots; consumers
 * subscribe (useSyncExternalStore-friendly) and call fmPlay/fmToggle/
 * fmNext.
 */

export interface FmStation {
    playlistId: string;
    label: string;
    /** Project slug when the station is a project's own soundtrack. */
    slug: string | null;
}

export interface FmSnapshot {
    status: 'idle' | 'loading' | 'playing' | 'paused';
    station: FmStation | null;
    trackTitle: string;
}

interface FmDriver {
    play(st: FmStation): void;
    toggle(): void;
    next(): void;
}

let snap: FmSnapshot = { status: 'idle', station: null, trackTitle: '' };
const subs = new Set<() => void>();
let driver: FmDriver | null = null;

export function registerFmDriver(d: FmDriver): () => void {
    driver = d;
    return () => {
        if (driver === d) driver = null;
    };
}

export function publishFm(next: FmSnapshot): void {
    snap = next;
    subs.forEach((cb) => cb());
}

export function getFm(): FmSnapshot {
    return snap;
}

export function subscribeFm(cb: () => void): () => void {
    subs.add(cb);
    return () => {
        subs.delete(cb);
    };
}

export function fmPlay(st: FmStation): void {
    driver?.play(st);
}

export function fmToggle(): void {
    driver?.toggle();
}

export function fmNext(): void {
    driver?.next();
}
