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
    /** Starred Outputs (`${slug}:${id}` keys). Read + written by starStore;
     *  lives inside the settings envelope server-side. */
    starred: 'pd_starred',
    /** Wishlisted Outputs (`${slug}:${id}` keys). Read + written by
     *  wishlistStore; lives inside the settings envelope server-side. */
    wishlist: 'pd_wishlist',
    /** Albums (named lists of `${slug}:${id}` keys). Read + written by
     *  albumStore; lives inside the settings envelope server-side. */
    albums: 'pd_albums',
    /** Recently-viewed Outputs trail (`${slug}:${id}` keys, most-recent-first).
     *  Read + written by breadcrumbStore; lives in the settings envelope. */
    breadcrumbs: 'pd_breadcrumbs',
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
            STATE_CACHE_KEYS.albums,
            JSON.stringify(Array.isArray(s.albums) ? s.albums : []),
        );
        localStorage.setItem(
            STATE_CACHE_KEYS.breadcrumbs,
            JSON.stringify(Array.isArray(s.breadcrumbs) ? s.breadcrumbs : []),
        );
        // History recording-paused flag — mirror to the key breadcrumbStore reads
        // so the choice follows the viewer across devices.
        localStorage.setItem('pd_breadcrumbs_paused', s.breadcrumbsPaused ? '1' : '0');
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

        // grid_presets → unified cache the presetStore reads (Gallery View
        // Presets). Server wins; presetStore re-reads this key on the
        // USERSTATE_HYDRATED_EVENT fired just below.
        localStorage.setItem(
            STATE_CACHE_KEYS.gridPresets,
            JSON.stringify(row.grid_presets ?? {})
        );

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

/**
 * Merge a partial settings change into the in-memory mirror and write the
 * COMPLETE settings envelope through to the server. Use this for everything
 * that lives inside the `settings` jsonb column (colorway, sort, haze, notifs)
 * so sibling keys are preserved. Top-level columns (profile_hex, showcase,
 * showcase_style) use pushState() directly.
 */
export function pushSettings(partial: Partial<UserSettings>): void {
    _settings = { ..._settings, ...partial };
    /* An immediate write already sends the whole envelope (incl. anything a
       debounced write was about to flush) — so cancel any pending flush. */
    cancelSettingsFlush();
    pushState({ settings: _settings });
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
    pushState({ settings: _settings }, keepalive ? { keepalive: true } : undefined);
}

export function pushSettingsDebounced(partial: Partial<UserSettings>): void {
    _settings = { ..._settings, ...partial };
    if (!_hydrated || !_address || typeof window === 'undefined') return;
    const now = Date.now();
    if (_settingsDeadline === 0) _settingsDeadline = now + SETTINGS_MAX_WAIT_MS;
    if (_settingsTimer != null) clearTimeout(_settingsTimer);
    const wait = Math.max(0, Math.min(SETTINGS_DEBOUNCE_MS, _settingsDeadline - now));
    _settingsTimer = setTimeout(() => flushSettings(false), wait);
}

if (typeof window !== 'undefined') {
    const flushOnHide = () => { if (_settingsTimer != null) flushSettings(true); };
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
