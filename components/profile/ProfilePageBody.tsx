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

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, Fragment, type KeyboardEvent } from 'react';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { formatEth } from '../../lib/format/eth';
import { getRememberedTab, rememberTab } from '../../lib/state/tabMemoryStore';
import { useAuth } from '../../lib/state/AuthContext';
import { rankSocialCandidates } from '../../lib/social/relevance';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import { useModal } from '../../lib/state/ModalContext';
import SpriteFace from '../SpriteFace';
import { useColorway } from '../../lib/state/ColorwayContext';
import { useProfileHex, PROFILE_HEX_DEFAULT } from '../../lib/hooks/useProfileHex';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { shareLink } from '../../lib/pwa/share';
import { useSort, groupHeaderGlyph } from '../../lib/state/SortContext';
import { GhostFeedRows } from '../GhostFeed';
import FeedEventRow from '../feed/FeedEventRow';
import ArtworkCard from '../ArtworkCard';
import { subscribeBreadcrumbs, isRecordingEnabled, setRecordingEnabled } from '../../lib/pins/breadcrumbStore';
import { fetchMyHistory, type HistoryEntry } from '../../lib/output/views';
import { getShowcaseItems, subscribeShowcase } from '../../lib/pins/userShowcaseStore';
import AddToShowcaseModal from './AddToShowcaseModal';
import ArtistTitleStar from './ArtistTitleStar';
import StarredList from './StarredList';
import StarredPresetRow from './StarredPresetRow';
import WishlistList from './WishlistList';
import { StickerArt } from '../stickers/StickerArt';
import { PROFILE_LOGO_CAROUSEL, PROFILE_LOGO_OFF } from '../../lib/profile/profileLogos';
import { useProfileLogo } from '../../lib/hooks/useProfileLogo';
import { factionForLogo } from '../../lib/factions/factions';
import { PROFILE_SIGIL_RING } from '../../lib/profile/profileLogos';
import { useSigilForged } from '../../lib/sigil/useSigilForged';
import { SIGIL_BONE } from '../../lib/sigil/sigil';
import SigilArt from '../SigilArt';
import SigilBubble from '../SigilBubble';
import { useProfileSpriteHex } from '../../lib/hooks/useProfileSpriteHex';
import { setActiveProfileLogo } from '../../lib/profile/profileLogoActive';
import GhostRows from './GhostRows';
import TraitsUI from '../project/TraitsUI';
import AchievementsGrid from '../achievements/AchievementsGrid';
import ProfileAnointedPanel from './ProfileAnointedPanel';
import VaultPanel from './VaultPanel';
import DiscordSection from './DiscordSection';
import { MAX_PRICE_SCORE, TOTAL_COUNT } from '../../lib/achievements/catalog';
import Hero from '../hero/Hero';
import CompletionismModal from '../CompletionismModal';
import FollowButton from './FollowButton';
import { HeroStickers } from '../stickers/HeroStickers';
import { getProject, allProjects, projectsByArtist, artistSignatureColor } from '../../lib/project/registry';
import HomeProjectFacetBar from '../home/HomeProjectFacetBar';
import GhostCard from '../project/GhostCard';
import ZenGarden from './ZenGarden';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import ProfileFacetBar from './ProfileFacetBar';
import TakeoverBanners from '../takeover/TakeoverBanners';
import type { ShowcaseSlot } from '../../lib/supabase';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';
import { priceDayNumber } from '../../lib/priceday/priceday';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import AlbumsPanel from '../album/AlbumsPanel';
import {
    formatMemberSince, fmtFeedDate, fmtFeedTime,
    ARTIST_SHOWCASE_FACETS,
    type ProfileTab, type ProfileMoreL1, type Holding,
} from './profilePageShared';
import ArtistProjectCarousel from './ArtistProjectCarousel';
import JoinDayPopover from './JoinDayPopover';
import { useProfileEggs } from './useProfileEggs';
import { useStarredPins } from './useStarredPins';
import { useMoreControls, MORE_CFG, MORE_SORT_LABEL, MORE_GROUP_GLYPH, type MoreMode } from './useMoreControls';
import { GroupBtn } from '../project/traitsUIPills';
import { useGalleryCols, colsWidth } from '../../lib/hooks/useGalleryCols';
import { usePriceDayPopover } from '../../lib/hooks/usePriceDayPopover';
import { useProfileAchievements } from './useProfileAchievements';
import { useLedgerFeed } from '../../lib/feed/useLedgerFeed';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';
import { useCollectedGallery } from './useCollectedGallery';
import { useArtistShowcase } from './useArtistShowcase';

/* DEACTIVATE (Spell Book) — the understated "account deactivated" state a
   VISITOR sees on a deactivated profile. Deliberately plain (not corny — the
   read an IG profile gives when someone deactivates): an empty avatar, the
   @handle, one line. The owner never sees this; their profile stays fully
   theirs behind it. */
function DeactivatedProfile({ handle }: { handle: string }) {
    return (
        <section className="deactivated-profile" aria-label="Deactivated account">
            <div className="deactivated-avatar" aria-hidden="true" />
            <div className="deactivated-handle">@{handle}</div>
            <p className="deactivated-msg">This account is deactivated.</p>
        </section>
    );
}

