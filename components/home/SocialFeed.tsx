'use client';

/*
 * SocialFeed ☻ — the home social activity feed (Brendon, 2026-07-26).
 * "What your friends are doing, in chronological order" — as a MIXED-MEDIA
 * timeline, not a text ledger. The dense market rows are the spine; between
 * them, full-width visual blocks composed from the app's own proven pieces
 * (Rule #0 — the Now Minting carousel track, ArtworkCard under per-card
 * ProjectProviders exactly like the Gen Curated showcase, the stored art
 * images). Four block kinds:
 *
 *   ROW      — one market event (FeedEventRow: long-press star, stacked
 *              date/time, ◊ price rail, ⚭/⚯ relationship marks).
 *   STREAK   — ≥3 consecutive collects by one person in one project collapse
 *              into a single summary row + a mini carousel of those exact
 *              pieces. Density AND art.
 *   SCENE ☻  — ≥3 DIFFERENT people hit the same project the same day → one
 *              block: the names, the project, a carousel of what they took.
 *              The "your circle is converging here" read — the most social
 *              signal the ledger holds.
 *   ALBUM ◰  — a friend shelved an album → its strip rides the feed
 *              (albums are numbered, never named — "album #2 · 8 pieces").
 *   PANORAMA — a collected piece that is genuinely WIDE (aspect ≥ 1.7)
 *              renders full-bleed beneath its row, shown in its entirety.
 *
 * Data: logged in → the viewer's follow graph, mutuals weighted first
 * (server-side); logged out / empty graph → the top collectors by
 * PriceScore. No user options — one optimized feed for everyone.
 */

import { useEffect, useState } from 'react';
import FeedEventRow from '../feed/FeedEventRow';
import ArtworkCard from '../ArtworkCard';
import { GhostFeedRows } from '../GhostFeed';
import { eventToNamedFeedEvent, FEED_ICON } from '../../lib/feed/feedRow';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { getProject, artImageUrl, artProvisionalAspect } from '../../lib/project/registry';
import { useAuth } from '../../lib/state/AuthContext';
import type {
    SocialAlbumRow,
    SocialEventRow,
    SocialFeedResponse,
    SocialRelation,
} from '../../app/api/feed/social/route';

/* ── timeline model ─────────────────────────────────────────────────── */

interface Piece { slug: string; id: number }

interface Actor { name: string; href: string | null; relation: SocialRelation }

type TimelineItem =
    | { kind: 'row'; ts: number; e: SocialEventRow; pano: Piece | null }
    | { kind: 'streak'; ts: number; e0: SocialEventRow; actor: Actor; slug: string;
        type: 'MINT' | 'SALE'; n: number; totalEth: number; pieces: Piece[] }
    | { kind: 'scene'; ts: number; slug: string; actors: Actor[]; pieces: Piece[]; n: number }
    | { kind: 'album'; ts: number; a: SocialAlbumRow };

/* Module-scoped last-response cache, keyed by the query string. The feed
   section unmounts on every tab switch, so without this every return trip
   to Social re-ran the full waterfall from ghost rows — the "forever to
   load" feel (Brendon, 2026-08-19). Same singleton-cache shape as
   useGasData: show the last good page instantly, then quietly refresh. */
const lastResponse = new Map<string, SocialFeedResponse>();

/* Wide enough to earn a full-bleed panorama; cap so a wide-heavy page stays a
   feed, not a gallery. */
const PANO_ASPECT = 1.7;
const PANO_CAP = 6;
const STREAK_MIN = 3;
const SCENE_MIN_ACTORS = 3;
const SCENE_PIECES = 12;

function tsOf(e: SocialEventRow): number {
    return Date.parse(e.timestamp) || 0;
}

function pieceOf(e: SocialEventRow): Piece | null {
    if (!e.token_id) return null;
    const i = e.token_id.lastIndexOf('-');
    if (i < 0) return null;
    const id = Number(e.token_id.slice(i + 1));
    const slug = e.token_id.slice(0, i);
    return Number.isFinite(id) && getProject(slug) ? { slug, id } : null;
}

function actorOf(e: SocialEventRow): Actor {
    const toSide = e.type === 'MINT' || e.type === 'SALE';
    const handle = toSide ? e.to_handle : e.from_handle;
    const addr = toSide ? e.to_address : e.from_address;
    const short = addr ? (addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr) : 'someone';
    return {
        name: handle ? `@${handle}` : short,
        href: handle ? `/${handle}` : addr ? `/${addr}` : null,
        relation: e.relation,
    };
}

