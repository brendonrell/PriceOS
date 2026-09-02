'use client';

/*
 * FriendInspectorPreview — the Friend Inspector+ strip above the ledger.
 *
 * ⛔ REBUILT 2026-07-30 (Brendon: "I hate our friend inspector preview").
 * The old WIRE (a scrolling marquee of circle events) and MAP (a starfield
 * constellation) are GONE. Five modes now (cut from six — NEW was folded
 * into ROSTER, 2026-08-30: it was the same face grid with an unexplained
 * tint, so it's now MUTUAL/NEW text badges on one roster instead of two
 * near-identical tabs), each answering a question the ledger CANNOT, each
 * a live control — tapping anything drives the list below it.
 *
 *   30 DAYS — your circle's activity as a dense day grid, darker where more
 *     moved, today at the end. Tap a day → the ledger narrows to who moved
 *     that day. Days are viewer-LOCAL (§9). Default + first in the cycle.
 *
 *   STREAKS — who in your circle has moved the most consecutive days inside
 *     the same 30-day window, current streak leading, best-in-window as the
 *     tiebreaker. Tap a row → jump to that person's ledger row. Shares the
 *     30 Days fetch (useThirtyDayBuckets) — no second network round-trip.
 *
 *   SPEND — your circle ranked by ETH spent, same bar-and-count shape as
 *     OVERLAP but against spend instead of shared projects. Tap a row →
 *     jump to that person.
 *
 *   OVERLAP — every project YOU hold, with a bar of how much of your circle
 *     holds it too. The one read the row list can't give: what you're
 *     actually in on together. Tap a project → the ledger below narrows to
 *     exactly the people who hold it. (Label was truncated to "OVER" before
 *     2026-08-30 — read as "it's over", not "overlap". Spelled out now.)
 *
 *   ROSTER — the whole circle as PriceSprite faces in a tight grid. Each
 *     face that's a mutual follow wears a visible MUTUAL badge under its
 *     name; each face among the 8 most-recently-added (non-mutual) edges
 *     wears a visible NEW badge instead — plain text, not a silent tint,
 *     so what you're looking at is legible without reading the source
 *     (Brendon, 2026-08-30: the old tint-only mutual/recent marks had zero
 *     in-app explanation). Turns a long scroll into one glance; tap a face
 *     to jump to that person's row and open them.
 *
 * Same nav as before (Brendon's instruction): the floating text chips, top
 * right, one pick persisted per device.
 *
 * Data: no new endpoints — the circle's own owned-projects reads, the live
 * feed, and circle-stats, all already used by the Inspector.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SpriteFace from './SpriteFace';
import { useSpriteFace } from '../lib/hooks/useSpriteFace';
import { projectSpriteFace } from '../lib/project/projectSprite';
import { getProject } from '../lib/project/registry';
import { useLongPress } from '../lib/hooks/useLongPress';
import { useToast } from '../lib/state/ToastContext';
import type { CircleStat } from '../app/api/social/circle-stats/route';

const VS15 = '︎';

/* PreviewSprite — the real live PriceSprite for a @handle, wherever this
   file needs one inside a list (Brendon, 2026-08-26 fix). Previously every
   roster/overlap/spend row called the sticker-catalog's spriteFaceFor(),
   a deterministic hash-placeholder built for STICKERS ("Real on-chain / DB
   sprites swap in here later" per its own doc comment) — never the user's
   actual saved sprite. useSpriteFace can't be called inside a .map(), so it
   lives in its own tiny component instead, same shape as AsciiId's usage. */
function PreviewSprite({ handle, color }: { handle: string; color?: string }) {
    const face = useSpriteFace(handle);
    return face ? <SpriteFace className="collected-sprite" face={face} color={color} /> : null;
}

const MODE_KEY = 'pd_fi_preview';
/* HOLD a mode chip → pins it to the front of the sequence, everything else
   keeps its normal relative order behind it (Brendon, 2026-08-20). Hidden
   feature — no UI prompt; documented in the user docs instead. Grail pin
   glyph (⟟) reused for now, same icon as the Wishlist/Starred grail pin,
   while Brendon picks a dedicated icon. */
