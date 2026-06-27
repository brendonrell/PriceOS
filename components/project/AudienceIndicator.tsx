'use client';

/*
 * AudienceIndicator — "The Audience" (WOW · 86b9fcmg2).
 *
 * A tiny live presence read on a project page: ● N here now. The dot breathes
 * the whole time the room is live, so it reads as "people are here right now",
 * not a "watching" button someone pressed. Tap it to reveal the watchers as
 * glyphs — ● for a present viewer (their Sigil once that feature ships), ◌ for
 * anyone in Anon mode or signed out. Collection-level only, per Brendon's call.
 *
 * Solo-preview: presence needs other humans to feel alive, and Brendon doesn't
 * have a crowd yet — so `?crowd=N` on the project URL seeds N simulated watchers
 * (rendered as ● dots) into the count + reveal, purely client-side, so the
 * indicator, the 10+ pulse, and the reveal can be seen working alone. It changes
 * nothing real — no presence is broadcast for the fakes.
 *
 * Hides itself entirely when the room is empty or Realtime is unreachable.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useProjectAudience, type AudienceMember } from '../../lib/hooks/useProjectAudience';

const VS15 = '︎';

export default function AudienceIndicator({
    slug,
    token = null,
}: {
    slug: string;
    /** An Output's token id when this indicator sits on an Output page (it then
     *  counts only that Output's viewers); null on the project page (it counts
     *  the project's TOTAL audience — the project page plus every Output). */
    token?: number | null;
}) {
    const { siweAddress } = useAuth();
    const { notifs } = usePdNotifs();
    const [open, setOpen] = useState(false);
    const [simCount, setSimCount] = useState(0);

    const self = useMemo(
        () => ({
            id: siweAddress ? siweAddress.toLowerCase() : '',
            anon: notifs.anon || !siweAddress,
            token,
        }),
        [siweAddress, notifs.anon, token],
    );

    const live = useProjectAudience(slug, self, notifs.audience);

    // Solo-preview seed — `?crowd=N` pads the room with simulated watchers so the
    // indicator can be exercised without a real crowd. Client-only; never real.
    useEffect(() => {
        try {
            const n = Number(new URLSearchParams(window.location.search).get('crowd'));
            setSimCount(Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 200) : 0);
        } catch {
            setSimCount(0);
        }
    }, []);

    const members: AudienceMember[] = useMemo(() => {
        const sims = Array.from({ length: simCount }, (_, i) => ({ id: `sim-${i}`, anon: false, token: null }));
        return [...live, ...sims];
    }, [live, simCount]);

    // Project page (token == null) shows the project's TOTAL audience; an Output
    // page filters the shared room down to just the viewers on THIS Output.
    const present = useMemo(
        () => (token == null ? members : members.filter((m) => m.token === token)),
        [members, token],
    );

    const count = present.length;
    if (!notifs.audience) return null; // opted out via the MY PD Audience toggle
    if (count < 1) return null; // empty room / Realtime down → render nothing

    return (
        <span className="audience-wrap">
            <span
                className="stat-item audience-indicator"
                role="button"
                tabIndex={0}
                title={`${count} here right now`}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((v) => !v);
                    }
                }}
            >
                <span className="stat-icon audience-eye">{`●${VS15}`}</span>{' '}
                <span className="stat-val audience-val">{count} here now</span>
            </span>

            {open && (
                <span className="audience-reveal" role="dialog" aria-label="Who's watching">
                    <span className="audience-reveal-head">{count} here now</span>
                    <span className="audience-glyphs">
                        {present.map((m) => (
                            <span
                                key={m.id}
                                className={`audience-glyph${m.anon ? ' anon' : ''}`}
                                aria-hidden="true"
                            >
                                {m.anon ? `◌${VS15}` : `●${VS15}`}
                            </span>
                        ))}
                    </span>
                </span>
            )}
        </span>
    );
}
