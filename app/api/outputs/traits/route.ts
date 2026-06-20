// Persist an Output's platform traits — "compute once, then save". The trait
// set (Artist / Project / PriceDay / Natal Sun·Moon·Rising / Fate + the Output
// true name) is deterministic from (slug, tokenId) plus the MINT MOMENT, so we
// compute it server-side from the row's stored `minted_at` and write it to the
// `outputs` columns. Called fire-and-forget by ArtworkCard as pieces paint (same
// self-populating model as the colour sample), so the table backfills as the
// gallery is browsed. The UI keeps computing live as the fallback until a row is
// filled, so values never differ — this just makes them durable.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject, outputTraits, outputTrueName, PLATFORM_TRAIT } from '@/lib/project/registry';
import {
  natalElement, natalModality, natalPolarity, natalRuler, natalHarmony,
  birthWeekday, birthTimeOfDay, birthSeason, lunarPhase, lunarIllumination, fateDetail,
} from '@/lib/output/derive';
import { primaryTrait, traitRarity, fateRarity, colorRarity, overallRarity } from '@/lib/output/rarity';
import { outputColorBucket } from '@/lib/art/outputColor';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { slug?: string; id?: number | string }
      | null;
    const slug = body?.slug?.trim().toLowerCase();
    const id = body?.id;
    if (!slug || id == null || !getProject(slug)) {
      return badRequest('slug and id (of a known project) are required');
    }
    const tokenId = Number(id);
    if (!Number.isFinite(tokenId)) return badRequest('Bad id');

    const sb = getSupabaseService();

    // The mint moment seeds PriceDay + the natal chart. It's stored on the row
    // (and on every existing row); fall back to the MINT event if absent.
    const { data: existing } = await sb
      .from('outputs')
      .select('minted_at')
      .eq('project_id', slug)
      .eq('token_id', String(id))
      .maybeSingle();
    const storedMintedAt = (existing as { minted_at?: string | null } | null)?.minted_at ?? null;
    let mintedAtMs: number | null = storedMintedAt != null ? new Date(storedMintedAt).getTime() : null;
    if (mintedAtMs == null) {
      const { data: mintEv } = await sb
        .from('events')
        .select('timestamp')
        .eq('project_id', slug)
        .eq('token_id', String(id))
        .eq('type', 'MINT')
        .maybeSingle();
      const ts = (mintEv as { timestamp?: number | string } | null)?.timestamp;
      if (ts != null) mintedAtMs = Number(ts) * 1000;
    }

    const project = getProject(slug)!;
    const t = outputTraits(slug, tokenId, mintedAtMs ?? undefined);
    const fd = fateDetail(slug, tokenId);

    const row: Record<string, unknown> = {
      project_id: slug,
      token_id: String(id),
      supply: project.outputs,
      artist: t[PLATFORM_TRAIT.artist] ?? null,
      project_name: t[PLATFORM_TRAIT.project] ?? null,
      true_name: outputTrueName(slug, tokenId) || null,
      fate: t[PLATFORM_TRAIT.fate] ?? null,
      updated_at: new Date().toISOString(),
      // Fate reading (I Ching hexagram detail).
      fate_hexagram: fd.hexagram,
      fate_hexagram_name: fd.hexagramName,
      fate_glyph: fd.glyph,
      fate_upper: fd.upper,
      fate_lower: fd.lower,
      fate_changing: fd.changingCount,
      fate_transformed: fd.transformed,
      fate_stable: fd.stable,
    };

    // PRIMARY artist trait (Palette etc.) + its edition-set rarity.
    const pt = primaryTrait(slug, tokenId);
    let traitFreq = null;
    if (pt) {
      row.primary_trait_name = pt.name;
      row.primary_trait_value = pt.value;
      row.primary_trait_class = pt.cls;
      traitFreq = traitRarity(slug, pt.name, pt.value);
      if (traitFreq) {
        row.trait_count = traitFreq.count;
        row.trait_rank = traitFreq.rank;
        row.trait_pct = traitFreq.pct;
      }
    }
    // Fate rarity across the edition set.
    const fFreq = fateRarity(slug, fd.fate);
    if (fFreq) { row.fate_count = fFreq.count; row.fate_rank = fFreq.rank; }
    // Colour rarity (palette-math engines only).
    const bucket = outputColorBucket(slug, tokenId);
    const cFreq = bucket ? colorRarity(slug, bucket) : null;
    if (cFreq) row.color_count = cFreq.count;
    // Overall statistical rarity from the independent axes.
    const overall = overallRarity([traitFreq, fFreq, cFreq]);
    if (overall) { row.rarity_score = overall.score; row.rarity_bits = overall.bits; }

    // Mint-moment traits + sky/calendar (only when the birth timestamp is known).
    if (mintedAtMs != null) {
      row.price_day = t[PLATFORM_TRAIT.priceDay] ?? null;
      const sun = t[PLATFORM_TRAIT.sun] ?? null;
      const moon = t[PLATFORM_TRAIT.moon] ?? null;
      row.natal_sun = sun;
      row.natal_moon = moon;
      row.natal_rising = t[PLATFORM_TRAIT.rising] ?? null;
      if (sun) {
        row.natal_element = natalElement(sun);
        row.natal_modality = natalModality(sun);
        row.natal_polarity = natalPolarity(sun);
        row.natal_ruler = natalRuler(sun);
      }
      if (sun && moon) row.natal_harmony = natalHarmony(sun, moon);
      row.birth_weekday = birthWeekday(mintedAtMs);
      row.birth_time_of_day = birthTimeOfDay(mintedAtMs);
      row.birth_season = birthSeason(mintedAtMs);
      row.lunar_phase = lunarPhase(mintedAtMs);
      row.lunar_illumination = lunarIllumination(mintedAtMs);
    }

    const { error } = await sb.from('outputs').upsert(row as never, {
      onConflict: 'project_id,token_id',
    });
    if (error) return serverError(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
