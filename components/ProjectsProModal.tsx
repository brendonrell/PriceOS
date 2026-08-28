'use client';

/*
 * PROJECTS PRO — the Friend Inspector, for Projects (Brendon, 2026-07-30).
 *
 * Was a flat alphabetical list. Now it is the same instrument the circle gets,
 * pointed at the catalog, built from the Inspector's OWN vocabulary (Rule #0)
 * — the same chrome, the same tab pills, the same sort/lens chips, the same
 * star, the same tap-to-unfold dossier and the same Attributes tiles:
 *
 *   TABS    ALL · HELD (you own a piece) · STARRED · MINTING (live), each
 *           with its permanent count.
 *   SORT    A–Z · NEWEST · SIZE · MINTED.
 *   LENS    LEDGER (the plain read) · MINE (your position) · PULSE (the
 *           project's last move + how long ago). A lens ANNOTATES and
 *           RE-ORDERS — it never hides a project.
 *   DOSSIER tap a row → mint progress, outputs, price, upload day, the ⟁
 *           cartel read and whether you're in it.
 *   STRIP   PROJECTS PRO+ carries the Inspector's preview strip, project-side:
 *           ROSTER (every project as its sprite, held ones ringed) and
 *           30 DAYS (what moved, by day). Same floating-chip nav.
 *
 * Data: the registry + /api/home (one read for every project's minted/supply/
 * upload), /api/user/{me}/owned-projects, /api/feed, and the per-project
 * cartel read on unfold. No new endpoints.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useAuth } from '../lib/state/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import { allProjects } from '../lib/project/registry';
import { projectSpriteFace } from '../lib/project/projectSprite';
import { getProjectStars, toggleProjectStar, subscribeProjectStars } from '../lib/pins/projectStarStore';
import { useUserTags, type UserTagSet } from '../lib/hooks/useUserTags';
import { UserTags } from './tags/UserTags';
import { PROFILE_LOGOS_BY_ID } from '../lib/profile/profileLogos';
import { StickerArt } from './stickers/StickerArt';
import type { Sticker } from '../lib/stickers/catalog';
import type { CircleStat } from '../app/api/social/circle-stats/route';
import SpriteFace from './SpriteFace';
import { useLongPress } from '../lib/hooks/useLongPress';
import { DISCORD_URL } from '../lib/config/discord';

const VS15 = '︎';
/* HOLD a preview chip → pins it to the front of the sequence (Brendon,
   2026-08-20). Same hidden feature + grail glyph as the Friend Inspector's
   own preview strip — see FriendInspectorPreview.tsx. */
const PREVIEW_PIN_KEY = 'pd_pp_preview_pin';
const PIN_GLYPH = '⟟';

type ProTab = 'all' | 'held' | 'starred' | 'minting';
type ProSort = 'az' | 'newest' | 'size' | 'minted';
type ProLens = 'ledger' | 'mine' | 'pulse';
type ProPreview = 'roster' | 'days';

const TABS: { key: ProTab; label: string; icon: string }[] = [
    { key: 'all', label: 'ALL', icon: '⬚' },
    { key: 'held', label: 'HELD', icon: '◨' },
    { key: 'starred', label: 'STARRED', icon: '★' },
    { key: 'minting', label: 'MINTING', icon: '✦' },
];

const SORTS: { key: ProSort; label: string }[] = [
    { key: 'az', label: 'A–Z' },
    { key: 'newest', label: 'Newest' },
    { key: 'size', label: 'Size' },
    { key: 'minted', label: 'Minted' },
];

const LENSES: { key: ProLens; label: string }[] = [
    { key: 'ledger', label: 'LEDGER' },
    { key: 'mine', label: 'MINE' },
    { key: 'pulse', label: 'PULSE' },
];

const LENS_KEY = 'pd_pp_lens';
const PREVIEW_KEY = 'pd_pp_preview';

const EMPTY_LINE: Record<ProTab, string> = {
    all: 'No projects yet.',
    held: 'Nothing collected yet — mint a piece and it lands here.',
    starred: 'Star a project and it pins here.',
    minting: 'Nothing minting right now.',
};

/** Live per-project state, keyed by slug — one read of the home surface. */
interface LiveRow { minted: number; supply: number; uploadedAt: number | null }

/** The project's last on-ledger move (PULSE's raw material). */
interface LastMove { verb: string; piece: string; ts: number; glyph: string }

const MOVE_GLYPH: Record<string, string> = { MINT: '✦', SALE: '✦', LIST: '✹', XFER: '✸' };
const MOVE_VERB: Record<string, string> = { MINT: 'minted', SALE: 'sold', LIST: 'listed', XFER: 'moved' };

