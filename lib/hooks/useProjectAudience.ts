'use client';

/*
 * useProjectAudience — live "who's looking right now" presence for ONE project.
 *
 * The Audience (WOW · 86b9fcmg2): collection-level simultaneous-gaze presence.
 * Each viewer of a project page joins a per-project Supabase Realtime presence
 * channel and is tracked while the page is open; everyone on the channel sees
 * the live set. Collection-level only (never per-Output) per Brendon's call —
 * the gallery-moment magic without per-token surveillance.
 *
 * Privacy: the only thing broadcast is an `anon` flag. No address, no name —
 * the reveal shows each viewer as an identity glyph (their Sigil once that ships;
 * `◌` for anyone in Anon mode / signed out). The presence KEY is opaque.
 *
 * Graceful: if Realtime is unavailable (env missing, socket blocked) the hook
 * just reports an empty set and the indicator hides itself — never throws.
 */

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase';

export interface AudienceMember {
    /** Opaque presence key — stable per viewer for the life of their visit. */
    id: string;
    /** Viewer is in Anon mode (or signed out) → render as ◌, never a Sigil. */
    anon: boolean;
    /** Which page within the project this viewer is on: an Output's token id, or
     *  null for the project page. The channel is the project's TOTAL audience;
     *  this lets an Output page filter the set down to just its own viewers. */
    token: number | null;
}

export interface AudienceSelf {
    /** Stable id for a signed-in viewer (lowercased address). Empty = guest;
     *  the hook mints a random per-visit id so guests still count once. */
    id: string;
    anon: boolean;
    /** This viewer's current page: an Output token id, or null for the project
     *  page. Broadcast so each Output can count just its own gaze. */
    token: number | null;
}

/** Join the project's presence channel, track self, return the live member set
 *  (including self). Empty until subscribed, or permanently empty if Realtime
 *  can't be reached. */
export function useProjectAudience(
    slug: string,
    self: AudienceSelf,
    enabled = true,
): AudienceMember[] {
    const [members, setMembers] = useState<AudienceMember[]>([]);

    useEffect(() => {
        if (!slug || !enabled) {
            setMembers([]);
            return;
        }
        let cancelled = false;
        let channel: RealtimeChannel | null = null;

        // Stable presence key: the viewer's address when signed in, else a
        // random per-visit id so a guest is counted exactly once.
        const selfKey = self.id || `guest-${Math.random().toString(36).slice(2, 10)}`;

        try {
            const sb = getSupabaseBrowser();
            channel = sb.channel(`audience:${slug}`, {
                config: { presence: { key: selfKey } },
            });

            const sync = () => {
                if (!channel || cancelled) return;
                const state = channel.presenceState<{ anon?: boolean; token?: number | null }>();
                // Flatten EVERY presence entry (a viewer open in two tabs is two
                // gazes) so per-Output token filtering and the project total are
                // both accurate. Composite id keeps React keys unique.
                const list: AudienceMember[] = [];
                for (const id of Object.keys(state)) {
                    (state[id] ?? []).forEach((meta, i) => {
                        list.push({ id: `${id}#${i}`, anon: !!meta?.anon, token: meta?.token ?? null });
                    });
                }
                setMembers(list);
            };

            channel.on('presence', { event: 'sync' }, sync);
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED' && channel) {
                    void channel.track({ anon: self.anon, token: self.token });
                }
            });
        } catch {
            /* Realtime unavailable — indicator hides. No throw. */
            return;
        }

        return () => {
            cancelled = true;
            if (channel) {
                try {
                    void channel.untrack();
                    void channel.unsubscribe();
                } catch {
                    /* socket already gone */
                }
            }
        };
    }, [slug, self.id, self.anon, self.token, enabled]);

    return members;
}
