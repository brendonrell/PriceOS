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

        // showcase_style: 'grid' (legacy default) reads as 'static'.
        const style = row.showcase_style === 'generative' ? 'generative' : 'static';
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
        localStorage.setItem(
            STATE_CACHE_KEYS.artistStars,
            JSON.stringify(Array.isArray(s.artistStars) ? s.artistStars : []),
        );

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
export function pushState(patch: UserStatePatch): void {
    if (!_hydrated || !_address) return;
    void patchUserState(patch).catch(() => {
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
    pushState({ settings: _settings });
}
