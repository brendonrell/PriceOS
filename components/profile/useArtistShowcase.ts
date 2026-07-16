'use client';

/*
 * useArtistShowcase — everything behind the Artist-style Showcase tab:
 * the artist's own projects enriched with live ledger stats, the local
 * showcase sort, facet/search/price filtering, the Created lifecycle feed,
 * the Created/Top-6 view toggle, and the Gen Curated set builder. Split
 * out of ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import { useEffect, useMemo, useState } from 'react';
import { getProject, projectsByArtist, projectTraits } from '../../lib/project/registry';
import {
    projectFacetValueOf,
    type EnrichedProject,
    type HomeSortKey,
    type HomeSortDir,
} from '../home/HomeProjectFacetBar';
import { FEED_LIFECYCLE, FEED_SEQ, milestoneByKey } from '../../lib/home/milestones';
import { effectiveShowcaseStyle } from '../../lib/profile/showcaseStyle';
import { genCuratedSet, type CuratedCandidate, type SpriteVibe } from '../../lib/profile/genCurated';
import { resolveBucket, resolveFingerprint, resolveStoredTraits } from '../../lib/art/colorStore';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';
import type { EnrichedHolding } from './ProfileFacetBar';
import {
    ARTIST_SHOWCASE_FACETS,
    type ArtistFeedItem,
    type ArtistProjStat,
    type ShowcaseView,
} from './profilePageShared';

export function useArtistShowcase({
    onShowcase,
    artistStatus,
    user,
    handle,
    showcaseStyleVal,
    enriched,
    dActiveFilters,
    dSearchQuery,
    dPriceMin,
    dPriceMax,
}: {
    onShowcase: boolean;
    artistStatus: 'active' | 'cooldown' | null;
    user: UserProfileData;
    handle: string;
    showcaseStyleVal: UserProfileData['showcase_style'];
    enriched: EnrichedHolding[];
    dActiveFilters: Record<string, ReadonlySet<string>>;
    dSearchQuery: string;
    dPriceMin: string;
    dPriceMax: string;
}) {
    /* Artist Showcase (Brendon, 2026-06-15): a whitelisted artist's Showcase
       tab becomes the home Now-Minting view, scoped to their own projects, when
       their showcase style is 'artist' (the default once whitelisted). Created ·
       Top 6 lead the facet row in place of Artist + Project. Artists who keep
       the traditional Top-6 instead get a Created sub-tab under +More. */
    const isArtist = !!artistStatus;
    const artistProjects = useMemo(
        () => (isArtist ? projectsByArtist(user.handle ?? handle) : []),
        [isArtist, user.handle, handle],
    );
    const hasCreated = artistProjects.length > 0;

    const effStyle = effectiveShowcaseStyle(showcaseStyleVal, isArtist, user.address);
    /* An artist with ≥1 project keeps the Created · Top 6 toggle on EVERY style
       (Brendon 2026-06-20). 'artist' style lands on Created; Static / Generative
       / Gen Curated land on Top 6 — the Created pill stays to its left either
       way. So Created lives in the showcase toggle now, never under +More. */
    const artistMode = onShowcase && isArtist && hasCreated;
    const createdUnderMore = false;

    /* Created vs Top 6 toggle. Default follows the style: Artist → Created,
       the three Top-6 styles → Top 6. Re-defaults whenever the style changes. */
    const [showcaseView, setShowcaseView] = useState<ShowcaseView>('created');
    useEffect(() => {
        setShowcaseView(effStyle === 'artist' ? 'created' : 'regular');
    }, [effStyle]);
    const artistShowcaseCreated = artistMode && showcaseView === 'created';

    /* The set of artist @handles this profile FOLLOWS — lets Gen Curated build
       "From the Feed" (pieces by artists they follow). Only fetched while the
       gen-curated showcase is actually showing. */
    const [ownerFollowing, setOwnerFollowing] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => {
        if (!(onShowcase && effStyle === 'gen-curated') || !user.address) return;
        let cancelled = false;
        fetch(`/api/follows/${user.address.toLowerCase()}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d?.following_handles) return;
                setOwnerFollowing(new Set((d.following_handles as string[]).map((h) => h.replace(/^@/, '').toLowerCase())));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [onShowcase, effStyle, user.address]);

    /* Gen Curated — when this profile runs the gen-curated showcase style, build
       a fresh themed pull from the owner's WHOLE collection (re-rolled each
       mount). The PriceSprite vibe + @handle let the sprite curate in character.
       colorsVer re-rolls once the captured colours hydrate. */
    /* Manual re-curate — tapping the set's placard draws a fresh recipe
       (2026-07-16 wow pass). A deliberate user action, unlike the async-dep
       re-shuffle this memo's note below forbids. */
    const [genRoll, setGenRoll] = useState(0);
    const recurate = () => setGenRoll((n) => n + 1);

    const genCurated = useMemo(() => {
        if (!onShowcase || effStyle !== 'gen-curated') return null;
        const pool: CuratedCandidate[] = enriched.map((h) => {
            const fp = resolveFingerprint(h.slug, h.token_id);
            const mintedAt = resolveStoredTraits(h.slug, h.token_id)?.mintedAt ?? null;
            const mintMs = mintedAt ? Date.parse(mintedAt) : null;
            return {
                slug: h.slug,
                id: h.token_id,
                color: resolveBucket(h.slug, h.token_id),
                /* Artist trait is the @handle (an @name) — keep it. Project trait
                   is slug-based (@slug), so use the project's REAL display name
                   instead; never surface a slug (Brendon 2026-06-20). */
                artist: h.traits.Artist,
                project: getProject(h.slug)?.displayName ?? undefined,
                sun: h.traits.Sun,
                moon: h.traits.Moon,
                rising: h.traits.Rising,
                priceDay: h.traits.PriceDay,
                fate: h.traits.Fate,
                listed: h.listed,
                aspect: fp?.aspect ?? undefined,
                brightness: fp?.brightness ?? undefined,
                saturation: fp?.saturation ?? undefined,
                complexity: fp?.complexity ?? undefined,
                following: ownerFollowing.has((h.traits.Artist ?? '').replace(/^@/, '').toLowerCase()),
                mintMs: Number.isFinite(mintMs as number) ? mintMs : null,
            };
        });
        return genCuratedSet(pool, {
            vibe: (user.price_sprite as SpriteVibe | null) ?? null,
            handle: user.handle ?? handle,
        });
        // Build ONCE per entry into gen-curated. Deliberately NOT re-rolling when
        // follows / captured colours arrive async — those late deps were what made
        // the set visibly re-shuffle a second time after one tap (Brendon,
        // 2026-06-24). It reads whatever following/colour data is loaded at build.
        // genRoll is the one extra trigger: the user's own placard tap.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onShowcase, effStyle, enriched, genRoll]);

    /* Live per-project stats for this artist's projects (birth time, mint
       count, graduation, sold-out, milestones) — the ledger timestamps the
       registry can't carry, feeding the showcase facets / sort / feed. */
    const [artistProjStats, setArtistProjStats] = useState<Record<string, ArtistProjStat>>({});
    useEffect(() => {
        if (!isArtist) { setArtistProjStats({}); return; }
        let cancelled = false;
        const load = () =>
            fetch(`/api/artist/${user.address.toLowerCase()}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { projects?: Array<ArtistProjStat & { id: string }> } | null) => {
                    if (cancelled || !d?.projects) return;
                    const m: Record<string, ArtistProjStat> = {};
                    for (const p of d.projects) {
                        m[p.id] = {
                            minted_count: p.minted_count ?? 0,
                            uploaded_at: p.uploaded_at ?? null,
                            reached_at: p.reached_at ?? null,
                            sold_out_at: p.sold_out_at ?? null,
                            milestones: p.milestones ?? {},
                        };
                    }
                    setArtistProjStats(m);
                })
                .catch(() => {});
        load();
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onRefresh); };
    }, [isArtist, user.address]);

    /* Each project enriched with computed birth-traits + live Status + mint
       price — the project-level analogue of an Output's traits (same model the
       home Now-Minting view uses). */
    const enrichedArtistProjects = useMemo<EnrichedProject[]>(
        () => artistProjects.map((p) => {
            const st = artistProjStats[p.slug];
            return {
                slug: p.slug,
                title: p.displayName,
                mintPriceEth: p.mintPriceEth,
                minted: st?.minted_count ?? 0,
                birthMs: st?.uploaded_at ?? null,
                reachedMs: st?.reached_at ?? null,
                traits: projectTraits(p.slug, st?.uploaded_at ?? undefined, st?.minted_count),
            };
        }),
        [artistProjects, artistProjStats],
    );

    /* Showcase sort — LOCAL (off the global SortContext), same model as home. */
    const [mintSort, setMintSort] = useState<{ key: HomeSortKey; dir: HomeSortDir }>({ key: 'date', dir: 'desc' });
    const onMintSort = (key: HomeSortKey) =>
        setMintSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: key === 'price' || key === 'az' ? 'asc' : 'desc' },
        );
    const applyMintSort = (key: HomeSortKey, dir: HomeSortDir) => setMintSort({ key, dir });

    /* Filter + sort the artist's projects by the showcase facets / search /
       mint-price range — the home Now-Minting predicate, scoped to one artist. */
    const visibleArtistProjects = useMemo<EnrichedProject[]>(() => {
        const minV = parseFloat(dPriceMin);
        const maxV = parseFloat(dPriceMax);
        const hasMin = !Number.isNaN(minV);
        const hasMax = !Number.isNaN(maxV);
        const q = dSearchQuery.trim().toLowerCase();
        // Only this view's own facets — so a filter left over from the Collected
        // tab (Artist/Project) can't wipe the showcase (shared TraitsContext).
        const showcaseFacets = ARTIST_SHOWCASE_FACETS as readonly string[];
        const activeCats = Object.keys(dActiveFilters).filter(
            (c) => dActiveFilters[c].size > 0 && showcaseFacets.includes(c),
        );
        const filtered = enrichedArtistProjects.filter((p) => {
            for (const cat of activeCats) {
                const v = projectFacetValueOf(cat, p);
                if (v === undefined || !dActiveFilters[cat].has(v)) return false;
            }
            if (q && !`${p.traits.Project ?? ''} ${p.title}`.toLowerCase().includes(q)) return false;
            if (hasMin && p.mintPriceEth < minV) return false;
            if (hasMax && p.mintPriceEth > maxV) return false;
            return true;
        });
        const dirMult = mintSort.dir === 'asc' ? 1 : -1;
        if (mintSort.key === 'price') {
            filtered.sort((a, b) => (a.mintPriceEth - b.mintPriceEth) * dirMult || a.slug.localeCompare(b.slug));
        } else if (mintSort.key === 'az') {
            filtered.sort((a, b) => a.title.localeCompare(b.title) * dirMult || a.slug.localeCompare(b.slug));
        } else {
            filtered.sort((a, b) => ((a.reachedMs ?? -Infinity) - (b.reachedMs ?? -Infinity)) * dirMult || a.slug.localeCompare(b.slug));
        }
        return filtered;
    }, [enrichedArtistProjects, dActiveFilters, dSearchQuery, dPriceMin, dPriceMax, mintSort]);

    /* Activity feed for the showcase Created view (FEED sort) — the artist's
       project lifecycle moments (uploaded · milestones · graduated · sold out). */
    const artistFeedView = useMemo<ArtistFeedItem[]>(() => {
        const items: ArtistFeedItem[] = [];
        const push = (slug: string, title: string, label: string, glyph: string, cls: string | undefined, ms: number | null, seq: number) => {
            if (ms == null) return;
            items.push({ slug, title, label, glyph, cls, ts: ms, seq });
        };
        const L = FEED_LIFECYCLE;
        for (const p of artistProjects) {
            const st = artistProjStats[p.slug];
            if (!st) continue;
            push(p.slug, p.displayName, L.upload.label, L.upload.glyph, undefined, st.uploaded_at, FEED_SEQ.upload);
            for (const [count, ts] of Object.entries(st.milestones)) {
                const m = milestoneByKey(count);
                if (m) push(p.slug, p.displayName, m.label, m.glyph, m.cls, ts, m.count);
            }
            push(p.slug, p.displayName, L.graduated.label, L.graduated.glyph, L.graduated.cls, st.reached_at, FEED_SEQ.graduated);
            push(p.slug, p.displayName, L.ascension.label, L.ascension.glyph, undefined, st.sold_out_at, FEED_SEQ.ascension);
        }
        const dirMult = mintSort.dir === 'asc' ? 1 : -1;
        // Order by time, then by the milestone sequence so same-transaction
        // events (identical ts) still read FIRST BLOOD → GRADUATED → … in order.
        items.sort((a, b) => (a.ts - b.ts || a.seq - b.seq) * dirMult);
        return items;
    }, [artistProjects, artistProjStats, mintSort.dir]);

    return {
        isArtist,
        artistProjects,
        hasCreated,
        effStyle,
        artistMode,
        createdUnderMore,
        showcaseView,
        setShowcaseView,
        artistShowcaseCreated,
        genCurated,
        recurate,
        enrichedArtistProjects,
        mintSort,
        onMintSort,
        applyMintSort,
        visibleArtistProjects,
        artistFeedView,
    };
}