const PIN_KEY = 'pd_fi_preview_pin';
const PIN_GLYPH = '⟟';
type PreviewMode = 'days' | 'streak' | 'spend' | 'overlap' | 'roster';
const MODES: { key: PreviewMode; label: string }[] = [
    { key: 'days', label: '30D' },
    { key: 'streak', label: 'STREAKS' },
    { key: 'spend', label: 'SPEND' },
    { key: 'overlap', label: 'OVERLAP' },
    { key: 'roster', label: 'ROSTER' },
];

export interface PreviewPerson {
    handle: string;
    addr: string | null;
    stat: CircleStat | undefined;
    mutual: boolean;
    /** Shared-holdings count (the Cartel read) — null while loading. */
    shared: number | null;
}

/** What a tap in the strip hands back to the ledger: a set of people + the
 *  reason they're focused, shown as the clear chip's label. */
export interface PreviewFocus { handles: string[]; label: string; glyph: string }

function readMode(): PreviewMode {
    try {
        const saved = localStorage.getItem(MODE_KEY);
        if (saved === 'roster' || saved === 'days' || saved === 'overlap' || saved === 'streak' || saved === 'spend') return saved;
    } catch { /* first visit */ }
    return 'days';
}

function readPin(): PreviewMode | null {
    try {
        const saved = localStorage.getItem(PIN_KEY);
        if (saved === 'roster' || saved === 'days' || saved === 'overlap' || saved === 'streak' || saved === 'spend') return saved;
    } catch { /* first visit */ }
    return null;
}

export default function FriendInspectorPreview({
    people, inspected, onInspect, mySlugs, onFocus,
}: {
    people: PreviewPerson[];
    inspected: string | null;
    onInspect: (handle: string) => void;
    /** Your own holdings — the OVERLAP's left column. */
    mySlugs: string[] | null;
    onFocus: (focus: PreviewFocus) => void;
}) {
    const [mode, setMode] = useState<PreviewMode>('days');
    useEffect(() => { setMode(readMode()); }, []);
    const pick = useCallback((m: PreviewMode) => {
        setMode(m);
        try { localStorage.setItem(MODE_KEY, m); } catch { /* device-local nicety */ }
    }, []);

    const [pinned, setPinned] = useState<PreviewMode | null>(null);
    useEffect(() => { setPinned(readPin()); }, []);
    const { showToast } = useToast();
    const togglePin = useCallback((m: PreviewMode) => {
        setPinned((prev) => {
            const next = prev === m ? null : m;
            try {
                if (next) localStorage.setItem(PIN_KEY, next);
                else localStorage.removeItem(PIN_KEY);
            } catch { /* device-local nicety */ }
            showToast(next ? `${MODES.find((x) => x.key === m)?.label}: PINNED` : `${MODES.find((x) => x.key === m)?.label}: UNPINNED`);
            return next;
        });
    }, [showToast]);

    const orderedModes = useMemo(() => {
        if (!pinned) return MODES;
        const p = MODES.find((m) => m.key === pinned);
        if (!p) return MODES;
        return [p, ...MODES.filter((m) => m.key !== pinned)];
    }, [pinned]);

    return (
        <div className="fi-preview">
            <div className="fi-preview-toggle" role="group" aria-label="Preview mode">
                {orderedModes.map((m) => (
                    <PreviewChip
                        key={m.key}
                        label={m.label}
                        on={mode === m.key}
                        pinned={pinned === m.key}
                        onClick={() => pick(m.key)}
                        onHold={() => togglePin(m.key)}
                    />
                ))}
            </div>
            {mode === 'days' && <ThirtyDays people={people} onFocus={onFocus} />}
            {mode === 'streak' && <Streak people={people} onInspect={onInspect} />}
            {mode === 'spend' && <Spend people={people} onInspect={onInspect} />}
            {mode === 'overlap' && <Overlap people={people} mySlugs={mySlugs} onFocus={onFocus} />}
            {mode === 'roster' && (
                <RosterSection people={people} inspected={inspected} onInspect={onInspect} />
            )}
        </div>
    );
}

