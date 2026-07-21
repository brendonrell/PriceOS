/*
 * THE WIDGET DECK — the Command Stone's summonable hands (stage 4, the
 * presentation pass — docs/briefs/command-stone.md ⛔ STAGE 4 ADDENDUM).
 *
 * "Magic tablet meets Spotlight meets TARS meets watchOS; Raycast is a
 * big inspo" — each capability is its own summonable widget: a big-type,
 * real-data, glanceable black card inside the tab. watchOS is the
 * REFERENCE, not the blueprint (Brendon, 2026-07-20): the cards speak
 * PD's own language — Courier, square corners, the canon glyphs.
 *
 * This file is the PURE summon grammar (testable, no DOM): a typed line
 * → the widget it calls, or null so the line falls through to GO/FIND.
 * Same discipline as CAST: exact words summon; anything inexact is a
 * search. Priority in the stone: ETCH > CAST > WIDGET > GO/FIND.
 *
 *   calendar                     → the week, real /api/calendar + to-dos
 *   priceday                     → today's almanac, big number
 *   calc prisms 0.5              → the P&L ladder vs the live floor
 *   dossier @gmoney · @gmoney    → the collector/artist read
 *   gallery prisms               → mini gallery, ‹ › through the pieces
 *   matrix prisms vs fumage      → the mini table maker (live stats)
 *   ascii                        → wallet ASCII gen art (deterministic)
 *   docs <query>                 → search inside the published docs
 */

import { resolveProject } from './etch';

export type WidgetPlan =
    | { kind: 'calendar' }
    | { kind: 'priceday' }
    | { kind: 'calc'; slug: string | null; title: string | null; price: number | null }
    | { kind: 'dossier'; name: string }
    | { kind: 'gallery'; slug: string | null; title: string | null }
    | { kind: 'matrix'; names: string[] }
    | { kind: 'ascii' }
    | { kind: 'docs'; query: string }
    /* stage 5 hands */
    | { kind: 'glance' }
    | { kind: 'trend'; slug: string; title: string; days: number }
    /* the familiar's Omniscience, ported to the stone — the read on YOU. */
    | { kind: 'omni' }
    /* PD WRAPPED (2026-07-20) — your own recap; cadence-agnostic (days). */
    | { kind: 'wrapped'; days: number };

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Bare-word summons — exact matches only (a miscast is worse than a
    search result; CAST's own rule). */
const CALENDAR_WORDS = new Set(['calendar', 'cal', 'week', 'schedule']);
const PRICEDAY_WORDS = new Set(['priceday', 'price day', 'today', 'almanac']);
const ASCII_WORDS = new Set(['ascii', 'my ascii', 'my mark', 'wallet art']);
/** THE GLANCE — the composed morning card (stage 5). */
const GLANCE_WORDS = new Set(['brief', 'glance', 'morning', 'the glance']);
/** OMNISCIENCE — the familiar's read on YOU, summoned by name. */
const OMNI_WORDS = new Set(['me', 'myself', 'omniscience', 'about me', 'know me']);
/** PD WRAPPED — bare word = the default 30-day look-back; `wrapped 90d`
    picks the window (cadence is Brendon's open call — the days parameter
    IS the cadence-agnosticism). */
const WRAPPED_WORDS = new Set(['wrapped', 'my wrapped', 'pd wrapped', 'recap', 'my recap']);

/** `@handle` — bare handle lines summon the dossier (the stone's own
    presentation of the person). Same charset the app allows in handles. */
const HANDLE_RE = /^@([a-z0-9_.-]{2,})$/;

/** Split a matrix list on its separators: "a vs b", "a, b, c", "a · b". */
function splitMatrixNames(rest: string): string[] {
    return rest
        .split(/\s+vs\.?\s+|\s*,\s*|\s*·\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
}

export function parseWidget(line: string): WidgetPlan | null {
    const q = norm(line);
    if (!q) return null;

    if (CALENDAR_WORDS.has(q)) return { kind: 'calendar' };
    if (PRICEDAY_WORDS.has(q)) return { kind: 'priceday' };
    if (ASCII_WORDS.has(q)) return { kind: 'ascii' };
    if (GLANCE_WORDS.has(q)) return { kind: 'glance' };
    if (OMNI_WORDS.has(q)) return { kind: 'omni' };
    if (WRAPPED_WORDS.has(q)) return { kind: 'wrapped', days: 30 };

    /* `wrapped 90d` / `recap 7d` — a chosen window. */
    const wrapped = /^(?:wrapped|recap)\s+(\d{1,3})d?$/.exec(q);
    if (wrapped) return { kind: 'wrapped', days: parseInt(wrapped[1], 10) };

    /* `<project> 30d` — the sales trend in Courier (stage 5). Window is
       clamped 7–90 by the API; unresolved names fall through to search. */
    const trend = /^(.+?)\s+(\d{1,3})d$/.exec(q);
    if (trend) {
        const proj = resolveProject(trend[1]);
        if (proj) return { kind: 'trend', slug: proj.slug, title: proj.title, days: parseInt(trend[2], 10) };
    }

    const handle = HANDLE_RE.exec(q);
    if (handle) return { kind: 'dossier', name: handle[1] };

    const dossier = /^(?:dossier|who is)\s+(.+)$/.exec(q);
    if (dossier) {
        const name = dossier[1].replace(/^@/, '').replace(/\?+$/, '').trim();
        if (name) return { kind: 'dossier', name };
    }

    const docs = /^docs\s+(.+)$/.exec(q);
    if (docs) return { kind: 'docs', query: docs[1] };
    if (q === 'docs') return { kind: 'docs', query: '' };

    const gallery = /^gallery(?:\s+(.+))?$/.exec(q);
    if (gallery) {
        const name = (gallery[1] ?? '').trim();
        if (!name) return { kind: 'gallery', slug: null, title: null };
        const proj = resolveProject(name);
        /* Unresolved name → keep falling through to GO/FIND (the user is
           mid-word; search stays live until the name lands). */
        return proj ? { kind: 'gallery', slug: proj.slug, title: proj.title } : null;
    }

    const matrix = /^matrix(?:\s+(.+))?$/.exec(q);
    if (matrix) {
        const rest = (matrix[1] ?? '').trim();
        if (!rest) return { kind: 'matrix', names: [] };
        return { kind: 'matrix', names: splitMatrixNames(rest).slice(0, 3) };
    }

    const calc = /^calc(?:\s+(.+))?$/.exec(q);
    if (calc) {
        const rest = (calc[1] ?? '').trim();
        if (!rest) return { kind: 'calc', slug: null, title: null, price: null };
        /* `calc <project> [price]` — a trailing number is the buy price. */
        const m = /^(.*?)(?:\s+(\d+(?:\.\d+)?))?$/.exec(rest);
        const name = (m?.[1] ?? '').trim();
        const price = m?.[2] != null ? parseFloat(m[2]) : null;
        if (!name && price != null) return { kind: 'calc', slug: null, title: null, price };
        const proj = name ? resolveProject(name) : null;
        if (!proj && name) return { kind: 'calc', slug: null, title: null, price };
        return {
            kind: 'calc',
            slug: proj?.slug ?? null,
            title: proj?.title ?? null,
            price,
        };
    }

    return null;
}
