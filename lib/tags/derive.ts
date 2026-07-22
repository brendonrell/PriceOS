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
    ID_TAG_STYLE, ID_RANGES, CEO_TAG, PRICEDAY_TAG_COLOR,
} from './catalog';
import { priceDayNumber } from '../priceday/priceday';

/** Provisional Veteran cut (Brendon to confirm the real tenure). */
export const VETERAN_DAYS = 180;

/** Brendon's wallets — the ONLY holder of the CEO tag. His @brendon profile
 *  plus the pricediscussion.eth treasury (both are him). */
const CEO_ADDRESSES: ReadonlySet<string> = new Set([
    '0x65c34afda745c12745db70ffa809311339279395', // @brendon
    '0x146034ec25c277f30f63933b151297689e15b9b8', // pricediscussion.eth
]);

export interface DeriveInput {
    /** Personas the user picked (users.profile_tags). */
    profileTags?: string[] | null;
    /** Admin-granted tag ids (users.granted_tags). */
    grantedTags?: string[] | null;
    /** The user's sequential platform number (users.user_number). */
    userNumber?: number | null;
    /** Whitelisted artist (drives the Artist earned tag). */
    isArtist?: boolean;
    /** Account creation timestamp (drives Veteran + the PriceDay-join tag). */
    createdAt?: string | null;
    /** The profile owner's wallet — gates the one-of-one CEO tag. */
    address?: string | null;
    /** Tag ids the owner switched OFF — filtered from the shown set (every tag,
     *  CEO included, can be hidden and tapped back on). Brendon, 2026-07-22. */
    hiddenTags?: string[] | null;
}

/** The PriceDay-of-join tag — everyone gets one; the PriceDay number of the day
 *  they joined (Brendon, 2026-07-22). Purple, sits in the Earned section. */
function priceDayJoinTag(createdAt: string | null | undefined): Tag | null {
    if (!createdAt) return null;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return {
        id: 'priceday-join',
        label: `PriceDay #${priceDayNumber(d)}`,
        color: PRICEDAY_TAG_COLOR,
        kind: 'earned',
        order: 21,
    };
}

/** The single id tag a platform number earns, or null (no number / past 1000). */
export function idTagFor(userNumber: number | null | undefined): Tag | null {
    if (!userNumber || userNumber < 1) return null;
    // Order 20 → the id tag opens the EARNED section (Brendon, 2026-07-22).
    if (userNumber <= 22) {
        return {
            id: `id-${userNumber}`,
            label: `User #${userNumber}`,
            color: ID_TAG_STYLE.color,
            kind: 'id',
            order: 20,
        };
    }
    for (const range of ID_RANGES) {
        if (userNumber <= range.max) {
            return {
                id: range.id,
                label: range.label,
                color: ID_TAG_STYLE.color,
                kind: 'id',
                order: 20,
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

    // CEO — Brendon's wallet only, one of one (never from granted_tags).
    if (input.address && CEO_ADDRESSES.has(input.address.toLowerCase())) add(CEO_TAG);

    // Personas the user chose (validated against the catalog).
    for (const id of input.profileTags ?? []) {
        if (isPersonaId(id)) add(tagById(id));
    }

    // Earned — only what we can derive honestly today.
    add(idTagFor(input.userNumber));           // User #N (opens Earned)
    add(priceDayJoinTag(input.createdAt));     // PriceDay #N (join day)
    if (input.isArtist) add(tagById('artist'));
    if (input.createdAt && daysSince(input.createdAt) >= VETERAN_DAYS) add(tagById('veteran'));

    // Granted — admin-assigned ids (validated).
    for (const id of input.grantedTags ?? []) {
        if (GRANTED_IDS.has(id)) add(tagById(id));
    }

    const ordered = out.sort((a, b) => a.order - b.order);
    // Hidden ones (the user switched them off) drop from the SHOWN set. Pass no
    // hiddenTags (the picker) to get every tag back for the on/off toggles.
    const hidden = new Set(input.hiddenTags ?? []);
    return hidden.size ? ordered.filter((t) => !hidden.has(t.id)) : ordered;
}
