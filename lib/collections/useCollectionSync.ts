'use client';

/*
 * useCollectionSync — cross-device persistence for a per-user collection
 * (Cart / Bench) on top of its existing on-device store.
 *
 *   - Logged out: nothing here runs; the context keeps using localStorage.
 *   - On sign-in: GET the user's server collection, UNION it with whatever's
 *     on this device (so neither is lost), apply the merged set, and PUT it
 *     back so the server reflects the union.
 *   - While signed in: debounced PUT on every change.
 *
 * Ownership is the session cookie (same-origin fetch); the client never sends
 * an address. The endpoint is owner-scoped server-side.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../state/AuthContext';

interface Item {
    slug: string;
    id: number;
}
const keyOf = (it: Item) => `${it.slug}:${it.id}`;

export function useCollectionSync(
    endpoint: string,
    items: Item[],
    applyServer: (items: Item[]) => void,
    max: number,
) {
    const { siweAddress } = useAuth();
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const loadedFor = useRef<string | null>(null);
    const ready = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* Load + merge on sign-in (once per address). */
    useEffect(() => {
        if (!siweAddress) {
            loadedFor.current = null;
            ready.current = false;
            return;
        }
        if (loadedFor.current === siweAddress) return;
        loadedFor.current = siweAddress;
        ready.current = false;
        let cancelled = false;
        fetch(endpoint, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { items?: Item[] } | null) => {
                if (cancelled) return;
                const map = new Map<string, Item>();
                for (const it of itemsRef.current) map.set(keyOf(it), it);
                for (const it of data?.items ?? []) {
                    if (it?.slug && Number.isFinite(it.id)) map.set(keyOf(it), { slug: it.slug, id: it.id });
                }
                const merged = [...map.values()].slice(0, max);
                applyServer(merged);
                ready.current = true;
                void fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ items: merged }),
                }).catch(() => {});
            })
            .catch(() => {
                /* offline / 5xx — local store still works; allow later saves */
                ready.current = true;
            });
        return () => {
            cancelled = true;
        };
    }, [siweAddress, endpoint, applyServer, max]);

    /* Debounced save on change while signed in (after the initial merge). */
    useEffect(() => {
        if (!siweAddress || loadedFor.current !== siweAddress || !ready.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            void fetch(endpoint, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ items: itemsRef.current }),
            }).catch(() => {});
        }, 600);
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [items, siweAddress, endpoint]);
}
