/*
 * Home featured-news content — the FEATURE rail (not the Tape firehose).
 *
 * Two sources, merged (Brendon, 2026-07-05):
 *   1. CURATED — Brendon's editorial pills. The slot is wired in now but stays
 *      empty; it fills from the admin studio he'll build later. Anything added
 *      here (or by that studio) shows first, in order.
 *   2. AUTO — the big platform moments the site raises itself: a project
 *      UPLOADED, GRADUATED (crossed into Now Minting), or ASCENSION (sold out).
 *      Newest first, derived live from the home payload, using the SAME event
 *      vocabulary (labels + glyphs) as the activity feed.
 */

import type { NewsItem } from '../../components/home/NewsCarousel';
import type { HomeResponse } from './homeData';
import { getProject } from '../project/registry';
import { FEED_LIFECYCLE } from './milestones';

/* Curated feature pills — Brendon's editorial line. Empty until the admin
   studio populates it; each entry is a NewsItem ({ glyph?, tag?, title?, meta?,
   href?, kind?, name? }). The rail already renders whatever lands here. */
export const CURATED_NEWS: NewsItem[] = [];

/* Cap on auto pills so the rail stays a highlight reel, not the firehose. */
const AUTO_LIMIT = 12;

const vs = (g: string) => `${g}︎`;

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

interface Ev { slug: string; title: string; tag: string; glyph: string; ts: number }

/* The three lifecycle moments as pills, newest first. */
function autoNewsItems(feed: HomeResponse | null): NewsItem[] {
    if (!feed) return [];
    const evs: Ev[] = [];
    const push = (slug: string, fallback: string, tag: string, glyph: string, ts: number | null) => {
        if (ts == null) return;
        evs.push({ slug, title: getProject(slug)?.displayName ?? fallback, tag, glyph, ts });
    };
    const L = FEED_LIFECYCLE;
    /* Lifecycle ONLY (Brendon, 2026-07-06): the mid-ladder milestone pills
       (First Blood → Hi-Def) came OFF the rail — too noisy. The banner carries
       just the three big moments: upload, graduation, sold out. */
    for (const u of feed.uploads ?? []) {
        push(u.slug, u.title, L.upload.label, L.upload.glyph, u.uploaded_at);
    }
    for (const m of feed.minting_now ?? []) {
        push(m.slug, m.title, L.upload.label, L.upload.glyph, m.uploaded_at);
        push(m.slug, m.title, L.graduated.label, L.graduated.glyph, m.reached_at);
        push(m.slug, m.title, L.ascension.label, L.ascension.glyph, m.sold_out_at);
    }
    return evs
        .sort((a, b) => b.ts - a.ts)
        .slice(0, AUTO_LIMIT)
        .map((e) => ({ glyph: vs(e.glyph), tag: e.tag, title: e.title, meta: fmtNewsWhen(e.ts), href: `/art/${e.slug}` }));
}

/* Curated first, then the auto moments. */
/* The Dispatch pill — the standing front-page pointer to the morning paper.
   Leads the rail every day (Brendon greenlit The Dispatch 2026-07-12);
   ▤ = the printed-page glyph (new vocabulary entry, see GLYPHS.md). */
const DISPATCH_PILL: NewsItem = {
    glyph: '▤︎',
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

export function buildNewsItems(feed: HomeResponse | null, dispatchMeta?: string): NewsItem[] {
    const dispatch = dispatchMeta ? { ...DISPATCH_PILL, meta: dispatchMeta } : DISPATCH_PILL;
    return [dispatch, ...CURATED_NEWS, ...autoNewsItems(feed)];
}
