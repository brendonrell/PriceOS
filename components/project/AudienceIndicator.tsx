'use client';

/*
 * AudienceIndicator — "The Audience" (WOW · 86b9fcmg2).
 *
 * A tiny live presence read on a project page: ◐ N watching. Pulses gently once
 * the room hits 10. Tap it to reveal the watchers as glyphs — ● for a present
 * viewer (their Sigil once that feature ships), ◌ for anyone in Anon mode or
 * signed out. Collection-level only, per Brendon's call.
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
const PULSE_AT = 10; // room size where the indicator starts pulsing

export default function AudienceIndicator({ slug }: { slug: string }) {
    const { siweAddress } = useAuth();
    const { notifs } = usePdNotifs();
    const [open, setOpen] = useState(false);
    const [simCount, setSimCount] = useState(0);

    const self = useMemo(
        () => ({
            id: siweAddress ? siweAddress.toLowerCase() : '',
            anon: notifs.anon || !siweAddress,
        }),
        [siweAddress, notifs.anon],
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
        const sims = Array.from({ length: simCount }, (_, i) => ({ id: `sim-${i}`, anon: false }));
        return [...live, ...sims];
    }, [live, simCount]);

    const count = members.length;
    if (!notifs.audience) return null; // opted out via the MY PD Audience toggle
    if (count < 1) return null; // empty room / Realtime down → render nothing

    const pulsing = count >= PULSE_AT;

    return (
        <span className="audience-wrap">
            <span
                className={`stat-item audience-indicator${pulsing ? ' pulsing' : ''}`}
                role="button"
                tabIndex={0}
                title={`${count} watching this project right now`}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((v) => !v);
                    }
                }}
            >
                <span className="stat-icon audience-eye">{`◐${VS15}`}</span>{' '}
                <span className="stat-val audience-val">{count} watching</span>
            </span>

            {open && (
                <span className="audience-reveal" role="dialog" aria-label="Who's watching">
                    <span className="audience-reveal-head">{count} watching now</span>
                    <span className="audience-glyphs">
                        {members.map((m) => (
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
