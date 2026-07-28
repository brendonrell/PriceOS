'use client';

/*
 * userState — the client half of "log in anywhere, exactly as you left it."
 *
 * The server row (public.users) is the SINGLE SOURCE OF TRUTH. localStorage is
 * NOT source-of-truth here; it is a write-through cache that exists only so the
 * prehydration <script> in app/layout.tsx can paint the saved colorway before
 * React mounts (no FOUC) and so the app keeps working offline. On every login
 * the server snapshot OVERWRITES the cache — that is what makes a second device
 * come up "exactly as you left it."
 *
 * Flow:
 *   1. After SIWE, InnerProviders calls fetchMe() → hydrateFromRow(row).
 *      hydrateFromRow writes each persisted field into its existing cache key
 *      and fires the events the live contexts already listen to. Server wins.
 *   2. User changes a setting via the normal context/hook setter. That setter
 *      updates its own cache (instant paint) and calls pushState(partial),
 *      which fire-and-forgets PATCH /api/me. The server row is now updated; the
 *      next device hydrate reflects it.
 *
 * The _hydrated guard ensures pushState is a no-op until the server snapshot
 * has landed, so boot-time default values can never clobber the saved row.
 */

import type { UserRow, UserStatePatch, UserSettings } from '@/lib/supabase';
import { patchUserState } from '@/lib/wallet/accountClient';
import { hydrateNotesToLocal, resetNotesSync } from '@/lib/notes/notesSync';

/** Cache keys — identical to the localStorage keys the contexts already use,
 *  so the prehydration script and existing hydrate paths keep working. */