/* Actor identity for grouping — handle when claimed, wallet otherwise. */
function actorKey(e: SocialEventRow): string {
    const toSide = e.type === 'MINT' || e.type === 'SALE';
    return ((toSide ? e.to_handle : e.from_handle) ?? (toSide ? e.to_address : e.from_address) ?? '?').toLowerCase();
}

/* Viewer-local day key — SCENE groups by the day the viewer experiences. */
function dayKey(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Compose the newest-first timeline: collapse streaks, gather scenes, flag
 *  panoramas, slot albums in by their shelved moment. */
function composeTimeline(events: SocialEventRow[], albums: SocialAlbumRow[]): TimelineItem[] {
    const items: TimelineItem[] = [];
    const rows: SocialEventRow[] = [];

    /* Pass 1 — STREAKS: consecutive same-actor same-project collects. */
    let i = 0;
    while (i < events.length) {
        const e = events[i];
        const collect = e.type === 'MINT' || e.type === 'SALE';
        if (collect && pieceOf(e)) {
            let j = i + 1;
            while (
                j < events.length &&
                events[j].type === e.type &&
                events[j].project_id === e.project_id &&
                actorKey(events[j]) === actorKey(e) &&
                pieceOf(events[j])
            ) j++;
            if (j - i >= STREAK_MIN) {
                const run = events.slice(i, j);
                items.push({
                    kind: 'streak',
                    ts: tsOf(e),
                    e0: e,
                    actor: actorOf(e),
                    slug: e.project_id,
                    type: e.type as 'MINT' | 'SALE',
                    n: run.length,
                    totalEth: run.reduce((s, r) => s + (r.price_eth ? parseFloat(r.price_eth) : 0), 0),
                    pieces: run.map(pieceOf).filter((p): p is Piece => p !== null),
                });
                i = j;
                continue;
            }
        }
        rows.push(e);
        i++;
    }

    /* Pass 2 — SCENES: ≥3 distinct actors in one project the same day. */
    const sceneGroups = new Map<string, SocialEventRow[]>();
    for (const e of rows) {
        if ((e.type === 'MINT' || e.type === 'SALE') && pieceOf(e)) {
            const k = `${dayKey(tsOf(e))}|${e.project_id}`;
            const g = sceneGroups.get(k);
            if (g) g.push(e); else sceneGroups.set(k, [e]);
        }
    }
    const inScene = new Set<string>();
    for (const g of sceneGroups.values()) {
        const actors = new Map<string, Actor>();
        for (const e of g) if (!actors.has(actorKey(e))) actors.set(actorKey(e), actorOf(e));
        if (actors.size < SCENE_MIN_ACTORS) continue;
        for (const e of g) inScene.add(e.id);
        items.push({
            kind: 'scene',
            ts: Math.max(...g.map(tsOf)),
            slug: g[0].project_id,
            actors: [...actors.values()],
            pieces: g.map(pieceOf).filter((p): p is Piece => p !== null).slice(0, SCENE_PIECES),
            n: g.length,
        });
    }

    /* Pass 3 — remaining rows; the widest collects carry a panorama. */
    let panos = 0;
    for (const e of rows) {
        if (inScene.has(e.id)) continue;
        let pano: Piece | null = null;
        if (panos < PANO_CAP && (e.type === 'MINT' || e.type === 'SALE' || e.trade)) {
            const p = pieceOf(e);
            if (p && artImageUrl(p.slug, p.id) && artProvisionalAspect(p.slug, p.id) >= PANO_ASPECT) {
                pano = p;
                panos++;
            }
        }
        items.push({ kind: 'row', ts: tsOf(e), e, pano });
    }

    /* Albums slot in by their shelved moment. */
    for (const a of albums) {
        items.push({ kind: 'album', ts: a.created_at, a });
    }

    return items.sort((x, y) => y.ts - x.ts);
}

/* ── presentation ───────────────────────────────────────────────────── */

/* "JUL 26" — viewer-local, no year: a live social feed is this-week reading
   and the year was dead width in the middle of every row. Time stacks under. */
function fmtDate(ms: number): string {
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${mon} ${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTime(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
/* Trim a summed ETH figure to something the ◊ rail can wear. */
function fmtEth(v: number): string {
    return String(Math.round(v * 1000) / 1000);
}

function RelBadge({ relation }: { relation: SocialRelation }) {
    if (relation === 'mutual') {
        return <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>;
    }
    if (relation === 'follow') {
        return <span className="follow-badge"><span className="ico-following" title="Following">⚯&#xFE0E;</span></span>;
    }
    return null;
}

function ActorLink({ actor }: { actor: Actor }) {
    const inner = <>{actor.name}</>;
    return (
        <>
            {actor.href
                ? <a className="f-highlight" href={actor.href} onClick={(e) => e.stopPropagation()}>{inner}</a>
                : <span className="f-highlight">{inner}</span>}
            <RelBadge relation={actor.relation} />
        </>
    );
}

/** A block's summary row — the exact feed-row grammar (line · icon · stacked
 *  date/time · stacked type column · sentence), no long-press (a block spans
 *  many transactions; starring stays on single rows). */
function BlockRow({
    icon, ts, typeWord, typeSub, children,
}: {
    icon: string; ts: number; typeWord: string; typeSub?: string; children: React.ReactNode;
}) {
    return (
        <div className="feed-row">
            <div className="feed-line" />
            <div className="f-icon-wrap">{icon}&#xFE0E;</div>
            <div className="f-time">
                <span>{fmtDate(ts)}</span>
                <span>{fmtTime(ts)}</span>
            </div>
            <div className="f-type af-type">
                <span>{typeWord}</span>
                {typeSub && <span>{typeSub}</span>}
            </div>
            <div className="f-content">{children}</div>
        </div>
    );
}

/** Full-bleed strip under a block row — THE Now Minting carousel track, so
 *  tiles align with the page inset and the scroll runs edge to edge. */
function MediaStrip({ pieces, keyBase }: { pieces: Piece[]; keyBase: string }) {
    return (
        <div className="sf-media">
            <div className="home-carousel-track">
                {pieces.map((p, i) => (
                    <ProjectProvider key={`${keyBase}-${i}-${p.slug}-${p.id}`} slug={p.slug}>
                        <ArtworkCard id={p.id} renderSize={200} />
                    </ProjectProvider>
                ))}
            </div>
        </div>
    );
}

function projLink(slug: string): React.ReactNode {
    const title = getProject(slug)?.displayName ?? slug;
    return <a className="f-highlight" href={`/art/${slug}`} onClick={(e) => e.stopPropagation()}>{title}</a>;
}

export default function SocialFeed({ dir, actor, project, initialData = null, initialDataViewer = null }: {
    dir: 'asc' | 'desc';
    /** Scope the feed to one wallet's story (a profile / artist lens). */
    actor?: string;
    /** Scope the feed to one project's outputs activity. */
    project?: string;
    /** Server-seeded page for the plain default view (app/page.tsx home
        render) — the viewer's own graph feed when they were signed in
        server-side, top-collectors otherwise — paints instantly instead of
        ghost rows on a fresh page load (Brendon, 2026-08-26 + same-day
        follow-up). Ignored for any `actor`/`project` lens. */
    initialData?: SocialFeedResponse | null;
    /** The wallet `initialData` was built for (lowercased), or null for the
        anonymous seed. Guards against a mismatch — e.g. the server saw no
        cookie but the client hydrates already signed in, or vice versa —
        so a stale seed never gets shown as if it were the viewer's own. */
    initialDataViewer?: string | null;
}) {
    const { siweAddress } = useAuth();
    const addr = siweAddress?.toLowerCase();
    const qs = new URLSearchParams();
    if (addr) qs.set('viewer', addr);
    if (actor) qs.set('actor', actor.toLowerCase());
    if (project) qs.set('project', project);
    const cacheKey = qs.toString();
    const isDefaultView = !actor && !project;
    const seedMatchesViewer = isDefaultView && (initialDataViewer ?? null) === (addr ?? null);
    const [data, setData] = useState<SocialFeedResponse | null>(() => {
        const cached = lastResponse.get(cacheKey);
        if (cached) return cached;
        if (seedMatchesViewer && initialData) {
            lastResponse.set(cacheKey, initialData);
            return initialData;
        }
        return null;
    });

    useEffect(() => {
        let cancelled = false;
        /* Cached page for this exact query → paint it immediately instead of
           ghost rows, then refresh underneath. */
        const cached = lastResponse.get(cacheKey);
        if (cached) setData(cached);
        const load = () => {
            fetch(`/api/feed/social${cacheKey ? `?${cacheKey}` : ''}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: SocialFeedResponse | null) => {
                    if (!d) return;
                    lastResponse.set(cacheKey, d);
                    if (!cancelled) setData(d);
                })
                .catch(() => {
                    /* offline / 5xx — last good rows stay up */
                });
        };
        load();
        /* Same live nudge the rest of home rides — a DB push re-pulls. */
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:project-refresh', onRefresh);
        };
    }, [siweAddress, actor, project]);

    /* Loading OR nothing yet → ghost rows, never a text null state. */
    if (!data || (data.events.length === 0 && data.albums.length === 0)) return <GhostFeedRows />;

    let items = composeTimeline(data.events, data.albums);
    if (dir === 'asc') items = [...items].reverse();

    return (
        <>
            {items.map((it) => {
                if (it.kind === 'row') {
                    const fe = eventToNamedFeedEvent(it.e);
                    if (it.e.relation === 'mutual' || it.e.relation === 'follow') {
                        fe.badge = <RelBadge relation={it.e.relation} />;
                    }
                    /* The price rides the type column as a ◊ rail (not the
                       sentence) — prices align, sentences stay short. */
                    const typeSub = fe.price > 0 ? `◊${fe.price}` : undefined;
                    return (
                        <div key={fe.id}>
                            <FeedEventRow fe={fe} dateStamp={fmtDate(fe.timestamp)} typeSub={typeSub} />
                            {it.pano && (
                                /* PANORAMA — a wide piece shown in its entirety,
                                   full bleed. The art IS the row's payoff. */
                                <a
                                    className="sf-media sf-pano-link"
                                    href={`/art/${it.pano.slug}/${it.pano.id}`}
                                    aria-label="View artwork"
                                >
                                    <img
                                        className="sf-pano"
                                        src={artImageUrl(it.pano.slug, it.pano.id)!}
                                        loading="lazy"
                                        alt=""
                                    />
                                </a>
                            )}
                        </div>
                    );
                }
                if (it.kind === 'streak') {
                    const verb = it.type === 'MINT' ? 'collected' : 'bought';
                    return (
                        <div key={`streak-${it.e0.id}`}>
                            <BlockRow
                                icon={FEED_ICON[it.type]}
                                ts={it.ts}
                                typeWord={`${it.type} ×${it.n}`}
                                typeSub={it.totalEth > 0 ? `◊${fmtEth(it.totalEth)}` : undefined}
                            >
                                <ActorLink actor={it.actor} /> {verb} {projLink(it.slug)} ×{it.n}
                            </BlockRow>
                            <MediaStrip pieces={it.pieces} keyBase={`streak-${it.e0.id}`} />
                        </div>
                    );
                }
                if (it.kind === 'scene') {
                    return (
                        <div key={`scene-${it.slug}-${it.ts}`}>
                            {/* SCENE ☻ — the circle converged on one project
                                today. The social smiley marks the moment. */}
                            <BlockRow icon={'☻'} ts={it.ts} typeWord="SCENE" typeSub={`×${it.n}`}>
                                {it.actors.map((a, i) => (
                                    <span key={`${a.name}-${i}`}>
                                        {i > 0 && (i === it.actors.length - 1 ? ' & ' : ', ')}
                                        <ActorLink actor={a} />
                                    </span>
                                ))}{' '}
                                in {projLink(it.slug)}
                            </BlockRow>
                            <MediaStrip pieces={it.pieces} keyBase={`scene-${it.slug}-${it.ts}`} />
                        </div>
                    );
                }
                /* ALBUM ◰ — a friend shelved; the strip rides the feed. */
                const a = it.a;
                const pieces = a.keys
                    .map((k) => {
                        const ci = k.lastIndexOf(':');
                        if (ci < 0) return null;
                        const slug = k.slice(0, ci);
                        const id = Number(k.slice(ci + 1));
                        return Number.isFinite(id) && getProject(slug) ? { slug, id } : null;
                    })
                    .filter((p): p is Piece => p !== null);
                return (
                    <div key={`album-${a.owner_address}-${a.position}-${a.created_at}`}>
                        <BlockRow icon={'◰'} ts={it.ts} typeWord="ALBUM" typeSub={`#${a.position}`}>
                            <ActorLink
                                actor={{ name: `@${a.owner_handle}`, href: `/${a.owner_handle}`, relation: a.relation }}
                            />{' '}
                            shelved album #{a.position} · {a.count} pieces
                        </BlockRow>
                        {pieces.length > 0 && (
                            <MediaStrip pieces={pieces} keyBase={`album-${a.owner_address}-${a.position}`} />
                        )}
                    </div>
                );
            })}
        </>
    );
}
