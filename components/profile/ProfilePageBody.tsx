'use client';

/*
 * components/profile/ProfilePageBody.tsx
 *
 * Profile page body — mounted by app/[slug]/page.tsx (server shell
 * which resolves the slug + emits metadata).
 *
 * Hero section: hero-group-1 is a straight transplant from ProjectPageBody.
 * The three named lines in every PriceOS hero:
 *   - Identity line  → "Via [handle]" with follow-badge + follower count
 *   - Social line    → "Followed by [mutuals]" — identical structure to
 *                       project's "Collected by" row (.collected-by-row /
 *                       .cbr-label / .cbr-name / .cbr-others), only the
 *                       label text changes
 *   - Stats line     → icon + value stat items row
 *
 * Tabs: Created / Collected / + More
 *   - Collected tab: full TraitsUI surface (same as project Artworks tab),
 *     backed by COLLECTED_IDS mock data for now
 *   - + More tab: secondary stats row + Discord link (as-is); colorway/colorway
 *     picker removed (now lives in Collected TraitsUI sort-bar)
 *
 * Default colorway: light — handled in ColorwayContext.tsx (profile
 * page boot path). Users who want colour customise from the sort-bar.
 */

import { useState, useEffect, useMemo, useRef, useDeferredValue, Fragment, type KeyboardEvent } from 'react';
import { TraitsProvider, useTraits } from '../../lib/state/TraitsContext';
import { getRememberedTab, rememberTab } from '../../lib/state/tabMemoryStore';
import { useAuth } from '../../lib/state/AuthContext';
import { rankSocialCandidates } from '../../lib/social/relevance';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import { useColorway } from '../../lib/state/ColorwayContext';
import { useProfileHex } from '../../lib/hooks/useProfileHex';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import {
    useSort,
    GROUP_SOON, GROUP_LABEL, COLLECTED_GROUP_ORDER,
} from '../../lib/state/SortContext';
import { COLOR_BUCKET_ORDER, classifyRgb } from '../../lib/art/outputColor';
import { signatureHexFor } from '../../lib/profile/signatureHex';
import { resolveBucket, useStoredColors } from '../../lib/art/colorStore';
import { GhostFeedRows } from '../GhostFeed';
import { eventToFeedEvent, type FeedEvent } from '../../lib/feed/feedRow';
import type { EventRow } from '../../lib/supabase';
import ArtworkCard from '../ArtworkCard';
import { getStarredItems, subscribeStarred } from '../../lib/pins/starStore';
import { getTraitStarItems, subscribeTraitStarred } from '../../lib/pins/traitStarStore';
import { getArtistStars, subscribeArtistStars } from '../../lib/pins/artistStarStore';
import { getSoundtrackStarItems, subscribeSoundtrackStars } from '../../lib/pins/soundtrackStarStore';
import { getProjectStars, subscribeProjectStars } from '../../lib/pins/projectStarStore';
import { getWishlistItems, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { getShowcaseItems, subscribeShowcase } from '../../lib/pins/userShowcaseStore';
import AddToShowcaseModal from './AddToShowcaseModal';
import StarredList from './StarredList';
import WishlistList from './WishlistList';
import GhostRows from './GhostRows';
import TraitsUI from '../project/TraitsUI';
import AchievementsGrid from '../achievements/AchievementsGrid';
import { ACHIEVEMENTS, MAX_PRICE_SCORE, VISIBLE_COUNT } from '../../lib/achievements/catalog';
import Hero from '../hero/Hero';
import FollowButton from './FollowButton';
import { getProject, outputTraits, allProjects, projectsByArtist, projectTraits } from '../../lib/project/registry';
import HomeProjectFacetBar, {
    projectFacetValueOf,
    type EnrichedProject,
    type HomeSortKey,
    type HomeSortDir,
} from '../home/HomeProjectFacetBar';
import { FEED_LIFECYCLE, milestoneByKey } from '../../lib/home/milestones';
import { effectiveShowcaseStyle } from '../../lib/profile/showcaseStyle';
import GhostCard from '../project/GhostCard';
import ZenGarden from './ZenGarden';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import ProfileFacetBar, { facetValueOf, type EnrichedHolding } from './ProfileFacetBar';
import type { ShowcaseSlot } from '../../lib/supabase';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';
import { priceDayNumber, priceDayContents } from '../../lib/priceday/priceday';

/**
 * Format an ISO timestamp (users.created_at) as "MMM DD YYYY" in the hero
 * date slot — e.g. "2026-05-13T..." → "MAY 13 2026". Matches the project
 * page's PriceDay date format (JUL 09 2026).
 */
function formatMemberSince(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d
        .toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        })
        .replace(',', '')
        .toUpperCase();
}

type ProfileTab = 'showcase' | 'collected' | 'more';
type ProfileMoreL1 = 'created' | 'starred' | 'wishlists' | 'albums' | 'info' | 'achievements';
/* Artist Showcase (Artist style): 'created' = the now-minting view of the
   projects this artist made; 'regular' = their curated Top 6 grid. */
type ShowcaseView = 'created' | 'regular';

/* Per-project live stats for an artist's own projects (from /api/artist) —
   feeds the showcase facet bar's birth/Status facets, date sort, and feed. */
interface ArtistProjStat {
    minted_count: number;
    uploaded_at: number | null;
    reached_at: number | null;
    sold_out_at: number | null;
    milestones: Record<string, number>;
}

/* Artist showcase facets = the home set minus Artist + Project (redundant for a
   single artist); Created · Top 6 lead the row in their place. */
const ARTIST_SHOWCASE_FACETS = ['PriceDay', 'Sun', 'Moon', 'Rising', 'Status', 'Fate'] as const;

/* A home activity-feed item for the artist showcase Created feed. */
interface ArtistFeedItem { slug: string; title: string; label: string; glyph: string; cls?: string; ts: number }

