'use client';

/*
 * Celestial Tracker — the per-token mint-sky mark.
 *
 * Every Output is born under a sky: the moon phase at its mint moment is
 * stored per token (`minted_at`). When the Celestial spell is on we surface
 * that as the moon glyph ☽ — its BRIGHTNESS set to the moon's illumination at
 * mint, so a piece born under a full moon glows and a new-moon piece is barely
 * there. Text glyph (the same ☽ the attributes panel uses) — never an emoji.
 *
 * Data rides the colorStore (mintedAt is backfilled as the gallery is browsed),
 * so the mark fills in lazily; null until this token's row has loaded.
 */

import { resolveStoredTraits, useStoredColors } from '../art/colorStore';
import { lunarPhase, lunarIllumination } from './derive';

export interface CelestialMark {
    /** Text moon glyph. */
    glyph: string;
    /** Phase name, e.g. "Waning Gibbous". */
    phase: string;
    /** Illuminated fraction 0..1 — drives the glyph's brightness. */
    illum: number;
}

export function celestialMark(slug: string, id: number): CelestialMark | null {
    const t = resolveStoredTraits(slug, id);
    if (!t?.mintedAt) return null;
    const ms = Date.parse(t.mintedAt);
    if (!Number.isFinite(ms)) return null;
    return { glyph: '☽', phase: lunarPhase(ms), illum: lunarIllumination(ms) };
}

/**
 * Hook form — subscribes to the colorStore (and triggers its load) while the
 * Celestial spell is on, returning the mint-sky mark for this token, or null
 * until its row is loaded / when the spell is off.
 */
export function useCelestialMark(slug: string, id: number, enabled: boolean): CelestialMark | null {
    // Always call the store hook (load + subscribe); pass [] when off.
    useStoredColors(enabled ? [slug] : []);
    if (!enabled) return null;
    return celestialMark(slug, id);
}

/** Brightness for the moon glyph: always faintly present, brighter when fuller. */
export function celestialOpacity(illum: number): number {
    return 0.3 + 0.7 * Math.max(0, Math.min(1, illum));
}
