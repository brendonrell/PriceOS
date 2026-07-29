'use client';

/*
 * useUserRank / useUserIdentity — a @handle's public identity bits, pulled once
 * per handle per session off /api/user/by-handle/{handle}.
 *
 * Powers the FULL ASCII-ID (sprite · rank badge · @name — the connect-menu
 * identity, Brendon 2026-07-27) on the modal surfaces that show a person, and
 * the output page's owner rectangle (Sigil + PriceScore, Brendon 2026-07-29).
 * Module-wide cache, same shape as useSpriteFace: one fetch per handle per
 * session, shared by every badge on the page.
 */

import { useEffect, useState } from 'react';
import { scoreToRank } from '../achievements/tiers';

/** The identity bits every consumer of this cache reads. */
export interface UserIdentity {
    /** Wallet address — the Sigil's seed. */
    address: string | null;
    /** PriceScore — THE number. */
    score: number | null;
    /** Rank tier derived from the score (0 = unranked, null = unknown). */
    rank: number | null;
    /** The owner has forged their Sigil (and not switched it off). */
    sigilVisible: boolean;
}

const EMPTY: UserIdentity = { address: null, score: null, rank: null, sigilVisible: false };

const cache = new Map<string, UserIdentity>();
const pending = new Map<string, Promise<UserIdentity>>();

interface ProfileBits {
    address?: unknown;
    price_score?: unknown;
    sigil_forged_at?: unknown;
    sigil_hidden?: unknown;
}

function identityFor(handle: string): Promise<UserIdentity> {
    const h = handle.toLowerCase().replace(/^@/, '');
    const hit = cache.get(h);
    if (hit) return Promise.resolve(hit);
    let p = pending.get(h);
    if (!p) {
        p = fetch(`/api/user/by-handle/${h}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((u: ProfileBits | null) => {
                const score = typeof u?.price_score === 'number' ? u.price_score : null;
                const id: UserIdentity = {
                    address: typeof u?.address === 'string' ? u.address : null,
                    score,
                    rank: score !== null ? scoreToRank(score) : null,
                    sigilVisible: !!u?.sigil_forged_at && !u?.sigil_hidden,
                };
                cache.set(h, id);
                pending.delete(h);
                return id;
            })
            .catch(() => {
                cache.set(h, EMPTY);
                pending.delete(h);
                return EMPTY;
            });
        pending.set(h, p);
    }
    return p;
}

/** The full identity bits for a handle — all null/false while loading. */
export function useUserIdentity(handle: string | null | undefined, enabled = true): UserIdentity {
    const h = (handle ?? '').toLowerCase().replace(/^@/, '');
    const [id, setId] = useState<UserIdentity>(() => (h && cache.has(h) ? cache.get(h)! : EMPTY));
    useEffect(() => {
        if (!h || !enabled) return;
        let alive = true;
        void identityFor(h).then((r) => { if (alive) setId(r); });
        return () => { alive = false; };
    }, [h, enabled]);
    return h && enabled ? id : EMPTY;
}

/** The rank tier for a handle — null while loading / for unknown users. */
export function useUserRank(handle: string | null | undefined, enabled = true): number | null {
    return useUserIdentity(handle, enabled).rank;
}

/** The connect-menu badge glyph for a rank tier — ⓿ then ❶…❿. */
export function rankBadgeGlyph(rank: number): string {
    return rank <= 0 ? '⓿' : String.fromCodePoint(0x2775 + Math.min(rank, 10));
}
