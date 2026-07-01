'use client';

/*
 * NpcCast — the off-screen residents: PD's gossiping audience.
 *
 * Mounted in the shell, gated on pdNotifs.spell_npc (the Spell Book "NPC"
 * pill). The component owns TIMING + RENDERING only; everything they say comes
 * from the director (lib/npc/director), which reacts to what's actually on
 * screen: the page you're on, the piece in view (via its sampled visual
 * fingerprint — lib/npc/inview), your pacing, your idle stretches, your
 * @name, your theme, the clock, and what you've done in front of them this
 * session and last (lib/npc/memory).
 *
 * Cadence is scene-based, not metronomic: a moment plays (one line, or a
 * multi-beat exchange between residents), then the room goes quiet for a
 * varied stretch — with a quicker reaction when a new piece lands in front of
 * them. Each resident keeps a fixed wall home, a Unicode letterform and an
 * entrance motion (lib/npc/cast) so you know who's talking from the corner of
 * your eye. Bubble styling: globals.css .npc-cast.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { usePdNotifs } from '@/lib/state/PdNotifsContext';
import { useAuth } from '@/lib/state/AuthContext';
import { CAST, styleText } from '@/lib/npc/cast';
import { readStage } from '@/lib/npc/awareness';
import { directorTick, directorNav, type DirectorCtx, type PlayBeat } from '@/lib/npc/director';
import { readPieceInView } from '@/lib/npc/inview';
import { subscribeActions } from '@/lib/npc/actions';
import { getFamiliarSpeciesName } from '@/lib/engines/familiarEngine';

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

const BUBBLE_HOLD_MS = 6000;

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

/** The lull between moments — varied on purpose so the room never ticks like
 *  a metronome: mostly conversational gaps, sometimes a long quiet stretch. */
function nextLullMs(): number {
    const r = Math.random();
    if (r < 0.4) return 14000 + Math.random() * 12000;  // 14–26s
    if (r < 0.8) return 26000 + Math.random() * 24000;  // 26–50s
    return 50000 + Math.random() * 40000;               // 50–90s lull
}