/* A faction IS a blank-bubble profile logo — the same read the Friend
   Inspector does, off the one shared logo table. */
function factionOf(profileLogo: string | null | undefined): Sticker | null {
    if (!profileLogo || !profileLogo.startsWith('plogo-blank-')) return null;
    return PROFILE_LOGOS_BY_ID.get(profileLogo) ?? null;
}

/** What the catalog is narrowed to — one pick at a time, tap again to clear. */
interface ProFilter { kind: 'faction' | 'tag'; id: string; label: string }

/** Viewer-relative age — clock times are always viewer-local (§9). */
function fmtAgo(ts: number): string {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function ProjectsProModal() {
    const { close, closeAll } = useModal();
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const router = useRouter();
    const { isOpen, isTopStacked } = useModalLayer('projectsPro');
    const [full, setFull] = useState(false);

    const [tab, setTabState] = useState<ProTab>('all');
    const [sort, setSort] = useState<ProSort>('az');
    const [lens, setLensState] = useState<ProLens>('ledger');
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LENS_KEY);
            if (saved === 'mine' || saved === 'pulse' || saved === 'ledger') setLensState(saved);
        } catch { /* first visit */ }
    }, []);
    const setLens = useCallback((l: ProLens) => {
        setLensState(l);
        try { localStorage.setItem(LENS_KEY, l); } catch { /* device-local nicety */ }
        showToast(`Lens: ${l.toUpperCase()}`);
    }, [showToast]);

    /* One project open at a time; resets with the tab and every open. */
    const [inspected, setInspected] = useState<string | null>(null);
    const setTab = useCallback((t: ProTab) => { setTabState(t); setInspected(null); }, []);

    // Reset to compact on every open (matches the Friend Inspector).
    useEffect(() => {
        if (!isOpen) { setFull(false); return; }
        setTabState('all');
        setSort('az');
        setInspected(null);
    }, [isOpen]);

    /* Lock the page only in PLUS (full) mode; compact floats and lets the
       page scroll behind it (Brendon, 2026-07-14). */
    useEffect(() => {
        if (!isOpen || !full) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen, full]);

    // Esc: step out of PLUS first, then close.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (full) setFull(false); else close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, full, close]);

    /* Stars — the SAME DB-backed set the Artists list, the project pages and
       the Friend Inspector use, so a star here shows everywhere. */
    const [starred, setStarred] = useState<Set<string>>(() => new Set(getProjectStars().map((s) => s.toLowerCase())));
    useEffect(() => subscribeProjectStars((slugs) => setStarred(new Set(slugs.map((s) => s.toLowerCase())))), []);
    const onStar = useCallback((slug: string) => {
        const r = toggleProjectStar(slug);
        showToast(`Starred: ${r === 'starred' ? 'ADDED' : 'REMOVED'}`);
    }, [showToast]);

    /* Live mint state for every project — one read of the home surface. */
    const [live, setLive] = useState<Record<string, LiveRow> | null>(null);
    useEffect(() => {
        if (!isOpen || live) return;
        let alive = true;
        fetch('/api/home', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive || !j) return;
                const map: Record<string, LiveRow> = {};
                for (const row of [...(j.uploads ?? []), ...(j.minting_now ?? [])] as Array<{
                    slug: string; minted_count: number; max_supply: number; uploaded_at: number | null;
                }>) {
                    map[row.slug.toLowerCase()] = {
                        minted: row.minted_count ?? 0,
                        supply: row.max_supply ?? 0,
                        uploadedAt: row.uploaded_at ?? null,
                    };
                }
                setLive(map);
            })
            .catch(() => { if (alive) setLive({}); });
        return () => { alive = false; };
    }, [isOpen, live]);

    /* Your holdings — which projects you're actually in. */
    const [mySlugs, setMySlugs] = useState<string[] | null>(null);
    useEffect(() => {
        if (!isOpen || !siweAddress) { setMySlugs(null); return; }
        let alive = true;
        fetch(`/api/user/${siweAddress}/owned-projects`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (alive && Array.isArray(j?.slugs)) setMySlugs(j.slugs as string[]); })
            .catch(() => { /* HELD simply reads empty */ });
        return () => { alive = false; };
    }, [isOpen, siweAddress]);
    const mine = useMemo(() => new Set((mySlugs ?? []).map((s) => s.toLowerCase())), [mySlugs]);

    /* PULSE's raw material + the 30 DAYS grid — the live feed, read once per
       open when either first asks for it. */
    const [feed, setFeed] = useState<Array<{ slug: string; type: string; piece: string; ts: number }> | null>(null);
    const wantsFeed = isOpen && (lens === 'pulse' || full);
    useEffect(() => {
        if (!wantsFeed || feed) return;
        let alive = true;
        fetch('/api/feed?limit=300', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive) return;
                const out: Array<{ slug: string; type: string; piece: string; ts: number }> = [];
                if (Array.isArray(j?.events)) {
                    for (const e of j.events as Array<{
                        type: string; project_id: string; token_id: string | null; timestamp: string;
                    }>) {
                        const ts = Date.parse(e.timestamp);
                        if (!Number.isFinite(ts) || !e.project_id) continue;
                        out.push({
                            slug: e.project_id.toLowerCase(),
                            type: e.type,
                            piece: e.token_id ? `#${e.token_id.split('-').pop()}` : '',
                            ts,
                        });
                    }
                }
                setFeed(out);
            })
            .catch(() => { if (alive) setFeed([]); });
        return () => { alive = false; };
    }, [wantsFeed, feed]);

    /* Newest event per project wins; quiet projects carry no line. */
    const lastMove = useMemo(() => {
        if (!feed) return null;
        const map: Record<string, LastMove> = {};
        for (const e of feed) {
            if (map[e.slug] && map[e.slug]!.ts >= e.ts) continue;
            map[e.slug] = {
                verb: MOVE_VERB[e.type] ?? 'moved',
                piece: e.piece,
                ts: e.ts,
                glyph: MOVE_GLYPH[e.type] ?? '✸',
            };
        }
        return map;
    }, [feed]);

    const projects = useMemo(() => [...allProjects()], []);
    const liveOf = useCallback((slug: string) => live?.[slug.toLowerCase()] ?? null, [live]);

    /* ── THE CREATORS' COLOURS (Brendon, 2026-07-30) ──────────────────────
       A Project inherits its maker's identity, so the creator's profile tags
       ride each row and BOTH tags and factions are offered as filters. Two
       batched reads, no new endpoints: the artist roster for handle→wallet,
       then the same circle-stats call the Inspector uses for the bubble. */
    const artists = useMemo(
        () => [...new Set(projects.map((p) => p.artistHandle.toLowerCase()))],
        [projects],
    );
    const artistTags = useUserTags(isOpen ? artists : []);
    const [artistStat, setArtistStat] = useState<Record<string, CircleStat>>({});
    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        (async () => {
            try {
                const roster = await fetch('/api/artists', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
                const rows: Array<{ handle: string | null; address: string }> = roster?.artists ?? [];
                const want = new Set(artists);
                const byHandle: Record<string, string> = {};
                for (const r of rows) {
                    const h = r.handle?.toLowerCase();
                    if (h && want.has(h)) byHandle[h] = r.address.toLowerCase();
                }
                const addrs = [...new Set(Object.values(byHandle))];
                if (addrs.length === 0 || !alive) return;
                const s = await fetch(`/api/social/circle-stats?addresses=${addrs.join(',')}`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null));
                const byAddr: Record<string, CircleStat> = s?.stats ?? {};
                if (!alive) return;
                const out: Record<string, CircleStat> = {};
                for (const [h, a] of Object.entries(byHandle)) {
                    const stat = byAddr[a];
                    if (stat) out[h] = stat;
                }
                setArtistStat(out);
            } catch { /* rows simply carry no faction */ }
        })();
        return () => { alive = false; };
    }, [isOpen, artists]);

    const factionFor = useCallback(
        (artist: string) => factionOf(artistStat[artist.toLowerCase()]?.profileLogo),
        [artistStat],
    );

    /* One filter at a time — a faction or a profile tag. */
    const [filter, setFilter] = useState<ProFilter | null>(null);
    useEffect(() => { if (!isOpen) setFilter(null); }, [isOpen]);
    const flip = useCallback((f: ProFilter) => {
        setFilter((cur) => (cur && cur.kind === f.kind && cur.id === f.id ? null : f));
        setInspected(null);
    }, []);

    /* Only the factions and tags actually WORN by a creator in the catalog get
       a chip — an empty filter is noise. */
    const factionChips = useMemo(() => {
        const out = new Map<string, Sticker>();
        for (const p of projects) {
            const f = factionFor(p.artistHandle);
            if (f) out.set(f.id, f);
        }
        return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [projects, factionFor]);

    const tagChips = useMemo(() => {
        const out = new Map<string, { id: string; label: string; color: string; textColor?: string }>();
        for (const p of projects) {
            for (const t of artistTags[p.artistHandle.toLowerCase()]?.tags ?? []) {
                if (!out.has(t.id)) out.set(t.id, { id: t.id, label: t.label, color: t.color, textColor: t.textColor });
            }
        }
        return [...out.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, [projects, artistTags]);

    /* The counts follow the active faction / tag pick, so a tab never promises
       rows the filter has already taken away. */
    const counted = useMemo(() => projects.filter((p) => {
        if (!filter) return true;
        if (filter.kind === 'faction') return factionFor(p.artistHandle)?.id === filter.id;
        return (artistTags[p.artistHandle.toLowerCase()]?.tags ?? []).some((t) => t.id === filter.id);
    }), [projects, filter, factionFor, artistTags]);

    const counts = useMemo(() => ({
        all: counted.length,
        held: counted.filter((p) => mine.has(p.slug.toLowerCase())).length,
        starred: counted.filter((p) => starred.has(p.slug.toLowerCase())).length,
        minting: counted.filter((p) => {
            const l = liveOf(p.slug);
            return !!l && l.minted > 0 && l.minted < (l.supply || p.outputs);
        }).length,
    }), [counted, mine, starred, liveOf]);

    /* The ordered rows for the active tab. Starred pin to the top
       (alphabetised); the rest follow the chosen sort. */
    const rows = useMemo(() => {
        const inTab = projects.filter((p) => {
            const s = p.slug.toLowerCase();
            /* A faction / tag pick narrows every tab — it reads off the
               project's CREATOR. */
            if (filter) {
                if (filter.kind === 'faction') {
                    if (factionFor(p.artistHandle)?.id !== filter.id) return false;
                } else if (!(artistTags[p.artistHandle.toLowerCase()]?.tags ?? []).some((t) => t.id === filter.id)) {
                    return false;
                }
            }
            if (tab === 'held') return mine.has(s);
            if (tab === 'starred') return starred.has(s);
            if (tab === 'minting') {
                const l = liveOf(p.slug);
                return !!l && l.minted > 0 && l.minted < (l.supply || p.outputs);
            }
            return true;
        });
        const alpha = (a: typeof inTab[number], b: typeof inTab[number]) =>
            a.displayName.localeCompare(b.displayName);
        const sortRest = (arr: typeof inTab) => {
            if (sort === 'newest') {
                return arr.sort((a, b) =>
                    (liveOf(b.slug)?.uploadedAt ?? 0) - (liveOf(a.slug)?.uploadedAt ?? 0) || alpha(a, b));
            }
            if (sort === 'size') return arr.sort((a, b) => b.outputs - a.outputs || alpha(a, b));
            if (sort === 'minted') {
                return arr.sort((a, b) => (liveOf(b.slug)?.minted ?? 0) - (liveOf(a.slug)?.minted ?? 0) || alpha(a, b));
            }
            return arr.sort(alpha);
        };
        const pinned = inTab.filter((p) => starred.has(p.slug.toLowerCase())).sort(alpha);
        let rest = sortRest(inTab.filter((p) => !starred.has(p.slug.toLowerCase())));
        /* An active lens owns the order: MINE floats what you're in;
           PULSE floats what moved most recently. */
        if (lens === 'mine') {
            rest = [...rest].sort((a, b) =>
                Number(mine.has(b.slug.toLowerCase())) - Number(mine.has(a.slug.toLowerCase())) || alpha(a, b));
        } else if (lens === 'pulse' && lastMove) {
            rest = [...rest].sort((a, b) =>
                (lastMove[b.slug.toLowerCase()]?.ts ?? 0) - (lastMove[a.slug.toLowerCase()]?.ts ?? 0) || alpha(a, b));
        }
        return [...pinned, ...rest];
    }, [projects, tab, sort, lens, mine, starred, liveOf, lastMove, filter, factionFor, artistTags]);

    const lensLineOf = useCallback((slug: string): string | null => {
        const s = slug.toLowerCase();
        if (lens === 'mine') {
            return mine.has(s) ? 'You hold a piece of this one.' : 'Not in your collection.';
        }
        if (lens === 'pulse') {
            const m = lastMove?.[s];
            if (!lastMove) return 'Reading the ledger…';
            return m ? `${m.glyph}${VS15} ${m.piece} ${m.verb} · ${fmtAgo(m.ts)}` : 'Quiet — no recent moves.';
        }
        return null;
    }, [lens, mine, lastMove]);

    const go = useCallback((slug: string) => { router.push(`/art/${slug}`); closeAll(); }, [router, closeAll]);

    if (!isOpen || typeof document === 'undefined') return null;

    const title = (words: string) => (
        <span className="ambient-pop-title-text">
            <span className="smgr-title-ic">{`⬚${VS15}`}</span>{' '}<span className="smgr-title-words">{words}</span>
        </span>
    );

    const body = (
        <>
            <div className="fm-tabs" role="tablist" aria-label="Projects">
                {TABS.map((t) => (
                    <div
                        key={t.key}
                        className={`pill pill-l2${tab === t.key ? ' active' : ''}`}
                        role="tab"
                        aria-selected={tab === t.key}
                        tabIndex={0}
                        onClick={() => setTab(t.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(t.key); } }}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="fm-icon">{t.icon}{VS15}</span>{' '}{t.label}
                        <span className="fm-count">{counts[t.key]}</span>
                    </div>
                ))}
            </div>

            <div className="fm-sort-rows" role="group" aria-label="Sort and lens">
                <div className="fm-sort-row fm-lens-row">
                    <span className="fm-sort-label">LENS</span>
                    {LENSES.map((l) => (
                        <button
                            key={l.key}
                            type="button"
                            className={`ambient-chip fm-sort-chip fm-lens-chip${lens === l.key ? ' on' : ''}`}
                            onClick={() => setLens(l.key)}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
                <div className="fm-sort-row">
                    <span className="fm-sort-label">SORT</span>
                    {SORTS.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            className={`ambient-chip fm-sort-chip${sort === s.key ? ' on' : ''}`}
                            onClick={() => setSort(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* THE CREATORS' COLOURS — every faction and profile tag worn by a
                creator in the catalog, as filters. One pick at a time; tapping
                the lit one clears it. */}
            {(factionChips.length > 0 || tagChips.length > 0) && (
                <div className="fm-sort pp-filters" role="group" aria-label="Filter by faction or tag">
                    {factionChips.length > 0 && <span className="fm-sort-label">FACTION</span>}
                    {factionChips.map((f) => {
                        const on = filter?.kind === 'faction' && filter.id === f.id;
                        const label = f.name.replace('Bubble — ', '').toUpperCase();
                        return (
                            <button
                                key={f.id}
                                type="button"
                                className={`ambient-chip fm-sort-chip pp-faction-chip${on ? ' on' : ''}`}
                                onClick={() => flip({ kind: 'faction', id: f.id, label })}
                                title={label}
                            >
                                <StickerArt sticker={f} size={12} /> {label}
                            </button>
                        );
                    })}
                    {tagChips.length > 0 && <span className="fm-sort-label fm-lens-label">TAG</span>}
                    {tagChips.map((t) => {
                        const on = filter?.kind === 'tag' && filter.id === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                className={`ambient-chip fm-sort-chip pp-tag-chip${on ? ' on' : ''}`}
                                style={on ? { background: t.color, borderColor: t.color, color: t.textColor ?? undefined } : { borderColor: t.color }}
                                onClick={() => flip({ kind: 'tag', id: t.id, label: t.label })}
                                title={t.label}
                            >
                                {t.label.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="fm-list">
                {rows.length === 0 ? (
                    <div className="fm-empty">{EMPTY_LINE[tab]}</div>
                ) : rows.map((p) => (
                    <ProjectProRow
                        key={p.slug}
                        slug={p.slug}
                        name={p.displayName}
                        artist={p.artistHandle}
                        outputs={p.outputs}
                        priceEth={p.mintPriceEth}
                        live={liveOf(p.slug)}
                        held={mine.has(p.slug.toLowerCase())}
                        starred={starred.has(p.slug.toLowerCase())}
                        onStar={onStar}
                        inspected={inspected === p.slug.toLowerCase()}
                        onInspect={() => setInspected((cur) => (cur === p.slug.toLowerCase() ? null : p.slug.toLowerCase()))}
                        lensLine={lensLineOf(p.slug)}
                        lastMove={lastMove?.[p.slug.toLowerCase()] ?? null}
                        onOpen={() => go(p.slug)}
                        me={siweAddress ?? null}
                        tagSet={artistTags[p.artistHandle.toLowerCase()]}
                    />
                ))}
            </div>
        </>
    );

    // ── PROJECTS PRO+ — full jumbo panel ──
    if (full) {
        return createPortal(
            <div className="sticker-mgr-plus-backdrop" data-stack-top={isTopStacked || undefined} role="dialog" aria-modal="true" aria-label="Projects Pro" onClick={close}>
                <div className="sticker-mgr-plus followers-plus projects-pro-plus" onClick={(e) => e.stopPropagation()}>
                    <div className="smgr-plus-head">
                        {title('PROJECTS PRO+')}
                        <button className="smgr-store" type="button" onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')} title="Go To Discord">
                            GO TO DISCORD
                        </button>
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Projects Pro: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
                            {`↓${VS15}`}
                        </button>
                        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                            {`×${VS15}`}
                        </span>
                    </div>
                    <div className="followers-plus-preview">
                        <ProjectsPreview
                            projects={projects.map((p) => ({ slug: p.slug, name: p.displayName }))}
                            held={mine}
                            feed={feed}
                            inspected={inspected}
                            onInspect={(slug) => { setTabState('all'); setInspected(slug); }}
                        />
                    </div>
                    <div className="followers-plus-body">
                        {body}
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    // ── PROJECTS PRO — compact floating popup ──
    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" data-stack-top={isTopStacked || undefined} role="dialog" aria-modal="true" aria-label="Projects Pro" onClick={close}>
            <div className="ambient-pop followers-pop projects-pro-pop" role="dialog" aria-label="Projects Pro" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    {title('PROJECTS PRO')}
                    <button className="smgr-store" type="button" onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')} title="Go To Discord">
                        GO TO DISCORD
                    </button>
                    <button className="smgr-expand" type="button" onClick={() => { setFull(true); showToast('Projects Pro: PLUS'); }} title="Open Projects Pro+" aria-label="Open Projects Pro+">
                        {`↑${VS15}`}
                    </button>
                </div>
                <div className="followers-pop-body">
                    {body}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* ── ONE PROJECT ROW — the Inspector's row treatment: ★ · sprite · title ·
   @artist on top, the reads underneath, the lens line last. Tapping the row
   (not the star, not the title link) unfolds the dossier. ── */
function ProjectProRow({
    slug, name, artist, outputs, priceEth, live, held, starred, onStar,
    inspected, onInspect, lensLine, lastMove, onOpen, me, tagSet,
}: {
    slug: string; name: string; artist: string; outputs: number; priceEth: number;
    live: LiveRow | null; held: boolean; starred: boolean; onStar: (slug: string) => void;
    inspected: boolean; onInspect: () => void; lensLine: string | null;
    lastMove: LastMove | null; onOpen: () => void; me: string | null;
    /** The creator's profile tags. ⛔ FACTIONS ARE A FILTER ONLY — they are
     *  NOT drawn on a row (Brendon, 2026-07-30: "not everyone will give two
     *  fucks about factions, it's an option to filter"). */
    tagSet: UserTagSet | undefined;
}) {
    const face = projectSpriteFace(slug);
    const minted = live?.minted ?? 0;
    const supply = live?.supply || outputs;

    return (
        <div className={`fi-row${inspected ? ' open' : ''}`}>
            <div
                className="fi-line"
                role="button"
                tabIndex={0}
                onClick={onInspect}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(); } }}
            >
                <button
                    type="button"
                    className={`fm-star${starred ? ' on' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onStar(slug); }}
                    title={starred ? 'Unstar' : 'Star this project'}
                    aria-pressed={starred}
                >
                    {starred ? `★${VS15}` : `☆${VS15}`}
                </button>
                <span className="projects-pro-row fi-projrow">
                    <span className="fm-row-main">
                        <span className="fm-row-id">
                            {face && <SpriteFace className="collected-sprite" face={face} />}
                            <a
                                className="projects-pro-name"
                                href={`/art/${slug}`}
                                title={name}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(); }}
                            >
                                <span className="ppn-head">{name.slice(0, -6)}</span>
                                <span className="ppn-tail">{name.slice(-6)}</span>
                            </a>
                            <span className="projects-pro-artist" title="Creator">@{artist}</span>
                        </span>
                        <span className="fm-row-stats">
                            <span className="fm-stat" title="Minted">
                                <span className="fm-stat-ic">{`⬚${VS15}`}</span>
                                <b>{minted}{supply ? `/${supply}` : ''}</b>
                            </span>
                            <span className="fm-stat" title="Mint price">
                                <span className="fm-stat-ic">{`⟠${VS15}`}</span>
                                <b>{priceEth.toFixed(2)}</b>
                            </span>
                            {held && (
                                <span className="fm-stat" title="You hold a piece">
                                    <span className="fm-stat-ic">{`◨${VS15}`}</span>
                                    <b>HELD</b>
                                </span>
                            )}
                        </span>
                    </span>
                </span>
            </div>
            {/* The creator's profile tags ride under the row, exactly as they do
                on a person's row elsewhere. */}
            {tagSet && <UserTags set={tagSet} size="mini" />}
            {lensLine && <div className="fi-lens-line">{lensLine}</div>}
            {inspected && (
                <ProjectDossier
                    slug={slug} name={name} artist={artist} outputs={outputs} priceEth={priceEth}
                    live={live} held={held} lastMove={lastMove} me={me} onOpen={onOpen}
                />
            )}
        </div>
    );
}

/* ── THE DOSSIER — what a tapped project unfolds into, in the Attributes
   vocabulary the friend dossier already uses: one tile per read. ── */
function ProjectDossier({
    slug, name, artist, outputs, priceEth, live, held, lastMove, me, onOpen,
}: {
    slug: string; name: string; artist: string; outputs: number; priceEth: number;
    live: LiveRow | null; held: boolean; lastMove: LastMove | null; me: string | null;
    onOpen: () => void;
}) {
    const [cartel, setCartel] = useState<number | null>(null);
    useEffect(() => {
        if (!me) { setCartel(0); return; }
        let alive = true;
        fetch(`/api/project/${encodeURIComponent(slug)}/cartel?me=${me}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive) setCartel(typeof d?.count === 'number' ? d.count : 0); })
            .catch(() => { if (alive) setCartel(0); });
        return () => { alive = false; };
    }, [slug, me]);

    const supply = live?.supply || outputs;
    const minted = live?.minted ?? 0;
    const pct = supply > 0 ? Math.min(1, minted / supply) : 0;
    const soldOut = supply > 0 && minted >= supply;
    const born = live?.uploadedAt
        ? new Date(live.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
        : '—';

    return (
        <div className="fi-dossier" onClick={(e) => e.stopPropagation()}>
            <div className="fi-dossier-head">
                <span className="fm-tag">{`⬚${VS15}`} {soldOut ? 'SOLD OUT' : minted > 0 ? 'MINTING' : 'UPLOADED'}</span>
                {held && <span className="fm-tag">{`◨${VS15}`} IN YOUR COLLECTION</span>}
                {lastMove && <span className="fm-tag">{lastMove.glyph}{VS15} {lastMove.verb.toUpperCase()} {fmtAgo(lastMove.ts)}</span>}
                <button type="button" className="ambient-chip fi-follow" onClick={onOpen} title={`Open ${name}`}>
                    OPEN
                </button>
            </div>

            {/* Mint progress — the one read that has to be instant. */}
            <div className="pp-progress">
                <span className="pp-progress-label">MINTED</span>
                <span className="pp-progress-track" aria-hidden="true">
                    <span className="pp-progress-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
                </span>
                <span className="pp-progress-num">{minted}/{supply}</span>
            </div>

            <div className="attr-grid fi-duel">
                <span className="attr-tile">
                    <span className="attr-tile-label">{`⬚${VS15}`} Outputs</span>
                    <span className="attr-tile-value">{supply}</span>
                    <span className="attr-tile-sub">TOTAL SUPPLY</span>
                </span>
                <span className="attr-tile">
                    <span className="attr-tile-label">{`⟠${VS15}`} Mint Price</span>
                    <span className="attr-tile-value">{priceEth.toFixed(2)}</span>
                    <span className="attr-tile-sub">PRIMARY</span>
                </span>
                <span className={`attr-tile${(cartel ?? 0) > 0 ? ' rare' : ''}`}>
                    <span className="attr-tile-label">{`⟁${VS15}`} Cartel</span>
                    <span className="attr-tile-value">{cartel === null ? '—' : cartel}</span>
                    <span className="attr-tile-sub">MUTUALS WHO HOLD</span>
                </span>
                <span className="attr-tile">
                    <span className="attr-tile-label">{`✺${VS15}`} Uploaded</span>
                    <span className="attr-tile-value pp-tile-date">{born}</span>
                    <span className="attr-tile-sub">BY @{artist.toUpperCase()}</span>
                </span>
            </div>
        </div>
    );
}

/* ── THE PREVIEW STRIP, project-side. Same floating-chip nav as the Friend
   Inspector's: ROSTER (every project as its sprite, the ones you hold ringed)
   and 30 DAYS (what moved, by viewer-local day). ── */
function ProjectsPreview({
    projects, held, feed, inspected, onInspect,
}: {
    projects: { slug: string; name: string }[];
    held: Set<string>;
    feed: Array<{ slug: string; type: string; piece: string; ts: number }> | null;
    inspected: string | null;
    onInspect: (slug: string) => void;
}) {
    /* 30 DAYS is the default read here — projects live and die by pace, so
       the pace grid leads (Brendon, 2026-08-19). */
    const [mode, setMode] = useState<ProPreview>('days');
    useEffect(() => {
        try { if (localStorage.getItem(PREVIEW_KEY) === 'roster') setMode('roster'); } catch { /* first visit */ }
    }, []);
    const pick = (m: ProPreview) => {
        setMode(m);
        try { localStorage.setItem(PREVIEW_KEY, m); } catch { /* device-local nicety */ }
    };

    const [pinned, setPinned] = useState<ProPreview | null>(null);
    useEffect(() => {
        try {
            const saved = localStorage.getItem(PREVIEW_PIN_KEY);
            if (saved === 'roster' || saved === 'days') setPinned(saved);
        } catch { /* first visit */ }
    }, []);
    const { showToast } = useToast();
    const togglePin = useCallback((m: ProPreview) => {
        setPinned((prev) => {
            const next = prev === m ? null : m;
            try {
                if (next) localStorage.setItem(PREVIEW_PIN_KEY, next);
                else localStorage.removeItem(PREVIEW_PIN_KEY);
            } catch { /* device-local nicety */ }
            showToast(next ? `${m === 'roster' ? 'ROSTER' : '30 DAYS'}: PINNED` : `${m === 'roster' ? 'ROSTER' : '30 DAYS'}: UNPINNED`);
            return next;
        });
    }, [showToast]);
    const order: ProPreview[] = pinned ? [pinned, pinned === 'roster' ? 'days' : 'roster'] : ['days', 'roster'];

    const days = useMemo(() => {
        const base: { key: string; label: string; count: number }[] = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            base.push({
                key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
                label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase(),
                count: 0,
            });
        }
        if (!feed) return null;
        const index = new Map(base.map((c, i) => [c.key, i]));
        for (const e of feed) {
            const d = new Date(e.ts);
            const slot = index.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            if (slot !== undefined) base[slot]!.count += 1;
        }
        return base;
    }, [feed]);

    return (
        <div className="fi-preview">
            <div className="fi-preview-toggle" role="group" aria-label="Preview mode">
                {order.map((m) => (
                    <ProPreviewChip
                        key={m}
                        label={m === 'roster' ? 'ROSTER' : '30 DAYS'}
                        on={mode === m}
                        pinned={pinned === m}
                        onClick={() => pick(m)}
                        onHold={() => togglePin(m)}
                    />
                ))}
            </div>

            {mode === 'roster' ? (
                <div className="fi-roster">
                    {projects.map((p) => (
                        <span
                            key={p.slug}
                            className={`fi-rost-cell${held.has(p.slug.toLowerCase()) ? ' mutual' : ''}${inspected === p.slug.toLowerCase() ? ' on' : ''}`}
                            role="button"
                            tabIndex={0}
                            title={`${p.name}${held.has(p.slug.toLowerCase()) ? ' — you hold a piece' : ''}`}
                            onClick={() => onInspect(p.slug.toLowerCase())}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(p.slug.toLowerCase()); } }}
                        >
                            <SpriteFace className="collected-sprite" face={projectSpriteFace(p.slug)} />
                            <span className="fi-rost-name">{p.name}</span>
                        </span>
                    ))}
                </div>
            ) : days === null ? (
                <div className="fi-pv-note fm-loading">Reading the last 30 days…</div>
            ) : (
                <div className="fi-days">
                    <div className="fi-days-head">
                        <span className="fi-days-title">{`✺${VS15}`} LAST 30 DAYS</span>
                        <span className="fi-days-total">{days.reduce((n, d) => n + d.count, 0)} MOVES</span>
                    </div>
                    <div className="fi-days-grid">
                        {days.map((d) => {
                            const peak = Math.max(1, ...days.map((x) => x.count));
                            const ink = d.count === 0 ? 0 : 0.35 + 0.65 * (d.count / peak);
                            return (
                                <span
                                    key={d.key}
                                    className="fi-day"
                                    title={`${d.label} — ${d.count} ${d.count === 1 ? 'move' : 'moves'}`}
                                    style={ink ? { background: `color-mix(in srgb, var(--text-color) ${Math.round(ink * 100)}%, transparent)` } : undefined}
                                />
                            );
                        })}
                    </div>
                    <div className="fi-days-foot">
                        <span>{days[0]!.label}</span>
                        <span>TODAY</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* A single preview-mode chip. HOLD pins it to the front of the sequence —
   same useLongPress contract as everywhere else in PD, mirrored from
   FriendInspectorPreview's PreviewChip. */
function ProPreviewChip({
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