/* A single preview-mode chip. HOLD pins it to the front of the sequence
   (Brendon, 2026-08-20) — same useLongPress contract as every other hold in
   PD. No UI prompt; the pin glyph is the only visible trace once it lands. */
function PreviewChip({
    label, on, pinned, onClick, onHold,
}: { label: string; on: boolean; pinned: boolean; onClick: () => void; onHold: () => void }) {
    const hold = useLongPress(onHold);
    return (
        <button
            type="button"
            className={`ambient-chip fi-preview-chip${on ? ' on' : ''}${pinned ? ' is-pinned' : ''}`}
            onClick={onClick}
            {...hold}
        >
            {pinned && <span className="fi-preview-pin" aria-hidden="true">{`${PIN_GLYPH}${VS15}`}</span>}
            {label}
        </button>
    );
}

/* ── Shared: every circle member's holdings, fetched once and cached for the
   life of the panel. The same read the Cartel counts already do. ── */
function useCircleHoldings(people: PreviewPerson[], on: boolean) {
    const [byHandle, setByHandle] = useState<Record<string, string[]> | null>(null);
    const done = useRef(false);
    useEffect(() => {
        if (!on || done.current) return;
        const withAddr = people.filter((p) => p.addr);
        if (withAddr.length === 0) { setByHandle({}); return; }
        done.current = true;
        let alive = true;
        Promise.all(withAddr.map(async (p) => {
            try {
                const j = await fetch(`/api/user/${p.addr}/owned-projects`).then((r) => (r.ok ? r.json() : null));
                return [p.handle, Array.isArray(j?.slugs) ? (j.slugs as string[]) : []] as const;
            } catch {
                return [p.handle, [] as string[]] as const;
            }
        })).then((entries) => { if (alive) setByHandle(Object.fromEntries(entries)); });
        return () => { alive = false; };
    }, [on, people]);
    return byHandle;
}

/* ── THE OVERLAP ─────────────────────────────────────────────────────────
   One row per project you hold: the project's sprite + name, a bar filled by
   the share of your circle holding it, and the head-count. Sorted by the
   crowd, biggest first — the projects your people are actually in on. ── */
function Overlap({
    people, mySlugs, onFocus,
}: { people: PreviewPerson[]; mySlugs: string[] | null; onFocus: (f: PreviewFocus) => void }) {
    const holdings = useCircleHoldings(people, true);

    const rows = useMemo(() => {
        if (!mySlugs || !holdings) return null;
        return mySlugs.map((slug) => {
            const key = slug.toLowerCase();
            const holders = people
                .filter((p) => (holdings[p.handle] ?? []).some((s) => s.toLowerCase() === key))
                .map((p) => p.handle);
            return { slug, holders };
        }).sort((a, b) => b.holders.length - a.holders.length || a.slug.localeCompare(b.slug));
    }, [mySlugs, holdings, people]);

    if (rows === null) return <div className="fi-pv-note fm-loading">Reading your circle…</div>;
    if (rows.length === 0) {
        return <div className="fi-pv-note">Collect a piece and the overlap with your circle shows here.</div>;
    }

    const total = Math.max(people.length, 1);

    return (
        <div className="fi-overlap">
            {rows.map(({ slug, holders }) => {
                const def = getProject(slug);
                const name = def?.displayName ?? slug.toUpperCase();
                const face = projectSpriteFace(slug);
                const share = holders.length / total;
                const go = () => {
                    if (holders.length === 0) return;
                    onFocus({ handles: holders, label: name, glyph: '⬚' });
                };
                return (
                    <div
                        key={slug}
                        className={`fi-ov-row${holders.length > 0 ? ' live' : ''}`}
                        role="button"
                        tabIndex={0}
                        title={holders.length > 0 ? `${holders.length} in your circle hold ${name}` : `Nobody in your circle holds ${name}`}
                        onClick={go}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}
                    >
                        {face && <SpriteFace className="collected-sprite" face={face} />}
                        <span className="fi-ov-name">{name}</span>
                        <span className="fi-ov-bar" aria-hidden="true">
                            <span className="fi-ov-fill" style={{ width: `${Math.round(share * 100)}%` }} />
                        </span>
                        <span className="fi-ov-count">{holders.length}<span className="fi-ov-of">/{total}</span></span>
                    </div>
                );
            })}
        </div>
    );
}

