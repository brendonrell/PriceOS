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
import { getPriceDayStars, subscribePriceDayStars } from '../../lib/pins/priceDayStarStore';
import { getAlbumStarItems, subscribeAlbumStars } from '../../lib/pins/albumStarStore';
import { getVaultStarItems, subscribeVaultStars } from '../../lib/pins/vaultStarStore';
import { getWishlistItems, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { getProject, projectsByArtist } from '../../lib/project/registry';
import type { AlbumRecord } from '../../lib/supabase';

/** A starred Album, resolved against its owner's live shelf (position →
 *  number, cover data). See albumStarsValid below. */
export interface StarredAlbumRow {
    ownerAddress: string;
    /** Claimed @handle for ownerAddress, when resolved — the album detail
     *  route (/{handle}/albums/{n}) needs a handle, not a raw address (its
     *  resolver rejects addresses, unlike the root profile page which
     *  redirects them). Null while unresolved or genuinely unclaimed. */
    ownerHandle: string | null;
    albumId: string;
    album: AlbumRecord;
    number: number;
}
/** A starred Vault, same shape as StarredAlbumRow, resolved against the
 *  Vaults route instead. */
export interface StarredVaultRow {
    ownerAddress: string;
    /** Same handle-resolution story as StarredAlbumRow above — Vaults have
     *  no dedicated detail page yet, but the owner's profile route still
     *  needs a handle over a raw address to avoid an extra redirect hop. */
    ownerHandle: string | null;
    vaultId: string;
    vault: AlbumRecord;
    number: number;
}

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

    /* Starred PriceDays — favourited PriceDay numbers, under the Starred
       tab's PriceDays filter. No live-validity fetch needed: a PriceDay
       number is never phantom (every day that's happened keeps its own),
       same as Tx below. */
    const [priceDayStars, setPriceDayStars] = useState<readonly string[]>(() => getPriceDayStars());
    useEffect(() => {
        setPriceDayStars(getPriceDayStars());
        return subscribePriceDayStars((next) => setPriceDayStars(next));
    }, []);

    /* Starred Albums — favourited (ownerAddress, albumId) bookmarks of ANY
       album on PD, under the Starred tab's Albums filter. Unlike a starred
       Project (resolved instantly against the client registry) an album's
       display data — cover keys, position/number — lives server-side on
       the OWNER's settings envelope, so this needs one fetch per distinct
       starred owner. Same "don't flicker valid pins away on a slow
       network" rule as the minted-count guard above: an owner not yet
       resolved just keeps its rows out until the fetch lands, rather than
       treating them as invalid. */
    const [albumStarItems, setAlbumStarItems] = useState(() => getAlbumStarItems());
    useEffect(() => {
        setAlbumStarItems(getAlbumStarItems());
        return subscribeAlbumStars(() => setAlbumStarItems(getAlbumStarItems()));
    }, []);
    const albumOwners = useMemo(
        () => Array.from(new Set(albumStarItems.map((i) => i.ownerAddress))).sort(),
        [albumStarItems],
    );
    const [albumsByOwner, setAlbumsByOwner] = useState<Record<string, AlbumRecord[]>>({});
    useEffect(() => {
        if (albumOwners.length === 0) return;
        let cancelled = false;
        Promise.all(
            albumOwners.map((addr) =>
                fetch(`/api/user/${addr}/albums`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => [addr, Array.isArray(d?.albums) ? (d.albums as AlbumRecord[]) : []] as const)
                    .catch(() => [addr, [] as AlbumRecord[]] as const),
            ),
        ).then((pairs) => {
            if (cancelled) return;
            setAlbumsByOwner((prev) => {
                const next = { ...prev };
                for (const [addr, albums] of pairs) next[addr] = albums;
                return next;
            });
        });
        return () => { cancelled = true; };
    }, [albumOwners]);

    /* Starred Vaults — same shape as Albums, one fetch per distinct starred
       owner against the Vaults route instead. */
    const [vaultStarItems, setVaultStarItems] = useState(() => getVaultStarItems());
    useEffect(() => {
        setVaultStarItems(getVaultStarItems());
        return subscribeVaultStars(() => setVaultStarItems(getVaultStarItems()));
    }, []);
    const vaultOwners = useMemo(
        () => Array.from(new Set(vaultStarItems.map((i) => i.ownerAddress))).sort(),
        [vaultStarItems],
    );
    const [vaultsByOwner, setVaultsByOwner] = useState<Record<string, AlbumRecord[]>>({});
    useEffect(() => {
        if (vaultOwners.length === 0) return;
        let cancelled = false;
        Promise.all(
            vaultOwners.map((addr) =>
                fetch(`/api/vaults/${addr}`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => [addr, Array.isArray(d?.vaults) ? (d.vaults as AlbumRecord[]) : []] as const)
                    .catch(() => [addr, [] as AlbumRecord[]] as const),
            ),
        ).then((pairs) => {
            if (cancelled) return;
            setVaultsByOwner((prev) => {
                const next = { ...prev };
                for (const [addr, vaults] of pairs) next[addr] = vaults;
                return next;
            });
        });
        return () => { cancelled = true; };
    }, [vaultOwners]);

    /* Handles for every distinct Album/Vault owner — the album detail route
       (/{handle}/albums/{n}) needs a real @handle, not a raw address (its
       resolver 404s on one, unlike the root profile page which redirects
       addresses to the canonical handle). Shared across both so an owner
       with both a starred album and vault only gets resolved once. */
    const albumVaultOwners = useMemo(
        () => Array.from(new Set([...albumOwners, ...vaultOwners])).sort(),
        [albumOwners, vaultOwners],
    );
    const [handleByOwner, setHandleByOwner] = useState<Record<string, string | null>>({});
    useEffect(() => {
        if (albumVaultOwners.length === 0) return;
        let cancelled = false;
        Promise.all(
            albumVaultOwners.map((addr) =>
                fetch(`/api/user/${addr}`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => [addr, typeof d?.handle === 'string' ? d.handle : null] as const)
                    .catch(() => [addr, null] as const),
            ),
        ).then((pairs) => {
            if (cancelled) return;
            setHandleByOwner((prev) => {
                const next = { ...prev };
                for (const [addr, handle] of pairs) next[addr] = handle;
                return next;
            });
        });
        return () => { cancelled = true; };
    }, [albumVaultOwners]);

    const albumStarsValid: StarredAlbumRow[] = useMemo(() => {
        const out: StarredAlbumRow[] = [];
        for (const item of albumStarItems) {
            const list = albumsByOwner[item.ownerAddress];
            if (list === undefined) continue; // not resolved yet — appears once fetched, never flashes away
            const idx = list.findIndex((a) => a.id === item.albumId);
            if (idx === -1) continue; // album deleted / no longer exists — dropped, like a phantom output pin
            out.push({
                ownerAddress: item.ownerAddress,
                ownerHandle: handleByOwner[item.ownerAddress] ?? null,
                albumId: item.albumId,
                album: list[idx],
                number: idx + 1,
            });
        }
        return out;
    }, [albumStarItems, albumsByOwner, handleByOwner]);

    const vaultStarsValid: StarredVaultRow[] = useMemo(() => {
        const out: StarredVaultRow[] = [];
        for (const item of vaultStarItems) {
            const list = vaultsByOwner[item.ownerAddress];
            if (list === undefined) continue;
            const idx = list.findIndex((v) => v.id === item.vaultId);
            if (idx === -1) continue;
            out.push({
                ownerAddress: item.ownerAddress,
                ownerHandle: handleByOwner[item.ownerAddress] ?? null,
                vaultId: item.vaultId,
                vault: list[idx],
                number: idx + 1,
            });
        }
        return out;
    }, [vaultStarItems, vaultsByOwner, handleByOwner]);

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
        priceDayStars,
        albumStarsValid,
        vaultStarsValid,
        wishlistValid,
    };
}