function fmtFeedDate(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
        .toUpperCase();
}
function fmtFeedTime(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

/* Outputs per artist-project carousel (matches the home carousel: 18). */
const CAROUSEL_SIZE = 18;

/* One artist-project carousel — same markup + classes as the home page's
   per-project carousel, mounted under its own ProjectProvider so the cards
   paint THIS project's engine. Shows recent minted Outputs; falls back to the
   project's opening Outputs as a preview when nothing's minted yet, so the row
   is never an empty void. */
function ArtistProjectCarousel({ eager = false }: { eager?: boolean }) {
    const project = useProject();
    const total = project.totalOutputs;
    const ids =
        total > 0
            ? Array.from({ length: Math.min(CAROUSEL_SIZE, total) }, (_, i) => total - i)
            : Array.from(
                  { length: Math.min(CAROUSEL_SIZE, project.maxSupply) },
                  (_, i) => i + 1,
              );
    return (
        <section
            className="home-carousel-row"
            aria-label={`${project.title} — recent outputs`}
        >
            <div className="home-carousel-head">
                <a className="home-carousel-title" href={`/art/${project.slug}`}>
                    {project.title}
                </a>
            </div>
            <div className="home-carousel-track">
                {ids.map((id) => (
                    <ArtworkCard key={id} id={id} eager={eager} />
                ))}
            </div>
        </section>
    );
}

/** One collected Output, from /api/user/[address]/outputs. */
interface Holding {
    slug: string;
    token_id: number;
    list_price_eth: string | null;
    /** Mint event timestamp (Unix seconds) — source for PriceDay + Natal. */
    mint_ts: number | null;
}

function ProfilePageBodyInner({
    handle,
    initialUser,
    initialHoldings,
    artistStatus,
}: {
    handle: string;
    initialUser: UserProfileData;
    initialHoldings: Holding[];
    artistStatus: 'active' | 'cooldown' | null;
}) {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const { notifs } = usePdNotifs();
    const isZen = notifs.zenMode;
    const { sort, dir, feedKind, group } = useSort();
    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

    /* Decouple the gallery grid from the trait pills (Brendon, 2026-06-18). The
       pills read the live filter state and paint their dim/active instantly;
       the heavy grid filter/sort reads a DEFERRED copy, so a pill tap no longer
       waits on the grid to recompute — the grid catches up on its own frame. */
    const dActiveFilters = useDeferredValue(activeFilters);
    const dSearchQuery = useDeferredValue(searchQuery);
    const dPriceMin = useDeferredValue(priceMin);
    const dPriceMax = useDeferredValue(priceMax);

    // Real user row — fetched server-side from the handle in the URL and
    // passed in, so the hero renders real values on first paint (no popin).
    const user = initialUser;

    /* Profile Colorway — paint this profile in ITS OWNER's colour. The page
       owner's `profile_hex` is the "Custom" colour for this page, shown to any
       visitor whose colorway is the default/Custom (an explicit pick still
       wins — handled in ColorwayContext). When the logged-in user is viewing
       their OWN profile, use the live hook value so edits in the picker repaint
       instantly; for anyone else's profile, use the server-provided value. */
    const { setActiveProfileHex } = useColorway();
    const isOwnProfile =
        !!siweAddress && siweAddress.toLowerCase() === user.address.toLowerCase();
    /* Seed the Profile Colorway hook with the server-known colour on your OWN
       profile so it paints the real colour on the first pass instead of flashing
       white then repainting (Brendon, 2026-06-18). Only on own profile — on
       someone else's, this hook is the VIEWER's colour and must not be seeded
       with the page owner's. */
    const { hex: myProfileHex, setHex: setMyProfileHex } = useProfileHex(
        isOwnProfile ? user.profile_hex : undefined,
    );
    const ownerHex = isOwnProfile ? myProfileHex : user.profile_hex;
    useEffect(() => {
        setActiveProfileHex(ownerHex ?? null);
        return () => setActiveProfileHex(null);
    }, [ownerHex, setActiveProfileHex]);

    const displayHandle = user.handle ?? handle;

    /* ── Name easter egg — colourway pills ──────────────────────────────
       Triple-tapping your OWN @name shoves open an in-flow row of colour
       pills (below the title, pushing the rest of the hero down — never a
       floating overlay). Each pill names + sets the Profile Colorway via the
       shared hook, so the change also reflects live in the Settings field.
       The brand palette plus the user's own HIDDEN signature colour (derived
       from their address; named by our colour-bucket classifier). */
    const [eggOpen, setEggOpen] = useState(false);
    const eggTap = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });
    /* The colorway the user had when they opened the egg — the back pill
       restores it (so a curious tap-through never strands a colour they
       didn't mean to keep). Snapshotted on each open. */
    const preEggHex = useRef<string>(myProfileHex);
    const handleNameTap = () => {
        if (!isOwnProfile) return;
        const now = Date.now();
        const s = eggTap.current;
        s.count = now - s.lastTap > 600 ? 1 : s.count + 1;
        s.lastTap = now;
        if (s.count >= 3) {
            s.count = 0;
            setEggOpen((v) => {
                if (!v) preEggHex.current = myProfileHex;
                return !v;
            });
        }
    };

    const eggPills = useMemo(() => {
        const sig = user.signature_hex ?? signatureHexFor(user.address);
        const s = sig.replace('#', '');
        const sigName = classifyRgb(
            parseInt(s.slice(0, 2), 16) || 0,
            parseInt(s.slice(2, 4), 16) || 0,
            parseInt(s.slice(4, 6), 16) || 0,
        );
        return [
            { name: 'Hothurt Red', hex: '#FF0055' },
            { name: 'Attention Yellow', hex: '#FFE600' },
            { name: 'Dot Black', hex: '#111111' },
            { name: 'Matrix White', hex: '#E0E0E0' },
            { name: '@brendon Blue', hex: '#0109FF' },
            { name: `@${displayHandle} ${sigName}`, hex: sig },
        ];
    }, [user.address, displayHandle]);

    /* This profile's PriceSprite — a small STILL face beside the @name (the
       profile's avatar; PD has no uploaded pfps). Works for any user via the
       frozen signup sprite (useSpriteFace, cached). Courier, understated —
       not the loud chip that was reverted on the project hero. */
    const nameFace = useSpriteFace(displayHandle);
    const memberSince = formatMemberSince(user.created_at);

    // Identity row: chosen ENS if set, else the truncated wallet address.
    const viaLabel = user.ens_name
        ? user.ens_name
        : `${user.address.slice(0, 6)}…${user.address.slice(-4)}`;
    /* Live follower/following counts — fully seeded from the server row
       (both counts ship with the page since the 2026-06-10 perf batch; the
       old seed left `following` at 0 until a mount fetch landed), refreshed
       from /api/follows on any follow toggle ('pd:follows-changed'). The
       mount fetch is gone: it re-read the exact counts the server computed
       on this same request. */
    const [counts, setCounts] = useState<{ followers: number; following: number }>(
        { followers: user.follower_count, following: user.following_count },
    );

    /* Real collected Outputs (holders rows) for THIS profile's wallet —
       seeded server-side (they ship with the page, so the Collected grid
       paints on arrival; perf batch 2026-06-10). Declared here, above the
       identity-reset block that re-seeds it. */
    const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);

    /* Client-nav identity reset — the App Router reuses this component
       instance when navigating between two profile pages (same segment,
       new params), so state seeded from props must re-seed when the profile
       address changes. Render-phase reset, per React's derived-state
       guidance. Previously the mount fetches papered over this; with those
       gone the reset has to be explicit. */
    const [seededFor, setSeededFor] = useState(user.address);
    if (seededFor !== user.address) {
        setSeededFor(user.address);
        setCounts({ followers: user.follower_count, following: user.following_count });
        setHoldings(initialHoldings);
    }

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/follows/${user.address.toLowerCase()}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setCounts({ followers: d.follower_count ?? 0, following: d.following_count ?? 0 }); })
                .catch(() => {});
        const h = () => load();
        window.addEventListener('pd:follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
    }, [user.address]);

    /* Social row "Followed by …" (Twitter model): people the VIEWER follows who
       also follow THIS profile, ranked by connection strength (mutual first) →
       PriceRank → a little jitter (lib/social/relevance), capped at 2 faces +
       "& N others you follow". Hidden when the viewer is signed out, viewing
       their own profile, or shares no such tie. */
    const [followedBy, setFollowedBy] = useState<{ shown: string[]; others: number }>({ shown: [], others: 0 });
    useEffect(() => {
        const me = siweAddress?.toLowerCase();
        const target = user.address.toLowerCase();
        if (!me || me === target) { setFollowedBy({ shown: [], others: 0 }); return; }
        let cancelled = false;
        const load = async () => {
            try {
                const [meRes, themRes] = await Promise.all([
                    fetch(`/api/follows/${me}`, { cache: 'no-store' }),
                    fetch(`/api/follows/${target}`, { cache: 'no-store' }),
                ]);
                const meJ = await meRes.json().catch(() => ({}));
                const themJ = await themRes.json().catch(() => ({}));
                if (cancelled) return;
                const myFollowing: string[] = Array.isArray(meJ?.following_handles) ? meJ.following_handles : [];
                const myFollowingScores: number[] = Array.isArray(meJ?.following_scores) ? meJ.following_scores : [];
                const iAmFollowedBy = new Set<string>(
                    (Array.isArray(meJ?.follower_handles) ? meJ.follower_handles : []).map((x: string) => x.toLowerCase())
                );
                const theirFollowers = new Set<string>(
                    (Array.isArray(themJ?.follower_handles) ? themJ.follower_handles : []).map((x: string) => x.toLowerCase())
                );
                const cands = myFollowing
                    .map((handle, i) => ({
                        handle,
                        priceScore: myFollowingScores[i] ?? 0,
                        mutual: iAmFollowedBy.has(handle.toLowerCase()),
                    }))
                    .filter((c) => theirFollowers.has(c.handle.toLowerCase()));
                const ranked = rankSocialCandidates(cands, 2);
                setFollowedBy({ shown: ranked.shown, others: ranked.othersCount });
            } catch { if (!cancelled) setFollowedBy({ shown: [], others: 0 }); }
        };
        load();
        const h = () => load();
        window.addEventListener('pd:follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
    }, [siweAddress, user.address]);

    /* Showcase — the user's curated top-6 (users.showcase). Each slot points at
       one Output (project + token). 'static' keeps the saved order; 'generative'
       reshuffles once per visit. Empty slots are dropped. Wiring to ADD/curate
       slots ships later; this renders whatever's saved. */
    const showcaseSlots = useMemo<ShowcaseSlot[]>(() => {
        const slots = (user.showcase?.slots ?? []).filter(
            (s): s is ShowcaseSlot => !!s && !!s.project_id && s.token_id != null && getProject(s.project_id) != null,
        );
        if (user.showcase_style === 'generative') {
            const a = [...slots];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
        return slots;
    }, [user.showcase, user.showcase_style]);

    /* Empty-state ghost frames for the Showcase — same idea as the project's
       unminted gallery: 6 placeholder frames (matching the 6 Showcase slots),
       shapes SAMPLED from the projects' aspect palettes (no art, no seeds).
       Deterministic per index (SSR-safe). Shown when nothing is curated yet. */
    const showcaseGhosts = useMemo(() => {
        const pool = allProjects().flatMap((p) => p.aspects);
        const aspects = pool.length ? pool : [1];
        return Array.from({ length: 6 }, (_, i) => {
            const h = (((i + 1) * 2654435761) >>> 0) / 4294967296;
            return aspects[Math.floor(h * aspects.length) % aspects.length];
        });
    }, []);

    /* Empty-state ghost frames for the Collected grid — same idea as the
       Showcase ghosts, a fuller grid so an empty Collected tab still shows the
       normal layout with placeholder frames instead of artwork (Brendon
       2026-06-15). */
    const collectedGhosts = useMemo(() => {
        const pool = allProjects().flatMap((p) => p.aspects);
        const aspects = pool.length ? pool : [1];
        return Array.from({ length: 12 }, (_, i) => {
            const h = (((i + 1) * 2654435761) >>> 0) / 4294967296;
            return aspects[Math.floor(h * aspects.length) % aspects.length];
        });
    }, []);

    /* Own-profile Showcase picks (Brendon 2026-06-15) — the Outputs you've
       featured via the ⑆ Add-to-Showcase action or the ghost-tap picker. Lives
       in the device-local showcase store; subscribed so adds/removes repaint
       the grid live. Visitors still see the server showcase slots. */
    const [showcaseLocal, setShowcaseLocal] = useState(() => getShowcaseItems());
    useEffect(() => {
        setShowcaseLocal(getShowcaseItems());
        return subscribeShowcase(() => setShowcaseLocal(getShowcaseItems()));
    }, []);
    const ownShowcaseItems = useMemo(
        () => showcaseLocal.filter((s) => getProject(s.slug) != null),
        [showcaseLocal],
    );
    const [showcasePickerOpen, setShowcasePickerOpen] = useState(false);

    /* Holdings refresh wiring (state itself is declared above the identity-
       reset block). Spans both projects; grouped by slug for rendering.
       Re-fetches on 'pd:project-refresh' (fired after a mint / market
       action) so the gallery updates without a reload. The mount fetch only
       runs when the server seed came back empty — a non-empty seed is the
       same query, same request; an empty one gets re-verified through the
       API so a transient server-side read failure can't strand an empty
       grid (and a genuinely-empty profile just repeats today's cheap
       no-op fetch). */
    useEffect(() => {
        let cancelled = false;
        /* Signature of a holdings set — identity of every card plus its listed
           price. The on-mount reconcile usually returns the SAME data the server
           already seeded; replacing state with an identical-but-new array forced
           a full re-enrich + re-sort + repaint of hundreds of cards (the "loads
           twice / almost crashes" jank). Comparing signatures lets us keep the
           existing array (React bails the update) unless something truly changed,
           while still picking up new mints / price changes. */
        const sig = (hs: Holding[]) =>
            hs.map((h) => `${h.slug}:${h.token_id}:${h.list_price_eth ?? ''}`).join('|');
        const load = () =>
            fetch(`/api/user/${user.address.toLowerCase()}/outputs`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { holdings?: Holding[] } | null) => {
                    if (cancelled || !d?.holdings) return;
                    const next = d.holdings;
                    setHoldings((prev) => (sig(prev) === sig(next) ? prev : next));
                })
                .catch(() => {});
        // Always reconcile on mount (Brendon 2026-06-12): the seed gives an
        // instant first paint, but it can be a beat behind the newest mints,
        // so a non-empty seed still gets verified — was gated on empty, which
        // let a stale-but-nonempty seed strand missing mints until a refresh
        // event that never fires on this page.
        load();
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onRefresh); };
    }, [user.address]);

    /* Enrich each held Output with its full platform traits (Artist/Project/
       PriceDay/Natal/Fate — PriceDay + Natal need the mint timestamp) and live
       listed status. Both the facet bar and the predicate read this, so they
       can never diverge. */
    const enriched = useMemo<EnrichedHolding[]>(
        () =>
            holdings
                .filter((h) => getProject(h.slug))
                .map((h) => ({
                    slug: h.slug,
                    token_id: h.token_id,
                    list_price_eth: h.list_price_eth,
                    listed: h.list_price_eth != null,
                    traits: outputTraits(
                        h.slug,
                        h.token_id,
                        h.mint_ts != null ? h.mint_ts * 1000 : undefined,
                    ),
                })),
        [holdings],
    );

    /* Collected-tab search + filter + sort over the enriched holdings. Filters
       by the platform facets (facetValueOf), searches @artist / @project / id,
       ranges on listing price, sorts by id or price. */
    const visibleCollected = useMemo<EnrichedHolding[]>(() => {
        const minVal = parseFloat(dPriceMin);
        const maxVal = parseFloat(dPriceMax);
        const hasMin = !Number.isNaN(minVal);
        const hasMax = !Number.isNaN(maxVal);
        const q = dSearchQuery.trim().toLowerCase();
        const activeCats = Object.keys(dActiveFilters).filter((c) => dActiveFilters[c].size > 0);

        const filtered = enriched.filter((h) => {
            const priceNum = h.list_price_eth ? parseFloat(h.list_price_eth) : null;
            for (const cat of activeCats) {
                const v = facetValueOf(cat, h);
                if (v === undefined || !dActiveFilters[cat].has(v)) return false;
            }
            if (q) {
                const hay = `${h.traits.Artist ?? ''} ${h.traits.Project ?? ''} #${h.token_id}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (hasMin && (priceNum == null || priceNum < minVal)) return false;
            if (hasMax && priceNum != null && priceNum > maxVal) return false;
            return true;
        });

        const dirMult = dir === 'asc' ? 1 : -1;
        const byId = (a: EnrichedHolding, b: EnrichedHolding) =>
            a.slug === b.slug ? (a.token_id - b.token_id) * dirMult : a.slug.localeCompare(b.slug);
        if (sort === 'price') {
            filtered.sort((a, b) => {
                const na = a.list_price_eth ? parseFloat(a.list_price_eth) : Infinity;
                const nb = b.list_price_eth ? parseFloat(b.list_price_eth) : Infinity;
                return na !== nb ? (na - nb) * dirMult : byId(a, b);
            });
        } else if (sort === 'az') {
            // A–Z by project name, then token id within each project.
            filtered.sort((a, b) => {
                const an = getProject(a.slug)?.displayName ?? a.slug;
                const bn = getProject(b.slug)?.displayName ?? b.slug;
                const c = an.localeCompare(bn) * dirMult;
                return c !== 0 ? c : a.token_id - b.token_id;
            });
        } else {
            filtered.sort(byId);
        }
        return filtered;
    }, [enriched, sort, dir, dActiveFilters, dSearchQuery, dPriceMin, dPriceMax]);

    /* Progressive gallery reveal (Brendon, 2026-06-18). Mounting hundreds of
       cards in a single commit froze the page and crashed it into a reload on a
       big collection. Render a first screenful immediately so the page is snappy
       and interactive, then stream the rest of the artwork in over the following
       frames — the art is always the LAST thing to fill in, never a blocker.
       revealCount only grows, so once the whole grid is mounted, later filter /
       sort changes render instantly. */
    const REVEAL_FIRST = 24;
    const REVEAL_STEP = 48;
    const [revealCount, setRevealCount] = useState(REVEAL_FIRST);
    useEffect(() => {
        if (revealCount >= visibleCollected.length) return;
        const raf = requestAnimationFrame(() =>
            setRevealCount((c) => c + REVEAL_STEP),
        );
        return () => cancelAnimationFrame(raf);
    }, [revealCount, visibleCollected.length]);
    const shownCollected = useMemo(
        () =>
            revealCount >= visibleCollected.length
                ? visibleCollected
                : visibleCollected.slice(0, revealCount),
        [visibleCollected, revealCount],
    );

    /* Group the filtered/sorted holdings by Project for rendering. Each group
       renders inside its own ProjectProvider so ArtworkCard paints the right
       Project's art + meta — the provider is a context-only node (no DOM), so
       all cards still land as direct children of the single #gallery grid.
       (Sort is global within each project group; cross-project ordering follows
       the group order.) */
    const collectedByProject = useMemo(() => {
        const m = new Map<string, number[]>();
        for (const h of shownCollected) {
            const arr = m.get(h.slug) ?? [];
            arr.push(h.token_id);
            m.set(h.slug, arr);
        }
        return [...m.entries()].map(([slug, ids]) => ({ slug, ids }));
    }, [shownCollected]);

    /* Stored dominant colours for every project the wallet holds (any engine);
       resolveBucket prefers them, falls back to live palette-math. */
    const heldSlugs = useMemo(() => [...new Set(enriched.map((h) => h.slug))], [enriched]);
    const colorsVer = useStoredColors(heldSlugs);

    /* Grouped collected gallery (Brendon, 2026-06-16). Grouping is the cycling
       modifier on the active grid sort. Cross-project surface dimensions:
       artist · project · artist+project · colour · last-sold · rarity. Titles
       reuse the home carousel-title look; spacing binds each to the group below.
       Cards still render inside a ProjectProvider so the art paints with its own
       project's context. Returns null when grouping is off / not applicable. */
    type GBHead = { level: 1 | 2; label: string; by?: string | null; soon?: boolean };
    type GBlock = {
        key: string;
        /** Collapse key for the section (level-1) this block belongs to. */
        l1Key: string;
        /** Collapse key for this block's own level-2 sub-section, when it has one. */
        l2Key?: string;
        heads: GBHead[];
        group?: { slug: string; ids: number[] };
        cards?: { slug: string; id: number }[];
    };
    const collectedGroups = useMemo<GBlock[] | null>(() => {
        if (group === 'none' || sort === 'feed') return null;
        if (!COLLECTED_GROUP_ORDER.includes(group)) return null;
        const projName = (slug: string) => getProject(slug)?.displayName ?? slug;

        // Last-sold + rarity: one greyed "coming soon" title, all pieces beneath.
        if (GROUP_SOON[group]) {
            return [{
                key: 'soon',
                l1Key: 'soon',
                heads: [{ level: 1, label: GROUP_LABEL[group], soon: true }],
                cards: shownCollected.map((h) => ({ slug: h.slug, id: h.token_id })),
            }];
        }

        // Colour cuts across projects — bucket every piece, render each in its
        // own provider so the art still paints with its project's context.
        if (group === 'color') {
            const buckets = new Map<string, { slug: string; id: number }[]>();
            for (const h of shownCollected) {
                const b = resolveBucket(h.slug, h.token_id) ?? 'Other';
                const arr = buckets.get(b) ?? [];
                arr.push({ slug: h.slug, id: h.token_id });
                buckets.set(b, arr);
            }
            const order = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            return [...buckets.entries()]
                .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
                .map(([label, cards]) => ({ key: `c-${label}`, l1Key: `c-${label}`, heads: [{ level: 1 as const, label }], cards }));
        }

        // artist+colour / project+colour — two-level: the identity (artist or
        // project) titles the section, colour buckets sub-title within it.
        // Colour mixes projects under an artist, so pieces render per-card (like
        // the plain colour grouping), not per-project.
        if (group === 'artistColor' || group === 'projectColor') {
            type Hold = (typeof shownCollected)[number];
            const colorOrder = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            const idOf = (h: Hold) =>
                group === 'artistColor' ? (h.traits.Artist ?? '—') : h.slug;
            const idLabel = (k: string) => (group === 'artistColor' ? k : projName(k));
            const byId = new Map<string, Hold[]>();
            const artistOf = new Map<string, string>();
            for (const h of shownCollected) {
                const k = idOf(h);
                const arr = byId.get(k) ?? [];
                arr.push(h);
                byId.set(k, arr);
                if (!artistOf.has(k)) artistOf.set(k, h.traits.Artist ?? '—');
            }
            const ids = [...byId.keys()].sort((a, b) => idLabel(a).localeCompare(idLabel(b)));
            const blocks: GBlock[] = [];
            for (const k of ids) {
                const cbuckets = new Map<string, { slug: string; id: number }[]>();
                for (const h of byId.get(k)!) {
                    const b = resolveBucket(h.slug, h.token_id) ?? 'Other';
                    const arr = cbuckets.get(b) ?? [];
                    arr.push({ slug: h.slug, id: h.token_id });
                    cbuckets.set(b, arr);
                }
                const ordered = [...cbuckets.entries()]
                    .sort((a, b) => colorOrder.indexOf(a[0]) - colorOrder.indexOf(b[0]));
                let first = true;
                for (const [clabel, cards] of ordered) {
                    const heads: GBHead[] = [];
                    if (first) {
                        heads.push(
                            group === 'projectColor'
                                ? { level: 1, label: idLabel(k), by: artistOf.get(k) ?? null }
                                : { level: 1, label: idLabel(k) },
                        );
                        first = false;
                    }
                    heads.push({ level: 2, label: clabel });
                    blocks.push({
                        key: `${k}::${clabel}`,
                        l1Key: `i:${k}`,
                        l2Key: `s:${k}::${clabel}`,
                        heads,
                        cards,
                    });
                }
            }
            return blocks;
        }

        // artist / project / artist+project respect project boundaries (one
        // provider per project), so group by slug then order/title by dimension.
        const bySlug = new Map<string, number[]>();
        const slugArtist = new Map<string, string>();
        for (const h of shownCollected) {
            const arr = bySlug.get(h.slug) ?? [];
            arr.push(h.token_id);
            bySlug.set(h.slug, arr);
            if (!slugArtist.has(h.slug)) slugArtist.set(h.slug, h.traits.Artist ?? '—');
        }
        const slugs = [...bySlug.keys()];
        if (group === 'project') {
            slugs.sort((a, b) => projName(a).localeCompare(projName(b)));
            return slugs.map((slug) => ({
                key: slug,
                l1Key: slug,
                heads: [{ level: 1 as const, label: projName(slug), by: slugArtist.get(slug) ?? null }],
                group: { slug, ids: bySlug.get(slug)! },
            }));
        }
        // artist / artistProject — order by artist then project; artist titled once.
        slugs.sort((a, b) =>
            slugArtist.get(a)!.localeCompare(slugArtist.get(b)!) || projName(a).localeCompare(projName(b)));
        let lastArtist: string | null = null;
        const blocks: GBlock[] = [];
        for (const slug of slugs) {
            const artist = slugArtist.get(slug)!;
            const heads: GBHead[] = [];
            if (artist !== lastArtist) { heads.push({ level: 1, label: artist }); lastArtist = artist; }
            if (group === 'artistProject') heads.push({ level: 2, label: projName(slug) });
            blocks.push({
                key: slug,
                l1Key: `a:${artist}`,
                ...(group === 'artistProject' ? { l2Key: `p:${slug}` } : {}),
                heads,
                group: { slug, ids: bySlug.get(slug)! },
            });
        }
        return blocks;
    }, [group, sort, shownCollected, colorsVer]);

    /* Collapsible grouping headers — tap a header (or its arrow) to fold its
       pieces away; tap again to reopen. Folding a section (level-1) hides
       everything nested under it, including its sub-headers. Keys are
       dimension-specific, so a grouping change starts fresh (effect below). */
    const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
    const toggleGroupCollapse = (key: string) =>
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    useEffect(() => { setCollapsedGroups(new Set()); }, [group]);

    // Identity-row copy: copies the chosen ENS if set, else the FULL wallet
    // address (row shows truncated, copy gives the whole thing — same as the
    // settings wallet copy). Inline checkmark swap for 1.5s.
    const copyValue = user.ens_name ?? user.address;
    const [idCopied, setIdCopied] = useState(false);
    const idCopyTimer = useRef<number | null>(null);
    const handleCopyIdentity = async () => {
        const confirm = () => {
            if (idCopyTimer.current != null) window.clearTimeout(idCopyTimer.current);
            setIdCopied(true);
            idCopyTimer.current = window.setTimeout(() => {
                setIdCopied(false);
                idCopyTimer.current = null;
            }, 1500);
        };
        try {
            await navigator.clipboard?.writeText(copyValue);
            confirm();
        } catch {
            confirm();
        }
    };

    // Social row (Twitter model): "Followed by X, Y, and N others you follow".
    // Live from the relevance-ranked intersection computed above.
    const mutuals: string[] = followedBy.shown;
    const mutualOthers: number = followedBy.others;

    /* Identity row stays on ONE line: the PriceSprite + a space + the wallet/
       ENS. Desktop always has room. On a narrow screen a long ENS would
       overflow, so we shrink JUST the address font (per name, smallest that
       still fits — never below a readable floor) instead of wrapping. If it
       already fits, nothing changes. */
    const idRowRef = useRef<HTMLDivElement>(null);
    const idAddrRef = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        const row = idRowRef.current;
        const addr = idAddrRef.current;
        if (!row || !addr) return;
        const MIN = 9; // px floor — keep it legible
        let raf = 0;
        const fit = () => {
            addr.style.fontSize = ''; // reset to CSS base before measuring
            if (row.scrollWidth <= row.clientWidth + 0.5) return; // fits → leave it
            let size = parseFloat(getComputedStyle(addr).fontSize) || 13;
            while (size > MIN && row.scrollWidth > row.clientWidth + 0.5) {
                size -= 0.5;
                addr.style.fontSize = `${size}px`;
            }
        };
        const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
        schedule();
        const ro = new ResizeObserver(schedule);
        ro.observe(row);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, [viaLabel, nameFace]);

    /* Default landing tab is content-aware (Brendon 2026-06-10): an empty
       showcase is not a landing page — land on Collected instead. The
       Showcase tab itself stays in the row (ghosts show if tapped). Same
       rule on project pages (Artworks). Initializer only — once mounted,
       the user's tap wins. */
    const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
        /* Per-user, per-profile memory wins — the saved tab is the ONLY thing
           that overrides the content-aware default (Brendon, 2026-06-16). */
        const remembered = getRememberedTab('profile', user.handle ?? handle);
        if (remembered === 'showcase' || remembered === 'collected' || remembered === 'more') {
            return remembered;
        }
        // Artists land on Showcase too — their Created carousels make it a
        // real landing page even with an empty curated set. Otherwise land on
        // Showcase only when it's FULL (6 curated slots); a short/empty showcase
        // is not a landing page → Collected (Brendon, 2026-06-16, the same
        // "full showcase" rule as project pages).
        const artistHasProjects =
            !!artistStatus && projectsByArtist(user.handle ?? handle).length > 0;
        return showcaseSlots.length >= 6 || artistHasProjects ? 'showcase' : 'collected';
    });
    const setActiveTabPersisted = (tab: ProfileTab) => {
        rememberTab('profile', user.handle ?? handle, tab);
        setActiveTab(tab);
    };
    const [moreL1, setMoreL1] = useState<ProfileMoreL1>('starred');

    /* Starred — the viewer's PRIVATE bookmarks ("like it, star it, find it
       later"). Device-local, keyed slug:id so it spans Projects. Shown only on
       your own profile; a visitor never sees someone else's stars. */
    const [starredItems, setStarredItems] = useState(() => getStarredItems());
    useEffect(() => {
        setStarredItems(getStarredItems());
        return subscribeStarred(() => setStarredItems(getStarredItems()));
    }, []);
    const starredValid = useMemo(
        () => starredItems.filter((s) => getProject(s.slug) != null),
        [starredItems],
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

    /* +More search — lifted here so the ⌕ icon lives in the +More sub-nav row
       beside the Info pill (where Collected's search lives) and drives WHICHEVER
       +More sub-tab is open (the sub-tabs behave like real tabs). Resets when
       you switch sub-tab. The bar + filtering live in the open sub-tab's list. */
    const [moreSearchOpen, setMoreSearchOpen] = useState(false);
    const [moreQuery, setMoreQuery] = useState('');
    const toggleMoreSearch = () => setMoreSearchOpen((v) => { if (v) setMoreQuery(''); return !v; });
    const closeMoreSearch = () => { setMoreQuery(''); setMoreSearchOpen(false); };
    /* +More multi-select — same idea as Collected's ❐. Lives beside the search
       icon and drives the open sub-tab's row selection. */
    const [moreMultiActive, setMoreMultiActive] = useState(false);
    /* +More sort — Recent / # ID / Project. Lives in the sub-nav sort-bar
       beside the colorway picker (same spot + font as the project sorts) and
       drives the open sub-tab's list. */
    type MoreSortKey = 'recent' | 'id' | 'project';
    type MoreMode = 'all' | 'artists' | 'outputs' | 'traits' | 'soundtracks' | 'projects';
    const [moreMode, setMoreMode] = useState<MoreMode>('all');
    const [moreSort, setMoreSort] = useState<MoreSortKey>('recent');
    const [moreSortDir, setMoreSortDir] = useState<'asc' | 'desc'>('asc');
    const [moreGroup, setMoreGroup] = useState<string>('none');
    /* Which sorts + groupings make sense for each Starred filter (and Wishlist).
       Groupings reuse the gallery's dimensions (color = outputs only, etc.). */
    const MORE_CFG: Record<string, { sorts: MoreSortKey[]; groups: string[] }> = {
        all:         { sorts: ['recent'],                groups: ['none', 'type'] },
        outputs:     { sorts: ['recent', 'id', 'project'], groups: ['none', 'color', 'project', 'artist'] },
        traits:      { sorts: ['recent', 'project'],     groups: ['none', 'project', 'artist'] },
        projects:    { sorts: ['recent', 'project'],     groups: ['none', 'artist'] },
        artists:     { sorts: ['recent'],                groups: ['none'] },
        soundtracks: { sorts: ['recent', 'project'],     groups: ['none', 'artist', 'project'] },
        wishlist:    { sorts: ['recent', 'id', 'project'], groups: ['none'] },
    };
    useEffect(() => { setMoreSearchOpen(false); setMoreQuery(''); setMoreMultiActive(false); setMoreSort('recent'); setMoreSortDir('asc'); setMoreGroup('none'); }, [moreL1]);
    /* Reset sort + grouping when the active filter pill changes (StarredList
       reports it up) so a grouping never carries into a filter it can't apply. */
    useEffect(() => { setMoreSort('recent'); setMoreSortDir('asc'); setMoreGroup('none'); }, [moreMode]);
    /* Tap an inactive sort → enter it ascending; tap the active one → flip
       direction (asc↔desc), same as the gallery sort buttons. */
    const cycleMoreSort = (key: MoreSortKey) => {
        if (moreSort === key) setMoreSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setMoreSort(key); setMoreSortDir('asc'); }
    };
    const MORE_SORT_LABEL: Record<MoreSortKey, string> = { recent: 'Recent', id: '#ID', project: 'Project' };
    const MORE_GROUP_NAME: Record<string, string> = { color: 'Color', project: 'Project', artist: 'Artist', type: 'Type' };

    /* Starred Artists — the pinned-artist set from the Artists list, surfaced
       under the Starred tab's Artists filter (read-only mirror; the pin itself
       still lives in the Artists list). */
    const [artistStars, setArtistStars] = useState<readonly string[]>(() => getArtistStars());
    useEffect(() => {
        setArtistStars(getArtistStars());
        return subscribeArtistStars((next) => setArtistStars(next));
    }, []);

    /* Starred Soundtracks — favourited Project soundtracks, under the Starred
       tab's Soundtracks filter. */
    const [soundtrackStars, setSoundtrackStars] = useState(() => getSoundtrackStarItems());
    useEffect(() => {
        setSoundtrackStars(getSoundtrackStarItems());
        return subscribeSoundtrackStars(() => setSoundtrackStars(getSoundtrackStarItems()));
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
        () => wishlistItems.filter((s) => getProject(s.slug) != null),
        [wishlistItems],
    );

    /* Achievements — PUBLIC for THIS profile's owner (any visitor sees any
       profile's wall, logged in or not). Fetched once per profile address from
       /api/achievements/{owner}; re-seeds on client-nav between profiles (the
       address-keyed effect re-runs). `unlocked` is the earned-id set, the rest
       is the owner's live score/rank/tally for the section header. One fetch per
       address, guarded by the dep array — no refetch on every render. */
    const [achData, setAchData] = useState<{
        unlocked: ReadonlySet<string>;
        priceScore: number;
        priceRank: number;
        unlockedCount: number;
    }>({ unlocked: new Set(), priceScore: 0, priceRank: 0, unlockedCount: 0 });
    useEffect(() => {
        let cancelled = false;
        setAchData({ unlocked: new Set(), priceScore: 0, priceRank: 0, unlockedCount: 0 });
        fetch(`/api/achievements/${user.address.toLowerCase()}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { unlocked?: string[]; priceScore?: number; priceRank?: number } | null) => {
                if (cancelled || !d) return;
                const set = new Set(d.unlocked ?? []);
                const visibleUnlocked = ACHIEVEMENTS.reduce(
                    (n, a) => (!a.secret && set.has(a.id) ? n + 1 : n),
                    0,
                );
                setAchData({
                    unlocked: set,
                    priceScore: d.priceScore ?? 0,
                    priceRank: d.priceRank ?? 0,
                    unlockedCount: visibleUnlocked,
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [user.address]);

    const iconToastProps = (label: string) => ({
        role: 'button' as const,
        tabIndex: 0,
        title: label,
        onClick: () => showToast(label),
        onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showToast(label);
            }
        },
    });

    // ── PriceDay popover (identity line date) ─────────────────────────
    const [priceDayOpen, setPriceDayOpen] = useState(false);
    const [priceDayPos, setPriceDayPos] = useState<{ top: number; left: number } | null>(null);
    const priceDayRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!priceDayOpen) return;
        const handler = (e: MouseEvent) => {
            if (priceDayRef.current && !priceDayRef.current.contains(e.target as Node)) {
                setPriceDayOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [priceDayOpen]);

    const openPriceDay = () => {
        if (priceDayOpen) { setPriceDayOpen(false); return; }
        if (priceDayRef.current) {
            const rect = priceDayRef.current.getBoundingClientRect();
            const POPOVER_WIDTH = 260;
            const MARGIN = 8;
            const MOBILE_BP = 600;
            let left: number;
            if (window.innerWidth < MOBILE_BP) {
                left = (window.innerWidth - POPOVER_WIDTH) / 2;
            } else {
                left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
                left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
            }
            setPriceDayPos({ top: rect.bottom + 4, left });
        }
        setPriceDayOpen(true);
    };

    /* The profile date popover is the NORMAL PriceDay almanac (Brendon
       2026-06-10 — the bespoke "origin" card was never asked for). It shows
       the PriceDay of the user's join date, with their joining as the first
       event, then the standard almanac sections for that day. */
    const joinDate = useMemo(() => {
        const d = new Date(user.created_at);
        return Number.isNaN(d.getTime()) ? null : d;
    }, [user.created_at]);
    const joinPriceDay = joinDate ? priceDayNumber(joinDate) : null;
    const joinDayContents = useMemo(
        () => (joinDate ? priceDayContents(joinDate) : null),
        [joinDate]
    );

    // ── Tab / sub-tab state ───────────────────────────────────────────
    const onShowcase  = activeTab === 'showcase';
    const onCollected = activeTab === 'collected';
    const onMore      = activeTab === 'more';

    /* Profile activity feed (Brendon 2026-06-15) — this wallet's own pre-chain
       events (mint / list / sale / transfer) from the shared ledger, filtered
       to this user. Reached via the Collected tab's FEED sort, mirroring the
       project page's feed. When empty it shows ghost rows — never hidden. */
    const feedActive = onCollected && sort === 'feed';
    const [feedRows, setFeedRows] = useState<FeedEvent[]>([]);
    useEffect(() => {
        if (!feedActive) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/feed?address=${user.address.toLowerCase()}&limit=100`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { events?: EventRow[] } | null) => {
                    if (!cancelled && Array.isArray(d?.events)) {
                        setFeedRows(d!.events.map(eventToFeedEvent));
                    }
                })
                .catch(() => { /* keep last good rows */ });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [feedActive, user.address]);
    const sortedFeedEvents = useMemo(() => {
        const events = [...feedRows];
        const dirMult = dir === 'asc' ? 1 : -1;
        if (feedKind === 'price') events.sort((a, b) => (a.price - b.price) * dirMult);
        else events.sort((a, b) => (a.timestamp - b.timestamp) * dirMult);
        return events;
    }, [feedRows, feedKind, dir]);

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

    const effStyle = effectiveShowcaseStyle(user.showcase_style, isArtist, user.address);
    const artistMode = onShowcase && isArtist && effStyle === 'artist';
    const createdUnderMore = isArtist && effStyle !== 'artist' && hasCreated;

    /* Created vs Top 6 toggle inside the Artist-style showcase. */
    const [showcaseView, setShowcaseView] = useState<ShowcaseView>('created');
    const artistShowcaseCreated = artistMode && showcaseView === 'created';

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
        const push = (slug: string, title: string, label: string, glyph: string, cls: string | undefined, ms: number | null) => {
            if (ms == null) return;
            items.push({ slug, title, label, glyph, cls, ts: ms });
        };
        const L = FEED_LIFECYCLE;
        for (const p of artistProjects) {
            const st = artistProjStats[p.slug];
            if (!st) continue;
            push(p.slug, p.displayName, L.upload.label, L.upload.glyph, undefined, st.uploaded_at);
            for (const [count, ts] of Object.entries(st.milestones)) {
                const m = milestoneByKey(count);
                if (m) push(p.slug, p.displayName, m.label, m.glyph, m.cls, ts);
            }
            push(p.slug, p.displayName, L.graduated.label, L.graduated.glyph, L.graduated.cls, st.reached_at);
            push(p.slug, p.displayName, L.ascension.label, L.ascension.glyph, undefined, st.sold_out_at);
        }
        const dirMult = mintSort.dir === 'asc' ? 1 : -1;
        items.sort((a, b) => (a.ts - b.ts) * dirMult);
        return items;
    }, [artistProjects, artistProjStats, mintSort.dir]);

    // ── Zen mode: Albums-only in + More sub-nav ───────────────────────
    useEffect(() => {
        if (isZen && moreL1 !== 'albums') setMoreL1('albums');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isZen]);

    /* Starred + Wishlists are PRIVATE — on someone else's profile the
       sections do not exist at all: no pills, no content, no notes
       (Brendon 2026-06-10). moreL1 can hold a stale private key after
       navigating own profile → other profile, so clamp it for visitors. */
    const effMoreL1: ProfileMoreL1 = (() => {
        let v = moreL1;
        // 'created' only exists for traditional-Top-6 artists with projects.
        if (v === 'created' && !createdUnderMore) v = 'albums';
        // Visitors never see private Starred/Wishlists — fall to Created (when
        // this artist surfaces it) else Albums.
        if (!isOwnProfile && (v === 'starred' || v === 'wishlists')) {
            v = createdUnderMore ? 'created' : 'albums';
        }
        return v;
    })();
    const onStarredTab = onMore && isOwnProfile && effMoreL1 === 'starred';
    const onWishlistTab = onMore && isOwnProfile && effMoreL1 === 'wishlists';
    /* Active sort/group config for the current Starred filter (or Wishlist). */
    const moreCfg = MORE_CFG[onWishlistTab ? 'wishlist' : moreMode] ?? MORE_CFG.all;
    /* Cycle the grouping through the dimensions that make sense for this filter. */
    const cycleMoreGroup = () => {
        const order = moreCfg.groups;
        const next = order[(order.indexOf(moreGroup) + 1) % order.length];
        setMoreGroup(next);
        showToast(next === 'none' ? 'Grouped: OFF' : `Grouped: ${(MORE_GROUP_NAME[next] ?? next).toUpperCase()}`);
    };
    /* Created carousels shown either inside the Artist-style showcase or as the
       +More sub-tab for traditional-Top-6 artists. */
    const moreCreatedActive = onMore && createdUnderMore && effMoreL1 === 'created';
    const createdCarouselsActive =
        (artistShowcaseCreated && mintSort.key !== 'feed') || moreCreatedActive;
    /* #gallery shows for Collected and for the Top 6 grid; the Created view
       replaces it with project carousels below. */
    const galleryVisible = ((onShowcase && !artistShowcaseCreated) || onCollected) && !feedActive;

    /* Mouse drag-to-scroll for the artist-project carousels — same handler as
       the home page. Touch swipes natively; this is the desktop grab-drag. A
       drag past a few px swallows the trailing click so it doesn't open a
       card. Re-binds when the Created view (re)mounts the tracks. */
    useEffect(() => {
        if (!createdCarouselsActive) return;
        const tracks = Array.from(
            document.querySelectorAll<HTMLElement>('.home-carousel-track'),
        );
        const cleanups = tracks.map((track) => {
            let down = false;
            let moved = false;
            let startX = 0;
            let startLeft = 0;
            const onDown = (e: MouseEvent) => {
                down = true;
                moved = false;
                startX = e.pageX;
                startLeft = track.scrollLeft;
                track.classList.add('dragging');
            };
            const onMove = (e: MouseEvent) => {
                if (!down) return;
                const dx = e.pageX - startX;
                if (Math.abs(dx) > 4) moved = true;
                e.preventDefault();
                track.scrollLeft = startLeft - dx;
            };
            const onUp = () => {
                if (!down) return;
                down = false;
                track.classList.remove('dragging');
                if (moved) {
                    const swallow = (ev: Event) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                    };
                    track.addEventListener('click', swallow, { capture: true, once: true });
                }
            };
            track.addEventListener('mousedown', onDown);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            return () => {
                track.removeEventListener('mousedown', onDown);
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
        });
        return () => cleanups.forEach((c) => c());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createdCarouselsActive, artistProjects, visibleArtistProjects.length]);

    return (
        <>
            <Hero
                ariaLabel="Profile Info"
                titleRow={
                    <>
                    <h1 className="project-title">
                        <span
                            className={isOwnProfile ? 'egg-name' : undefined}
                            role={isOwnProfile ? 'button' : undefined}
                            tabIndex={isOwnProfile ? 0 : undefined}
                            onClick={isOwnProfile ? handleNameTap : undefined}
                        >
                            @{displayHandle}
                        </span>
                        <span className="project-date-wrap" ref={priceDayRef}>
                            <span
                                className={`project-date${priceDayOpen ? ' pd-active' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={openPriceDay}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openPriceDay();
                                    }
                                }}
                                title="PriceDay"
                            >{memberSince || '\u2014'}</span>
                            {priceDayOpen && priceDayPos && joinDayContents && (
                                <div
                                    className="priceday-popover"
                                    style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}
                                >
                                    <div className="dp-title">PRICEDAY #{joinPriceDay}</div>
                                    <div className="dp-title-spacer" />

                                    <div className="pd-section-header">JOINED</div>
                                    <div className="dp-row">
                                        <span className="dp-label">{memberSince || '\u2014'}</span>
                                        <span className="dp-value">@{displayHandle}</span>
                                    </div>
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">MINTED THIS DAY</div>
                                    {joinDayContents.minted.map((r, i) => (
                                        <div className="dp-row" key={`m${i}`}>
                                            <span className="dp-label">{r.label}</span>
                                            <span className="dp-value">{r.value}</span>
                                        </div>
                                    ))}
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">UPLOADED THIS DAY</div>
                                    {joinDayContents.uploaded.map((r, i) => (
                                        <div className="dp-row" key={`u${i}`}>
                                            <span className="dp-label">{r.label}</span>
                                            <span className="dp-value">{r.value}</span>
                                        </div>
                                    ))}
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">BIGGEST SALE</div>
                                    {joinDayContents.biggestSale && (
                                        <div className="dp-row">
                                            <span className="dp-label">{joinDayContents.biggestSale.label}</span>
                                            <span className="dp-value">{joinDayContents.biggestSale.value}</span>
                                        </div>
                                    )}
                                    <div className="pd-section-end" />
                                </div>
                            )}
                        </span>
                    </h1>
                    {isOwnProfile && eggOpen && (
                        <div className="profile-egg-row">
                            {eggPills.map((p) => {
                                const active =
                                    (myProfileHex ?? '').toUpperCase() === p.hex.toUpperCase();
                                return (
                                    <div
                                        key={p.hex + p.name}
                                        className={`pill pill-l3${active ? ' active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setMyProfileHex(p.hex)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setMyProfileHex(p.hex);
                                            }
                                        }}
                                        title={p.hex}
                                    >
                                        <span className="stat-name">{p.name}</span>
                                    </div>
                                );
                            })}
                            {/* Back pill — reverts to the colorway in play when the
                                egg was opened. Just the back glyph, no label. */}
                            <div
                                className="pill pill-l3 egg-back-pill"
                                role="button"
                                tabIndex={0}
                                onClick={() => setMyProfileHex(preEggHex.current)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setMyProfileHex(preEggHex.current);
                                    }
                                }}
                                title="Revert to your previous colorway"
                                aria-label="Revert to your previous colorway"
                            >
                                <span className="stat-name">{'⇠⇠︎'}</span>
                            </div>
                        </div>
                    )}
                    </>
                }
                identityRow={
                    <div className="hero-line project-custom id-row-fit" ref={idRowRef}>
                        {nameFace && <span className="id-row-sprite">{nameFace}</span>}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                {/* Links to the owner's Etherscan page (Brendon
                                    2026-06-10) — it used to link to this same
                                    profile, a circle. */}
                                <a
                                    ref={idAddrRef}
                                    href={`https://etherscan.io/address/${user.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {user.ens_name ? (
                                        viaLabel
                                    ) : (
                                        <>
                                            0<span className="addr-x">x</span>
                                            {viaLabel.slice(2)}
                                        </>
                                    )}
                                </a>
                                {/* Artist badge — whitelisted wallets only. Sits in
                                    the identity line right after the address, in
                                    Courier at the row's size and the address's own
                                    colour + opacity (Brendon, 2026-06-16). */}
                                {artistStatus && (
                                    <span className="id-row-artist" aria-label="Official PD Artist (whitelisted)" title="✺︎ Official PD Artist — whitelisted">{'✺︎'}</span>
                                )}
                                <span
                                    className="icon-copy id-copy"
                                    role="button"
                                    tabIndex={0}
                                    title={`Copy ${user.ens_name ? 'ENS' : 'wallet address'}`}
                                    onClick={(e) => { e.preventDefault(); handleCopyIdentity(); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleCopyIdentity();
                                        }
                                    }}
                                >
                                    {idCopied ? '\u2713\uFE0E' : '⧉\uFE0E'}
                                </span>
                            </span>                        </div>
                    </div>
                }
                socialRow={
                    mutuals.length > 0 ? (
                    <div className="hero-line collected-by-row info-line">
                        <span className="cbr-label">Followed by</span>{' '}
                        {mutuals.map((m, i) => (
                            <span key={m}>
                                {i > 0 && ', '}
                                <a className="cbr-name" href={`/${m}`}>@{m}</a>
                            </span>
                        ))}
                        {mutualOthers > 0 && (
                            <>
                                {' '}
                                <span className="cbr-others">
                                    &amp; {mutualOthers} {mutualOthers === 1 ? 'Other' : 'Others'} You Follow
                                </span>
                            </>
                        )}
                    </div>
                    ) : undefined
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span
                                className="stat-icon stat-icon-box"
                                {...iconToastProps('Outputs Collected')}
                            >
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">{holdings.length}</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span
                                className="stat-icon-eth"
                                {...iconToastProps('Volume Spent')}
                            >
                                ⟠&#xFE0E;
                            </span>{' '}
                            <span className="stat-val stat-val-vol">0</span>
                        </span>
                        <span
                            className="stat-item stat-item-owners"
                            role="button"
                            tabIndex={0}
                            onClick={() => showToast('Followers: COMING SOON')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    showToast('Followers: COMING SOON');
                                }
                            }}
                        >
                            <span className="stat-icon stat-icon-owners stat-icon-followers" {...iconToastProps('Followers')}>{'\u26AC\uFE0E'}</span>{' '}
                            <span className="stat-val stat-val-owners">{counts.followers} {counts.followers === 1 ? 'FOLLOWER' : 'FOLLOWERS'}</span>
                        </span>
                    </div>
                }
            >
                    <div className="action-row">
                        <FollowButton targetAddress={user.address} targetHandle={user.handle ?? displayHandle} />
                        <button
                            className="btn-soundtrack"
                            title="Profile action — coming soon"
                            onClick={() => showToast('Share: COMING SOON')}
                        >
                            {/* Play icon stays on the soundtrack button no matter the
                                label (Brendon, 2026-06-15). */}
                            <span className="btn-icon-play">▶&#xFE0E;</span>{' '}<span>SHARE</span>
                        </button>
                    </div>

                    {/* Tab row */}
                    <div className="profile-tabs-row" id="profileTabsRow">
                        <div
                            className={`pill pill-l1${onShowcase ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTabPersisted('showcase')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTabPersisted('showcase'); } }}
                        >
                            <span className="stat-name">Showcase</span>
                        </div>
                        <div
                            className={`pill pill-l1${onCollected ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTabPersisted('collected')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTabPersisted('collected'); } }}
                        >
                            <span className="stat-name">Collected</span>
                        </div>
                        <div
                            className={`pill pill-l1${onMore ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTabPersisted('more')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTabPersisted('more'); } }}
                        >
                            <span className="stat-name">+ More</span>
                        </div>
                    </div>

                    {/* + More tab content: secondary stats + Discord link.
                        Colorway picker removed — now lives in Collected TraitsUI sort-bar. */}
                    {/* + More tab: profile sub-nav pills (Starred / Wishlists /
                        Albums / Info). Rendered first so the pill row sits flush
                        directly under the main tabs, mirroring the Collected
                        facet-bar pattern. */}
                    {onMore && (
                        <TraitsUI
                            visible={true}
                            hideSortBar
                            profilePills={
                                (isZen
                                    ? [{ key: 'albums', label: 'Albums', active: effMoreL1 === 'albums', onClick: () => setMoreL1('albums') }]
                                    : [
                                        /* Created leads the row for traditional-Top-6
                                           artists — their works are always reachable. */
                                        ...(createdUnderMore
                                            ? [{ key: 'created', label: 'Created', active: effMoreL1 === 'created', onClick: () => setMoreL1('created') }]
                                            : []),
                                        /* Starred + Wishlists are private — the
                                           pills exist on YOUR OWN profile only. */
                                        ...(isOwnProfile
                                            ? [
                                                { key: 'starred',   label: 'Starred',   active: effMoreL1 === 'starred',   onClick: () => setMoreL1('starred')   },
                                                { key: 'wishlists', label: 'Wishlists', active: effMoreL1 === 'wishlists', onClick: () => setMoreL1('wishlists') },
                                            ]
                                            : []),
                                        { key: 'albums',    label: 'Albums',    active: effMoreL1 === 'albums',    onClick: () => setMoreL1('albums')    },
                                        { key: 'achievements', label: 'Achievements', active: effMoreL1 === 'achievements', onClick: () => setMoreL1('achievements') },
                                        { key: 'info',      label: 'Info',      active: effMoreL1 === 'info',      onClick: () => setMoreL1('info')      },
                                    ]
                                )
                            }
                            profilePillsTrailing={
                                (onStarredTab || onWishlistTab) ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <div
                                            className={`multiselect-btn${moreMultiActive ? ' active' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            title="Multi-Select"
                                            onClick={() => setMoreMultiActive((v) => !v)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMoreMultiActive((v) => !v); } }}
                                        >
                                            ❐&#xFE0E;
                                        </div>
                                        <div
                                            className={`search-btn${moreSearchOpen ? ' active' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            title="Search"
                                            onClick={toggleMoreSearch}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMoreSearch(); } }}
                                        >
                                            ⌕&#xFE0E;
                                        </div>
                                    </div>
                                ) : undefined
                            }
                            profileSortControls={
                                (onStarredTab || onWishlistTab) ? (
                                    <div className="sort-btn-group" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
                                        {moreCfg.sorts.map((key) => (
                                            <span
                                                key={key}
                                                className={`sort-btn${moreSort === key ? ' active' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                title={`Sort by ${MORE_SORT_LABEL[key]}`}
                                                onClick={() => cycleMoreSort(key)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleMoreSort(key); } }}
                                            >
                                                <span className="sort-lbl">{MORE_SORT_LABEL[key]}</span>
                                                <span className="sort-arrow">{moreSort === key ? (moreSortDir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                                            </span>
                                        ))}
                                        {moreCfg.groups.length > 1 && (
                                            <span
                                                className={`sort-btn${moreGroup !== 'none' ? ' active' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                title="Group by"
                                                onClick={cycleMoreGroup}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleMoreGroup(); } }}
                                            >
                                                <span className="sort-lbl">{moreGroup === 'none' ? 'Group' : (MORE_GROUP_NAME[moreGroup] ?? moreGroup)}</span>
                                            </span>
                                        )}
                                    </div>
                                ) : undefined
                            }
                        />
                    )}

                    {/* Info sub-tab content: followers / following / anchor + the
                        Discord link. Previously wedged between the main tabs and the
                        sub-pill row; now it lives under the Info sub-tab so the pills
                        sit flush under the main tabs (Collected-tab pattern). */}
                    {onMore && effMoreL1 === 'info' && (
                        <div className="more-tab-stats">
                            <div className="hero-line stats-row stats-row-2">
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Followers')}>◎&#xFE0E;</span>{' '}
                                    <span className="stat-val">{counts.followers}</span>
                                </span>
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Following')}>⊙&#xFE0E;</span>{' '}
                                    <span className="stat-val">{counts.following}</span>
                                </span>
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Anchor — coming soon')}>⚓&#xFE0E;</span>{' '}
                                    <span className="stat-val stat-val-empty">—</span>
                                </span>
                            </div>

                            {user.discord_id && user.discord_username ? (
                                <div style={{ marginTop: 14, fontFamily: 'Courier New, monospace' }}>
                                    <a
                                        href={`https://discord.com/users/${user.discord_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Discord: @{user.discord_username}
                                    </a>
                                    {isOwnProfile && (
                                        <button
                                            type="button"
                                            style={{
                                                marginLeft: 10,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                opacity: 0.6,
                                            }}
                                            onClick={async () => {
                                                await fetch('/api/auth/discord', { method: 'DELETE' });
                                                window.location.reload();
                                            }}
                                        >
                                            (unlink)
                                        </button>
                                    )}
                                </div>
                            ) : isOwnProfile ? (
                                <button
                                    type="button"
                                    className={!isAuthed ? 'auth-gated' : undefined}
                                    style={{
                                        cursor: 'pointer',
                                        fontFamily: 'Courier New, monospace',
                                        marginTop: 14,
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                    }}
                                    onClick={() => {
                                        if (!isAuthed) return;
                                        window.location.href = '/api/auth/discord';
                                    }}
                                >
                                    Link Discord
                                </button>
                            ) : null}
                        </div>
                    )}

                    {/* Achievements sub-tab — PUBLIC wall for the profile owner.
                        Owner's score / rank / tally up top, then the full catalog
                        as a categorized grid (locked/unlocked, secret → "???").
                        Works logged-out. */}
                    {onMore && effMoreL1 === 'achievements' && (
                        <div className="ach-section">
                            <div className="ach-summary">
                                <span className="ach-summary-stat">
                                    <span className="ach-summary-val">{achData.priceScore.toLocaleString()}</span>
                                    <span className="ach-summary-label">PRICESCORE</span>
                                </span>
                                <span className="ach-summary-stat">
                                    <span className="ach-summary-val">
                                        {achData.priceRank <= 0
                                            ? '⓿'
                                            : String.fromCodePoint(0x2775 + Math.min(achData.priceRank, 10))}
                                    </span>
                                    <span className="ach-summary-label">PRICERANK</span>
                                </span>
                                <span className="ach-summary-stat">
                                    <span className="ach-summary-val">{achData.unlockedCount} / {VISIBLE_COUNT}</span>
                                    <span className="ach-summary-label">UNLOCKED</span>
                                </span>
                                <span className="ach-summary-stat">
                                    <span className="ach-summary-val">{achData.priceScore.toLocaleString()} / {MAX_PRICE_SCORE.toLocaleString()}</span>
                                    <span className="ach-summary-label">PTS</span>
                                </span>
                            </div>
                            <AchievementsGrid unlocked={achData.unlocked} />
                        </div>
                    )}

                    {/* Collected tab: platform-facet filter over the wallet's real
                        holdings (Artist · Project · PriceDay · Natal · Fate · Status).
                        Distinct from the project page's per-Project trait pills — a
                        collection spans independent projects, so it filters on the
                        platform facets every Output carries. */}
                    {onCollected && <ProfileFacetBar holdings={enriched} isOwnProfile={isOwnProfile} />}

                    {/* Artist-style Showcase — the home Now-Minting control surface
                        over this artist's own projects. Created · Top 6 lead the
                        facet row (in place of Artist + Project); Top 6 collapses to
                        the curated grid. */}
                    {artistMode && (
                        <HomeProjectFacetBar
                            projects={enrichedArtistProjects}
                            sortKey={mintSort.key}
                            sortDir={mintSort.dir}
                            onSort={onMintSort}
                            applySort={applyMintSort}
                            facets={ARTIST_SHOWCASE_FACETS}
                            compact={showcaseView === 'regular'}
                            leadPills={[
                                { key: 'created', label: 'Created', active: showcaseView === 'created', onClick: () => setShowcaseView('created') },
                                { key: 'regular', label: 'Top 6', active: showcaseView === 'regular', onClick: () => setShowcaseView('regular') },
                            ]}
                        />
                    )}
            </Hero>

            {/* Zen Garden — the portfolio as a raked ASCII rock garden, shown
                only while Zen Mode is active (pure aesthetic). */}
            {isZen && <ZenGarden address={user.address} count={holdings.length} />}

            {/* Starred / Wishlist ghost rows — YOUR OWN profile with zero
                items only (Brendon 2026-06-10: these sections are private
                and DO NOT EXIST on other users' profiles — no pills, no
                content, no notes). 1:1 stand-ins of the real rows, no
                copy; same wrapper classes so ghosts sit exactly where
                real rows render. */}
            {onStarredTab && starredValid.length === 0 && traitStarsValid.length === 0 && artistStars.length === 0 && soundtrackStars.length === 0 && projectStarsValid.length === 0 && (
                <section className="starred-list" aria-label="Starred">
                    <div className="starred-rows">
                        <GhostRows variant="starred" />
                    </div>
                </section>
            )}
            {onWishlistTab && wishlistValid.length === 0 && (
                <section className="starred-list" aria-label="Wishlist">
                    <div className="starred-rows">
                        <GhostRows variant="wishlist" />
                    </div>
                </section>
            )}

            {/* Gallery — Showcase or Collected depending on active tab. Each
                Showcase slot is wrapped in its own ProjectProvider so the curated
                order is preserved exactly regardless of which project each pick is
                from (the provider is a context-only node, no DOM, so every card
                still lands in the single #gallery grid). */}
            <section
                id="gallery"
                aria-label="Gallery"
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {onShowcase
                    ? ((isOwnProfile ? ownShowcaseItems.length : showcaseSlots.length) > 0
                        ? (isOwnProfile
                            ? ownShowcaseItems.map((s, i) => (
                                  <ProjectProvider key={`sc-${i}-${s.slug}-${s.id}`} slug={s.slug}>
                                      <ArtworkCard id={s.id} showProjectName />
                                  </ProjectProvider>
                              ))
                            : showcaseSlots.map((slot, i) => (
                                  <ProjectProvider key={`sc-${i}-${slot.project_id}-${slot.token_id}`} slug={slot.project_id}>
                                      <ArtworkCard id={Number(slot.token_id)} showProjectName />
                                  </ProjectProvider>
                              )))
                        : showcaseGhosts.map((aspect, i) => (
                              <GhostCard
                                  key={`scghost-${i}`}
                                  aspect={aspect}
                                  index={i}
                                  onActivate={isOwnProfile ? () => setShowcasePickerOpen(true) : undefined}
                              />
                          )))
                    : enriched.length === 0
                        ? collectedGhosts.map((aspect, i) => (
                              <GhostCard key={`coghost-${i}`} aspect={aspect} index={i} />
                          ))
                        : collectedGroups
                            ? collectedGroups.map((blk) => {
                                  const g = blk.group;
                                  const cards = blk.cards;
                                  const l1Collapsed = collapsedGroups.has(blk.l1Key);
                                  const l2Collapsed = blk.l2Key ? collapsedGroups.has(blk.l2Key) : false;
                                  // Section folded → hide all cards (and any sub-header).
                                  const cardsHidden = l1Collapsed || l2Collapsed;
                                  return (
                                      <Fragment key={blk.key}>
                                          {blk.heads.map((h, hi) => {
                                              const isL2 = h.level === 2;
                                              // A folded level-1 also folds away its sub-headers.
                                              if (isL2 && l1Collapsed) return null;
                                              const ckey = isL2 ? blk.l2Key! : blk.l1Key;
                                              const folded = isL2 ? l2Collapsed : l1Collapsed;
                                              return (
                                                  <div
                                                      key={hi}
                                                      className={`gallery-group-header is-collapsible${isL2 ? ' level-2' : ''}${h.soon ? ' soon' : ''}${folded ? ' collapsed' : ''}`}
                                                      role="button"
                                                      tabIndex={0}
                                                      aria-expanded={!folded}
                                                      onClick={() => toggleGroupCollapse(ckey)}
                                                      onKeyDown={(e) => {
                                                          if (e.key === 'Enter' || e.key === ' ') {
                                                              e.preventDefault();
                                                              toggleGroupCollapse(ckey);
                                                          }
                                                      }}
                                                  >
                                                      <span className="ggh-arrow" aria-hidden="true">
                                                          {folded ? '▸︎' : '▾︎'}
                                                      </span>
                                                      <span className="ggh-label">{h.label}</span>
                                                      {h.by ? <span className="ggh-by"> by @{h.by}</span> : null}
                                                      {h.soon ? <span className="ggh-soon">coming soon</span> : null}
                                                  </div>
                                              );
                                          })}
                                          {cardsHidden
                                              ? null
                                              : g
                                              ? (
                                                  <ProjectProvider slug={g.slug}>
                                                      {g.ids.map((id) => (
                                                          <ArtworkCard key={`${g.slug}-${id}`} id={id} hideOwnedBadge showProjectName />
                                                      ))}
                                                  </ProjectProvider>
                                              )
                                              : cards?.map((c) => (
                                                  <ProjectProvider key={`${c.slug}-${c.id}`} slug={c.slug}>
                                                      <ArtworkCard id={c.id} hideOwnedBadge showProjectName />
                                                  </ProjectProvider>
                                              ))}
                                      </Fragment>
                                  );
                              })
                            : collectedByProject.map(({ slug, ids }) => (
                                  <ProjectProvider key={slug} slug={slug}>
                                      {ids.map((id) => (
                                          <ArtworkCard key={`${slug}-${id}`} id={id} hideOwnedBadge showProjectName />
                                      ))}
                                  </ProjectProvider>
                              ))}
            </section>

            {/* Activity feed — this wallet's own ledger events, reached via the
                Collected tab's FEED sort (same surface + markup as the project
                page). Ghost rows when there's nothing yet — never hidden. */}
            <section
                id="activity-feed"
                aria-label="Activity Feed"
                style={{ display: feedActive ? 'block' : 'none' }}
            >
                <div className="feed-list" id="feedList">
                    {sortedFeedEvents.length === 0 ? (
                        <GhostFeedRows />
                    ) : sortedFeedEvents.map((e) => (
                        <div className="feed-row" key={e.id}>
                            <div className="feed-line" />
                            <div className="f-icon-wrap">{e.icon}&#xFE0E;</div>
                            <div className="f-time">{e.time}</div>
                            <div className="f-type">{e.type}</div>
                            <div className="f-content">{e.detail}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Artist-style Showcase · Created — the Now-Minting carousels of this
                artist's own projects, filtered + sorted by the showcase facet bar.
                FEED sort swaps them for the lifecycle activity feed. */}
            {artistShowcaseCreated && mintSort.key !== 'feed' && (
                <section aria-label="Created projects">
                    {visibleArtistProjects.length === 0 ? (
                        <div className="home-empty-note">
                            No projects match — clear the filters to see them all.
                        </div>
                    ) : visibleArtistProjects.map((p, i) => (
                        <ProjectProvider key={p.slug} slug={p.slug} initialTotal={p.minted}>
                            <ArtistProjectCarousel eager={i === 0} />
                        </ProjectProvider>
                    ))}
                </section>
            )}

            {/* Artist-style Showcase · Created · FEED — project lifecycle events. */}
            {artistShowcaseCreated && mintSort.key === 'feed' && (
                <section className="home-uploads" aria-label="Activity Feed">
                    <div className="feed-list home-activity-feed">
                        {artistFeedView.length === 0 ? (
                            <GhostFeedRows />
                        ) : artistFeedView.map((ev) => (
                            <div className="feed-row" key={`${ev.label}-${ev.slug}-${ev.ts}`}>
                                <div className="feed-line" />
                                <div className={`f-icon-wrap af-ic${ev.cls ? ` ${ev.cls}` : ''}`}>{ev.glyph}&#xFE0E;</div>
                                <div className="f-time">{fmtFeedDate(ev.ts)}</div>
                                <div className="f-type af-type">
                                    <span>{ev.label}</span>
                                    <span>{fmtFeedTime(ev.ts)}</span>
                                </div>
                                <div className="f-content">
                                    <a className="f-highlight upload-title" href={`/art/${ev.slug}`}>{ev.title}</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* +More · Created — for traditional-Top-6 artists, their works are
                always reachable here as plain carousels (home-page pattern). */}
            {moreCreatedActive && (
                <section aria-label="Created projects">
                    {artistProjects.map((p, i) => (
                        <ProjectProvider key={p.slug} slug={p.slug}>
                            <ArtistProjectCarousel eager={i === 0} />
                        </ProjectProvider>
                    ))}
                </section>
            )}

            {/* Starred — a compact bookmark ROW list (not the gallery grid):
                sortable/filterable rows with a small preview that opens the
                Artwork modal. Own profile only (Stars are private). */}
            {onStarredTab && isOwnProfile && (starredValid.length > 0 || traitStarsValid.length > 0 || artistStars.length > 0 || soundtrackStars.length > 0 || projectStarsValid.length > 0) && (
                <StarredList
                    items={starredValid}
                    traits={traitStarsValid}
                    artists={artistStars}
                    soundtracks={soundtrackStars}
                    projects={projectStarsValid}
                    searchOpen={moreSearchOpen}
                    query={moreQuery}
                    onQueryChange={setMoreQuery}
                    onCloseSearch={closeMoreSearch}
                    multiActive={moreMultiActive}
                    onExitMulti={() => setMoreMultiActive(false)}
                    sortKey={moreSort}
                    sortDir={moreSortDir}
                    group={moreGroup}
                    onModeChange={setMoreMode}
                />
            )}

            {/* Wishlist — buy-focused row list (price + cart + remove). Own
                profile only (private). */}
            {onWishlistTab && isOwnProfile && wishlistValid.length > 0 && (
                <WishlistList
                    items={wishlistValid}
                    searchOpen={moreSearchOpen}
                    query={moreQuery}
                    onQueryChange={setMoreQuery}
                    onCloseSearch={closeMoreSearch}
                    multiActive={moreMultiActive}
                    onExitMulti={() => setMoreMultiActive(false)}
                    sortKey={moreSort}
                    sortDir={moreSortDir}
                />
            )}

            {/* Add-to-Showcase picker — opened by tapping a ghost frame on your
                own empty Showcase. Lists your holdings to feature. */}
            {showcasePickerOpen && isOwnProfile && (
                <AddToShowcaseModal
                    holdings={holdings
                        .filter((h) => getProject(h.slug) != null)
                        .map((h) => ({ slug: h.slug, id: h.token_id }))}
                    onClose={() => setShowcasePickerOpen(false)}
                />
            )}
        </>
    );
}

export default function ProfilePageBody({
    handle,
    initialUser,
    initialHoldings,
    artistStatus = null,
}: {
    handle: string;
    initialUser: UserProfileData;
    initialHoldings: Holding[];
    artistStatus?: 'active' | 'cooldown' | null;
}) {
    return (
        <TraitsProvider>
            <ProfilePageBodyInner
                handle={handle}
                initialUser={initialUser}
                initialHoldings={initialHoldings}
                artistStatus={artistStatus}
            />
        </TraitsProvider>
    );
}