function ProfilePageBodyInner({
    handle,
    initialUser,
    initialHoldings,
    initialOwnedCount = 0,
    artistStatus,
}: {
    handle: string;
    initialUser: UserProfileData;
    initialHoldings: Holding[];
    initialOwnedCount?: number;
    artistStatus: 'active' | 'cooldown' | null;
}) {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    /* Spite Book — spited handles render redacted on this page's social rows. */
    const isSpited = useSpiteMatcher();
    const { notifs } = usePdNotifs();
    const isZen = notifs.zenMode;
    const { sort, group, restoreGroupFor } = useSort();

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
    /* COMPLETIONISM modal (own profile only, off the ⬚ collected stat). */
    const [completionismOpen, setCompletionismOpen] = useState(false);
    /* Seed the Profile Colorway hook with the server-known colour on your OWN
       profile so it paints the real colour on the first pass instead of flashing
       white then repainting (Brendon, 2026-06-18). Only on own profile — on
       someone else's, this hook is the VIEWER's colour and must not be seeded
       with the page owner's. */
    const { hex: myProfileHex, setHex: setMyProfileHex } = useProfileHex(
        isOwnProfile ? user.profile_hex : undefined,
    );
    /* BASE paint — EVERY profile, INCLUDING your own, paints from the server
       profile_hex, identically, with NO dependency on logged-in state (Brendon,
       2026-06-25: "load my page the same as any other profile; deal with login
       later in the sequence"). Layout effect = before paint, so the first frame
       of the new profile is already its owner colour, never the white default
       while auth resolves. */
    useLayoutEffect(() => {
        // Artist fallback mirrors the server boot paint: no picked Profile
        // Colorway -> the artist's signature colour (flagship Project).
        setActiveProfileHex(user.profile_hex ?? artistSignatureColor(handle));
        return () => setActiveProfileHex(null);
    }, [user.profile_hex, handle, setActiveProfileHex]);

    /* LIVE-EDIT overlay — LATER in the sequence, your OWN profile only, once
       logged-in state has resolved: reflect instant colour edits from the picker
       on top of the server base. Passive (after paint) by design — it must NEVER
       gate or delay the base paint above. */
    useEffect(() => {
        if (!isOwnProfile) return;
        /* Reflect the live pick verbatim — including Matrix White (#E0E0E0),
           which equals the "unset" default sentinel. Guarding it out made that
           one pill a no-op; painting it is correct (it resolves to the same
           light background the default already uses). */
        if (myProfileHex) {
            setActiveProfileHex(myProfileHex);
        }
    }, [isOwnProfile, myProfileHex, setActiveProfileHex]);

    /* Profile Logo — same rails as the Profile Colorway above. The owner's pick
       (`profile_logo`) decorates the CORNER LOGO on their profile for every
       visitor, overriding the viewer's own logo setting; on your OWN profile the
       live hook value drives the picker carousel + an instant repaint. */
    const { logo: myProfileLogo, setLogo: setMyProfileLogo } = useProfileLogo(
        isOwnProfile ? user.profile_logo : undefined,
    );
    const ownerLogo = isOwnProfile ? myProfileLogo : user.profile_logo;
    useEffect(() => {
        /* The owner address rides along so a Sigil pick can render the
           owner's own mark in the corner (per-wallet art). */
        setActiveProfileLogo(ownerLogo ?? null, user.address);
        return () => setActiveProfileLogo(null);
    }, [ownerLogo, user.address]);

    /* THE SIGIL — forged state gates the carousel's Sigil ring; the forge
       tile itself is always the carousel's last stop. */
    const sigilForged = useSigilForged();

    /* FACTIONS (spec v3.1, settled #2/#4): picking a blank bubble reveals the
       allegiance it carries — the toast IS the tutorial. Only faction logos
       fire it (never solids / Petey / $PRICE / holo / off — those stay
       silent); a switch from one faction colour to another is a defection
       and says so. Everything else about the pick is untouched. */
    const pickProfileLogo = (id: string | null) => {
        const prev = factionForLogo(myProfileLogo);
        setMyProfileLogo(id);
        const next = factionForLogo(id);
        if (!next) return;
        if (prev && prev.key !== next.key) showToast(`Oath: BROKEN · Profile Faction: ${next.key}`);
        else showToast(`Profile Faction: ${next.key}`);
    };

    /* Profile Sprite colour — the owner's picked PriceSprite hex, shown to every
       visitor; on your own profile the live hook value drives the picker + an
       instant repaint. null = inherit the colorway text colour (the default). */
    const { hex: mySpriteHex, setHex: setMySpriteHex } = useProfileSpriteHex(
        isOwnProfile ? user.profile_sprite_hex : undefined,
    );
    const ownerSpriteHex = isOwnProfile ? mySpriteHex : user.profile_sprite_hex;

    const displayHandle = user.handle ?? handle;

    const {
        eggOpen, preEggHex, handleNameTap,
        nameCarouselOpen, nameLpFired, onNamePointerDown, onNamePointerMove, onNamePressEnd,
        spritePickerOpen, spriteLpFired, preSpriteHex,
        onSpritePointerDown, onSpritePointerMove, onSpritePressEnd,
        eggPills,
    } = useProfileEggs({ isOwnProfile, user, displayHandle, myProfileHex, mySpriteHex });

    /* This profile's PriceSprite — a small STILL face beside the @name (the
       profile's avatar; PD has no uploaded pfps). Works for any user via the
       frozen signup sprite (useSpriteFace, cached). Courier, understated —
       not the loud chip that was reverted on the project hero. */
    const nameFace = useSpriteFace(displayHandle);
    const { open: openModal } = useModal();
    const memberSince = formatMemberSince(user.created_at);

    /* Chosen ENS, live on your OWN profile: the picker in Settings fires
       'pd:ens-changed' so the identity row repaints instantly instead of waiting
       for a reload. Visitors read the server value. */
    const [ownEns, setOwnEns] = useState<string | null>(user.ens_name);
    useEffect(() => {
        if (!isOwnProfile) return;
        const h = (e: Event) => setOwnEns((e as CustomEvent<string | null>).detail ?? null);
        window.addEventListener('pd:ens-changed', h);
        return () => window.removeEventListener('pd:ens-changed', h);
    }, [isOwnProfile]);
    const ensName = isOwnProfile ? ownEns : user.ens_name;

    /* Chosen Showcase order, live on your OWN profile: the Settings toggle fires
       'pd:showcase-style-changed' so the showcase re-sorts instantly (Static ↔
       Shuffle ↔ …) instead of waiting for a reload. Visitors read the server
       value. */
    const [liveShowcaseStyle, setLiveShowcaseStyle] = useState(user.showcase_style);
    useEffect(() => {
        if (!isOwnProfile) return;
        const h = (e: Event) => setLiveShowcaseStyle((e as CustomEvent<string>).detail as typeof user.showcase_style);
        window.addEventListener('pd:showcase-style-changed', h);
        return () => window.removeEventListener('pd:showcase-style-changed', h);
    }, [isOwnProfile]);
    const showcaseStyleVal = isOwnProfile ? liveShowcaseStyle : user.showcase_style;

    // Identity row: chosen ENS if set, else the truncated wallet address.
    const viaLabel = ensName
        ? ensName
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
    /* Exact owned total (holdings caps at 1000 rows, so its length under-reports
       for big collections — Brendon 2026-06-19). Seeded server-side, refreshed
       from the outputs route's `total`. */
    const [ownedCount, setOwnedCount] = useState<number>(initialOwnedCount);
    /* Cumulative ETH spend over the LIFE of the account — every acquisition the
       wallet ever paid for (mints + secondary buys), whether or not still held.
       Seeded from the server (real `events` sum), refreshed by the same outputs
       fetch that reconciles holdings on mount / after a mint. Drives the hero
       "Volume Spent" stat for ANY profile. */
    const [volumeSpent, setVolumeSpent] = useState<number>(initialUser.volume_spent_eth ?? 0);

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
        setOwnedCount(initialOwnedCount);
        setVolumeSpent(user.volume_spent_eth ?? 0);
        setOwnEns(user.ens_name);
        setLiveShowcaseStyle(user.showcase_style);
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
        if (showcaseStyleVal === 'generative') {
            const a = [...slots];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
        return slots;
    }, [user.showcase, showcaseStyleVal]);

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
                .then((d: { holdings?: Holding[]; total?: number; volume_spent_eth?: number } | null) => {
                    if (cancelled || !d?.holdings) return;
                    const next = d.holdings;
                    setHoldings((prev) => (sig(prev) === sig(next) ? prev : next));
                    if (typeof d.total === 'number') setOwnedCount(d.total);
                    if (typeof d.volume_spent_eth === 'number') setVolumeSpent(d.volume_spent_eth);
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

    const {
        dActiveFilters, dSearchQuery, dPriceMin, dPriceMax,
        enriched, visibleCollected, shownCollected, revealCount,
        collectedSentinelRef, collectedByProject, collectedGroups,
        collapsedGroups, toggleGroupCollapse,
    } = useCollectedGallery(holdings);

    /* Takeover only shows when one could actually be CAST on this wallet — the
       floor is 3+ pieces of a single project (api/takeover). No holdings, or
       only scattered singles, means no takeover is possible → hide it and keep
       the full Share button. Never on your own profile. */
    const canTakeover = useMemo(() => {
        if (isOwnProfile) return false;
        const perProject = new Map<string, number>();
        for (const h of holdings) {
            const n = (perProject.get(h.slug) ?? 0) + 1;
            perProject.set(h.slug, n);
            if (n >= 3) return true;
        }
        return false;
    }, [isOwnProfile, holdings]);

    // Identity-row copy: copies the chosen ENS if set, else the FULL wallet
    // address (row shows truncated, copy gives the whole thing — same as the
    // settings wallet copy). Inline checkmark swap for 1.5s.
    const copyValue = ensName ?? user.address;
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
    /* The +More sub-tab is remembered per-profile too (Brendon, 2026-06-24) —
       namespaced under the same store with a ":more" id so a refresh lands back
       on the same sub-section (e.g. My History), not just the +More tab. */
    const moreMemId = `${user.handle ?? handle}:more`;
    const MORE_KEYS: ReadonlySet<string> = new Set<ProfileMoreL1>(['created', 'starred', 'wishlists', 'albums', 'offers', 'vault', 'sigil', 'loyalty', 'counterparties', 'history', 'info', 'achievements', 'discord', 'anointed', 'targets']);
    const [moreL1, setMoreL1] = useState<ProfileMoreL1>(() => {
        const remembered = getRememberedTab('profile', moreMemId);
        return remembered && MORE_KEYS.has(remembered) ? (remembered as ProfileMoreL1) : 'starred';
    });
    useEffect(() => { rememberTab('profile', moreMemId, moreL1); }, [moreL1, moreMemId]);

    const {
        starredValid, traitStarsValid, artistStars,
        starredArtistHandles, starredCollectorHandles,
        soundtrackStars, txStars, projectStarsValid, wishlistValid,
    } = useStarredPins();

    /* My History — the viewer's PRIVATE last-100 viewed Outputs, read straight
       from the output_views pillar table (freshest first, with visit time for
       day grouping). Reuses the Starred Outputs rows on the feed timeline
       (Brendon, 2026-06-24). */
    const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
    const readHistory = useCallback(() => {
        fetchMyHistory().then((h) => setHistoryItems(h.filter((e) => getProject(e.slug) != null)));
    }, []);
    useEffect(() => {
        readHistory();
        const onChange = () => readHistory();
        window.addEventListener('pd:history-changed', onChange);
        return () => window.removeEventListener('pd:history-changed', onChange);
    }, [readHistory]);
    /* Day grouping (Chrome-history style) is always on for History. */
    const historyByDay = true;
    /* Recording on/off — the two L3 pills (History: ON / History: OFF). Synced
       from the store; switching routes through a mint-style confirm BOTH ways. */
    const [recording, setRecording] = useState(false);
    useEffect(() => {
        setRecording(isRecordingEnabled());
        return subscribeBreadcrumbs(() => setRecording(isRecordingEnabled()));
    }, []);
    const [recordingConfirm, setRecordingConfirm] = useState(false);

    const {
        moreSearchOpen, moreQuery, setMoreQuery, toggleMoreSearch, closeMoreSearch,
        moreMultiActive, setMoreMultiActive, morePresetActive, setMorePresetActive,
        moreMode, setMoreMode, moreSort, moreSortDir, moreGroup,
        applyStarredPreset, cycleMoreSort, cycleMoreGroup,
    } = useMoreControls(moreL1, showToast);

    const achData = useProfileAchievements(user.address);

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

    const { priceDayOpen, priceDayPos, priceDayRef, priceDayPopRef, openPriceDay } = usePriceDayPopover();

    /* The profile date popover is the NORMAL PriceDay almanac (Brendon
       2026-06-10 — the bespoke "origin" card was never asked for). It shows
       the PriceDay of the user's join date, with their joining as the first
       event, then the standard almanac sections for that day. */
    const joinDate = useMemo(() => {
        const d = new Date(user.created_at);
        return Number.isNaN(d.getTime()) ? null : d;
    }, [user.created_at]);
    const joinPriceDay = joinDate ? priceDayNumber(joinDate) : null;
    const joinPdcLive = usePriceDay(joinDate ?? new Date());
    const joinDayContents = joinDate ? joinPdcLive : null;

    // ── Tab / sub-tab state ───────────────────────────────────────────
    const onShowcase  = activeTab === 'showcase';
    const onCollected = activeTab === 'collected';
    /* Entering Collected restores the grouping the viewer last used on THIS
       profile's grid (per-page memory, like tabs — Brendon 2026-07-12), so a
       project-page grouping never bleeds in and vice versa. */
    useEffect(() => {
        if (onCollected) restoreGroupFor('profile', user.address);
    }, [onCollected, user.address, restoreGroupFor]);
    const onMore      = activeTab === 'more';

    /* Mount each tab's grid the FIRST time it's opened, then keep it mounted —
       switching tabs toggles visibility, never tears the tiles down and rebuilds
       them. So returning to a tab is instant (no repaint) and the hidden tab
       isn't built until you actually visit it (Brendon 2026-06-23). */
    const visitedShowcase = useRef(false);
    const visitedCollected = useRef(false);
    if (onShowcase) visitedShowcase.current = true;
    if (onCollected) visitedCollected.current = true;

    const feedActive = onCollected && sort === 'feed';
    const sortedFeedEvents = useLedgerFeed(feedActive, `/api/feed?address=${user.address.toLowerCase()}&limit=100`);

    const {
        isArtist, artistProjects, effStyle, artistMode, createdUnderMore,
        showcaseView, setShowcaseView, artistShowcaseCreated, genCurated,
        enrichedArtistProjects, mintSort, onMintSort, applyMintSort,
        visibleArtistProjects, artistFeedView,
    } = useArtistShowcase({
        onShowcase, artistStatus, user, handle, showcaseStyleVal,
        enriched, dActiveFilters, dSearchQuery, dPriceMin, dPriceMax,
    });

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
        if (!isOwnProfile && (v === 'starred' || v === 'wishlists' || v === 'history')) {
            v = createdUnderMore ? 'created' : 'albums';
        }
        return v;
    })();
    const onStarredTab = onMore && isOwnProfile && effMoreL1 === 'starred';
    const onWishlistTab = onMore && isOwnProfile && effMoreL1 === 'wishlists';
    const onHistoryTab = onMore && isOwnProfile && effMoreL1 === 'history';
    /* Pull fresh History from the table each time the tab opens, so anything
       viewed since shows up. */
    useEffect(() => { if (onHistoryTab) readHistory(); }, [onHistoryTab, readHistory]);
    /* Active sort/group config for the current Starred filter (or Wishlist).
       History reuses the Outputs sort set. */
    const moreCfg = MORE_CFG[onWishlistTab ? 'wishlist' : onHistoryTab ? 'outputs' : moreMode] ?? MORE_CFG.all;
    /* Created carousels shown either inside the Artist-style showcase or as the
       +More sub-tab for traditional-Top-6 artists. */
    const moreCreatedActive = onMore && createdUnderMore && effMoreL1 === 'created';
    const createdCarouselsActive =
        (artistShowcaseCreated && mintSort.key !== 'feed') || moreCreatedActive;
    /* #gallery shows for Collected and for the Top 6 grid; the Created view
       replaces it with project carousels below. */
    const galleryVisible = ((onShowcase && !artistShowcaseCreated) || onCollected) && !feedActive;
    /* Live grid column metrics — lets each grouping header cap its width to
       the columns its pieces occupy (glyph ends with the art, 2026-07-12). */
    const galleryCols = useGalleryCols(galleryVisible && onCollected && collectedGroups != null);

    /* Mouse drag-to-scroll for the carousels on this page — the artist-project
       Created carousels AND the Profile Logo picker (same handler as the home
       page). Touch swipes natively; this is the desktop grab-drag. A drag past a
       few px swallows the trailing click so it doesn't open a card / pick a logo.
       Re-binds when the Created view or the logo picker (re)mounts the tracks. */
    useEffect(() => {
        if (!createdCarouselsActive && !nameCarouselOpen) return;
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
         
    }, [createdCarouselsActive, nameCarouselOpen, artistProjects, visibleArtistProjects.length]);

    // DEACTIVATE (Spell Book) — a VISITOR to a deactivated profile gets the
    // understated shell; the owner always sees their real profile (with the
    // small cue below), so the account stays fully usable behind the front.
    if (initialUser.deactivated && !isOwnProfile) {
        return <DeactivatedProfile handle={handle} />;
    }

    return (
        <>
            {isOwnProfile && notifs.spell_invisible && (
                <div className="deactivated-owner-note">
                    Deactivated — only you can see your profile.
                </div>
            )}
            <Hero
                ariaLabel="Profile Info"
                titleRow={
                    <>
                    <h1 className="project-title">
                        {isOwnProfile ? (
                            <span
                                className="egg-name"
                                role="button"
                                tabIndex={0}
                                onClick={() => { if (nameLpFired.current) { nameLpFired.current = false; return; } handleNameTap(); }}
                                onPointerDown={onNamePointerDown}
                                onPointerMove={onNamePointerMove}
                                onPointerUp={onNamePressEnd}
                                onPointerLeave={onNamePressEnd}
                                onPointerCancel={onNamePressEnd}
                                onContextMenu={(e) => { if (isOwnProfile) e.preventDefault(); }}
                                style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
                            >
                                @{displayHandle}
                            </span>
                        ) : (
                            <ArtistTitleStar handle={displayHandle} />
                        )}
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
                                <JoinDayPopover
                                    popRef={priceDayPopRef}
                                    pos={priceDayPos}
                                    joinPriceDay={joinPriceDay}
                                    memberSince={memberSince}
                                    displayHandle={displayHandle}
                                    contents={joinDayContents}
                                />
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
                    {/* Triple-tap the @name → the carousel (same scroll chrome as
                        Now-Minting), shoved open INLINE under the title like the
                        colour egg. Profile Logo feature: no title, tiles are the
                        PD logos (the feature's own set, not the sticker sheet). */}
                    {isOwnProfile && nameCarouselOpen && (
                        <div className="profile-name-carousel">
                            <div className="home-carousel-row" aria-label="Profile logo">
                                <div className="home-carousel-track">
                                    {/* First tile = the global on/off: the logo inside a
                                        dashed ring, no words. Picking it clears your
                                        Profile Logo (back to the normal logo). */}
                                    <div
                                        className={`pl-logo-card pl-logo-off pl-logo-bubble${ownerLogo == null ? ' is-active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Turn off Profile Logo"
                                        aria-pressed={ownerLogo == null}
                                        onClick={() => setMyProfileLogo(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setMyProfileLogo(null);
                                            }
                                        }}
                                    >
                                        <StickerArt sticker={PROFILE_LOGO_OFF} fill />
                                    </div>
                                    {PROFILE_LOGO_CAROUSEL.map((logo) => (
                                        <div
                                            className={`pl-logo-card${logo.kind === 'logo' ? ' pl-logo-bubble' : ''}${ownerLogo === logo.id ? ' is-active' : ''}`}
                                            key={logo.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Set Profile Logo: ${logo.name}`}
                                            aria-pressed={ownerLogo === logo.id}
                                            onClick={() => pickProfileLogo(logo.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    pickProfileLogo(logo.id);
                                                }
                                            }}
                                        >
                                            <StickerArt sticker={logo} fill />
                                        </div>
                                    ))}
                                    {/* THE SIGIL ring — forged wallets fly their mark in
                                        every colour; picking one raises that flag exactly
                                        like the blanks (the toast is the reveal). */}
                                    {sigilForged && PROFILE_SIGIL_RING.map((logo) => (
                                        <div
                                            className={`pl-logo-card pl-logo-sigil${ownerLogo === logo.id ? ' is-active' : ''}`}
                                            key={logo.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Set Profile Logo: ${logo.name}`}
                                            aria-pressed={ownerLogo === logo.id}
                                            onClick={() => pickProfileLogo(logo.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    pickProfileLogo(logo.id);
                                                }
                                            }}
                                        >
                                            <SigilBubble
                                                address={user.address}
                                                color={logo.color ?? SIGIL_BONE}
                                                cutout={logo.cutout ?? '#1A1A1A'}
                                                fill
                                            />
                                        </div>
                                    ))}
                                    {/* THE FORGE — the carousel's last stop, always. */}
                                    <div
                                        className={`pl-logo-card pl-logo-sigil pl-logo-forge${sigilForged ? ' is-forged' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="The Sigil — open the forge"
                                        title={sigilForged ? 'Your Sigil' : 'The Forge'}
                                        onClick={() => openModal('sigilForge')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openModal('sigilForge');
                                            }
                                        }}
                                    >
                                        <SigilArt address={user.address} fill />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    </>
                }
                identityRow={
                    <>
                    <div className="hero-line project-custom id-row-fit" ref={idRowRef}>
                        {nameFace && (isOwnProfile ? (
                            <span
                                className="id-row-sprite is-own"
                                role="button"
                                tabIndex={0}
                                title="Your PriceSprite — long-press to recolour"
                                aria-label="Open your PriceSprite"
                                onClick={() => { if (spriteLpFired.current) { spriteLpFired.current = false; return; } openModal('priceSprite'); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal('priceSprite'); } }}
                                onPointerDown={onSpritePointerDown}
                                onPointerMove={onSpritePointerMove}
                                onPointerUp={onSpritePressEnd}
                                onPointerLeave={onSpritePressEnd}
                                onPointerCancel={onSpritePressEnd}
                                onContextMenu={(e) => { if (isOwnProfile) e.preventDefault(); }}
                                style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
                            >
                                <SpriteFace face={nameFace} color={ownerSpriteHex ?? undefined} />
                            </span>
                        ) : (
                            <SpriteFace className="id-row-sprite" face={nameFace} color={ownerSpriteHex ?? undefined} />
                        ))}
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
                                    {ensName ? (
                                        viaLabel
                                    ) : (
                                        <>
                                            0<span className="addr-x">x</span>
                                            {viaLabel.slice(2)}
                                        </>
                                    )}
                                </a>
                                {/* THE SIGIL — the forged mark trails the name
                                    (sprite + rank lead it), faction ink when the
                                    owner flies a flag. Suppressed when the owner
                                    switched their Sigil off from the Forge — the
                                    hide is platform-wide, so no viewer sees it. */}
                                {user.sigil_forged_at && !user.sigil_hidden && (
                                    <SigilArt
                                        address={user.address}
                                        hex={factionForLogo(ownerLogo)?.hex}
                                        className="sigil-after-name"
                                        title="Sigil"
                                    />
                                )}
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
                                    title={`Copy ${ensName ? 'ENS' : 'wallet address'}`}
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
                    {/* Long-press the PriceSprite → inline colour picker BELOW the
                        sprite: a native colour wheel, the same colorway pills, then
                        the back pill at the end (like the colorway egg). Picks save
                        live; sets the SPRITE colour, not the page. */}
                    {isOwnProfile && spritePickerOpen && (
                        <div className="profile-egg-row profile-sprite-picker">
                            {/* OFF — clears the custom colour so the sprite uses the
                                default (colorway) colour. First option, like the
                                logo carousel's OFF tile. Active when no colour set. */}
                            <div
                                className={`pill pill-l3 psp-off${!mySpriteHex ? ' active' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => setMySpriteHex(null)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMySpriteHex(null); } }}
                                title="No custom colour — use the default"
                                aria-label="Turn off the custom PriceSprite colour"
                            >
                                <span className="stat-name">{'✕︎'}</span>
                            </div>
                            <label className="psp-swatch" title="Pick any colour">
                                <input
                                    type="color"
                                    value={mySpriteHex && /^#[0-9A-F]{6}$/i.test(mySpriteHex) ? mySpriteHex : PROFILE_HEX_DEFAULT}
                                    onChange={(e) => setMySpriteHex(e.target.value)}
                                />
                            </label>
                            {eggPills.map((p) => {
                                const active = (mySpriteHex ?? '').toUpperCase() === p.hex.toUpperCase();
                                return (
                                    <div
                                        key={p.hex + p.name}
                                        className={`pill pill-l3${active ? ' active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setMySpriteHex(p.hex)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMySpriteHex(p.hex); } }}
                                        title={p.hex}
                                    >
                                        <span className="stat-name">{p.name}</span>
                                    </div>
                                );
                            })}
                            {/* Back pill at the end — reverts to the colour in play
                                when the picker opened, like the colorway egg. */}
                            <div
                                className="pill pill-l3 egg-back-pill"
                                role="button"
                                tabIndex={0}
                                onClick={() => setMySpriteHex(preSpriteHex.current)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMySpriteHex(preSpriteHex.current); } }}
                                title="Revert to your previous PriceSprite colour"
                                aria-label="Revert to your previous PriceSprite colour"
                            >
                                <span className="stat-name">{'⇠⇠︎'}</span>
                            </div>
                        </div>
                    )}
                    </>
                }
                socialRow={
                    mutuals.length > 0 ? (
                    <div className="hero-line collected-by-row info-line">
                        <span className="cbr-label">Followed by</span>{' '}
                        {mutuals.map((m, i) => (
                            <span key={m}>
                                {i > 0 && ', '}
                                <a className={`cbr-name${isSpited(m) ? ' spited' : ''}`} href={`/${m}`}>@{m}</a>
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
                            {/* Your own count opens COMPLETIONISM — the
                                month-by-month release checklist (Brendon,
                                2026-07-02, one of PD's first-envisaged
                                features). Other profiles keep the plain stat. */}
                            {isOwnProfile ? (
                                <span
                                    className="stat-val"
                                    role="button"
                                    tabIndex={0}
                                    title="Completionism"
                                    onClick={() => setCompletionismOpen(true)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCompletionismOpen(true); } }}
                                >
                                    {Math.max(ownedCount, holdings.length)}
                                </span>
                            ) : (
                                <span className="stat-val" {...iconToastProps('Outputs Collected')}>{Math.max(ownedCount, holdings.length)}</span>
                            )}
                            {isOwnProfile && (
                                <CompletionismModal
                                    address={user.address}
                                    open={completionismOpen}
                                    onClose={() => setCompletionismOpen(false)}
                                />
                            )}
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span
                                className="stat-icon-eth"
                                {...iconToastProps('Volume Spent')}
                            >
                                ⟠&#xFE0E;
                            </span>{' '}
                            <span className="stat-val stat-val-vol" {...iconToastProps('Volume Spent')}>{formatEth(volumeSpent)}</span>
                        </span>
                        <span className="stat-item stat-item-owners">
                            <span className="stat-icon stat-icon-owners stat-icon-followers" {...iconToastProps('Followers')}>{'\u26AC\uFE0E'}</span>{' '}
                            <span
                                className="stat-val stat-val-owners"
                                role="button"
                                tabIndex={0}
                                title="Followers"
                                onClick={() => openModal('followers', 'followers', user.address)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openModal('followers', 'followers', user.address);
                                    }
                                }}
                            >{counts.followers} {counts.followers === 1 ? 'FOLLOWER' : 'FOLLOWERS'}</span>
                        </span>
                    </div>
                }
            >
                    <HeroStickers
                        ownerHandle={user.handle ?? handle}
                        isOwn={isOwnProfile}
                        savedLayout={user.sticker_state?.placements ?? null}
                        savedAspect={user.sticker_state?.placementAspect ?? null}
                    />
                    <div className="action-row">
                        <FollowButton targetAddress={user.address} targetHandle={user.handle ?? displayHandle} />
                        {/* TAKEOVER — first-class profile action (spec 86b9g6c7c):
                            open the cast sheet on this collector. Shown ONLY when a
                            takeover could actually be cast (3+ pieces of one
                            project); the sheet + API enforce the premium rules.
                            Below that floor the full Share button stands alone. */}
                        {canTakeover && (
                            <button
                                className="btn-soundtrack tko-cast-entry"
                                title={`Cast a Takeover on @${displayHandle}`}
                                onClick={() => openModal('takeover', user.handle ?? displayHandle, user.address)}
                            >
                                {'⚑︎'} TAKEOVER
                            </button>
                        )}
                        <button
                            className="btn-soundtrack"
                            title={`Share @${displayHandle}`}
                            onClick={async () => {
                                const url =
                                    typeof window !== 'undefined'
                                        ? `${window.location.origin}/${displayHandle}`
                                        : `/${displayHandle}`;
                                const result = await shareLink({
                                    url,
                                    title: `@${displayHandle} on Price Discussion`,
                                });
                                if (result === 'copied') showToast('Link: COPIED');
                                else if (result === 'unavailable') showToast('Share: UNAVAILABLE');
                            }}
                        >
                            {/* ▶ play icon is the share/soundtrack button mark
                                (Brendon, 2026-06-15; the ↗ share-glyph trial was
                                reverted 2026-07-15 — ↗ stays catalogued in
                                GLYPHS.md but the buttons wear the play icon).
                                Full pill with the SHARE label when it stands alone;
                                icon-only when the Takeover pill sits beside it so the
                                row can't overflow. */}
                            <span className="btn-icon-play">▶&#xFE0E;</span>
                            {!canTakeover && <>{' '}<span>SHARE</span></>}
                        </button>
                    </div>

                    {/* TAKEOVER inscriptions — active windows + the
                        permanent marks. Renders nothing when clean. */}
                    <TakeoverBanners address={user.address} />

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
                                    ? [{ key: 'albums', label: <><span className="pill-tab-ico is-album">{'◰︎'}</span> Albums</>, active: effMoreL1 === 'albums', onClick: () => setMoreL1('albums') }]
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
                                                { key: 'starred',   label: <><span className="pill-tab-ico is-star">{'★︎'}</span> Starred</>,   active: effMoreL1 === 'starred',   onClick: () => setMoreL1('starred')   },
                                                { key: 'wishlists', label: <><span className="pill-tab-ico">{'✛︎'}</span> Wishlist</>, active: effMoreL1 === 'wishlists', onClick: () => setMoreL1('wishlists') },
                                            ]
                                            : []),
                                        { key: 'albums',    label: <><span className="pill-tab-ico is-album">{'◰︎'}</span> Albums</>,    active: effMoreL1 === 'albums',    onClick: () => setMoreL1('albums')    },
                                        { key: 'offers',    label: 'Offers',    active: effMoreL1 === 'offers',    onClick: () => setMoreL1('offers')    },
                                        { key: 'vault',     label: 'Vault',     active: effMoreL1 === 'vault',     onClick: () => setMoreL1('vault')     },
                                        { key: 'sigil',     label: 'Sigil',     active: effMoreL1 === 'sigil',     onClick: () => setMoreL1('sigil')     },
                                        { key: 'loyalty',   label: 'Loyalty',   active: effMoreL1 === 'loyalty',   onClick: () => setMoreL1('loyalty')   },
                                        { key: 'discord',   label: 'Discord',   active: effMoreL1 === 'discord',   onClick: () => setMoreL1('discord')   },
                                        { key: 'counterparties', label: 'Counterparties', active: effMoreL1 === 'counterparties', onClick: () => setMoreL1('counterparties') },
                                        { key: 'achievements', label: 'Achievements', active: effMoreL1 === 'achievements', onClick: () => setMoreL1('achievements') },
                                        { key: 'info',      label: 'Info',      active: effMoreL1 === 'info',      onClick: () => setMoreL1('info')      },
                                        { key: 'targets',   label: 'Targets',   active: effMoreL1 === 'targets',   onClick: () => setMoreL1('targets')   },
                                        { key: 'anointed',  label: 'Anointed',  active: effMoreL1 === 'anointed',  onClick: () => setMoreL1('anointed')  },
                                        /* My History — PRIVATE, last pill in the row, own profile only. */
                                        ...(isOwnProfile
                                            ? [{ key: 'history', label: <><span className="pill-tab-ico">{'◷︎'}</span> My History</>, active: effMoreL1 === 'history', onClick: () => setMoreL1('history') }]
                                            : []),
                                    ]
                                )
                            }
                            profilePillsTrailing={
                                (onStarredTab || onWishlistTab || onHistoryTab) ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {(onStarredTab || onWishlistTab) && (
                                        <div
                                            className={`burn-btn${morePresetActive ? ' active' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            title="Starred Presets"
                                            onClick={() => setMorePresetActive((v) => !v)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMorePresetActive((v) => !v); } }}
                                        >
                                            ⏚&#xFE0E;
                                        </div>
                                        )}
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
                                (onStarredTab || onWishlistTab || onHistoryTab) ? (
                                    <div className="sort-btn-group" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
                                        {/* GROUP toggle leads the row (Brendon, 2026-07-12) —
                                            icon-only, no arrow; cycles this surface's grouping
                                            options independently of the sorts. Hidden when the
                                            active filter has no groupable dimension. */}
                                        {moreCfg.groups.length > 1 && (
                                            <GroupBtn
                                                glyph={MORE_GROUP_GLYPH[moreGroup] ?? ''}
                                                on={moreGroup !== 'none'}
                                                onClick={() => cycleMoreGroup(moreCfg.groups)}
                                            />
                                        )}
                                        {moreCfg.sorts.map((key) => {
                                            const active = moreSort === key;
                                            // AZ flips to ZA when descending (gallery parity).
                                            const lbl = key === 'project' && active && moreSortDir === 'desc' ? 'ZA' : MORE_SORT_LABEL[key];
                                            /* 'Recent' shows as the canonical recent glyph (◷), the same icon
                                               the project artworks trait pills use (Brendon 2026-06-19). */
                                            const isRecentIcon = key === 'recent';
                                            return (
                                                <span
                                                    key={key}
                                                    className={`sort-btn${active ? ' active' : ''}`}
                                                    role="button"
                                                    tabIndex={0}
                                                    title={`Sort by ${MORE_SORT_LABEL[key]}`}
                                                    onClick={() => cycleMoreSort(key)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleMoreSort(key); } }}
                                                >
                                                    <span className={`sort-lbl${isRecentIcon ? ' sort-lbl-recent' : ''}`}>{isRecentIcon ? '◷︎' : lbl}</span>
                                                    <span className="sort-arrow">
                                                        {active ? (moreSortDir === 'asc' ? '↑︎' : '↓︎') : ''}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : undefined
                            }
                            profileValueRow={
                                onStarredTab && isOwnProfile && (starredValid.length > 0 || traitStarsValid.length > 0 || artistStars.length > 0 || soundtrackStars.length > 0 || projectStarsValid.length > 0 || txStars.length > 0) ? (
                                    <div className="stats-container collected-values" style={{ display: 'flex' }}>
                                        {([
                                            { key: 'all',         label: 'All Starred', count: starredValid.length + traitStarsValid.length + starredArtistHandles.length + starredCollectorHandles.length + soundtrackStars.length + projectStarsValid.length + txStars.length },
                                            { key: 'collectors',  label: 'Collectors',  count: starredCollectorHandles.length },
                                            { key: 'artists',     label: 'Artists',     count: starredArtistHandles.length },
                                            // Social filters across collectors + artists + projects. No count
                                            // badge — the tally depends on the live follow graph (resolved in
                                            // the list), not the starred totals here.
                                            { key: 'followers',   label: 'Followers',   count: 0 },
                                            { key: 'following',   label: 'Following',   count: 0 },
                                            { key: 'mutuals',     label: 'Mutuals',     count: 0 },
                                            { key: 'projects',    label: 'Projects',    count: projectStarsValid.length },
                                            { key: 'outputs',     label: 'Outputs',     count: starredValid.length },
                                            { key: 'traits',      label: 'Traits',      count: traitStarsValid.length },
                                            { key: 'soundtracks', label: 'Soundtracks', count: soundtrackStars.length },
                                            { key: 'tx',          label: 'Txs',         count: txStars.length },
                                        ] as { key: MoreMode; label: string; count: number }[]).map((p) => (
                                            <div
                                                key={p.key}
                                                className={`pill pill-l3${moreMode === p.key ? ' active' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setMoreMode(p.key)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMoreMode(p.key); } }}
                                            >
                                                <span className="stat-name">↳ {p.label}</span>
                                                {p.count > 0 && <span className="stat-count">{p.count}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : onHistoryTab && isOwnProfile ? (
                                    <div className="stats-container collected-values" style={{ display: 'flex' }}>
                                        <div
                                            className={`pill pill-l3${recording ? ' active' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            title="History on — tracking your recently viewed outputs and projects"
                                            onClick={() => { if (!recording) setRecordingConfirm(true); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!recording) setRecordingConfirm(true); } }}
                                        >
                                            <span className="stat-name">↳ History: ON</span>
                                        </div>
                                        <div
                                            className={`pill pill-l3${!recording ? ' active' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            title="History off — not tracking"
                                            onClick={() => { if (recording) setRecordingConfirm(true); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (recording) setRecordingConfirm(true); } }}
                                        >
                                            <span className="stat-name">↳ History: OFF</span>
                                        </div>
                                    </div>
                                ) : undefined
                            }
                        />
                    )}

                    {/* Albums — the covers grid → album drill-in (iOS-Photos
                        simple, power under SELECT/▶). Numbered only, PRIVATE:
                        other profiles get the quiet note inside the panel. */}
                    {onMore && effMoreL1 === 'albums' && (
                        <AlbumsPanel own={isOwnProfile} />
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
                        </div>
                    )}

                    {/* Discord sub-tab — PUBLIC, shows for everyone. Discord is the
                        centre of the PD world, so this is its home: the user's linked
                        identity (or a Link CTA on your own profile) plus the join-the
                        -server CTA. Account ASSOCIATION only — not login-with-Discord. */}
                    {onMore && effMoreL1 === 'discord' && (
                        <DiscordSection
                            discordId={user.discord_id}
                            discordUsername={user.discord_username}
                            discordAvatar={user.discord_avatar}
                            discordAccent={user.discord_accent_color}
                            discordInServer={user.discord_in_server}
                            isOwnProfile={isOwnProfile}
                            isAuthed={isAuthed}
                        />
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
                                    <span className="ach-summary-val">{achData.unlockedCount} / {TOTAL_COUNT.toLocaleString()}</span>
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

                    {onMore && effMoreL1 === 'anointed' && (
                        <ProfileAnointedPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                        />
                    )}

                    {/* THE VAULT — the King Mode consolidation surface (Atlas
                        spec, 2026-07-13). Public on every profile: the door,
                        the verdict line, the appraisal plates. */}
                    {onMore && effMoreL1 === 'vault' && (
                        <VaultPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                            holdings={holdings}
                            ownedCount={ownedCount}
                            ownerLogo={ownerLogo}
                            sigilForged={!!user.sigil_forged_at}
                        />
                    )}

                    {/* Collected tab: platform-facet filter over the wallet's real
                        holdings (Artist · Project · PriceDay · Natal · Fate · Status).
                        Distinct from the project page's per-Project trait pills — a
                        collection spans independent projects, so it filters on the
                        platform facets every Output carries. */}
                    {onCollected && <ProfileFacetBar holdings={enriched} isOwnProfile={isOwnProfile} profileAddress={user.address} />}

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
            {/* Starred + Wishlist (with their empty-state ghosts) render together
                below the gallery, both kept mounted — see note there. */}

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
                {/* SHOWCASE tiles in a display:contents box — they stay real grid
                    items, but the box is toggled to none when off this tab and is
                    only built on first visit, so switching tabs never rebuilds. */}
                {visitedShowcase.current && (
                <div style={{ display: onShowcase ? 'contents' : 'none' }}>
                {/* Gen Curated's set name — a full-row grid item so it lines up
                    with the cards' left edge at every width. */}
                {effStyle === 'gen-curated' && genCurated && genCurated.picks.length > 0 && (
                    <div className="gencurated-caption">{genCurated.caption}</div>
                )}
                {(effStyle === 'gen-curated'
                        ? (genCurated && genCurated.picks.length > 0
                            ? genCurated.picks.map((s, i) => (
                                  <ProjectProvider key={`gc-${i}-${s.slug}-${s.id}`} slug={s.slug}>
                                      <ArtworkCard id={s.id} showProjectName />
                                  </ProjectProvider>
                              ))
                            : showcaseGhosts.map((aspect, i) => (
                                  <GhostCard key={`gcghost-${i}`} aspect={aspect} index={i} onActivate={isOwnProfile ? () => setShowcasePickerOpen(true) : undefined} />
                              )))
                        : ((isOwnProfile ? ownShowcaseItems.length : showcaseSlots.length) > 0
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
                          ))))}
                </div>
                )}
                {/* COLLECTED tiles — same display:contents keep-mounted box. */}
                {visitedCollected.current && (
                <div style={{ display: onCollected ? 'contents' : 'none' }}>
                {enriched.length === 0
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
                                              /* Cap the header to the columns its pieces occupy so the
                                                 trailing dimension glyph ends with the art, never at the
                                                 page edge (Brendon, 2026-07-12). */
                                              const nPieces = h.count ?? blk.group?.ids.length ?? blk.cards?.length ?? 0;
                                              const capW = !h.soon && galleryCols && nPieces > 0
                                                  ? colsWidth(galleryCols, nPieces) + (isL2 ? 30 : 0)
                                                  : undefined;
                                              return (
                                                  <div
                                                      key={hi}
                                                      style={capW ? { maxWidth: capW } : undefined}
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
                                                      {h.by ? <span className="ggh-by"> by @{h.by.replace(/^@/, '')}</span> : null}
                                                      {h.soon ? <span className="ggh-soon">coming soon</span> : null}
                                                      {!h.soon && h.count != null && h.count > 0
                                                          ? <span className="ggh-count">{h.count}</span>
                                                          : null}
                                                      {!h.soon && groupHeaderGlyph(group, h.level)
                                                          ? <span className="ggh-glyph" aria-hidden="true">{groupHeaderGlyph(group, h.level)}</span>
                                                          : null}
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
                {/* Grows the mounted window as you scroll toward the end — keeps a
                    huge collection light (Brendon, 2026-06-24). */}
                {onCollected && enriched.length > 0 && revealCount < visibleCollected.length && (
                    <div ref={collectedSentinelRef} style={{ gridColumn: '1 / -1', height: 1 }} aria-hidden="true" />
                )}
                </div>
                )}
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
                        <FeedEventRow key={e.id} fe={e} />
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
            {(onStarredTab || onWishlistTab) && isOwnProfile && (
                <StarredPresetRow
                    open={morePresetActive}
                    current={{ mode: onWishlistTab ? 'wishlist' : moreMode, sort: moreSort, dir: moreSortDir, group: moreGroup, query: moreQuery }}
                    onApply={applyStarredPreset}
                />
            )}
            {/* Starred + Wishlist — both stay MOUNTED the whole time you're in
                this area, so flipping between the two tabs is instant and never
                reloads the rows / art / prices (Brendon 2026-06-23). Only the
                visibility toggles; the inactive list hides. Empty → ghost rows. */}
            {(onStarredTab || onWishlistTab) && isOwnProfile && (
                <>
                    <div style={{ display: onStarredTab ? undefined : 'none' }}>
                        {(starredValid.length > 0 || traitStarsValid.length > 0 || artistStars.length > 0 || soundtrackStars.length > 0 || projectStarsValid.length > 0 || txStars.length > 0) ? (
                            <StarredList
                                items={starredValid}
                                traits={traitStarsValid}
                                artists={starredArtistHandles}
                                collectors={starredCollectorHandles}
                                soundtracks={soundtrackStars}
                                projects={projectStarsValid}
                                txEvents={txStars}
                                searchOpen={moreSearchOpen}
                                query={moreQuery}
                                onQueryChange={setMoreQuery}
                                onCloseSearch={closeMoreSearch}
                                multiActive={moreMultiActive}
                                onExitMulti={() => setMoreMultiActive(false)}
                                sortKey={moreSort}
                                sortDir={moreSortDir}
                                group={moreGroup}
                                mode={moreMode}
                                onSetMode={setMoreMode}
                                viewerAddress={user.address}
                            />
                        ) : (
                            <section className="starred-list" aria-label="Starred">
                                <div className="starred-rows"><GhostRows variant="starred" /></div>
                            </section>
                        )}
                    </div>
                    <div style={{ display: onWishlistTab ? undefined : 'none' }}>
                        {wishlistValid.length > 0 ? (
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
                                viewerAddress={user.address}
                            />
                        ) : (
                            <section className="starred-list" aria-label="Wishlist">
                                <div className="starred-rows"><GhostRows variant="wishlist" /></div>
                            </section>
                        )}
                    </div>
                </>
            )}

            {/* My History — the last-100 viewed Outputs, reusing the Starred
                Outputs rows on the feed timeline, grouped by day (Brendon,
                2026-06-24). Own profile only (private). */}
            {onHistoryTab && isOwnProfile && (
                !recording ? (
                    <section className="starred-list" aria-label="History">
                        <div className="history-empty-note">
                            Turn on History to see your 500 most recently viewed outputs and projects.
                        </div>
                    </section>
                ) : historyItems.length > 0 ? (
                    <StarredList
                        items={historyItems}
                        mode="outputs"
                        kind="history"
                        timeline
                        group={historyByDay ? 'day' : 'none'}
                        searchOpen={moreSearchOpen}
                        query={moreQuery}
                        onQueryChange={setMoreQuery}
                        onCloseSearch={closeMoreSearch}
                        multiActive={moreMultiActive}
                        onExitMulti={() => setMoreMultiActive(false)}
                        sortKey={moreSort}
                        sortDir={moreSortDir}
                        viewerAddress={user.address}
                    />
                ) : (
                    <section className="starred-list" aria-label="History">
                        <div className="history-empty-note">
                            Your last 500 viewed outputs and projects will appear here as you browse.
                        </div>
                    </section>
                )
            )}

            {/* History Recording toggle — confirm BOTH ways, mint-style (Brendon,
                2026-06-24). Pausing genuinely stops recording that instant. */}
            {recordingConfirm && (
                <div
                    className="starred-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setRecordingConfirm(false)}
                >
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">
                            {recording ? (
                                <>Turn off History?<br />We stop tracking the outputs and projects you view.</>
                            ) : (
                                'Start tracking your 500 most recently viewed outputs and projects?'
                            )}
                        </div>
                        <div className="ms-confirm-btns">
                            <button
                                className="ms-confirm-btn ms-confirm-btn--cancel"
                                onClick={() => setRecordingConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => {
                                    const next = !recording;
                                    setRecordingEnabled(next);
                                    setRecording(next);
                                    setRecordingConfirm(false);
                                    showToast(next ? 'History: ON' : 'History: OFF');
                                }}
                            >
                                {recording ? 'Turn Off' : 'Turn On'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* (The mini @name carousel renders INLINE under the title — see the
                profile-name-carousel block up in the title row.) */}

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
    initialOwnedCount = 0,
    artistStatus = null,
}: {
    handle: string;
    initialUser: UserProfileData;
    initialHoldings: Holding[];
    initialOwnedCount?: number;
    artistStatus?: 'active' | 'cooldown' | null;
}) {
    return (
        <TraitsProvider memoryScope="profile" memoryId={handle}>
            <ProfilePageBodyInner
                handle={handle}
                initialUser={initialUser}
                initialHoldings={initialHoldings}
                initialOwnedCount={initialOwnedCount}
                artistStatus={artistStatus}
            />
        </TraitsProvider>
    );
}