export function NpcCast() {
    const { notifs } = usePdNotifs();
    const { handle } = useAuth();
    const on = notifs.spell_npc;
    /* The Familiar's on-screen presence gates the once-ever crossover scene. */
    const familiarOn = !!notifs.spell_familiar;
    const familiarOnRef = useRef(familiarOn);
    familiarOnRef.current = familiarOn;
    /* Your username (no @) — the residents weave it in instead of always "they".
       Read via a ref so the running timers see the latest without restarting. */
    const viewerName = handle ? handle.replace(/^@/, '') : null;
    const nameRef = useRef<string | null>(viewerName);
    nameRef.current = viewerName;

    const [active, setActive] = useState<Record<string, boolean>>({});
    const [lineFor, setLineFor] = useState<Record<string, string>>({});
    /* Small per-speak offset around each resident's home so the bubble doesn't
       land in the exact same spot every time. */
    const [jitter, setJitter] = useState<Record<string, { x: number; y: number }>>({});
    const [polarity, setPolarity] = useState<Polarity>('dark');
    const hideTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const activeRef = useRef<Record<string, boolean>>({});
    /* Bubble DOM nodes + an off-screen measurer used to size each bubble to its
       longest wrapped line (a solid box can't shrink to wrapped text on its own). */
    const bubbleRefs = useRef<Record<string, HTMLSpanElement | null>>({});
    const measureRef = useRef<HTMLSpanElement | null>(null);

    /* Mischief state — sneakWall drives render; refs drive the speak logic. */
    const [sneakWall, setSneakWall] = useState<'left' | null>(null);
    const sneakWallRef = useRef<'left' | null>(null);
    const sneakCount = useRef(0);
    const sneakTarget = useRef(3);

    /* What you're doing right now — read from the route. Running timers read
       the latest via a ref so navigation updates without restarting them. */
    const pathname = usePathname();
    const stage = useMemo(() => readStage(pathname), [pathname]);
    const stageRef = useRef(stage);
    stageRef.current = stage;

    /* Activity + "they noticed" tracking. */
    const lastActivity = useRef(Date.now());
    const noticeKey = useRef<string | null>(null);

    /* Route changes feed the pacing read + reset the idle clock. */
    useEffect(() => {
        if (!on) return;
        directorNav();
        lastActivity.current = Date.now();
    }, [pathname, on]);

    useEffect(() => {
        if (!on) {
            setActive({});
            activeRef.current = {};
            sneakWallRef.current = null;
            sneakCount.current = 0;
            setSneakWall(null);
            return;
        }

        const timers = hideTimers.current;
        const beatTimers: ReturnType<typeof setTimeout>[] = [];
        let tickTimer: ReturnType<typeof setTimeout>;
        let playing = false;

        const touch = () => { lastActivity.current = Date.now(); };
        window.addEventListener('pointerdown', touch, { passive: true });
        window.addEventListener('wheel', touch, { passive: true });
        window.addEventListener('touchstart', touch, { passive: true });
        window.addEventListener('keydown', touch);
        window.addEventListener('scroll', touch, { passive: true });

        const show = (id: string, line: string) => {
            setLineFor((lf) => ({ ...lf, [id]: line }));
            setJitter((jt) => ({
                ...jt,
                [id]: { x: Math.round(Math.random() * 26), y: Math.round((Math.random() * 2 - 1) * 30) },
            }));
            activeRef.current = { ...activeRef.current, [id]: true };
            setActive((p) => ({ ...p, [id]: true }));
            if (timers[id]) clearTimeout(timers[id]);
            timers[id] = setTimeout(() => {
                activeRef.current = { ...activeRef.current, [id]: false };
                setActive((p) => ({ ...p, [id]: false }));
                delete timers[id];
            }, BUBBLE_HOLD_MS);
        };

        /* Eddie's wall mischief wraps any beat he delivers: sometimes he sneaks
           over, and after a couple of appearances a left-wall neighbour shoos
           him home (that beat replaces his). */
        const speakWithMischief = (id: string, line: string) => {
            if (id === MISCHIEF_ID) {
                if (sneakWallRef.current && sneakCount.current >= sneakTarget.current) {
                    const shooers = CAST.filter(
                        (x) => x.wall === SNEAK_WALL && x.id !== MISCHIEF_ID && !activeRef.current[x.id],
                    );
                    sneakWallRef.current = null;
                    sneakCount.current = 0;
                    setSneakWall(null);
                    if (shooers.length) {
                        const s = shooers[Math.floor(Math.random() * shooers.length)];
                        show(s.id, SHOO_LINES[Math.floor(Math.random() * SHOO_LINES.length)]);
                        return;
                    }
                } else if (sneakWallRef.current) {
                    sneakCount.current += 1;
                } else if (Math.random() < 0.25) {
                    sneakWallRef.current = SNEAK_WALL;
                    setSneakWall(SNEAK_WALL);
                    sneakCount.current = 1;
                    sneakTarget.current = 3 + Math.round(Math.random()); // 3-4 appearances
                }
            }
            show(id, line);
        };

        const runPlayout = (beats: PlayBeat[]) => {
            playing = true;
            setPolarity(readPolarity());
            let at = 0;
            for (const b of beats) {
                at += b.gapMs;
                beatTimers.push(setTimeout(() => speakWithMischief(b.who, b.text), at));
            }
            beatTimers.push(setTimeout(() => { playing = false; }, at + 1500));
        };

        const moment = () => {
            if (playing) return;
            const piece = stageRef.current.kind === 'artwork' ? readPieceInView() : null;
            const ctx: DirectorCtx = {
                stage: stageRef.current,
                piece,
                name: nameRef.current,
                polarity: readPolarity(),
                hour: new Date().getHours(),
                idleMs: Date.now() - lastActivity.current,
                activeIds: new Set(Object.keys(activeRef.current).filter((id) => activeRef.current[id])),
                familiarOn: familiarOnRef.current,
                familiarName: familiarOnRef.current ? getFamiliarSpeciesName() || null : null,
            };
            const beats = directorTick(ctx);
            if (beats && beats.length) runPlayout(beats);
        };

        const scheduleTick = (delay: number) => {
            tickTimer = setTimeout(() => {
                /* A fresh piece landed in front of them since the last moment →
                   react sooner (they noticed), instead of waiting out the lull. */
                moment();
                const piece = readPieceInView();
                const key = piece ? `${piece.slug}:${piece.id}` : null;
                noticeKey.current = key;
                scheduleTick(nextLullMs());
            }, delay);
        };

        /* Watch for a new piece coming into view mid-lull: a light poll that
           only shortens the wait when something actually changed. */
        const noticer = setInterval(() => {
            if (playing) return;
            const piece = readPieceInView();
            const key = piece ? `${piece.slug}:${piece.id}` : null;
            if (key && key !== noticeKey.current) {
                noticeKey.current = key;
                clearTimeout(tickTimer);
                scheduleTick(3500 + Math.random() * 5000);
            }
        }, 2000);

        /* You DID something (star / wishlist / cart / mint / …) — the couch
           pounces within a couple of seconds instead of waiting out the lull.
           The director owns per-action cooldowns; this only reshuffles timing. */
        const unsubActions = subscribeActions(() => {
            lastActivity.current = Date.now();
            if (playing) return;
            clearTimeout(tickTimer);
            scheduleTick(2200 + Math.random() * 2800);
        });

        setPolarity(readPolarity());
        scheduleTick(3000); // first sign of life (the director cold-opens)

        return () => {
            clearTimeout(tickTimer);
            clearInterval(noticer);
            unsubActions();
            beatTimers.forEach(clearTimeout);
            Object.values(timers).forEach(clearTimeout);
            hideTimers.current = {};
            activeRef.current = {};
            window.removeEventListener('pointerdown', touch);
            window.removeEventListener('wheel', touch);
            window.removeEventListener('touchstart', touch);
            window.removeEventListener('keydown', touch);
            window.removeEventListener('scroll', touch);
        };
    }, [on]);

    /* Size each visible bubble to hug its wrapped text EXACTLY. The old
       approach (widest line-box rect) over-reported on wrapped lines — hanging
       break spaces + fallback-font metrics inflated the width, leaving a blank
       slab past the text (the "butt"). Instead: count the line boxes at the
       cap, then binary-search the NARROWEST width that still fits that many
       lines. At that width one line exactly fills the box, so there is nothing
       to stick out — no per-character fudge needed. The measurer has no
       transformed ancestor, so it lays out accurately even while a bubble
       plays its entrance animation. */
    useEffect(() => {
        const m = measureRef.current;
        if (!m || typeof window === 'undefined') return;
        const cap = Math.min(152, window.innerWidth * 0.52);
        const padX = 22; // must match .npc-bubble horizontal padding (11px * 2)
        m.style.fontSize = '15px';
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
            const capW = Math.max(24, Math.round(cap - padX));
            m.style.maxWidth = `${capW}px`;
            const lineCount = m.getClientRects().length;
            if (lineCount === 0) { el.style.width = ''; continue; }
            let lo = 24, hi = capW;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                m.style.maxWidth = `${mid}px`;
                if (m.getClientRects().length > lineCount) lo = mid + 1;
                else hi = mid;
            }
            el.style.width = `${lo + padX}px`;
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
