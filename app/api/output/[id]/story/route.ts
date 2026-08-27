// /api/output/[id]/story — PRICE STORY: the piece's market biography,
// told as chapters computed from the real ledger (events + the full offer
// lifecycle + current book state). Sim and chain data share one shape, so
// the story is built once and works forever.
//
// Chapters (each only when its ingredient exists — a fresh mint still gets
// Birth + Today, never an empty page):
//   BIRTH ✦ · FIRST LIGHT ✹ (first listing) · THE COURTSHIP ✶ (offers and
//   their fates) · FIRST BLOOD ✦ (first sale) · THE PEAK ✦ (best sale) ·
//   THE QUIET ◷ (dormancy) · TODAY ⌂ (who holds it, where it stands).
// Glyphs are the canonical market set (docs/GLYPHS.md) — never invented.
//
// Prose is deterministic: numbers from the ledger, phrasing seeded by the
// piece (FNV) so each piece keeps its own sentences forever, no model, $0.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { priceDayNumber } from '@/lib/priceday/priceday';
import { ROYALTY_BPS } from '@/lib/market/chain';

export const dynamic = 'force-dynamic';

const VS15 = '︎';

/* Same split as the project-level story (seaportClient.ts, locked
   2026-07-02): 5% EIP-2981 royalty, 60% artist / 40% platform. */
const ARTIST_ROYALTY_SHARE = 0.6;

interface Chapter {
  key: string;
  glyph: string;
  title: string;
  /** unix seconds of the chapter's moment (Today = now). */
  ts: number;
  line: string;
  sub?: string | null;
}

function parseId(id: string): { slug: string; tokenId: string } | null {
  const idx = id.lastIndexOf('-');
  if (idx <= 0) return null;
  const slug = id.slice(0, idx).toLowerCase();
  const tokenId = id.slice(idx + 1);
  if (!/^\d+$/.test(tokenId)) return null;
  if (!getProject(slug)) return null;
  return { slug, tokenId };
}

