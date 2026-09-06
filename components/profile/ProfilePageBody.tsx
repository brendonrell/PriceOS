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
import { readViewParam, setViewParam } from '../../lib/state/viewLink';
import { useAuth } from '../../lib/state/AuthContext';
import { rankSocialCandidates, type SocialCandidate } from '../../lib/social/relevance';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import { useModal } from '../../lib/state/ModalContext';
import { useExchange } from '../../lib/state/ExchangeContext';
import SpriteFace from '../SpriteFace';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import { THEME_PILLS, SORT_BAR_THEME_NAMES } from '../project/traitsUIShared';
import { useProfileHex, PROFILE_HEX_DEFAULT } from '../../lib/hooks/useProfileHex';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { shareLink } from '../../lib/pwa/share';
import { useSort, groupHeaderGlyph } from '../../lib/state/SortContext';
import { GhostFeedRows } from '../GhostFeed';
import SocialFeed from '../home/SocialFeed';
import FeedEventRow from '../feed/FeedEventRow';
import ArtworkCard from '../ArtworkCard';
import { subscribeBreadcrumbs, isRecordingEnabled, setRecordingEnabled } from '../../lib/pins/breadcrumbStore';
import { fetchMyHistory, type HistoryEntry } from '../../lib/output/views';
import { getShowcaseItems, subscribeShowcase, moveShowcase, toggleShowcase } from '../../lib/pins/userShowcaseStore';
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
import { ACHIEVEMENTS_ICON } from '../../lib/achievements/icon';
import ProfileAnointedPanel from './ProfileAnointedPanel';
import VaultPanel from './VaultPanel';
import DiscordSection from './DiscordSection';
import CounterpartiesPanel from './CounterpartiesPanel';
import TargetsPanel from './TargetsPanel';
import LoyaltyPanel from './LoyaltyPanel';
import SigilPanel from './SigilPanel';
import CallsPanel from './CallsPanel';
import { MAX_PRICE_SCORE, TOTAL_COUNT } from '../../lib/achievements/catalog';
import Hero from '../hero/Hero';
import CompletionismDoor from './CompletionismDoor';
import FollowButton from './FollowButton';
import { HeroStickers } from '../stickers/HeroStickers';
import { ProfileTags } from './ProfileTags';
import EquippedCharm from '../keychains/EquippedCharm';
import { useProfileTags } from '../../lib/hooks/useProfileTags';
import { useNameFont } from '../../lib/hooks/useNameFont';
import { useTagPaint } from '../../lib/hooks/useTagPaint';
import { useFormulas, useFormulaRoll } from '../../lib/hooks/useFormulas';
import {
    FORMULA_SETS, FORMULA_SIZES, FORMULA_WEAVES, MAX_FORMULAS,
    drawFormula, formulaBlurb, newFormula, type Formula,
} from '../../lib/tags/formula';
import { useTeamTagStyle } from '../../lib/hooks/useTeamTagStyle';
import { useRudxaneRoll } from '../../lib/hooks/useRudxaneRoll';
import { useClearedMonths } from '../../lib/hooks/useClearedMonths';
import { useShownTags } from '../../lib/hooks/useShownTags';
import { useTagsOff } from '../../lib/hooks/useTagsOff';
import { deriveTags } from '../../lib/tags/derive';
import { PERSONA_TAGS, tagTextOn, TAG_PAINTS, isTeamStyleTag } from '../../lib/tags/catalog';
import { NAME_FONTS, styleName } from '../../lib/profile/nameFont';
import { rollPreset, rollGenerativePreset, type PresetMode } from '../../lib/profile/presetRoll';
import {
    useProfileGenerative,
    setProfileGenerativeEnabled,
    stampProfileGenerativeRoll,
    GENERATIVE_REROLL_MS,
} from '../../lib/profile/profileGenerative';
import {
    useProfilePresets,
    saveProfilePreset,
    deleteProfilePreset,
    MAX_PROFILE_PRESETS,
    PROFILE_PRESET_GLYPHS,
} from '../../lib/profile/profilePresets';
import { getProject, allProjects, projectsByArtist, projectColorway, artistSignatureColor } from '../../lib/project/registry';
import HomeProjectFacetBar from '../home/HomeProjectFacetBar';
import GhostCard from '../project/GhostCard';
import ZenGarden from './ZenGarden';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import ProfileFacetBar from './ProfileFacetBar';
import TakeoverBanners from '../takeover/TakeoverBanners';
import type { ShowcaseSlot } from '../../lib/supabase';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';
import AlbumsPanel from '../album/AlbumsPanel';
import {
    formatMemberSince, fmtFeedDate, fmtFeedTime,
    ARTIST_SHOWCASE_FACETS,
    type ProfileTab, type ProfileMoreL1, type Holding,
} from './profilePageShared';
import ArtistProjectCarousel from './ArtistProjectCarousel';
import UploadWindowCountdown from '../artist/UploadWindowCountdown';
import { useProfileEggs } from './useProfileEggs';
import { useStarredPins } from './useStarredPins';
import { useMoreControls, MORE_CFG, MORE_SORT_LABEL, MORE_GROUP_GLYPH, type MoreMode } from './useMoreControls';
import ListsPanel from '../lists/ListsPanel';
import { GroupBtn } from '../project/traitsUIPills';
import PriceDayDateLink from '../priceday/PriceDayDateLink';
import { useProfileAchievements } from './useProfileAchievements';
import { useLedgerFeed } from '../../lib/feed/useLedgerFeed';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';
import { useCollectedGallery } from './useCollectedGallery';
import { useArtistShowcase } from './useArtistShowcase';
import { isPlatformAccount, PRICE_TOKEN_CREATED_AT } from '../../lib/platform/accounts';
import PriceAccountPanel from './PriceAccountPanel';
import PriceHoldersBoard from './PriceHoldersBoard';
import { PriceOverviewPanel, PriceTokenomicsPanel, PriceContractPanel, PriceUtilityPanel } from './PriceDocsPanel';
import { useGridSettle } from '../../lib/hooks/useGridSettle';

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

