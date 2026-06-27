'use client';

/*
 * StarredList — the profile +More → Starred surface.
 *
 * Starred is a PERSONAL BOOKMARK list ("like it, star it, find it later"). It
 * now holds two kinds of bookmark, split by a two-pill filter at the top:
 *
 *   • Outputs — a starred Output (Project + token). Tapping the row opens the
 *     Artwork modal; each row carries a quick Add-to-Wishlist CTA + unstar.
 *   • Traits  — a starred (Project, trait category, value), e.g. Prisms ·
 *     Palette: Hothurt, favourited by long-pressing a trait pill. Each row
 *     carries a Trait Offer CTA (offer flow lands later) + unstar.
 *
 * Rows are a compact, sortable + filterable ROW list with a small preview per
 * row. Meta is derived deterministically from the registry — no DB round-trip —
 * so the list paints instantly.
 */

import { useEffect, useMemo, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useNotePrompt } from '../../lib/state/NotePromptContext';
import { useStarLongPress, useTokenNote } from '../../lib/hooks/rowFlags';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useCartelMutualCount } from '../../lib/social/cartel';
import { useProjectCelestial } from '../../lib/output/celestial';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { outputTraits, getProject, projectColorway, projectsByArtist } from '../../lib/project/registry';
import { COLOR_BUCKET_ORDER } from '../../lib/art/outputColor';
import { resolveBucket, useStoredColors } from '../../lib/art/colorStore';
import { traitMarketStat, projectMarketStat, artistColor, artistFloorEth, artistFloor, collectorTopBuy, collectorTopBuyEth, collectorProjectsOwned } from '../../lib/market/starredMarket';
import { toggleStar, isStarred, subscribeStarred } from '../../lib/pins/starStore';
import { removeMyHistory, PROJECT_VIEW_ID } from '../../lib/output/views';
import { isWishlisted, toggleWishlist, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { toggleTraitStar, type TraitStar } from '../../lib/pins/traitStarStore';
import { removeArtistStar } from '../../lib/pins/artistStarStore';
import { toggleSoundtrackStar, type SoundtrackStar } from '../../lib/pins/soundtrackStarStore';
import { removeProjectStar, isProjectStarred, toggleProjectStar, subscribeProjectStars } from '../../lib/pins/projectStarStore';
import { removeTxStar, type TxStar } from '../../lib/pins/txStarStore';
import { txStarToFeedEvent } from '../../lib/feed/feedRow';
import { getGrails, subscribeGrails, togglePinItem, grailKey, type GrailPin } from '../../lib/pins/grailStore';
import { useStarredPrices, priceOf } from '../../lib/pins/starredPriceStore';
import { useArtistColors, artistBucket, artistFollowers, artistSprite, artistProjectsOwned } from '../../lib/pins/artistColorStore';
import { useArtistSocial, relGlyphOf, relLabelOf, fmtFollowers } from '../../lib/social/useArtistSocial';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import OutputThumb from './OutputThumb';
import GhostRows from './GhostRows';

export interface StarredItem {
    slug: string;
    id: number;
    /** Epoch-ms of the visit — History only, drives day grouping. */
    ts?: number;
}

/* Day bucket label for the History timeline — Today / Yesterday / "Mon DD YYYY"
   (Chrome-history style). t <= 0 = a legacy visit with no recorded time. */
function dayLabel(t: number): string {
    if (!t || t <= 0) return 'Earlier';
    const d = new Date(t);
    const now = new Date();
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOf(now) - startOf(d)) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type Mode = 'all' | 'artists' | 'collectors' | 'outputs' | 'traits' | 'soundtracks' | 'projects' | 'tx'
    // Social cross-entity filters — top-level pills (right after Artists). Each
    // shows people + projects filtered by the viewer's follow relationship:
    // followers = follows you (a project follows you while you hold ≥1 of its
    // outputs), following = you follow them, mutuals = both.
    | 'followers' | 'following' | 'mutuals';
type SortKey = 'recent' | 'id' | 'project' | 'price' | 'followers';

/* A labelled group section; `label` null = ungrouped (no header rendered). */
interface Section<T> { label: string | null; key: string; rows: T[]; }
function sectionize<T>(rows: T[], keyOf: (r: T) => string, order?: string[]): Section<T>[] {
    const m = new Map<string, T[]>();
    for (const r of rows) { const k = keyOf(r); let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(r); }
    let entries = [...m.entries()];
    if (order) entries = entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return entries.map(([label, rs]) => ({ label, key: label, rows: rs }));
}
const COLOR_ORDER = [...(COLOR_BUCKET_ORDER as readonly string[]), 'Other'];

/* The after-name project badges — the Cartel count (⟁ + the viewer's mutuals
   controlling this project) and the Celestial Tracker (the project's Fate
   hexagram + sky row) — exactly as they ride beside the project name on the
   project page (ProjectTitleStar). Each is gated on its own spell; renders
   nothing when both are off. Drop after a project @name on the Starred + History
   project cards. */
function ProjectNameBadges({ slug }: { slug: string }) {
    const { notifs } = usePdNotifs();
    const cartelOn = notifs.spell_cartel;
    const cartelCount = useCartelMutualCount(slug, cartelOn);
    const projFate = useProjectCelestial(slug, notifs.spell_celestial);
    return (
        <>
            {cartelOn && (
                <span className="project-cartel" aria-label={`${cartelCount} mutuals in the cartel`}>
                    <span className="pc-ico">{'⟁︎'}</span>
                    <span className="pc-num">{cartelCount}</span>
                </span>
            )}
            {projFate && (
                <span className="project-celestial" aria-label={`Fate ${projFate.name}`}>
                    <span className="pcel-hex">{projFate.glyph}</span>
                    <span className="pcel-sky" aria-hidden="true">{'☉︎ ☽︎ ↑︎'}</span>
                </span>
            )}
        </>
    );
}

export default function StarredList({
    items,
    traits = [],
    artists = [],
    collectors = [],
    soundtracks = [],
    projects = [],
    txEvents = [],
    searchOpen = false,
    query = '',
    onQueryChange,
    onCloseSearch,
    multiActive = false,
    onExitMulti,
    sortKey = 'recent',
    sortDir = 'asc',
    group = 'none',
    mode = 'all',
    viewerAddress,
    kind = 'starred',
    timeline = false,
}: {
    items: StarredItem[];
    traits?: ReadonlyArray<TraitStar>;
    artists?: ReadonlyArray<string>;
    collectors?: ReadonlyArray<string>;
    soundtracks?: ReadonlyArray<SoundtrackStar>;
    projects?: ReadonlyArray<string>;
    txEvents?: ReadonlyArray<TxStar>;
    /* Search is controlled by the parent so its ⌕ icon can live up in the
       +More sub-nav beside the Info pill (where Collected's search lives). */
    searchOpen?: boolean;
    query?: string;
    onQueryChange?: (q: string) => void;
    onCloseSearch?: () => void;
    /* Multi-select, driven by the sub-nav's ❐ icon (same spot as search). */
    multiActive?: boolean;
    onExitMulti?: () => void;
    /* Sort, driven by the sub-nav sort-bar (Recent / #ID / Project) — tap the
       active one to flip direction, same as the gallery sorts. */
    sortKey?: SortKey;
    sortDir?: 'asc' | 'desc';
    /* Active grouping dimension for the current filter (none | color | project
       | artist | type-for-All). Parent only sends one valid for the mode. */
    group?: string;
    /* The active filter pill — CONTROLLED by the parent so Starred Presets can
       restore it. The pills call onSetMode to change it. */
    mode?: Mode;
    onSetMode?: (m: Mode) => void;
    /* The viewer's wallet (own profile = the owner) — lets each artist row
       resolve the follow relationship (mutual / following / follower). */
    viewerAddress?: string | null;
    /* 'history' reuses the Outputs rows but: the ✕ drops the visit from History
       (not unstar), and the list can render on the feed timeline (Brendon,
       2026-06-24). */
    kind?: 'starred' | 'history';
    /* Render the Outputs rows on the feed timeline (line + node), grouped by day
       headers — the History look. */
    timeline?: boolean;
}) {
    const { open } = useModal();
    const { showToast } = useToast();
    const router = useRouter();
    /* A dim only applies inside its own single-filter view; in All it's flat. */
    const dimFor = (m: Mode) => (mode === m ? group : 'none');

    /* Social filter (Brendon, 2026-06-25) — the Followers / Following / Mutuals
       pills are now TOP-LEVEL modes (right after Artists), so the relationship
       is driven straight off `mode`, not a separate sub-pill. Each social mode
       shows people (collectors + artists) AND projects, filtered by the viewer's
       live follow graph. Outputs are deferred until their watch/fandom follow is
       wired. */
    const social: 'all' | 'followers' | 'following' | 'mutuals' =
        mode === 'followers' || mode === 'following' || mode === 'mutuals' ? mode : 'all';
    const isSocial = social !== 'all';

    /* People follow graph — who follows the viewer / who the viewer follows. */
    const [socialGraph, setSocialGraph] = useState<{ followers: Set<string>; following: Set<string> }>(
        { followers: new Set(), following: new Set() }
    );
    useEffect(() => {
        if (!viewerAddress) { setSocialGraph({ followers: new Set(), following: new Set() }); return; }
        let alive = true;
        fetch(`/api/follows/${viewerAddress}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive || !j) return;
                const norm = (a: unknown) => new Set((Array.isArray(a) ? a : []).map((h: string) => h.toLowerCase().replace(/^@/, '')));
                setSocialGraph({ followers: norm(j.follower_handles), following: norm(j.following_handles) });
            })
            .catch(() => { /* ignore */ });
        return () => { alive = false; };
    }, [viewerAddress]);
    const matchesSocial = (handle: string): boolean => {
        if (social === 'all') return true;
        const k = handle.toLowerCase().replace(/^@/, '');
        const f = socialGraph.followers.has(k), g = socialGraph.following.has(k);
        if (social === 'followers') return f;
        if (social === 'following') return g;
        return f && g; // mutuals
    };

    /* Project follow graph — held (the project follows you, because you own ≥1
       of its outputs) vs following (you explicitly follow the project). Keyed by
       project handle, which matches the registry slug. */
    const [projGraph, setProjGraph] = useState<{ held: Set<string>; following: Set<string> }>(
        { held: new Set(), following: new Set() }
    );
    useEffect(() => {
        if (!viewerAddress) { setProjGraph({ held: new Set(), following: new Set() }); return; }
        let alive = true;
        fetch(`/api/project-follows?follower=${viewerAddress}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive || !j || !Array.isArray(j.projects)) return;
                const held = new Set<string>(), following = new Set<string>();
                for (const p of j.projects as Array<{ handle: string | null; held: boolean; following: boolean }>) {
                    const k = (p.handle ?? '').toLowerCase();
                    if (!k) continue;
                    if (p.held) held.add(k);
                    if (p.following) following.add(k);
                }
                setProjGraph({ held, following });
            })
            .catch(() => { /* ignore */ });
        return () => { alive = false; };
    }, [viewerAddress]);
    const matchesProjectSocial = (slug: string): boolean => {
        if (social === 'all') return true;
        const k = slug.toLowerCase();
        const held = projGraph.held.has(k), foll = projGraph.following.has(k);
        if (social === 'followers') return held;
        if (social === 'following') return foll;
        return held && foll; // mutuals
    };

    /* Outputs the viewer follows — outputs only ever appear under FOLLOWING (you
       follow an output; an output never follows you back). Keyed "project:token". */
    const [followedOutputs, setFollowedOutputs] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (!viewerAddress) { setFollowedOutputs(new Set()); return; }
        let alive = true;
        fetch(`/api/output-follows?follower=${viewerAddress}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive || !j || !Array.isArray(j.outputs)) return;
                setFollowedOutputs(new Set(
                    (j.outputs as Array<{ project_id: string; token_id: string }>)
                        .map((o) => `${o.project_id.toLowerCase()}:${o.token_id}`),
                ));
            })
            .catch(() => { /* ignore */ });
        return () => { alive = false; };
    }, [viewerAddress]);

    /* Which entity blocks show for the current mode. A social mode shows the
       followable lists (collectors + artists + projects); the Following mode
       additionally shows outputs you follow. A single-entity mode shows just
       that one; All shows everything. */
    const showType = (t: Mode) =>
        mode === t || mode === 'all'
        || (isSocial && (t === 'collectors' || t === 'artists' || t === 'projects'))
        || (social === 'following' && t === 'outputs');

    /* Multi-select selection — keys match each row's React key. Cleared when
       multi-select turns off or the filter changes. */
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => { setSelected(new Set()); }, [multiActive, mode]);
    const toggleSel = (k: string) =>
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(k)) n.delete(k); else n.add(k);
            return n;
        });
    const handleRemoveSelected = () => {
        if (selected.size === 0) return;
        const inMode = (m: Mode) => mode === 'all' || mode === m || (isSocial && (m === 'collectors' || m === 'artists' || m === 'projects'));
        if (inMode('outputs')) visibleOutputs.forEach((r) => { if (selected.has(`${r.slug}:${r.id}`)) toggleStar(r.slug, r.id); });
        if (inMode('traits')) visibleTraits.forEach((r) => { if (selected.has(`${r.slug}|${r.category}|${r.value}`)) toggleTraitStar(r.slug, r.category, r.value); });
        if (inMode('artists')) visibleArtists.forEach((r) => { if (selected.has(r.name)) removeArtistStar(r.name); });
        if (inMode('collectors')) visibleCollectors.forEach((r) => { if (selected.has(r.name)) removeArtistStar(r.name); });
        if (inMode('soundtracks')) visibleSoundtracks.forEach((r) => { if (selected.has(`${r.slug}|${r.playlistId}`)) toggleSoundtrackStar(r.slug, r.playlistId, r.title); });
        if (inMode('projects')) visibleProjects.forEach((r) => { if (selected.has(`p:${r.slug}`)) removeProjectStar(r.slug); });
        if (inMode('tx')) visibleTx.forEach((r) => { if (selected.has(`tx:${r.star.id}`)) removeTxStar(r.star.id); });
        const n = selected.size;
        setSelected(new Set());
        onExitMulti?.();
        showToast(`Removed ${n} from your Starred List`);
    };

    /* Live wishlist membership so each Output row's CTA reflects whether it's
       already on the wishlist (one subscription for the whole list). */
    const [wishKeys, setWishKeys] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => subscribeWishlist((next) => setWishKeys(next)), []);

    /* Live Grail-pin membership — each row carries a grail-pin toggle (the ⟟ above
       its ✕). Any kind can be pinned; the top-bar pills render them. */
    const [grailKeys, setGrailKeys] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => {
        const apply = (p: readonly GrailPin[]) => setGrailKeys(new Set(p.map(grailKey)));
        apply(getGrails());
        return subscribeGrails(apply);
    }, []);
    const handleGrail = (pin: GrailPin) => {
        const r = togglePinItem(pin);
        if (r === 'limit') { showToast('Grail Pins: 10 MAX'); return; }
        showToast(r === 'pinned' ? 'Grail: PINNED' : 'Grail: UNPINNED');
    };

    /* ── Output rows ──────────────────────────────────────────────────── */
    const outputRows = useMemo(
        () =>
            items
                // Project-page views (token 0) are History-only and render as
                // project cards, never as Output rows.
                .filter((it) => it.id !== PROJECT_VIEW_ID && getProject(it.slug) != null)
                .map((it, i) => {
                    const t = outputTraits(it.slug, it.id);
                    const PLAT = new Set(['Artist', 'Project', 'Fate', 'PriceDay', 'Sun', 'Moon', 'Rising']);
                    const extraPairs = Object.entries(t)
                        .filter(([k, v]) => !PLAT.has(k) && v)
                        .map(([k, v]) => ({ k, v: String(v) }));
                    const extra = extraPairs.map((p) => `${p.k}: ${p.v}`).join(' · ');
                    return {
                        ...it,
                        ts: it.ts ?? 0,
                        recentIndex: i,
                        project: t.Project ?? `@${it.slug}`,
                        projectName: getProject(it.slug)?.displayName ?? '',
                        artist: t.Artist ?? '',
                        fate: t.Fate ?? '',
                        extra,
                        extraPairs,
                    };
                }),
        [items],
    );

    /* Listing prices for the starred outputs, loaded at the list level so $PRICE
       can sort (unlisted pieces always sort last). */
    const outputProjectSlugs = useMemo(() => [...new Set(outputRows.map((r) => r.slug))], [outputRows]);
    const pricesVer = useStarredPrices(outputProjectSlugs);

    const visibleOutputs = useMemo(() => {
        const q = query.trim().toLowerCase();
        const byQuery = q
            ? outputRows.filter((r) =>
                  `${r.project} ${r.artist} #${r.id} ${r.fate}`.toLowerCase().includes(q),
              )
            : outputRows;
        /* Social: outputs surface only under Following, narrowed to the ones the
           viewer follows; under Followers/Mutuals outputs never appear. */
        const filtered = !isSocial
            ? byQuery
            : social === 'following'
                ? byQuery.filter((r) => followedOutputs.has(`${r.slug.toLowerCase()}:${r.id}`))
                : [];
        const sorted = [...filtered];
        if (sortKey === 'price') {
            const dirMul = sortDir === 'desc' ? -1 : 1;
            sorted.sort((a, b) => {
                const pa = priceOf(a.slug, a.id);
                const pb = priceOf(b.slug, b.id);
                if (pa == null && pb == null) return a.id - b.id;
                if (pa == null) return 1;   // unlisted always last
                if (pb == null) return -1;
                return (pa - pb) * dirMul;
            });
            return sorted;
        }
        if (sortKey === 'id') sorted.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.id - b.id);
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outputRows, query, sortKey, sortDir, pricesVer, isSocial, social, followedOutputs]);

    /* Group output rows by Project so each group mounts ONE ProjectProvider —
       that's how each row reads its live listing price (and the Buy CTA lights
       up the instant a piece is listed), the same pattern Wishlist uses. */
    const outputGroups = useMemo(() => {
        const m = new Map<string, typeof visibleOutputs>();
        for (const r of visibleOutputs) {
            const arr = m.get(r.slug) ?? [];
            arr.push(r);
            m.set(r.slug, arr);
        }
        return [...m.entries()];
    }, [visibleOutputs]);

    /* ── Trait rows ───────────────────────────────────────────────────── */
    const traitRows = useMemo(
        () =>
            traits
                .filter((t) => getProject(t.slug) != null)
                .map((t, i) => ({
                    ...t,
                    recentIndex: i,
                    project: getProject(t.slug)?.displayName ?? `@${t.slug}`,
                    color: projectColorway(t.slug) ?? 'var(--stat-bg)',
                    market: traitMarketStat(t.slug, t.category, t.value),
                })),
        [traits],
    );

    const visibleTraits = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? traitRows.filter((r) =>
                  `${r.project} ${r.category} ${r.value}`.toLowerCase().includes(q),
              )
            : traitRows;
        const sorted = [...filtered];
        if (sortKey === 'price') sorted.sort((a, b) => parseFloat(a.market.floor) - parseFloat(b.market.floor));
        else if (sortKey === 'id') sorted.sort((a, b) => a.value.localeCompare(b.value) || a.project.localeCompare(b.project));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.value.localeCompare(b.value));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
    }, [traitRows, query, sortKey, sortDir]);

    /* Official colour + follower count + sprite for every starred USER (artists
       AND collectors), loaded once at the list level so we can group by colour
       and sort by followers across the whole list. */
    const userMetaHandles = useMemo(
        () => [...artists, ...collectors].map((h) => h.replace(/^@/, '')),
        [artists, collectors],
    );
    const userMetaVer = useArtistColors(userMetaHandles);
    const followersOf = (handle: string) => artistFollowers(handle) ?? -1; // unknown sorts last (asc)

    /* ── Artist rows ──────────────────────────────────────────────────── */
    const visibleArtists = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = artists.map((name, i) => ({ name, handle: name.replace(/^@/, ''), recentIndex: i }));
        const byQuery = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
        const filtered = social === 'all' ? byQuery : byQuery.filter((r) => matchesSocial(r.handle));
        const sorted = [...filtered];
        if (sortKey === 'price') sorted.sort((a, b) => artistFloorEth(a.handle) - artistFloorEth(b.handle));
        else if (sortKey === 'followers') sorted.sort((a, b) => followersOf(a.handle) - followersOf(b.handle));
        else if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [artists, query, sortKey, sortDir, userMetaVer, social, socialGraph]);

    /* ── Collector rows (starred users with no projects) ──────────────── */
    const visibleCollectors = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = collectors.map((name, i) => ({ name, handle: name.replace(/^@/, ''), recentIndex: i }));
        const byQuery = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
        const filtered = social === 'all' ? byQuery : byQuery.filter((r) => matchesSocial(r.handle));
        const sorted = [...filtered];
        if (sortKey === 'price') sorted.sort((a, b) => collectorTopBuyEth(a.handle) - collectorTopBuyEth(b.handle));
        else if (sortKey === 'followers') sorted.sort((a, b) => followersOf(a.handle) - followersOf(b.handle));
        else if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectors, query, sortKey, sortDir, userMetaVer, social, socialGraph]);

    /* ── Soundtrack rows ──────────────────────────────────────────────── */
    const visibleSoundtracks = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = soundtracks.map((s, i) => ({ ...s, recentIndex: i }));
        const filtered = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;
        const sorted = [...filtered];
        if (sortKey === 'price') sorted.sort((a, b) => parseFloat(projectMarketStat(a.slug).floor) - parseFloat(projectMarketStat(b.slug).floor));
        else if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.title.localeCompare(b.title));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
    }, [soundtracks, query, sortKey, sortDir]);

    /* ── Tx rows (starred on-chain activity events) ───────────────────── */
    const visibleTx = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = txEvents.map((s, i) => ({ star: s, fe: txStarToFeedEvent(s), recentIndex: i }));
        const filtered = q
            ? rows.filter((r) => `${r.star.type} ${r.star.tokenId ?? ''} ${r.star.fromHandle ?? ''} ${r.star.toHandle ?? ''}`.toLowerCase().includes(q))
            : rows;
        const sorted = [...filtered];
        if (sortKey === 'price') sorted.sort((a, b) => a.fe.price - b.fe.price);
        else if (sortKey === 'id') sorted.sort((a, b) => a.fe.timestamp - b.fe.timestamp);
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
    }, [txEvents, query, sortKey, sortDir]);

    /* ── Project rows ─────────────────────────────────────────────────── */
    const visibleProjects = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = projects
            .filter((slug) => getProject(slug) != null)
            .map((slug, i) => ({ slug, name: getProject(slug)?.displayName ?? `@${slug}`, color: projectColorway(slug) ?? 'var(--stat-bg)', market: projectMarketStat(slug), recentIndex: i }));
        const byQuery = q ? rows.filter((r) => `${r.name} ${r.slug}`.toLowerCase().includes(q)) : rows;
        const filtered = social === 'all' ? byQuery : byQuery.filter((r) => matchesProjectSocial(r.slug));
        const sorted = [...filtered];
        if (sortKey === 'price') sorted.sort((a, b) => parseFloat(a.market.floor) - parseFloat(b.market.floor));
        else if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects, query, sortKey, sortDir, social, projGraph]);

    /* ── Group sections (only inside a single filter; All groups by type via the
       render). Outputs sub-group by Project inside each section so one
       ProjectProvider mounts per project. ── */
    const artistOf = (slug: string) => { const h = getProject(slug)?.artistHandle; return h ? `@${h}` : '—'; };
    const projOf = (slug: string) => getProject(slug)?.displayName ?? `@${slug}`;
    const bySlug = (rows: typeof visibleOutputs) => {
        const m = new Map<string, typeof visibleOutputs>();
        for (const r of rows) { let a = m.get(r.slug); if (!a) { a = []; m.set(r.slug, a); } a.push(r); }
        return [...m.entries()];
    };
    /* Load the stored (DB) colour buckets for the starred outputs' projects so
       colour grouping uses the real captured colour, not the "Other" fallback.
       colorsVer bumps when they arrive so the sections recompute. */
    const outputSlugs = useMemo(() => [...new Set(visibleOutputs.map((r) => r.slug))], [visibleOutputs]);
    const colorsVer = useStoredColors(outputSlugs);
    const outputSections = useMemo(() => {
        const dim = dimFor('outputs');
        let secs: Section<typeof visibleOutputs[number]>[];
        if (dim === 'day') secs = sectionize(visibleOutputs, (r) => dayLabel(r.ts));
        else if (dim === 'color') secs = sectionize(visibleOutputs, (r) => resolveBucket(r.slug, r.id) ?? 'Other', COLOR_ORDER);
        else if (dim === 'artist') secs = sectionize(visibleOutputs, (r) => r.artist || '—');
        else if (dim === 'project') secs = sectionize(visibleOutputs, (r) => projOf(r.slug));
        else return [{ label: null as string | null, key: '_', groups: outputGroups }];
        return secs.map((s) => ({ label: s.label, key: s.key, groups: bySlug(s.rows) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, group, visibleOutputs, outputGroups, colorsVer]);

    /* ── History (project + output views, one chronological day-grouped list) ──
       Only when kind==='history'. Project-page visits (token 0) become project
       cards; Output visits stay Output rows. Both adapt to the timeline style,
       interleaved newest-first and bucketed by day. Field values for the project
       cards come from the same source the Starred Projects cards use
       (projectColorway + projectMarketStat). */
    const isHistory = kind === 'history';
    const projectViewRows = useMemo(() => {
        if (!isHistory) return [] as { slug: string; ts: number; color: string; market: ReturnType<typeof projectMarketStat>; name: string }[];
        return items
            .filter((it) => it.id === PROJECT_VIEW_ID && getProject(it.slug) != null)
            .map((it) => ({
                slug: it.slug,
                ts: it.ts ?? 0,
                color: projectColorway(it.slug) ?? 'var(--stat-bg)',
                market: projectMarketStat(it.slug),
                name: getProject(it.slug)?.displayName ?? `@${it.slug}`,
            }));
    }, [items, isHistory]);
    type HistoryRow =
        | { type: 'output'; ts: number; slug: string; id: number; project: string; artist: string; extraPairs: { k: string; v: string }[]; fate: string }
        | { type: 'project'; ts: number; slug: string; color: string; floor: string; lastSale: string };
    const historySections = useMemo(() => {
        if (!isHistory) return [] as Section<HistoryRow>[];
        const q = query.trim().toLowerCase();
        const outs: HistoryRow[] = outputRows.map((r) => ({
            type: 'output', ts: r.ts, slug: r.slug, id: r.id,
            project: r.project, artist: r.artist, extraPairs: r.extraPairs, fate: r.fate,
        }));
        const projs: HistoryRow[] = projectViewRows.map((r) => ({
            type: 'project', ts: r.ts, slug: r.slug, color: r.color,
            floor: r.market.floor, lastSale: r.market.lastSale,
        }));
        let all = [...outs, ...projs];
        if (q) {
            all = all.filter((r) =>
                r.type === 'output'
                    ? `${r.project} ${r.artist} #${r.id}`.toLowerCase().includes(q)
                    : `@${r.slug}`.toLowerCase().includes(q),
            );
        }
        all.sort((a, b) => b.ts - a.ts);
        return sectionize(all, (r) => dayLabel(r.ts));
    }, [isHistory, outputRows, projectViewRows, query]);

    const traitSections = useMemo(() => {
        const dim = dimFor('traits');
        if (dim === 'project') return sectionize(visibleTraits, (r) => projOf(r.slug));
        if (dim === 'artist') return sectionize(visibleTraits, (r) => artistOf(r.slug));
        return [{ label: null as string | null, key: '_', rows: visibleTraits }];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, group, visibleTraits]);
    /* Artists + Collectors can group by their OFFICIAL colour (loaded above). */
    const artistSections = useMemo(() => {
        if (dimFor('artists') === 'color') return sectionize(visibleArtists, (r) => artistBucket(r.handle) ?? 'Other', COLOR_ORDER);
        return [{ label: null as string | null, key: '_', rows: visibleArtists }];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, group, visibleArtists, userMetaVer]);
    const collectorSections = useMemo(() => {
        if (dimFor('collectors') === 'color') return sectionize(visibleCollectors, (r) => artistBucket(r.handle) ?? 'Other', COLOR_ORDER);
        return [{ label: null as string | null, key: '_', rows: visibleCollectors }];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, group, visibleCollectors, userMetaVer]);
    const projectSections = useMemo(() => {
        if (dimFor('projects') === 'artist') return sectionize(visibleProjects, (r) => artistOf(r.slug));
        return [{ label: null as string | null, key: '_', rows: visibleProjects }];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, group, visibleProjects]);
    const soundtrackSections = useMemo(() => {
        const dim = dimFor('soundtracks');
        if (dim === 'artist') return sectionize(visibleSoundtracks, (r) => artistOf(r.slug));
        if (dim === 'project') return sectionize(visibleSoundtracks, (r) => projOf(r.slug));
        return [{ label: null as string | null, key: '_', rows: visibleSoundtracks }];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, group, visibleSoundtracks]);
    /* All-Starred groups by TYPE — a header before each non-empty block. */
    const typeHdr = (mode === 'all' && group === 'type') || isSocial;

    /* Removing from Starred asks first (the ✕ on the right) — a small confirm
       card, the same style as multi-select's. */
    const [confirm, setConfirm] = useState<{ question: string; onConfirm: () => void } | null>(null);
    const askRemove = (question: string, onConfirm: () => void) => setConfirm({ question, onConfirm });

    const handleUnstar = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        if (kind === 'history') {
            askRemove('Remove this from your History?', () => {
                void removeMyHistory(slug, id);
                showToast('Removed from your History');
            });
            return;
        }
        askRemove('Remove this output from your Starred list?', () => {
            toggleStar(slug, id);
            showToast('Removed from your Starred Outputs List');
        });
    };

    const handleWishlist = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        const r = toggleWishlist(slug, id);
        showToast(r === 'added' ? 'Added to your Wishlist (Private)' : 'Removed from your Wishlist');
    };

    const handleTraitUnstar = (e: React.MouseEvent, t: TraitStar) => {
        e.stopPropagation();
        askRemove('Remove this trait from your Starred list?', () => {
            toggleTraitStar(t.slug, t.category, t.value);
            showToast('Removed from your Starred Traits List');
        });
    };

    const handleArtistUnstar = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        askRemove('Remove this artist from your Starred list?', () => {
            removeArtistStar(name);
            showToast('Removed from your Starred Artists List');
        });
    };

    const handleSoundtrackUnstar = (e: React.MouseEvent, s: SoundtrackStar) => {
        e.stopPropagation();
        askRemove('Remove this soundtrack from your Starred list?', () => {
            toggleSoundtrackStar(s.slug, s.playlistId, s.title);
            showToast('Removed from your Starred Soundtracks List');
        });
    };

    const handleTxUnstar = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        askRemove('Remove this transaction from your Starred list?', () => {
            removeTxStar(id);
            showToast('Removed from your Starred Transactions List');
        });
    };

    const historyRowCount = useMemo(
        () => historySections.reduce((n, s) => n + s.rows.length, 0),
        [historySections],
    );
    const totalVisible =
        isHistory ? historyRowCount
        : mode === 'all' ? visibleOutputs.length + visibleTraits.length + visibleArtists.length + visibleCollectors.length + visibleSoundtracks.length + visibleProjects.length + visibleTx.length
        : isSocial ? visibleArtists.length + visibleCollectors.length + visibleProjects.length + visibleOutputs.length
        : mode === 'outputs' ? visibleOutputs.length
        : mode === 'traits' ? visibleTraits.length
        : mode === 'artists' ? visibleArtists.length
        : mode === 'collectors' ? visibleCollectors.length
        : mode === 'soundtracks' ? visibleSoundtracks.length
        : mode === 'tx' ? visibleTx.length
        : visibleProjects.length;

    return (
        <section className="starred-list" aria-label="Starred">
            {/* The sub-category filter pills (All Starred / Collectors / …) now
                render as the +More pop-out value row up under the L1 pills
                (above the colorway/sort bar) — see ProfilePageBody's
                profileValueRow — matching the Collected tab's layout. */}

            {/* Search row — collapsed until the ⌕ icon (in the +More sub-nav) is
                tapped (.open). Sorts live in the sub-nav sort-bar now. */}
            <div className={`search-row${searchOpen ? ' open' : ''}`}>
                <input
                    className="search-input"
                    type="text"
                    placeholder={mode === 'traits' ? 'Filter traits — @project, trait, value…' : 'Filter starred — @project, @artist, # id…'}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => onQueryChange?.(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                />
                <span
                    className="search-clear"
                    role="button"
                    tabIndex={0}
                    onClick={() => onCloseSearch?.()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCloseSearch?.(); } }}
                    title="Clear"
                >
                    ✕&#xFE0E;
                </span>
            </div>

            {/* Rows — each type renders when 'all' or its own filter is active. */}
            <div className={`starred-rows${multiActive ? ' is-multi' : ''}${timeline ? ' starred-rows--timeline' : ''}`}>
                {isHistory && (
                    <>
                        {historySections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className="starred-group-header history-day-header">{sec.label}</div>}
                                {sec.rows.map((r) =>
                                    r.type === 'project' ? (
                                        <StarredProjectHistoryRow
                                            key={`p:${r.slug}:${r.ts}`}
                                            slug={r.slug}
                                            color={r.color}
                                            floor={r.floor}
                                            lastSale={r.lastSale}
                                            multiActive={multiActive}
                                            selected={selected.has(`p:${r.slug}`)}
                                            onToggleSel={() => toggleSel(`p:${r.slug}`)}
                                            onOpen={() => router.push('/art/' + r.slug)}
                                            onOffer={() => showToast('Project Offer: COMING SOON')}
                                            onUnstar={(e) => handleUnstar(e, r.slug, PROJECT_VIEW_ID)}
                                            grailPinned={grailKeys.has(grailKey({ kind: 'project', slug: r.slug }))}
                                            onGrail={() => handleGrail({ kind: 'project', slug: r.slug })}
                                        />
                                    ) : (
                                        <ProjectProvider key={`o:${r.slug}:${r.id}`} slug={r.slug}>
                                            <StarredOutputRow
                                                slug={r.slug}
                                                id={r.id}
                                                timeline
                                                project={r.project}
                                                artist={r.artist}
                                                extraPairs={r.extraPairs}
                                                fate={r.fate}
                                                wished={wishKeys.has(`${r.slug}:${r.id}`)}
                                                multiActive={multiActive}
                                                selected={selected.has(`${r.slug}:${r.id}`)}
                                                onToggleSel={() => toggleSel(`${r.slug}:${r.id}`)}
                                                onOpen={() => open('output', r.id, r.slug)}
                                                onWishlist={(e) => handleWishlist(e, r.slug, r.id)}
                                                onOffer={() => showToast('Offer: COMING SOON')}
                                                onUnstar={(e) => handleUnstar(e, r.slug, r.id)}
                                                grailPinned={grailKeys.has(grailKey({ kind: 'output', slug: r.slug, id: r.id }))}
                                                onGrail={() => handleGrail({ kind: 'output', slug: r.slug, id: r.id })}
                                            />
                                        </ProjectProvider>
                                    ),
                                )}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('outputs') && !isHistory && (
                    <>
                        {typeHdr && visibleOutputs.length > 0 && <div className="starred-group-header">Outputs</div>}
                        {outputSections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className={`starred-group-header${timeline ? ' history-day-header' : ''}`}>{sec.label}</div>}
                                {sec.groups.map(([slug, groupRows]) => (
                                    <ProjectProvider key={`${sec.key}|${slug}`} slug={slug}>
                                        {groupRows.map((r) => (
                                            <StarredOutputRow
                                                key={`${r.slug}:${r.id}`}
                                                slug={r.slug}
                                                id={r.id}
                                                timeline={timeline}
                                                project={r.project}
                                                artist={r.artist}
                                                extraPairs={r.extraPairs}
                                                fate={r.fate}
                                                wished={wishKeys.has(`${r.slug}:${r.id}`)}
                                                multiActive={multiActive}
                                                selected={selected.has(`${r.slug}:${r.id}`)}
                                                onToggleSel={() => toggleSel(`${r.slug}:${r.id}`)}
                                                onOpen={() => open('output', r.id, r.slug)}
                                                onWishlist={(e) => handleWishlist(e, r.slug, r.id)}
                                                onOffer={() => showToast('Offer: COMING SOON')}
                                                onUnstar={(e) => handleUnstar(e, r.slug, r.id)}
                                                grailPinned={grailKeys.has(grailKey({ kind: 'output', slug: r.slug, id: r.id }))}
                                                onGrail={() => handleGrail({ kind: 'output', slug: r.slug, id: r.id })}
                                            />
                                        ))}
                                    </ProjectProvider>
                                ))}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('traits') && (
                    <>
                        {typeHdr && visibleTraits.length > 0 && <div className="starred-group-header">Traits</div>}
                        {traitSections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className="starred-group-header">{sec.label}</div>}
                                {sec.rows.map((r) => {
                            const selKey = `${r.slug}|${r.category}|${r.value}`;
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row has-actions-abs${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role={multiActive ? 'button' : undefined}
                                tabIndex={multiActive ? 0 : undefined}
                                onClick={multiActive ? () => toggleSel(selKey) : undefined}
                                onKeyDown={multiActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSel(selKey); } } : undefined}
                            >
                                <div className="trait-row-tile">
                                    <span className="trait-row-tile-glyph" style={{ color: r.color }}>⨝&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">@{r.slug} · {r.category}: {r.value}</span>
                                    <span className="starred-row-sub">Floor:<em>{r.market.floor}</em></span>
                                    <span className="starred-row-sub">Last:<em>{r.market.lastSale}</em></span>
                                    <span className="starred-row-sub">Trait</span>
                                </div>
                                <div className="starred-row-actions">
                                    <span
                                        className="starred-row-cta trait-offer-cta"
                                        role="button"
                                        tabIndex={0}
                                        title="Make a trait offer (coming soon)"
                                        aria-label="Make a trait offer"
                                        onClick={() => showToast('Trait Offer: COMING SOON')}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showToast('Trait Offer: COMING SOON'); } }}
                                    >
                                        <span className="trait-offer-glyph">✦︎</span> Trait Offer
                                    </span>
                                    <span
                                        className="starred-row-unstar"
                                        role="button"
                                        tabIndex={0}
                                        title="Remove from Starred"
                                        aria-label="Remove from Starred"
                                        onClick={(e) => handleTraitUnstar(e, r)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTraitUnstar(e as unknown as React.MouseEvent, r); } }}
                                    >
                                        ✕&#xFE0E;
                                    </span>
                                </div>
                                <GrailDot
                                    pinned={grailKeys.has(grailKey({ kind: 'trait', slug: r.slug, category: r.category, value: r.value }))}
                                    onToggle={() => handleGrail({ kind: 'trait', slug: r.slug, category: r.category, value: r.value })}
                                />
                            </div>
                            );
                        })}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('artists') && (
                    <>
                        {typeHdr && visibleArtists.length > 0 && <div className="starred-group-header">Artists</div>}
                        {artistSections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className="starred-group-header">{sec.label}</div>}
                                {sec.rows.map((r) => (
                                    <StarredArtistRow
                                        key={r.name}
                                        name={r.name}
                                        handle={r.handle}
                                        viewerAddress={viewerAddress}
                                        multiActive={multiActive}
                                        selected={selected.has(r.name)}
                                        onToggleSel={() => toggleSel(r.name)}
                                        onUnstar={(e) => handleArtistUnstar(e, r.name)}
                                        grailPinned={grailKeys.has(grailKey({ kind: 'artist', slug: r.handle }))}
                                        onGrail={() => handleGrail({ kind: 'artist', slug: r.handle })}
                                        variant="artist"
                                        sprite={artistSprite(r.handle)}
                                    />
                                ))}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('collectors') && (
                    <>
                        {typeHdr && visibleCollectors.length > 0 && <div className="starred-group-header">Collectors</div>}
                        {collectorSections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className="starred-group-header">{sec.label}</div>}
                                {sec.rows.map((r) => (
                                    <StarredArtistRow
                                        key={r.name}
                                        name={r.name}
                                        handle={r.handle}
                                        viewerAddress={viewerAddress}
                                        multiActive={multiActive}
                                        selected={selected.has(r.name)}
                                        onToggleSel={() => toggleSel(r.name)}
                                        onUnstar={(e) => handleArtistUnstar(e, r.name)}
                                        grailPinned={grailKeys.has(grailKey({ kind: 'artist', slug: r.handle }))}
                                        onGrail={() => handleGrail({ kind: 'artist', slug: r.handle })}
                                        variant="collector"
                                        sprite={artistSprite(r.handle)}
                                    />
                                ))}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('soundtracks') && (
                    <>
                        {typeHdr && visibleSoundtracks.length > 0 && <div className="starred-group-header">Soundtracks</div>}
                        {soundtrackSections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className="starred-group-header">{sec.label}</div>}
                                {sec.rows.map((r) => {
                            const selKey = `${r.slug}|${r.playlistId}`;
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row has-actions-abs${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role={multiActive ? 'button' : undefined}
                                tabIndex={multiActive ? 0 : undefined}
                                onClick={multiActive ? () => toggleSel(selKey) : undefined}
                                onKeyDown={multiActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSel(selKey); } } : undefined}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph soundtrack-tile-glyph" style={{ color: projectColorway(r.slug) ?? undefined }}>▶&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">@{r.slug}</span>
                                    <span className="starred-row-sub">♫&#xFE0E; <em>{getProject(r.slug)?.soundtrack?.label ?? r.title}</em></span>
                                    <span className="starred-row-sub srl-by">{getProject(r.slug)?.artistHandle ? `by: @${getProject(r.slug)!.artistHandle}` : '\u00A0'}</span>
                                    <span className="starred-row-sub">Soundtrack</span>
                                </div>
                                <div className="starred-row-actions">
                                    <span
                                        className="starred-row-cta"
                                        role="button"
                                        tabIndex={0}
                                        title="Play on YouTube"
                                        aria-label="Play"
                                        onClick={() => window.open(playlistWatchUrl(r.playlistId), '_blank', 'noopener,noreferrer')}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(playlistWatchUrl(r.playlistId), '_blank', 'noopener,noreferrer'); } }}
                                    >
                                        ▶︎ Play
                                    </span>
                                    <span
                                        className="starred-row-unstar"
                                        role="button"
                                        tabIndex={0}
                                        title="Remove from Starred"
                                        aria-label="Remove from Starred"
                                        onClick={(e) => handleSoundtrackUnstar(e, r)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSoundtrackUnstar(e as unknown as React.MouseEvent, r); } }}
                                    >
                                        ✕&#xFE0E;
                                    </span>
                                </div>
                                <GrailDot
                                    pinned={grailKeys.has(grailKey({ kind: 'soundtrack', slug: r.slug, playlistId: r.playlistId, title: r.title }))}
                                    onToggle={() => handleGrail({ kind: 'soundtrack', slug: r.slug, playlistId: r.playlistId, title: r.title })}
                                />
                            </div>
                            );
                        })}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('projects') && (
                    <>
                        {typeHdr && visibleProjects.length > 0 && <div className="starred-group-header">Projects</div>}
                        {projectSections.map((sec) => (
                            <Fragment key={sec.key}>
                                {sec.label != null && <div className="starred-group-header">{sec.label}</div>}
                                {sec.rows.map((r) => {
                            const selKey = `p:${r.slug}`;
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row has-actions-abs${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={multiActive ? () => toggleSel(selKey) : () => router.push('/art/' + r.slug)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); multiActive ? toggleSel(selKey) : router.push('/art/' + r.slug); } }}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph history-pj-glyph" style={{ color: r.color }}>⬚&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">@{r.slug}<ProjectNameBadges slug={r.slug} /></span>
                                    <span className="starred-row-sub">Floor:<em>{r.market.floor}</em></span>
                                    <span className="starred-row-sub">Last:<em>{r.market.lastSale}</em></span>
                                    <span className="starred-row-sub">Project <span className="id-row-sprite">{projectSpriteFace(r.slug)}</span></span>
                                </div>
                                <div className="starred-row-actions">
                                    <span
                                        className="starred-row-cta trait-offer-cta project-offer-cta"
                                        role="button"
                                        tabIndex={0}
                                        title="Make a project offer (coming soon)"
                                        aria-label="Make a project offer"
                                        onClick={(e) => { e.stopPropagation(); showToast('Project Offer: COMING SOON'); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); showToast('Project Offer: COMING SOON'); } }}
                                    >
                                        <span className="trait-offer-glyph">✦︎</span> Project<br />Offer
                                    </span>
                                    <span
                                        className="starred-row-unstar"
                                        role="button"
                                        tabIndex={0}
                                        title="Remove from Starred"
                                        aria-label="Remove from Starred"
                                        onClick={(e) => { e.stopPropagation(); askRemove('Remove this project from your Starred list?', () => { removeProjectStar(r.slug); showToast('Removed from your Starred Projects List'); }); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); askRemove('Remove this project from your Starred list?', () => { removeProjectStar(r.slug); showToast('Removed from your Starred Projects List'); }); } }}
                                    >
                                        ✕&#xFE0E;
                                    </span>
                                </div>
                                <GrailDot
                                    pinned={grailKeys.has(grailKey({ kind: 'project', slug: r.slug }))}
                                    onToggle={() => handleGrail({ kind: 'project', slug: r.slug })}
                                />
                            </div>
                            );
                        })}
                            </Fragment>
                        ))}
                    </>
                )}
                {showType('tx') && (
                    <>
                        {typeHdr && visibleTx.length > 0 && <div className="starred-group-header">Tx</div>}
                        {visibleTx.map((r) => {
                            const selKey = `tx:${r.star.id}`;
                            /* Colour the tile by the transacting wallet's generative
                               colorway — the SAME source as the starred artist/collector
                               tiles. The wallet credited on the row (recipient for
                               MINT/SALE, sender for LIST/XFER). No @name → no colour. */
                            const txActorHandle = (r.star.type === 'MINT' || r.star.type === 'SALE') ? r.star.toHandle : r.star.fromHandle;
                            /* The token this transaction concerns — slug parsed off
                               the `${slug}-${localId}` tokenId (slugs may contain a
                               hyphen, so split on the LAST one). Drives the pin label. */
                            const txTokenSlug = r.star.tokenId ? r.star.tokenId.slice(0, r.star.tokenId.lastIndexOf('-')) : '';
                            const txPin: GrailPin = { kind: 'tx', slug: txTokenSlug, tx: r.star };
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row has-actions-abs${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role={multiActive ? 'button' : undefined}
                                tabIndex={multiActive ? 0 : undefined}
                                onClick={multiActive ? () => toggleSel(selKey) : undefined}
                                onKeyDown={multiActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSel(selKey); } } : undefined}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph" style={txActorHandle ? { color: artistColor(txActorHandle) } : undefined}>{r.fe.icon}&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">{r.fe.detail}</span>
                                    <span className="starred-row-sub">{r.fe.type} · {r.fe.time}</span>
                                    <span className="starred-row-sub">{r.fe.price ? <>Price:<em>{r.fe.price} ETH</em></> : ' '}</span>
                                    <span className="starred-row-sub">Transaction</span>
                                </div>
                                <div className="starred-row-actions">
                                    <span
                                        className="starred-row-unstar"
                                        role="button"
                                        tabIndex={0}
                                        title="Remove from Starred"
                                        aria-label="Remove from Starred"
                                        onClick={(e) => handleTxUnstar(e, r.star.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTxUnstar(e as unknown as React.MouseEvent, r.star.id); } }}
                                    >
                                        ✕&#xFE0E;
                                    </span>
                                </div>
                                <GrailDot
                                    pinned={grailKeys.has(grailKey(txPin))}
                                    onToggle={() => handleGrail(txPin)}
                                />
                            </div>
                            );
                        })}
                    </>
                )}
                {totalVisible === 0 && <GhostRows variant="starred" />}
            </div>
            {multiActive && (
                <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
                    <div className="ms-float-wrap">
                        <button
                            className="ms-float-action"
                            onClick={handleRemoveSelected}
                            disabled={selected.size === 0}
                        >
                            <span className="ms-float-label">Remove</span>
                        </button>
                    </div>
                    <div className="ms-float-count">
                        {selected.size === 0 ? 'Select items' : `${selected.size} selected`}
                    </div>
                </div>
            )}
            {confirm && (
                <div
                    className="starred-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setConfirm(null)}
                >
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">{confirm.question}</div>
                        <div className="ms-confirm-btns">
                            <button
                                className="ms-confirm-btn ms-confirm-btn--cancel"
                                onClick={() => setConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

/* The grail-pin toggle that sits ABOVE the ✕ on every starred row — a plain
   icon (no button), the same size as the ✕ (Brendon 2026-06-19). Tapping it
   pins/unpins the row's item so it rides the top-bar pills. */
function GrailDot({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
    return (
        <span
            className={`starred-row-grail${pinned ? ' is-pinned' : ''}`}
            role="button"
            tabIndex={0}
            title={pinned ? 'Unpin from your Grail pins' : 'Grail Pin'}
            aria-label={pinned ? 'Unpin from your Grail pins' : 'Grail Pin'}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle(); } }}
        >
            {'⟟︎'}
        </span>
    );
}

/* One starred Output row. Lives inside a ProjectProvider (grouped by slug) so it
   reads its OWN live listing price: listed → a filled Buy CTA showing the price
   (works the moment a piece is fake-listed); not listed → the Add-to-Wishlist
   CTA. Trait values fill the meta lines either way. */
function StarredOutputRow({
    slug,
    id,
    timeline = false,
    project,
    artist,
    extraPairs,
    fate,
    wished,
    multiActive,
    selected,
    onToggleSel,
    onOpen,
    onWishlist,
    onOffer,
    onUnstar,
    grailPinned,
    onGrail,
}: {
    slug: string;
    id: number;
    timeline?: boolean;
    project: string;
    artist: string;
    extraPairs: { k: string; v: string }[];
    fate: string;
    wished: boolean;
    multiActive: boolean;
    selected: boolean;
    onToggleSel: () => void;
    onOpen: () => void;
    onWishlist: (e: React.MouseEvent) => void;
    /** History rows swap the Wishlist CTA for an Offer CTA (Brendon 2026-06-27). */
    onOffer?: () => void;
    onUnstar: (e: React.MouseEvent) => void;
    grailPinned: boolean;
    onGrail: () => void;
}) {
    const meta = useOutputMeta(id);
    const listed = meta?.price != null;
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const { openOutputNoteEditor } = useNotePrompt();

    /* Top-line state flags. The ⊟ note glyph shows in EVERY list (History,
       Wishlist, Starred) when the viewer has a note. The ★ shows only in History
       (the timeline) — Starred rows are already starred, so it'd be redundant —
       and rides before the note. Long-press stars the piece (History only here;
       Wishlist has its own). Both update live. */
    const [starred, setStarred] = useState(false);
    useEffect(() => {
        if (!timeline) return;
        setStarred(isStarred(slug, id));
        return subscribeStarred(() => setStarred(isStarred(slug, id)));
    }, [timeline, slug, id]);
    const note = useTokenNote(id);
    const hasNote = note.trim().length > 0 && !!siweAddress;

    const lp = useStarLongPress(() => {
        const r = toggleStar(slug, id);
        showToast(r === 'starred' ? 'Added to your Starred Outputs List' : 'Removed from your Starred Outputs List');
        return r === 'starred';
    });

    const act = () => {
        if (lp.longFired.current) { lp.longFired.current = false; return; }
        multiActive ? onToggleSel() : onOpen();
    };
    const row = (
        <div
            className={`starred-row has-actions-abs${multiActive && selected ? ' is-selected' : ''}${timeline ? ' is-timeline' : ''}`}
            role="button"
            tabIndex={0}
            /* Stamped so the artwork modal's arrows walk this list AS SHOWN
               (Starred Outputs / History order) — same as a grid (Brendon
               2026-06-26). */
            data-slug={slug}
            data-mint-id={id}
            style={timeline ? { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' } : undefined}
            onClick={act}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}
            {...(timeline ? lp.handlers : {})}
        >
            <OutputThumb slug={slug} id={id} size={timeline ? 51 : 64} crop={timeline} />
            <div className="starred-row-meta">
                <span className="starred-row-id is-split">
                    <span className="srl-handle">{project}</span>
                    <span className="srl-suffix">#{id}</span>
                    {starred && <span className="srl-flag srl-flag-star" aria-label="Starred">★&#xFE0E;</span>}
                    {hasNote && (
                        <span
                            className="meta-note-ic"
                            role="button"
                            tabIndex={0}
                            title="Open note"
                            aria-label="Open note"
                            onClick={(e) => { e.stopPropagation(); openOutputNoteEditor(id); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openOutputNoteEditor(id); } }}
                        >
                            {'⊟︎'}
                        </span>
                    )}
                    {lp.floatId > 0 && <span key={lp.floatId} className={`project-name-star-float${lp.floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>}
                </span>
                {!timeline && (
                <span className="starred-row-sub srl-redact">
                    {extraPairs.length > 0
                        ? extraPairs.map((p, i) => (
                            <Fragment key={p.k}>{i > 0 ? ' · ' : ''}{p.k}: <em>{p.v}</em></Fragment>
                          ))
                        : (fate || ' ')}
                </span>
                )}
                <span className="starred-row-sub srl-by">{artist ? `by: ${artist}` : ' '}</span>
                <span className="starred-row-sub">Output</span>
            </div>
            <div className="starred-row-actions">
                {listed ? (
                    <span
                        className="starred-row-cta is-buy"
                        role="button"
                        tabIndex={0}
                        title={`Buy — ${meta!.price}`}
                        aria-label={`Buy for ${meta!.price}`}
                        onClick={(e) => { e.stopPropagation(); onOpen(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen(); } }}
                    >
                        {`▢︎ Buy ${meta!.price}`}
                    </span>
                ) : timeline ? (
                    <span
                        className="starred-row-cta trait-offer-cta"
                        role="button"
                        tabIndex={0}
                        title="Make an offer (coming soon)"
                        aria-label="Make an offer"
                        onClick={(e) => { e.stopPropagation(); onOffer?.(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOffer?.(); } }}
                    >
                        <span className="trait-offer-glyph">✦︎</span> Offer
                    </span>
                ) : (
                    <span
                        className={`starred-row-cta${wished ? ' is-on' : ''}`}
                        role="button"
                        tabIndex={0}
                        title={wished ? 'On your wishlist' : 'Add to wishlist'}
                        aria-label={wished ? 'On your wishlist' : 'Add to wishlist'}
                        onClick={onWishlist}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWishlist(e as unknown as React.MouseEvent); } }}
                    >
                        {wished ? '✛︎ Wishlisted' : '✛︎ Wishlist'}
                    </span>
                )}
                <span
                    className="starred-row-unstar"
                    role="button"
                    tabIndex={0}
                    title="Remove from Starred"
                    aria-label="Remove from Starred"
                    onClick={onUnstar}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUnstar(e as unknown as React.MouseEvent); } }}
                >
                    ✕&#xFE0E;
                </span>
            </div>
            <GrailDot pinned={grailPinned} onToggle={onGrail} />
        </div>
    );
    if (!timeline) return row;
    /* History timeline — the SAME markup as the homepage activity feed: a glyph
       node on the rail, a dashed line connecting it to the next node, and the
       output item (thumb + data + CTA) filling the content lane full-width. */
    return (
        <div className="feed-row history-feed-row">
            <div className="feed-line" />
            <div className="f-icon-wrap" aria-hidden="true">⬚&#xFE0E;</div>
            <div className="f-content history-feed-content">{row}</div>
        </div>
    );
}

/* One PROJECT visit on the History timeline — the Starred Projects card (the
   projects icon ⬚ in the project's colorway, @slug, floor/last, Project + sprite)
   adapted to the History style: a glyph node on the rail, dashed line to the
   next, and a trimmed card (no Offer CTA — History only carries the remove ✕).
   Tapping the row opens the project page. */
function StarredProjectHistoryRow({
    slug,
    color,
    floor,
    lastSale,
    multiActive,
    selected,
    onToggleSel,
    onOpen,
    onOffer,
    onUnstar,
    grailPinned,
    onGrail,
}: {
    slug: string;
    color: string;
    floor: string;
    lastSale: string;
    multiActive: boolean;
    selected: boolean;
    onToggleSel: () => void;
    onOpen: () => void;
    onOffer: () => void;
    onUnstar: (e: React.MouseEvent) => void;
    grailPinned: boolean;
    onGrail: () => void;
}) {
    const { showToast } = useToast();
    const [starred, setStarred] = useState(false);
    useEffect(() => {
        setStarred(isProjectStarred(slug));
        return subscribeProjectStars(() => setStarred(isProjectStarred(slug)));
    }, [slug]);
    const lp = useStarLongPress(() => {
        const r = toggleProjectStar(slug);
        showToast(r === 'starred' ? 'Added to your Starred Projects List' : 'Removed from your Starred Projects List');
        return r === 'starred';
    });
    const act = () => {
        if (lp.longFired.current) { lp.longFired.current = false; return; }
        multiActive ? onToggleSel() : onOpen();
    };
    const card = (
        <div
            className={`starred-row has-actions-abs is-timeline${multiActive && selected ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            onClick={act}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}
            {...lp.handlers}
        >
            <div className="trait-row-tile artist-tile">
                <span className="artist-row-tile-glyph history-pj-glyph" style={{ color }}>⬚&#xFE0E;</span>
            </div>
            <div className="starred-row-meta">
                <span className="starred-row-id">
                    @{slug}
                    {starred && <span className="srl-flag srl-flag-star" aria-label="Starred">★&#xFE0E;</span>}
                    <ProjectNameBadges slug={slug} />
                    {lp.floatId > 0 && <span key={lp.floatId} className={`project-name-star-float${lp.floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>}
                </span>
                <span className="starred-row-sub">Floor:<em>{floor}</em></span>
                <span className="starred-row-sub">Last:<em>{lastSale}</em></span>
                <span className="starred-row-sub">Project</span>
            </div>
            <div className="starred-row-actions">
                <span
                    className="starred-row-cta trait-offer-cta project-offer-cta"
                    role="button"
                    tabIndex={0}
                    title="Make a project offer (coming soon)"
                    aria-label="Make a project offer"
                    onClick={(e) => { e.stopPropagation(); onOffer(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOffer(); } }}
                >
                    <span className="trait-offer-glyph">✦︎</span> Project<br />Offer
                </span>
                <span
                    className="starred-row-unstar"
                    role="button"
                    tabIndex={0}
                    title="Remove from History"
                    aria-label="Remove from History"
                    onClick={onUnstar}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUnstar(e as unknown as React.MouseEvent); } }}
                >
                    ✕&#xFE0E;
                </span>
            </div>
            <GrailDot pinned={grailPinned} onToggle={onGrail} />
        </div>
    );
    return (
        <div className="feed-row history-feed-row">
            <div className="feed-line" />
            <div className="f-icon-wrap history-pj-glyph" aria-hidden="true" style={{ color }}>⬚&#xFE0E;</div>
            <div className="f-content history-feed-content">{card}</div>
        </div>
    );
}

function StarredArtistRow({
    name,
    handle,
    viewerAddress,
    multiActive,
    selected,
    onToggleSel,
    onUnstar,
    grailPinned,
    onGrail,
    variant = 'artist',
    sprite = null,
}: {
    name: string;
    handle: string;
    viewerAddress?: string | null;
    multiActive: boolean;
    selected: boolean;
    onToggleSel: () => void;
    onUnstar: (e: React.MouseEvent) => void;
    grailPinned: boolean;
    onGrail: () => void;
    variant?: 'artist' | 'collector';
    sprite?: string | null;
}) {
    const { showToast } = useToast();
    const router = useRouter();
    const { count, rel, address } = useArtistSocial(handle, viewerAddress);
    const projectCount = useMemo(() => projectsByArtist(handle).length, [handle]);
    const relGlyph = relGlyphOf(rel);
    const relLabel = relLabelOf(rel);
    // In-app route to the canonical bare handle (strip any leading @, which
    // would 301-redirect through a blank hop — the white-wall family).
    const act = () => (multiActive ? onToggleSel() : router.push('/' + handle.replace(/^@/, '')));

    /* Follow / unfollow — the SAME flow as the profile Follow button
       (/api/follows, @name-keyed, fires pd:follows-changed). Following state
       seeds from the social relationship and flips on tap. */
    const [following, setFollowing] = useState(rel === 'mutual' || rel === 'following');
    const [followBusy, setFollowBusy] = useState(false);
    useEffect(() => { setFollowing(rel === 'mutual' || rel === 'following'); }, [rel]);
    const toggleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (followBusy) return;
        const me = (viewerAddress ?? '').toLowerCase();
        if (!me) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
        if (!address) { showToast(`@${handle}: NO @NAME YET`); return; }
        setFollowBusy(true);
        try {
            if (following) {
                const r = await fetch(`/api/follows?target=${address}`, { method: 'DELETE' });
                if (r.ok) { setFollowing(false); showToast(`@${handle}: UNFOLLOWED`); window.dispatchEvent(new Event('pd:follows-changed')); }
                else showToast('Unfollow: FAILED');
            } else {
                const r = await fetch('/api/follows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: address }) });
                if (r.status === 201) { setFollowing(true); showToast(`@${handle}: FOLLOWED`); window.dispatchEvent(new Event('pd:follows-changed')); }
                else if (r.status === 204) showToast(`@${handle}: NO @NAME YET`);
                else showToast('Follow: FAILED');
            }
        } finally { setFollowBusy(false); }
    };

    return (
        <div
            className={`starred-row has-actions-abs${multiActive && selected ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={act}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}
        >
            <div className="trait-row-tile artist-tile">
                <span className="artist-row-tile-glyph" style={{ color: artistColor(handle) }}>{variant === 'collector' ? '☻︎' : '✺︎'}</span>
            </div>
            <div className="starred-row-meta">
                <span className="starred-row-id">
                    {name}
                    {variant === 'artist' && <span className="artist-tag" aria-label="artist">{'✺︎'}</span>}
                    {relGlyph && <span className={`artist-social-ico ${rel === 'mutual' ? 'is-mutual-lg' : 'is-bump'}`} title={relLabel} aria-label={relLabel}>{relGlyph}</span>}
                    {count != null && count > 0 && (
                        <span className="follower-count">{fmtFollowers(count)}</span>
                    )}
                </span>
                {variant === 'collector' ? (
                    <>
                        <span className="starred-row-sub">Top buy:<em>{collectorTopBuy(handle)}</em></span>
                        <span className="starred-row-sub">{artistProjectsOwned(handle) ?? collectorProjectsOwned(handle)} projects owned</span>
                    </>
                ) : (
                    <>
                        <span className="starred-row-sub">Floor:<em>{artistFloor(handle) ?? '—'}</em></span>
                        <span className="starred-row-sub">{projectCount} {projectCount === 1 ? 'project' : 'projects'}</span>
                    </>
                )}
                <span className="starred-row-sub">{variant === 'collector' ? 'Collector' : 'Artist'}{sprite ? ' ' + sprite : ''}</span>
            </div>
            <div className="starred-row-actions">
                <span
                    className={`starred-row-cta${following ? ' is-on' : ''}`}
                    role="button"
                    tabIndex={0}
                    title={following ? `Unfollow @${handle}` : `Follow @${handle}`}
                    aria-label={following ? 'Unfollow' : 'Follow'}
                    onClick={toggleFollow}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFollow(e as unknown as React.MouseEvent); } }}
                >
                    {followBusy ? '⚯︎ …' : following ? '⚯︎ Following' : '⚯︎ Follow'}
                </span>
                <span
                    className="starred-row-unstar"
                    role="button"
                    tabIndex={0}
                    title="Remove from Starred"
                    aria-label="Remove from Starred"
                    onClick={onUnstar}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUnstar(e as unknown as React.MouseEvent); } }}
                >
                    ✕&#xFE0E;
                </span>
            </div>
            <GrailDot pinned={grailPinned} onToggle={onGrail} />
        </div>
    );
}
