'use client';

/*
 * MINT ROOM (Brendon's name, 2026-07-20) — the drop as a venue.
 *
 * THE DOOR (his spec, confirmed before build per Rule #-0.4): LONG-PRESS
 * the mint button and it expands into the room. Totally optional — the
 * Spell Book toggle reveals the door; nothing shows for anyone else.
 *
 * THE ANATOMY (his spec): the expanded surface keeps the mint button's own
 * corner radius (4px) as a monochrome chassis — black, or white when the
 * page's buttons run dark (the stone's polarity read) — and INSIDE it sits
 * the ROOM WINDOW: a rounder-cornered square themed to the project (the
 * page's own colorway tokens). × or backdrop steps out.
 *
 * Inside: the crowd (Audience presence), the shared supply bar draining
 * live, the soundtrack a tap away (the ONE player, over the fm bus),
 * reactions as rising sparks, the real MintButton, and a breathing LIVE
 * mark. Live-ness rides existing rails (Rule #0):
 *   - headcount = useProjectAudience (the ●'s own channel)
 *   - supply    = ProjectContext via the page's pd:project-refresh event,
 *                 nudged every 6s while the room is open
 *   - reactions = broadcast-only Realtime channel (mintroom:<slug>);
 *                 catalogued glyphs only (✶ ✧ ◊)
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useProject } from '../../lib/state/ProjectContext';
import { useProjectAudience } from '../../lib/hooks/useProjectAudience';
import { getSupabaseBrowser } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fmPlay, fmToggle, subscribeFm, getFm } from '../../lib/fm/fmBus';
import MintButton from './MintButton';

const VS15 = '︎';
const REACTIONS = [`✶${VS15}`, `✧${VS15}`, `◊${VS15}`] as const;

interface Spark { key: number; g: string; x: number }

export default function MintRoomModal({
    mintPrice,
    remaining,
    onClose,
}: {
    mintPrice: number;
    remaining: number;
    onClose: () => void;
}) {
    const project = useProject();
    const { siweAddress } = useAuth();
    const { notifs } = usePdNotifs();
    const fm = useSyncExternalStore(subscribeFm, getFm, getFm);

    /* The crowd — the Audience presence channel, verbatim self shape. */
    const self = useMemo(
        () => ({
            id: siweAddress ? siweAddress.toLowerCase() : '',
            anon: notifs.anon || !siweAddress,
            token: null,
        }),
        [siweAddress, notifs.anon],
    );
    const crowd = useProjectAudience(project.slug, self, true, !notifs.spell_invisible);

    /* Live supply — nudge the page's own refresh rail while the room is open. */
    useEffect(() => {
        const t = setInterval(() => {
            window.dispatchEvent(new Event('pd:project-refresh'));
        }, 6000);
        return () => clearInterval(t);
    }, []);

    /* Reactions — broadcast-only channel; sparks rise and die. */
    const [sparks, setSparks] = useState<Spark[]>([]);
    const chanRef = useRef<RealtimeChannel | null>(null);
    const keyRef = useRef(0);
    useEffect(() => {
        let sb;
        try { sb = getSupabaseBrowser(); } catch { return; }
        const chan = sb.channel(`mintroom:${project.slug}`);
        chan.on('broadcast', { event: 'react' }, (msg) => {
            const g = String((msg.payload as { g?: string })?.g ?? '');
            if (!REACTIONS.includes(g as (typeof REACTIONS)[number])) return;
            const key = ++keyRef.current;
            setSparks((prev) => [...prev.slice(-24), { key, g, x: 8 + Math.random() * 84 }]);
            setTimeout(() => setSparks((prev) => prev.filter((s) => s.key !== key)), 1900);
        });
        chan.subscribe();
        chanRef.current = chan;
        return () => {
            chanRef.current = null;
            void sb.removeChannel(chan);
        };
    }, [project.slug]);
    const react = (g: string) => {
        /* Local echo + the room hears it. */
        chanRef.current?.send({ type: 'broadcast', event: 'react', payload: { g } });
        const key = ++keyRef.current;
        setSparks((prev) => [...prev.slice(-24), { key, g, x: 8 + Math.random() * 84 }]);
        setTimeout(() => setSparks((prev) => prev.filter((s) => s.key !== key)), 1900);
    };

    /* The soundtrack — the ONE player, over the bus (a closed player summons). */
    const st = project.soundtrack;
    const tunedHere = fm.station?.playlistId === st?.playlistId;
    const onTune = () => {
        if (!st) return;
        if (tunedHere) { fmToggle(); return; }
        fmPlay({ playlistId: st.playlistId, label: st.label, slug: project.slug });
    };

    const minted = project.totalOutputs;
    const supply = project.maxSupply || 1;
    const pct = Math.min(100, Math.round((minted / supply) * 100));

    return (
        <div className="mintroom-veil" onClick={onClose} role="presentation">
            {/* the CHASSIS — the mint button's own 4px cut, blown up, monochrome */}
            <div
                className="mintroom-chassis"
                role="dialog"
                aria-label="Mint Room"
                onClick={(e) => e.stopPropagation()}
            >
                {/* the ROOM WINDOW — rounder square, themed to the project */}
                <div className="mr-window">
                    <div className="mr-head">
                        <span className="mr-title">{`✶${VS15} MINT ROOM`}</span>
                        <span className="mr-live">LIVE</span>
                        <button type="button" className="mr-close" onClick={onClose} aria-label="Leave the room">×</button>
                    </div>
                    <div className="mr-proj">{project.title.toUpperCase()}</div>

                    <div className="mr-crowd">
                        <span className="mr-crowd-dot" aria-hidden="true" />
                        {crowd.length <= 1 ? 'YOU HOLD THE ROOM' : `${crowd.length} IN THE ROOM`}
                    </div>

                    {/* the wall — the shared supply bar, draining for everyone */}
                    <div className="mr-supply" aria-label={`${minted} of ${supply} minted`}>
                        <div className="mr-supply-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mr-supply-read">{`${minted} / ${supply} MINTED`}</div>

                    {/* reactions rise over the room */}
                    <div className="mr-sparks" aria-hidden="true">
                        {sparks.map((s) => (
                            <span key={s.key} className="mr-spark" style={{ left: `${s.x}%` }}>{s.g}</span>
                        ))}
                    </div>
                    <div className="mr-react-row">
                        {REACTIONS.map((g) => (
                            <button key={g} type="button" className="mr-react" onClick={() => react(g)}>
                                {g}
                            </button>
                        ))}
                        {st && (
                            <button type="button" className="mr-tune" onClick={onTune}>
                                {tunedHere && fm.status === 'playing' ? '‖ SOUNDTRACK' : `▶${VS15} SOUNDTRACK`}
                            </button>
                        )}
                    </div>

                    {remaining > 0 ? (
                        <div className="mr-mint">
                            <MintButton
                                slug={project.slug}
                                projectTitle={project.title}
                                mintPrice={mintPrice}
                                remaining={remaining}
                            />
                        </div>
                    ) : (
                        <div className="mr-out">MINTED OUT — THE ROOM SAW IT HAPPEN</div>
                    )}
                </div>
            </div>
        </div>
    );
}
