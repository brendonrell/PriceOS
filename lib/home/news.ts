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
import { MINTING_NOW_THRESHOLD, type HomeResponse, type HomeMintingRow, type HomeUploadRow } from './homeData';
import type { HomeYouResponse } from '../../app/api/home/you/route';
import { getProject, projectsByArtist } from '../project/registry';
import { FEED_LIFECYCLE, milestoneByKey } from './milestones';
import { gasRead } from '../gas/read';
import { formatWindowRemaining } from '../artists/window';

/* Curated feature pills baked into the code — Brendon's editorial line before
   there was a screen for it. Kept as a slot; the live editorial cards now come
   off the God Mode store and arrive in the home payload (curatedItems below). */
export const CURATED_NEWS: NewsItem[] = [];

/* Brendon's Cards — the editorial pills he writes in God Mode. They ride the
   rail exactly like the auto pills; a card with a link taps through. */
function curatedItems(feed: HomeResponse | null): NewsItem[] {
    return (feed?.curated ?? []).map((c) => ({
        glyph: c.glyph ? vs(c.glyph) : undefined,
        tag: c.tag,
        title: c.title,
        meta: c.meta ?? undefined,
        href: c.href ?? undefined,
    }));
}

/* Cap on auto pills so the rail stays a highlight reel, not the firehose.
   Raised 12 → 24 (Brendon, 2026-07-29 — "there should be more"). */
const AUTO_LIMIT = 24;
/* Per-family caps on the standing pills — the rail loops, so a long tail of
   near-identical progress bars just makes the cycle slower. */
const PROGRESS_LIMIT = 5;
/* How close to the Now Minting threshold a project has to be before the rail
   calls it out. */
const GRADUATION_WATCH = 5;
/* The most cards any ONE kind of moment can take. Graduations are the loud
   family — this is what stops them owning the whole rail. */
const FAMILY_LIMIT = 3;
/* One of YOUR OWN cards every this-many slots on the rail. */
const YOURS_EVERY = 3;

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

/* "34 days ago" / "6 hours ago" / "just now" — how long something has been
   sitting. Used where the AGE is the point (an offer you left out there),
   not the clock time. */
