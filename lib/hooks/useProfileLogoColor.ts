'use client';

/*
 * useProfileLogoColor
 *
 * The current user's chosen Profile Logo "bubble" colour — the fill of their
 * speech-bubble / $PRICE wordmark logo. Returns null when they have no custom
 * logo (so callers fall back to the default text colour).
 *
 * Tints the PriceRank glyph to match the user's logo, in the two places that
 * glyph is shown: the connect-menu badge and the PriceSprite modal medallion
 * (Brendon 2026-07-07 — "same colour as the speech bubble section").
 *
 * Source of truth is useProfileLogo() (localStorage-mirrored `users.profile_logo`,
 * live via the pd:profile-logo-changed event), so this stays in sync the moment
 * the user changes their logo, on every page.
 */

import { useProfileLogo } from './useProfileLogo';
import { PROFILE_LOGOS_BY_ID } from '@/lib/profile/profileLogos';

export function useProfileLogoColor(): string | null {
    const { logo } = useProfileLogo();
    if (!logo) return null;
    const s = PROFILE_LOGOS_BY_ID.get(logo);
    if (!s) return null;
    // 'logo' kind = the bubble fill (`color`); 'price' wordmark = its background.
    const c = s.kind === 'price' ? s.bg : s.color;
    return c && c !== 'currentColor' ? c : null;
}
