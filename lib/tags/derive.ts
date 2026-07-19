/*
 * lib/tags/derive.ts — resolve a profile's FULL active tag set for display.
 *
 * Pure (server + client). Combines the four sources into one ordered list:
 *   • personas  — the ids the user picked (users.profile_tags), validated.
 *   • earned    — derived from real data. Artist (whitelist) + Veteran (tenure)
 *                 are wired now. Whale / Diamond Hands / Minter are DELIBERATELY
 *                 not derived yet: they need the right on-chain signal + Brendon's
 *                 thresholds, and faking them from a guess would paint wrong
 *                 badges on real profiles. They light up the moment that data +
 *                 those cuts are set — the catalog entries already exist.
 *   • granted   — the ids an admin handed out (users.granted_tags), validated.
 *   • id        — one tag from the user's platform number (#1–22, then ranges).
 */

import {
    type Tag, tagById, isPersonaId, GRANTED_IDS,
    ID_TAG_STYLE, ID_RANGES,
} from './catalog';

/** Provisional Veteran cut (Brendon to confirm the real tenure). */
export const VETERAN_DAYS = 180;

export interface DeriveInput {
    /** Personas the user picked (users.profile_tags). */
    profileTags?: string[] | null;
    /** Admin-granted tag ids (users.granted_tags). */
    grantedTags?: string[] | null;
    /** The user's sequential platform number (users.user_number). */
    userNumber?: number | null;
    /** Whitelisted artist (drives the Artist earned tag). */
    isArtist?: boolean;
    /** Account creation timestamp (drives the Veteran tenure tag). */
    createdAt?: string | null;
}

/** The single id tag a platform number earns, or null (no number / past 1000). */
export function idTagFor(userNumber: number | null | undefined): Tag | null {
    if (!userNumber || userNumber < 1) return null;
    if (userNumber <= 22) {
        return {
            id: `id-${userNumber}`,
            label: `#${userNumber}`,
            glyph: ID_TAG_STYLE.glyph,
            color: ID_TAG_STYLE.color,
            kind: 'id',
            order: 10,
        };
    }
    for (const range of ID_RANGES) {
        if (userNumber <= range.max) {
            return {
                id: range.id,
                label: range.label,
                glyph: ID_TAG_STYLE.glyph,
                color: ID_TAG_STYLE.color,
                kind: 'id',
                order: 11,
            };
        }
    }
    return null;
}

function daysSince(iso: string): number {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 0;
    return (Date.now() - then) / 86_400_000;
}

/** Resolve the ordered, de-duplicated tag list a profile should display. */
export function deriveTags(input: DeriveInput): Tag[] {
    const out: Tag[] = [];
    const seen = new Set<string>();
    const add = (t: Tag | undefined | null) => {
        if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
    };

    // Personas the user chose (validated against the catalog).
    for (const id of input.profileTags ?? []) {
        if (isPersonaId(id)) add(tagById(id));
    }

    // Earned — only what we can derive honestly today.
    if (input.isArtist) add(tagById('artist'));
    if (input.createdAt && daysSince(input.createdAt) >= VETERAN_DAYS) add(tagById('veteran'));

    // Granted — admin-assigned ids (validated).
    for (const id of input.grantedTags ?? []) {
        if (GRANTED_IDS.has(id)) add(tagById(id));
    }

    // Platform-number tag.
    add(idTagFor(input.userNumber));

    return out.sort((a, b) => a.order - b.order);
}
