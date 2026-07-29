/*
 * Home featured-news content — the FEATURE rail (not the Tape firehose).
 *
 * Two sources, merged (Brendon, 2026-07-05):
 *   1. CURATED — Brendon's editorial pills. The slot is wired in now but stays
 *      empty; it fills from the admin studio he'll build later. Anything added
 *      here (or by that studio) shows first, in order.
 *   2. AUTO — the big platform moments the site raises itself. Originally just
 *      three lifecycle events (uploaded / graduated / sold out), which meant a
 *      rail of almost nothing but graduations; WIDENED 2026-07-29 (Brendon:
 *      "let's discuss what else we can show") to nine families, split by where
 *      the data comes from:
 *
 *        STANDING (a state, not a moment) — today's PriceDay · today's Mood
 *        Ring · platform round numbers · the top collector · mint progress on
 *        the projects closest to selling out.
 *
 *        MOMENTS (timestamped, newest first) — the three lifecycle events, the
 *        three BIG mint milestones, today's biggest sale, a project's first
 *        ever resale, an artist's debut + second project, project birthdays.
 *
 *        FACES — the newest named accounts, on the sprite pill.
 *
 *      Everything derivable from the home payload + the project registry is
 *      computed right here; only the sale + account signals need a database
 *      read, and those arrive pre-computed in `feed.news`.
 */

import type { NewsItem } from '../../components/home/NewsCarousel';
import type { HomeResponse, HomeMintingRow, HomeUploadRow } from './homeData';
import type { HomeYouResponse } from '../../app/api/home/you/route';
import { getProject, projectsByArtist } from '../project/registry';
import { FEED_LIFECYCLE, milestoneByKey } from './milestones';
import { gasRead } from '../gas/read';
import { formatWindowRemaining } from '../artists/window';

/* Curated feature pills — Brendon's editorial line. Empty until the admin
   studio populates it; each entry is a NewsItem ({ glyph?, tag?, title?, meta?,
   href?, kind?, name? }). The rail already renders whatever lands here. */
export const CURATED_NEWS: NewsItem[] = [];

/* Cap on auto pills so the rail stays a highlight reel, not the firehose. */
const AUTO_LIMIT = 12;
/* Per-family caps on the standing pills — the rail loops, so a long tail of
   near-identical progress bars just makes the cycle slower. */
const PROGRESS_LIMIT = 3;

const vs = (g: string) => `${g}︎`;

/* ETH to at most 3 decimals, trailing zeros dropped — the almanac's own
   formatting for a sale figure. */
const eth = (v: number) => `${Number(v.toFixed(3))} ETH`;

const titleOf = (slug: string, fallback = slug) => getProject(slug)?.displayName ?? fallback;

/* The rail's version of the upload-window countdown: the two largest units
   only. A ticking seconds figure here would change the rail's content — and so
   restart its scroll animation — every second; the live tickers live on the
   Studio dashboard and the Created tab, where the motion costs nothing. */
const fmtWindow = (opensAt: number) => formatWindowRemaining(opensAt - Date.now(), true);

/* "Today · 15:42" / "Yesterday · 15:42" / "JUN 11 · 15:42" — the moment stamp
   shown under the project name on each auto pill. Relative wording for the last
   two days, then the compact date. VIEWER-LOCAL, like every displayed clock
   time on PD (Brendon, 2026-07-13: times always render in the user's own
   zone); "Today"/"Yesterday" follow the viewer's own calendar days too. */
function fmtNewsWhen(ms: number): string {
    const d = new Date(ms);
    const now = new Date();
    const dayOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((dayOf(now) - dayOf(d)) / 86400000);
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    let day: string;
    if (diffDays === 0) day = 'Today';
    else if (diffDays === 1) day = 'Yesterday';
    else {
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        day = `${mon} ${String(d.getDate()).padStart(2, '0')}`;
    }
    return `${day} · ${time}`;
}

/* ── MOMENTS ──────────────────────────────────────────────────────────────
   Everything with a timestamp lands here, gets sorted newest-first as one
   stream, and is capped — so a busy day of mints can't push a graduation off
   the rail and a quiet week still fills it. */
interface Moment {
    ts: number;
    glyph: string;
    tag: string;
    title: string;
    meta?: string;
    href?: string;
    cls?: string;
}

