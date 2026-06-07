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
import { priceDayNumber } from '../priceday/priceday';
import { natalChart } from './natal';

/* Platform trait names — stamped on EVERY Output of EVERY Project, so they ride
   into the token metadata (ERC-721 attributes) and surface on OpenSea as well
   as PD. `outputTraits()` is the single source of truth for an Output's full
   attribute set (PD trait UI + the eventual tokenURI). Order is chronological
   by "birth": identity (Artist › Project), then the mint-moment trio
   (PriceDay › Natal Sun/Moon/Rising › Fate). */
export const PLATFORM_TRAIT = {
  artist: 'Artist',
  project: 'Project',
  priceDay: 'PriceDay',
  sun: 'Sun',
  moon: 'Moon',
  rising: 'Rising',
  fate: 'Fate',
} as const;

/* Platform mint fee (the on-chain ~$2 Arweave storage fee, PDProject.sol).
   Simulated across the board but $0 for now — flip this when fees turn on. */
export const MINT_FEE_ETH = 0;

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
  mintPriceEth: 0,
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
  mintPriceEth: 0,
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

/** Projects created by an artist (by handle). */
export function projectsByArtist(handle: string): readonly ProjectDef[] {
  const h = handle.toLowerCase();
  return PROJECTS.filter((p) => p.artistHandle.toLowerCase() === h);
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

/**
 * Full per-Output traits — the canonical attribute set for an Output, in
 * birth-order: Artist › Project › (artist-defined traits) › PriceDay › Natal
 * (Sun/Moon/Rising) › Fate.
 *
 * Artist, Project and Fate are deterministic from (slug, tokenId). PriceDay and
 * the Natal chart are functions of the MINT MOMENT, so pass `mintMs` (the mint
 * event's Unix-ms timestamp) to include them; omit it and you get the
 * deterministic subset (callers without a timestamp stay valid).
 */
export function outputTraits(
  slug: string,
  tokenId: number,
  mintMs?: number,
): OutputTraits {
  const project = getProject(slug);
  const out: OutputTraits = {};
  if (project) {
    out[PLATFORM_TRAIT.artist] = `@${project.artistHandle}`;
    out[PLATFORM_TRAIT.project] = `@${project.slug}`;
  }
  // Artist-defined (project-specific) traits keep their authored order.
  Object.assign(out, project ? project.traitsOf(tokenId) : {});
  // Mint-moment traits (only when the birth timestamp is known).
  if (mintMs != null && Number.isFinite(mintMs)) {
    out[PLATFORM_TRAIT.priceDay] = `#${priceDayNumber(new Date(mintMs))}`;
    const chart = natalChart(mintMs);
    out[PLATFORM_TRAIT.sun] = chart.sun;
    out[PLATFORM_TRAIT.moon] = chart.moon;
    out[PLATFORM_TRAIT.rising] = chart.rising;
  }
  out[PLATFORM_TRAIT.fate] = outputFate(slug, tokenId);
  return out;
}

/** Merged trait schema (artist traits + Fate) for the filter UI. */
export function fullTraitSchema(slug: string): TraitSchema {
  const project = getProject(slug);
  const artist = project ? project.traitSchema.traits : [];
  return { traits: [...artist, FATE_TRAIT] };
}