export const STATE_CACHE_KEYS = {
    colorway: 'pd_settings_colorway',
    profileHex: 'pd_profile_hex',
    /** The user's PROFILE LOGO pick (a Profile Logo id, or absent = off). Read +
     *  written by useProfileLogo; persisted to the top-level `users.profile_logo`
     *  column (public, like profile_hex). */
    profileLogo: 'pd_profile_logo',
    /** The colour the user picked for their PriceSprite (a #RRGGBB hex, or absent
     *  = inherit the colorway text colour). Read + written by useProfileSpriteHex;
     *  persisted to the top-level `users.profile_sprite_hex` column. */
    profileSpriteHex: 'pd_profile_sprite_hex',
    /** PROFILE TAGS — the persona ids the user self-applied. Read + written by
     *  useProfileTags; persisted to the public `users.profile_tags` column and
     *  broadcast on `pd:profile-tags-changed`. */
    profileTags: 'pd_profile_tags',
    /** Chosen @name Unicode font id (or absent = default). Read + written by
     *  useNameFont; persisted to the public `users.name_font` column and
     *  broadcast on `pd:name-font-changed`. */
    nameFont: 'pd_name_font',
    /** All-tags paint id (or absent = each tag's own colour). Read + written by
     *  useTagPaint; persisted to the public `users.tag_paint` column and
     *  broadcast on `pd:tag-paint-changed`. */
    tagPaint: 'pd_tag_paint',
    /** Sticker ownership + active-state (owned ids / off-sheets / off-stickers).
     *  Read + written by lib/stickers/owned.ts; synced to the top-level
     *  `users.sticker_state` column so stickers follow the account across
     *  devices. */
    ownedStickers: 'pd_owned_stickers',
    stickerOffSheets: 'pd_sticker_off_sheets',
    stickerOffIds: 'pd_sticker_off_ids',
    /** Hand-placed sticker positions on your profile (id → {x,y,z,r,sc} in % of
     *  the hero sticker area). Non-empty = the profile is LOCKED to this
     *  composition for the owner AND every visitor. Read + written by
     *  lib/stickers/placements.ts; rides the `users.sticker_state` blob. */
    stickerPlacements: 'pd_sticker_placements',
    /** The sticker area's width÷height when the composition was locked, so the
     *  saved %-positions scale faithfully at any screen width. Rides
     *  `users.sticker_state`. */
    stickerPlaceAspect: 'pd_sticker_place_aspect',
    /** SPREADS — up to 3 named, saved sticker arrangements for the hero. A
     *  Spread is a snapshot of the whole picture (hand-placed spots + the
     *  generative look and its roll), restorable later. Read + written by
     *  lib/stickers/spreads.ts; rides the `users.sticker_state` blob. */
    stickerSpreads: 'pd_sticker_spreads',
    /** The one-tap COLOUR LOCK — which colour the profile is currently narrowed
     *  to, plus the exact active-state it was narrowed FROM, so turning it off
     *  puts every sticker back where it was. Rides `users.sticker_state`. */
    stickerColourLock: 'pd_sticker_colour_lock',
    hazeColor: 'pd_haze_color',
    hazeVariation: 'pd_haze_variation',
    sort: 'pd_settings_sort',
    notifs: 'pd_settings_notifs',
    showcaseStyle: 'pd_user_showcase_mode',
    /** User Showcase picks (`${slug}:${id}` keys). Read + written by
     *  userShowcaseStore; persisted to the top-level `users.showcase` column. */
    showcase: 'pd_user_showcase',
    /** Unified Grid View Presets blob `{ [scope]: PresetEntry[] }`. Read +
     *  written by lib/pins/presetStore. */
    gridPresets: 'pd_grid_presets',
    /** Calendar state (`users.calendar_state` — its own column, per the
     *  settings-envelope doctrine in lib/supabase.ts). Holds the to-dos layer
     *  toggle today; future calendar prefs join it. Read + written by
     *  CalendarContext. */
    calState: 'pd_calendar_state',
    /** Starred Outputs (`${slug}:${id}` keys). Read + written by starStore;
     *  lives inside the settings envelope server-side. */
    starred: 'pd_starred',
    /** Wishlisted Outputs (`${slug}:${id}` keys). Read + written by
     *  wishlistStore; lives inside the settings envelope server-side. */
    wishlist: 'pd_wishlist',
    /** SHADOW PORTFOLIO positions — the paper trades (slug, id, entry, at).
     *  Read + written by shadowStore; PRIVATE, settings envelope. */
    shadow: 'pd_shadow',
    /** Albums (named lists of `${slug}:${id}` keys). Read + written by
     *  albumStore; lives inside the settings envelope server-side. */
    albums: 'pd_albums',
    /** LISTS — the user's NAMED groupings of saved Outputs (Brendon,
     *  2026-07-24). Built on Starred; PRIVATE, settings envelope. */
    lists: 'pd_lists',
    /** Recently-viewed Outputs trail (`${slug}:${id}` keys, most-recent-first).
     *  Read + written by breadcrumbStore; lives in the settings envelope. */
    breadcrumbs: 'pd_breadcrumbs',
    /** To-Dos (TodoItem[]). Read + written by lib/todos/todoStore; lives in the
     *  settings envelope (private, follows the user across devices). */
    todos: 'pd_todos',
    /** Starred (pinned) artists — ordered artist names. Read + written by
     *  ArtistsView; lives in the settings envelope (private). */
    artistStars: 'pd_artist_pinned',
    /** Starred Traits (`${slug}|${category}|${value}` keys). Read + written by
     *  traitStarStore; lives in the settings envelope (private). */
    traitStars: 'pd_trait_stars',
    /** Starred Soundtracks (`${slug}|${playlistId}|${title}` keys). Read +
     *  written by soundtrackStarStore; lives in the settings envelope. */
    soundtrackStars: 'pd_soundtrack_stars',
    /** Starred Projects (Project slugs). Read + written by projectStarStore;
     *  lives in the settings envelope (private). */
    projectStars: 'pd_project_stars',
    /** Starred Tx (on-chain activity events; JSON blobs keyed by event id).
     *  Read + written by txStarStore; lives in the settings envelope (private). */
    txStars: 'pd_tx_stars',
    /** Per-page last-viewed tab map `{ project: {slug:tab}, profile: {handle:tab} }`.
     *  Read + written by tabMemoryStore; lives in the settings envelope. */
    tabMemory: 'pd_tab_memory',
    /** Per-page last-used grid grouping map `{ project: {slug:group}, profile:
     *  {address:group} }`. Read + written by groupMemoryStore; lives in the
     *  settings envelope. */
    groupMemory: 'pd_group_memory',
    /** Chosen Digital Familiar species name. Read + written by familiarEngine;
     *  lives in the settings envelope. */
    familiarSpecies: 'pd_familiar_species',
    /** Familiar Omniscience flag ('1'|'0'). Read + written by familiarEngine;
     *  lives in the settings envelope. Absent = on. */
    familiarOmniscience: 'pd_familiar_omniscience',
    /** Familiar outline preference ('off' | 'random' | hex). Read + written by
     *  familiarEngine; lives in the settings envelope. Absent = random. */
    familiarOutline: 'pd_familiar_outline',
    /** Familiar energy / movement mood. Read + written by familiarEngine; lives
     *  in the settings envelope. Absent = chill. */
    familiarEnergy: 'pd_familiar_energy',
    /** Ambient Light options blob. Read + written by AmbientStrip; lives in the
     *  settings envelope. */
    ambient: 'pd_ambient_opts',
    /** Ambient Light PRESETS (saved named looks — the Spreads pattern). Read +
     *  written by lib/state/ambientPresets; lives in the settings envelope. */
    ambientPresets: 'pd_ambient_presets',
    /** THE VAULT v2 — numbered owned-piece groups (the albums shape). Read +
     *  written by lib/pins/vaultStore; lives in the settings envelope and is
     *  served publicly per profile by /api/vaults/[address]. */
    vaults: 'pd_vaults',
    /** Grail Pins (GrailPin blobs). Read + written by grailStore; lives in the
     *  settings envelope. Account-backed 2026-07-06. */
    grails: 'pd_grail_pins',
    /** Muted token ids (the hammer). Read + written by muteStore; lives in the
     *  settings envelope. Account-backed 2026-07-06. */
    mutes: 'pd_muted_ids',
    /** Spite Book slots (72 entries, nulls preserved). Read + written by
     *  spiteStore; lives in the settings envelope. Account-backed 2026-07-06. */
    spite: 'pd_spite_names',
    /** Sound layer on/off (the ⚟ key). Read + written by soundStore; lives in
     *  the settings envelope. Account-backed 2026-07-21. */
    sound: 'pd_sound_on',
    /** PD miniplayer display face. Read + written by FmBar; lives in the
     *  settings envelope. Account-backed 2026-07-21. */
    fmDisplay: 'pd_fm_display',
    /** PD miniplayer live session (station + entry + seconds). Read + written
     *  by FmBar; settings envelope. Account-backed 2026-07-27. */
    fmSession: 'pd_fm_session',
    /** Command Stone stealth style (accent + stage). Read + written by
     *  stoneStyle; lives in the settings envelope. Account-backed 2026-07-21. */
    stoneStyle: 'pd_stone_style',
    /** Command Stone last bubble line — restores the last speech bubble on
     *  reopen. Settings envelope. Account-backed 2026-07-22. */
    stoneLastLine: 'pd_stone_last_line',
    /** Profile tags switched ON by the owner — tags are OFF by default
     *  platform-wide. Settings envelope. 2026-07-26. */
    shownTags: 'pd_shown_tags',
    /** Which of the twelve WTBS-family chip treatments the owner cycled to.
     *  Settings envelope. 2026-07-26. */
    teamTagStyle: 'pd_team_tag_style',
    /** WORKSPACES — the user's saved Setup Code spaces. Read + written by
     *  WorkspacesContext; persisted to the top-level `users.workspaces` column
     *  so a user's spaces follow the account. Account-backed 2026-07-28. */
    workspaces: 'pd_workspaces',
    /** Which workspace is currently active (numeric id). Rides
     *  `users.workspaces` alongside the list. */
    activeWorkspace: 'pd_active_workspace',
} as const;

