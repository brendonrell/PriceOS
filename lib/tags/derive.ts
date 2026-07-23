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
    PRICE_HOLD_TAG_BG, PRICE_HOLD_TAG_TEXT,
    PRICE_HOLD_TOP3_BG, PRICE_HOLD_TOP3_TEXT,
    PRICE_HOLD_TOP10_BG, PRICE_HOLD_TOP10_TEXT,
    PRICE_HELD_1M_BG, PRICE_HELD_1M_TEXT, PRICE_HELD_100K_BG, PRICE_HELD_100K_TEXT,
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
    /** The owner's $PRICE holder rank (users.price_hold_rank) — drives the
     *  "$PRICE Top N · #r" earned tag; null/absent = unranked (no tag). */
    priceHoldRank?: number | null;
    /** The owner's $PRICE balance in whole tokens (users.price_held) — drives
     *  the 100K+ / 1M+ holding tags. */
    priceHeld?: number | string | null;
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

/** $PRICE holder-rank tiers — the label shows the TIGHTEST Top-N the rank falls
 *  in, and the number is the live rank (Brendon, 2026-07-23). */
const PRICE_HOLD_TIERS = [3, 10, 25, 50, 75, 100] as const;

/** The $PRICE holder-rank tag, or null past #100 / unranked (it vanishes on its
 *  own). Attention-yellow fill + Hothurt lettering, fixed treatment (lockStyle),
 *  sitting in the Earned section. */
export function priceHoldTag(rank: number | null | undefined): Tag | null {
    if (!rank || rank < 1) return null;
    const tier = PRICE_HOLD_TIERS.find((t) => rank <= t);
    if (!tier) return null;
    // Per-tier treatment: Top 3 = white / Hothurt; Top 10 = Attention / Dot
    // black; the rest = black / Attention yellow (Brendon, 2026-07-23).
    const color = tier === 3 ? PRICE_HOLD_TOP3_BG : tier === 10 ? PRICE_HOLD_TOP10_BG : PRICE_HOLD_TAG_BG;
    const textColor = tier === 3 ? PRICE_HOLD_TOP3_TEXT : tier === 10 ? PRICE_HOLD_TOP10_TEXT : PRICE_HOLD_TAG_TEXT;
    return {
        id: 'price-hold',
        label: `$PRICE Top ${tier} · #${rank}`,
        svgGlyph: 'price',
        color,
        textColor,
        kind: 'earned',
        order: 22,
        lockStyle: true,
    };
}

/** $PRICE holding-amount tiers — the highest threshold met shows (Brendon,
 *  2026-07-23). Starting colours; Brendon tunes. */
const PRICE_HELD_TIERS: ReadonlyArray<{ min: number; label: string; bg: string; text: string }> = [
    { min: 1_000_000, label: '1M $PRICE',   bg: PRICE_HELD_1M_BG,   text: PRICE_HELD_1M_TEXT },
    { min: 100_000,   label: '100k $PRICE', bg: PRICE_HELD_100K_BG, text: PRICE_HELD_100K_TEXT },
];

/** The $PRICE holding-amount tag (100K+ / 1M+) — the highest threshold held, or
 *  null below 100K. Wears the $PRICE logo glyph, fixed treatment, Earned. */
export function priceHeldTag(held: number | string | null | undefined): Tag | null {
    const n = Number(held);
    if (!Number.isFinite(n) || n <= 0) return null;
    for (const t of PRICE_HELD_TIERS) {
        if (n >= t.min) {
            return {
                id: 'price-held',
                label: t.label,
                svgGlyph: 'price',
                color: t.bg,
                textColor: t.text,
                kind: 'earned',
                order: 23,
                lockStyle: true,
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
    add(priceHoldTag(input.priceHoldRank));    // $PRICE Top N · #r (holder rank)
    add(priceHeldTag(input.priceHeld));        // $PRICE 100K+ / 1M+ (amount held)
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
