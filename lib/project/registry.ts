/*
 * Project registry — the single source of static Project definitions.
 *
 * Every Project conforms to ProjectDef (lib/project/types.ts). Adding a new
 * Project is one engine file + one entry here (+ a DB row for dynamic state).
 * Dynamic state (ownership, listings, events, stats) is NOT here — it's DB.
 *
 * Trait layering: each ProjectDef carries the ARTIST trait schema; this module
 * appends the platform **Fate** trait (lib/project/fate.ts) so every Output on
 * every Project carries a Fate regardless of artist traits. `fullTraitSchema()`
 * and `outputTraits()` return the merged view the UI/API should consume.
 */

import type { ProjectDef, TraitSchema, OutputTraits, TraitDef } from './types';
import { renderPrisms, prismsTraits, prismsSchema } from '../art/engines/prisms';
import { renderOracle, oracleTraits, oracleSchema } from '../art/engines/oracle';
import { normalizePlaylistId } from './soundtrack';
import { FATE_VALUES, outputFate } from './fate';

/* The platform Fate trait, appended to every Project's schema. Flat (no
   subtraits) — the value already drills from a single hexagram cast. */
export const FATE_TRAIT: TraitDef = {
  name: 'Fate',
  values: FATE_VALUES,
};

const oraclePlaylist = normalizePlaylistId(
  'https://www.youtube.com/playlist?list=PL0mSnUSmZIvtjiGDNIyaJ_ZB5SF33YIWu',
);

const PRISMS: ProjectDef = {
  slug: 'prisms',
  displayName: 'PRISMS',
  artistHandle: 'opus4-6',
  outputs: 256,
  colorway: '#5A2EA6',
  soundtrack: null,
  traitSchema: prismsSchema,
  render: renderPrisms,
  traitsOf: prismsTraits,
};

const ORACLE: ProjectDef = {
  slug: 'oracle',
  displayName: 'ORACLE',
  artistHandle: 'opus4-6',
  outputs: 333,
  colorway: '#C4902A',
  soundtrack: oraclePlaylist
    ? { playlistId: oraclePlaylist, label: 'Wardruna — Kvitravn' }
    : null,
  traitSchema: oracleSchema,
  render: renderOracle,
  traitsOf: oracleTraits,
};

const PROJECTS: readonly ProjectDef[] = [PRISMS, ORACLE];
const BY_SLUG = new Map<string, ProjectDef>(PROJECTS.map((p) => [p.slug, p]));

/** All registered Projects. */
export function allProjects(): readonly ProjectDef[] {
  return PROJECTS;
}

/** Project by slug (case-insensitive), or null. */
export function getProject(slug: string): ProjectDef | null {
  return BY_SLUG.get(slug.toLowerCase()) ?? null;
}

/** Whether a slug names a registered Project. */
export function isProjectSlug(slug: string): boolean {
  return BY_SLUG.has(slug.toLowerCase());
}

/**
 * Render an Output's Artwork by slug. Sizes the canvas, returns aspect +
 * the Output's full traits (artist traits + Fate). Unknown slug → no paint,
 * square aspect, Fate-only traits (keeps callers safe during data drift).
 */
export function renderArtwork(
  canvas: HTMLCanvasElement,
  slug: string,
  tokenId: number,
  width: number,
): { aspect: number; traits: OutputTraits } {
  const project = getProject(slug);
  if (!project) {
    return { aspect: 1, traits: { Fate: outputFate(slug, tokenId) } };
  }
  const res = project.render(canvas, tokenId, width);
  return { aspect: res.aspect, traits: { ...res.traits, Fate: outputFate(slug, tokenId) } };
}

/** Full per-Output traits (artist traits + Fate), without painting. */
export function outputTraits(slug: string, tokenId: number): OutputTraits {
  const project = getProject(slug);
  const artist = project ? project.traitsOf(tokenId) : {};
  return { ...artist, Fate: outputFate(slug, tokenId) };
}

/** Merged trait schema (artist traits + Fate) for the filter UI. */
export function fullTraitSchema(slug: string): TraitSchema {
  const project = getProject(slug);
  const artist = project ? project.traitSchema.traits : [];
  return { traits: [...artist, FATE_TRAIT] };
}