function fmtAgo(ms: number): string {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'} ago`;
    if (s < 60) return 'just now';
    if (s < 3600) return unit(Math.floor(s / 60), 'minute');
    if (s < 86400) return unit(Math.floor(s / 3600), 'hour');
    return unit(Math.floor(s / 86400), 'day');
}

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

    /* A POTPOURRI, NOT A PARADE (Brendon, 2026-07-29). Newest-first alone
       means one busy day of graduations fills every slot and the rail reads as
       the same card over and over. So the stream is dealt out in ROUNDS: one
       card from each family, then a second from each, and so on — every family
       present before any family repeats, recency deciding the order inside a
       family and which family leads. A family also can't take more than its
       share of the rail. */
    const byFamily = new Map<string, Moment[]>();
    for (const m of moments.sort((a, b) => b.ts - a.ts)) {
        const fam = byFamily.get(m.tag) ?? [];
        fam.push(m);
        byFamily.set(m.tag, fam);
    }
    const families = [...byFamily.values()];
    const dealt: Moment[] = [];
    for (let round = 0; round < FAMILY_LIMIT && dealt.length < AUTO_LIMIT; round += 1) {
        for (const fam of families) {
            if (dealt.length >= AUTO_LIMIT) break;
            if (fam[round]) dealt.push(fam[round]);
        }
    }
    return dealt
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
            glyph: vs('✦'), tag,
            title: titleOf(p.m.slug, p.m.title),
            meta: `${p.m.minted_count} / ${p.m.max_supply}`,
            href: `/art/${p.m.slug}`,
        });
    }

    /* ABOUT TO GRADUATE — the uploads a handful of mints away from Now
       Minting. The most actionable line on the page: it's the only window
       where someone can still be early (Brendon, 2026-07-29). */
    const climbing = (feed.uploads ?? [])
        .map((u) => ({ u, away: MINTING_NOW_THRESHOLD - u.minted_count }))
        .filter((c) => c.away > 0 && c.away <= GRADUATION_WATCH)
        .sort((a, b) => a.away - b.away)
        .slice(0, PROGRESS_LIMIT);
    for (const c of climbing) {
        out.push({
            glyph: vs('⟢'), cls: 'af-ic--grad', tag: 'ALMOST GRADUATED',
            title: titleOf(c.u.slug, c.u.title),
            meta: `${c.away} ${c.away === 1 ? 'mint' : 'mints'} away`,
            href: `/art/${c.u.slug}`,
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
       turning over daily so the rail keeps saying something new. Glyph is
       ⌑ — the canonical Profile Tags mark (MyPdSection door,
       ProfileTagsConfirmModal); this card used the generic ☻ collector
       glyph as a stand-in before Profile Tags had one of its own
       (Brendon, 2026-08-23). */
    const ts = feed.news?.tag_stat;
    if (ts) {
        out.push({
            glyph: vs('⌑'), tag: 'PLATFORM',
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
            glyph: vs('⚷'), tag: 'KEYCHAINS!',
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

/** The live market feed, plus the viewer's own currency when fiat mode is on. */
export interface MarketPill {
    ethUsd: number;
    gwei: number;
    /** Set only while fiat mode is on AND the rates are trusted. */
    local?: { value: number; symbol: string; code: string };
}

/* ── LIVE MARKET ──────────────────────────────────────────────────────────
   ETH and gas, straight off the gas tracker's feed. Gas carries THE READ —
   the one-word verdict, so the answer is readable at a glance without doing
   the arithmetic (Brendon, 2026-07-29). */
function marketItems(market?: MarketPill): NewsItem[] {
    if (!market) return [];
    const out: NewsItem[] = [];
    if (market.ethUsd > 0) {
        /* Fiat mode on → the price is quoted in the currency the viewer picked,
           named on the pill. Off → dollars, named the same way (Brendon,
           2026-07-31 — a bare $ never said which dollars). */
        const local = market.local;
        out.push({
            glyph: vs('⟠'), tag: 'ETH',
            title: local
                ? `${local.symbol}${Math.round(local.value).toLocaleString()} ${local.code}`
                : `$${Math.round(market.ethUsd).toLocaleString()} USD`,
            meta: 'Live',
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
        /* Louder inside the last day — the countdown stops being trivia and
           starts being a thing to act on (Brendon, 2026-07-29). */
        const soon = you.artist_window.opens_at - Date.now() <= 86_400_000;
        out.push({
            glyph: vs('✺'), tag: soon ? 'YOUR WINDOW OPENS TODAY' : 'YOUR NEXT WINDOW',
            title: fmtWindow(you.artist_window.opens_at),
            meta: 'Until you can upload again', href: '/studio',
        });
    }
    /* WAITING ON YOU — what you left in the Cart / on the Bench. ▢ is the
       Cart's own mark (GLYPHS §5); the Bench has no glyph of its own in the
       glossary, so it wears the same box rather than inventing one. */
    if (you.pending?.cart) {
        const n = you.pending.cart;
        out.push({
            glyph: vs('▢'), tag: 'IN YOUR CART',
            title: `${n} ${n === 1 ? 'piece' : 'pieces'} waiting`,
            meta: 'You left them there',
        });
    }
    if (you.pending?.bench) {
        const n = you.pending.bench;
        out.push({
            glyph: vs('▢'), tag: 'ON YOUR BENCH',
            title: `${n} ${n === 1 ? 'piece' : 'pieces'} parked`,
            meta: 'Still on the bench',
        });
    }
    /* AN ARTIST YOU FOLLOW UPLOADED — the highest-value card on the rail for
       someone coming back. ✧ is the lifecycle upload mark. */
    if (you.follow_upload) {
        const u = you.follow_upload;
        out.push({
            glyph: vs('✧'), tag: `@${u.handle} UPLOADED`,
            title: titleOf(u.slug, u.title),
            meta: fmtNewsWhen(u.ts),
            href: `/art/${u.slug}`,
        });
    }
    /* THEIR NEXT WINDOW — when the artist you follow can upload again. Same
       ✺ artist mark the Starred/Wishlist rows wear. */
    if (you.follow_window) {
        out.push({
            glyph: vs('✺'), tag: 'THEY UPLOAD AGAIN IN',
            title: fmtWindow(you.follow_window.opens_at),
            meta: `@${you.follow_window.handle}`,
            href: `/${you.follow_window.handle}`,
        });
    }
    /* YOUR WISHLIST MOVED — a piece you wanted changed hands. ✛ is the
       Wishlist glyph (GLYPHS §5 — never a heart). */
    if (you.wishlist_moved) {
        const w = you.wishlist_moved;
        out.push({
            glyph: vs('✛'), tag: 'YOUR WISHLIST MOVED',
            title: w.count > 1
                ? `${w.count} pieces changed hands`
                : `${titleOf(w.slug)} #${w.token_id}`,
            meta: fmtNewsWhen(w.ts),
            href: `/art/${w.slug}/${w.token_id}`,
        });
    }
    /* OFFERS — what's on your pieces, and the one you left out there. ⇌ is
       the Exchange/trade mark the Open To Trades tag wears. */
    if (you.offers_in) {
        const o = you.offers_in;
        out.push({
            glyph: vs('⇌'), tag: 'OFFERS ON YOUR PIECES',
            title: `${o.count} live ${o.count === 1 ? 'offer' : 'offers'}`,
            meta: o.top_eth > 0 ? `Top ${eth(o.top_eth)}` : fmtNewsWhen(o.ts),
        });
    }
    if (you.offer_out) {
        const o = you.offer_out;
        out.push({
            glyph: vs('⇌'), tag: 'YOUR OFFER IS STILL OUT',
            title: o.token_id
                ? `${titleOf(o.slug)} #${o.token_id}`
                : `${titleOf(o.slug)} · collection`,
            meta: `Sent ${fmtAgo(o.ts)}`,
            href: o.token_id ? `/art/${o.slug}/${o.token_id}` : `/art/${o.slug}`,
        });
    }
    /* A LIVE TAKEOVER — a clock either way. ⚑ is the raid flag (GLYPHS §12). */
    if (you.takeover) {
        const t = you.takeover;
        out.push({
            glyph: vs('⚑'), tag: t.role === 'target' ? 'A TAKEOVER IS ON YOU' : 'YOUR TAKEOVER IS LIVE',
            title: `${titleOf(t.slug)} · ${t.tokens} ${t.tokens === 1 ? 'piece' : 'pieces'}`,
            meta: `${fmtWindow(t.expires_at)} left`,
            href: `/art/${t.slug}`,
        });
    }
    /* YOUR NEMESIS — the rival you declared. ☍ is the Nemesis mark (§12g). */
    if (you.nemesis?.handle) {
        out.push({
            glyph: vs('☍'), tag: 'YOUR NEMESIS',
            title: `@${you.nemesis.handle}`,
            meta: 'Declared rival',
            href: `/${you.nemesis.handle}`,
        });
    }
    /* TOP COUNTERPARTY — who you actually deal with. */
    if (you.counterparty?.handle) {
        const c = you.counterparty;
        out.push({
            glyph: vs('≍'), tag: 'YOU DEAL WITH THEM MOST',
            title: `@${c.handle}`,
            meta: `${c.deals} ${c.deals === 1 ? 'deal' : 'deals'} between you`,
            href: `/${c.handle}`,
        });
    }
    /* YOUR OATH — the faction you swore to. ⚐ is the war banner, hollow —
       never ⚑, which is the takeover's money flag. */
    if (you.faction) {
        out.push({
            glyph: vs('⚐'), tag: 'SWORN TO',
            title: you.faction.name,
            meta: you.faction.defections > 0
                ? `${you.faction.defections} ${you.faction.defections === 1 ? 'defection' : 'defections'}`
                : 'Loyal since your oath',
        });
    }
    /* MUTUALS OPEN TO TRADES — people who follow you back and want a swap. */
    if (you.traders) {
        const t = you.traders;
        out.push({
            glyph: vs('⇌'), tag: 'OPEN TO TRADES',
            title: t.count === 1
                ? `@${t.handle} wants a swap`
                : `${t.count} mutuals are open`,
            meta: t.count === 1 ? 'One of your mutuals' : 'Bring them a swap',
            href: t.count === 1 ? `/${t.handle}` : undefined,
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

/* ── THE GREETING ─────────────────────────────────────────────────────────
   Says hello in the viewer's OWN hour (Brendon, 2026-07-29), and carries a
   live platform stat under it so the card earns its place. Computed after
   mount like every other clock-derived pill. */
export function greetingOfDay(now = new Date()): string {
    const h = now.getHours();
    /* One visit in ten drops the shout for the shorthand — gm / gn, lowercase
       (Brendon, 2026-07-29 — "for fun"). Only morning and night have one; the
       afternoon and evening greetings always read in full. */
    const casual = Math.random() < 0.1;
    if (h < 5) return casual ? 'gn' : 'GOOD NIGHT';
    if (h < 12) return casual ? 'gm' : 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    if (h < 22) return 'GOOD EVENING';
    return casual ? 'gn' : 'GOOD NIGHT';
}

/* This viewer's PREVIOUS visit to home (Unix ms), then stamps this one. Call it
   on every visit so the mark stays fresh; the caller decides whether to use the
   value. Null the first time here, or when storage is unavailable. */
const LAST_VISIT_KEY = 'pd_home_last_visit';
export function lastVisitStamp(): number | null {
    try {
        const raw = window.localStorage.getItem(LAST_VISIT_KEY);
        window.localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
}

function greetingItem(
    greeting: string,
    feed: HomeResponse | null,
    sinceVisit: number | null,
): NewsItem {
    /* ◷ is PD's established clock mark (GLYPHS §12) — the greeting is a
       time-of-day pill, so it wears the time glyph. */
    const glyph = vs('◷');

    /* The default stat: projects uploaded in the last 24 hours — and two visits
       in ten, the same count measured from when YOU were last here instead
       (Brendon, 2026-07-29). The "since you left" window only shows when
       there's a stored previous visit and something actually landed in it;
       otherwise the rolling day stands. */
    const uploadedSince = (from: number) =>
        [...(feed?.uploads ?? []), ...(feed?.minting_now ?? [])]
            .filter((r) => r.uploaded_at != null && r.uploaded_at >= from).length;
    const noun = (n: number) => `${n} new ${n === 1 ? 'project' : 'projects'}`;

    if (sinceVisit != null) {
        const n = uploadedSince(sinceVisit);
        if (n > 0) {
            return { glyph, tag: greeting, title: noun(n), meta: 'Since your last visit' };
        }
    }
    const last24 = uploadedSince(Date.now() - 86_400_000);
    if (last24 > 0) {
        return { glyph, tag: greeting, title: noun(last24), meta: 'Uploaded in 24 hours' };
    }

    const live = (feed?.minting_now ?? []).filter(
        (m) => m.sold_out_at == null && m.max_supply > 0 && m.minted_count < m.max_supply,
    ).length;
    if (live > 0) {
        return {
            glyph, tag: greeting,
            title: `${live} ${live === 1 ? 'project is' : 'projects are'} minting`,
            meta: 'Right now on PD',
        };
    }
    return {
        glyph, tag: greeting,
        title: `${(feed?.stats?.minted ?? 0).toLocaleString()} pieces minted`,
        meta: 'On PD so far',
    };
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
    market?: MarketPill;
    /** The viewer's own signals — absent when signed out. */
    you?: HomeYouResponse | null;
    /** The doors the quiet-feature pills open. Omitted → those pills sit out
        rather than shipping as dead chrome. */
    doors?: FeatureDoors;
    /** The viewer's own time-of-day hello, from greetingOfDay(). */
    greeting?: string;
    /** When this viewer was last here (Unix ms), from lastVisitStamp(). Set on
        the 2-in-10 visits that measure the greeting's count from then instead
        of the rolling 24 hours; omitted the rest of the time. */
    sinceVisit?: number | null;
    /** Per-visit shuffle seed. Set after mount (like the day pills), so the
        server paint and the first client paint agree on the plain order and
        every visit gets its own running order. Omitted → no shuffle. */
    seed?: number;
}

/** How the feature pills reach the surfaces that live behind modals. */
export interface FeatureDoors {
    openKeychains: () => void;
    openStickers: () => void;
}

/* The rail's running order is shuffled per visit (Brendon, 2026-07-29 — "they
   should be more randomized"). The sort key is a hash of the seed AND the
   pill's own identity — CONTENT-keyed, not index-keyed — so a pill that lands
   late (gas, your own signals, the feed) slots into its own place instead of
   re-dealing the whole rail and cutting the glide. */
function shuffleKey(seed: number, item: NewsItem): number {
    const s = `${seed}|${item.kind ?? 'text'}|${item.tag ?? ''}|${item.title ?? ''}|${item.name ?? ''}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function buildNewsItems(feed: HomeResponse | null, day: DayPills = {}): NewsItem[] {
    /* The Dispatch leads the rail every day — it sits out of the shuffle. */
    const lead: NewsItem = day.dispatchMeta ? { ...DISPATCH_PILL, meta: day.dispatchMeta } : DISPATCH_PILL;
    const rest: NewsItem[] = [];
    if (day.greeting) rest.push(greetingItem(day.greeting, feed, day.sinceVisit ?? null));
    if (day.priceDay) {
        rest.push({
            glyph: vs('✶'), tag: 'WELCOME TO',
            title: `PriceDay #${day.priceDay.n}`, meta: day.priceDay.date,
        });
    }
    if (day.mood) {
        rest.push({
            glyph: vs('◉'), tag: 'MOOD RING',
            title: day.mood.name, meta: day.mood.hex,
        });
    }
    /* Base order (what an unshuffled rail reads as): the day's standing pills,
       then whatever the platform is doing, then the newest faces, then the
       live market, and the quiet features last. */
    rest.push(...CURATED_NEWS, ...curatedItems(feed));
    if (feed) rest.push(...standingItems(feed), ...momentItems(feed), ...faceItems(feed));
    rest.push(...marketItems(day.market), ...(day.doors ? featurePills(day.doors) : []));

    /* YOUR OWN cards are kept in their own pile and dealt back in every third
       slot, so the rail reads as YOURS rather than as the platform's — a
       personalized potpourri, not a parade (Brendon, 2026-07-29). Signed out
       there's no pile and the rail is simply the platform's. */
    const mine = youItems(day.you);
    if (day.seed != null) {
        const key = (i: NewsItem) => shuffleKey(day.seed as number, i);
        rest.sort((a, b) => key(a) - key(b));
        mine.sort((a, b) => key(a) - key(b));
    }
    const woven: NewsItem[] = [];
    let m = 0;
    for (const item of rest) {
        woven.push(item);
        if (m < mine.length && woven.length % YOURS_EVERY === 0) {
            woven.push(mine[m]);
            m += 1;
        }
    }
    // Anything left over (a short rail, a long pile) rides the tail.
    woven.push(...mine.slice(m));
    return [lead, ...woven];
}
