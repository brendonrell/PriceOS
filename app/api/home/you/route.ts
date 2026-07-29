/*
 * GET /api/home/you?address=0x… — the news rail's VIEWER-SCOPED signals.
 *
 * Everything else on the rail is the same for everyone, so it rides the shared
 * (cached) home payload. These three are about YOU, so they can't:
 *
 *   KIN          — the collector whose holdings overlap yours most. Taste
 *                  closeness measured the only honest way we have: how many of
 *                  the same PROJECTS you both hold.
 *   RAREST       — the rarest piece you own, by the same PD Rarity rank the
 *                  character sheet leads with.
 *   ARTIST WINDOW— if you're an artist in cooldown, when your next upload
 *                  window opens.
 *
 * Public-read semantics keyed on a wallet address, exactly like the profile
 * and artist routes: no session needed, nothing private leaves.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest } from '@/lib/errors';
import { getUserHoldings, getUserOwnedSlugs } from '@/lib/profile/getUserHoldings';
import { pdRarityRank } from '@/lib/output/rarity';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

/* Rarity ranks are computed per project and memoised, but the first call on a
   project walks its whole edition set — so cap how many of your pieces we rank
   in one request. Your rarest is almost always inside any healthy sample, and
   the cap keeps a 1,000-piece wallet from stalling the rail. */
const RARITY_SCAN_LIMIT = 400;

/* Ceiling on the co-holder scan behind KIN. */
const KIN_SCAN_LIMIT = 5000;

export interface HomeYouResponse {
  /** The collector closest to your taste, by shared projects held. */
  kin: { handle: string; shared: number } | null;
  /** Your rarest piece — "#3 rarest of 105". */
  rarest: { slug: string; token_id: number; rank: number; total: number } | null;
  /** Your next upload window, when you're an artist inside the cooldown. */
  artist_window: { opens_at: number; days: number } | null;
  /** Pieces sitting in your Cart / on your Bench, waiting on you. */
  pending: { cart: number; bench: number };
  /** The newest project from an artist you follow, if it's still fresh. */
  follow_upload: { handle: string; slug: string; title: string; ts: number } | null;
  /** The soonest upload window among the artists you follow. */
  follow_window: { handle: string; opens_at: number } | null;
  /** Wishlisted pieces that changed hands recently. */
  wishlist_moved: { count: number; slug: string; token_id: string; ts: number } | null;
  /** Live offers sitting on pieces you own — count + the newest one's price. */
  offers_in: { count: number; top_eth: number; ts: number } | null;
  /** Your oldest still-open offer — the one that's been out there longest. */
  offer_out: { slug: string; token_id: string | null; price_eth: number; ts: number } | null;
  /** Your declared rival, if you've named one. */
  nemesis: { handle: string | null; address: string } | null;
  /** The wallet you've dealt with most, off the ledger. */
  counterparty: { handle: string | null; address: string; deals: number } | null;
  /** Your faction oath. */
  faction: { name: string; defections: number } | null;
  /** A live hostile takeover you're on either side of. */
  takeover: { role: 'target' | 'caster'; slug: string; tokens: number; expires_at: number } | null;
  /** Mutuals wearing Open To Trades. */
  traders: { count: number; handle: string } | null;
}

const EMPTY: HomeYouResponse = {
  kin: null, rarest: null, artist_window: null,
  pending: { cart: 0, bench: 0 }, follow_upload: null, follow_window: null, wishlist_moved: null,
  offers_in: null, offer_out: null,
  nemesis: null, counterparty: null, faction: null, takeover: null, traders: null,
};

/* Ceiling on the ledger scan behind the top-counterparty pill. */
const DEALS_SCAN_LIMIT = 500;

/* How fresh a followed artist's upload, or a wishlist move, still counts as
   news. Older than this and it's history, not a moment — same seven-day line
   the rail's first-resale pill draws. */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/* Ceilings on the viewer-scoped scans. Launch-scale wallets sit far under
   them; they exist so one enormous wishlist can't stall the rail. */
