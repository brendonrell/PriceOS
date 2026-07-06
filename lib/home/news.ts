/*
 * Home featured-news content — the FEATURE rail (not the Tape firehose).
 *
 * Sources, merged (Brendon, 2026-07-05; wow pass 2026-07-06):
 *   1. CURATED — Brendon's editorial pills. The slot is wired in now but stays
 *      empty; it fills from the admin studio he'll build later. Anything added
 *      here (or by that studio) shows first, in order.
 *   2. AUTO — every big platform moment the site can raise itself: UPLOADED /
 *      GRADUATED / ASCENSION plus the FULL project-milestone ladder (First
 *      Blood, Lucky 22, Century Club, Halo, Per Mille, Archetype, Hi-Def) —
 *      the milestone timestamps already ride the home payload. Newest first,
 *      same event vocabulary (labels + glyphs) as the activity feed. Moment
 *      pills carry a little chip of the actual artwork — the exact output
 *      that triggered the moment (#1, #22, #100…).
 *   3. GARNISH (Brendon, 2026-07-06 — colour/shape used INTENTIONALLY, not
 *      everywhere):
 *      - Launch (UPLOADED) pills wear the project's chosen colorway as a
 *        faded tint — colour means "a new world just opened".
 *      - Showcase six-packs: six outputs back to back, no name, no
 *        explanation — tap to visit the project.
 *      - Circle entries: lone artwork circles + the rare yellow-bubble PRICE
 *        logo circle (links to the $PRICE token — Etherscan for now).
 *      All garnish placement is DAY-SEEDED (deterministic per UTC day) so
 *      server and client render the same rail, and the mix changes daily —
 *      the "first visit of the morning" hook.
 */

import type { NewsItem } from '../../components/home/NewsCarousel';
import type { HomeResponse } from './homeData';
import { getProject, allProjects, artImageUrl, projectColorway } from '../project/registry';
import { FEED_LIFECYCLE, PROJECT_MILESTONES } from './milestones';

/* Curated feature pills — Brendon's editorial line. Empty until the admin
   studio populates it; each entry is a NewsItem. The rail already renders
   whatever lands here. */
export const CURATED_NEWS: NewsItem[] = [];

/* The REAL artist roster — same derivation the hero's Featuring row uses
   (every project's artist from the registry, de-duped). Sprite pills pull
   their @names from here; new projects feed it automatically. */
const ARTIST_POOL: readonly string[] = [
    ...new Set(allProjects().map((p) => p.artistHandle)),
];

/* Teaser pills — "introducing" moments for things that don't exist yet
   (no link on purpose; the mystery is the point). Seeded, rare. */
const TEASERS: NewsItem[] = [
    { tag: 'INTRODUCING', title: 'The Docs', meta: 'Soon' },
];

/* Cap on auto pills so the rail stays a highlight reel, not the firehose. */
const AUTO_LIMIT = 16;

/* $PRICE token — mainnet (deployed 2026-07-03). Etherscan for now; swaps to
   the in-app PRICE page when that exists. */
const PRICE_TOKEN_URL =
    'https://etherscan.io/token/0x173a012c7c8ca3cfb531dcad84a40c53dbe74638';

const vs = (g: string) => `${g}︎`;

/* "Today · 15:42" / "Yesterday · 15:42" / "JUN 11 · 15:42" — the moment stamp
   shown under the project name on each auto pill. Relative wording for the last
   two days, then the compact date; time in the app's UTC house style (matches
   the New Uploads feed stamps). */