/* The Montreal calendar date of an instant, as [year, month, day]. Birthdays
   ride the PriceDay calendar (Montreal), not the viewer's — a project's
   birthday is a platform-wide day, like PriceDay and the Mood Ring. */
function montrealYmd(ms: number): [number, number, number] {
    const s = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(ms));
    const [y, m, d] = s.split('-').map(Number);
    return [y, m, d];
}

/* THE BIG THREE mint milestones. The full ladder came OFF the rail 2026-07-06
   as too noisy — these are the ones worth stopping for, and the mid-ladder
   tiers (First Blood, Lucky 22, Halo, Archetype) stay off. */
const BIG_MILESTONES = ['100', '1000', '4000'] as const;

/* Lifecycle + milestone + artist-debut moments for one project row. */
function projectMoments(
    row: HomeUploadRow | HomeMintingRow,
    uploadOrderByArtist: Map<string, string[]>,
    todayYmd: [number, number, number],
): Moment[] {
    const out: Moment[] = [];
    const L = FEED_LIFECYCLE;
    const title = titleOf(row.slug, row.title);
    const href = `/art/${row.slug}`;
    const minting = 'reached_at' in row ? row : null;

    /* UPLOAD — reads as the ARTIST'S DEBUT or their SECOND PROJECT when it is
       one, otherwise the plain lifecycle pill. Never both: the upload is one
       moment and gets one pill (Brendon's rail, not a changelog). */
    if (row.uploaded_at != null) {
        const handle = getProject(row.slug)?.artistHandle ?? null;
        const order = handle ? uploadOrderByArtist.get(handle) ?? [] : [];
        const rank = order.indexOf(row.slug);
        if (handle && rank === 0) {
            out.push({
                ts: row.uploaded_at, glyph: '✺', tag: 'NEW ARTIST',
                title: `@${handle}`, meta: `First project · ${title}`, href: `/${handle}`,
            });
        } else if (handle && rank === 1) {
            out.push({
                ts: row.uploaded_at, glyph: '✺', tag: 'SECOND PROJECT',
                title, meta: `@${handle}`, href,
            });
        } else {
            out.push({
                ts: row.uploaded_at, glyph: L.upload.glyph, tag: L.upload.label,
                title, meta: fmtNewsWhen(row.uploaded_at), href,
            });
        }

        /* BIRTHDAY — the upload anniversary, on the Montreal calendar. Stamped
           with today so it sits at the top of the stream on the day it lands. */
        const [by, bm, bd] = montrealYmd(row.uploaded_at);
        const years = todayYmd[0] - by;
        if (years >= 1 && bm === todayYmd[1] && bd === todayYmd[2]) {
            out.push({
                ts: Date.now(), glyph: '✧', tag: 'BIRTHDAY',
                title, meta: years === 1 ? 'Turns 1 today' : `Turns ${years} today`, href,
            });
        }
    }

    for (const key of BIG_MILESTONES) {
        const ts = row.milestones?.[key];
        const m = milestoneByKey(key);
        if (ts == null || !m) continue;
        out.push({ ts, glyph: m.glyph, cls: m.cls, tag: m.label, title, meta: fmtNewsWhen(ts), href });
    }

    if (minting) {
        if (minting.reached_at != null) {
            out.push({
                ts: minting.reached_at, glyph: L.graduated.glyph, tag: L.graduated.label,
                title, meta: fmtNewsWhen(minting.reached_at), href,
            });
        }
        if (minting.sold_out_at != null) {
            out.push({
                ts: minting.sold_out_at, glyph: L.ascension.glyph, tag: L.ascension.label,
                title, meta: fmtNewsWhen(minting.sold_out_at), href,
            });
        }
    }
    return out;
}

/* Every project each artist has uploaded, oldest upload first — the ordering
   that makes a project their debut or their second. Registry-backed (the
   artist↔project map lives there), timed by the live payload. */
function artistUploadOrder(feed: HomeResponse): Map<string, string[]> {
    const uploadedAt = new Map<string, number>();
    for (const r of [...(feed.uploads ?? []), ...(feed.minting_now ?? [])]) {
        if (r.uploaded_at != null) uploadedAt.set(r.slug, r.uploaded_at);
    }
    const byArtist = new Map<string, string[]>();
    for (const slug of uploadedAt.keys()) {
        const handle = getProject(slug)?.artistHandle;
        if (!handle) continue;
        if (byArtist.has(handle)) continue;
        const slugs = projectsByArtist(handle)
            .map((p) => p.slug)
            .filter((s) => uploadedAt.has(s))
            .sort((a, b) => (uploadedAt.get(a) ?? 0) - (uploadedAt.get(b) ?? 0));
        byArtist.set(handle, slugs);
    }
    return byArtist;
}