const WISHLIST_SCAN_LIMIT = 500;
const FOLLOW_SCAN_LIMIT = 500;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = (req.nextUrl.searchParams.get('address') ?? '').toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const [mySlugs, myHoldings, coolRes] = await Promise.all([
      getUserOwnedSlugs(address).catch(() => null),
      getUserHoldings(address).catch(() => null),
      db.from('projects').select('cooldown_until').eq('artist_address', address),
    ]);

    /* ── KIN ── the wallet sharing the most projects with you. */
    let kin: HomeYouResponse['kin'] = null;
    if (mySlugs && mySlugs.length > 0) {
      const { data } = await db
        .from('holders')
        .select('owner_address, project_id')
        .in('project_id', mySlugs)
        .limit(KIN_SCAN_LIMIT);
      const sharedBy = new Map<string, Set<string>>();
      for (const r of (data ?? []) as { owner_address: string; project_id: string }[]) {
        const owner = r.owner_address.toLowerCase();
        if (owner === address) continue;
        const set = sharedBy.get(owner) ?? new Set<string>();
        set.add(r.project_id);
        sharedBy.set(owner, set);
      }
      /* Most overlap wins; the address itself breaks ties so the answer is
         stable between reads instead of flickering between equals. */
      let best: { addr: string; shared: number } | null = null;
      for (const [addr, set] of sharedBy) {
        const shared = set.size;
        if (!best || shared > best.shared || (shared === best.shared && addr < best.addr)) {
          best = { addr, shared };
        }
      }
      if (best) {
        const { data: u } = await db
          .from('users').select('handle').eq('address', best.addr).maybeSingle();
        const handle = (u as { handle: string | null } | null)?.handle ?? null;
        // An unclaimed wallet has no profile to send anyone to — no pill.
        if (handle) kin = { handle, shared: best.shared };
      }
    }

    /* ── RAREST ── your best PD Rarity rank, as a share of the edition set so
       a #4-of-1000 correctly beats a #2-of-10. */
    let rarest: HomeYouResponse['rarest'] = null;
    let bestPct = Infinity;
    for (const h of (myHoldings ?? []).slice(0, RARITY_SCAN_LIMIT)) {
      const rr = pdRarityRank(h.slug, h.token_id);
      if (!rr || rr.total <= 0) continue;
      const pct = rr.rank / rr.total;
      if (pct < bestPct) {
        bestPct = pct;
        rarest = { slug: h.slug, token_id: h.token_id, rank: rr.rank, total: rr.total };
      }
    }

    /* ── ARTIST WINDOW ── the latest cooldown across your projects is the one
       that gates your next upload. */
    let opensAt = 0;
    for (const p of (coolRes.data ?? []) as { cooldown_until: string | null }[]) {
      const t = p.cooldown_until ? Date.parse(p.cooldown_until) : NaN;
      if (Number.isFinite(t) && t > opensAt) opensAt = t;
    }
    const now = Date.now();
    const artistWindow = opensAt > now
      ? { opens_at: opensAt, days: Math.ceil((opensAt - now) / 86_400_000) }
      : null;

    /* ── WAITING ON YOU ── what you left in the Cart / on the Bench. */
    const [cartRes, benchRes] = await Promise.all([
      db.from('cart_items').select('token_id', { count: 'exact', head: true }).eq('user_address', address),
      db.from('bench_items').select('token_id', { count: 'exact', head: true }).eq('user_address', address),
    ]);
    const pending = { cart: cartRes.count ?? 0, bench: benchRes.count ?? 0 };

    /* ── THE ARTISTS YOU FOLLOW ── their newest project, and whichever of
       them can upload again soonest. Follows are stored by @handle, so this
       walks handle → address → projects. */
    let followUpload: HomeYouResponse['follow_upload'] = null;
    let followWindow: HomeYouResponse['follow_window'] = null;
    let traders: HomeYouResponse['traders'] = null;
    const meRes = await db
      .from('users').select('handle, nemesis_address').eq('address', address).maybeSingle();
    const myRow = meRes.data as { handle: string | null; nemesis_address: string | null } | null;
    const myHandle = myRow?.handle ?? null;
    if (myHandle) {
      const [folRes, backRes] = await Promise.all([
        db.from('follows').select('following_name')
          .eq('follower_name', myHandle).limit(FOLLOW_SCAN_LIMIT),
        db.from('follows').select('follower_name')
          .eq('following_name', myHandle).limit(FOLLOW_SCAN_LIMIT),
      ]);
      const handles = (folRes.data ?? [])
        .map((r) => (r as { following_name: string }).following_name)
        .filter(Boolean);

      /* ── MUTUALS OPEN TO TRADES ── follows both ways, and they're wearing
         the tag that says bring a swap. */
      const back = new Set(
        (backRes.data ?? []).map((r) => (r as { follower_name: string }).follower_name),
      );
      const mutuals = handles.filter((h) => back.has(h));
      if (mutuals.length > 0) {
        const tRes = await db.from('users').select('handle, profile_tags').in('handle', mutuals);
        const open = (tRes.data ?? [])
          .filter((u) => Array.isArray((u as { profile_tags: unknown }).profile_tags)
            && ((u as { profile_tags: string[] }).profile_tags).includes('open-to-trades'))
          .map((u) => (u as { handle: string }).handle);
        if (open.length > 0) traders = { count: open.length, handle: open[0] };
      }

      if (handles.length > 0) {
        const uRes = await db.from('users').select('address, handle').in('handle', handles);
        const handleByAddr = new Map<string, string>();
        for (const u of (uRes.data ?? []) as { address: string; handle: string | null }[]) {
          if (u.handle) handleByAddr.set(u.address.toLowerCase(), u.handle);
        }
        const addrs = [...handleByAddr.keys()];
        if (addrs.length > 0) {
          const pRes = await db
            .from('projects').select('id, title, artist_address, uploaded_at, cooldown_until')
            .in('artist_address', addrs);
          const rows = (pRes.data ?? []) as {
            id: string; title: string; artist_address: string | null;
            uploaded_at: string | null; cooldown_until: string | null;
          }[];
          const fresh = Date.now() - FRESH_MS;
          for (const p of rows) {
            const owner = (p.artist_address ?? '').toLowerCase();
            const handle = handleByAddr.get(owner);
            if (!handle) continue;
            const up = p.uploaded_at ? Date.parse(p.uploaded_at) : NaN;
            if (Number.isFinite(up) && up >= fresh && (!followUpload || up > followUpload.ts)) {
              followUpload = { handle, slug: p.id, title: p.title, ts: up };
            }
            const cd = p.cooldown_until ? Date.parse(p.cooldown_until) : NaN;
            if (Number.isFinite(cd) && cd > Date.now()
              && (!followWindow || cd < followWindow.opens_at)) {
              followWindow = { handle, opens_at: cd };
            }
          }
        }
      }
    }

    /* ── YOUR WISHLIST MOVED ── a piece you wishlisted changed hands. */
    let wishlistMoved: HomeYouResponse['wishlist_moved'] = null;
    const wRes = await db
      .from('wishlist').select('project_id, token_id')
      .eq('user_address', address)
      .limit(WISHLIST_SCAN_LIMIT);
    const wanted = (wRes.data ?? []) as { project_id: string; token_id: string }[];
    if (wanted.length > 0) {
      const sinceSec = Math.floor((Date.now() - FRESH_MS) / 1000);
      const eRes = await db
        .from('events').select('project_id, token_id, timestamp')
        .in('project_id', [...new Set(wanted.map((w) => w.project_id))])
        .gte('timestamp', sinceSec);
      const key = (s: string, t: string) => `${s}:${t}`;
      const want = new Set(wanted.map((w) => key(w.project_id, w.token_id)));
      let count = 0;
      let newest: { slug: string; token_id: string; ts: number } | null = null;
      const seen = new Set<string>();
      for (const e of (eRes.data ?? []) as { project_id: string; token_id: string | null; timestamp: number }[]) {
        if (!e.token_id) continue;
        const k = key(e.project_id, e.token_id);
        if (!want.has(k)) continue;
        if (!seen.has(k)) { seen.add(k); count += 1; }
        const ts = e.timestamp * 1000;
        if (!newest || ts > newest.ts) newest = { slug: e.project_id, token_id: e.token_id, ts };
      }
      if (newest) wishlistMoved = { count, ...newest };
    }

    /* ── OFFERS ── what's sitting on your pieces, and what you left sitting on
       someone else's. Item offers on tokens you hold, plus collection-scope
       offers on projects you hold (a collection offer covers any piece in it).
       Trait offers need per-token matching, so they stay out rather than be
       counted wrong. */
    const nowSec = Math.floor(Date.now() / 1000);
    const liveOffer = `end_time.is.null,end_time.gt.${nowSec}`;
    let offersIn: HomeYouResponse['offers_in'] = null;
    if (mySlugs && mySlugs.length > 0) {
      const oRes = await db
        .from('offers').select('project_id, token_id, scope, price_eth, created_at')
        .in('project_id', mySlugs).eq('status', 'open').or(liveOffer);
      const mine = new Set((myHoldings ?? []).map((h) => `${h.slug}:${h.token_id}`));
      let count = 0;
      let top = 0;
      let newest = 0;
      for (const o of (oRes.data ?? []) as {
        project_id: string; token_id: string | null; scope: string | null;
        price_eth: number | string | null; created_at: string;
      }[]) {
        const onMine = o.scope === 'collection'
          ? true
          : o.token_id != null && mine.has(`${o.project_id}:${o.token_id}`);
        if (!onMine) continue;
        count += 1;
        top = Math.max(top, Number(o.price_eth ?? 0));
        newest = Math.max(newest, Date.parse(o.created_at) || 0);
      }
      if (count > 0) offersIn = { count, top_eth: top, ts: newest };
    }

    let offerOut: HomeYouResponse['offer_out'] = null;
    const outRes = await db
      .from('offers').select('project_id, token_id, price_eth, created_at')
      .eq('bidder_address', address).eq('status', 'open').or(liveOffer)
      .order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (outRes.data) {
      const o = outRes.data as {
        project_id: string; token_id: string | null;
        price_eth: number | string | null; created_at: string;
      };
      offerOut = {
        slug: o.project_id, token_id: o.token_id,
        price_eth: Number(o.price_eth ?? 0), ts: Date.parse(o.created_at) || Date.now(),
      };
    }

    /* ── THE NEMESIS ── your declared rival, if you've named one. */
    let nemesis: HomeYouResponse['nemesis'] = null;
    const nemAddr = (myRow?.nemesis_address ?? '').toLowerCase();
    if (ADDRESS_RE.test(nemAddr)) {
      const nRes = await db.from('users').select('handle').eq('address', nemAddr).maybeSingle();
      nemesis = { handle: (nRes.data as { handle: string | null } | null)?.handle ?? null, address: nemAddr };
    }

    /* ── TOP COUNTERPARTY ── the wallet you've dealt with most. Mints have no
       counterparty, so this reads transfers only. */
    let counterparty: HomeYouResponse['counterparty'] = null;
    const dealRes = await db
      .from('events').select('from_address, to_address, timestamp')
      .eq('type', 'XFER')
      .or(`from_address.eq.${address},to_address.eq.${address}`)
      .order('timestamp', { ascending: false }).limit(DEALS_SCAN_LIMIT);
    const deals = new Map<string, number>();
    for (const e of (dealRes.data ?? []) as {
      from_address: string | null; to_address: string | null;
    }[]) {
      const other = (e.from_address ?? '').toLowerCase() === address
        ? (e.to_address ?? '').toLowerCase()
        : (e.from_address ?? '').toLowerCase();
      if (!ADDRESS_RE.test(other) || other === address) continue;
      deals.set(other, (deals.get(other) ?? 0) + 1);
    }
    let bestDeal: { addr: string; n: number } | null = null;
    for (const [addr, n] of deals) {
      // Address breaks ties so the answer is stable between reads.
      if (!bestDeal || n > bestDeal.n || (n === bestDeal.n && addr < bestDeal.addr)) {
        bestDeal = { addr, n };
      }
    }
    if (bestDeal) {
      const cRes = await db.from('users').select('handle').eq('address', bestDeal.addr).maybeSingle();
      counterparty = {
        handle: (cRes.data as { handle: string | null } | null)?.handle ?? null,
        address: bestDeal.addr, deals: bestDeal.n,
      };
    }

    /* ── YOUR OATH ── the faction you're sworn to. */
    let faction: HomeYouResponse['faction'] = null;
    const fRes = await db
      .from('faction_oaths').select('faction, defections').eq('address', address).maybeSingle();
    if (fRes.data) {
      const f = fRes.data as { faction: string; defections: number | null };
      if (f.faction) faction = { name: f.faction, defections: f.defections ?? 0 };
    }

    /* ── A LIVE TAKEOVER ── cast on you, or by you. Either way it's a clock. */
    let takeover: HomeYouResponse['takeover'] = null;
    const tkRes = await db
      .from('takeovers')
      .select('caster_address, target_address, project_id, token_count, expires_at, status')
      .or(`target_address.eq.${address},caster_address.eq.${address}`)
      .eq('status', 'active')
      .order('expires_at', { ascending: true }).limit(1).maybeSingle();
    if (tkRes.data) {
      const t = tkRes.data as {
        caster_address: string; target_address: string; project_id: string;
        token_count: number; expires_at: string;
      };
      const exp = Date.parse(t.expires_at) || 0;
      if (exp > Date.now()) {
        takeover = {
          role: t.target_address.toLowerCase() === address ? 'target' : 'caster',
          slug: t.project_id, tokens: t.token_count, expires_at: exp,
        };
      }
    }

    return NextResponse.json({
      kin, rarest, artist_window: artistWindow,
      pending, follow_upload: followUpload, follow_window: followWindow,
      wishlist_moved: wishlistMoved,
      offers_in: offersIn, offer_out: offerOut,
      nemesis, counterparty, faction, takeover, traders,
    } satisfies HomeYouResponse);
  } catch (e) {
    // The rail is decoration — never fail the home page over it.
    void e;
    return NextResponse.json(EMPTY satisfies HomeYouResponse);
  }
}
