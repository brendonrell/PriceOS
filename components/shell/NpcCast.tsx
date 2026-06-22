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
import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { usePdNotifs } from '@/lib/state/PdNotifsContext';
import { CAST, styleText } from '@/lib/npc/cast';
import { readStage, pickAwareness, pickFourthWall } from '@/lib/npc/awareness';

type Polarity = 'dark' | 'light';

/* Mischief — one resident (Eddie, the gossip) occasionally sneaks onto the
   opposite wall, then a neighbour there shoos him home after a couple messages.
   Makes it read like they talk to each other, not shout into the ether. */
const MISCHIEF_ID = 'eddie';
const SNEAK_WALL = 'left'; // opposite Eddie's right-wall home
const SNEAK_TOP = 33; // sits near a left-wall neighbour while sneaking
const SHOO_LINES = [
    'Eddie. Wrong side. Go home.',
    'Back to your wall, Eddie.',
    'Not over here, Eddie.',
    "Eddie's snooping again. Shoo.",
    'Wrong wall, Eddie. Out.',
];

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
    /* Small per-speak offset around each resident's home so the bubble doesn't
       land in the exact same spot every time. */
    const [jitter, setJitter] = useState<Record<string, { x: number; y: number }>>({});
    const [polarity, setPolarity] = useState<Polarity>('dark');
    const hideTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    /* Bubble DOM nodes + an off-screen measurer used to size each bubble to its
       longest wrapped line (a solid box can't shrink to wrapped text on its own). */
    const bubbleRefs = useRef<Record<string, HTMLSpanElement | null>>({});
    const measureRef = useRef<HTMLSpanElement | null>(null);

    /* Mischief state — sneakWall drives render; refs drive the speak-timer logic. */
    const [sneakWall, setSneakWall] = useState<'left' | null>(null);
    const sneakWallRef = useRef<'left' | null>(null);
    const sneakCount = useRef(0);
    const sneakTarget = useRef(3);

    /* What you're doing right now — read from the route. The running speak timer
       reads the latest via a ref so navigation updates without restarting it. */
    const pathname = usePathname();
    const stage = useMemo(() => readStage(pathname), [pathname]);
    const stageRef = useRef(stage);
    stageRef.current = stage;

    useEffect(() => {
        if (!on) {
            setActive({});
            sneakWallRef.current = null;
            sneakCount.current = 0;
            setSneakWall(null);
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

                const show = (id: string, line: string) => {
                    setLineFor((lf) => ({ ...lf, [id]: line }));
                    setJitter((jt) => ({
                        ...jt,
                        [id]: { x: Math.round(Math.random() * 26), y: Math.round((Math.random() * 2 - 1) * 30) },
                    }));
                    if (timers[id]) clearTimeout(timers[id]);
                    timers[id] = setTimeout(() => {
                        setActive((p) => ({ ...p, [id]: false }));
                        delete timers[id];
                    }, 6000);
                };

                const c = idle[Math.floor(Math.random() * idle.length)];

                // Mischief: Eddie sneaks onto the other wall, then a neighbour
                // there shoos him home after a couple of messages.
                if (c.id === MISCHIEF_ID) {
                    if (sneakWallRef.current && sneakCount.current >= sneakTarget.current) {
                        const shooers = CAST.filter(
                            (x) => x.wall === SNEAK_WALL && x.id !== MISCHIEF_ID && !prev[x.id],
                        );
                        sneakWallRef.current = null;
                        sneakCount.current = 0;
                        setSneakWall(null);
                        if (shooers.length) {
                            const s = shooers[Math.floor(Math.random() * shooers.length)];
                            show(s.id, SHOO_LINES[Math.floor(Math.random() * SHOO_LINES.length)]);
                            return { ...prev, [s.id]: true };
                        }
                    } else if (sneakWallRef.current) {
                        sneakCount.current += 1;
                    } else if (Math.random() < 0.3) {
                        sneakWallRef.current = SNEAK_WALL;
                        setSneakWall(SNEAK_WALL);
                        sneakCount.current = 1;
                        sneakTarget.current = 3 + Math.round(Math.random()); // 3-4 turns → 2-3 messages
                    }
                }

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
                show(c.id, line);
                return { ...prev, [c.id]: true };
            });
        };

        const scheduleTick = () => {
            const delay = 12000 + Math.random() * 10000; // every ~12-22s (calmer)
            tickTimer = setTimeout(() => {
                speakOne();
                scheduleTick();
            }, delay);
        };

        setPolarity(readPolarity());
        const kickoff = setTimeout(speakOne, 2500); // first sign of life
        scheduleTick();

        return () => {
            clearTimeout(kickoff);
            clearTimeout(tickTimer);
            Object.values(timers).forEach(clearTimeout);
            hideTimers.current = {};
        };
    }, [on]);

    /* Size each visible bubble to hug its longest wrapped line. The measurer has
       no transformed ancestor, so its line widths are accurate even while a
       bubble plays its entrance animation. */
    useEffect(() => {
        const m = measureRef.current;
        if (!m || typeof window === 'undefined') return;
        const cap = Math.min(168, window.innerWidth * 0.52);
        const padX = 24; // must match .npc-bubble horizontal padding (12px * 2)
        m.style.fontSize = '16px';
        m.style.maxWidth = `${cap - padX}px`;
        for (const c of CAST) {
            const el = bubbleRefs.current[c.id];
            if (!el) continue;
            const text = lineFor[c.id];
            if (!active[c.id] || !text) {
                el.style.width = '';
                continue;
            }
            m.style.letterSpacing = c.letterSpacing ?? '';
            m.textContent = styleText(text, c.style);
            const rects = m.getClientRects();
            let w = 0;
            for (let i = 0; i < rects.length; i++) w = Math.max(w, rects[i].width);
            el.style.width = w > 0 ? `${Math.ceil(w + padX + 1) + (c.widthAdjust ?? 0)}px` : '';
        }
    }, [active, lineFor]);

    if (!on) return null;

    return (
        <div className={`npc-cast ${polarity}`} aria-hidden="true">
            {CAST.map((c) => {
                const j = jitter[c.id] ?? { x: 0, y: 0 };
                /* Eddie renders on the sneak wall while mischievous. */
                const sneaking = c.id === MISCHIEF_ID && !!sneakWall;
                const wall = sneaking ? (sneakWall as 'left') : c.wall;
                const topPct = sneaking ? SNEAK_TOP : c.top;
                const rStyle: CSSProperties = { top: `calc(${topPct}% + ${j.y}px)` };
                if (wall === 'left') rStyle.marginLeft = j.x;
                else rStyle.marginRight = j.x;
                return (
                <div
                    key={c.id}
                    className={`npc-resident ${wall}${active[c.id] ? ' active' : ''}`}
                    style={rStyle}
                >
                    <span className="npc-name">{c.name}</span>
                    <span
                        ref={(el) => {
                            bubbleRefs.current[c.id] = el;
                        }}
                        className={`npc-bubble npc-anim-${c.anim}`}
                        style={c.letterSpacing ? { letterSpacing: c.letterSpacing } : undefined}
                    >
                        {styleText(lineFor[c.id] ?? '', c.style)}
                    </span>
                </div>
                );
            })}
            <span ref={measureRef} className="npc-measure" aria-hidden="true" />
        </div>
    );
}
