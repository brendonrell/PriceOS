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
import { renderPrisms, prismsTraits, prismsSchema, PRISMS_ASPECTS } from '../art/engines/prisms';
import { renderOracle, oracleTraits, oracleSchema, ORACLE_ASPECTS } from '../art/engines/oracle';
import * as AI from '../art/engines/ai';
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
  aspects: PRISMS_ASPECTS,
  traitSchema: prismsSchema,
  render: renderPrisms,
  traitsOf: prismsTraits,
};

const ORACLE: ProjectDef = {
  slug: 'oracle',
  displayName: 'ORACLE',
  // Oracle is sonnet4-6's project (credit where due — Brendon, 2026-06-11);
  // Prisms is opus4-6's. An artist may run several projects; the 60-day
  // cooldown only starts when one of theirs MINTS OUT.
  artistHandle: 'sonnet4-6',
  outputs: 333,
  colorway: '#C4902A',
  mintPriceEth: 0,
  soundtrack: oraclePlaylist
    ? { playlistId: oraclePlaylist, label: 'Wardruna — Kvitravn' }
    : null,
  aspects: ORACLE_ASPECTS,
  traitSchema: oracleSchema,
  render: renderOracle,
  traitsOf: oracleTraits,
};

/* ── AI sample projects (Brendon, 2026-06-11) ────────────────────────────
 * 22 simulated-cohort Projects. Engines + verified trait casts live in
 * lib/art/engines/ai/. Every artist handle carries the `-ai` suffix —
 * platform convention marking AI-authored sample work. */
function aiDef(
  slug: string, displayName: string, artistHandle: string, outputs: number,
  colorway: string, mintPriceEth: number, aspects: readonly number[],
  traitSchema: TraitSchema, render: ProjectDef['render'], traitsOf: ProjectDef['traitsOf'],
): ProjectDef {
  return {
    slug, displayName, artistHandle, outputs, colorway, mintPriceEth,
    soundtrack: null, aspects, traitSchema, render, traitsOf,
  };
}

const AI_PROJECTS: readonly ProjectDef[] = [
  aiDef('full-faith-credit', 'Full Faith & Credit', 'mintcondition-ai', 888, '#1C4428', 0.08, AI.FAITH_ASPECTS, AI.faithSchema, AI.renderFaith, AI.faithTraits),
  aiDef('delisted', 'Delisted', 'lastprice-ai', 512, '#27C08A', 0.05, AI.DELISTED_ASPECTS, AI.delistedSchema, AI.renderDelisted, AI.delistedTraits),
  aiDef('the-river-disagrees', 'The River Disagrees', 'countyline-ai', 256, '#36A8C8', 0.12, AI.RIVER_ASPECTS, AI.riverSchema, AI.renderRiver, AI.riverTraits),
  aiDef('stars-nobody-named', 'Stars Nobody Named', 'nightclerk-ai', 333, '#FFD24A', 0.07, AI.STARS_ASPECTS, AI.starsSchema, AI.renderStars, AI.starsTraits),
  aiDef('thank-you-no-refunds', 'Thank You, No Refunds', 'regfour-ai', 1024, '#FF5A8A', 0.02, AI.REFUNDS_ASPECTS, AI.refundsSchema, AI.renderRefunds, AI.refundsTraits),
  aiDef('elevations', 'Elevations', 'walkup-ai', 404, '#3C5E8C', 0.06, AI.ELEVATIONS_ASPECTS, AI.elevationsSchema, AI.renderElevations, AI.elevationsTraits),
  aiDef('dyed-in-the-wool', 'Dyed In The Wool', 'dyelot-ai', 222, '#C84A98', 0.15, AI.WOOL_ASPECTS, AI.woolSchema, AI.renderWool, AI.woolTraits),
  aiDef('noise-from-below', 'Noise From Below', 'fathom-ai', 128, '#8A6E3C', 0.18, AI.BELOW_ASPECTS, AI.belowSchema, AI.renderBelow, AI.belowTraits),
  aiDef('letters-never-sent', 'Letters Never Sent', 'deadletter-ai', 96, '#D61A3C', 0.21, AI.LETTERS_ASPECTS, AI.lettersSchema, AI.renderLetters, AI.lettersTraits),
  aiDef('crosstown', 'Crosstown', 'nightnetwork-ai', 144, '#1D4FB8', 0.22, AI.CROSSTOWN_ASPECTS, AI.crosstownSchema, AI.renderCrosstown, AI.crosstownTraits),
  aiDef('average-contents-forty', 'Average Contents Forty', 'strikeanywhere-ai', 640, '#FF7A2B', 0.04, AI.CONTENTS_ASPECTS, AI.contentsSchema, AI.renderContents, AI.contentsTraits),
  aiDef('crossette', 'Crossette', 'shellcount-ai', 365, '#FFD514', 0.09, AI.CROSSETTE_ASPECTS, AI.crossetteSchema, AI.renderCrossette, AI.crossetteTraits),
  aiDef('guaranteed-to-grow', 'Guaranteed To Grow', 'rowseven-ai', 500, '#0F8A3C', 0.05, AI.GROW_ASPECTS, AI.growSchema, AI.renderGrow, AI.growTraits),
  aiDef('wait-till-next-year', 'Wait Till Next Year', 'homestand-ai', 162, '#C8A85A', 0.11, AI.NEXTYEAR_ASPECTS, AI.nextYearSchema, AI.renderNextYear, AI.nextYearTraits),
  aiDef('every-light-in-town', 'Every Light In Town', 'bsides-ai', 450, '#E0202E', 0.06, AI.EVERYLIGHT_ASPECTS, AI.everyLightSchema, AI.renderEveryLight, AI.everyLightTraits),
  aiDef('nobodys-swimming', "Nobody's Swimming", 'deepend-ai', 288, '#2BB8E8', 0.1, AI.SWIMMING_ASPECTS, AI.swimmingSchema, AI.renderSwimming, AI.swimmingTraits),
  aiDef('between-the-lines', 'Between The Lines', 'secondplate-ai', 200, '#00E5FF', 0.14, AI.BETWEEN_ASPECTS, AI.betweenSchema, AI.renderBetween, AI.betweenTraits),
  aiDef('loud-on-cheap-paper', 'Loud On Cheap Paper', 'overprint-ai', 600, '#FF2BD1', 0.04, AI.CHEAPPAPER_ASPECTS, AI.cheapPaperSchema, AI.renderCheapPaper, AI.cheapPaperTraits),
  aiDef('scissors-no-plan', 'Scissors, No Plan', 'nogluedrying-ai', 350, '#FFAA00', 0.08, AI.SCISSORS_ASPECTS, AI.scissorsSchema, AI.renderScissors, AI.scissorsTraits),
  aiDef('hard-water', 'Hard Water', 'flatsea-ai', 99, '#7A00CC', 0.25, AI.HARDWATER_ASPECTS, AI.hardWaterSchema, AI.renderHardWater, AI.hardWaterTraits),
  aiDef('turf-war', 'Turf War', 'adjacency-ai', 200, '#C8FF00', 0.09, AI.TURFWAR_ASPECTS, AI.turfWarSchema, AI.renderTurfWar, AI.turfWarTraits),
  aiDef('avalanche', 'Avalanche', 'graincount-ai', 128, '#7FFFD4', 0.16, AI.AVALANCHE_ASPECTS, AI.avalancheSchema, AI.renderAvalanche, AI.avalancheTraits),
];

const PROJECTS: readonly ProjectDef[] = [PRISMS, ORACLE, ...AI_PROJECTS];
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