/* ── THE ROSTER ──────────────────────────────────────────────────────────
   The circle as faces. Each mutual gets a visible MUTUAL text badge, never
   an unexplained background tint. Dropped the "YOU" self-cell (redundant —
   this is already your own circle) and the NEW badge (an unexplained
   8-most-recent heuristic that never earned its keep — Brendon, 2026-09-01:
   "maddeningly unclear and unhelpful"). ── */
function Roster({
    people, inspected, onInspect,
}: {
    people: PreviewPerson[]; inspected: string | null; onInspect: (h: string) => void;
}) {
    if (people.length === 0) {
        return <div className="fi-pv-note">Your circle shows here as faces once you follow someone.</div>;
    }
    return (
        <div className="fi-roster">
            {people.map((p) => (
                <span
                    key={p.handle}
                    className={`fi-rost-cell${inspected === p.handle ? ' on' : ''}`}
                    role="button"
                    tabIndex={0}
                    title={`@${p.handle}${p.mutual ? ' — mutual' : ''}`}
                    onClick={() => onInspect(p.handle)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(p.handle); } }}
                >
                    <PreviewSprite handle={p.handle} color={p.stat?.profileHex ?? undefined} />
                    <span className="fi-rost-name">@{p.handle}</span>
                    {p.mutual && <span className="fi-rost-badge fi-rost-badge-mutual">MUTUAL</span>}
                </span>
            ))}
        </div>
    );
}

/* ── ROSTER SECTION — two sub-views, same face grid (Brendon, 2026-09-02):
   GM mode (Roster, above) vs. INSIGHT, a generative read of the same circle.
   Tapping the INSIGHT pill always re-rolls in place — same "tap it again to
   reroll" contract as the homepage Shuffle tab — picking a fresh grouping
   strategy and splitting the circle into a featured cluster + the rest,
   with a title naming what it found. Nothing here is stored; it's just a
   different lens on `people` each tap, same data Roster and the ledger use. */
function RosterSection({
    people, inspected, onInspect,
}: {
    people: PreviewPerson[]; inspected: string | null; onInspect: (h: string) => void;
}) {
    const [view, setView] = useState<'roster' | 'insight'>('roster');
    const [insightSeed, setInsightSeed] = useState(0);
    const pickInsight = () => {
        setView('insight');
        setInsightSeed((s) => s + 1); // re-roll every tap, even if already on Insight
    };
    return (
        <div className="fi-roster-section">
            <div className="fi-roster-subtabs" role="tablist" aria-label="Roster view">
                <button type="button" className={`ambient-chip fi-preview-chip${view === 'roster' ? ' on' : ''}`} onClick={() => setView('roster')}>ROSTER</button>
                <button type="button" className={`ambient-chip fi-preview-chip${view === 'insight' ? ' on' : ''}`} onClick={pickInsight}>INSIGHT</button>
            </div>
            {view === 'roster'
                ? <Roster people={people} inspected={inspected} onInspect={onInspect} />
                : <Insight key={insightSeed} people={people} inspected={inspected} onInspect={onInspect} />}
        </div>
    );
}

/* Each strategy splits the circle into a featured cluster + the remainder,
   naming what makes the featured cluster featured. Add more here any time —
   Insight picks one at random per roll. */
