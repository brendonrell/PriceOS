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
  // v2 colorway = the bench's custom theme hex (Brendon 2026-06-11).
  colorway: '#E8FF47',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PLUEMihO9lT7-yvLCQxUOojL_dcRNwRW06', label: 'Boards of Canada — Music Has the Right to Children' },
  aspects: PRISMS_ASPECTS,
  traitSchema: prismsSchema,
  render: renderPrisms,
  traitsOf: prismsTraits,
};

const ORACLE: ProjectDef = {
  slug: 'oracle',
  displayName: 'ORACLE',
  // Oracle is sonnet4-6's project (credit where due — Brendon, 2026-06-11);
  // Prisms is opus4-6's. An artist may have several live projects; the
  // 60-day cooldown fires at UPLOAD (a long-listed project can still be
  // minting after its artist's cooldown has expired).
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
/* Soundtracks (Brendon 2026-06-11): every Project ships with a public
   YouTube playlist, matched to the work. Bare playlist ids. */
const AI_SOUNDTRACKS: Record<string, { playlistId: string; label: string }> = {
  'full-faith-credit':      { playlistId: 'PLTMN6OMDTnKmPEshAkltDlfJYLft6taZO', label: 'Tom Waits — Small Change' },
  'delisted':               { playlistId: 'OLAK5uy_mrUY03jLjKAJrWRq3UOqcvdVncCE8FDnI', label: 'Oneohtrix Point Never — Replica' },
  'the-river-disagrees':    { playlistId: 'OLAK5uy_lMvRyOBHG4AfghMmIfEOiWKhK2XPN61MY', label: 'Talk Talk — Spirit of Eden' },
  'stars-nobody-named':     { playlistId: 'PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS', label: 'Stars of the Lid — The Tired Sounds Of' },
  'thank-you-no-refunds':   { playlistId: 'PLn_xnHmgpm0ZZPxjHYsxJtcZHyw28_ARu', label: 'Vulfpeck — Thrill of the Arts' },
  'elevations':             { playlistId: 'OLAK5uy_mKWrzbnbuO-wJqnjdz4xO1nrsdD9Q0m2k', label: 'Philip Glass — Glassworks' },
  'dyed-in-the-wool':       { playlistId: 'OLAK5uy_l61jyu2-HfVxbgW4KFUruUOjU56T0az-s', label: 'Alice Coltrane — Journey in Satchidananda' },
  'noise-from-below':       { playlistId: 'PL2MEf0Id3TeFo6QBeY76d_zvOicDoG_lg', label: 'Godspeed You! Black Emperor — Lift Your Skinny Fists' },
  'letters-never-sent':     { playlistId: 'OLAK5uy_mSbOn6cyrWuZetNPYixAc37HZROz2mQ-c', label: 'Nick Drake — Pink Moon' },
  'crosstown':              { playlistId: 'OLAK5uy_mkw5lnHV_WtzF65IfSBTHqHcj_bvqiBU0', label: 'Kraftwerk — Trans-Europe Express' },
  'average-contents-forty': { playlistId: 'OLAK5uy_kXPInMykUYYKz_7UJ17_4Dc7BgCVDDDvQ', label: 'Beirut — Gulag Orkestar' },
  'crossette':              { playlistId: 'OLAK5uy_lZaWFSeS6Y0uOoEzTGgCum7NY_OQwKzIY', label: 'Handel — Music for the Royal Fireworks' },
  'guaranteed-to-grow':     { playlistId: 'OLAK5uy_khfcOEuin5PG2Z70byPFVH4nyEP_R8Bqc', label: "Mort Garson — Mother Earth's Plantasia" },
  'wait-till-next-year':    { playlistId: 'OLAK5uy_nf5Oc5sjCuOx7l5COP6thl0VsFZ1Hb3mc', label: 'The Replacements — Let It Be' },
  'every-light-in-town':    { playlistId: 'OLAK5uy_mqBA37gZOvqvvJ1-01Tu_GegOqHaHxpQ0', label: 'Otis Redding — Otis Blue' },
  'nobodys-swimming':       { playlistId: 'OLAK5uy_muokP2ArFXF_yuj0Qnh_5_QmfFMpwqFj4', label: 'Air — Moon Safari' },
  'between-the-lines':      { playlistId: 'OLAK5uy_lZKSdlPBNBgPNW1WWWZAfHOAixffO957I', label: 'Steve Reich — Music for 18 Musicians' },
  'loud-on-cheap-paper':    { playlistId: 'OLAK5uy_npVGHGqWs_-hTzVUivb8lCndQPVB7aIm0', label: 'Aphex Twin — Selected Ambient Works 85–92' },
  'scissors-no-plan':       { playlistId: 'OLAK5uy_mNqx-iWQKySNlnq4ZAZpwq3RLzOQHW3J4', label: 'Charles Mingus — Mingus Ah Um' },
  'hard-water':             { playlistId: 'OLAK5uy_nugJJjislAMW15DJOvKOuD5EudRNeRUzQ', label: 'Terry Riley — A Rainbow in Curved Air' },
  'turf-war':               { playlistId: 'OLAK5uy_lLSoxh_sHx8XnCj_mRTzkHxiUFX7PjFAE', label: 'Autechre — Amber' },
  'avalanche':              { playlistId: 'PLEoDu3_VGmF30kGGwisyIwa_p0d_j2SG_', label: 'Tim Hecker — Harmony in Ultraviolet' },
};

function aiDef(
  slug: string, displayName: string, artistHandle: string, outputs: number,
  colorway: string, mintPriceEth: number, aspects: readonly number[],
  traitSchema: TraitSchema, render: ProjectDef['render'], traitsOf: ProjectDef['traitsOf'],
): ProjectDef {
  return {
    slug, displayName, artistHandle, outputs, colorway, mintPriceEth,
    soundtrack: AI_SOUNDTRACKS[slug] ?? null, aspects, traitSchema, render, traitsOf,
  };
}

const AI_PROJECTS: readonly ProjectDef[] = [
  aiDef('full-faith-credit', 'Full Faith & Credit', 'mintcondition-ai', 888, '#1C4428', 0.08, AI.FAITH_ASPECTS, AI.faithSchema, AI.renderFaith, AI.faithTraits),
  aiDef('delisted', 'Delisted', 'lastprice-ai', 512, '#27C08A', 0.05, AI.DELISTED_ASPECTS, AI.delistedSchema, AI.renderDelisted, AI.delistedTraits),
  aiDef('the-river-disagrees', 'The River Disagrees', 'countyline-ai', 256, '#36A8C8', 0.12, AI.RIVER_ASPECTS, AI.riverSchema, AI.renderRiver, AI.riverTraits),
  aiDef('stars-nobody-named', 'Names Withheld', 'nightclerk-ai', 333, '#B026FF', 0.07, AI.STARS_ASPECTS, AI.starsSchema, AI.renderStars, AI.starsTraits),
  aiDef('thank-you-no-refunds', 'Thank You, No Refunds', 'regfour-ai', 1024, '#FF5A8A', 0.02, AI.REFUNDS_ASPECTS, AI.refundsSchema, AI.renderRefunds, AI.refundsTraits),
  aiDef('elevations', 'Elevations', 'walkup-ai', 404, '#3C5E8C', 0.06, AI.ELEVATIONS_ASPECTS, AI.elevationsSchema, AI.renderElevations, AI.elevationsTraits),
  aiDef('dyed-in-the-wool', 'Dyed In The Wool', 'dyelot-ai', 222, '#C84A98', 0.15, AI.WOOL_ASPECTS, AI.woolSchema, AI.renderWool, AI.woolTraits),
  aiDef('noise-from-below', 'Noise From Below', 'fathom-ai', 128, '#8A6E3C', 0.18, AI.BELOW_ASPECTS, AI.belowSchema, AI.renderBelow, AI.belowTraits),
  aiDef('letters-never-sent', 'Letters Never Sent', 'deadletter-ai', 96, '#D61A3C', 0.21, AI.LETTERS_ASPECTS, AI.lettersSchema, AI.renderLetters, AI.lettersTraits),
  aiDef('crosstown', 'Crosstown', 'nightnetwork-ai', 144, '#1D4FB8', 0.22, AI.CROSSTOWN_ASPECTS, AI.crosstownSchema, AI.renderCrosstown, AI.crosstownTraits),
  aiDef('average-contents-forty', 'Average Contents Forty', 'strikeanywhere-ai', 640, '#FF7A2B', 0.04, AI.CONTENTS_ASPECTS, AI.contentsSchema, AI.renderContents, AI.contentsTraits),
  aiDef('crossette', 'Use Once, Remember Always', 'shellcount-ai', 365, '#FFD514', 0.09, AI.CROSSETTE_ASPECTS, AI.crossetteSchema, AI.renderCrossette, AI.crossetteTraits),
  aiDef('guaranteed-to-grow', 'Guaranteed To Grow', 'rowseven-ai', 500, '#0F8A3C', 0.05, AI.GROW_ASPECTS, AI.growSchema, AI.renderGrow, AI.growTraits),
  aiDef('wait-till-next-year', 'Wait Till Next Year', 'homestand-ai', 162, '#C8A85A', 0.11, AI.NEXTYEAR_ASPECTS, AI.nextYearSchema, AI.renderNextYear, AI.nextYearTraits),
  aiDef('every-light-in-town', 'Every Light In Town', 'bsides-ai', 450, '#E0202E', 0.06, AI.EVERYLIGHT_ASPECTS, AI.everyLightSchema, AI.renderEveryLight, AI.everyLightTraits),
  aiDef('nobodys-swimming', "Nobody's Swimming", 'deepend-ai', 288, '#2BB8E8', 0.1, AI.SWIMMING_ASPECTS, AI.swimmingSchema, AI.renderSwimming, AI.swimmingTraits),
  aiDef('between-the-lines', 'Between The Lines', 'secondplate-ai', 200, '#00E5FF', 0.14, AI.BETWEEN_ASPECTS, AI.betweenSchema, AI.renderBetween, AI.betweenTraits),
  aiDef('loud-on-cheap-paper', 'Loud On Cheap Paper', 'overprint-ai', 600, '#FF2BD1', 0.04, AI.CHEAPPAPER_ASPECTS, AI.cheapPaperSchema, AI.renderCheapPaper, AI.cheapPaperTraits),
  aiDef('scissors-no-plan', 'Hard Splice', 'nogluedrying-ai', 350, '#FF005C', 0.08, AI.SCISSORS_ASPECTS, AI.scissorsSchema, AI.renderScissors, AI.scissorsTraits),
  aiDef('hard-water', 'Hard Water', 'flatsea-ai', 99, '#7A00CC', 0.25, AI.HARDWATER_ASPECTS, AI.hardWaterSchema, AI.renderHardWater, AI.hardWaterTraits),
  aiDef('turf-war', 'Turf War', 'adjacency-ai', 200, '#C8FF00', 0.09, AI.TURFWAR_ASPECTS, AI.turfWarSchema, AI.renderTurfWar, AI.turfWarTraits),
  aiDef('avalanche', 'Avalanche', 'graincount-ai', 128, '#7FFFD4', 0.16, AI.AVALANCHE_ASPECTS, AI.avalancheSchema, AI.renderAvalanche, AI.avalancheTraits),
  /* ── new cohort (2026-06-13) ── */
  aiDef('everyone-is-typing', 'Everyone Is Typing', 'groupchat-ai', 512, '#5865f2', 0.03, AI.CHATROOM_ASPECTS, AI.chatroomSchema, AI.renderChatroom, AI.chatroomTraits),
  aiDef('night-service', 'Night Service', 'afterhours-ai', 444, '#ff2a6d', 0.05, AI.AFTERGLOW_ASPECTS, AI.afterglowSchema, AI.renderAfterglow, AI.afterglowTraits),
  aiDef('breach-protocol', 'Breach Protocol', 'netrunner-ai', 333, '#fcee0a', 0.06, AI.BREACH_ASPECTS, AI.breachSchema, AI.renderBreach, AI.breachTraits),
  aiDef('graffiti-soul', 'Graffiti Soul', 'rudie-ai', 480, '#ff2e63', 0.04, AI.GRAFFITI_ASPECTS, AI.graffitiSchema, AI.renderGraffiti, AI.graffitiTraits),
  aiDef('teletext', 'Teletext', 'glyphfield-ai', 360, '#33ff66', 0.07, AI.ASCII_ASPECTS, AI.asciiSchema, AI.renderAscii, AI.asciiTraits),
  aiDef('chrome-dreams', 'Chrome Dreams', 'y2k-ai', 400, '#7ec8ff', 0.05, AI.CHROMEDREAMS_ASPECTS, AI.chromedreamsSchema, AI.renderChromedreams, AI.chromedreamsTraits),
  aiDef('riding-the-oil', 'Riding The Oil', 'firstchannel-ai', 600, '#5865f2', 0.03, AI.DISCORD_ASPECTS, AI.discordSchema, AI.renderDiscord, AI.discordTraits),
  aiDef('quorum', 'Quorum', 'murmur-ai', 256, '#9aa0ae', 0.12, AI.QUORUM_ASPECTS, AI.quorumSchema, AI.renderQuorum, AI.quorumTraits),
  aiDef('konkret', 'Konkret', 'konkret-ai', 200, '#c0392b', 0.09, AI.KONKRET_ASPECTS, AI.konkretSchema, AI.renderKonkret, AI.konkretTraits),
  aiDef('ode-to-rudxane', 'Ode to Rudxane', 'firstmember-ai', 200, '#1c1a17', 0.1, AI.RUDXANE_ASPECTS, AI.rudxaneSchema, AI.renderRudxane, AI.rudxaneTraits),
  aiDef('materia', 'Materia', 'lapidary-ai', 333, '#9a9a93', 0.08, AI.MATERIA_ASPECTS, AI.materiaSchema, AI.renderMateria, AI.materiaTraits),
  aiDef('weft', 'Weft', 'loomhand-ai', 222, '#b5462f', 0.09, AI.WEFT_ASPECTS, AI.weftSchema, AI.renderWeft, AI.weftTraits),
  aiDef('price-discovery', 'Price Discovery', 'thebook-ai', 256, '#ffe6a8', 0.15, AI.PRICEDISCOVERY_ASPECTS, AI.pricediscoverySchema, AI.renderPricediscovery, AI.pricediscoveryTraits),
  aiDef('liquid-light', 'Liquid Light', 'oilwheel-ai', 360, '#ff71ce', 0.05, AI.LIQUIDLIGHT_ASPECTS, AI.liquidlightSchema, AI.renderLiquidlight, AI.liquidlightTraits),
  aiDef('diffusion', 'Diffusion', 'turing-ai', 222, '#c9962e', 0.18, AI.DIFFUSION_ASPECTS, AI.diffusionSchema, AI.renderDiffusion, AI.diffusionTraits),
  aiDef('growth', 'Growth', 'coralline-ai', 222, '#00e5c8', 0.16, AI.GROWTH_ASPECTS, AI.growthSchema, AI.renderGrowth, AI.growthTraits),
  aiDef('pigment', 'Pigment', 'divisionist-ai', 256, '#1e88e5', 0.1, AI.PIGMENT_ASPECTS, AI.pigmentSchema, AI.renderPigment, AI.pigmentTraits),
  aiDef('filament', 'Filament', 'filament-ai', 200, '#7a2a22', 0.12, AI.ISKRA_ASPECTS, AI.iskraSchema, AI.renderIskra, AI.iskraTraits),
  aiDef('tessera', 'Tessera', 'tessera-ai', 333, '#ff4d6d', 0.07, AI.SIGGI_ASPECTS, AI.siggiSchema, AI.renderSiggi, AI.siggiTraits),
  aiDef('junction', 'Junction', 'truchet-ai', 333, '#00e5c8', 0.05, AI.JUNCTION_ASPECTS, AI.junctionSchema, AI.renderJunction, AI.junctionTraits),
  aiDef('asterism', 'Asterism', 'stellar-ai', 333, '#5a7bd8', 0.07, AI.ASTERISM_ASPECTS, AI.asterismSchema, AI.renderAsterism, AI.asterismTraits),
  aiDef('seedhead', 'Seedhead', 'phyllo-ai', 300, '#ffd23f', 0.06, AI.SEEDHEAD_ASPECTS, AI.seedheadSchema, AI.renderSeedhead, AI.seedheadTraits),
  aiDef('facets', 'Facets', 'shatter-ai', 360, '#457b9d', 0.05, AI.FACETS_ASPECTS, AI.facetsSchema, AI.renderFacets, AI.facetsTraits),
  aiDef('quasicrystal', 'Quasicrystal', 'aperiodic-ai', 256, '#1e88e5', 0.1, AI.QUASICRYSTAL_ASPECTS, AI.quasicrystalSchema, AI.renderQuasicrystal, AI.quasicrystalTraits),
  aiDef('circuit', 'Circuit', 'tracedeck-ai', 333, '#2bd47a', 0.06, AI.CIRCUIT_ASPECTS, AI.circuitSchema, AI.renderCircuit, AI.circuitTraits),
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