function momentItems(feed: HomeResponse): NewsItem[] {
    const order = artistUploadOrder(feed);
    const todayYmd = montrealYmd(Date.now());
    const moments: Moment[] = [];
    for (const r of feed.uploads ?? []) moments.push(...projectMoments(r, order, todayYmd));
    for (const r of feed.minting_now ?? []) moments.push(...projectMoments(r, order, todayYmd));

    /* The two sale moments — biggest of the day, and a project's debut resale. */
    const n = feed.news;
    if (n?.top_sale) {
        const s = n.top_sale;
        moments.push({
            ts: s.ts, glyph: '⟠', tag: 'TOP SALE',
            title: `${titleOf(s.slug)} #${s.token_id}`, meta: eth(s.price_eth),
            href: `/art/${s.slug}/${s.token_id}`,
        });
    }
    if (n?.first_resale) {
        const s = n.first_resale;
        moments.push({
            ts: s.ts, glyph: '✸', tag: 'FIRST RESALE',
            title: `${titleOf(s.slug)} #${s.token_id}`, meta: eth(s.price_eth),
            href: `/art/${s.slug}/${s.token_id}`,
        });
    }

    return moments
        .sort((a, b) => b.ts - a.ts)
        .slice(0, AUTO_LIMIT)
        .map((m) => ({ glyph: vs(m.glyph), cls: m.cls, tag: m.tag, title: m.title, meta: m.meta, href: m.href }));
}

/* ── STANDING ─────────────────────────────────────────────────────────────
   States rather than moments: true right now, no timestamp, so they sit ahead
   of the moment stream instead of competing with it for recency. */

/* Round numbers worth announcing. The HIGHEST one the platform has passed is
   the one that shows — a mark is news until the next mark replaces it. */
const MINTED_MARKS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const VOLUME_MARKS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

const highestPassed = (v: number, marks: number[]): number | null => {
    let hit: number | null = null;
    for (const m of marks) if (v >= m) hit = m;
    return hit;
};

function standingItems(feed: HomeResponse): NewsItem[] {
    const out: NewsItem[] = [];

    /* MINT PROGRESS — the projects closest to gone. Only the states worth a
       look: the final piece, the last ten, or past the halfway line. */
    const progress = (feed.minting_now ?? [])
        .filter((m) => m.max_supply > 0 && m.sold_out_at == null && m.minted_count < m.max_supply)
        .map((m) => ({ m, remaining: m.max_supply - m.minted_count, pct: m.minted_count / m.max_supply }))
        .filter((p) => p.remaining <= 10 || p.pct >= 0.5)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, PROGRESS_LIMIT);
    for (const p of progress) {
        const tag = p.remaining === 1 ? 'FINAL PIECE'
            : p.remaining <= 10 ? `LAST ${p.remaining}`
                : 'HALFWAY';
        out.push({
            glyph: vs('✶'), tag,
            title: titleOf(p.m.slug, p.m.title),
            meta: `${p.m.minted_count} / ${p.m.max_supply}`,
            href: `/art/${p.m.slug}`,
        });
    }

    /* PLATFORM ROUND NUMBERS — the two hero stats, each announced when it
       crosses a mark and staying up (with the live figure) until the next. */
    const minted = feed.stats?.minted ?? 0;
    const mintMark = highestPassed(minted, MINTED_MARKS);
    if (mintMark) {
        out.push({
            glyph: vs('⌗'), tag: 'PLATFORM',
            title: `${mintMark.toLocaleString()} pieces minted`,
            meta: `${minted.toLocaleString()} and counting`,
        });
    }
    const volume = Number(feed.stats?.volume_eth ?? 0) || 0;
    const volMark = highestPassed(volume, VOLUME_MARKS);
    if (volMark) {
        out.push({
            glyph: vs('⟠'), tag: 'PLATFORM',
            title: `${volMark.toLocaleString()} ETH traded`,
            meta: `${Number(volume.toFixed(2)).toLocaleString()} ETH and counting`,
        });
    }

    /* TOP COLLECTOR — who is #1 on the PriceScore leaderboard right now. ❂ is
       the rank mark (❖ is rarity's, and never PriceRank's again). */
    const top = feed.news?.top_collector;
    if (top) {
        out.push({
            glyph: vs('❂'), tag: 'TOP COLLECTOR',
            title: `@${top.handle}`,
            meta: `PriceScore ${Math.round(top.score).toLocaleString()}`,
            href: `/${top.handle}`,
        });
    }

    /* A PLATFORM HEAD-COUNT — one profile tag and how many people wear it,
       turning over daily so the rail keeps saying something new. */
    const ts = feed.news?.tag_stat;
    if (ts) {
        out.push({
            glyph: vs('☻'), tag: 'PLATFORM',
            title: `${ts.count.toLocaleString()} ${ts.count === 1 ? 'person wears' : 'people wear'} ${ts.label}`,
            meta: 'Profile tags',
        });
    }

    return out;
}