function fmtNewsWhen(ms: number): string {
    const d = new Date(ms);
    const now = new Date();
    const dayOf = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
    const diffDays = Math.round((dayOf(now) - dayOf(d)) / 86400000);
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    let day: string;
    if (diffDays === 0) day = 'Today';
    else if (diffDays === 1) day = 'Yesterday';
    else {
        const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
        day = `${mon} ${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    return `${day} · ${time}`;
}

/* Deterministic PRNG (mulberry32) seeded from a string — the rail's garnish
   must be identical on server + client render of the same day, and stable
   across re-renders (Math.random would churn the rail every pass). */
function seededRand(seedStr: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Ev {
    slug: string;
    title: string;
    tag: string;
    glyph: string;
    ts: number;
    /** The output that triggered the moment (#1, #22, #100, …) — its stored
        preview rides the pill as a little art chip. Null = no chip. */
    artId: number | null;
    /** Launch pills wear the project's chosen colorway, faded. */
    tint?: string | null;
}

/* Every project moment as pills, newest first. */
function autoNewsItems(feed: HomeResponse | null): NewsItem[] {
    if (!feed) return [];
    const evs: Ev[] = [];
    const push = (
        slug: string, fallback: string, tag: string, glyph: string,
        ts: number | null | undefined, artId: number | null, tint?: string | null,
    ) => {
        if (ts == null) return;
        evs.push({ slug, title: getProject(slug)?.displayName ?? fallback, tag, glyph, ts, artId, tint });
    };
    const L = FEED_LIFECYCLE;
    const pushMilestones = (slug: string, title: string, ms: Record<string, number>, minted: number) => {
        for (const m of PROJECT_MILESTONES) {
            const ts = ms[m.key];
            if (ts == null) continue;
            // The chip is the exact output that crossed the line — guaranteed
            // minted (the milestone fired) and always a great reveal.
            push(slug, title, m.label, m.glyph, ts, Math.min(m.count, minted));
        }
    };
    for (const u of feed.uploads ?? []) {
        push(u.slug, u.title, L.upload.label, L.upload.glyph, u.uploaded_at,
            u.minted_count > 0 ? 1 : null, projectColorway(u.slug));
        pushMilestones(u.slug, u.title, u.milestones ?? {}, u.minted_count);
    }
    for (const m of feed.minting_now ?? []) {
        push(m.slug, m.title, L.upload.label, L.upload.glyph, m.uploaded_at,
            m.minted_count > 0 ? 1 : null, projectColorway(m.slug));
        push(m.slug, m.title, L.graduated.label, L.graduated.glyph, m.reached_at, Math.min(18, m.minted_count));
        push(m.slug, m.title, L.ascension.label, L.ascension.glyph, m.sold_out_at,
            m.max_supply > 0 ? m.max_supply : null);
        pushMilestones(m.slug, m.title, m.milestones ?? {}, m.minted_count);
    }
    return evs
        .sort((a, b) => b.ts - a.ts)
        .slice(0, AUTO_LIMIT)
        .map((e) => ({
            glyph: vs(e.glyph),
            tag: e.tag,
            title: e.title,
            meta: fmtNewsWhen(e.ts),
            href: `/art/${e.slug}`,
            art: e.artId != null ? artImageUrl(e.slug, e.artId) ?? undefined : undefined,
            artHref: e.artId != null ? `/art/${e.slug}/${e.artId}` : undefined,
            tint: e.tint ?? undefined,
        }));
}

/* Showcase six-pack — six outputs of one project, back to back, no name, no
   explanation. Tap → the project page. Uses the project showcase's default
   face (the first six minted). */
function sixPack(feed: HomeResponse, pick: number): NewsItem | null {
    const rows = feed.minting_now ?? [];
    if (rows.length === 0) return null;
    const row = rows[pick % rows.length];
    const n = Math.min(6, row.minted_count);
    if (n < 6) return null;
    const outputs: { src: string; href: string }[] = [];
    for (let id = 1; id <= n; id++) {
        const src = artImageUrl(row.slug, id);
        if (!src) return null;
        outputs.push({ src, href: `/art/${row.slug}` });
    }
    return { kind: 'six', href: `/art/${row.slug}`, outputs };
}

/* Curated first, then the moments, then the day's seeded garnish woven in. */
export function buildNewsItems(feed: HomeResponse | null): NewsItem[] {
    const auto = autoNewsItems(feed);
    const items: NewsItem[] = [...CURATED_NEWS, ...auto];
    if (!feed || items.length === 0) return items;

    // One seed per UTC day (+ content size, so a new project reshuffles the
    // garnish) — the rail's look changes each morning, never mid-session.
    const day = new Date().toISOString().slice(0, 10);
    const rand = seededRand(`${day}:${(feed.minting_now ?? []).length}:${items.length}`);

    // Width variance — uniform pills bore the eye (Brendon, 2026-07-06).
    // ASCENSION (sold out) is always the big wide moment; a seeded scatter of
    // other moments goes wide too, so the row's rhythm changes daily.
    for (const it of items) {
        if (!it.kind || it.kind === 'text') {
            it.wide = it.tag === 'ASCENSION' || rand() < 0.22;
        }
    }

    // Lone artwork circles — a moment's art repeated as a pure circle, no
    // words; tap goes straight to the piece. At most two per day.
    const withCircles: NewsItem[] = [];
    let circles = 0;
    for (const it of items) {
        withCircles.push(it);
        if (circles < 2 && it.art && it.artHref && rand() < 0.22) {
            circles++;
            withCircles.push({ kind: 'art', art: it.art, href: it.artHref });
        }
    }

    // Showcase six-packs — up to two per day, seeded picks, seeded positions.
    const packs = rand() < 0.85 ? (rand() < 0.4 ? 2 : 1) : 0;
    for (let i = 0; i < packs; i++) {
        const pack = sixPack(feed, Math.floor(rand() * 97));
        if (!pack) break;
        const at = 1 + Math.floor(rand() * Math.max(1, withCircles.length - 1));
        withCircles.splice(at, 0, pack);
    }

    // Live sprite pills — one or two animated PriceSprites with real artist
    // @names from the roster; tap visits the profile.
    const sprites = 1 + (rand() < 0.4 ? 1 : 0);
    for (let i = 0; i < sprites && ARTIST_POOL.length > 0; i++) {
        const name = ARTIST_POOL[Math.floor(rand() * ARTIST_POOL.length)];
        const at = 1 + Math.floor(rand() * Math.max(1, withCircles.length - 1));
        withCircles.splice(at, 0, { kind: 'sprite', name, href: `/${name}` });
    }

    // The spinning PD logo — most days, somewhere in the row, Petey turns up.
    if (rand() < 0.7) {
        const at = 1 + Math.floor(rand() * Math.max(1, withCircles.length - 1));
        withCircles.splice(at, 0, { kind: 'logo' });
    }

    // The rare slot — some mornings, a yellow-bubble PRICE circle, just
    // because it looks cool. (The Dispatch pill joins this slot when The
    // Dispatch ships.)
    if (rand() < 0.34) {
        const at = 1 + Math.floor(rand() * Math.max(1, withCircles.length - 1));
        withCircles.splice(at, 0, { kind: 'price', href: PRICE_TOKEN_URL });
    }

    // Teasers — rarely, the rail introduces something that doesn't exist yet.
    // No link on purpose; the mystery is the point.
    if (rand() < 0.2 && TEASERS.length > 0) {
        const tease = TEASERS[Math.floor(rand() * TEASERS.length)];
        const at = 1 + Math.floor(rand() * Math.max(1, withCircles.length - 1));
        withCircles.splice(at, 0, tease);
    }

    return withCircles;
}
