'use client';

/*
 * NpcCast — the off-screen residents (UI-only rough-in).
 *
 * Mounted in the shell, gated on pdNotifs.spell_npc (the existing Spell Book
 * "NPC" pill — same button + slot, now actually driving this). When on, a
 * random resident's speech bubble slides in from its side wall, holds a few
 * seconds, then retracts. No event awareness yet — random character, random
 * line, random timing — this pass is purely to nail the look + feel.
 *
 * Each resident has a fixed home on a wall and speaks in their own Unicode
 * letterform (see lib/npc/cast) so you can tell who's talking at a glance. The
 * bubble matches the Petey popout's shape/size in the toasts' solid style, and
 * is forced to pure black/white by theme darkness (dark page → black bubble,
 * light page → white) — see globals.css .npc-cast.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePdNotifs } from '@/lib/state/PdNotifsContext';
import { CAST, styleText } from '@/lib/npc/cast';
import { readStage, pickAwareness, pickFourthWall } from '@/lib/npc/awareness';

type Polarity = 'dark' | 'light';

/** Pure-B/W choice by page-background darkness: dark bg → black bubble. */
function readPolarity(): Polarity {
    if (typeof window === 'undefined') return 'dark';
    try {
        const bg = getComputedStyle(document.body).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return 'dark';
        const [r, g, b] = m[1].split(',').map((n) => parseInt(n.trim(), 10));
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return lum < 0.5 ? 'dark' : 'light';
    } catch {
        return 'dark';
    }
}

export function NpcCast() {
    const { notifs } = usePdNotifs();
    const on = notifs.spell_npc;

    const [active, setActive] = useState<Record<string, boolean>>({});
    const [lineFor, setLineFor] = useState<Record<string, string>>({});
    const [polarity, setPolarity] = useState<Polarity>('dark');
    const hideTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    /* What you're doing right now — read from the route. The running speak timer
       reads the latest via a ref so navigation updates without restarting it. */
    const pathname = usePathname();
    const stage = useMemo(() => readStage(pathname), [pathname]);
    const stageRef = useRef(stage);
    stageRef.current = stage;

    useEffect(() => {
        if (!on) {
            setActive({});
            return;
        }

        const timers = hideTimers.current;
        let tickTimer: ReturnType<typeof setTimeout>;

        const speakOne = () => {
            setPolarity(readPolarity());
            setActive((prev) => {
                const liveIds = Object.keys(prev).filter((id) => prev[id]);
                if (liveIds.length >= 2) return prev; // keep the screen calm
                const idle = CAST.filter((c) => !prev[c.id]);
                if (!idle.length) return prev;
                const c = idle[Math.floor(Math.random() * idle.length)];
                /* Mostly own-world chatter; sometimes they clock what you're
                   doing (third-person), and once in a blue moon break the wall. */
                const ownWorld = c.lines[Math.floor(Math.random() * c.lines.length)];
                const roll = Math.random();
                let line: string;
                if (roll < 0.04) {
                    line = pickFourthWall(stageRef.current);
                } else if (roll < 0.38) {
                    line = pickAwareness(c.id, stageRef.current) ?? ownWorld;
                } else {
                    line = ownWorld;
                }
                setLineFor((lf) => ({ ...lf, [c.id]: line }));
                if (timers[c.id]) clearTimeout(timers[c.id]);
                timers[c.id] = setTimeout(() => {
                    setActive((p) => ({ ...p, [c.id]: false }));
                    delete timers[c.id];
                }, 6000);
                return { ...prev, [c.id]: true };
            });
        };

        const scheduleTick = () => {
            const delay = 6000 + Math.random() * 4000; // every ~6-10s
            tickTimer = setTimeout(() => {
                speakOne();
                scheduleTick();
            }, delay);
        };

        setPolarity(readPolarity());
        const kickoff = setTimeout(speakOne, 1200); // quick first sign of life
        scheduleTick();

        return () => {
            clearTimeout(kickoff);
            clearTimeout(tickTimer);
            Object.values(timers).forEach(clearTimeout);
            hideTimers.current = {};
        };
    }, [on]);

    if (!on) return null;

    return (
        <div
            className={`npc-cast ${polarity} npc-${(notifs.npc_size ?? 'M').toLowerCase()}`}
            aria-hidden="true"
        >
            {CAST.map((c) => (
                <div
                    key={c.id}
                    className={`npc-resident ${c.wall}${active[c.id] ? ' active' : ''}`}
                    style={{ top: `${c.top}%` }}
                >
                    <span className="npc-name">{c.name}</span>
                    <span className={`npc-bubble npc-anim-${c.anim}`}>
                        <span className="npc-bubble-text">
                            {styleText(lineFor[c.id] ?? '', c.style)}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
}