/* FNV-1a — the same deterministic seed discipline as the scene sentences. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(seed: number, salt: number, options: T[]): T {
  return options[(seed + salt * 2654435761) % options.length >>> 0 % options.length] ?? options[0];
}

function fmtEth(n: number): string {
  return `${Number(n.toFixed(4))} ETH`;
}

function fmtDate(tsSec: number): string {
  const d = new Date(tsSec * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(aSec: number, bSec: number): number {
  return Math.floor(Math.abs(bSec - aSec) / 86400);
}

function spanWord(days: number): string {
  if (days <= 1) return 'within a day';
  if (days < 7) return `after ${days} days`;
  if (days < 60) return `after ${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? '' : 's'}`;
  return `after ${Math.round(days / 30)} months`;
}

interface EvRow {
  type: string;
  from_address: string | null;
  to_address: string | null;
  price_eth: string | number | null;
  timestamp: number;
  sale_direction: string | null;
}

interface OfferHistRow {
  bidder_address: string;
  price_eth: string | number;
  status: string;
  scope: string | null;
  created_at: string;
  resolved_at: string | null;
  end_time: number | null;
  token_id: string | null;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const parsed = parseId(params.id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;
  const project = getProject(slug);
  if (!project) return badRequest('Unknown project');
  try {
    const db = getSupabaseService();
    const now = Math.floor(Date.now() / 1000);
    const seed = fnv(`${slug}:${tokenId}`);

    const [evRes, offRes, holderRes, outRes, projRes, listRes] = await Promise.all([
      db.from('events')
        .select('type, from_address, to_address, price_eth, timestamp, sale_direction')
        .eq('project_id', slug).eq('token_id', tokenId)
        .order('timestamp', { ascending: true })
        .limit(500),
      db.from('offers')
        .select('bidder_address, price_eth, status, scope, created_at, resolved_at, end_time, token_id')
        .eq('project_id', slug)
        .or(`token_id.eq.${tokenId},scope.in.(collection,trait)`)
        .order('created_at', { ascending: true })
        .limit(300),
      db.from('holders').select('owner_address, acquired_at').eq('project_id', slug).eq('token_id', tokenId).maybeSingle(),
      db.from('outputs').select('minted_at').eq('project_id', slug).eq('token_id', tokenId).maybeSingle(),
      db.from('projects').select('floor_price_eth, title').eq('id', slug).maybeSingle(),
      db.from('listings')
        .select('price_eth, end_time, active')
        .eq('project_id', slug).eq('token_id', tokenId).eq('active', true)
        .or(`end_time.is.null,end_time.gt.${now}`)
        .maybeSingle(),
    ]);
    if (evRes.error) return serverError(evRes.error.message);
    if (offRes.error) return serverError(offRes.error.message);

    const events = (evRes.data ?? []) as EvRow[];
    // Offers that concern THIS piece: item offers on it, and criteria offers
    // that RESOLVED onto it (token stamped at accept). Open criteria offers
    // hover over the whole project — the Courtship counts only named suitors.
    const offers = ((offRes.data ?? []) as OfferHistRow[]).filter((o) => o.token_id === tokenId);

    const handleFor = async (addr: string | null): Promise<string> => {
      if (!addr) return 'someone';
      const u = await db.from('users').select('handle').eq('address', addr).maybeSingle();
      const h = (u.data as { handle?: string | null } | null)?.handle;
      return h ? `@${h}` : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    };

    const mint = events.find((e) => e.type === 'MINT');
    const sales = events.filter((e) => e.type === 'XFER' && e.price_eth != null && Number(e.price_eth) > 0);
    const lists = events.filter((e) => e.type === 'LIST');
    const plainXfers = events.filter((e) => e.type === 'XFER' && (e.price_eth == null || Number(e.price_eth) === 0));
    const mintPrice = mint?.price_eth != null ? Number(mint.price_eth) : null;
    const mintTs = mint?.timestamp ?? (() => {
      const raw = (outRes.data as { minted_at?: string | null } | null)?.minted_at;
      const ms = raw ? Date.parse(raw) : NaN;
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
    })();

    const chapters: Chapter[] = [];

    // ── BIRTH ✦ ──────────────────────────────────────────────────────────
    if (mintTs != null) {
      const minter = await handleFor(mint?.to_address ?? null);
      const pd = priceDayNumber(new Date(mintTs * 1000));
      const born = pick(seed, 1, [
        `Born to ${minter}`,
        `Minted into ${minter}'s keeping`,
        `Entered the world under ${minter}`,
      ]);
      chapters.push({
        key: 'birth', glyph: `✦${VS15}`, title: 'BIRTH', ts: mintTs,
        line: `${born}${mintPrice != null && mintPrice > 0 ? ` for ${fmtEth(mintPrice)}` : mintPrice === 0 ? ' as a free claim' : ''}.`,
        sub: `PriceDay #${pd}`,
      });
    }

    // ── FIRST LIGHT ✹ — the first time it asked for a price ─────────────
    if (lists.length > 0) {
      const first = lists[0];
      const gap = mintTs != null ? daysBetween(mintTs, first.timestamp) : null;
      const price = first.price_eth != null ? Number(first.price_eth) : null;
      const opener = pick(seed, 2, [
        'First offered to the room',
        'Stepped onto the market',
        'First asked for a price',
      ]);
      chapters.push({
        key: 'firstlight', glyph: `✹${VS15}`, title: 'FIRST LIGHT', ts: first.timestamp,
        line: `${opener}${gap != null ? ` ${gap <= 1 ? 'within a day of minting' : spanWord(gap)}` : ''}${price != null ? ` at ${fmtEth(price)}` : ''}${price != null && mintPrice != null && mintPrice > 0 && price / mintPrice >= 1.5 ? ` — ${(price / mintPrice).toFixed(1)}× its mint` : ''}.`,
        sub: lists.length > 1 ? `listed ${lists.length} times since` : null,
      });
    }

    // ── THE COURTSHIP ✶ — every suitor and their fate ────────────────────
    if (offers.length > 0) {
      const open = offers.filter((o) => o.status === 'open' && (o.end_time == null || o.end_time > now));
      const accepted = offers.filter((o) => o.status === 'accepted');
      const declined = offers.filter((o) => o.status === 'declined');
      const expired = offers.filter((o) => o.status === 'open' && o.end_time != null && o.end_time <= now);
      const cancelled = offers.filter((o) => o.status === 'cancelled');
      const bidders = new Set(offers.map((o) => o.bidder_address.toLowerCase())).size;
      const best = Math.max(...offers.map((o) => Number(o.price_eth)));
      const bits: string[] = [];
      if (declined.length > 0) bits.push(`${declined.length} turned away`);
      if (expired.length > 0) bits.push(`${expired.length} left to expire`);
      if (cancelled.length > 0) bits.push(`${cancelled.length} withdrawn`);
      if (accepted.length > 0) bits.push('one finally taken');
      const suitorWord = pick(seed, 3, ['suitor', 'bidder', 'admirer']);
      chapters.push({
        key: 'courtship', glyph: `✶${VS15}`, title: 'THE COURTSHIP',
        ts: Math.floor(Date.parse(offers[offers.length - 1].created_at) / 1000) || now,
        line: `${offers.length === 1 ? `One ${suitorWord} came` : `${offers.length} offers from ${bidders} ${suitorWord}${bidders === 1 ? '' : 's'}`}, the best at ${fmtEth(best)}${bits.length ? ` — ${bits.join(', ')}` : ''}.`,
        sub: open.length > 0 ? `${open.length} still standing` : null,
      });
    }

    // ── FIRST BLOOD ✦ — the first secondary sale ─────────────────────────
    if (sales.length > 0) {
      const first = sales[0];
      const price = Number(first.price_eth);
      const buyer = await handleFor(first.to_address);
      const mult = mintPrice != null && mintPrice > 0 ? price / mintPrice : null;
      const how = first.sale_direction === 'OFFER_ACCEPT'
        ? pick(seed, 4, ['taken on an offer', 'won by a patient bid'])
        : pick(seed, 4, ['bought off the ask', 'claimed at the listed price']);
      const artistCut = price * (ROYALTY_BPS / 10000) * ARTIST_ROYALTY_SHARE;
      chapters.push({
        key: 'firstblood', glyph: `✦${VS15}`, title: 'FIRST SALE', ts: first.timestamp,
        line: `First changed hands for ${fmtEth(price)} — ${how} by ${buyer}${mult != null && mult >= 1.2 ? `, ${mult.toFixed(1)}× its mint` : ''}.`,
        sub: artistCut > 0 ? `${fmtEth(artistCut)} in royalty to @${project.artistHandle}` : mintTs != null ? `${daysBetween(mintTs, first.timestamp)} days after birth` : null,
      });
    }

    // ── THE PEAK ✦ — the best price it ever fetched (when it isn't the first) ─
    if (sales.length > 1) {
      const peak = sales.reduce((a, b) => (Number(b.price_eth) > Number(a.price_eth) ? b : a));
      if (peak !== sales[0]) {
        const price = Number(peak.price_eth);
        const holder = await handleFor(peak.to_address);
        chapters.push({
          key: 'peak', glyph: `✦${VS15}`, title: 'THE PEAK', ts: peak.timestamp,
          line: `${pick(seed, 5, ['Its finest hour', 'The high-water mark', 'The record'])} — ${fmtEth(price)}, to ${holder}. ${sales.length} sales in all.`,
          sub: null,
        });
      }
    }

    // ── THE QUIET ◷ — a long silence, when one is running ────────────────
    const lastMarketTs = Math.max(
      ...[...sales, ...lists].map((e) => e.timestamp),
      ...offers.map((o) => Math.floor(Date.parse(o.created_at) / 1000) || 0),
      mintTs ?? 0,
    );
    const quietDays = lastMarketTs > 0 ? daysBetween(lastMarketTs, now) : 0;
    if (quietDays >= 30) {
      chapters.push({
        key: 'quiet', glyph: `◷${VS15}`, title: 'THE QUIET', ts: now,
        line: pick(seed, 6, [
          `${quietDays} days of silence. The piece keeps its own counsel.`,
          `Nothing has moved in ${quietDays} days — dormant, not forgotten.`,
          `${quietDays} quiet days and counting.`,
        ]),
        sub: null,
      });
    }

    // ── TODAY ⌂ — where it stands ─────────────────────────────────────────
    const ownerAddr = (holderRes.data as { owner_address?: string; acquired_at?: string } | null)?.owner_address ?? null;
    const acquiredAt = (holderRes.data as { acquired_at?: string } | null)?.acquired_at ?? null;
    const ownerHandle = await handleFor(ownerAddr);
    const heldDays = acquiredAt ? daysBetween(Math.floor(Date.parse(acquiredAt) / 1000), now) : null;
    const listing = listRes.data as { price_eth?: number } | null;
    const floor = (projRes.data as { floor_price_eth?: number | null } | null)?.floor_price_eth;
    const todayBits: string[] = [];
    if (listing?.price_eth != null) {
      const ask = Number(listing.price_eth);
      todayBits.push(`asking ${fmtEth(ask)}`);
      if (floor != null && Number(floor) > 0) {
        const pct = (ask / Number(floor) - 1) * 100;
        todayBits.push(`${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% vs floor`);
      }
    } else {
      todayBits.push('not for sale');
    }
    if (plainXfers.length > 0) todayBits.push(`${plainXfers.length} quiet transfer${plainXfers.length === 1 ? '' : 's'} in its past`);
    chapters.push({
      key: 'today', glyph: `⌂${VS15}`, title: 'TODAY', ts: now,
      line: `${pick(seed, 7, ['Lives with', 'In the keeping of', 'Held by'])} ${ownerHandle}${heldDays != null && heldDays > 0 ? `, ${heldDays} day${heldDays === 1 ? '' : 's'} and holding` : ''} — ${todayBits.join(', ')}.`,
      sub: null,
    });

    chapters.sort((a, b) => a.ts - b.ts);
    return NextResponse.json({ project_id: slug, token_id: Number(tokenId), chapters });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
