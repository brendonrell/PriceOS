// /api/project/[slug]/gnome?address=0x… — the Gnome read.
//
// Two duties:
//   • THE AWAKENING (Brendon, 2026-07-19) — a gnome sleeps in the hill until
//     an unknown amount of the project is minted. The threshold is seeded
//     HERE, server-side only, so it stays unknown; when the minted count
//     crosses it, the gnome wakes and is OWNED by the wallet whose mint
//     struck the hour (the minter of the crossing piece). The awakening is
//     written once to `gnomes` with a rarity cast from the project's real
//     traded volume at that moment — permanent, never updated.
//   • THE FAVOUR (address optional) — for one wallet's held pieces: tenure +
//     listing state feeding the Appraiser (FAVOUR_DAYS in gnomeVoice).
//
// Ledger-only, deterministic, $0 — same discipline as /sentiment.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { FAVOUR_DAYS } from '@/lib/project/gnomeVoice';
import { gnomeRarityForVolume, type GnomeAwakening } from '@/lib/project/gnomeWorld';
import { mulberry32, hashString } from '@/lib/art/rng';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

/* The waking hour — seeded per project, 12%–74% of the vein, never shipped
   to the client. Nobody outside this file knows the number. */
function wakeThreshold(slug: string, supply: number): number {
  const r = mulberry32(hashString(`gnome-wake:${slug}`) || 1);
  if (supply <= 0) return 22; // unknown vein — the Lucky 22 floor
  const frac = 0.12 + r() * 0.62;
  return Math.max(2, Math.min(supply, Math.round(supply * frac)));
}

export interface GnomeFavourPiece {
  token_id: number;
  /** Whole days the wallet has held the piece (latest transfer-in → now). */
  held_days: number;
  /** True when the piece has an active listing (favour withheld). */
  listed: boolean;
  /** held ≥ FAVOUR_DAYS and not listed. */
  favoured: boolean;
  /** The piece's MINT instant (Unix seconds) — the strike date the
   *  appraisal cites. Null if no MINT event on record. */
  mint_ts: number | null;
}

export interface GnomeFavourResponse {
  favour_days: number;
  pieces: GnomeFavourPiece[];
  /** Awakening state: null while the gnome still sleeps in the hill. */
  gnome: GnomeAwakening | null;
}

