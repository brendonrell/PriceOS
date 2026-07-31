'use client';

/*
 * familiar/intel — the familiar's knowledge of YOU.
 *
 * Set-and-forget (Brendon, 2026-06-22): whatever lives in your account record
 * is something the familiar instantly knows and can drop into conversation.
 * On enable, the engine asks loadIntel() to pull two live sources —
 *
 *   • GET /api/me            → your full account row (rank, score, streak,
 *                              handle, tenure, colours, every settings list…)
 *   • GET /api/feed?address= → your activity ledger (mints, buys, sales,
 *                              listings) from which we derive hold time and
 *                              realised gain/loss client-side.
 *
 * — and turns them into short, casual "I know this about you" lines. It does
 * not react live; the engine sprinkles these into idle chatter at random, on
 * cooldowns, the longer the familiar stays on screen (the knowledge EMERGES).
 *
 * Adding a new fact is one push to a builder below; anything already stored on
 * the row is fair game with no per-field wiring beyond a humanising template.
 */

import type { UserRow } from '@/lib/supabase';

interface FeedEvent {
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    project_id: string;
    token_id: string | null; // formatted `${project_id}-${num}`
    from_address: string | null;
    to_address: string | null;
    price_eth: string | null;
    timestamp: string; // ISO
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function pieceLabel(projectId: string, tokenId: string | null): string {
    const proj = (projectId || '').toUpperCase();
    if (!tokenId) return proj || 'A PIECE';
    const num = tokenId.includes('-') ? tokenId.slice(tokenId.lastIndexOf('-') + 1) : tokenId;
    return `${proj} #${num}`;
}

function monthsBetween(aIso: string, bIso: string): number {
    const ms = Math.abs(new Date(bIso).getTime() - new Date(aIso).getTime());
    return Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
}

function holdPhrase(months: number): string {
    if (months >= 12) {
        const yrs = Math.floor(months / 12);
        return yrs === 1 ? 'OVER A YEAR' : `OVER ${yrs} YEARS`;
    }
    if (months >= 1) return `${months} MONTH${months === 1 ? '' : 'S'}`;
    return 'BARELY ANY TIME';
}

function monthYear(iso: string): string {
    try {
        const d = new Date(iso);
        return d
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            .toUpperCase();
    } catch {
        return '';
    }
}

function arrLen(v: unknown): number {
    return Array.isArray(v) ? v.length : 0;
}

/* ── row facts — everything stored about you ─────────────────────────────── */

function factsFromRow(row: UserRow): string[] {
    const out: string[] = [];
    const s = row.settings || {};

    if (row.created_at) {
        const my = monthYear(row.created_at);
        if (my) out.push(`I KNOW YOU'VE BEEN HERE SINCE ${my}.`);
    }
    if (typeof row.price_score === 'number' && row.price_score > 0) {
        out.push(`YOUR SCORE SITS AT ${row.price_score}. I COUNT IT OFTEN.`);
    }
    if (typeof row.price_streak === 'number' && row.price_streak > 0) {
        out.push(`${row.price_streak} DAYS STRAIGHT. DON'T BREAK THE STREAK.`);
    }
    if (
        typeof row.streak_best === 'number' &&
        row.streak_best > 0 &&
        row.streak_best > (row.price_streak || 0)
    ) {
        out.push(`YOUR BEST RUN WAS ${row.streak_best} DAYS. I REMEMBER IT.`);
    }
    if (row.handle) out.push(`THEY CALL YOU ${row.handle.toUpperCase()}. I KNOW.`);
    if (row.ens_name) out.push(`${row.ens_name.toUpperCase()}. A FINE NAME TO CARRY.`);
    if (row.signature_hex) {
        out.push('YOUR SECRET SIGNATURE COLOUR? I SEE IT ANYWAY.');
    }
    if (row.discord_username) {
        out.push(`I'VE SEEN YOUR OTHER FACE: ${row.discord_username.toUpperCase()} ON DISCORD.`);
    }
    const filledSlots = Array.isArray(row.showcase?.slots)
        ? row.showcase.slots.filter(Boolean).length
        : 0;
    if (filledSlots > 0) {
        out.push(`YOU PUT ${filledSlots} PIECE${filledSlots === 1 ? '' : 'S'} ON DISPLAY FOR THE WORLD.`);
    }

    // settings collections — generic count surfacing keeps this set-and-forget
    const starred = arrLen(s.starred);
    if (starred > 0) out.push(`YOU'VE STARRED ${starred} PIECE${starred === 1 ? '' : 'S'}. I NOTICED EACH ONE.`);
    const wishlist = arrLen(s.wishlist);
    if (wishlist > 0) out.push(`${wishlist} ON YOUR WISHLIST. STILL WANTING.`);
    const albums = arrLen(s.albums);
    if (albums > 0) out.push(`${albums} ALBUM${albums === 1 ? '' : 'S'}. A CURATOR AT HEART.`);
    const artistStars = arrLen(s.artistStars);
    if (artistStars > 0) out.push(`YOU KEEP ${artistStars} ARTIST${artistStars === 1 ? '' : 'S'} CLOSE.`);
    const projectStars = arrLen(s.projectStars);
    if (projectStars > 0) out.push(`${projectStars} PROJECT${projectStars === 1 ? '' : 'S'} PINNED. YOU PLAY FAVOURITES.`);
    const traitStars = arrLen(s.traitStars);
    if (traitStars > 0) out.push(`YOU EVEN STARRED ${traitStars} TRAIT${traitStars === 1 ? '' : 'S'}. THOROUGH.`);
    const soundtrackStars = arrLen(s.soundtrackStars);
    if (soundtrackStars > 0) out.push(`${soundtrackStars} SOUNDTRACK${soundtrackStars === 1 ? '' : 'S'} STARRED. YOU LISTEN.`);

    // recently viewed — the most-recent breadcrumb
    if (Array.isArray(s.breadcrumbs) && s.breadcrumbs.length) {
        const bc = String(s.breadcrumbs[0]);
        const [slug, id] = bc.split(':');
        if (slug) out.push(`YOU KEEP CIRCLING BACK TO ${pieceLabel(slug, id ? `${slug}-${id}` : null)}.`);
    }
    if (s.colorway) out.push(`YOU SEE THIS WORLD IN ${String(s.colorway).toUpperCase()}.`);
    if (s.ambient?.palette) out.push(`YOUR LIGHT GLOWS ${String(s.ambient.palette).toUpperCase()}. SUITS YOU.`);
    if (s.pwa?.converted_at) out.push("YOU INSTALLED ME TO YOUR HOME SCREEN. COZY.");

    return out;
}

/* ── feed facts — the trades they remember ───────────────────────────────── */

function factsFromFeed(events: FeedEvent[], addr: string): string[] {
    const out: string[] = [];
    const me = addr.toLowerCase();

    const minted = events.filter((e) => e.type === 'MINT' && e.to_address?.toLowerCase() === me);
    const bought = events.filter((e) => e.type === 'SALE' && e.to_address?.toLowerCase() === me);
    const sold = events.filter((e) => e.type === 'SALE' && e.from_address?.toLowerCase() === me);
    const listed = events.filter((e) => e.type === 'LIST' && e.from_address?.toLowerCase() === me);

    if (minted.length > 0) {
        out.push(`YOU'VE MINTED ${minted.length} TIME${minted.length === 1 ? '' : 'S'}. I WATCHED EVERY ONE.`);
        const m = minted[Math.floor(Math.random() * minted.length)];
        out.push(`YOU MINTED ${pieceLabel(m.project_id, m.token_id)} FROM NOTHING.`);
    }
    if (bought.length > 0) {
        const b = bought[Math.floor(Math.random() * bought.length)];
        out.push(`YOU BOUGHT ${pieceLabel(b.project_id, b.token_id)} OFF THE SECONDARY.`);
    }
    if (listed.length > 0) {
        const l = listed[0];
        if (l.price_eth) out.push(`${pieceLabel(l.project_id, l.token_id)} IS LISTED AT ${l.price_eth}◊. STILL WAITING ON A TAKER.`);
    }

    /* Deep reads — the numbers only something that watched EVERYTHING would
       know (Omniscience v2, 2026-07-01). All derived client-side from the
       same ledger; nothing new is fetched. */
    const eth = (n: number) => (Math.round(n * 1000) / 1000).toString();
    const spentOn = [...minted, ...bought]
        .map((e) => (e.price_eth != null ? Number(e.price_eth) : 0))
        .filter((n) => Number.isFinite(n) && n > 0);
    const totalSpent = spentOn.reduce((a, b) => a + b, 0);
    if (totalSpent > 0) {
        out.push(`${eth(totalSpent)}◊ SPENT HERE, ALL TOLD. I KEPT THE RECEIPTS.`);
    }
    const earned = sold
        .map((e) => (e.price_eth != null ? Number(e.price_eth) : 0))
        .filter((n) => Number.isFinite(n) && n > 0)
        .reduce((a, b) => a + b, 0);
    if (earned > 0) out.push(`${eth(earned)}◊ CAME BACK TO YOU IN SALES. SO FAR.`);

    // Biggest single purchase — the day their conviction peaked.
    let biggest: FeedEvent | null = null;
    for (const e of [...minted, ...bought]) {
        const p = e.price_eth != null ? Number(e.price_eth) : NaN;
        if (Number.isFinite(p) && p > 0 && (!biggest || p > Number(biggest.price_eth))) biggest = e;
    }
    if (biggest && Number(biggest.price_eth) > 0) {
        out.push(`YOUR BOLDEST BUY: ${pieceLabel(biggest.project_id, biggest.token_id)} AT ${biggest.price_eth}◊. I HELD MY BREATH.`);
    }

    // Never sold — the quiet flex.
    if (sold.length === 0 && minted.length + bought.length >= 3) {
        out.push('YOU HAVE NEVER SOLD. NOT ONCE. I CHECKED TWICE.');
    }

    // Where the heart lives — the project they keep coming back to.
    const perProject = new Map<string, number>();
    for (const e of [...minted, ...bought]) {
        perProject.set(e.project_id, (perProject.get(e.project_id) ?? 0) + 1);
    }
    if (perProject.size >= 2) {
        let fav = '', favN = 0;
        for (const [p, n] of perProject) if (n > favN) { favN = n; fav = p; }
        if (fav && favN >= 3) out.push(`${fav.toUpperCase()} HAS YOUR HEART. ${favN} PIECES SAY SO.`);
        out.push(`YOU'VE COLLECTED ACROSS ${perProject.size} PROJECTS. A WANDERER.`);
    }

    // Habits — the clock and calendar only a constant companion notices.
    if (minted.length >= 3) {
        const dayTally = new Map<string, number>();
        let night = 0;
        for (const m of minted) {
            const d = new Date(m.timestamp);
            const day = d.toLocaleDateString('en-US', { weekday: 'long' });
            dayTally.set(day, (dayTally.get(day) ?? 0) + 1);
            const h = d.getHours();
            if (h >= 23 || h < 5) night++;
        }
        let topDay = '', topN = 0;
        for (const [d, n] of dayTally) if (n > topN) { topN = n; topDay = d; }
        if (topDay && topN >= Math.max(2, Math.ceil(minted.length / 2))) {
            out.push(`YOU MINT ON ${topDay.toUpperCase()}S. IT'S A PATTERN NOW.`);
        }
        if (night >= Math.max(2, Math.ceil(minted.length / 2))) {
            out.push('MOST OF YOUR MINTS HAPPEN AFTER MIDNIGHT. I SAY NOTHING.');
        }
    }

    // The very first move — where it all started.
    if (events.length) {
        const first = events[events.length - 1]; // feed is newest-first
        const my = monthYear(first.timestamp);
        if (my) out.push(`YOUR FIRST MOVE HERE WAS ${pieceLabel(first.project_id, first.token_id)}, ${my}. I WAS THERE.`);
    }

    // acquisition → sale matching: hold time + realised gain/loss
    const acquisitions = new Map<string, FeedEvent[]>(); // token → acq events (asc)
    for (const e of events) {
        if (e.token_id && (
            (e.type === 'MINT' && e.to_address?.toLowerCase() === me) ||
            (e.type === 'SALE' && e.to_address?.toLowerCase() === me)
        )) {
            const list = acquisitions.get(e.token_id) ?? [];
            list.push(e);
            acquisitions.set(e.token_id, list);
        }
    }
    for (const arr of Array.from(acquisitions.values())) {
        arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    for (const sale of sold) {
        if (!sale.token_id) continue;
        const acqs = acquisitions.get(sale.token_id);
        if (!acqs || !acqs.length) {
            out.push(`YOU LET ${pieceLabel(sale.project_id, sale.token_id)} GO.`);
            continue;
        }
        // most recent acquisition before this sale
        const saleTs = new Date(sale.timestamp).getTime();
        const prior = acqs.filter((a) => new Date(a.timestamp).getTime() <= saleTs).pop() ?? acqs[0];
        const months = monthsBetween(prior.timestamp, sale.timestamp);
        const acqPrice = prior.price_eth != null ? Number(prior.price_eth) : NaN;
        const salePrice = sale.price_eth != null ? Number(sale.price_eth) : NaN;
        const label = pieceLabel(sale.project_id, sale.token_id);

        if (Number.isFinite(acqPrice) && Number.isFinite(salePrice) && acqPrice > 0) {
            if (salePrice < acqPrice) {
                out.push(`YOU SOLD ${label} FOR A LOSS. I DON'T JUDGE. MUCH.`);
            } else if (salePrice >= acqPrice * 2) {
                const mult = (salePrice / acqPrice).toFixed(1);
                out.push(`${label}? YOU SOLD IT FOR ${mult}× WHAT YOU PAID. BOLD.`);
            } else {
                out.push(`YOU SOLD ${label} GREEN. SMALL, BUT GREEN.`);
            }
        }
        if (months >= 6) {
            out.push(`YOU HELD ${label} ${holdPhrase(months)}, THEN LET IT GO.`);
        }
        const days = Math.abs(saleTs - new Date(prior.timestamp).getTime()) / 86400000;
        if (days < 3) {
            out.push(`${label} WAS YOURS FOR ${days < 1 ? 'LESS THAN A DAY' : `${Math.floor(days)} DAY${Math.floor(days) === 1 ? '' : 'S'}`}. A LIGHTNING FLIP. I BLINKED AND MISSED IT.`);
        }
    }

    // long-held pieces still in hand (acquired, never sold here)
    const soldTokens = new Set(sold.map((s) => s.token_id));
    const nowIso = new Date().toISOString();
    for (const [token, arr] of Array.from(acquisitions.entries())) {
        if (soldTokens.has(token)) continue;
        const first = arr[0];
        const months = monthsBetween(first.timestamp, nowIso);
        if (months >= 6) {
            out.push(`${pieceLabel(first.project_id, token)} HAS BEEN YOURS ${holdPhrase(months)} NOW. DIAMOND HANDS.`);
        }
    }

    // most recent move
    if (events.length) {
        const last = events[0]; // feed is newest-first
        const verb = last.type === 'MINT' ? 'MINTED'
            : last.type === 'SALE' ? (last.from_address?.toLowerCase() === me ? 'SOLD' : 'GRABBED')
            : last.type === 'LIST' ? 'LISTED'
            : 'MOVED';
        out.push(`YOUR LAST MOVE: ${verb} ${pieceLabel(last.project_id, last.token_id)}.`);
    }

    return out;
}

/* ── public API ──────────────────────────────────────────────────────────── */

/**
 * Pull the user's live record + activity and return a de-duplicated pool of
 * casual "I know this about you" lines. Resolves to [] for a signed-out user
 * or on any fetch error — the familiar simply has nothing personal to say yet.
 */
export async function loadIntel(address: string | null): Promise<string[]> {
    if (!address || typeof window === 'undefined') return [];
    const facts: string[] = [];

    try {
        const [meRes, feedRes] = await Promise.all([
            fetch('/api/me', { credentials: 'include' }).catch(() => null),
            fetch(`/api/feed?address=${encodeURIComponent(address)}&limit=100`).catch(() => null),
        ]);

        if (meRes && meRes.ok) {
            const row = (await meRes.json()) as UserRow;
            if (row && typeof row === 'object') facts.push(...factsFromRow(row));
        }
        if (feedRes && feedRes.ok) {
            const data = (await feedRes.json()) as { events?: FeedEvent[] };
            if (data?.events?.length) facts.push(...factsFromFeed(data.events, address));
        }
    } catch {
        /* network / parse — leave facts as whatever we gathered */
    }

    // de-dupe, drop empties
    return Array.from(new Set(facts.filter((f) => f && f.trim().length > 0)));
}