const INSIGHT_STRATEGIES: {
    title: string;
    featuredLabel: string;
    restLabel: string;
    split: (people: PreviewPerson[]) => [PreviewPerson[], PreviewPerson[]];
}[] = [
    {
        title: 'WHO FOLLOWS BACK',
        featuredLabel: 'MUTUAL',
        restLabel: 'ONE-WAY',
        split: (people) => [people.filter((p) => p.mutual), people.filter((p) => !p.mutual)],
    },
    {
        title: 'WHO COLLECTS LIKE YOU',
        featuredLabel: 'SHARES A HOLDING',
        restLabel: 'NO OVERLAP YET',
        split: (people) => [people.filter((p) => (p.shared ?? 0) > 0), people.filter((p) => (p.shared ?? 0) === 0)],
    },
    {
        title: 'MAKERS VS. COLLECTORS',
        featuredLabel: 'ARTISTS',
        restLabel: 'COLLECTORS',
        split: (people) => [people.filter((p) => p.stat?.isArtist), people.filter((p) => !p.stat?.isArtist)],
    },
    {
        title: 'WHERE THE ETH WENT',
        featuredLabel: 'TOP SPENDERS',
        restLabel: 'EVERYONE ELSE',
        split: (people) => {
            const sorted = [...people].sort((a, b) => (b.stat?.spentEth ?? 0) - (a.stat?.spentEth ?? 0));
            const cut = Math.max(1, Math.ceil(sorted.length / 3));
            return [sorted.slice(0, cut), sorted.slice(cut)];
        },
    },
    {
        title: 'THE BIGGEST CROWDS',
        featuredLabel: 'MOST FOLLOWED',
        restLabel: 'EVERYONE ELSE',
        split: (people) => {
            const sorted = [...people].sort((a, b) => (b.stat?.followers ?? 0) - (a.stat?.followers ?? 0));
            const cut = Math.max(1, Math.ceil(sorted.length / 3));
            return [sorted.slice(0, cut), sorted.slice(cut)];
        },
    },
];

function InsightFace({
    p, inspected, onInspect,
}: { p: PreviewPerson; inspected: string | null; onInspect: (h: string) => void }) {
    return (
        <span
            className={`fi-rost-cell${inspected === p.handle ? ' on' : ''}`}
            role="button"
            tabIndex={0}
            title={`@${p.handle}`}
            onClick={() => onInspect(p.handle)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(p.handle); } }}
        >
            <PreviewSprite handle={p.handle} color={p.stat?.profileHex ?? undefined} />
            <span className="fi-rost-name">@{p.handle}</span>
        </span>
    );
}