type GnomeRow = {
  project_id: string;
  awakened_at: string;
  owner_address: string;
  token_id: number | string;
  rarity: string;
  ask_eth: number | string | null;
  listed_at: string | null;
};

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  if (!getProject(slug)) return badRequest('Unknown project');
  const address = (req.nextUrl.searchParams.get('address') ?? '').toLowerCase();
  if (address && !ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const now = Math.floor(Date.now() / 1000);

    /* ── THE AWAKENING ──────────────────────────────────────────────────── */
    let gnomeRow: GnomeRow | null = null;
    {
      const res = await db.from('gnomes').select('*').eq('project_id', slug).maybeSingle();
      if (res.error) return serverError(res.error.message);
      gnomeRow = (res.data as GnomeRow | null) ?? null;
    }
    if (!gnomeRow) {
      const projRes = await db.from('projects').select('minted_count').eq('id', slug).maybeSingle();
      const minted = Number((projRes.data as { minted_count?: number } | null)?.minted_count ?? 0);
      const supply = getProject(slug)?.outputs ?? 0;
      const threshold = wakeThreshold(slug, supply);
      if (minted >= threshold) {
        /* The hour has struck. The owner is the minter of the crossing piece;
           if the mint event is missing, the piece's current keeper stands in
           (never fake an owner from nothing). */
        const [mintRes, holderRes, volRes] = await Promise.all([
          db.from('events').select('to_address').eq('project_id', slug).eq('type', 'MINT')
            .eq('token_id', String(threshold)).maybeSingle(),
          db.from('holders').select('owner_address').eq('project_id', slug)
            .eq('token_id', String(threshold)).maybeSingle(),
          db.from('events').select('price_eth').eq('project_id', slug),
        ]);
        const owner =
          ((mintRes.data as { to_address?: string } | null)?.to_address ??
            (holderRes.data as { owner_address?: string } | null)?.owner_address ??
            null)?.toLowerCase() ?? null;
        if (owner) {
          let volume = 0;
          for (const e of (volRes.data ?? []) as { price_eth: number | string | null }[]) {
            volume += Number(e.price_eth ?? 0);
          }
          const payload = {
            project_id: slug,
            owner_address: owner,
            token_id: threshold,
            rarity: gnomeRarityForVolume(volume),
          };
          const insert = await db.from('gnomes').upsert(
            payload as never,
            { onConflict: 'project_id', ignoreDuplicates: true },
          );
          if (insert.error) return serverError(insert.error.message);
          const reread = await db.from('gnomes').select('*').eq('project_id', slug).maybeSingle();
          gnomeRow = (reread.data as GnomeRow | null) ?? null;
        }
      }
    }

    let gnome: GnomeAwakening | null = null;
    if (gnomeRow) {
      const handleRes = await db.from('users').select('handle')
        .ilike('address', gnomeRow.owner_address).maybeSingle();
      gnome = {
        project_id: slug,
        awakened_at: gnomeRow.awakened_at,
        owner_address: gnomeRow.owner_address,
        owner_handle: (handleRes.data as { handle?: string } | null)?.handle ?? null,
        token_id: Number(gnomeRow.token_id),
        rarity: gnomeRow.rarity as GnomeAwakening['rarity'],
        ask_eth: gnomeRow.ask_eth == null ? null : Number(gnomeRow.ask_eth),
        listed_at: gnomeRow.listed_at ?? null,
      };
    }

    /* ── THE FAVOUR (only with a wallet to read for) ────────────────────── */
    if (!address) {
      return NextResponse.json({ favour_days: FAVOUR_DAYS, pieces: [], gnome } satisfies GnomeFavourResponse);
    }

    const heldRes = await db
      .from('holders')
      .select('token_id')
      .eq('project_id', slug)
      .eq('owner_address', address);
    if (heldRes.error) return serverError(heldRes.error.message);
    const tokenIds = ((heldRes.data ?? []) as { token_id: string | number }[]).map((r) => Number(r.token_id));
    if (tokenIds.length === 0) {
      return NextResponse.json({ favour_days: FAVOUR_DAYS, pieces: [], gnome } satisfies GnomeFavourResponse);
    }

    const [evRes, listRes, mintRes] = await Promise.all([
      db.from('events')
        .select('token_id, timestamp')
        .eq('project_id', slug)
        .eq('to_address', address)
        .in('token_id', tokenIds.map(String)),
      db.from('listings')
        .select('token_id')
        .eq('project_id', slug)
        .eq('active', true)
        .or(`end_time.is.null,end_time.gt.${now}`)
        .in('token_id', tokenIds.map(String)),
      db.from('events')
        .select('token_id, timestamp')
        .eq('project_id', slug)
        .eq('type', 'MINT')
        .in('token_id', tokenIds.map(String)),
    ]);
    if (evRes.error) return serverError(evRes.error.message);
    if (listRes.error) return serverError(listRes.error.message);
    if (mintRes.error) return serverError(mintRes.error.message);

    // Acquired = the LATEST transfer-in per token (a re-buy resets tenure).
    const acquired = new Map<number, number>();
    for (const e of (evRes.data ?? []) as { token_id: string | number; timestamp: number | string }[]) {
      const id = Number(e.token_id);
      const ts = Number(e.timestamp);
      if (!acquired.has(id) || ts > acquired.get(id)!) acquired.set(id, ts);
    }
    const listed = new Set(((listRes.data ?? []) as { token_id: string | number }[]).map((r) => Number(r.token_id)));
    const mintTs = new Map<number, number>();
    for (const m of (mintRes.data ?? []) as { token_id: string | number; timestamp: number | string }[]) {
      mintTs.set(Number(m.token_id), Number(m.timestamp));
    }

    const pieces: GnomeFavourPiece[] = tokenIds
      .map((id) => {
        const ts = acquired.get(id) ?? null;
        // No transfer-in on record → tenure unknown; count from nothing (0
        // days) rather than inventing history. Honest, never faked.
        const heldDays = ts != null ? Math.max(0, Math.floor((now - ts) / 86400)) : 0;
        const isListed = listed.has(id);
        return {
          token_id: id,
          held_days: heldDays,
          listed: isListed,
          favoured: heldDays >= FAVOUR_DAYS && !isListed,
          mint_ts: mintTs.get(id) ?? null,
        };
      })
      .sort((a, b) => b.held_days - a.held_days || a.token_id - b.token_id);

    return NextResponse.json({ favour_days: FAVOUR_DAYS, pieces, gnome } satisfies GnomeFavourResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
