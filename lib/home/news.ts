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
export function buildNewsItems(feed: HomeResponse | null): NewsItem[] {
    return [...CURATED_NEWS, ...autoNewsItems(feed)];
}
