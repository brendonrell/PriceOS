'use client';

/*
 * usePanopticonPresence — the global "who's watching what" presence for the
 * Panopticon spell. Rides the same Supabase Realtime presence rails as the
 * Audience (lib/hooks/useProjectAudience) but on ONE global channel, and —
 * unlike the Audience — broadcasts identity + the exact view (down to the
 * piece), because Panopticon is the opt-in surveillance trade.
 *
 * Only active while spell_panopticon is on. Each active viewer tracks
 * { name, view }; everyone on the channel sees the live set. The viewer's own
 * presence is re-tracked as they navigate, without tearing down the channel.
 * Graceful: if Realtime can't be reached the hook reports an empty set and the
 * overlay hides — never throws.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase';
import { useAuth } from '../state/AuthContext';
import { usePdNotifs } from '../state/PdNotifsContext';

export interface Watcher {
    id: string;
    name: string;
    view: string;
}

/** Human label for the page the viewer is on. */
export function panopticonViewLabel(path: string | null): string {
    if (!path || path === '/') return 'the Home gallery';
    const seg = path.split('/').filter(Boolean);
    if (seg[0] === 'art' && seg[1]) {
        const slug = seg[1].toUpperCase();
        return seg[2] ? `${slug} #${seg[2]}` : slug;
    }
    if (seg[0] === 'artists') return 'the Artists page';
    return seg[0].toUpperCase();
}

export function usePanopticonPresence(): Watcher[] {
    const { notifs } = usePdNotifs();
    const enabled = !!notifs.spell_panopticon;
    const { siweAddress, handle } = useAuth();
    const pathname = usePathname();
    const [watchers, setWatchers] = useState<Watcher[]>([]);

    const selfName = handle
        ? `@${handle}`
        : siweAddress
        ? `${siweAddress.slice(0, 6)}…${siweAddress.slice(-4)}`
        : 'a stranger';
    const view = panopticonViewLabel(pathname);

    // Stable per-visit presence key (address when signed in, else a random id).
    const keyRef = useRef<string>('');
    if (!keyRef.current) {
        keyRef.current = (siweAddress || `guest-${Math.random().toString(36).slice(2, 10)}`).toLowerCase();
    }
    const selfKey = siweAddress ? siweAddress.toLowerCase() : keyRef.current;

    const channelRef = useRef<RealtimeChannel | null>(null);

    // Join / leave the channel as Panopticon flips on/off.
    useEffect(() => {
        if (!enabled) {
            setWatchers([]);
            return;
        }
        let cancelled = false;
        let channel: RealtimeChannel | null = null;
        try {
            const sb = getSupabaseBrowser();
            channel = sb.channel('panopticon', { config: { presence: { key: selfKey } } });
            channelRef.current = channel;

            const sync = () => {
                if (!channel || cancelled) return;
                const state = channel.presenceState<{ name?: string; view?: string }>();
                const list: Watcher[] = Object.keys(state)
                    .filter((k) => k !== selfKey)
                    .map((k) => {
                        const meta = state[k]?.[0];
                        return { id: k, name: meta?.name || 'a stranger', view: meta?.view || '' };
                    });
                setWatchers(list);
            };

            channel.on('presence', { event: 'sync' }, sync);
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED' && channel) {
                    void channel.track({ name: selfName, view });
                }
            });
        } catch {
            return;
        }

        return () => {
            cancelled = true;
            channelRef.current = null;
            if (channel) {
                try {
                    void channel.untrack();
                    void channel.unsubscribe();
                } catch {
                    /* socket already gone */
                }
            }
        };
        // Only re-join when enabled or identity key changes — NOT on every nav.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, selfKey]);

    // Re-broadcast the current view as the viewer navigates / renames, without
    // re-subscribing the channel.
    useEffect(() => {
        if (!enabled) return;
        const channel = channelRef.current;
        if (channel) {
            try {
                void channel.track({ name: selfName, view });
            } catch {
                /* not subscribed yet — the subscribe callback covers the first track */
            }
        }
    }, [enabled, selfName, view]);

    return watchers;
}