/** Fired after a server snapshot is written into the caches. Any context that
 *  hydrates from a cache key on mount should also re-read it on this event so
 *  state restores live (not just on next reload). */
export const USERSTATE_HYDRATED_EVENT = 'pd:userstate-hydrated';

const HEX_RE = /^#[0-9A-F]{6}$/i;

let _hydrated = false;
let _address: string | null = null;
/** In-memory mirror of the server `settings` envelope. Lets pushSettings()
 *  send the COMPLETE object on every change so a partial write never clobbers
 *  sibling keys (the PATCH replaces the whole jsonb column). */
let _settings: UserSettings = {};

export function isUserStateHydrated(): boolean {
    return _hydrated;
}

/**
 * Reconcile a server row into the local caches. Server wins. Fires the
 * field-specific events the live contexts already consume, plus a single
 * USERSTATE_HYDRATED_EVENT for contexts that re-read their cache generically.
 * Never triggers a write-back.
 */
export function hydrateFromRow(row: UserRow): void {
    _address = row.address;
    if (typeof window === 'undefined') {
        _hydrated = true;
        return;
    }

    try {
        // profile_hex → pd_profile_hex (the user's own PROFILE COLORWAY colour).
        // DECOUPLE GUARD: profile_hex is the profile owner's colour. It must
        // NEVER be written into the "Custom" colorway slot (`pd_custom_color`)
        // or "Haze Mode" (`pd_haze_color`), and must NOT fire those features'
        // events. Doing so bled a user's profile colour onto every page — the
        // exact regression this guard exists to stop. Profile colour stays on
        // the profile; it fires only `pd:profile-hex-changed`.
        if (row.profile_hex && HEX_RE.test(row.profile_hex)) {
            const hex = row.profile_hex.toUpperCase();
            localStorage.setItem(STATE_CACHE_KEYS.profileHex, hex);
            window.dispatchEvent(
                new CustomEvent<string>('pd:profile-hex-changed', { detail: hex })
            );
        }

        // profile_logo → pd_profile_logo (the user's own PROFILE LOGO pick). Own
        // slot + event, like profile_hex; absent/null = off (default logo).
        if (typeof row.profile_logo === 'string' && row.profile_logo.length > 0) {
            localStorage.setItem(STATE_CACHE_KEYS.profileLogo, row.profile_logo);
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.profileLogo);
        }
        window.dispatchEvent(
            new CustomEvent<string | null>('pd:profile-logo-changed', {
                detail: (row.profile_logo as string | null) ?? null,
            })
        );

        // profile_sprite_hex → pd_profile_sprite_hex (the user's own PriceSprite
        // colour). Own slot + event, like profile_hex; absent/null = inherit.
        if (typeof row.profile_sprite_hex === 'string' && HEX_RE.test(row.profile_sprite_hex)) {
            localStorage.setItem(STATE_CACHE_KEYS.profileSpriteHex, row.profile_sprite_hex.toUpperCase());
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.profileSpriteHex);
        }
        window.dispatchEvent(
            new CustomEvent<string | null>('pd:profile-sprite-hex-changed', {
                detail: (typeof row.profile_sprite_hex === 'string' && HEX_RE.test(row.profile_sprite_hex))
                    ? row.profile_sprite_hex.toUpperCase()
                    : null,
            })
        );

        // profile_tags → pd_profile_tags (the user's picked personas). Own slot +
        // event, like profile_hex. Array or null; empty array is a valid "none".
        if (Array.isArray(row.profile_tags)) {
            localStorage.setItem(STATE_CACHE_KEYS.profileTags, JSON.stringify(row.profile_tags));
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.profileTags);
        }
        window.dispatchEvent(
            new CustomEvent<string[]>('pd:profile-tags-changed', {
                detail: Array.isArray(row.profile_tags) ? row.profile_tags : [],
            })
        );

        // name_font → pd_name_font (the user's chosen @name font). Own slot +
        // event; absent/null = default (no styling).
        if (typeof row.name_font === 'string' && row.name_font.length > 0) {
            localStorage.setItem(STATE_CACHE_KEYS.nameFont, row.name_font);
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.nameFont);
        }
        window.dispatchEvent(
            new CustomEvent<string | null>('pd:name-font-changed', {
                detail: (row.name_font as string | null) ?? null,
            })
        );

        // tag_paint → pd_tag_paint (the all-tags paint). Own slot + event;
        // absent/null = each tag wears its own colour.
        if (typeof row.tag_paint === 'string' && row.tag_paint.length > 0) {
            localStorage.setItem(STATE_CACHE_KEYS.tagPaint, row.tag_paint);
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.tagPaint);
        }
        window.dispatchEvent(
            new CustomEvent<string | null>('pd:tag-paint-changed', {
                detail: (row.tag_paint as string | null) ?? null,
            })
        );

        // sticker_state → the owned + active-state keys, so a user's stickers
        // follow their account across devices. Only seed when present, so a null
        // account never wipes pre-sync local stickers (the first change pushes
        // them up). Dispatch stickers-changed so the hero + manager re-read.
        const ss = row.sticker_state;
        if (ss && typeof ss === 'object' && !Array.isArray(ss)) {
            const asArr = (v: unknown) =>
                Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
            localStorage.setItem(STATE_CACHE_KEYS.ownedStickers, JSON.stringify(asArr(ss.owned)));
            localStorage.setItem(STATE_CACHE_KEYS.stickerOffSheets, JSON.stringify(asArr(ss.offSheets)));
            localStorage.setItem(STATE_CACHE_KEYS.stickerOffIds, JSON.stringify(asArr(ss.offIds)));
            // Locked composition (hand-placed spots) + its capture aspect — seed
            // only when present so a pre-sync local composition is never wiped.
            const placements = ss.placements;
            if (placements && typeof placements === 'object' && !Array.isArray(placements)) {
                localStorage.setItem(STATE_CACHE_KEYS.stickerPlacements, JSON.stringify(placements));
            }
            if (typeof ss.placementAspect === 'number' && ss.placementAspect > 0) {
                localStorage.setItem(STATE_CACHE_KEYS.stickerPlaceAspect, String(ss.placementAspect));
            }
            // Saved Spreads + the colour lock — same seed-only-when-present rule,
            // so a signed-out device that already has them never gets wiped.
            if (Array.isArray(ss.spreads)) {
                localStorage.setItem(STATE_CACHE_KEYS.stickerSpreads, JSON.stringify(ss.spreads));
            }
            if (ss.colourLock && typeof ss.colourLock === 'object') {
                localStorage.setItem(STATE_CACHE_KEYS.stickerColourLock, JSON.stringify(ss.colourLock));
            }
            window.dispatchEvent(new CustomEvent('pd:stickers-changed'));
        }

        // showcase_style cache for the settings toggle. 'grid' (legacy default)
        // is kept verbatim as the "unset" marker so the toggle can resolve the
        // artist-default; 'static'/'generative'/'artist' pass through; anything
        // else falls back to 'static'.
        const rawStyle = row.showcase_style;
        const style =
            rawStyle === 'generative' || rawStyle === 'gen-curated' || rawStyle === 'artist' || rawStyle === 'static' || rawStyle === 'grid'
                ? rawStyle
                : 'static';
        localStorage.setItem(STATE_CACHE_KEYS.showcaseStyle, style);

        // showcase picks → the cache userShowcaseStore re-reads on the hydrate
        // event below (server `users.showcase` wins). Non-null slots → keys.
        const showcaseKeys = (row.showcase?.slots ?? [])
            .filter((sl): sl is NonNullable<typeof sl> => !!sl && !!sl.project_id && sl.token_id != null)
            .map((sl) => `${sl.project_id}:${sl.token_id}`);
        localStorage.setItem(STATE_CACHE_KEYS.showcase, JSON.stringify(showcaseKeys));

        // settings envelope.
        const s = row.settings ?? {};
        _settings = { ...s };
        if (s.colorway) localStorage.setItem(STATE_CACHE_KEYS.colorway, s.colorway);
        else localStorage.removeItem(STATE_CACHE_KEYS.colorway);

        if (s.haze?.color) localStorage.setItem(STATE_CACHE_KEYS.hazeColor, s.haze.color);
        if (s.haze?.variation) localStorage.setItem(STATE_CACHE_KEYS.hazeVariation, s.haze.variation);
        else localStorage.removeItem(STATE_CACHE_KEYS.hazeVariation);

        if (typeof s.sort === 'string') localStorage.setItem(STATE_CACHE_KEYS.sort, s.sort);
        if (s.notifs) localStorage.setItem(STATE_CACHE_KEYS.notifs, JSON.stringify(s.notifs));

        // starred / wishlist → the cache keys their stores read (private). Server
        // wins; each store re-reads on the USERSTATE_HYDRATED_EVENT below.
        localStorage.setItem(
            STATE_CACHE_KEYS.starred,
            JSON.stringify(Array.isArray(s.starred) ? s.starred : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.wishlist,
            JSON.stringify(Array.isArray(s.wishlist) ? s.wishlist : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.shadow,
            JSON.stringify(Array.isArray(s.shadow) ? s.shadow : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.albums,
            JSON.stringify(Array.isArray(s.albums) ? s.albums : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.breadcrumbs,
            JSON.stringify(Array.isArray(s.breadcrumbs) ? s.breadcrumbs : []),
        );
        // To-Dos → the cache todoStore reads; re-read on the hydrate event below
        // so the account's list wins over device-local (server wins).
        localStorage.setItem(
            STATE_CACHE_KEYS.todos,
            JSON.stringify(Array.isArray(s.todos) ? s.todos : []),
        );
        // History recording-paused flag — mirror to the key breadcrumbStore reads
        // so the choice follows the viewer across devices. History is opt-in
        // (default OFF), so only an EXPLICIT enable (breadcrumbsPaused === false)
        // writes the on value; undefined/true stay paused.
        localStorage.setItem('pd_breadcrumbs_paused', s.breadcrumbsPaused === false ? '0' : '1');
        localStorage.setItem(
            STATE_CACHE_KEYS.artistStars,
            JSON.stringify(Array.isArray(s.artistStars) ? s.artistStars : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.traitStars,
            JSON.stringify(Array.isArray(s.traitStars) ? s.traitStars : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.soundtrackStars,
            JSON.stringify(Array.isArray(s.soundtrackStars) ? s.soundtrackStars : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.projectStars,
            JSON.stringify(Array.isArray(s.projectStars) ? s.projectStars : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.txStars,
            JSON.stringify(Array.isArray(s.txStars) ? s.txStars : []),
        );
        // Per-page tab memory — server wins; tabMemoryStore reads this cache
        // synchronously in the project/profile page tab initializers.
        localStorage.setItem(
            STATE_CACHE_KEYS.tabMemory,
            JSON.stringify(
                s.tabMemory && typeof s.tabMemory === 'object' && !Array.isArray(s.tabMemory)
                    ? s.tabMemory
                    : {},
            ),
        );
        // Per-page grouping memory — same contract as tabMemory (server wins;
        // groupMemoryStore reads this cache synchronously on surface entry).
        localStorage.setItem(
            STATE_CACHE_KEYS.groupMemory,
            JSON.stringify(
                s.groupMemory && typeof s.groupMemory === 'object' && !Array.isArray(s.groupMemory)
                    ? s.groupMemory
                    : {},
            ),
        );
        // Chosen Familiar species — server wins; familiarEngine reads this cache
        // when it picks the species on the next page load.
        if (typeof s.familiarSpecies === 'string' && s.familiarSpecies) {
            localStorage.setItem(STATE_CACHE_KEYS.familiarSpecies, s.familiarSpecies);
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.familiarSpecies);
        }
        // Familiar Omniscience — server wins; familiarEngine reads this cache.
        // Absent on the row = on (the default), so we only cache an explicit off.
        if (s.familiarOmniscience === false) {
            localStorage.setItem(STATE_CACHE_KEYS.familiarOmniscience, '0');
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.familiarOmniscience);
        }
        // Familiar outline preference — server wins. Absent = random (default).
        if (typeof s.familiarOutline === 'string' && s.familiarOutline) {
            localStorage.setItem(STATE_CACHE_KEYS.familiarOutline, s.familiarOutline);
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.familiarOutline);
        }
        // Familiar energy / movement mood — server wins. Absent = chill.
        if (typeof s.familiarEnergy === 'string' && s.familiarEnergy) {
            localStorage.setItem(STATE_CACHE_KEYS.familiarEnergy, s.familiarEnergy);
        } else {
            localStorage.removeItem(STATE_CACHE_KEYS.familiarEnergy);
        }
        // Ambient Light options — server wins; AmbientStrip re-reads on the
        // hydrate event below so the bar restores across devices.
        if (s.ambient && typeof s.ambient === 'object' && !Array.isArray(s.ambient)) {
            localStorage.setItem(STATE_CACHE_KEYS.ambient, JSON.stringify(s.ambient));
        }
        // Ambient Light presets — seed ONLY when the account carries the key
        // (same bargain as grails/mutes below), so a pre-sync device set is
        // never wiped by an account that hasn't synced yet.
        if (Array.isArray(s.ambientPresets)) {
            localStorage.setItem(STATE_CACHE_KEYS.ambientPresets, JSON.stringify(s.ambientPresets));
        }
        // Vaults — same seed-only-when-carried bargain (vaultStore re-reads on
        // the hydrate event, exactly like albums).
        if (Array.isArray(s.vaults)) {
            localStorage.setItem(STATE_CACHE_KEYS.vaults, JSON.stringify(s.vaults));
        }
        // Grail Pins / mutes / Spite Book — newly account-backed (2026-07-06).
        // Seed ONLY when the account carries the key (like sticker_state), so a
        // pre-sync device set is never wiped by an account that hasn't synced
        // yet — the first change on this device pushes it up instead.
        if (Array.isArray(s.grails)) {
            localStorage.setItem(STATE_CACHE_KEYS.grails, JSON.stringify(s.grails));
        }
        if (Array.isArray(s.mutes)) {
            localStorage.setItem(STATE_CACHE_KEYS.mutes, JSON.stringify(s.mutes));
        }
        if (Array.isArray(s.spite)) {
            localStorage.setItem(STATE_CACHE_KEYS.spite, JSON.stringify(s.spite));
        }
        // Notes — link-aware records (output / artist / day / free) → the three
        // local note caches. Seeds only when the account carries the key (same
        // precedent as grails/mutes) and fires the notes change events itself.
        hydrateNotesToLocal(s.notes);

        // Sound / miniplayer face / Command Stone style — newly account-backed
        // (Brendon, 2026-07-21). Seed ONLY when the account carries the key
        // (grails/mutes precedent), so a pre-sync device choice is never wiped;
        // the first change on this device pushes it up. Fire each subsystem's
        // own change event so a live surface updates without a reload.
        if (typeof s.sound === 'boolean') {
            if (s.sound) localStorage.setItem(STATE_CACHE_KEYS.sound, '1');
            else localStorage.removeItem(STATE_CACHE_KEYS.sound);
            window.dispatchEvent(new CustomEvent('pd:sound-changed', { detail: { on: s.sound } }));
        }
        if (typeof s.fmDisplay === 'string' && s.fmDisplay) {
            localStorage.setItem(STATE_CACHE_KEYS.fmDisplay, s.fmDisplay);
            window.dispatchEvent(new CustomEvent('pd:fm-display-changed', { detail: s.fmDisplay }));
        }
        // miniplayer live session — the account's paused spot wins over the
        // device cache; an explicit null (closed elsewhere) clears it so the
        // device can't resurrect a session its owner shut (the 2026-07-20
        // stale-state lesson). FmBar re-reads on the event.
        if (s.fmSession && typeof s.fmSession === 'object' && !Array.isArray(s.fmSession)
            && typeof s.fmSession.playlistId === 'string' && s.fmSession.playlistId) {
            localStorage.setItem(STATE_CACHE_KEYS.fmSession, JSON.stringify(s.fmSession));
            window.dispatchEvent(new CustomEvent('pd:fm-session-changed'));
        } else if (s.fmSession === null) {
            localStorage.removeItem(STATE_CACHE_KEYS.fmSession);
        }
        if (s.stoneStyle && typeof s.stoneStyle === 'object' && !Array.isArray(s.stoneStyle)) {
            const st = s.stoneStyle;
            if (st.accent || st.stage) localStorage.setItem(STATE_CACHE_KEYS.stoneStyle, JSON.stringify(st));
            else localStorage.removeItem(STATE_CACHE_KEYS.stoneStyle);
            window.dispatchEvent(new CustomEvent('pd:stone-style-changed'));
        }
        if (typeof s.stoneLastLine === 'string' && s.stoneLastLine.trim()) {
            localStorage.setItem(STATE_CACHE_KEYS.stoneLastLine, s.stoneLastLine);
            window.dispatchEvent(new CustomEvent('pd:stone-last-line-changed', { detail: s.stoneLastLine }));
        } else if (s.stoneLastLine === null || s.stoneLastLine === '') {
            localStorage.removeItem(STATE_CACHE_KEYS.stoneLastLine);
        }
        if (Array.isArray(s.shownTags)) {
            localStorage.setItem(STATE_CACHE_KEYS.shownTags, JSON.stringify(s.shownTags));
            window.dispatchEvent(new CustomEvent('pd:shown-tags-changed', { detail: s.shownTags }));
        }
        if (typeof s.teamTagStyle === 'number' && Number.isFinite(s.teamTagStyle)) {
            localStorage.setItem(STATE_CACHE_KEYS.teamTagStyle, JSON.stringify(s.teamTagStyle));
            window.dispatchEvent(new CustomEvent('pd:team-tag-style-changed', { detail: s.teamTagStyle }));
        }

        // grid_presets → unified cache the presetStore reads (Gallery View
        // Presets). Server wins; presetStore re-reads this key on the
        // USERSTATE_HYDRATED_EVENT fired just below.
        localStorage.setItem(
            STATE_CACHE_KEYS.gridPresets,
            JSON.stringify(row.grid_presets ?? {})
        );

        // calendar_state → the cache CalendarContext reads (to-dos layer + any
        // future calendar prefs). Seed only when the account carries state, so
        // a pre-sync device choice is never wiped — the first toggle on this
        // device pushes it up instead (grails/mutes precedent).
        const cal = row.calendar_state;
        if (cal && typeof cal === 'object' && !Array.isArray(cal) && Object.keys(cal).length > 0) {
            localStorage.setItem(STATE_CACHE_KEYS.calState, JSON.stringify(cal));
        }

        // workspaces → the two keys WorkspacesContext reads (the saved list +
        // which one is active). Seed ONLY when the account actually carries a
        // list, so a pre-sync device's spaces are never wiped by an account
        // that hasn't synced yet — the first change here pushes them up
        // instead (grails/mutes precedent). WorkspacesContext re-reads both on
        // the hydrate event fired just below.
        const ws = row.workspaces as { list?: unknown; activeId?: unknown } | null;
        if (ws && typeof ws === 'object' && !Array.isArray(ws) && Array.isArray(ws.list)) {
            localStorage.setItem(STATE_CACHE_KEYS.workspaces, JSON.stringify(ws.list));
            if (typeof ws.activeId === 'number' && Number.isFinite(ws.activeId)) {
                localStorage.setItem(STATE_CACHE_KEYS.activeWorkspace, String(ws.activeId));
            } else {
                localStorage.removeItem(STATE_CACHE_KEYS.activeWorkspace);
            }
        }

        window.dispatchEvent(new CustomEvent(USERSTATE_HYDRATED_EVENT));
    } catch {
        /* private mode / quota — in-memory contexts still function */
    }

    _hydrated = true;
}

/** Called on sign-out. Drops the hydration guard so a different identity that
 *  signs in next gets a clean overwrite. Caches are intentionally left in place
 *  as the last-seen offline mirror; the next hydrateFromRow overwrites them. */
export function resetUserState(): void {
    /* Drop any pending debounced write so it can't fire against the next
       identity that signs in. */
    cancelSettingsFlush();
    resetNotesSync();
    _hydrated = false;
    _address = null;
    _settings = {};
}

/**
 * Fire-and-forget write-through to PATCH /api/me. No-op until a server snapshot
 * has been hydrated for an authenticated address, so boot defaults can never
 * overwrite the saved row. The local cache is updated by the caller (the
 * context setter) regardless, so the UI is instant; the server catches up.
 */
export function pushState(patch: UserStatePatch, opts?: { keepalive?: boolean }): void {
    if (!_hydrated || !_address) return;
    void patchUserState(patch, opts).catch(() => {
        /* network blip — cache already holds the value; next change re-syncs */
    });
}

/* ── Changed-keys tracking (2026-07-13, Architect Report §3.4) ───────────────
   The server now MERGES the provided settings keys into the stored envelope
   (app_merge_user_state), so the client sends ONLY the keys that actually
   changed since the last successful flush. A device that changed the colorway
   no longer ships its (possibly stale) copy of todos/notes/albums with it —
   that was the cross-device clobber. On a failed flush the keys go back in
   the dirty set, so the next change retries them. */
const _dirtySettingsKeys = new Set<keyof UserSettings>();

function sendDirtySettings(keepalive = false): void {
    if (!_hydrated || !_address || _dirtySettingsKeys.size === 0) return;
    const keys = [..._dirtySettingsKeys];
    _dirtySettingsKeys.clear();
    const envelope: Partial<UserSettings> = {};
    for (const k of keys) {
        (envelope as Record<string, unknown>)[k] = _settings[k];
    }
    void patchUserState({ settings: envelope as UserSettings }, keepalive ? { keepalive: true } : undefined)
        .catch(() => {
            /* network blip — re-arm the keys so the next flush retries them */
            for (const k of keys) _dirtySettingsKeys.add(k);
        });
}

/**
 * Merge a partial settings change into the in-memory mirror and write the
 * CHANGED KEYS through to the server (the server merges them into the stored
 * envelope — sibling keys are preserved server-side). Use this for everything
 * that lives inside the `settings` jsonb column (colorway, sort, haze, notifs).
 * Top-level columns (profile_hex, showcase, showcase_style) use pushState()
 * directly.
 */
export function pushSettings(partial: Partial<UserSettings>): void {
    _settings = { ..._settings, ...partial };
    for (const k of Object.keys(partial) as (keyof UserSettings)[]) _dirtySettingsKeys.add(k);
    /* An immediate write flushes everything dirty (incl. anything a debounced
       write was about to send) — so cancel any pending flush. */
    cancelSettingsFlush();
    sendDirtySettings();
}

/* ── Debounced settings write (Brendon, 2026-06-24) ──────────────────────────
   For state that changes RAPIDLY as the user browses — breadcrumbs today,
   History next. The in-memory mirror updates instantly (so reads + any other
   write see the latest sequence), but the network PATCH is COALESCED: it fires
   ~1.5s after the last change, and at least every ~8s during continuous
   activity. A final write is flushed on pagehide/tab-hide (keepalive) so the
   settled sequence is never lost. */
const SETTINGS_DEBOUNCE_MS = 1500;
const SETTINGS_MAX_WAIT_MS = 8000;
let _settingsTimer: ReturnType<typeof setTimeout> | null = null;
let _settingsDeadline = 0;

function cancelSettingsFlush(): void {
    if (_settingsTimer != null) {
        clearTimeout(_settingsTimer);
        _settingsTimer = null;
    }
    _settingsDeadline = 0;
}

function flushSettings(keepalive = false): void {
    cancelSettingsFlush();
    sendDirtySettings(keepalive);
}

export function pushSettingsDebounced(partial: Partial<UserSettings>): void {
    _settings = { ..._settings, ...partial };
    for (const k of Object.keys(partial) as (keyof UserSettings)[]) _dirtySettingsKeys.add(k);
    if (!_hydrated || !_address || typeof window === 'undefined') return;
    const now = Date.now();
    if (_settingsDeadline === 0) _settingsDeadline = now + SETTINGS_MAX_WAIT_MS;
    if (_settingsTimer != null) clearTimeout(_settingsTimer);
    const wait = Math.max(0, Math.min(SETTINGS_DEBOUNCE_MS, _settingsDeadline - now));
    _settingsTimer = setTimeout(() => flushSettings(false), wait);
}

if (typeof window !== 'undefined') {
    const flushOnHide = () => { if (_settingsTimer != null || _dirtySettingsKeys.size) flushSettings(true); };
    window.addEventListener('pagehide', flushOnHide);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushOnHide();
    });
}

/**
 * Stamp PWA conversion for the signed-in user. Call when a session is running
 * as the installed app (standalone). `converted_at` is set ONCE (the conversion
 * event) and preserved on every later launch; `last_used_at` refreshes each
 * time so drop-off is visible. No-op until the account snapshot has hydrated
 * (so it only ever records a real, signed-in install). First-party only —
 * lives in the user's own settings record, queryable via settings->'pwa'.
 */
export function markPwaUsed(): void {
    if (!_hydrated || !_address) return;
    const now = new Date().toISOString();
    const prev = _settings.pwa ?? {};
    pushSettings({ pwa: { ...prev, converted_at: prev.converted_at ?? now, last_used_at: now } });
}

/**
 * Merge a patch into the user's pwa record (Step 3 prompt funnel). Preserves
 * converted_at / last_used_at. Best-effort: no-ops until the account snapshot
 * has hydrated — the real conversion signal is markPwaUsed() on standalone
 * launch, so a missed funnel write never loses the metric that matters.
 */
export function recordPwa(patch: Partial<NonNullable<UserSettings['pwa']>>): void {
    if (!_hydrated || !_address) return;
    const prev = _settings.pwa ?? {};
    pushSettings({ pwa: { ...prev, ...patch } });
}