function Insight({
    people, inspected, onInspect,
}: { people: PreviewPerson[]; inspected: string | null; onInspect: (h: string) => void }) {
    const strategy = useMemo(
        () => INSIGHT_STRATEGIES[Math.floor(Math.random() * INSIGHT_STRATEGIES.length)],
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-rolls only when the caller
        // remounts via key={insightSeed}; `people` alone shouldn't reshuffle mid-view.
        [],
    );
    const [featured, rest] = useMemo(() => strategy.split(people), [strategy, people]);

    if (people.length === 0) {
        return <div className="fi-pv-note">Insight needs a circle to work with — follow someone first.</div>;
    }
    if (featured.length === 0) {
        return <div className="fi-pv-note">{strategy.title} — nobody in your circle fits yet. Tap INSIGHT to try another read.</div>;
    }
    return (
        <div className="fi-insight">
            <div className="fi-insight-title">{strategy.title}</div>
            <div className="fi-insight-group featured">
                <div className="fi-insight-group-label">{strategy.featuredLabel} · {featured.length}</div>
                <div className="fi-roster">
                    {featured.map((p) => <InsightFace key={p.handle} p={p} inspected={inspected} onInspect={onInspect} />)}
                </div>
            </div>
            {rest.length > 0 && (
                <div className="fi-insight-group">
                    <div className="fi-insight-group-label">{strategy.restLabel} · {rest.length}</div>
                    <div className="fi-roster">
                        {rest.map((p) => <InsightFace key={p.handle} p={p} inspected={inspected} onInspect={onInspect} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Shared: the last 30 days of circle activity, bucketed by viewer-local
   day. ThirtyDays reads it for the grid; Streak reads the exact same
   buckets to find consecutive-day runs — one fetch, two modes. ── */
interface DayCell { key: string; label: string; count: number; handles: string[] }

function useThirtyDayBuckets(people: PreviewPerson[], on: boolean) {
    const [days, setDays] = useState<DayCell[] | null>(null);
    const done = useRef(false);
    const circle = useMemo(() => new Set(people.map((p) => p.handle)), [people]);

    useEffect(() => {
        if (!on || done.current) return;
        done.current = true;
        let alive = true;
        /* Local midnight of each of the last 30 days, oldest first. */
        const base: DayCell[] = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            base.push({
                key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
                label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase(),
                count: 0,
                handles: [],
            });
        }
        const index = new Map(base.map((c, i) => [c.key, i]));

        fetch('/api/feed?limit=300', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive) return;
                if (Array.isArray(j?.events)) {
                    for (const e of j.events as Array<{
                        from_handle?: string | null; to_handle?: string | null; timestamp: string;
                    }>) {
                        const ts = Date.parse(e.timestamp);
                        if (!Number.isFinite(ts)) continue;
                        const d = new Date(ts);
                        const slot = index.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
                        if (slot === undefined) continue;
                        for (const raw of [e.to_handle, e.from_handle]) {
                            const h = raw?.toLowerCase().replace(/^@/, '');
                            if (!h || !circle.has(h)) continue;
                            base[slot]!.count += 1;
                            if (!base[slot]!.handles.includes(h)) base[slot]!.handles.push(h);
                        }
                    }
                }
                setDays(base);
            })
            .catch(() => { if (alive) setDays(base); });
        return () => { alive = false; };
    }, [on, circle]);

    return days;
}

/* ── THE 30 DAYS ─────────────────────────────────────────────────────────
   One cell per day, oldest left, today right, inked by how much your circle
   moved that day. Tap a day → the ledger narrows to who moved. Day buckets
   are the VIEWER's local days (§9). ── */
function ThirtyDays({ people, onFocus }: { people: PreviewPerson[]; onFocus: (f: PreviewFocus) => void }) {
    const days = useThirtyDayBuckets(people, true);

    if (days === null) return <div className="fi-pv-note fm-loading">Reading the last 30 days…</div>;

    const peak = Math.max(1, ...days.map((d) => d.count));
    const moves = days.reduce((n, d) => n + d.count, 0);

    return (
        <div className="fi-days">
            <div className="fi-days-head">
                <span className="fi-days-title">{`◷${VS15}`} LAST 30 DAYS</span>
                <span className="fi-days-total">{moves} MOVES</span>
            </div>
            <div className="fi-days-grid">
                {days.map((d) => {
                    const go = () => {
                        if (d.handles.length === 0) return;
                        onFocus({ handles: d.handles, label: d.label, glyph: '◷' });
                    };
                    /* Ink, never fade — an empty day is an outlined cell, a busy
                       one is solid. No half-opacity chrome (Rule #2). */
                    const ink = d.count === 0 ? 0 : 0.35 + 0.65 * (d.count / peak);
                    return (
                        <span
                            key={d.key}
                            className={`fi-day${d.count > 0 ? ' live' : ''}`}
                            role="button"
                            tabIndex={0}
                            title={`${d.label} — ${d.count} ${d.count === 1 ? 'move' : 'moves'}`}
                            style={ink ? { background: `color-mix(in srgb, var(--text-color) ${Math.round(ink * 100)}%, transparent)` } : undefined}
                            onClick={go}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}
                        />
                    );
                })}
            </div>
            <div className="fi-days-foot">
                <span>{days[0]!.label}</span>
                <span>TODAY</span>
            </div>
        </div>
    );
}

/* ── THE STREAK ──────────────────────────────────────────────────────────
   Who's moved the most consecutive days inside the last 30, current streak
   leading (a run still going beats a longer one that died). Ties break on
   the best run anywhere in the window, then @name. Same row shape as
   OVERLAP: sprite + name + bar (current streak, out of 30) + count. ── */
function Streak({ people, onInspect }: { people: PreviewPerson[]; onInspect: (h: string) => void }) {
    const days = useThirtyDayBuckets(people, true);

    const rows = useMemo(() => {
        if (!days) return null;
        const active = new Map<string, boolean[]>();
        for (const p of people) active.set(p.handle, new Array(days.length).fill(false));
        days.forEach((d, i) => {
            for (const h of d.handles) {
                const arr = active.get(h);
                if (arr) arr[i] = true;
            }
        });
        return people
            .map((p) => {
                const arr = active.get(p.handle) ?? [];
                let current = 0;
                for (let i = arr.length - 1; i >= 0 && arr[i]; i--) current++;
                let best = 0; let run = 0;
                for (const v of arr) { run = v ? run + 1 : 0; if (run > best) best = run; }
                return { handle: p.handle, current, best, stat: p.stat };
            })
            .filter((r) => r.best > 0)
            .sort((a, b) => b.current - a.current || b.best - a.best || a.handle.localeCompare(b.handle));
    }, [days, people]);

    if (rows === null) return <div className="fi-pv-note fm-loading">Reading the last 30 days…</div>;
    if (rows.length === 0) {
        return <div className="fi-pv-note">A couple active days in a row from someone in your circle shows here.</div>;
    }

    return (
        <div className="fi-overlap">
            {rows.map((r) => (
                <div
                    key={r.handle}
                    className="fi-ov-row live"
                    role="button"
                    tabIndex={0}
                    title={r.best > r.current ? `@${r.handle} — ${r.current}-day streak (${r.best} best in the last 30)` : `@${r.handle} — ${r.current}-day streak`}
                    onClick={() => onInspect(r.handle)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(r.handle); } }}
                >
                    <PreviewSprite handle={r.handle} color={r.stat?.profileHex ?? undefined} />
                    <span className="fi-ov-name">@{r.handle}</span>
                    <span className="fi-ov-bar" aria-hidden="true">
                        <span className="fi-ov-fill" style={{ width: `${Math.round((r.current / 30) * 100)}%` }} />
                    </span>
                    <span className="fi-ov-count">{r.current}<span className="fi-ov-of">d</span></span>
                </div>
            ))}
        </div>
    );
}