/* Presets row (Row 4) mode labels. */
const PRESET_MODE_LABEL: Record<PresetMode, string> = {
    random: 'Random',
    match: 'Match',
    accent: 'Accent',
    pair: 'Pair',
};

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
    const { sort, group, groupLayers, restoreGroupFor } = useSort();

    // Real user row — fetched server-side from the handle in the URL and
    // passed in, so the hero renders real values on first paint (no popin).
    const user = initialUser;
    /* Computed early — the +More sub-nav's isPlatform branch (price docs)
       needs this before effMoreL1 resolves, same reason isZen sits up here
       too (Brendon, 2026-08-13). */
    const isPlatform = isPlatformAccount(user.address);

    /* @price has no volume of its own to spend — the Volume Spent slot
       repurposes itself into the live ETH↔$PRICE rate for that one profile
       (Brendon, 2026-08-24). 0 until a pool exists; see lib/platform/priceMarket. */
    const [priceMarketRate, setPriceMarketRate] = useState<{ priceEth: number; source: string } | null>(null);
    useEffect(() => {
        if (!isPlatform) { setPriceMarketRate(null); return; }
        let cancelled = false;
        fetch('/api/token/price', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setPriceMarketRate(d); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isPlatform]);

    /* Profile Colorway — paint this profile in ITS OWNER's colour. The page
       owner's `profile_hex` is the "Custom" colour for this page, shown to any
       visitor whose colorway is the default/Custom (an explicit pick still
       wins — handled in ColorwayContext). When the logged-in user is viewing
       their OWN profile, use the live hook value so edits in the picker repaint
       instantly; for anyone else's profile, use the server-provided value. */
    const { setActiveProfileHex, colorway, setColorway } = useColorway();
    /* @price — Token + Holders' own colorway-pills row, matching the one
       TraitsUI renders for the +More doc tabs (same THEME_PILLS, same
       toast wording) — added here since Token/Holders don't go through
       TraitsUI at all (Brendon, 2026-08-17). */
    const setColorwayWithToastPD = (key: ColorwayKey) => {
        setColorway(key);
        if (!key) return;
        if (key === 'custom') { showToast('Colorway: Project Colorway'); return; }
        showToast('Colorway: ' + (SORT_BAR_THEME_NAMES[key] ?? key));
    };
    const PriceColorwayPills = () => (
        <div className="price-acct-colorway">
            <div className="sort-bar" id="sortOptions" style={{ display: 'flex' }}>
                <div className="colorway-pills">
                    {THEME_PILLS.map((t) => (
                        <div
                            key={t.key ?? 'default'}
                            className={`pill-colorway ${t.cls}${colorway === t.key ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setColorwayWithToastPD(t.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setColorwayWithToastPD(t.key); }
                            }}
                            title={t.title}
                        >
                            <span>{t.glyph}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    const isOwnProfile =
        !!siweAddress && siweAddress.toLowerCase() === user.address.toLowerCase();
    /* COMPLETIONISM modal (own profile only, off the ⬚ collected stat). */
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

    /* PROFILE TAGS + @name FONT — the owner's picks are live on their own
       profile (paint instantly on edit), server values for visitors. The tag
       list shown on the hero is derived (picked personas + earned + granted +
       the platform-number tag); the picker only ever writes personas. */
    const { tags: myTags, toggle: toggleTag } = useProfileTags(isOwnProfile ? user.profile_tags : undefined);
    const { font: myNameFont, setFont: setMyNameFont } = useNameFont(isOwnProfile ? user.name_font : undefined);
    const ownerNameFont = isOwnProfile ? myNameFont : user.name_font;
    const { paint: myTagPaint, setPaint: setMyTagPaint } = useTagPaint(isOwnProfile ? user.tag_paint : undefined);
    const ownerTagPaint = isOwnProfile ? myTagPaint : user.tag_paint;
    /* FORMULA — the owner's own generative Unicode art (Brendon, 2026-07-29).
       The shelf is theirs; the roll redraws every load for every visitor. */
    const { formulas: myFormulas, save: saveFormulas } = useFormulas(isOwnProfile ? user.formulas : undefined);
    const ownerFormulas = isOwnProfile ? myFormulas : user.formulas;
    const formulaRoll = useFormulaRoll();
    /* Which Formula the row is editing (its index), or null when just browsing. */
    const [editingFormula, setEditingFormula] = useState<number | null>(null);
    /* FORMULA carousel (Brendon, 2026-08-16): the Formula pill in the main tag
       row no longer wears a tag — it opens/closes this row directly below. */
    const [formulaCarouselOpen, setFormulaCarouselOpen] = useState(false);
    /* PRESETS row (Brendon, 2026-08-30): Row 4, bottom of the egg-editor
       stack. presetMode picks which roll shape the Roll pill produces; the
       roll itself just fans out to the four setters already in scope.
       Brendon, 2026-09-02: opens with NOTHING selected — Roll starts greyed
       out until a mode (or Generative) is picked. */
    const [presetMode, setPresetMode] = useState<PresetMode | null>(null);
    const generative = useProfileGenerative();
    const rollReady = presetMode !== null || generative.enabled;
    const rollProfilePreset = useCallback(() => {
        if (presetMode) {
            const result = rollPreset(presetMode);
            setMyProfileHex(result.hex);
            setMyTagPaint(result.tagPaint);
            setMyProfileLogo(result.logoId);
            if (result.fontId) setMyNameFont(result.fontId);
            showToast(`Preset: ${presetMode.toUpperCase()}`);
        } else if (generative.enabled) {
            const result = rollGenerativePreset();
            setMyProfileHex(result.hex);
            setMyTagPaint(result.tagPaint);
            setMyProfileLogo(result.logoId);
            if (result.fontId) setMyNameFont(result.fontId);
            stampProfileGenerativeRoll();
            showToast('Generates new profile design every 24hrs');
        }
    }, [presetMode, generative.enabled, setMyProfileHex, setMyTagPaint, setMyProfileLogo, setMyNameFont, showToast]);
    const toggleGenerative = useCallback(() => {
        const next = !generative.enabled;
        setProfileGenerativeEnabled(next);
        if (next) {
            const result = rollGenerativePreset();
            setMyProfileHex(result.hex);
            setMyTagPaint(result.tagPaint);
            setMyProfileLogo(result.logoId);
            if (result.fontId) setMyNameFont(result.fontId);
            showToast('Generates new profile design every 24hrs');
        } else {
            showToast('Generative: OFF');
        }
    }, [generative.enabled, setMyProfileHex, setMyTagPaint, setMyProfileLogo, setMyNameFont, showToast]);
    /* 24h auto-reroll while Generative is on — checked on mount and hourly;
       cheap enough (a Date.now() diff) that hourly polling is plenty granular
       against a 24h window (Brendon, 2026-09-02). */
    useEffect(() => {
        if (!isOwnProfile || !generative.enabled) return;
        const check = () => {
            if (Date.now() - generative.lastRolledAt < GENERATIVE_REROLL_MS) return;
            const result = rollGenerativePreset();
            setMyProfileHex(result.hex);
            setMyTagPaint(result.tagPaint);
            setMyProfileLogo(result.logoId);
            if (result.fontId) setMyNameFont(result.fontId);
            stampProfileGenerativeRoll();
        };
        check();
        const id = window.setInterval(check, 60 * 60 * 1000);
        return () => window.clearInterval(id);
    }, [isOwnProfile, generative.enabled, generative.lastRolledAt, setMyProfileHex, setMyTagPaint, setMyProfileLogo, setMyNameFont]);
    /* PRESET SAVE SLOTS (Brendon, 2026-09-02: "same UI as grid presets") — an
       EMPTY slot tap SAVES the current look into it; a FILLED slot tap LOADS
       it. No separate Save button and no name — each pill just wears its own
       saved colours. */
    const profilePresetSlots = useProfilePresets();
    const tapProfilePresetSlot = useCallback((index: number) => {
        const slot = profilePresetSlots[index];
        if (slot) {
            setMyProfileHex(slot.hex);
            setMyTagPaint(slot.tagPaint);
            setMyProfileLogo(slot.logoId);
            setMyNameFont(slot.fontId);
            showToast(`Preset ${index + 1}: LOADED`);
        } else {
            saveProfilePreset(index, {
                hex: myProfileHex ?? PROFILE_HEX_DEFAULT,
                tagPaint: ownerTagPaint ?? myProfileHex ?? PROFILE_HEX_DEFAULT,
                logoId: ownerLogo ?? null,
                fontId: ownerNameFont ?? null,
            });
            showToast(`Preset ${index + 1}: SAVED`);
        }
    }, [profilePresetSlots, myProfileHex, ownerTagPaint, ownerLogo, ownerNameFont, setMyProfileHex, setMyTagPaint, setMyProfileLogo, setMyNameFont, showToast]);
    const deleteProfilePresetSlot = useCallback((index: number) => {
        deleteProfilePreset(index);
        showToast(`Preset ${index + 1}: DELETED`);
    }, [showToast]);
    /* Tags the owner switched OFF — hidden from the shown row (every viewer),
       but still listed in the owner's picker to tap back on (Brendon,
       2026-07-22). */
    /* ⛔ TAGS ARE OFF BY DEFAULT (Brendon, 2026-07-26) — a profile shows only the
       tags its owner went and switched ON in the picker. */
    const { shown: myShown, toggleShown } = useShownTags(isOwnProfile ? user.shown_tags : undefined);
    const ownerShown = isOwnProfile ? myShown : (user.shown_tags ?? []);
    /* The opt-OUT list — the only thing that darks a DEFAULT-ON tag (the project
       tags an artist wears for their own work, Brendon 2026-07-29). */
    const { off: myTagsOff, toggleOff } = useTagsOff(isOwnProfile ? user.tags_off : undefined);
    const ownerTagsOff = isOwnProfile ? myTagsOff : (user.tags_off ?? []);
    /* The WTBS-family chip treatment (WTBS / Petey) — the owner cycles it by
       tapping their own chip; visitors see the owner's pick (Brendon, 2026-07-26). */
    const { style: myTeamTagStyle, cycleStyle: cycleTeamTagStyle } = useTeamTagStyle(
        isOwnProfile ? user.team_tag_style : undefined,
    );
    const ownerTeamTagStyle = isOwnProfile ? myTeamTagStyle : (user.team_tag_style ?? 0);
    /* @rudxane's chip re-rolls its pronunciation every page load. */
    const rudxaneRoll = useRudxaneRoll();
    /* The @name letters, restyled in the owner's chosen Unicode font ("@" and the
       underlying handle stay plain; this is display only). */
    const styledHandle = styleName(displayHandle, ownerNameFont ?? null);
    /* Completionism chips — the months this wallet cleared. Read out of the
       sheet the profile already warms, so a chip costs no extra request. */
    const clearedMonths = useClearedMonths(user.address);
    const tagInput = useMemo(() => ({
        profileTags: isOwnProfile ? myTags : (user.profile_tags ?? []),
        grantedTags: user.granted_tags ?? [],
        userNumber: user.user_number ?? null,
        isArtist: !!artistStatus && projectsByArtist(user.handle ?? handle).length > 0,
        createdAt: user.created_at,
        address: user.address,
        handle: user.handle ?? handle,
        teamTagStyle: ownerTeamTagStyle,
        rudxaneRoll,
        formulas: ownerFormulas,
        formulaRoll,
        priceHoldRank: user.price_hold_rank,
        priceHeld: user.price_held,
        /* The Projects this person made — one chip each, in that Project's own
           live colour (Brendon, 2026-07-29). */
        projects: projectsByArtist(user.handle ?? handle).map((p) => ({
            slug: p.slug,
            name: p.displayName,
            color: projectColorway(p.slug) ?? p.colorway,
        })),
        priceScore: user.price_score,
        clearedMonths,
    }), [user.price_score, clearedMonths, isOwnProfile, myTags, user.profile_tags, user.granted_tags, user.user_number, artistStatus, user.created_at, user.address, user.handle, handle, ownerTeamTagStyle, rudxaneRoll, ownerFormulas, formulaRoll, user.price_hold_rank, user.price_held]);
    /* Shown on the hero: full derived set minus the hidden ones (Manual → Earned
       → Chosen order via each tag's `order`). */
    const displayTags = useMemo(
        () => deriveTags({ ...tagInput, shownTags: ownerShown, tagsOff: ownerTagsOff }),
        [tagInput, ownerShown, ownerTagsOff],
    );
    /* The owner's picker lists EVERY tag they have (unfiltered) so hidden ones
       can be tapped back on. Personas come from the full catalog separately. */
    const myAutoTags = useMemo(
        () => deriveTags(tagInput).filter((t) => t.kind !== 'persona'),
        [tagInput],
    );

    const {
        eggOpen, preEggHex, handleNameTap, toggleEgg,
        nameCarouselOpen, nameLpFired, onNamePointerDown, onNamePointerMove, onNamePressEnd,
        spritePickerOpen, spriteLpFired, preSpriteHex,
        onSpritePointerDown, onSpritePointerMove, onSpritePressEnd,
        eggPills,
    } = useProfileEggs({ isOwnProfile, user, displayHandle, myProfileHex, mySpriteHex });
    /* Row 4 opens with NOTHING selected every time (Brendon, 2026-09-02) —
       clear any leftover mode pick each time the egg menu opens rather than
       only on first mount. */
    useEffect(() => {
        if (eggOpen) setPresetMode(null);
    }, [eggOpen]);


    /* Profile Tags door in Settings ▸ MY PD (Brendon, 2026-08-15) — a more
       obvious entry point to the SAME menu the @name long-press opens.
       Settings lives outside this page: a live event covers the case the
       owner is already here, and a one-shot sessionStorage flag covers a
       fresh navigation (the event fires before this component mounts). */
    useEffect(() => {
        if (!isOwnProfile) return;
        try {
            if (sessionStorage.getItem('pd_open_tag_egg') === '1') {
                sessionStorage.removeItem('pd_open_tag_egg');
                toggleEgg();
            }
        } catch { /* ignore */ }
        const h = () => toggleEgg();
        window.addEventListener('pd:open-tag-egg', h);
        return () => window.removeEventListener('pd:open-tag-egg', h);
         
    }, [isOwnProfile]);

    /* This profile's PriceSprite — a small STILL face beside the @name (the
       profile's avatar; PD has no uploaded pfps). Works for any user via the
       frozen signup sprite (useSpriteFace, cached). Courier, understated —
       not the loud chip that was reverted on the project hero. */
    const nameFace = useSpriteFace(displayHandle);
    const { open: openModal } = useModal();
    const { openExchange } = useExchange();
    const memberSince = formatMemberSince(isPlatform ? PRICE_TOKEN_CREATED_AT : user.created_at);

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

    // Identity row: @price wears the token contract, labelled and in the
    // SAME plain address style as any wallet (Brendon, 2026-08-14) — never
    // the ENS-styled branch, even though the account's ens_name field holds
    // "Price Discussion" for display elsewhere. Everyone else: chosen ENS if
    // set, else the truncated wallet address.
    const viaLabel = isPlatform
        ? `${user.address.slice(0, 6)}…${user.address.slice(-4)}`
        : ensName
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
        /* Confirm the count ON ARRIVAL too (Brendon, 2026-07-29). Without this
           the number is only ever set when the page is BUILT and when a follow
           is tapped, so a page held in memory or restored by the app shows a
           stale number and every tap moves it one step on from a wrong start —
           which is how following someone could read as a follower LESS. */
        load();
        window.addEventListener('pd:follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
    }, [user.address]);

    /* Social row "Followed by …" (Twitter model): people the VIEWER follows who
       also follow THIS profile, ranked by connection strength (mutual first) →
       PriceRank → a little jitter (lib/social/relevance), capped at 2 faces +
       "& N others you follow". Hidden when the viewer is signed out, viewing
       their own profile, or shares no such tie. */
    const [followedBy, setFollowedBy] = useState<{ shown: string[]; others: number }>({ shown: [], others: 0 });
    const [followedByPool, setFollowedByPool] = useState<SocialCandidate[]>([]);
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
                setFollowedByPool(cands);
            } catch { if (!cancelled) { setFollowedBy({ shown: [], others: 0 }); setFollowedByPool([]); } }
        };
        load();
        const h = () => load();
        window.addEventListener('pd:follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
    }, [siweAddress, user.address]);

    /* Followed-by row cycling — matched to the homepage Featuring row
       exactly (Brendon, 2026-08-20): two names shown, re-rolling every
       3.6s whenever there's more than two to cycle through. Re-invokes the
       same relevance ranking rather than a flat random pick, so cycling
       still respects connection strength / PriceRank — it's the ranker's
       own jitter that supplies the variety each tick. */
    useEffect(() => {
        if (followedByPool.length < 6) return;
        const id = window.setInterval(() => {
            const ranked = rankSocialCandidates(followedByPool, 2);
            setFollowedBy({ shown: ranked.shown, others: ranked.othersCount });
        }, 3600);
        return () => window.clearInterval(id);
    }, [followedByPool]);

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
    const ownShowcaseItems = useMemo(() => {
        const items = showcaseLocal.filter((s) => getProject(s.slug) != null);
        /* Generative reshuffles the OWN-profile picks too — it only touched the
           visitor path (showcaseSlots) before, so the owner's Generative mode
           looked identical to Static (fixed 2026-07-16). */
        if (showcaseStyleVal === 'generative') {
            const a = [...items];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
        return items;
    }, [showcaseLocal, showcaseStyleVal]);
    const [showcasePickerOpen, setShowcasePickerOpen] = useState(false);

    /* Showcase MOVE MODE (Brendon, 2026-07-24) — the iOS home-screen gesture on
       your own Static showcase: press and hold a piece and the set goes into
       move mode (every tile jiggles, each wears a little ×), the held piece
       lifts on the Bench's own drag engine, and dropping it on another tile
       lands it in that slot — that tile and everything after it bump one place
       down the line. DONE is the way out (and leaving the tab). */
    const [scMoveMode, setScMoveMode] = useState(false);
    const enterScMove = useCallback(() => setScMoveMode(true), []);
    const exitScMove = useCallback(() => setScMoveMode(false), []);
    const onScMove = useCallback((fromKey: string, toKey: string) => {
        if (moveShowcase(fromKey, toKey)) showToast('Showcase: MOVED');
    }, [showToast]);
    const onScRemove = useCallback((slug: string, id: number) => {
        toggleShowcase(slug, id);
        showToast('Showcase: REMOVED');
    }, [showToast]);

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
        /* A platform account is not a counterparty — never a takeover target. */
        if (isPlatformAccount(user.address)) return false;
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
    // settings wallet copy). @price always copies the contract address, never
    // its display-only "Price Discussion" ens_name (Brendon, 2026-08-14).
    // Inline checkmark swap for 1.5s.
    const copyValue = isPlatform ? user.address : (ensName ?? user.address);
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
        /* A pasted deep link's ?tab= wins over everything — the shared view
           IS the view (Share Any View, Brendon 2026-07-19; same precedent
           as the ?sort= slug). */
        const shared = readViewParam('tab');
        if (shared === 'showcase' || shared === 'collected' || shared === 'more') {
            return shared;
        }
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
    const MORE_KEYS: ReadonlySet<string> = new Set<ProfileMoreL1>(['cooldown', 'created', 'starred', 'wishlists', 'albums', 'offers', 'vault', 'sigil', 'loyalty', 'counterparties', 'history', 'achievements', 'discord', 'anointed', 'calls', 'price-overview', 'price-tokenomics', 'price-contract', 'price-utility']);
    const [moreL1, setMoreL1] = useState<ProfileMoreL1>(() => {
        // A pasted deep link's ?sub= wins here too (Share Any View).
        const shared = readViewParam('sub');
        if (shared && MORE_KEYS.has(shared)) return shared as ProfileMoreL1;
        const remembered = getRememberedTab('profile', moreMemId);
        if (remembered && MORE_KEYS.has(remembered)) return remembered as ProfileMoreL1;
        return isPlatform ? 'price-overview' : 'starred';
    });
    useEffect(() => { rememberTab('profile', moreMemId, moreL1); }, [moreL1, moreMemId]);

    /* Share Any View — register the live tab state so the SHARE VIEW pill
       composes an exact deep link at copy time (lib/state/viewLink.ts). */
    useEffect(() => {
        setViewParam('tab', activeTab);
        setViewParam('sub', activeTab === 'more' ? moreL1 : null);
        return () => { setViewParam('tab', null); setViewParam('sub', null); };
    }, [activeTab, moreL1]);

    const {
        starredValid, traitStarsValid, artistStars,
        starredArtistHandles, starredCollectorHandles,
        soundtrackStars, txStars, projectStarsValid,
        priceDayStars, albumStarsValid, vaultStarsValid, wishlistValid,
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

    /* LISTS (Brendon, 2026-07-24) — the user's own NAMED groupings of starred
       things, living on Starred. The ≡ LISTS control closes Starred's sort row.
       The door (Brendon, 2026-07-25): ≡ is the way IN and it behaves like the
       sorts beside it — tapping it again REORDERS the lists (A→Z, Z→A) rather
       than closing. The way OUT is tapping any other sort in the row, which
       drops you back on the Starred rows under that sort. Default OFF. */
    const [myListsOpen, setMyListsOpen] = useState(false);
    const [myListsDir, setMyListsDir] = useState<'asc' | 'desc'>('asc');
    const toggleMyLists = () => {
        if (myListsOpen) { setMyListsDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
        setMyListsOpen(true);
        setMyListsDir('asc');
    };

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

    /* Volume Spent toast — the tap used to be a plain label toast; now it
       draws a two-list face above the same headline: top 5 projects by
       spend, then top 5 Outputs by price paid. Breakdown is prefetched once
       per profile view (below) so the tap itself stays instant — falls back
       to the plain toast if it hasn't landed yet. holdMs runs 50% longer
       than the default (now 5400 vs 1800 — doubled again 2026-08-23) since
       there's more to read (Brendon, 2026-08-16). */
    const [spendBreakdown, setSpendBreakdown] = useState<{
        topProjects: { slug: string; totalEth: number }[];
        topOutputs: { slug: string; token_id: number; priceEth: number }[];
    } | null>(null);
    useEffect(() => {
        setSpendBreakdown(null);
        let cancelled = false;
        fetch(`/api/user/${user.address.toLowerCase()}/spend-breakdown`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setSpendBreakdown(d); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [user.address]);
    const openVolumeSpentToast = () => {
        if (isPlatform) {
            const lines = priceMarketRate?.source === 'none' || !priceMarketRate
                ? ['No pool yet — 0 until a third party LPs $PRICE.']
                : [`Source: ${priceMarketRate.source === 'coingecko' ? 'CoinGecko' : 'Uniswap pool'}`];
            showToast('◆ ETH ⇄ $PRICE ◆', 5400, undefined, null, lines);
            return;
        }
        const lines: string[] = [];
        if (spendBreakdown?.topProjects.length) {
            lines.push('TOP PROJECTS');
            for (const p of spendBreakdown.topProjects) {
                lines.push(`${getProject(p.slug)?.displayName ?? p.slug}  ⟠${p.totalEth.toFixed(2)}`);
            }
        }
        if (spendBreakdown?.topOutputs.length) {
            if (lines.length) lines.push('─────────────');
            lines.push('TOP OUTPUTS');
            for (const o of spendBreakdown.topOutputs) {
                lines.push(`${getProject(o.slug)?.displayName ?? o.slug} #${o.token_id}  ⟠${o.priceEth.toFixed(2)}`);
            }
        }
        showToast('◆ VOLUME SPENT ◆', 5400, undefined, null, lines.length ? lines : null);
    };

    /* Long-press the join date → it flips to the profile's platform user
       number (#N, hardcoded in the DB — Brendon is #1). Long-press again
       flips back. Same gesture grammar as the @name long-press (460ms,
       10px move cancel); a plain TAP still opens the PriceDay almanac —
       the fired guard keeps the two apart. Works on every profile. */
    const [dateShowsNum, setDateShowsNum] = useState(false);
    const dateLpTimer = useRef<number | null>(null);
    const dateLpFired = useRef(false);
    const dateLpStart = useRef<{ x: number; y: number } | null>(null);
    const clearDateLp = () => {
        if (dateLpTimer.current != null) { window.clearTimeout(dateLpTimer.current); dateLpTimer.current = null; }
    };
    const onDatePointerDown = (e: React.PointerEvent) => {
        if (user.user_number == null) return;
        dateLpFired.current = false;
        dateLpStart.current = { x: e.clientX, y: e.clientY };
        clearDateLp();
        dateLpTimer.current = window.setTimeout(() => {
            dateLpFired.current = true;
            dateLpTimer.current = null;
            setDateShowsNum((v) => !v);
        }, 460);
    };
    const onDatePointerMove = (e: React.PointerEvent) => {
        if (dateLpTimer.current == null || !dateLpStart.current) return;
        const dx = e.clientX - dateLpStart.current.x;
        const dy = e.clientY - dateLpStart.current.y;
        if (dx * dx + dy * dy > 100) clearDateLp();
    };
    const onDatePressEnd = () => clearDateLp();

    /* The profile date popover is the NORMAL PriceDay almanac (Brendon
       2026-06-10 — the bespoke "origin" card was never asked for). It shows
       the PriceDay of the user's join date, with their joining as the first
       event, then the standard almanac sections for that day. */
    const joinDate = useMemo(() => {
        const d = new Date(isPlatform ? PRICE_TOKEN_CREATED_AT : user.created_at);
        return Number.isNaN(d.getTime()) ? null : d;
    }, [isPlatform, user.created_at]);

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
    /* A re-sort or re-group lands with one short ease (Brendon, 2026-07-30). */
    useGridSettle(`${sort}|${groupLayers.join('>')}`, onCollected && !feedActive);
    const sortedFeedEvents = useLedgerFeed(feedActive, `/api/feed?address=${user.address.toLowerCase()}&limit=100`, true);

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
    // Albums are public (2026-08-02), so a visitor lands here too.
    useEffect(() => {
        if (isZen && moreL1 !== 'albums') setMoreL1('albums');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isZen]);

    // ── @price: price docs-only in + More sub-nav ──────────────────────
    // A stale non-price key (remembered from browsing a normal profile
    // right before this one) would open a pill row @price doesn't show.
    useEffect(() => {
        if (isPlatform && !moreL1.startsWith('price-')) setMoreL1('price-overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlatform]);

    /* Starred + Wishlists are PRIVATE — on someone else's profile the
       sections do not exist at all: no pills, no content, no notes
       (Brendon 2026-06-10). moreL1 can hold a stale private key after
       navigating own profile → other profile, so clamp it for visitors. */
    /* Cooldown is an ARTIST-ONLY tab and only exists while the window is
       actually shut — the status read is server-side, so a profile with no
       running cooldown never gets the pill (Brendon, 2026-07-31). */
    const onCooldown = artistStatus === 'cooldown';
    const effMoreL1: ProfileMoreL1 = (() => {
        let v = moreL1;
        // Cooldown vanishes the moment the window opens (or off an artist).
        if (v === 'cooldown' && !onCooldown) v = 'starred';
        // 'created' only exists for traditional-Top-6 artists with projects.
        if (v === 'created' && !createdUnderMore) v = 'albums';
        // Targets folded into Calls (Brendon, 2026-09-01) — a stale saved/shared
        // 'targets' key now opens Calls, where that content lives.
        if ((v as string) === 'targets') v = 'calls';
        // Visitors never see private Starred/Wishlists — fall to Created (when
        // this artist surfaces it) else Albums.
        /* Offers joined the private set 2026-08-01 — a visitor landing on a
           stale 'offers' key would open a tab that has no pill any more.
           ⛔ ALBUMS LEFT THE PRIVATE SET 2026-08-02 (Brendon): albums are
           public, so a visitor's 'albums' key opens the keeper's real shelf. */
        if (!isOwnProfile && (v === 'starred' || v === 'wishlists' || v === 'history' || v === 'offers')) {
            v = createdUnderMore ? 'created' : 'vault';
        }
        // A price-* key only exists on @price — leaving it for a normal
        // profile (the useEffect above only fires on isPlatform's own
        // change, not on every navigation) falls back the same way.
        if (!isPlatform && v.startsWith('price-')) {
            v = createdUnderMore ? 'created' : 'vault';
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
       History has its own timeline config — ◷ only (the borrowed Outputs
       set showed a GROUP + sorts the timeline never applied). */
    const moreCfg = MORE_CFG[onWishlistTab ? 'wishlist' : onHistoryTab ? 'history' : moreMode] ?? MORE_CFG.all;
    /* Created carousels shown either inside the Artist-style showcase or as the
       +More sub-tab for traditional-Top-6 artists. */
    const moreCreatedActive = onMore && createdUnderMore && effMoreL1 === 'created';
    const createdCarouselsActive =
        (artistShowcaseCreated && mintSort.key !== 'feed') || moreCreatedActive;
    /* #gallery shows for Collected and for the Top 6 grid; the Created view
       replaces it with project carousels below. */
    /* A platform account (@price) holds nothing and created nothing, so its
       Showcase slot carries the token's own information panel instead of an
       empty grid, and its Holders (Collected) slot carries the $PRICE Top
       Holders board instead of an empty owned-NFT grid (Brendon, 2026-08-13
       — was "still behaves normally — it is simply empty" until Holders
       shipped). */
    const galleryVisible = (((onShowcase && !artistShowcaseCreated) || onCollected) && !isPlatform) && !feedActive;

    /* Showcase move mode only lives on YOUR OWN Static showcase grid. Leaving
       the tab, switching showcase style, or landing on the Created view all
       close it — the DONE pill is the deliberate way out. */
    const scMoveEligible = isOwnProfile && onShowcase && effStyle === 'static' && !artistShowcaseCreated;
    useEffect(() => {
        if (!scMoveEligible && scMoveMode) setScMoveMode(false);
    }, [scMoveEligible, scMoveMode]);
    /* The Bench reads move mode and only half-protrudes while it's on, so the
       showcase grid stays visible under the drag (Brendon, 2026-07-26). */
    useEffect(() => {
        const on = scMoveEligible && scMoveMode;
        document.body.classList.toggle('pd-showcase-move', on);
        return () => { document.body.classList.remove('pd-showcase-move'); };
    }, [scMoveEligible, scMoveMode]);
    /* Live grid column metrics — lets each grouping header cap its width to
       the columns its pieces occupy (glyph ends with the art, 2026-07-12). */

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
                                @{styledHandle}
                            </span>
                        ) : (
                            <ArtistTitleStar handle={displayHandle} display={`@${styledHandle}`} />
                        )}
                        <PriceDayDateLink
                            date={joinDate ?? new Date()}
                            label={dateShowsNum && user.user_number != null
                                ? `PD User #${user.user_number}`
                                : (memberSince || '\u2014')}
                            titleAttr={dateShowsNum ? `PD User #${user.user_number}` : 'PriceDay'}
                            onBeforeToggle={() => {
                                if (dateLpFired.current) { dateLpFired.current = false; return true; }
                                return false;
                            }}
                            onPointerDownCapture={onDatePointerDown}
                            onPointerMoveCapture={onDatePointerMove}
                            onPointerUpCapture={onDatePressEnd}
                            onPointerLeaveCapture={onDatePressEnd}
                            onPointerCancelCapture={onDatePressEnd}
                            onContextMenuCapture={(e) => { if (user.user_number != null) e.preventDefault(); }}
                            spanStyle={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
                            topExtra={(
                                <>
                                    <div className="pd-section-header">JOINED</div>
                                    <div className="dp-row">
                                        <span className="dp-label">{memberSince || '—'}</span>
                                        <span className="dp-value">@{displayHandle}</span>
                                    </div>
                                    <div className="pd-section-end" />
                                </>
                            )}
                        />
                    </h1>
                    {isOwnProfile && eggOpen && (
                        <>
                        <div className="profile-egg-row cust-scroll profile-colours-picker">
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
                        {/* Row 2 — TAGS. Hidden sequence Manual → Earned → Chosen
                            (Brendon, 2026-07-22): your Manual (CEO/WTBS…) + Earned
                            (User #N/PriceDay #N/artist…) tags list first as
                            on/off toggles, then the pick-your-own personas, then
                            the all-tags paints at the end. No section headers. */}
                        <div className="profile-egg-row cust-scroll profile-tags-picker">
                            {myAutoTags.map((t) => {
                                /* A default-on tag (a project tag) is worn until
                                   it is switched OFF, so its pill reads from the
                                   opt-out list and writes back to it. */
                                const on = t.defaultOn ? !myTagsOff.includes(t.id) : myShown.includes(t.id);
                                const flip = () => {
                                    if (t.defaultOn) toggleOff(t.id);
                                    else toggleShown(t.id);
                                    showToast(`Tag: ${on ? 'HIDDEN' : 'SHOWN'} · ${t.label.toUpperCase()}`);
                                };
                                return (
                                    <div
                                        key={t.id}
                                        className={`pill pill-l3 tag-pick${on ? ' active' : ''}`}
                                        style={{ ['--tag' as string]: t.color, ['--tag-text' as string]: t.textColor ?? tagTextOn(t.color) }}
                                        role="button"
                                        tabIndex={0}
                                        onClick={flip}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } }}
                                        title={t.label}
                                    >
                                        {t.glyph && <span className="tag-pick-glyph">{t.glyph}</span>}
                                        <span className="stat-name">{t.label}</span>
                                    </div>
                                );
                            })}
                            {PERSONA_TAGS.map((t) => {
                                const on = myTags.includes(t.id);
                                const flip = () => {
                                    toggleTag(t.id);
                                    showToast(`Tag: ${on ? 'REMOVED' : t.label.toUpperCase()}`);
                                };
                                return (
                                    <div
                                        key={t.id}
                                        className={`pill pill-l3 tag-pick${on ? ' active' : ''}`}
                                        style={{ ['--tag' as string]: t.color, ['--tag-text' as string]: tagTextOn(t.color) }}
                                        role="button"
                                        tabIndex={0}
                                        onClick={flip}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } }}
                                        title={t.blurb ?? t.label}
                                    >
                                        {t.glyph && <span className="tag-pick-glyph">{t.glyph}</span>}
                                        <span className="stat-name">{t.label}</span>
                                    </div>
                                );
                            })}
                            {/* FORMULA trigger (Brendon, 2026-08-16) — always the
                                last pill before the all-tags paints, never a
                                tag itself. Tapping it doesn't wear/unwear
                                anything — it opens/closes the Formula carousel
                                directly below this row. */}
                            <div
                                className={`pill pill-l3 tag-pick fx-trigger${formulaCarouselOpen ? ' active' : ''}`}
                                style={{ ['--tag' as string]: '#111111', ['--tag-text' as string]: '#E0E0E0' }}
                                role="button"
                                tabIndex={0}
                                onClick={() => setFormulaCarouselOpen((v) => !v)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormulaCarouselOpen((v) => !v); } }}
                                title="Formula — your own generative art, worn as a tag"
                            >
                                <span className="stat-name">{'Formula'}</span>
                            </div>
                            {/* THE PAINT — all-tags overrides at the very end
                                (Brendon, 2026-07-20): one colour for every
                                pill, lettering contrast-flipped. Tapping the
                                active paint again returns each tag to its own
                                colour. */}
                            {TAG_PAINTS.map((p) => {
                                const on = myTagPaint === p.id;
                                const pick = () => {
                                    setMyTagPaint(on ? null : p.id);
                                    showToast(on ? 'Tags: THEIR OWN COLOURS' : `Tags: ${p.label.toUpperCase()}`);
                                };
                                return (
                                    <div
                                        key={p.id}
                                        className={`pill pill-l3 tag-pick${on ? ' active' : ''}`}
                                        style={{ ['--tag' as string]: p.hex, ['--tag-text' as string]: tagTextOn(p.hex) }}
                                        role="button"
                                        tabIndex={0}
                                        onClick={pick}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
                                        title={`Paint every tag — ${p.label}`}
                                    >
                                        <span className="stat-name">{p.label}</span>
                                    </div>
                                );
                            })}
                            {/* THE PICKER — any colour you like, at the end of
                                the paints (Brendon, 2026-07-26). Same hidden
                                colour-input pattern as the colorway swatch. */}
                            {(() => {
                                const custom = /^#[0-9A-F]{6}$/i.test(myTagPaint ?? '');
                                const hex = custom ? (myTagPaint as string) : '#FF0055';
                                return (
                                    <label
                                        className={`pill pill-l3 tag-pick tag-pick-custom${custom ? ' active' : ''}`}
                                        style={{ ['--tag' as string]: hex, ['--tag-text' as string]: tagTextOn(hex) }}
                                        title="Paint every tag — your own colour"
                                    >
                                        <span className="stat-name">{`◩︎ ${custom ? hex : 'Custom'}`}</span>
                                        <input
                                            type="color"
                                            value={hex}
                                            onChange={(e) => {
                                                const v = e.target.value.toUpperCase();
                                                setMyTagPaint(v);
                                                showToast(`Tags: ${v}`);
                                            }}
                                            tabIndex={-1}
                                            aria-label="Paint every tag your own colour"
                                            style={{
                                                position: 'absolute', opacity: 0,
                                                width: '1px', height: '1px',
                                                bottom: 0, left: '50%', pointerEvents: 'none',
                                            }}
                                        />
                                    </label>
                                );
                            })()}
                        </div>
                        {formulaCarouselOpen && (
                        /* FORMULA carousel (Brendon, 2026-08-16): opened by the
                           Formula trigger pill in Row 2, sits directly below it
                           and shoves Row 3 (fonts) down while open. Two faces:
                           browsing your shelf, and editing one — every
                           parameter is a button IN the row, not a modal. Empty
                           by default: the option buttons preview greyed out
                           until the first Formula is made. */
                        <div className="profile-egg-row cust-scroll profile-formula-picker">
                            {editingFormula === null ? (
                                <>
                                    {/* NEW — the only way in. Hidden at the cap. */}
                                    {myFormulas.length < MAX_FORMULAS && (
                                        <div
                                            className="pill pill-l3 fx-new"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                const next = [...myFormulas, newFormula()];
                                                saveFormulas(next);
                                                setEditingFormula(next.length - 1);
                                                showToast(`Formula #${next.length}: CREATED`);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key !== 'Enter' && e.key !== ' ') return;
                                                e.preventDefault();
                                                const next = [...myFormulas, newFormula()];
                                                saveFormulas(next);
                                                setEditingFormula(next.length - 1);
                                                showToast(`Formula #${next.length}: CREATED`);
                                            }}
                                            title="Make a Formula — your own generative art, worn as a tag"
                                        >
                                            <span className="stat-name">{'+ Formula (tag gen art)'}</span>
                                        </div>
                                    )}
                                    {/* Preview — the option buttons that light up the moment a
                                        Formula exists, shown greyed/inert before then so the
                                        row isn't a single lonely button (Brendon, 2026-08-16). */}
                                    {myFormulas.length === 0 && (
                                        <div className="fx-preview-group" aria-hidden="true">
                                            {FORMULA_SETS.map((set) => (
                                                <div key={set.name} className="pill pill-l3 fx-opt fx-opt-preview">
                                                    <span className="stat-name">{`${set.glyphs.slice(0, 3).join('')} ${set.name}`}</span>
                                                </div>
                                            ))}
                                            {FORMULA_SIZES.map((sz) => (
                                                <div key={`l${sz.len}`} className="pill pill-l3 fx-opt fx-opt-preview">
                                                    <span className="stat-name">{sz.label}</span>
                                                </div>
                                            ))}
                                            {FORMULA_WEAVES.map((w) => (
                                                <div key={w} className="pill pill-l3 fx-opt fx-opt-preview">
                                                    <span className="stat-name">{w}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {myFormulas.map((f, i) => (
                                        <div key={i} className="fx-shelf-item">
                                            {/* The pill IS the artwork, drawn live. Tap = wear/unwear. */}
                                            <div
                                                className={`pill pill-l3 tag-pick fx-pill${f.on ? ' active' : ''}`}
                                                style={{ ['--tag' as string]: '#111111', ['--tag-text' as string]: '#E0E0E0' }}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                    const next = myFormulas.map((x, j) => (j === i ? { ...x, on: !x.on } : x));
                                                    saveFormulas(next);
                                                    showToast(`Formula #${i + 1}: ${f.on ? 'OFF' : 'WORN'}`);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key !== 'Enter' && e.key !== ' ') return;
                                                    e.preventDefault();
                                                    saveFormulas(myFormulas.map((x, j) => (j === i ? { ...x, on: !x.on } : x)));
                                                }}
                                                title={`Formula #${i + 1} — ${formulaBlurb(f)}`}
                                            >
                                                <span className="stat-name">{drawFormula(f, formulaRoll ?? 0)}</span>
                                            </div>
                                            {/* The pencil — edit this saved one. */}
                                            <div
                                                className="pill pill-l3 fx-pencil"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setEditingFormula(i)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingFormula(i); } }}
                                                title={`Edit Formula #${i + 1}`}
                                                aria-label={`Edit Formula #${i + 1}`}
                                            >
                                                <span className="stat-name">{'✎︎'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : (() => {
                                const i = editingFormula;
                                const f = myFormulas[i];
                                if (!f) { setEditingFormula(null); return null; }
                                const patch = (next: Partial<Formula>) =>
                                    saveFormulas(myFormulas.map((x, j) => (j === i ? { ...x, ...next } : x)));
                                const btn = (key: string, label: string, on: boolean, hit: () => void, title: string) => (
                                    <div
                                        key={key}
                                        className={`pill pill-l3 fx-opt${on ? ' active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={hit}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } }}
                                        title={title}
                                    >
                                        <span className="stat-name">{label}</span>
                                    </div>
                                );
                                return (
                                    <>
                                        {/* The live piece, pinned at the head of the row so every
                                            button press is visible in the work itself. */}
                                        <div
                                            className="pill pill-l3 fx-pill fx-live"
                                            style={{ ['--tag' as string]: '#111111', ['--tag-text' as string]: '#E0E0E0' }}
                                            title={`Formula #${i + 1} — ${formulaBlurb(f)}`}
                                        >
                                            <span className="stat-name">{drawFormula(f, formulaRoll ?? 0)}</span>
                                        </div>
                                        {btn('done', '✓︎ DONE', false, () => setEditingFormula(null), 'Back to your shelf')}
                                        {/* SETS — the main dial. Never empty: the last one can't be dropped. */}
                                        {FORMULA_SETS.map((set, si) => btn(
                                            `s${si}`,
                                            `${set.glyphs.slice(0, 3).join('')} ${set.name}`,
                                            f.sets.includes(si),
                                            () => {
                                                const has = f.sets.includes(si);
                                                if (has && f.sets.length === 1) return;
                                                patch({ sets: has ? f.sets.filter((x) => x !== si) : [...f.sets, si].sort((a, b) => a - b) });
                                            },
                                            `${set.name} — ${set.glyphs.join(' ')}`,
                                        ))}
                                        {FORMULA_SIZES.map((sz) => btn(`l${sz.len}`, sz.label, f.len === sz.len, () => patch({ len: sz.len }), `${sz.label} — ${sz.len} glyphs long`))}
                                        {FORMULA_WEAVES.map((w, wi) => btn(`w${wi}`, w, f.weave === wi, () => patch({ weave: wi }), `Weave: ${w}`))}
                                        {btn('sp', 'Spaced', f.spaced, () => patch({ spaced: !f.spaced }), 'Hair space between glyphs')}
                                        {/* DELETE — the way out. Renumbers the shelf, like Albums. */}
                                        {btn('del', '× DELETE', false, () => {
                                            saveFormulas(myFormulas.filter((_, j) => j !== i));
                                            setEditingFormula(null);
                                            showToast(`Formula #${i + 1}: DELETED`);
                                        }, `Delete Formula #${i + 1}`)}
                                    </>
                                );
                            })()}
                        </div>
                        )}
                        {/* Row 3 — FONT: restyle the @name. Each pill previews
                            itself; the "@" always stays plain. */}
                        <div className="profile-egg-row cust-scroll profile-fonts-picker">
                            {NAME_FONTS.map((f) => {
                                const on = (ownerNameFont ?? 'default') === f.id;
                                const pick = () => {
                                    setMyNameFont(f.id === 'default' ? null : f.id);
                                    showToast(`Font: ${f.label.toUpperCase()}`);
                                };
                                return (
                                    <div
                                        key={f.id}
                                        className={`pill pill-l3${on ? ' active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={pick}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
                                        title={f.label}
                                    >
                                        <span className="stat-name" style={f.id === 'default' ? { fontFamily: 'var(--font-rubik-mono), sans-serif' } : undefined}>{f.id === 'default' ? 'Default' : styleName(f.label, f.id)}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Row 4 — PRESETS: one tap regenerates colorway + tag
                            paint + logo + font together. Random rolls all four
                            independently; Match locks colorway/tag paint/logo
                            to one rolled hue; Accent rolls a second, genuinely
                            different colour for the tag paint (harmony or
                            primary-triad); Pair rolls the SAME colour at a
                            different shade instead (Brendon, 2026-09-02 — Pair
                            used to blend both of those; now they're split so
                            each mode does one clear thing). Colorway and tag
                            paint are full-spectrum (no fixed swatch pool), so
                            every roll picks a fresh vivid hue rather than
                            sampling a preset list (Brendon, 2026-08-30).
                            Brendon, 2026-09-02: Roll now leads the row (grey/
                            italic until a mode or Generative is picked);
                            Generative is a standing 24h-reroll toggle, not a
                            one-shot shape; 3 save-slot pills close the row —
                            tap empty to save the current look, tap filled to
                            load it (same UI as Grid Presets). */}
                        <div className="profile-egg-row cust-scroll profile-presets-picker">
                            <div
                                className={`pill pill-l3 preset-roll-pill${rollReady ? '' : ' preset-roll-pill--disabled'}`}
                                role="button"
                                tabIndex={0}
                                aria-disabled={!rollReady}
                                onClick={() => { if (rollReady) rollProfilePreset(); }}
                                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && rollReady) { e.preventDefault(); rollProfilePreset(); } }}
                                title="Roll a new preset"
                            >
                                <span className="stat-name">{'⟳ Roll'}</span>
                            </div>
                            {(['random', 'match', 'accent', 'pair'] as const).map((m) => (
                                <div
                                    key={m}
                                    className={`pill pill-l3${presetMode === m ? ' active' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setPresetMode(m)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPresetMode(m); } }}
                                    title={PRESET_MODE_LABEL[m]}
                                >
                                    <span className="stat-name">{PRESET_MODE_LABEL[m]}</span>
                                </div>
                            ))}
                            <div
                                className={`pill pill-l3${generative.enabled ? ' active' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={toggleGenerative}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGenerative(); } }}
                                title="Generates new profile design every 24hrs"
                            >
                                <span className="stat-name">Generative</span>
                            </div>
                            {Array.from({ length: MAX_PROFILE_PRESETS }).map((_, i) => {
                                const slot = profilePresetSlots[i];
                                const style = slot
                                    ? ({ background: slot.hex, color: slot.tagPaint, borderColor: slot.hex } as const)
                                    : undefined;
                                return (
                                    <div
                                        key={`profile-preset-${i}`}
                                        className={`pill pill-l3 profile-preset-slot${slot ? ' profile-preset-slot--filled' : ' profile-preset-slot--empty'}`}
                                        role="button"
                                        tabIndex={0}
                                        style={style}
                                        onClick={() => tapProfilePresetSlot(i)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapProfilePresetSlot(i); } }}
                                        title={slot ? `Load Preset ${i + 1}` : `Save current look to Preset ${i + 1}`}
                                    >
                                        <span className="stat-name">{PROFILE_PRESET_GLYPHS[i]}</span>
                                        {slot && (
                                            <span
                                                className="profile-preset-slot__delete"
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Delete Preset ${i + 1}`}
                                                onClick={(e) => { e.stopPropagation(); deleteProfilePresetSlot(i); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        deleteProfilePresetSlot(i);
                                                    }
                                                }}
                                            >
                                                {'×'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        </>
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
                                    className="id-row-addr"
                                    href={`https://etherscan.io/address/${user.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {ensName && !isPlatform ? (
                                        // The chosen Unicode font also styles the ENS
                                        // (Brendon, 2026-07-21) — same treatment as the
                                        // @name. The wallet-address fallback stays plain.
                                        styleName(viaLabel, ownerNameFont ?? null)
                                    ) : (
                                        <>
                                            {/* @price: the token contract, same plain
                                                address style as any wallet, just labelled
                                                (Brendon, 2026-08-14 — was showing the
                                                ens_name "Price Discussion" instead). */}
                                            {isPlatform && <span className="id-row-contract-label">Contract:</span>}
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
                                {artistStatus && artistProjects.length > 0 && (
                                    <span className="id-row-artist" aria-label="Official PD Artist (whitelisted)" title="✺︎ Official PD Artist — whitelisted">{'✺︎'}</span>
                                )}
                                <span
                                    className="icon-copy id-copy"
                                    role="button"
                                    tabIndex={0}
                                    title={`Copy ${isPlatform ? 'contract address' : ensName ? 'ENS' : 'wallet address'}`}
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
                    /* One typed line, matching the homepage Featuring row
                       exactly (Brendon, 2026-08-20): each name is followed
                       by a real &nbsp; — either straight after the name, or
                       after the comma — no CSS gap/margin spacing left to
                       fake it. */
                    <div className="hero-line collected-by-row info-line feat-row-lock">
                        <span className="cbr-label">Followed by&nbsp;</span>
                        <a key={mutuals[0]} className="profile-link feat-name" href={`/${mutuals[0]}`}>@{mutuals[0]}</a>
                        {mutuals[1] ? (
                            <>,&nbsp;<a key={mutuals[1]} className="profile-link feat-name" href={`/${mutuals[1]}`}>@{mutuals[1]}</a> </>
                        ) : ' '}
                        {mutualOthers > 0 && (
                            <span className="cbr-others">
                                &amp;&nbsp;{mutualOthers}&nbsp;{mutualOthers === 1 ? 'Other' : 'Others'}&nbsp;You&nbsp;Follow
                            </span>
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
                            {/* Every profile's count opens COMPLETIONISM — the
                                month-by-month release checklist (Brendon,
                                2026-07-02, one of PD's first-envisaged
                                features; opened to every profile, read-only
                                on profiles that aren't yours, 2026-08-16 —
                                the info isn't private, so it's the same
                                competitive read everywhere). The door owns
                                its own open flag (see CompletionismDoor) —
                                keeping it out of this component is what stops
                                the whole profile re-rendering every time the
                                sheet opens. */}
                            <CompletionismDoor
                                address={user.address}
                                count={Math.max(ownedCount, holdings.length)}
                                readOnly={!isOwnProfile}
                            />
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span
                                className="stat-icon-eth"
                                role="button"
                                tabIndex={0}
                                title={isPlatform ? 'ETH ⇄ $PRICE' : 'Volume Spent'}
                                onClick={openVolumeSpentToast}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVolumeSpentToast(); } }}
                            >
                                ⟠&#xFE0E;
                            </span>{' '}
                            <span
                                className="stat-val stat-val-vol"
                                role="button"
                                tabIndex={0}
                                title={isPlatform ? 'ETH ⇄ $PRICE' : 'Volume Spent'}
                                onClick={openVolumeSpentToast}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVolumeSpentToast(); } }}
                            >
                                {formatEth(isPlatform ? (priceMarketRate?.priceEth ?? 0) : volumeSpent)}
                            </span>
                        </span>
                        <span className="stat-item stat-item-owners">
                            {/* \u263B \u2014 THE social mark (GLYPHS \u00A712h) wears the followers
                                stat now (Brendon, 2026-07-27; was the \u26AC circle). */}
                            <span className="stat-icon stat-icon-owners stat-icon-followers" {...iconToastProps('Followers')}>{'\u263B\uFE0E'}</span>{' '}
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
                    <ProfileTags
                        tags={displayTags}
                        font={ownerNameFont}
                        paint={ownerTagPaint}
                        onTagTap={isOwnProfile ? (t) => (isTeamStyleTag(t.id) ? cycleTeamTagStyle() : toggleEgg()) : undefined}
                        trailing={<EquippedCharm address={user.address} handle={user.handle ?? handle} />}
                    />
                    <HeroStickers
                        ownerHandle={user.handle ?? handle}
                        isOwn={isOwnProfile}
                        savedLayout={user.sticker_state?.placements ?? null}
                        savedAspect={user.sticker_state?.placementAspect ?? null}
                        savedOwnedIds={user.sticker_state?.owned ?? null}
                        savedOffSheets={user.sticker_state?.offSheets ?? null}
                        savedOffIds={user.sticker_state?.offIds ?? null}
                    />
                    <div className="action-row">
                        <FollowButton targetAddress={user.address} targetHandle={user.handle ?? displayHandle} />
                        {/* TAKEOVER — first-class profile action (spec 86b9g6c7c):
                            open the cast sheet on this collector. Shown ONLY when a
                            takeover could actually be cast (3+ pieces of one
                            project); the sheet + API enforce the premium rules.
                            GLYPH ONLY beside Share (Brendon, 2026-08-03) — the ⚑
                            raid flag alone; a toast names it as it opens. */}
                        {canTakeover && (
                            <button
                                className="btn-soundtrack tko-cast-entry"
                                title={`Cast a Takeover on @${displayHandle}`}
                                onClick={() => {
                                    showToast(`⚑︎ TAKEOVER — cast on @${displayHandle}`);
                                    openModal('takeover', user.handle ?? displayHandle, user.address);
                                }}
                            >
                                <span className="btn-icon-glyph">⚑︎</span>
                            </button>
                        )}
                        {/* THE EXCHANGE — head-to-head trade with this collector
                            (spec 86ba0apqr: profile-page surface). */}
                        {/* Only when they actually hold something to trade
                            (Brendon, 2026-07-29). Glyph only; a toast names it
                            as it opens (Brendon, 2026-08-03). */}
                        {isAuthed && !isOwnProfile && !isPlatformAccount(user.address) && ownedCount > 0 && (
                            <button
                                className="btn-soundtrack"
                                title={`Trade with @${displayHandle}`}
                                onClick={() => {
                                    showToast(`⇌︎ THE EXCHANGE — trade with @${displayHandle}`);
                                    openExchange(user.address, user.handle ?? displayHandle);
                                }}
                            >
                                <span className="btn-icon-glyph">⇌︎</span>
                            </button>
                        )}
                        {(() => {
                            /* Glyph-only trio (Brendon, 2026-08-17): when ALL
                               THREE optional actions — Takeover, Exchange, Share —
                               are present alongside the CTA, Share drops its full
                               pill and joins the other two as glyph-only, using
                               its own ↗ share glyph (never the ▶ play icon, which
                               is reserved for the full-pill variant). With fewer
                               than 3, Share keeps its original full pill + ▶. */
                            const exchangeShown = isAuthed && !isOwnProfile && !isPlatformAccount(user.address) && ownedCount > 0;
                            const shareGlyphOnly = canTakeover && exchangeShown;
                            return (
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
                                    {shareGlyphOnly ? (
                                        <span className="btn-icon-share">↗&#xFE0E;</span>
                                    ) : (
                                        <>
                                            {/* ▶ play icon — full-pill variant only. */}
                                            <span className="btn-icon-play">▶&#xFE0E;</span>
                                            {' '}<span>SHARE</span>
                                        </>
                                    )}
                                </button>
                            );
                        })()}
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
                            <span className="stat-name">{isPlatform ? '$PRICE' : 'Showcase'}</span>
                        </div>
                        <div
                            className={`pill pill-l1${onCollected ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTabPersisted('collected')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTabPersisted('collected'); } }}
                        >
                            <span className="stat-name">{isPlatform ? 'Holders' : 'Collected'}</span>
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
                                /* @price: the four $PRICE doc pages replace the whole
                                   row — Vault/Sigil/Loyalty/etc. are per-user systems
                                   that mean nothing for a platform account, same
                                   reasoning as Zen's Albums-only row (Brendon,
                                   2026-08-13). */
                                (isPlatform
                                    ? [
                                        { key: 'price-overview',   label: 'Overview',       active: effMoreL1 === 'price-overview',   onClick: () => setMoreL1('price-overview')   },
                                        { key: 'price-tokenomics', label: 'Tokenomics',     active: effMoreL1 === 'price-tokenomics', onClick: () => setMoreL1('price-tokenomics') },
                                        { key: 'price-contract',   label: 'Contract',       active: effMoreL1 === 'price-contract',   onClick: () => setMoreL1('price-contract')   },
                                        { key: 'price-utility',    label: 'No Utility',     active: effMoreL1 === 'price-utility',    onClick: () => setMoreL1('price-utility')    },
                                    ]
                                /* Zen's single Albums tab. Albums are public
                                   (Brendon, 2026-08-02), so a visitor gets the
                                   keeper's shelf behind it — read-only. */
                                : isZen
                                    ? [{ key: 'albums', label: <><span className="pill-tab-ico is-album">{'◰︎'}</span> Albums</>, active: effMoreL1 === 'albums', onClick: () => setMoreL1('albums') }]
                                    : [
                                        /* Cooldown leads the whole row — the live clock
                                           to this artist's next upload window. Only
                                           while the window is shut (Brendon, 2026-07-31). */
                                        ...(onCooldown
                                            ? [{
                                                key: 'cooldown',
                                                /* The glyph reads the artist's real status — the
                                                   SAME pair the Artists dropdown flies for it:
                                                   ⏻ shut, ⏼ open (Brendon, 2026-07-31). */
                                                label: <><span className="pill-tab-ico">{artistStatus === 'cooldown' ? '⏻︎' : '⏼︎'}</span> Cooldown</>,
                                                active: effMoreL1 === 'cooldown',
                                                onClick: () => setMoreL1('cooldown'),
                                            }]
                                            : []),
                                        /* Created leads the row for traditional-Top-6
                                           artists — their works are always reachable. */
                                        ...(createdUnderMore
                                            ? [{ key: 'created', label: <><span className="pill-tab-ico is-created">{'\u270E\uFE0E'}</span> Created</>, active: effMoreL1 === 'created', onClick: () => setMoreL1('created') }]
                                            : []),
                                        /* ⛔ ALBUMS ARE PUBLIC (Brendon,
                                           2026-08-02) — the pill stands on
                                           EVERY profile, and a visitor reads
                                           the keeper's shelf. It was own-only
                                           from 2026-07-31 purely because an
                                           album was private then. */
                                        { key: 'albums', label: <><span className="pill-tab-ico is-album">{'◰︎'}</span> Albums</>, active: effMoreL1 === 'albums', onClick: () => setMoreL1('albums') },
                                        /* Starred + Wishlists are private — the
                                           pills exist on YOUR OWN profile only. */
                                        ...(isOwnProfile
                                            ? [
                                                { key: 'starred',   label: <><span className="pill-tab-ico is-star">{'★︎'}</span> Starred</>,   active: effMoreL1 === 'starred',   onClick: () => setMoreL1('starred')   },
                                                { key: 'wishlists', label: <><span className="pill-tab-ico is-wishlist">{'✛︎'}</span> Wishlist</>, active: effMoreL1 === 'wishlists', onClick: () => setMoreL1('wishlists') },
                                                /* ⛔ OFFERS IS OWN-PROFILE ONLY (Brendon, 2026-08-01). The
                                                   wallet-level offers view isn't built, so on someone else's
                                                   profile the tab could only ever say "no offers yet" — a dead
                                                   tab on a person you came to scout. It comes back for
                                                   everyone the day the view ships. */
                                                { key: 'offers',    label: <><span className="pill-tab-ico is-offers">{'\u2736\uFE0E'}</span> Offers</>,    active: effMoreL1 === 'offers',    onClick: () => setMoreL1('offers')    },
                                            ]
                                            : []),
                                        { key: 'vault',     label: <><span className="pill-tab-ico is-vault">{'\u26BF\uFE0E'}</span> Vault</>,     active: effMoreL1 === 'vault',     onClick: () => setMoreL1('vault')     },
                                        { key: 'loyalty',   label: <><span className="pill-tab-ico is-loyalty">{'\u2724\uFE0E'}</span> Loyalty</>,   active: effMoreL1 === 'loyalty',   onClick: () => setMoreL1('loyalty')   },
                                        { key: 'achievements', label: <><span className="pill-tab-ico is-achievements">{ACHIEVEMENTS_ICON}</span> Achievements</>, active: effMoreL1 === 'achievements', onClick: () => setMoreL1('achievements') },
                                        { key: 'counterparties', label: <><span className="pill-tab-ico is-counterparties">{'\u21C4\uFE0E'}</span> Counterparties</>, active: effMoreL1 === 'counterparties', onClick: () => setMoreL1('counterparties') },
                                        { key: 'calls',     label: <><span className="pill-tab-ico is-calls">{'\u00A1\uFE0E'}</span> Calls</>,     active: effMoreL1 === 'calls',     onClick: () => setMoreL1('calls')     },
                                        { key: 'anointed',  label: <><span className="pill-tab-ico is-anoint">{'\u2722\uFE0E'}</span> Anointed</>,  active: effMoreL1 === 'anointed',  onClick: () => setMoreL1('anointed')  },
                                        /* Sigil pill — owner-gated (Brendon, 2026-08-27): shown only once
                                           this profile has actually forged a mark. Same field that gates
                                           the trailing name mark elsewhere on this page
                                           (user.sigil_forged_at), independent of sigil_hidden — a hidden
                                           mark still has a Sigil tab to manage it from; an unforged
                                           account has nothing to show yet. */
                                        ...(user.sigil_forged_at
                                            ? [{ key: 'sigil', label: <><span className="pill-tab-ico is-sigil">{'\u203B\uFE0E'}</span> Sigil</>, active: effMoreL1 === 'sigil', onClick: () => setMoreL1('sigil') }]
                                            : []),
                                        { key: 'discord',   label: <><span className="pill-tab-ico is-discord">{'#'}</span> Discord</>,   active: effMoreL1 === 'discord',   onClick: () => setMoreL1('discord')   },
                                        /* My History — PRIVATE, last pill in the row, own profile only. */
                                        ...(isOwnProfile
                                            ? [{ key: 'history', label: <><span className="pill-tab-ico is-history">{'◷︎'}</span> My History</>, active: effMoreL1 === 'history', onClick: () => setMoreL1('history') }]
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
                                                    /* Any sort other than ≡ LISTS is also the way
                                                       OUT of the lists panel (Brendon, 2026-07-25). */
                                                    onClick={() => { setMyListsOpen(false); cycleMoreSort(key); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMyListsOpen(false); cycleMoreSort(key); } }}
                                                >
                                                    <span className={`sort-lbl${isRecentIcon ? ' sort-lbl-recent' : ''}`}>{isRecentIcon ? '◷︎' : lbl}</span>
                                                    <span className="sort-arrow">
                                                        {active ? (moreSortDir === 'asc' ? '↑︎' : '↓︎') : ''}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                        {/* LISTS — last in the sort row, after
                                            ◷ Recent and AZ (Brendon, 2026-07-24;
                                            shortened from MY LISTS 2026-07-25).
                                            Starred and History both use it —
                                            it's the same private shelf either
                                            way in (Brendon, 2026-09-03). */}
                                        {(onStarredTab || onHistoryTab) && isOwnProfile && (
                                            <span
                                                className={`sort-btn${myListsOpen ? ' active' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                title="Lists"
                                                onClick={toggleMyLists}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMyLists(); } }}
                                            >
                                                {/* Word only in the sort row — the ≡ stays PD's
                                                    Lists mark, it just doesn't ride this button
                                                    (Brendon, 2026-07-25). */}
                                                <span className="sort-lbl">LISTS</span>
                                                {/* The row's own direction arrow — ≡ carries a
                                                    sort like every button beside it. */}
                                                <span className="sort-arrow">
                                                    {myListsOpen ? (myListsDir === 'asc' ? '↑︎' : '↓︎') : ''}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                ) : undefined
                            }
                            profileValueRow={
onStarredTab && isOwnProfile && (starredValid.length > 0 || traitStarsValid.length > 0 || artistStars.length > 0 || soundtrackStars.length > 0 || projectStarsValid.length > 0 || priceDayStars.length > 0 || albumStarsValid.length > 0 || vaultStarsValid.length > 0 || txStars.length > 0) ? (
                                    <div className="stats-container collected-values" style={{ display: 'flex' }}>
                                        {([
                                            { key: 'all',         label: 'All Starred', count: starredValid.length + traitStarsValid.length + starredArtistHandles.length + starredCollectorHandles.length + soundtrackStars.length + projectStarsValid.length + priceDayStars.length + albumStarsValid.length + vaultStarsValid.length + txStars.length },
                                            { key: 'collectors',  label: 'Collectors',  count: starredCollectorHandles.length },
                                            { key: 'artists',     label: 'Artists',     count: starredArtistHandles.length },
                                            // Social filters across collectors + artists + projects. No count
                                            // badge — the tally depends on the live follow graph (resolved in
                                            // the list), not the starred totals here.
                                            { key: 'followers',   label: 'Followers',   count: 0 },
                                            { key: 'following',   label: 'Following',   count: 0 },
                                            { key: 'mutuals',     label: 'Mutuals',     count: 0 },
                                            { key: 'projects',    label: 'Projects',    count: projectStarsValid.length },
                                            { key: 'priceday',    label: 'PriceDays',   count: priceDayStars.length },
                                            { key: 'albums',      label: 'Albums',      count: albumStarsValid.length },
                                            { key: 'vaults',      label: 'Vaults',      count: vaultStarsValid.length },
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

                    {/* Cooldown — the live clock to this artist's next upload
                        window. Moved here from the bottom of the Created
                        showcase (Brendon, 2026-07-31). */}
                    {onMore && effMoreL1 === 'cooldown' && (
                        <div className="ach-section" aria-label="Cooldown">
                            <UploadWindowCountdown address={user.address} tiles />
                        </div>
                    )}

                    {/* Albums — the covers grid → album drill-in (iOS-Photos
                        simple, power under SELECT/▶). Numbered only, and PUBLIC
                        (Brendon, 2026-08-02): a visitor reads the keeper's shelf
                        and can watch the show; only the keeper can edit it. */}
                    {onMore && effMoreL1 === 'albums' && (
                        <AlbumsPanel own={isOwnProfile} address={user.address} />
                    )}

                    {/* Offers sub-tab — the wallet-level offers view isn't built
                        yet; until it is, the tab wears the Albums-style empty
                        prompt instead of a dead blank (Brendon, 2026-07-27). */}
                    {onMore && effMoreL1 === 'offers' && (
                        <section className="starred-list" aria-label="Offers">
                            <p className="album-empty-note">
                                No offers yet — offers {isOwnProfile ? 'you make' : `@${displayHandle} makes`} and receive{isOwnProfile ? '' : 's'} will live here. Make one from any artwork&rsquo;s ✶{'︎'} panel.
                            </p>
                        </section>
                    )}

                    {/* Info sub-tab content: followers / following / anchor + the
                        Discord link. Previously wedged between the main tabs and the
                        sub-pill row; now it lives under the Info sub-tab so the pills
                        sit flush under the main tabs (Collected-tab pattern). */}
                    {/* The Info tab is GONE (Brendon, 2026-07-28: "let's kill
                        info"). It carried only Followers / Following — both
                        already in the profile hero — plus a dead Anchor dash. */}

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

                    {/* Counterparties — the wallets this profile has actually
                        dealt with (ledger-real), crowned by THE NEMESIS: the
                        one declared rival + the honest floor-value delta. */}
                    {onMore && effMoreL1 === 'counterparties' && (
                        <CounterpartiesPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                            isAuthed={isAuthed}
                        />
                    )}

                    {/* Calls — this wallet's Conviction record (the Call
                        Ledger): public, immutable calls settled CROWNED/REKT
                        against the floor. Targets folded in underneath
                        (Brendon, 2026-09-01) — its own pill is gone, the
                        Price Target record (the Seal system) now reads as
                        this tab's second section. */}
                    {onMore && effMoreL1 === 'calls' && (
                        <>
                            <CallsPanel
                                address={user.address}
                                isOwnProfile={isOwnProfile}
                            />
                            <TargetsPanel
                                address={user.address}
                                isOwnProfile={isOwnProfile}
                            />
                        </>
                    )}

                    {/* Loyalty — the long game: tenure, patronage, streak,
                        and the clean-hands purity read. Public like
                        Counterparties; all derived, no writes. */}
                    {onMore && effMoreL1 === 'loyalty' && (
                        <LoyaltyPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                        />
                    )}

                    {/* Sigil — the forged mark read apart + its kin, and the
                        faction record (war sections IYKYK-gated on the viewer
                        flying a flag, per the useFaction law). */}
                    {onMore && effMoreL1 === 'sigil' && (
                        <SigilPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                        />
                    )}

                    {onMore && effMoreL1 === 'anointed' && (
                        <ProfileAnointedPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                        />
                    )}

                    {/* THE VAULT v2 (rebuilt 2026-07-27) — albums, but only
                        for pieces you own: numbered vaults of designated
                        grails + the stats block. Public on every profile. */}
                    {onMore && effMoreL1 === 'vault' && (
                        <VaultPanel
                            address={user.address}
                            handle={displayHandle}
                            isOwnProfile={isOwnProfile}
                            holdings={holdings}
                        />
                    )}

                    {/* @price's +More sub-nav — the four $PRICE doc pages, in place of
                        the per-user systems above (Brendon, 2026-08-13). */}
                    {onMore && effMoreL1 === 'price-overview' && <PriceOverviewPanel />}
                    {onMore && effMoreL1 === 'price-tokenomics' && <PriceTokenomicsPanel />}
                    {onMore && effMoreL1 === 'price-contract' && <PriceContractPanel />}
                    {onMore && effMoreL1 === 'price-utility' && <PriceUtilityPanel />}

                    {/* Collected tab: platform-facet filter over the wallet's real
                        holdings (Artist · Project · PriceDay · Natal · Fate · Status).
                        Distinct from the project page's per-Project trait pills — a
                        collection spans independent projects, so it filters on the
                        platform facets every Output carries. */}
                    {onCollected && !isPlatform && <ProfileFacetBar holdings={enriched} isOwnProfile={isOwnProfile} profileAddress={user.address} />}

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
                            hidePills={['PriceDay']}
                            compact={showcaseView === 'regular'}
                            leadPills={[
                                { key: 'created', label: 'Created', count: enrichedArtistProjects.length, active: showcaseView === 'created', onClick: () => setShowcaseView('created') },
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
            {/* @price — the official $PRICE page, in the Showcase's place. */}
            {onShowcase && isPlatform && !feedActive && (
                <>
                    <PriceColorwayPills />
                    <PriceAccountPanel />
                </>
            )}

            {/* @price — Holders tab carries the $PRICE Top Holders board
                (same list as the modal, see PriceHoldersBoard) in place of
                the owned-NFT grid a platform account will never fill
                (Brendon, 2026-08-13). */}
            {onCollected && isPlatform && !feedActive && (
                <>
                    <PriceColorwayPills />
                    <div className="price-acct">
                        <div className="attr-group-head">
                            <span className="attr-group-name">Top holders</span>
                        </div>
                        <PriceHoldersBoard />
                    </div>
                </>
            )}

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
                {/* Gen Curated's placard — the set's name as a gallery wall
                    label, a full-row grid item so it lines up with the cards'
                    left edge at every width. Display only: a fresh set comes
                    from re-entering the tab, never a tap (Brendon, 2026-07-16). */}
                {effStyle === 'gen-curated' && genCurated && genCurated.picks.length > 0 && (
                    <div className="gencurated-caption">
                        <span className="gc-glyph" aria-hidden="true">{'⑈︎'}</span>
                        <span className="gc-title">{genCurated.caption}</span>
                        <span className="gc-count">{`· ${genCurated.picks.length}`}</span>
                    </div>
                )}
                {/* MOVE MODE bar — the way OUT of the iOS-style move mode the
                    long-press turns on. Full-row grid item so it lines up with
                    the tiles' left edge, full-strength chrome. */}
                {scMoveEligible && scMoveMode && (
                    <div className="sc-movebar">
                        <span className="sc-movebar-label">MOVE MODE — DRAG TO REORDER · × REMOVES</span>
                        <button type="button" className="sc-movebar-done" onClick={exitScMove}>DONE</button>
                    </div>
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
                                      <ArtworkCard
                                          id={s.id}
                                          showProjectName
                                          showcaseMove={scMoveEligible ? {
                                              active: scMoveMode,
                                              onEnter: enterScMove,
                                              onRemove: () => onScRemove(s.slug, s.id),
                                              onMove: onScMove,
                                          } : undefined}
                                      />
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
                                  const l3Collapsed = blk.l3Key ? collapsedGroups.has(blk.l3Key) : false;
                                  // Any folded ancestor hides the cards (and every sub-header).
                                  const cardsHidden = l1Collapsed || l2Collapsed || l3Collapsed;
                                  return (
                                      <Fragment key={blk.key}>
                                          {blk.heads.map((h, hi) => {
                                              const isL2 = h.level === 2;
                                              const isL3 = h.level === 3;
                                              /* A folded ancestor folds away every header nested under
                                                 it — two levels deep now (Brendon, 2026-07-26). */
                                              if (h.level > 1 && l1Collapsed) return null;
                                              if (isL3 && l2Collapsed) return null;
                                              const ckey = isL3 ? blk.l3Key! : isL2 ? blk.l2Key! : blk.l1Key;
                                              const folded = isL3 ? l3Collapsed : isL2 ? l2Collapsed : l1Collapsed;
                                              /* ⛔ A HEADER SPANS THE ROW (Brendon, 2026-07-30 —
                                                 "make it exactly the artifact"). The old cap stopped a
                                                 small group's title mid-row with its glyph stranded. */
                                              return (
                                                  <div
                                                      key={hi}
                                                      className={`gallery-group-header is-collapsible${isL2 ? ' level-2' : ''}${isL3 ? ' level-3' : ''}${h.soon ? ' soon' : ''}${folded ? ' collapsed' : ''}`}
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
                                                      {!h.soon && groupHeaderGlyph(groupLayers, h.level, h.label)
                                                          ? <span className="ggh-glyph" aria-hidden="true">{groupHeaderGlyph(groupLayers, h.level, h.label)}</span>
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
                        <FeedEventRow
                            key={e.id}
                            fe={e}
                            dateStamp={fmtFeedDate(e.timestamp)}
                            typeSub={e.price > 0 ? `${formatEth(e.price)} ETH` : undefined}
                        />
                    ))}
                </div>
            </section>

            {/* Artist-style Showcase · Created — the Now-Minting carousels of this
                artist's own projects, filtered + sorted by the showcase facet bar.
                FEED sort swaps them for the lifecycle activity feed; the ☻ sort
                swaps them for the social feed across the artist's work. */}
            {artistShowcaseCreated && mintSort.key !== 'feed' && mintSort.key !== 'social' && (
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
                                {/* Date over time in the time column, the label
                                    alone beside it — the home feed's columns
                                    verbatim (Brendon, 2026-08-01). */}
                                <div className="f-time">
                                    <span>{fmtFeedDate(ev.ts)}</span>
                                    <span>{fmtFeedTime(ev.ts)}</span>
                                </div>
                                <div className="f-type af-type">
                                    <span>{ev.label}</span>
                                </div>
                                <div className="f-content">
                                    <a className="f-highlight upload-title" href={`/art/${ev.slug}`}>{ev.title}</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Artist-style Showcase · Created · ☻ SOCIAL — the social feed
                scoped to the artist's own projects: streaks, scenes and
                collects across their whole body of work, in the home social
                feed's exact styling (Rule #0). This is the ONLY profile
                surface the ☻ lens lives on (Brendon, 2026-08-03 — the
                wallet-story lens on Collected was undone the same day). */}
            {artistShowcaseCreated && mintSort.key === 'social' && (
                <section className="home-uploads" aria-label="Social Feed">
                    <div className="feed-list home-activity-feed home-social-feed">
                        <SocialFeed
                            dir={mintSort.dir}
                            project={artistProjects.map((p) => p.slug).join(',')}
                        />
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
                        {/* MY LISTS takes over the surface while it's open —
                            the same Starred shelf, read by list instead of flat.
                            The sort-row button is the way in AND out. */}
                        {myListsOpen ? (
                            <ListsPanel onToast={showToast} dir={myListsDir} viewerAddress={user.address} />
                        ) : (starredValid.length > 0 || traitStarsValid.length > 0 || artistStars.length > 0 || soundtrackStars.length > 0 || projectStarsValid.length > 0 || priceDayStars.length > 0 || albumStarsValid.length > 0 || vaultStarsValid.length > 0 || txStars.length > 0) ? (
                            <StarredList
                                items={starredValid}
                                traits={traitStarsValid}
                                artists={starredArtistHandles}
                                collectors={starredCollectorHandles}
                                soundtracks={soundtrackStars}
                                projects={projectStarsValid}
                                priceDays={priceDayStars}
                                albums={albumStarsValid}
                                vaults={vaultStarsValid}
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
                2026-06-24). Own profile only (private). MY LISTS takes over
                the surface here exactly like it does on Starred — same
                shelf, same button, same way in and out (Brendon, 2026-09-03). */}
            {onHistoryTab && isOwnProfile && (
                myListsOpen ? (
                    <ListsPanel onToast={showToast} dir={myListsDir} viewerAddress={user.address} />
                ) : !recording ? (
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
