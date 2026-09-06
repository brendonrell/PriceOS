'use client';

/*
 * groupDimensions — the shared value engine behind the EXPANDED grouping cycle
 * (Brendon, 2026-07-16: "way more group options… deep cuts deep in the cycle").
 *
 * Every dimension here reads data the client ALREADY holds or self-populates:
 *   • the stored visual fingerprint + platform traits (lib/art/colorStore —
 *     loaded by the same useStoredColors() fetch the galleries already make);
 *   • the pure per-token derivations (lib/output/derive · lib/output/rarity);
 *   • the live per-item context the calling gallery passes in (listed / Fate /
 *     mint moment / owner faction).
 * No dimension fakes a value: a piece the data can't place lands in an honest
 * tail bucket (Unsampled / Undated / Neutral / Unranked) that always sorts last.
 *
 * Both galleries (project page + Collected) resolve labels through THIS module
 * so a dimension can never mean two things on two surfaces.
 */

import type { GroupKey } from './SortContext';
import { resolveBucket, resolveFingerprint, resolveStoredTraits } from '../art/colorStore';
import { COLOR_BUCKET_ORDER } from '../art/outputColor';
import {
    brightnessBand, toneMood, colorTemperature, orientationOf,
    lunarPhase, birthWeekday,
} from '../output/derive';
import { pdRarityRank } from '../output/rarity';
import { projectLanguage } from '../project/registry';
import { priceDayNumber } from '../priceday/priceday';

/* The single-level EXPANSION dimensions (2026-07-16). The classic identity
   dims (artist/project/owner/colour + combos) keep their bespoke section
   builders in each gallery hook; everything below flows through
   groupSectionLabel + groupLabelComparator. */
export const EXTRA_GROUP_DIMS: ReadonlySet<GroupKey> = new Set<GroupKey>([
    'listed', 'fate', 'rarity', 'temperature', 'light', 'mood',
    'orientation', 'moon', 'zodiac', 'weekday', 'priceday', 'faction', 'numerology',
    'language',
    /* THE PRICE TRIO (Brendon, 2026-09-06) — flows through the same shared
       engine as Listed, which they're grouped with at the tail of the menu. */
    'priceTier', 'priceTrend', 'vsFloor',
]);

/** Per-item context the calling gallery already knows (its own item shape). */
export interface GroupItemCtx {
    /** Live listed state (project: meta.price · collected: h.listed). */
    listed?: boolean;
    /** The Fate trait (always present on both surfaces' trait maps). */
    fate?: string | null;
    /** Natal sun sign when the surface computes traits live (Collected). */
    sun?: string | null;
    /** Mint moment in ms when the surface holds it (Collected: mint_ts). */
    mintMs?: number | null;
    /** The owner's faction (project page — factionStore), null = neutral. */
    faction?: string | null;
    /** The piece's artist name (both surfaces hold it on their trait map). */
    artist?: string | null;
    /** The piece's project display name — passed in so this module stays free
     *  of the registry. */
    project?: string | null;
    /** The holder's display name (project page: the owner column). */
    owner?: string | null;
    /** The holder's LEADING profile tag, already resolved by the caller (it
     *  owns the tag lookup). null = they have none showing. */
    tag?: string | null;
    /* ── THE PRICE TRIO (Brendon, 2026-09-06) — all three read off data the
       caller already has in memory, no new fetch on the project surface
       (its own outputs map) and one cached-per-project fetch on Collected
       (mirrors useOfferShield's floor cache). null = not listed / unknown,
       never faked. */
    /** The piece's own current listing price, ETH. null = not listed. */
    listPriceEth?: number | null;
    /** The project's original mint price, ETH — static registry read, always
     *  known (0 for free mints). */
    mintPriceEth?: number | null;
    /** The project's live floor (cheapest active listing across the WHOLE
     *  project, not just what's on screen). null = unknown/unfetched yet. */
    floorEth?: number | null;
}

/* Honest tail buckets — always last in their dimension's order. */
const UNSAMPLED = 'Unsampled';
const UNDATED = 'Undated';

function mintMsFor(slug: string, id: number, ctx: GroupItemCtx): number | null {
    if (ctx.mintMs != null && Number.isFinite(ctx.mintMs)) return ctx.mintMs;
    const at = resolveStoredTraits(slug, id)?.mintedAt;
    if (!at) return null;
    const ms = new Date(at).getTime();
    return Number.isFinite(ms) ? ms : null;
}

/* ── Numerology (zero-data deep cut) ─────────────────────────────────────
   Mutually-exclusive id classes, checked in this priority order. */
function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
    return true;
}
function numerologyOf(id: number): string {
    const s = String(id);
    if (id === 1) return 'The First';
    if (s.length >= 2 && s === [...s].reverse().join('')) return 'Palindromes';
    if (isPrime(id)) return 'Primes';
    if (id % 100 === 0) return 'Round Numbers';
    if (s.includes('7')) return 'Sevens';
    return 'The Rest';
}