/* ── THE SPEND ────────────────────────────────────────────────────────────
   Your circle ranked by ETH spent, biggest first. Same row shape as
   OVERLAP/STREAK: sprite + name + bar (share of the top spender) + the ETH
   amount, same .toFixed(2) the dossier's own Spent tile uses. ── */
function Spend({ people, onInspect }: { people: PreviewPerson[]; onInspect: (h: string) => void }) {
    const rows = useMemo(() => people
        .filter((p) => (p.stat?.spentEth ?? 0) > 0)
        .sort((a, b) => (b.stat!.spentEth - a.stat!.spentEth) || a.handle.localeCompare(b.handle)),
    [people]);

    if (rows.length === 0) {
        return <div className="fi-pv-note">Once someone in your circle spends ETH, they&apos;ll rank here.</div>;
    }

    const top = Math.max(...rows.map((p) => p.stat!.spentEth), 0.0001);

    return (
        <div className="fi-overlap">
            {rows.map((p) => (
                <div
                    key={p.handle}
                    className="fi-ov-row live"
                    role="button"
                    tabIndex={0}
                    title={`@${p.handle} — ${p.stat!.spentEth.toFixed(2)} ETH spent`}
                    onClick={() => onInspect(p.handle)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(p.handle); } }}
                >
                    <PreviewSprite handle={p.handle} color={p.stat?.profileHex ?? undefined} />
                    <span className="fi-ov-name">@{p.handle}</span>
                    <span className="fi-ov-bar" aria-hidden="true">
                        <span className="fi-ov-fill" style={{ width: `${Math.round((p.stat!.spentEth / top) * 100)}%` }} />
                    </span>
                    <span className="fi-ov-count">{p.stat!.spentEth.toFixed(2)}<span className="fi-ov-of"> ⟠</span></span>
                </div>
            ))}
        </div>
    );
}

