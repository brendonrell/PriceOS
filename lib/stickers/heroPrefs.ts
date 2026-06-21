'use client';

/*
 * heroPrefs — how YOUR stickers arrange on your hero. Set in the manager modal,
 * read by HeroStickers. Local prefs (device), persisted; the generative seed
 * drives the scattered layouts and the Shuffle button.
 */

import { useEffect, useMemo, useState } from 'react';

export type Arrange = 'row' | 'tworows' | 'spread' | 'scatter' | 'fill';
export type Tilt = 'flat' | 'soft' | 'jaunty';

export const ARRANGES: { id: Arrange; label: string }[] = [
    { id: 'spread', label: 'SPREAD' },
    { id: 'row', label: 'ROW' },
    { id: 'tworows', label: '2 ROWS' },
    { id: 'scatter', label: 'SCATTER' },
    { id: 'fill', label: 'FILL' },
];
export const TILTS: { id: Tilt; label: string }[] = [
    { id: 'flat', label: 'FLAT' },
    { id: 'soft', label: 'SOFT' },
    { id: 'jaunty', label: 'JAUNTY' },
];

const K_ARRANGE = 'pd_sticker_arrange';
const K_TILT = 'pd_sticker_tilt';
const K_SEED = 'pd_sticker_seed';
const EVT = 'pd:stickers-changed';

function read(key: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function write(key: string, val: string) {
    try { window.localStorage.setItem(key, val); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVT));
}

export function setArrange(a: Arrange) { write(K_ARRANGE, a); }
export function setTilt(t: Tilt) { write(K_TILT, t); }
export function shuffleSeed() { write(K_SEED, String((Math.random() * 1e9) | 0)); }

/* Non-reactive reads — for the manager, which holds its own local copy. */
export function getArrange(): Arrange { return read(K_ARRANGE, 'spread') as Arrange; }
export function getTilt(): Tilt { return read(K_TILT, 'soft') as Tilt; }

export interface HeroPrefs { arrange: Arrange; tilt: Tilt; seed: number; }

export function useHeroPrefs(): HeroPrefs {
    const [v, setV] = useState<HeroPrefs>({ arrange: 'spread', tilt: 'soft', seed: 1 });
    useEffect(() => {
        const sync = () => setV({
            arrange: read(K_ARRANGE, 'spread') as Arrange,
            tilt: read(K_TILT, 'soft') as Tilt,
            seed: Number(read(K_SEED, '1')) || 1,
        });
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return useMemo(() => v, [v]);
}

/* Per-mode shape: how many rows + the display cap. */
export function arrangeShape(a: Arrange): { rows: number; cap: number; scatter: boolean } {
    switch (a) {
        case 'row':     return { rows: 1, cap: 6, scatter: false };
        case 'spread':  return { rows: 1, cap: 6, scatter: false };
        case 'tworows': return { rows: 2, cap: 12, scatter: false };
        case 'scatter': return { rows: 2, cap: 14, scatter: true };
        case 'fill':    return { rows: 3, cap: 24, scatter: true };
        default:        return { rows: 1, cap: 6, scatter: false };
    }
}

export function tiltDeg(t: Tilt): number {
    return t === 'flat' ? 0 : t === 'jaunty' ? 11 : 4;
}

/* Tiny seeded RNG (mulberry32) for stable per-seed jitter. */
export function rngFrom(seed: number): () => number {
    let a = seed || 1;
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
