// Artist profile — live read. Identity from `users`, the artist's projects from
// `projects` (by artist_address), with per-project floor (lowest active listing)
// and volume (sum of priced events) computed from the chainless ledger. Cooldown
// is read from the latest project's cooldown_until (null/inactive in the no-chain
// phase). Sparse until the artist has deployed + activity accrues.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 30; // Artist info / cooldown: 30s

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

export interface ArtistProjectSummary {
  id: string;
  title: string;
  minted_count: number;
  max_supply: number;
  floor_price_eth: string | null;
  volume_eth: string;
  /** Upload moment (Unix ms) — the project's "birth"; source for its PriceDay +
      Natal facets. Null when unknown. */
  uploaded_at: number | null;
  /** When the project crossed the Now-Minting threshold (Unix ms), or null. */
  reached_at: number | null;
  /** When the project fully sold out (Unix ms), or null. */
  sold_out_at: number | null;
  /** Project milestones reached: { "<count>": unix-ms }. */
  milestones: Record<string, number>;
}

/* The 60-day artist cooldown clock fires at UPLOAD, so cooldown_until − 60d is
   the upload moment when no dedicated uploaded_at is stamped (mirrors homeData). */
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/* JSONB { "<count>": iso } -> { "<count>": unix-ms }, dropping unparseable. */
function msMap(raw: Record<string, string> | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw) {
    for (const [k, v] of Object.entries(raw)) {
      const t = new Date(v).getTime();
      if (Number.isFinite(t)) out[k] = t;
    }
  }
  return out;
}

export interface ArtistResponse {
  address: string;
  ens_name: string | null;
  handle: string | null;
  cooldown_until: string | null;
  cooldown_active: boolean;
  cooldown_days_remaining: number;
  projects: ArtistProjectSummary[];
  total_volume_eth: string;
}

const fmt = (n: number) => String(Number(n.toFixed(4)));

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } },
): Promise<NextResponse> {
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const [userRes, projRes] = await Promise.all([
      db.from('users').select('ens_name, handle').eq('address', address).maybeSingle(),
      db
        .from('projects')
        .select('id, title, minted_count, max_supply, cooldown_until, uploaded_at, graduated_at, sold_out_at, milestones')
        .eq('artist_address', address),
    ]);
    if (projRes.error) return serverError(projRes.error.message);
    if (userRes.error) return serverError(userRes.error.message);

    const user = userRes.data as { ens_name: string | null; handle: string | null } | null;
    const projects = (projRes.data ?? []) as {
      id: string;
      title: string;
      minted_count: number | null;
      max_supply: number | null;
      cooldown_until: string | null;
      uploaded_at: string | null;
      graduated_at: string | null;
      sold_out_at: string | null;
      milestones: Record<string, string> | null;
    }[];

    // Floor (lowest active listing) + volume (sum of priced events) per project.
    const ids = projects.map((p) => p.id);
    const floorByProj: Record<string, number> = {};
    const volByProj: Record<string, number> = {};
    if (ids.length > 0) {
      const [lRes, eRes] = await Promise.all([
        db.from('listings').select('project_id, price_eth').in('project_id', ids).eq('active', true),
        db.from('events').select('project_id, price_eth').in('project_id', ids).not('price_eth', 'is', null),
      ]);
      if (lRes.error) return serverError(lRes.error.message);
      if (eRes.error) return serverError(eRes.error.message);
      for (const l of (lRes.data ?? []) as { project_id: string; price_eth: number | string }[]) {
        const p = Number(l.price_eth);
        if (floorByProj[l.project_id] === undefined || p < floorByProj[l.project_id]) {
          floorByProj[l.project_id] = p;
        }
      }
      for (const e of (eRes.data ?? []) as { project_id: string; price_eth: number | string }[]) {
        volByProj[e.project_id] = (volByProj[e.project_id] ?? 0) + Number(e.price_eth);
      }
    }

    const now = Date.now();
    let cooldownUntil: string | null = null;
    for (const p of projects) {
      if (p.cooldown_until && (cooldownUntil === null || new Date(p.cooldown_until) > new Date(cooldownUntil))) {
        cooldownUntil = p.cooldown_until;
      }
    }
    const cooldownActive = !!cooldownUntil && new Date(cooldownUntil).getTime() > now;
    const daysRemaining = cooldownActive
      ? Math.ceil((new Date(cooldownUntil as string).getTime() - now) / 86_400_000)
      : 0;

    let totalVol = 0;
    const projectsOut: ArtistProjectSummary[] = projects.map((p) => {
      const v = volByProj[p.id] ?? 0;
      totalVol += v;
      return {
        id: p.id,
        title: p.title,
        minted_count: p.minted_count ?? 0,
        max_supply: p.max_supply ?? 0,
        floor_price_eth: floorByProj[p.id] !== undefined ? String(floorByProj[p.id]) : null,
        volume_eth: fmt(v),
        uploaded_at: p.uploaded_at
          ? new Date(p.uploaded_at).getTime()
          : p.cooldown_until
            ? new Date(p.cooldown_until).getTime() - COOLDOWN_MS
            : null,
        reached_at: p.graduated_at ? new Date(p.graduated_at).getTime() : null,
        sold_out_at: p.sold_out_at ? new Date(p.sold_out_at).getTime() : null,
        milestones: msMap(p.milestones),
      };
    });

    const response: ArtistResponse = {
      address,
      ens_name: user?.ens_name ?? null,
      handle: user?.handle ?? null,
      cooldown_until: cooldownUntil,
      cooldown_active: cooldownActive,
      cooldown_days_remaining: daysRemaining,
      projects: projectsOut,
      total_volume_eth: fmt(totalVol),
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
