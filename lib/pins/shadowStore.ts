'use client';

/*
 * shadowStore — the SHADOW PORTFOLIO's positions (Brendon, 2026-07-25).
 *
 * The Shadow is the Portfolio's paper-trading twin: the positions you DIDN'T
 * take. Shadow-collect a piece and it is tracked as if owned — same tree, same
 * $-mode valuation, sitting beside the real holdings but never mixed with them.
 *
 * A position stores its ENTRY price at the moment it was taken, so the paper
 * P&L stays honest the day real market values land. Nothing here ever touches
 * ownership: the wallet is unchanged, the chain is unchanged, and a shadow
 * position is invisible to everyone but its owner.
 *
 * PRIVATE + account-backed via the settings envelope (`shadow`), exactly like
 * Starred and Wishlist. Persistence protocol lives in createPinStore.
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore } from './createPinStore';
import { getProject } from '../project/registry';

export interface ShadowPosition {
    slug: string;
    /** Output id. */
    id: number;
    /** ETH price at the moment the position was taken — the paper entry.
     *  Mint price is the only real number today; the field exists so a
     *  position taken now is still honest once live values land. */
    entry: number;
    /** Unix ms the position was opened. */
    at: number;
}

function isPosition(v: unknown): v is ShadowPosition {
    if (!v || typeof v !== 'object') return false;
    const p = v as Partial<ShadowPosition>;
    return typeof p.slug === 'string' && p.slug.length > 0 && Number.isFinite(p.id);
}

const store = createPinStore<ShadowPosition[]>({
    storageKey: STATE_CACHE_KEYS.shadow,
    empty: () => [],
    decode: (parsed) =>
        Array.isArray(parsed)
            ? parsed.filter(isPosition).map((p) => ({
                  slug: p.slug,
                  id: Number(p.id),
                  entry: Number.isFinite(p.entry) ? Number(p.entry) : 0,
                  at: Number.isFinite(p.at) ? Number(p.at) : 0,
              }))
            : [],
    encode: (positions) => positions,
    push: (encoded) => pushSettings({ shadow: encoded as ShadowPosition[] }),
});

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

export type ToggleShadowResult = 'opened' | 'closed';

/** Every open shadow position, insertion-ordered. */
export function getShadowPositions(): readonly ShadowPosition[] {
    return store.get();
}

export function isShadowed(slug: string, id: number): boolean {
    return store.get().some((p) => p.slug === slug && p.id === id);
}

/**
 * Open or close a paper position on an Output. Caller owns the toast + icon
 * flip. Entry is captured from the project's mint price — the only real
 * per-piece number the app has until live market values land.
 */
export function toggleShadow(slug: string, id: number): ToggleShadowResult {
    const k = keyOf(slug, id);
    const current = store.get();
    const without = current.filter((p) => keyOf(p.slug, p.id) !== k);
    if (without.length !== current.length) {
        store.set(without);
        return 'closed';
    }
    store.set([
        ...current,
        { slug, id, entry: getProject(slug)?.mintPriceEth ?? 0, at: Date.now() },
    ]);
    return 'opened';
}

/** Σ of every position's entry price — what the paper book "cost". */
export function shadowCostBasis(): number {
    return store.get().reduce((sum, p) => sum + (p.entry || 0), 0);
}

export function subscribeShadow(cb: (positions: readonly ShadowPosition[]) => void): () => void {
    return store.subscribe(cb);
}