/* ── THE QUIET FEATURES ───────────────────────────────────────────────────
   Things PD already has that nobody trips over on their own. The rail is the
   only surface that can put them in front of someone, so it does — plain
   pointers, no fanfare (Brendon, 2026-07-29). */
function featurePills(doors: FeatureDoors): NewsItem[] {
    return [
        {
            glyph: vs('⚷'), tag: 'KEYCHAINS',
            title: 'The capsule machine', meta: 'Crank one', onClick: doors.openKeychains,
        },
        {
            glyph: vs('⊞'), tag: 'STICKERS',
            title: 'Slap them on your profile', meta: 'The sticker store',
            onClick: doors.openStickers,
        },
        {
            // DOCS is deliberately glyph-less — no canon fit, and the glossary
            // takes omission over a forced icon.
            tag: 'DOCS', title: 'How PD actually works', meta: 'Read the docs', href: '/docs',
        },
        {
            glyph: vs('✺'), tag: 'PD STUDIO',
            title: 'Your workbench is waiting', meta: 'Upload · manage · analytics', href: '/studio',
        },
    ];
}

/* ── LIVE MARKET ──────────────────────────────────────────────────────────
   ETH and gas, straight off the gas tracker's feed. Gas carries THE READ —
   the one-word verdict, so the answer is readable at a glance without doing
   the arithmetic (Brendon, 2026-07-29). */
function marketItems(market?: { ethUsd: number; gwei: number }): NewsItem[] {
    if (!market) return [];
    const out: NewsItem[] = [];
    if (market.ethUsd > 0) {
        out.push({
            glyph: vs('⟠'), tag: 'ETH',
            title: `$${Math.round(market.ethUsd).toLocaleString()}`, meta: 'Live',
        });
    }
    if (market.gwei > 0) {
        const read = gasRead(market.gwei);
        out.push({
            glyph: vs('⍞'), tag: 'GAS',
            title: read.word,
            meta: `${market.gwei < 10 ? market.gwei.toFixed(2) : market.gwei.toFixed(1)} gwei`,
        });
    }
    return out;
}

/* ── YOURS ────────────────────────────────────────────────────────────────
   The viewer's own three, from /api/home/you. Absent when signed out. */
function youItems(you: HomeYouResponse | null | undefined): NewsItem[] {
    if (!you) return [];
    const out: NewsItem[] = [];
    if (you.kin) {
        out.push({
            glyph: vs('≍'), tag: 'YOUR KIN',
            title: `@${you.kin.handle}`,
            meta: `${you.kin.shared} ${you.kin.shared === 1 ? 'project' : 'projects'} in common`,
            href: `/${you.kin.handle}`,
        });
    }
    if (you.rarest) {
        const r = you.rarest;
        out.push({
            glyph: vs('❖'), tag: 'YOUR RAREST',
            title: `${titleOf(r.slug)} #${r.token_id}`,
            meta: `#${r.rank} rarest of ${r.total}`,
            href: `/art/${r.slug}/${r.token_id}`,
        });
    }
    if (you.artist_window) {
        out.push({
            glyph: vs('✺'), tag: 'YOUR NEXT WINDOW',
            title: fmtWindow(you.artist_window.opens_at),
            meta: 'Until you can upload again', href: '/studio',
        });
    }
    return out;
}

/* ── FACES ────────────────────────────────────────────────────────────────
   The newest named accounts, on the sprite pill that has been built and unused
   since the rail shipped. */
