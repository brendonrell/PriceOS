// /api/project/[slug]/story — the PROJECT's Price Story: the collection's
// market biography, chapters from the real ledger. Same shape and voice as
// the per-Output story so both render through one panel.
//
// Chapters: GENESIS ✧ (upload) · FIRST BLOOD ✶ (first mint) · GRADUATION ⟢
// (18th mint — entered Now Minting) · THE CROWD ✶ (mint progress / sellout ▲)
// · FIRST TRADE ✶ (first secondary sale) · THE PEAK ✶ (ATH) · THE QUIET ◷ ·
// TODAY ⌂ (floor, holders, open book). Milestone glyphs are the canonical
// home-feed set (docs/GLYPHS.md §8); market glyphs the §1 set.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const VS15 = '︎';

interface Chapter {
  key: string;
  glyph: string;
  title: string;
  ts: number;
  line: string;
  sub?: string | null;
}

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

function daysBetween(aSec: number, bSec: number): number {
  return Math.floor(Math.abs(bSec - aSec) / 86400);
}

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  const project = getProject(slug);
  if (!project) return badRequest('Unknown project');
  try {
    const db = getSupabaseService();
    const now = Math.floor(Date.now() / 1000);
    const seed = fnv(`project:${slug}`);

    const [evRes, projRes, holdersRes, listingsRes, offersRes] = await Promise.all([
      db.from('events')
        .select('type, to_address, price_eth, timestamp, sale_direction, token_id')
        .eq('project_id', slug)
        .order('timestamp', { ascending: true })
        .limit(2000),
      db.from('projects').select('minted_count, max_supply, floor_price_eth, cooldown_until').eq('id', slug).maybeSingle(),
      db.from('holders').select('owner_address').eq('project_id', slug),
      db.from('listings').select('*', { count: 'exact', head: true }).eq('project_id', slug).eq('active', true).or(`end_time.is.null,end_time.gt.${now}`),
      db.from('offers').select('*', { count: 'exact', head: true }).eq('project_id', slug).eq('status', 'open').or(`end_time.is.null,end_time.gt.${now}`),
    ]);
    if (evRes.error) return serverError(evRes.error.message);

    const events = (evRes.data ?? []) as { type: string; to_address: string | null; price_eth: string | number | null; timestamp: number; token_id: string | null }[];
    const proj = projRes.data as { minted_count?: number; max_supply?: number; floor_price_eth?: number | null; cooldown_until?: string | null } | null;
    const minted = proj?.minted_count ?? 0;
    const supply = proj?.max_supply ?? project.outputs;
    const holders = new Set(((holdersRes.data ?? []) as { owner_address: string }[]).map((h) => h.owner_address.toLowerCase())).size;

    const mints = events.filter((e) => e.type === 'MINT');
    const sales = events.filter((e) => e.type === 'XFER' && e.price_eth != null && Number(e.price_eth) > 0);
    const volume = sales.reduce((s, e) => s + Number(e.price_eth), 0);

    const handleFor = async (addr: string | null): Promise<string> => {
      if (!addr) return 'someone';
      const u = await db.from('users').select('handle').eq('address', addr).maybeSingle();
      const h = (u.data as { handle?: string | null } | null)?.handle;
      return h ? `@${h}` : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    };

    const chapters: Chapter[] = [];

    // GENESIS ✧ — the upload (cooldown_until − 60d, the real upload moment).
    const uploadTs = proj?.cooldown_until
      ? Math.floor(Date.parse(proj.cooldown_until) / 1000) - 60 * 86400
      : null;
    if (uploadTs != null && Number.isFinite(uploadTs)) {
      chapters.push({
        key: 'genesis', glyph: `✧${VS15}`, title: 'GENESIS', ts: uploadTs,
        line: `${pick(seed, 1, ['Arrived', 'Uploaded', 'Entered the record'])} by @${project.artistHandle} — ${supply} editions${project.mintPriceEth > 0 ? ` at ${fmtEth(project.mintPriceEth)}` : ', free to claim'}.`,
        sub: null,
      });
    }

    // FIRST BLOOD † — the first mint (the canonical milestone).
    if (mints.length > 0) {
      const first = mints[0];
      const minter = await handleFor(first.to_address);
      chapters.push({
        key: 'firstblood', glyph: `†${VS15}`, title: 'FIRST BLOOD', ts: first.timestamp,
        line: `${minter} ${pick(seed, 2, ['drew first', 'minted first', 'was first through the door'])} — #${first.token_id}.`,
        sub: uploadTs != null ? `${daysBetween(uploadTs, first.timestamp)} days after genesis` : null,
      });
    }

    // GRADUATION ⟢⟢ — the 18th mint, entering Now Minting.
    if (mints.length >= 18) {
      const g = mints[17];
      chapters.push({
        key: 'graduation', glyph: `⟢⟢${VS15}`, title: 'GRADUATED', ts: g.timestamp,
        line: `Eighteen minted — ${pick(seed, 3, ['the project stepped into Now Minting', 'the room took notice', 'officially in the conversation'])}.`,
        sub: null,
      });
    }

    // ASCENSION ▲ — sold out.
    if (supply > 0 && minted >= supply && mints.length > 0) {
      const last = mints[mints.length - 1];
      chapters.push({
        key: 'ascension', glyph: `▲${VS15}`, title: 'ASCENSION', ts: last.timestamp,
        line: `Sold out — all ${supply} editions claimed.`,
        sub: mints.length > 1 ? `${daysBetween(mints[0].timestamp, last.timestamp)} days from first to last` : null,
      });
    }

    // FIRST TRADE ✶ — the first secondary sale.
    if (sales.length > 0) {
      const first = sales[0];
      const price = Number(first.price_eth);
      const mult = project.mintPriceEth > 0 ? price / project.mintPriceEth : null;
      chapters.push({
        key: 'firsttrade', glyph: `✶${VS15}`, title: 'FIRST TRADE', ts: first.timestamp,
        line: `The secondary market opened — #${first.token_id} for ${fmtEth(price)}${mult != null && mult >= 1.2 ? `, ${mult.toFixed(1)}× mint` : ''}.`,
        sub: null,
      });
    }

    // THE PEAK ✶ — the collection ATH.
    if (sales.length > 1) {
      const peak = sales.reduce((a, b) => (Number(b.price_eth) > Number(a.price_eth) ? b : a));
      if (peak !== sales[0]) {
        chapters.push({
          key: 'peak', glyph: `✶${VS15}`, title: 'THE PEAK', ts: peak.timestamp,
          line: `${pick(seed, 4, ['The record', 'The high-water mark', 'Its finest hour'])} — #${peak.token_id} at ${fmtEth(Number(peak.price_eth))}.`,
          sub: `${sales.length} sales · ${fmtEth(volume)} traded`,
        });
      }
    }

    // THE QUIET ◷ — dormancy.
    const lastTs = events.length > 0 ? events[events.length - 1].timestamp : uploadTs ?? 0;
    const quietDays = lastTs > 0 ? daysBetween(lastTs, now) : 0;
    if (quietDays >= 30) {
      chapters.push({
        key: 'quiet', glyph: `◷${VS15}`, title: 'THE QUIET', ts: now,
        line: `${quietDays} days without a move. ${pick(seed, 5, ['The collection rests.', 'Holders are holding.', 'Nobody blinks.'])}`,
        sub: null,
      });
    }

    // TODAY ⌂ — the open book.
    const floor = proj?.floor_price_eth != null ? Number(proj.floor_price_eth) : null;
    const bits: string[] = [];
    bits.push(`${minted}/${supply} minted`);
    if (holders > 0) bits.push(`${holders} holder${holders === 1 ? '' : 's'}`);
    if (floor != null && floor > 0) bits.push(`floor ${fmtEth(floor)}`);
    if ((listingsRes.count ?? 0) > 0) bits.push(`${listingsRes.count} listed`);
    if ((offersRes.count ?? 0) > 0) bits.push(`${offersRes.count} open offer${(offersRes.count ?? 0) === 1 ? '' : 's'}`);
    chapters.push({
      key: 'today', glyph: `⌂${VS15}`, title: 'TODAY', ts: now,
      line: bits.join(' · ') + '.',
      sub: volume > 0 ? `${fmtEth(volume)} all-time secondary volume` : null,
    });

    chapters.sort((a, b) => a.ts - b.ts);
    return NextResponse.json({ project_id: slug, chapters });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
