'use client';

/*
 * useSpriteFace — the still PriceSprite face for a @handle (Brendon,
 * 2026-06-12; powers the sim's "collected pair" sprite+name chips).
 *
 * Resolution order, all off /api/user/by-handle/{handle}:
 *   1. users.price_sprite_resolved — the frozen signup composition.
 *   2. No frozen sprite yet (every -ai artist today) → compose live from
 *      the wallet hash with the user's vibe, defaulting to 'observer'.
 *      Deterministic per wallet, so the stand-in face is stable, and the
 *      moment the user picks a real vibe the frozen one takes over.
 *   3. Unknown user / bad address → null (chip renders name-only).
 *
 * Faces are cached module-wide per handle (one fetch per handle per
 * session, shared across every chip on the page — the home Featuring
 * rotation re-shows handles freely without re-fetching).
 *
 * ⛔ PERMANENT MEANS PERMANENT (fix, 2026-09-17, Brendon: "PriceSprites
 * are PERMANENT... we keep treating them like live data that updates").
 * Once a face is resolved from users.price_sprite_resolved — the frozen
 * composition, never touched again after signup — there is no reason a
 * RETURNING visit should ever wait on the network for it again. It's
 * written straight to localStorage the first time it resolves, and the
 * lazy initializer below reads that BEFORE the module cache even hydrates,
 * so a handle you've ever seen paints its sprite on the very first frame,
 * every session, forever — no fetch, no flicker, no lag. Only the frozen
 * face gets this treatment: the wallet-derived stand-in (no frozen sprite
 * yet) is explicitly provisional — it can flip to the real one any time
 * the user picks a vibe — so it stays session-only, same as before.
 */

import { useEffect, useState } from 'react';
import { composeResolved, resolveSprite } from '../sprites/composer';
import { isPriceSpriteVibe } from '../sprites/vibes';

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

const LS_PREFIX = 'pd_sprite_frozen_v1:';

function readPersisted(h: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(LS_PREFIX + h);
    } catch {
        return null;
    }
}

function writePersisted(h: string, face: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LS_PREFIX + h, face);
    } catch {
        /* private mode / full — session cache still works */
    }
}

export function resolveSpriteFace(handle: string): Promise<string | null> {
    const h = handle.toLowerCase().replace(/^@/, '');
    if (cache.has(h)) return Promise.resolve(cache.get(h) ?? null);
    let p = pending.get(h);
    if (!p) {
        p = fetch(`/api/user/by-handle/${h}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then(
                (u: {
                    address?: string;
                    price_sprite?: unknown;
                    price_sprite_resolved?: Parameters<typeof composeResolved>[0] | null;
                } | null) => {
                    let face: string | null = null;
                    if (u?.price_sprite_resolved) {
                        face = composeResolved(u.price_sprite_resolved).fullString;
                        // Frozen for good — write it through so the NEXT
                        // session (or the next handle we've never met)
                        // never has to ask the network again.
                        if (face) writePersisted(h, face);
                    } else if (u?.address) {
                        const vibe = isPriceSpriteVibe(u.price_sprite)
                            ? u.price_sprite
                            : 'observer';
                        const resolved = resolveSprite(u.address, vibe);
                        // Provisional stand-in — deliberately NOT persisted;
                        // it's meant to be re-checked until a real vibe freezes.
                        face = resolved ? composeResolved(resolved).fullString : null;
                    }
                    cache.set(h, face);
                    pending.delete(h);
                    return face;
                },
            )
            .catch(() => {
                // Transient failure — don't cache, a later mount can retry.
                pending.delete(h);
                return null;
            });
        pending.set(h, p);
    }
    return p;
}

/** The still sprite face for a handle, or null while loading / unknown. */
export function useSpriteFace(handle: string): string | null {
    const h = handle.toLowerCase().replace(/^@/, '');
    const [face, setFace] = useState<string | null>(
        () => cache.get(h) ?? readPersisted(h),
    );
    useEffect(() => {
        let alive = true;
        setFace(cache.get(h) ?? readPersisted(h));
        resolveSpriteFace(h).then((f) => {
            if (alive && f !== null) setFace(f);
        });
        return () => {
            alive = false;
        };
    }, [h]);
    return face;
}
