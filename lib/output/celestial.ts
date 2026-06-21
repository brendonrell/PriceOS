'use client';

/*
 * Celestial Tracker — the per-entity "birth sky".
 *
 * The mode reads the rich celestial layer we track and surfaces it wherever
 * you are:
 *   • Output — the moon it was minted under (☽, brightness = illumination at
 *     mint) PLUS its I Ching Fate (hexagram + name). The moon needs the stored
 *     mint timestamp (fills in as pieces are browsed); the Fate is pure from
 *     (slug, id), so it's always there.
 *   • Project — its own Fate hexagram (pure from the slug), shown beside the
 *     project name.
 *
 * Every glyph here is iOS-safe text (moon ☽, the I Ching hexagram block) —
 * never an emoji. The card keeps the compact moon; the name spots carry the
 * fuller readout.
 */

import { resolveStoredTraits, useStoredColors } from '../art/colorStore';
import { lunarPhase, lunarIllumination, fateDetail } from './derive';
import { projectFateReading } from '../project/fate';

export interface CelestialMark {
    glyph: string;   // ☽
    phase: string;   // "Waning Gibbous"
    illum: number;   // 0..1
}

export interface FateMark {
    glyph: string;   // hexagram glyph
    name: string;    // "The Creative"
    n: number;       // hexagram number
}

export interface OutputCelestial {
    moon: CelestialMark | null; // null until the mint timestamp is loaded
    fate: FateMark;             // always present (pure)
}

export function celestialMark(slug: string, id: number): CelestialMark | null {
    const t = resolveStoredTraits(slug, id);
    if (!t?.mintedAt) return null;
    const ms = Date.parse(t.mintedAt);
    if (!Number.isFinite(ms)) return null;
    return { glyph: '☽', phase: lunarPhase(ms), illum: lunarIllumination(ms) };
}

export function outputCelestial(slug: string, id: number): OutputCelestial {
    const fd = fateDetail(slug, id);
    return {
        moon: celestialMark(slug, id),
        fate: { glyph: fd.glyph, name: fd.hexagramName, n: fd.hexagram },
    };
}

export function projectCelestial(slug: string): FateMark {
    const r = projectFateReading(slug);
    return { glyph: r.glyph, name: r.primary.name, n: r.primary.n };
}

/** Card hook — the compact moon only. */
export function useCelestialMark(slug: string, id: number, enabled: boolean): CelestialMark | null {
    useStoredColors(enabled ? [slug] : []);
    if (!enabled) return null;
    return celestialMark(slug, id);
}

/** Output name hook — moon + Fate. */
export function useOutputCelestial(slug: string, id: number, enabled: boolean): OutputCelestial | null {
    useStoredColors(enabled ? [slug] : []);
    if (!enabled) return null;
    return outputCelestial(slug, id);
}

/** Project name hook — the project's Fate (always available). */
export function useProjectCelestial(slug: string, enabled: boolean): FateMark | null {
    if (!enabled) return null;
    return projectCelestial(slug);
}

/** Brightness for the moon glyph: always faintly present, brighter when fuller. */
export function celestialOpacity(illum: number): number {
    return 0.3 + 0.7 * Math.max(0, Math.min(1, illum));
}