function faceItems(feed: HomeResponse): NewsItem[] {
    return (feed.news?.new_faces ?? []).map((f) => ({
        kind: 'sprite' as const, name: f.handle, href: `/${f.handle}`,
    }));
}

/* Curated first, then the auto moments. */
/* The Dispatch pill — the standing front-page pointer to the morning paper.
   Leads the rail every day (Brendon greenlit The Dispatch 2026-07-12);
   ❡ = the press mark (GLYPHS.md §12). It replaced the old printed-page square
   ▤ on 2026-07-28 — Brendon: too close to the Calendar's ▦ to tell apart. */
const DISPATCH_PILL: NewsItem = {
    glyph: '❡︎',
    tag: 'THE DISPATCH',
    title: 'Yesterday, on the record',
    meta: 'Prints daily',
    href: '/dispatch',
};

/* The Dispatch prints at 09:00 in Montreal (America/Toronto). "Every morning ·
   9AM" is only true THERE — for a reader in Tokyo it lands late at night. So we
   show each reader the drop time in THEIR OWN zone (Brendon, 2026-07-13: every
   displayed clock time is viewer-local). Client-only — call it after mount so
   the server paint and first client paint agree on the plain 'Prints daily'
   and there's no hydration mismatch. */
export function dispatchPrintsMeta(): string {
    const now = new Date();
    const tp = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(now);
    const g = (t: string) => Number(tp.find((p) => p.type === t)?.value);
    let hh = g('hour'); if (hh === 24) hh = 0;
    // Toronto's current UTC offset (ms) = its wall clock read as UTC, minus now.
    const asUTC = Date.UTC(g('year'), g('month') - 1, g('day'), hh, g('minute'), g('second'));
    const offset = asUTC - now.getTime();
    // Today's 09:00 Toronto as a real instant, rendered in the viewer's zone.
    const instant = Date.UTC(g('year'), g('month') - 1, g('day'), 9, 0, 0) - offset;
    const local = new Date(instant).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Prints daily · ${local}`;
}

/* The day pills. Both are date-derived, so — exactly like the Dispatch's local
   print time — they're computed after mount and passed in; the server paint and
   the first client paint agree on a rail without them, then they slot in. */
export interface DayPills {
    dispatchMeta?: string;
    /** Today's PriceDay: { n, date } from lib/priceday. */
    priceDay?: { n: number; date: string };
    /** Today's Mood Ring: { name, hex } from lib/mood. */
    mood?: { name: string; hex: string };
    /** Live ETH/USD + gas, from the gas tracker's own feed. */
    market?: { ethUsd: number; gwei: number };
    /** The viewer's own signals — absent when signed out. */
    you?: HomeYouResponse | null;
    /** The doors the quiet-feature pills open. Omitted → those pills sit out
        rather than shipping as dead chrome. */
    doors?: FeatureDoors;
}

/** How the feature pills reach the surfaces that live behind modals. */
export interface FeatureDoors {
    openKeychains: () => void;
    openStickers: () => void;
}

export function buildNewsItems(feed: HomeResponse | null, day: DayPills = {}): NewsItem[] {
    const head: NewsItem[] = [
        day.dispatchMeta ? { ...DISPATCH_PILL, meta: day.dispatchMeta } : DISPATCH_PILL,
    ];
    if (day.priceDay) {
        head.push({
            glyph: vs('✶'), tag: 'PRICEDAY',
            title: `PriceDay #${day.priceDay.n}`, meta: day.priceDay.date,
        });
    }
    if (day.mood) {
        head.push({
            glyph: vs('◉'), tag: 'MOOD RING',
            title: day.mood.name, meta: day.mood.hex,
        });
    }
    /* Order: the day's standing pills, then the viewer's own, then the live
       market, then whatever the platform is doing, then the newest faces, and
       the quiet features last — they're evergreen, so they never crowd out
       something that actually just happened. */
    const tail = [...marketItems(day.market), ...(day.doors ? featurePills(day.doors) : [])];
    if (!feed) return [...head, ...CURATED_NEWS, ...youItems(day.you), ...tail];
    return [
        ...head,
        ...CURATED_NEWS,
        ...youItems(day.you),
        ...standingItems(feed),
        ...momentItems(feed),
        ...faceItems(feed),
        ...tail,
    ];
}
