'use client';

/*
 * useStarredPins — every pin-store subscription the profile page reads
 * (Starred outputs/traits/artists/soundtracks/txs/projects + Wishlist),
 * plus the live minted-count guard that drops phantom pins. Split out of
 * ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import { useEffect, useMemo, useState } from 'react';
import { getStarredItems, subscribeStarred } from '../../lib/pins/starStore';
import { getTraitStarItems, subscribeTraitStarred } from '../../lib/pins/traitStarStore';
import { getArtistStars, subscribeArtistStars } from '../../lib/pins/artistStarStore';
import { getSoundtrackStarItems, subscribeSoundtrackStars } from '../../lib/pins/soundtrackStarStore';
import { getTxStarItems, subscribeTxStars } from '../../lib/pins/txStarStore';
import { getProjectStars, subscribeProjectStars } from '../../lib/pins/projectStarStore';
import { getWishlistItems, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { getProject, projectsByArtist } from '../../lib/project/registry';

export function useStarredPins() {
    /* Starred — the viewer's PRIVATE bookmarks ("like it, star it, find it
       later"). Device-local, keyed slug:id so it spans Projects. Shown only on
       your own profile; a visitor never sees someone else's stars. */
    const [starredItems, setStarredItems] = useState(() => getStarredItems());
    useEffect(() => {
        setStarredItems(getStarredItems());
        return subscribeStarred(() => setStarredItems(getStarredItems()));
    }, []);
    /* Live minted count per pinned slug. A token pin is only real if its id is
       within the project's CURRENT minted count — so a pin left over after a
       project's supply reset to 0 (a token that no longer exists) is dropped
       instead of painting phantom art. Fetched below for the union of starred
       + wishlisted slugs; an unknown slug (not yet fetched, or fetch failed)
       keeps the pin so valid pins never flicker away on a slow network. */
    const [mintedBySlug, setMintedBySlug] = useState<Record<string, number>>({});
    const starredValid = useMemo(
        () =>
            starredItems.filter(
                (s) =>
                    getProject(s.slug) != null &&
                    (mintedBySlug[s.slug] === undefined || s.id <= mintedBySlug[s.slug]),
            ),
        [starredItems, mintedBySlug],
    );

    /* Starred Traits — favourited (Project, category, value) tuples, shown under
       the Starred tab's Traits filter. Private, own-profile only, like stars. */
    const [traitStarItems, setTraitStarItems] = useState(() => getTraitStarItems());
    useEffect(() => {
        setTraitStarItems(getTraitStarItems());
        return subscribeTraitStarred(() => setTraitStarItems(getTraitStarItems()));
    }, []);
    const traitStarsValid = useMemo(
        () => traitStarItems.filter((t) => getProject(t.slug) != null),
        [traitStarItems],
    );

    /* Starred Artists — the pinned-artist set from the Artists list, surfaced
       under the Starred tab's Artists filter (read-only mirror; the pin itself
       still lives in the Artists list). */
    const [artistStars, setArtistStars] = useState<readonly string[]>(() => getArtistStars());
    useEffect(() => {
        setArtistStars(getArtistStars());
        return subscribeArtistStars((next) => setArtistStars(next));
    }, []);
    /* Any user can be starred; we split the starred handles into ARTISTS (handles
       that have ≥1 project) and COLLECTORS (everyone else) so each gets its own
       filter (Brendon 2026-06-19). */
    const starredArtistHandles = useMemo(
        () => artistStars.filter((h) => projectsByArtist(h.replace(/^@/, '')).length > 0),
        [artistStars],
    );
    const starredCollectorHandles = useMemo(
        () => artistStars.filter((h) => projectsByArtist(h.replace(/^@/, '')).length === 0),
        [artistStars],
    );

    /* Starred Soundtracks — favourited Project soundtracks, under the Starred
       tab's Soundtracks filter. */
    const [soundtrackStars, setSoundtrackStars] = useState(() => getSoundtrackStarItems());
    useEffect(() => {
        setSoundtrackStars(getSoundtrackStarItems());
        return subscribeSoundtrackStars(() => setSoundtrackStars(getSoundtrackStarItems()));
    }, []);

    /* Starred Tx — favourited on-chain activity events, under the Starred tab's
       Tx filter (the very last pill after Soundtracks). */
    const [txStars, setTxStars] = useState(() => getTxStarItems());
    useEffect(() => {
        setTxStars(getTxStarItems());
        return subscribeTxStars(() => setTxStars(getTxStarItems()));
    }, []);

    /* Starred Projects — favourited Project slugs, under the Starred tab's
       Projects filter. */
    const [projectStars, setProjectStars] = useState<readonly string[]>(() => getProjectStars());
    useEffect(() => {
        setProjectStars(getProjectStars());
        return subscribeProjectStars((next) => setProjectStars(next));
    }, []);
    const projectStarsValid = useMemo(
        () => projectStars.filter((slug) => getProject(slug) != null),
        [projectStars],
    );

    /* Wishlist — the viewer's PRIVATE "want to buy" list. Same shape as stars;
       shown only on your own profile. */
    const [wishlistItems, setWishlistItems] = useState(() => getWishlistItems());
    useEffect(() => {
        setWishlistItems(getWishlistItems());
        return subscribeWishlist(() => setWishlistItems(getWishlistItems()));
    }, []);
    const wishlistValid = useMemo(
        () =>
            wishlistItems.filter(
                (s) =>
                    getProject(s.slug) != null &&
                    (mintedBySlug[s.slug] === undefined || s.id <= mintedBySlug[s.slug]),
            ),
        [wishlistItems, mintedBySlug],
    );
    /* Fetch the live minted count for every pinned slug (starred + wishlist),
       feeding the two filters above. One count request per distinct slug,
       refreshed on the same project-refresh signal the rest of the profile
       already listens to. */
    const pinnedSlugs = useMemo(() => {
        const set = new Set<string>();
        for (const s of starredItems) if (getProject(s.slug) != null) set.add(s.slug);
        for (const s of wishlistItems) if (getProject(s.slug) != null) set.add(s.slug);
        return Array.from(set).sort();
    }, [starredItems, wishlistItems]);
    useEffect(() => {
        if (pinnedSlugs.length === 0) { setMintedBySlug({}); return; }
        let cancelled = false;
        const load = () => {
            Promise.all(
                pinnedSlugs.map((slug) =>
                    fetch(`/api/project/${slug}/outputs`, { cache: 'no-store' })
                        .then((r) => (r.ok ? r.json() : null))
                        .then((d) => [slug, typeof d?.total === 'number' ? d.total : undefined] as const)
                        .catch(() => [slug, undefined] as const),
                ),
            ).then((pairs) => {
                if (cancelled) return;
                const m: Record<string, number> = {};
                for (const [slug, total] of pairs) if (typeof total === 'number') m[slug] = total;
                setMintedBySlug(m);
            });
        };
        load();
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onRefresh); };
    }, [pinnedSlugs]);

    return {
        starredValid,
        traitStarsValid,
        artistStars,
        starredArtistHandles,
        starredCollectorHandles,
        soundtrackStars,
        txStars,
        projectStarsValid,
        wishlistValid,
    };
}