/* ── pdRarity → tier (REAL rarity, pure client — same read as the Vault) ── */
function rarityTierOf(slug: string, id: number): string {
    const r = pdRarityRank(slug, id);
    if (!r || r.total <= 0) return 'Unranked';
    if (r.rank === 1) return 'The Rarest';
    const pct = r.rank / r.total;
    if (pct <= 0.01) return 'Top 1%';
    if (pct <= 0.05) return 'Top 5%';
    if (pct <= 0.10) return 'Top 10%';
    if (pct <= 0.25) return 'Top 25%';
    if (pct <= 0.50) return 'Top Half';
    return 'The Field';
}

/** The section label a piece belongs to under `group`. Pure + synchronous —
 *  stored data that hasn't arrived yet simply lands the piece in the tail
 *  bucket, and the section memo recomputes when the store version bumps. */
export function groupSectionLabel(
    group: GroupKey, slug: string, id: number, ctx: GroupItemCtx,
): string {
    switch (group) {
        /* ── The identity dimensions (Brendon, 2026-07-26) ────────────────
           These used to be built by bespoke branches inside each gallery, which
           is why only hardcoded PAIRS of them could exist. Resolving them here,
           beside every other dimension, is what lets ANY dimension sit at ANY
           of the three layers. */
        case 'artist':
            return ctx.artist || '—';
        case 'project':
            return ctx.project || slug;
        case 'owner':
            return ctx.owner || '—';
        case 'tag':
            /* Tags are OFF by default platform-wide, so most owners genuinely
               have none — that is an honest bucket, not missing data. */
            return ctx.tag || 'No Tag';
        case 'color':
            return resolveBucket(slug, id) ?? 'Other';
        case 'listed':
            return ctx.listed ? 'On the Market' : 'Held';
        case 'fate':
            return ctx.fate || resolveStoredTraits(slug, id)?.fate || '—';
        case 'rarity':
            return rarityTierOf(slug, id);
        case 'temperature': {
            const bucket = resolveBucket(slug, id);
            return bucket ? colorTemperature(bucket) : UNSAMPLED;
        }
        case 'light': {
            const b = resolveFingerprint(slug, id)?.brightness;
            return b != null ? brightnessBand(b) : UNSAMPLED;
        }
        case 'mood': {
            const fp = resolveFingerprint(slug, id);
            return fp?.brightness != null && fp.saturation != null
                ? toneMood(fp.brightness, fp.saturation)
                : UNSAMPLED;
        }
        case 'orientation': {
            const o = orientationOf(resolveFingerprint(slug, id)?.aspect ?? null);
            return o || UNSAMPLED;
        }
        case 'moon': {
            const ms = mintMsFor(slug, id, ctx);
            return ms != null ? lunarPhase(ms) : UNDATED;
        }
        case 'zodiac':
            return ctx.sun || resolveStoredTraits(slug, id)?.sun || UNDATED;
        case 'weekday': {
            const ms = mintMsFor(slug, id, ctx);
            return ms != null ? birthWeekday(ms) : UNDATED;
        }
        /* Same mechanism as weekday — bucket by the mint moment — but reads
           PriceDay's own calendar instead of the day-of-week name. */
        case 'priceday': {
            const ms = mintMsFor(slug, id, ctx);
            return ms != null ? `PriceDay #${priceDayNumber(new Date(ms))}` : UNDATED;
        }
        case 'faction':
            return ctx.faction || 'Neutral';
        case 'numerology':
            return numerologyOf(id);
        case 'language':
            /* The coding-language trait — pure registry read, so every piece
               resolves (no tail bucket needed; unset = the house default). */
            return projectLanguage(slug);
        /* ── THE PRICE TRIO (Brendon, 2026-09-06) ─────────────────────────
           All three flip live off the exact same listing data Listed
           already reads — no re-mint needed for a piece to change bucket. */
        case 'priceTier': {
            const p = ctx.listPriceEth;
            if (p == null) return 'Not Listed';
            if (p < 0.1) return 'Under 0.1E';
            if (p < 0.5) return '0.1–0.5E';
            if (p < 1) return '0.5–1E';
            return '1E+';
        }
        case 'priceTrend': {
            const p = ctx.listPriceEth;
            if (p == null) return 'Not Listed';
            const mint = ctx.mintPriceEth ?? 0;
            if (p > mint) return 'Above Mint';
            if (p < mint) return 'Below Mint';
            return 'At Mint';
        }
        case 'vsFloor': {
            const p = ctx.listPriceEth;
            if (p == null) return 'Not Listed';
            const floor = ctx.floorEth;
            if (floor == null || floor <= 0) return 'Unknown';
            if (p > floor) return 'Above Floor';
            if (p < floor) return 'Below Floor';
            return 'At Floor';
        }
        default:
            return '—';
    }
}

/* ── Section ordering ────────────────────────────────────────────────────
   A dimension with a natural axis gets its fixed order; the rest rank by
   section size (largest first). Tail buckets always close the cycle. */
const FIXED_ORDER: Partial<Record<GroupKey, readonly string[]>> = {
    /* Colour follows the palette's own wheel order, never section size. */
    color: [...COLOR_BUCKET_ORDER, 'Other'],
    listed: ['On the Market', 'Held'],
    rarity: ['The Rarest', 'Top 1%', 'Top 5%', 'Top 10%', 'Top 25%', 'Top Half', 'The Field', 'Unranked'],
    temperature: ['Warm', 'Cool', 'Neutral', UNSAMPLED],
    light: ['Luminous', 'Bright', 'Mid', 'Dim', 'Dark', UNSAMPLED],
    mood: ['Electric', 'Bold', 'Airy', 'Serene', 'Balanced', 'Hushed', 'Moody', 'Brooding', 'Sombre', UNSAMPLED],
    orientation: ['Portrait', 'Landscape', 'Square', UNSAMPLED],
    moon: [
        'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
        'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent', UNDATED,
    ],
    zodiac: [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra',
        'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', UNDATED,
    ],
    weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', UNDATED],
    numerology: ['The First', 'Palindromes', 'Primes', 'Round Numbers', 'Sevens', 'The Rest'],
    /* THE PRICE TRIO — cheapest/most-favourable first, "Not Listed" always
       last (same convention as Listed's own 'Held' tail). */
    priceTier: ['Under 0.1E', '0.1–0.5E', '0.5–1E', '1E+', 'Not Listed'],
    priceTrend: ['Below Mint', 'At Mint', 'Above Mint', 'Not Listed'],
    vsFloor: ['Below Floor', 'At Floor', 'Above Floor', 'Unknown', 'Not Listed'],
};

/* Count-ranked dimensions (fate · faction) still pin their tail last. */
const TAILS = new Set([UNSAMPLED, UNDATED, 'Neutral', 'Unranked', 'Other', 'No Tag', '—', 'Not Listed', 'Unknown']);

/** Comparator for [label, count] section pairs under `group`. */
export function groupLabelComparator(
    group: GroupKey,
): (a: [string, number], b: [string, number]) => number {
    const fixed = FIXED_ORDER[group];
    return (a, b) => {
        const aTail = TAILS.has(a[0]) ? 1 : 0;
        const bTail = TAILS.has(b[0]) ? 1 : 0;
        if (aTail !== bTail) return aTail - bTail;
        /* PriceDay has no fixed enum (it only grows) — sort numerically,
           most recent PriceDay first, same "recent leads" convention as
           #ID/$PRICE's default direction. */
        if (group === 'priceday') {
            const an = Number(a[0].replace(/\D+/g, ''));
            const bn = Number(b[0].replace(/\D+/g, ''));
            return bn - an;
        }
        if (fixed) {
            const ai = fixed.indexOf(a[0]);
            const bi = fixed.indexOf(b[0]);
            return (ai === -1 ? fixed.length : ai) - (bi === -1 ? fixed.length : bi);
        }
        // fate / faction — biggest section first, name-stable within a size.
        return b[1] - a[1] || a[0].localeCompare(b[0]);
    };
}


/* ── "JUST FIGURE IT OUT" (Brendon, 2026-07-26) ─────────────────────────────
   A grouping can be perfectly valid and still be USELESS for the window you are
   looking at: sort a single project by Project, or a wallet holding one artist
   by Artist, and every piece lands in one section — a title bar and nothing
   gained.

   ⛔ THE ONLY PLACE THAT JUDGEMENT LIVES IS THE LONG-PRESS MENU (Brendon,
   2026-07-31). It greys out a dimension that wouldn't cut this window so you
   see it BEFORE you pick it. The GRID never second-guesses a grouping that is
   set — whatever layers you chose are the layers that get drawn. The old
   silent drop is what made Owner and Tag read as broken: the cycle landed on
   them and nothing happened. */
/** Which of `dims` would actually CUT this window — a dimension that lands
 *  every piece in one bucket is a title bar and nothing else, so the picker
 *  greys it out instead of offering it (Brendon, 2026-07-30). Same rule the
 *  builder already uses to drop a dead layer, applied one dimension at a time
 *  so the menu can say so BEFORE it is picked. */
export function dimsThatCut<T>(
    items: readonly T[],
    dims: readonly GroupKey[],
    labelOf: (item: T, layer: GroupKey) => string,
): Set<GroupKey> {
    const out = new Set<GroupKey>();
    if (items.length < 2) return out;
    for (const dim of dims) {
        const seen = new Set<string>();
        for (const item of items) {
            seen.add(labelOf(item, dim));
            if (seen.size > 1) { out.add(dim); break; }
        }
    }
    return out;
}

