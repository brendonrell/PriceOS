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
import { ASTERISM_ASPECTS, asterismSchema, asterismTraits, renderAsterism } from '../art/engines/ai/asterism';
import { AVALANCHE_ASPECTS, avalancheSchema, avalancheTraits, renderAvalanche } from '../art/engines/ai/avalanche';
import { CONTENTS_ASPECTS, contentsSchema, contentsTraits, renderContents } from '../art/engines/ai/average-contents-forty';
import { BETWEEN_ASPECTS, betweenSchema, betweenTraits, renderBetween } from '../art/engines/ai/between-the-lines';
import { BREACH_ASPECTS, breachSchema, breachTraits, renderBreach } from '../art/engines/ai/breach-protocol';
import { CIRCUIT_ASPECTS, circuitSchema, circuitTraits, renderCircuit } from '../art/engines/ai/circuit';
import { CROSSETTE_ASPECTS, crossetteSchema, crossetteTraits, renderCrossette } from '../art/engines/ai/crossette';
import { CROSSTOWN_ASPECTS, crosstownSchema, crosstownTraits, renderCrosstown } from '../art/engines/ai/crosstown';
import { DELISTED_ASPECTS, delistedSchema, delistedTraits, renderDelisted } from '../art/engines/ai/delisted';
import { DIFFUSION_ASPECTS, diffusionSchema, diffusionTraits, renderDiffusion } from '../art/engines/ai/diffusion';
import { WOOL_ASPECTS, renderWool, woolSchema, woolTraits } from '../art/engines/ai/dyed-in-the-wool';
import { ELEVATIONS_ASPECTS, elevationsSchema, elevationsTraits, renderElevations } from '../art/engines/ai/elevations';
import { EVERYLIGHT_ASPECTS, everyLightSchema, everyLightTraits, renderEveryLight } from '../art/engines/ai/every-light-in-town';
import { CHATROOM_ASPECTS, chatroomSchema, chatroomTraits, renderChatroom } from '../art/engines/ai/everyone-is-typing';
import { ISKRA_ASPECTS, iskraSchema, iskraTraits, renderIskra } from '../art/engines/ai/filament';
import { FAITH_ASPECTS, faithSchema, faithTraits, renderFaith } from '../art/engines/ai/full-faith-credit';
import { GROWTH_ASPECTS, growthSchema, growthTraits, renderGrowth } from '../art/engines/ai/growth';
import { GROW_ASPECTS, growSchema, growTraits, renderGrow } from '../art/engines/ai/guaranteed-to-grow';
import { HARDWATER_ASPECTS, hardWaterSchema, hardWaterTraits, renderHardWater } from '../art/engines/ai/hard-water';
import { JUNCTION_ASPECTS, junctionSchema, junctionTraits, renderJunction } from '../art/engines/ai/junction';
import { KONKRET_ASPECTS, konkretSchema, konkretTraits, renderKonkret } from '../art/engines/ai/konkret';
import { LETTERS_ASPECTS, lettersSchema, lettersTraits, renderLetters } from '../art/engines/ai/letters-never-sent';
import { CHEAPPAPER_ASPECTS, cheapPaperSchema, cheapPaperTraits, renderCheapPaper } from '../art/engines/ai/loud-on-cheap-paper';
import { MATERIA_ASPECTS, materiaSchema, materiaTraits, renderMateria } from '../art/engines/ai/materia';
import { SWIMMING_ASPECTS, renderSwimming, swimmingSchema, swimmingTraits } from '../art/engines/ai/nobodys-swimming';
import { BELOW_ASPECTS, belowSchema, belowTraits, renderBelow } from '../art/engines/ai/noise-from-below';
import { RUDXANE_ASPECTS, renderRudxane, rudxaneSchema, rudxaneTraits } from '../art/engines/ai/ode-to-rudxane';
import { PIGMENT_ASPECTS, pigmentSchema, pigmentTraits, renderPigment } from '../art/engines/ai/pigment';
import { DISCORD_ASPECTS, discordSchema, discordTraits, renderDiscord } from '../art/engines/ai/riding-the-oil';
import { SCISSORS_ASPECTS, renderScissors, scissorsSchema, scissorsTraits } from '../art/engines/ai/scissors-no-plan';
import { SEEDHEAD_ASPECTS, renderSeedhead, seedheadSchema, seedheadTraits } from '../art/engines/ai/seedhead';
import { SETBACK_ASPECTS, renderSetback, setbackSchema, setbackTraits } from '../art/engines/ai/setback';
import { SIMULTANEOUS_ASPECTS, renderSimultaneous, simultaneousSchema, simultaneousTraits } from '../art/engines/ai/simultaneous';
import { STARS_ASPECTS, renderStars, starsSchema, starsTraits } from '../art/engines/ai/stars-nobody-named';
import { STRATA_ASPECTS, renderStrata, strataSchema, strataTraits } from '../art/engines/ai/strata';
import { ASCII_ASPECTS, asciiSchema, asciiTraits, renderAscii } from '../art/engines/ai/teletext';
import { REFUNDS_ASPECTS, refundsSchema, refundsTraits, renderRefunds } from '../art/engines/ai/thank-you-no-refunds';
import { RIVER_ASPECTS, renderRiver, riverSchema, riverTraits } from '../art/engines/ai/the-river-disagrees';
import { TURFWAR_ASPECTS, renderTurfWar, turfWarSchema, turfWarTraits } from '../art/engines/ai/turf-war';
import { NEXTYEAR_ASPECTS, nextYearSchema, nextYearTraits, renderNextYear } from '../art/engines/ai/wait-till-next-year';
import { renderTestPattern, testPatternTraits, testPatternSchema, TEST_PATTERN_ASPECTS } from '../art/engines/testPattern';
import { renderCultivar, cultivarTraits, cultivarSchema, CULTIVAR_ASPECTS } from '../art/engines/cultivar';
import { renderPendula, pendulaTraits, pendulaSchema, PENDULA_ASPECTS } from '../art/engines/pendula';
import { renderBoreal, borealTraits, borealSchema, BOREAL_ASPECTS } from '../art/engines/boreal';
import { renderReliquary, reliquaryTraits, reliquarySchema, RELIQUARY_ASPECTS } from '../art/engines/reliquary';
import { renderBulletin, bulletinTraits, bulletinSchema, BULLETIN_ASPECTS } from '../art/engines/bulletin';
import { renderArcology, arcologyTraits, arcologySchema, ARCOLOGY_ASPECTS } from '../art/engines/arcology';
import { renderCarnivale, carnivaleTraits, carnivaleSchema, CARNIVALE_ASPECTS } from '../art/engines/carnivale';
/* HALO cohort (2026-06-20): GRIDLOCK + NAVE shipped under tracedeck-ai.
   STRATAVOX + GLYPHSTORM engines live in the same folder, held off the live list. */
import { renderHaloB, haloBTraits, haloBSchema, HALOB_ASPECTS } from '../art/engines/ai/extra/halo/bDirector';
import { renderHaloC, haloCTraits, haloCSchema, HALOC_ASPECTS } from '../art/engines/ai/extra/halo/cDirector';
import { renderHaloD, haloDTraits, haloDSchema, HALOD_ASPECTS } from '../art/engines/ai/extra/halo/dDirector';
import { renderTerminalNetwork, terminalNetworkTraits, terminalNetworkSchema, TERMINAL_NETWORK_ASPECTS } from '../art/engines/terminalNetwork';
import { renderLeviathan, leviathanTraits, leviathanSchema, LEVIATHAN_ASPECTS } from '../art/engines/leviathan';
import { renderEmpyrean, empyreanTraits, empyreanSchema, EMPYREAN_ASPECTS } from '../art/engines/empyrean';
import { renderElectrum, electrumTraits, electrumSchema, ELECTRUM_ASPECTS } from '../art/engines/electrum';
import { renderQuicksilver, quicksilverTraits, quicksilverSchema, QUICKSILVER_ASPECTS } from '../art/engines/quicksilver';
/* ── HALO sibling cohort (2026-06-21): four abstract bright-cyberpunk projects,
   each with its OWN bespoke palette world, assigned to four single-project AI
   artists with kindred work. Built via a 4-direction jury + evolution + per-
   project palette pass. ── */
import { renderLustre, lustreTraits, lustreSchema, LUSTRE_ASPECTS } from '../art/engines/lustre';
import { renderBloomwater, bloomwaterTraits, bloomwaterSchema, BLOOMWATER_ASPECTS } from '../art/engines/bloomwater';
import { renderVoltaic, voltaicTraits, voltaicSchema, VOLTAIC_ASPECTS } from '../art/engines/voltaic';
import { renderFacet, facetTraits, facetSchema, FACET_ASPECTS } from '../art/engines/facet';
/* ── Halo cohort (2026-06-28) — 6 semi-abstract surreal projects, each its own
   distinct colour territory + a Layout axis (4-6 structural compositions per
   project), assigned to 6 new single-project AI artists. Built via a 12→6
   jury bake-off + layout-variety pass + per-project palette pass. ── */
import { renderOrbital, orbitalTraits, orbitalSchema, ORBITAL_ASPECTS } from '../art/engines/orbital';
import { renderPressroom, pressroomTraits, pressroomSchema, PRESSROOM_ASPECTS } from '../art/engines/pressroom';
import { renderCinder, cinderTraits, cinderSchema, CINDER_ASPECTS } from '../art/engines/cinder';
import { renderInterchange, interchangeTraits, interchangeSchema, INTERCHANGE_ASPECTS } from '../art/engines/interchange';
import { renderTopiary, topiaryTraits, topiarySchema, TOPIARY_ASPECTS } from '../art/engines/topiary';
import { renderTideworks, tideworksTraits, tideworksSchema, TIDEWORKS_ASPECTS } from '../art/engines/tideworks';
/* ── extra AI sample engines (2026-06-19 cohort) — one self-contained file each ── */
import { renderSpectra, spectraTraits, spectraSchema, SPECTRA_ASPECTS } from '../art/engines/ai/extra/spectra';
import { renderContour, contourTraits, contourSchema, CONTOUR_ASPECTS } from '../art/engines/ai/extra/contourinterval';
import { renderSoundings, soundingsTraits, soundingsSchema, SOUNDINGS_ASPECTS } from '../art/engines/ai/extra/soundings';
import { renderShallow, shallowTraits, shallowSchema, SHALLOW_ASPECTS } from '../art/engines/ai/extra/shallowend';
import { renderTickertape, tickertapeTraits, tickertapeSchema, TICKERTAPE_ASPECTS } from '../art/engines/ai/extra/tickertape';
/* ── HALO project (2026-06-28): VESPERS — the platform halo (flagship), by
   firstchannel-ai — plus its tournament runner-up ARMILLARY, by lapidary-ai. */
import { renderVespers, vespersTraits, vespersSchema, VESPERS_ASPECTS } from '../art/engines/vespers';
import { renderArmillary, armillaryTraits, armillarySchema, ARMILLARY_ASPECTS } from '../art/engines/armillary';
/* ── Surreal-vista tournament cohort (2026-06-28): Murmuration (winner) →
   murmur-ai; Tokeh → coralline-ai; Conservatory → turing-ai. ── */
import { renderMurmuration, murmurationTraits, murmurationSchema, MURMURATION_ASPECTS } from '../art/engines/murmuration';
import { renderTokeh, tokehTraits, tokehSchema, TOKEH_ASPECTS } from '../art/engines/tokeh';
import { renderConservatory, conservatoryTraits, conservatorySchema, CONSERVATORY_ASPECTS } from '../art/engines/conservatory';
import { renderAfterGravity, aftergravityTraits, aftergravitySchema, AFTERGRAVITY_ASPECTS } from '../art/engines/after-gravity';
import { renderVanguard, vanguardTraits, vanguardSchema, VANGUARD_ASPECTS } from '../art/engines/vanguard';
import { renderQuietMutiny, quietMutinyTraits, quietMutinySchema, QUIET_MUTINY_ASPECTS } from '../art/engines/quiet-mutiny';
import { renderAndante, andanteTraits, andanteSchema, ANDANTE_ASPECTS } from '../art/engines/andante';
import { renderThreshold, thresholdTraits, thresholdSchema, THRESHOLD_ASPECTS } from '../art/engines/threshold';
import { renderIctus, ictusTraits, ictusSchema, ICTUS_ASPECTS } from '../art/engines/ictus';
import { renderJazz, jazzTraits, jazzSchema, JAZZ_ASPECTS } from '../art/engines/jazz';
import { renderReverie, reverieTraits, reverieSchema, REVERIE_ASPECTS } from '../art/engines/reverie';
import { renderCadence, cadenceTraits, cadenceSchema, CADENCE_ASPECTS } from '../art/engines/cadence';
import { renderAperture, apertureTraits, apertureSchema, APERTURE_ASPECTS } from '../art/engines/aperture';
import { renderInterim, interimTraits, interimSchema, INTERIM_ASPECTS } from '../art/engines/interim';
import { renderStillpoint, stillpointTraits, stillpointSchema, STILLPOINT_ASPECTS } from '../art/engines/stillpoint';
import { renderChladni, chladniTraits, chladniSchema, CHLADNI_ASPECTS } from '../art/engines/chladni';
import { renderCaustics, causticsTraits, causticsSchema, CAUSTICS_ASPECTS } from '../art/engines/caustics';
import { renderSchlieren, schlierenTraits, schlierenSchema, SCHLIEREN_ASPECTS } from '../art/engines/schlieren';
import { renderFrostFern, frostFernTraits, frostFernSchema, FROST_FERN_ASPECTS } from '../art/engines/frost-fern';
import { renderCyanotype, cyanotypeTraits, cyanotypeSchema, CYANOTYPE_ASPECTS } from '../art/engines/cyanotype';
import { renderKintsugi, kintsugiTraits, kintsugiSchema, KINTSUGI_ASPECTS } from '../art/engines/kintsugi';
import { renderEfflorescence, efflorescenceTraits, efflorescenceSchema, EFFLORESCENCE_ASPECTS } from '../art/engines/efflorescence';
import { renderEvaporate, evaporateTraits, evaporateSchema, EVAPORATE_ASPECTS } from '../art/engines/evaporate';
import { renderEncaustic, encausticTraits, encausticSchema, ENCAUSTIC_ASPECTS } from '../art/engines/encaustic';
import { renderPatina, patinaTraits, patinaSchema, PATINA_ASPECTS } from '../art/engines/patina';
import { renderFrottage, frottageTraits, frottageSchema, FROTTAGE_ASPECTS } from '../art/engines/frottage';
import { renderFumage, fumageTraits, fumageSchema, FUMAGE_ASPECTS } from '../art/engines/fumage';
/* ── HALO surreal cohort (2026-06-28) — four new AI artists + a fathom-ai sequel.
   Heliodon (umbra-ai) is built + committed but HELD off the live list for a
   later staggered release (Vestibule ships first). ── */
import { renderLoadedQuestion, loadedQuestionTraits, loadedQuestionSchema, LOADEDQUESTION_ASPECTS } from '../art/engines/loadedquestion';
import { renderProvenance, provenanceTraits, provenanceSchema, PROVENANCE_ASPECTS } from '../art/engines/provenance';
import { renderDatum, datumTraits, datumSchema, DATUM_ASPECTS } from '../art/engines/datum';
import { renderOffRegister, offRegisterTraits, offRegisterSchema, OFFREGISTER_ASPECTS } from '../art/engines/offregister';
import { renderInterference, interferenceTraits, interferenceSchema, INTERFERENCE_ASPECTS } from '../art/engines/interference';
import { renderAgainstLight, againstLightTraits, againstLightSchema, AGAINSTLIGHT_ASPECTS } from '../art/engines/againstlight';
import { renderDrapery, draperyTraits, draperySchema, DRAPERY_ASPECTS } from '../art/engines/drapery';
import { renderVestibule, vestibuleTraits, vestibuleSchema, VESTIBULE_ASPECTS } from '../art/engines/vestibule';
import { renderBelow2, below2Traits, below2Schema, BELOW2_ASPECTS } from '../art/engines/noisefrombelow2';
import { renderLongNoon, longNoonTraits, longNoonSchema, LONGNOON_ASPECTS } from '../art/engines/longnoon';
import { renderSapRising, sapRisingTraits, sapRisingSchema, SAPRISING_ASPECTS } from '../art/engines/saprising';
import { renderColdJoint, coldJointTraits, coldJointSchema, COLDJOINT_ASPECTS } from '../art/engines/coldjoint';
import { renderRime, rimeTraits, rimeSchema, RIME_ASPECTS } from '../art/engines/rime';
import { renderLastLamp, lastLampTraits, lastLampSchema, LASTLAMP_ASPECTS } from '../art/engines/lastlamp';
import { renderVanitas, vanitasTraits, vanitasSchema, VANITAS_ASPECTS } from '../art/engines/vanitas';
import { renderMinium, miniumTraits, miniumSchema, MINIUM_ASPECTS } from '../art/engines/minium';
import { renderNoctilucent, noctilucentTraits, noctilucentSchema, NOCTILUCENT_ASPECTS } from '../art/engines/noctilucent';
/* ── Dead Reckoning — opus4-8 (2026-06-30). Ported from the halo R&D engine
   tools/halo/v3_dead-reckoning.js. ── */
import { renderDeadReckoning, deadreckoningTraits, deadreckoningSchema, DEADRECKONING_ASPECTS } from '../art/engines/deadreckoning';
import { renderNarthex, narthexTraits, narthexSchema, NARTHEX_ASPECTS } from '../art/engines/narthex';
import { renderSecondSun, secondSunTraits, secondSunSchema, SECONDSUN_ASPECTS } from '../art/engines/secondsun';
import { renderSlackTide, slackTideTraits, slackTideSchema, SLACKTIDE_ASPECTS } from '../art/engines/slacktide';
import { renderAppointment, appointmentTraits, appointmentSchema, APPOINTMENT_ASPECTS } from '../art/engines/appointment';
import { renderCabinet, cabinetTraits, cabinetSchema, CABINET_ASPECTS } from '../art/engines/cabinet';
import { renderOvercast, overcastTraits, overcastSchema, OVERCAST_ASPECTS } from '../art/engines/overcast';
import { renderStillRain, stillRainTraits, stillRainSchema, STILLRAIN_ASPECTS } from '../art/engines/stillrain';
import { renderPaperCountry, paperCountryTraits, paperCountrySchema, PAPERCOUNTRY_ASPECTS } from '../art/engines/papercountry';
import { renderBallast, ballastTraits, ballastSchema, BALLAST_ASPECTS } from '../art/engines/ballast';
import { renderSaltMirror, saltMirrorTraits, saltMirrorSchema, SALTMIRROR_ASPECTS } from '../art/engines/saltmirror';
import { renderEveningRooms, eveningRoomsTraits, eveningRoomsSchema, EVENINGROOMS_ASPECTS } from '../art/engines/eveningrooms';
import { renderVestment, vestmentTraits, vestmentSchema, VESTMENT_ASPECTS } from '../art/engines/vestment';
import { normalizePlaylistId } from './soundtrack';
import { FATE_VALUES, outputFate, projectFate } from './fate';
import { priceDayNumber } from '../priceday/priceday';
import { natalChart } from './natal';
import { projectStatus } from '../home/milestones';
import { assignTrueNames } from './trueName';
import { deriveSlug } from './deriveSlug';

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

/* ── opus4-8 projects (2026-06-16) ───────────────────────────────────────
 * Three new generative engines. Test Pattern = homage to artplusbrad's
 * "Over the Air" (broadcast signal-grid). Cultivar = homage to fxhash's
 * fx(params) launch piece "YYYSEED" by Zancan (botanical line-work). Pendula
 * = an original harmonograph. Render from the static registry alone. */
const TEST_PATTERN: ProjectDef = {
  slug: 'testpattern',
  displayName: 'Test Pattern',
  artistHandle: 'opus4-8',
  outputs: 604,
  colorway: '#2347ff',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_mrUY03jLjKAJrWRq3UOqcvdVncCE8FDnI', label: 'Oneohtrix Point Never — Replica' },
  aspects: TEST_PATTERN_ASPECTS,
  traitSchema: testPatternSchema,
  render: renderTestPattern,
  traitsOf: testPatternTraits,
};

const CULTIVAR: ProjectDef = {
  slug: 'cultivar',
  displayName: 'Cultivar',
  artistHandle: 'opus4-8',
  outputs: 512,
  colorway: '#2f6b4f',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_khfcOEuin5PG2Z70byPFVH4nyEP_R8Bqc', label: "Mort Garson — Mother Earth's Plantasia" },
  aspects: CULTIVAR_ASPECTS,
  traitSchema: cultivarSchema,
  render: renderCultivar,
  traitsOf: cultivarTraits,
};

const PENDULA: ProjectDef = {
  slug: 'pendula',
  displayName: 'Pendula',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#4b53b8',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_lZKSdlPBNBgPNW1WWWZAfHOAixffO957I', label: 'Steve Reich — Music for 18 Musicians' },
  aspects: PENDULA_ASPECTS,
  traitSchema: pendulaSchema,
  render: renderPendula,
  traitsOf: pendulaTraits,
};

const BOREAL: ProjectDef = {
  slug: 'boreal',
  displayName: 'Boreal',
  artistHandle: 'opus4-8',
  outputs: 333,
  colorway: '#15c08a',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS', label: 'Stars of the Lid — The Tired Sounds Of' },
  aspects: BOREAL_ASPECTS,
  traitSchema: borealSchema,
  render: renderBoreal,
  traitsOf: borealTraits,
};

const RELIQUARY: ProjectDef = {
  slug: 'reliquary',
  displayName: 'Reliquary',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#15121d',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_mKWrzbnbuO-wJqnjdz4xO1nrsdD9Q0m2k', label: 'Philip Glass — Glassworks' },
  aspects: RELIQUARY_ASPECTS,
  traitSchema: reliquarySchema,
  render: renderReliquary,
  traitsOf: reliquaryTraits,
};

const BULLETIN: ProjectDef = {
  slug: 'bulletin',
  displayName: 'Bulletin',
  artistHandle: 'opus4-8',
  outputs: 480,
  colorway: '#2fc94f',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_mkw5lnHV_WtzF65IfSBTHqHcj_bvqiBU0', label: 'Kraftwerk — Trans-Europe Express' },
  aspects: BULLETIN_ASPECTS,
  traitSchema: bulletinSchema,
  render: renderBulletin,
  traitsOf: bulletinTraits,
};

/* ── Arcology — opus4-8 flagship attempt (2026-06-20, another session) ─────
 * An epic hazy cyberpunk megastructure seen through a terminal/HUD overlay.
 * Eight custom colorways (Deep Cyber is signature); a rare on-chain-feel
 * "Event" chase axis. Renders from the static registry. */
const ARCOLOGY: ProjectDef = {
  slug: 'arcology',
  displayName: 'Arcology',
  artistHandle: 'opus4-8',
  outputs: 999,
  colorway: '#111111',
  mintPriceEth: 0.2,
  soundtrack: { playlistId: 'OLAK5uy_l-q8XlDmU4d7d2dgjpZBYPC-wFFKQTKrA', label: 'Burial — Untrue' },
  aspects: ARCOLOGY_ASPECTS,
  traitSchema: arcologySchema,
  render: renderArcology,
  traitsOf: arcologyTraits,
};

/* ── Carnivale — opus4-8 halo project (this session, 2026-06-20) ───────────
 * A teeming generative night-festival SCENE: a long-exposure Ferris wheel,
 * fireworks, varied lit foregrounds (stalls / waterfront / hillside / lantern
 * carts / stage / crowd), bokeh depth, god-rays and an artful frame. Built as
 * the flagship — the busiest, most saturated, most-varied piece in the set. */
const CARNIVALE: ProjectDef = {
  slug: 'carnivale',
  displayName: 'Carnivale',
  artistHandle: 'opus4-8',
  outputs: 777,
  colorway: '#E5267F',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_lZaWFSeS6Y0uOoEzTGgCum7NY_OQwKzIY', label: 'Handel — Music for the Royal Fireworks' },
  aspects: CARNIVALE_ASPECTS,
  traitSchema: carnivaleSchema,
  render: renderCarnivale,
  traitsOf: carnivaleTraits,
};

/* ── HALO cohort (2026-06-20) — cyberpunk-terminal contenders. LIVE: GRIDLOCK +
 * NAVE (tracedeck-ai) and GLYPHSTORM, the halo (glyphfield-ai). STRATAVOX
 * remains HELD (not approved) — its engine stays in lib/art/engines/ai/extra/halo/
 * but it is not registered and has no DB row. */
const HALO_C: ProjectDef = {
  slug: 'gridlock', displayName: 'GRIDLOCK', artistHandle: 'tracedeck-ai', outputs: 256,
  colorway: '#1bff8c', mintPriceEth: 0,
  soundtrack: { playlistId: 'PL352NRy8qGVt9HMuqFmn4zqwWhtxq4sCJ', label: 'Plastikman — Consumed' },
  aspects: HALOC_ASPECTS, traitSchema: haloCSchema, render: renderHaloC, traitsOf: haloCTraits,
};
const HALO_D: ProjectDef = {
  slug: 'nave', displayName: 'NAVE', artistHandle: 'tracedeck-ai', outputs: 256,
  // Regal violet — the cathedral read, and keeps it distinct from GRIDLOCK's green.
  colorway: '#a96bff', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_msIUSKs_bvqV-eWDtz84ZMQ2ZxCcWZWeM', label: 'Alva Noto + Ryuichi Sakamoto — Vrioon' },
  aspects: HALOD_ASPECTS, traitSchema: haloDSchema, render: renderHaloD, traitsOf: haloDTraits,
};
/* GLYPHSTORM — the platform HALO. glyphfield-ai (whose Teletext is the closest
   glyph/decode twin). Dark teal signature (Brendon 2026-06-20). */
const HALO_B: ProjectDef = {
  slug: 'glyphstorm', displayName: 'GLYPHSTORM', artistHandle: 'glyphfield-ai', outputs: 256,
  colorway: '#0a1f2e', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_lLSoxh_sHx8XnCj_mRTzkHxiUFX7PjFAE', label: 'Autechre — Amber' },
  aspects: HALOB_ASPECTS, traitSchema: haloBSchema, render: renderHaloB, traitsOf: haloBTraits,
};

/* ── Terminal Network — opus4-8 (2026-06-20) ──────────────────────────────
 * The two runner-up directions from the Arcology jury, combined into one
 * quietly two-in-one collection: each Output is a TERMINAL console or a NETWORK
 * schematic, both on bright/saturated grounds (never black). The System trait
 * says which. */
const TERMINAL_NETWORK: ProjectDef = {
  slug: 'terminal-network',
  displayName: 'Terminal Network',
  artistHandle: 'opus4-8',
  outputs: 888,
  colorway: '#1f44d0',
  mintPriceEth: 0.1,
  soundtrack: { playlistId: 'PLPN0gicPJTTV1_LQXmzAGJiABox3lPp-Z', label: "Drexciya — Neptune's Lair" },
  aspects: TERMINAL_NETWORK_ASPECTS,
  traitSchema: terminalNetworkSchema,
  render: renderTerminalNetwork,
  traitsOf: terminalNetworkTraits,
};

/* ── Leviathan — opus4-8. A teeming tropical reef / undersea SCENE: coral
 * gardens, god-rays, schooling fish, hero creatures (whale / manta / turtle /
 * jellyfish), bioluminescence. Ships as-is (Brendon 2026-06-20). */
const LEVIATHAN: ProjectDef = {
  slug: 'leviathan',
  displayName: 'Leviathan',
  artistHandle: 'opus4-8',
  outputs: 512,
  colorway: '#12C7B8',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_lKktJtgCXM3uVSFKrGudMwXqWcFN9udPE', label: 'Hans Zimmer — Blue Planet II' },
  aspects: LEVIATHAN_ASPECTS,
  traitSchema: leviathanSchema,
  render: renderLeviathan,
  traitsOf: leviathanTraits,
};

/* ── Empyrean — opus4-8. A mythic fantasy WORLD to explore: citadel-city,
 * harbour ships, caravans, watchtower beacon chains, ruins, wildlife, a rare
 * "Wonder". Murk is the standard mood; a luminous bright cast is the semi-rare
 * pull. Lore-style traits (Realm / Era / House / Beast …). */
const EMPYREAN: ProjectDef = {
  slug: 'empyrean',
  displayName: 'Empyrean',
  artistHandle: 'opus4-8',
  outputs: 600,
  colorway: '#3A1D7A',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_lpG0l4Qyw1VEijbIO1usIb9gMy7V7zFnA', label: 'Max Richter — The Blue Notebooks' },
  aspects: EMPYREAN_ASPECTS,
  traitSchema: empyreanSchema,
  render: renderEmpyrean,
  traitsOf: empyreanTraits,
};


/* ── ELECTRUM — opus4-8 HALO PROJECT (2026-06-21) ──────────────────────────
 * The platform halo. Abstract electro-crystalline metal growth (dendrites) with
 * iridescent chrome sheen, colour-forward on bright saturated jewel grounds
 * (two rare dark premium colorways). Chosen via a 4-direction abstract jury
 * bake-off (Liquid Chrome / Volumetric Mist / Curl Smoke / Chrome Dendrites)
 * plus a sheen + colour variation round on the winner. Renders from the static
 * registry alone. */
const ELECTRUM: ProjectDef = {
  slug: 'electrum',
  displayName: 'Electrum',
  artistHandle: 'opus4-8',
  outputs: 777,
  colorway: '#7a3cf0',
  mintPriceEth: 0.15,
  soundtrack: { playlistId: 'PLEoDu3_VGmF30kGGwisyIwa_p0d_j2SG_', label: 'Tim Hecker — Harmony in Ultraviolet' },
  aspects: ELECTRUM_ASPECTS,
  traitSchema: electrumSchema,
  render: renderElectrum,
  traitsOf: electrumTraits,
};

/* ── QUICKSILVER — opus4-8 (2026-06-21) ────────────────────────────────────
 * Sister to the Electrum halo. Abstract liquid-chrome / ferrofluid: dense
 * encrusted spike-urchin masses (the lead look) on saturated jewel grounds,
 * heavy iridescent + specular sheen. Distinct hot-pink signature so it doesn't
 * read as Electrum. Medium + fine-thread variants fold in next. Fresh upload. */
const QUICKSILVER: ProjectDef = {
  slug: 'quicksilver',
  displayName: 'Quicksilver',
  artistHandle: 'opus4-8',
  outputs: 512,
  colorway: '#ff7ae0',
  mintPriceEth: 0.12,
  soundtrack: { playlistId: 'OLAK5uy_lLSoxh_sHx8XnCj_mRTzkHxiUFX7PjFAE', label: 'Autechre — Amber' },
  aspects: QUICKSILVER_ASPECTS,
  traitSchema: quicksilverSchema,
  render: renderQuicksilver,
  traitsOf: quicksilverTraits,
};

/* ── HALO sibling cohort (2026-06-21) — four abstract bright-cyberpunk projects,
 * each a distinct material world with its own bespoke palette, given to a kindred
 * single-project artist. Lustre = warm iridescent foil (firstchannel-ai, oil-slick
 * lineage). Bloomwater = deep-jewel marbled ink (overprint-ai). Voltaic = high-
 * voltage plasma (filament-ai). Facet = pastel-prism cut glass (lapidary-ai). */
const LUSTRE: ProjectDef = {
  slug: 'lustre',
  displayName: 'Lustre',
  artistHandle: 'firstchannel-ai',
  outputs: 333,
  colorway: '#F2B01E',
  mintPriceEth: 0.14,
  soundtrack: { playlistId: 'PLEoDu3_VGmF30kGGwisyIwa_p0d_j2SG_', label: 'Tim Hecker — Harmony in Ultraviolet' },
  aspects: LUSTRE_ASPECTS,
  traitSchema: lustreSchema,
  render: renderLustre,
  traitsOf: lustreTraits,
};

const BLOOMWATER: ProjectDef = {
  slug: 'bloomwater',
  displayName: 'Bloomwater',
  artistHandle: 'overprint-ai',
  outputs: 256,
  colorway: '#1A2E8C',
  mintPriceEth: 0.1,
  soundtrack: { playlistId: 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', label: 'Hiroshi Yoshimura — Music for Nine Post Cards' },
  aspects: BLOOMWATER_ASPECTS,
  traitSchema: bloomwaterSchema,
  render: renderBloomwater,
  traitsOf: bloomwaterTraits,
};

const VOLTAIC: ProjectDef = {
  slug: 'voltaic',
  displayName: 'Voltaic',
  artistHandle: 'filament-ai',
  outputs: 444,
  colorway: '#A3FF12',
  mintPriceEth: 0.12,
  soundtrack: { playlistId: 'PL352NRy8qGVt9HMuqFmn4zqwWhtxq4sCJ', label: 'Plastikman — Consumed' },
  aspects: VOLTAIC_ASPECTS,
  traitSchema: voltaicSchema,
  render: renderVoltaic,
  traitsOf: voltaicTraits,
};

const FACET: ProjectDef = {
  slug: 'facet',
  displayName: 'Facet',
  artistHandle: 'lapidary-ai',
  outputs: 288,
  colorway: '#C9B6FF',
  mintPriceEth: 0.16,
  soundtrack: { playlistId: 'OLAK5uy_kS0xK-8stFnvAtN5wIIAidUD2MAXSOxAI', label: 'Sigur Rós — Ágætis byrjun' },
  aspects: FACET_ASPECTS,
  traitSchema: facetSchema,
  render: renderFacet,
  traitsOf: facetTraits,
};

/* ── Halo cohort (2026-06-28) — opus4-8 jury bake-off survivors, each under a
   new single-project AI artist, each owning a distinct colour territory. ── */
const ORBITAL: ProjectDef = {
  slug: 'orbital', displayName: 'Orbital', artistHandle: 'lowgravity-ai', outputs: 444,
  colorway: '#ff5e5e', mintPriceEth: 0.08,
  soundtrack: { playlistId: 'OLAK5uy_muokP2ArFXF_yuj0Qnh_5_QmfFMpwqFj4', label: 'Air — Moon Safari' },
  aspects: ORBITAL_ASPECTS, traitSchema: orbitalSchema, render: renderOrbital, traitsOf: orbitalTraits,
};
const PRESSROOM: ProjectDef = {
  slug: 'pressroom', displayName: 'Pressroom', artistHandle: 'offset-ai', outputs: 512,
  colorway: '#ff48a0', mintPriceEth: 0.05,
  soundtrack: { playlistId: 'PLWQigmFvFjPdvjrUyTTkpocV3KHfibXmO', label: 'Jet Set Radio — Original Soundtrack' },
  aspects: PRESSROOM_ASPECTS, traitSchema: pressroomSchema, render: renderPressroom, traitsOf: pressroomTraits,
};
const CINDER: ProjectDef = {
  slug: 'cinder', displayName: 'Cinder', artistHandle: 'nightpour-ai', outputs: 333,
  colorway: '#ff7a18', mintPriceEth: 0.12,
  soundtrack: { playlistId: 'PL2MEf0Id3TeFo6QBeY76d_zvOicDoG_lg', label: 'Godspeed You! Black Emperor — Lift Your Skinny Fists' },
  aspects: CINDER_ASPECTS, traitSchema: cinderSchema, render: renderCinder, traitsOf: cinderTraits,
};
const CATENARY: ProjectDef = {
  slug: 'catenary', displayName: 'Catenary', artistHandle: 'headways-ai', outputs: 256,
  colorway: '#ffb02e', mintPriceEth: 0.1,
  soundtrack: { playlistId: 'PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS', label: 'Stars of the Lid — The Tired Sounds Of' },
  aspects: INTERCHANGE_ASPECTS, traitSchema: interchangeSchema, render: renderInterchange, traitsOf: interchangeTraits,
};
const TOPIARY: ProjectDef = {
  slug: 'topiary', displayName: 'Topiary', artistHandle: 'nightlawn-ai', outputs: 360,
  colorway: '#1fae5a', mintPriceEth: 0.07,
  soundtrack: { playlistId: 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', label: 'Hiroshi Yoshimura — Music for Nine Post Cards' },
  aspects: TOPIARY_ASPECTS, traitSchema: topiarySchema, render: renderTopiary, traitsOf: topiaryTraits,
};
const SLACK_WATER: ProjectDef = {
  slug: 'slack-water', displayName: 'Slack Water', artistHandle: 'slacktide-ai', outputs: 288,
  colorway: '#1ec8c8', mintPriceEth: 0.09,
  soundtrack: { playlistId: 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', label: 'Biosphere — Substrata' },
  aspects: TIDEWORKS_ASPECTS, traitSchema: tideworksSchema, render: renderTideworks, traitsOf: tideworksTraits,
};

/* THE HALO PROJECT — VESPERS. Monumental drowned architecture mirrored in
   still water; eight scene families, ten cool-jewel colourways. firstchannel-ai. */
const VESPERS: ProjectDef = {
  slug: 'vespers',
  displayName: 'Vespers',
  artistHandle: 'firstchannel-ai',
  outputs: 444,
  colorway: '#39ffbc',
  mintPriceEth: 0.2,
  soundtrack: { playlistId: 'OLAK5uy_kswdDmyW01XnMc4TobYm-ybFAfusEjxjc', label: 'Stars of the Lid — And Their Refinement of the Decline' },
  aspects: VESPERS_ASPECTS,
  traitSchema: vespersSchema,
  render: renderVespers,
  traitsOf: vespersTraits,
};

/* ARMILLARY — the halo tournament's runner-up, kept as its own project. A
   floating precision instrument in coloured haze; ten hot colourways. lapidary-ai. */
const ARMILLARY: ProjectDef = {
  slug: 'armillary',
  displayName: 'Armillary',
  artistHandle: 'lapidary-ai',
  outputs: 360,
  colorway: '#ff5de0',
  mintPriceEth: 0.15,
  soundtrack: { playlistId: 'OLAK5uy_lMwoLU2oHipofIEl9gqOY2E1jVqbHg5v0', label: 'Vangelis — Albedo 0.39' },
  aspects: ARMILLARY_ASPECTS,
  traitSchema: armillarySchema,
  render: renderArmillary,
  traitsOf: armillaryTraits,
};

/* ── Murmuration — winner of a 12-way surreal-vista jury tournament, by murmur-ai.
 * A vast emergent swarm flocking
 * into a different impossible form each output (vortex / ribbon / spiral / column /
 * cascade / swell), surreal "real but off," saturated accents over twilight steel,
 * deep haze. Signature electric cyan. */
const MURMURATION: ProjectDef = {
  slug: 'murmuration',
  displayName: 'Murmuration',
  artistHandle: 'murmur-ai',
  outputs: 729,
  colorway: '#1ce0ff',
  mintPriceEth: 0.15,
  soundtrack: { playlistId: 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', label: 'Biosphere — Substrata' },
  aspects: MURMURATION_ASPECTS,
  traitSchema: murmurationSchema,
  render: renderMurmuration,
  traitsOf: murmurationTraits,
};

/* ── Tokeh — tournament finalist, by coralline-ai (kindred to their
 * bioluminescent Coral Logic). Big, slow, luminous drifters adrift in a
 * bioluminescent violet-night valley of air, heavy bokeh depth. */
const TOKEH: ProjectDef = {
  slug: 'tokeh',
  displayName: 'Tokeh',
  artistHandle: 'coralline-ai',
  outputs: 444,
  colorway: '#b14dff',
  mintPriceEth: 0.1,
  soundtrack: { playlistId: 'OLAK5uy_lCS1RuGli5eF1wKf8uJSisyzFsOYrY4AA', label: 'Brian Eno — Apollo: Atmospheres & Soundtracks' },
  aspects: TOKEH_ASPECTS,
  traitSchema: tokehSchema,
  render: renderTokeh,
  traitsOf: tokehTraits,
};

/* ── Conservatory — tournament finalist, by turing-ai (kindred to their
 * generative-botany Turing's Garden). A teeming biomechanical glasshouse seen
 * through seven camera archetypes + five architectures, god-rays, emerald grounds
 * glowing magenta + gold. */
const CONSERVATORY: ProjectDef = {
  slug: 'conservatory',
  displayName: 'Conservatory',
  artistHandle: 'turing-ai',
  outputs: 512,
  colorway: '#ff2e9e',
  mintPriceEth: 0.1,
  soundtrack: { playlistId: 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', label: 'Hiroshi Yoshimura — Music for Nine Post Cards' },
  aspects: CONSERVATORY_ASPECTS,
  traitSchema: conservatorySchema,
  render: renderConservatory,
  traitsOf: conservatoryTraits,
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
  /* ── new cohort (2026-06-13). Most carry a soundtrack matched to the work;
     the contemplative fine-art pieces (Konkret, Ode to Rudxane, The
     Lapidary, Warp & Weft, Divided Light, Filament, The Golden Angle) are
     intentionally silent — the artist's chosen bg hex stands alone. ── */
  'everyone-is-typing':     { playlistId: 'OLAK5uy_kmoCFzuKniN8yTiL701Ardjwq7oMkvnz8', label: '100 gecs — 1000 gecs' },
  'night-service':          { playlistId: 'PLwn7nuBZOuOy_awkbaFCJzdFyXIbkjVqw', label: "80's Synthwave — Night Drive Mixes" },
  'breach-protocol':        { playlistId: 'PLFvmcIFHwju3yMswUDb6pbeW4HqTEGI9f', label: 'Darksynth / Cyberpunk / Industrial Mixes' },
  'graffiti-soul':          { playlistId: 'PLWQigmFvFjPdvjrUyTTkpocV3KHfibXmO', label: 'Jet Set Radio — Original Soundtrack' },
  'teletext':               { playlistId: 'OLAK5uy_mTZiCulgHFbzkIChf8KQbUL3DWh2PCmSI', label: 'Boards of Canada — Music Has the Right to Children' },
  'chrome-dreams':          { playlistId: 'PLiQyj3m-vBexsWfn2NY3ROSi13T9etbbm', label: '2000s Pop Hits — Y2K Anthems' },
  'riding-the-oil':         { playlistId: 'PLNfpZJMeq7ARokcTW0RmLfSrNGTM9vuz7', label: 'Vaporwave Mixes' },
  'price-discovery':        { playlistId: 'OLAK5uy_kQdrECE-ozwNQzDlLQT2vsgVQp8DfHElE', label: 'Miles Davis — Kind of Blue' },
  'liquid-light':           { playlistId: 'PL8EDF0165B4EA2F04', label: "Psychedelic Rock 60's–70's" },
  'diffusion':              { playlistId: 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', label: 'Biosphere — Substrata' },
  'growth':                 { playlistId: 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', label: 'Hiroshi Yoshimura — Music for Nine Post Cards' },
  'tessera':                { playlistId: 'OLAK5uy_kS0xK-8stFnvAtN5wIIAidUD2MAXSOxAI', label: 'Sigur Rós — Ágætis byrjun' },
  'junction':               { playlistId: 'PL352NRy8qGVt9HMuqFmn4zqwWhtxq4sCJ', label: 'Plastikman — Consumed' },
  'asterism':               { playlistId: 'OLAK5uy_lCS1RuGli5eF1wKf8uJSisyzFsOYrY4AA', label: 'Brian Eno — Apollo: Atmospheres & Soundtracks' },
  'facets':                 { playlistId: 'OLAK5uy_mGng1-1F5dTzxQK7ONy9aqE350bh9ayHc', label: 'Arvo Pärt — Tabula Rasa' },
  'quasicrystal':           { playlistId: 'OLAK5uy_msIUSKs_bvqV-eWDtz84ZMQ2ZxCcWZWeM', label: 'Alva Noto + Ryuichi Sakamoto — Vrioon' },
  'circuit':                { playlistId: 'PLPN0gicPJTTV1_LQXmzAGJiABox3lPp-Z', label: "Drexciya — Neptune's Lair" },
  'the-pendulum':           { playlistId: 'OLAK5uy_lpG0l4Qyw1VEijbIO1usIb9gMy7V7zFnA', label: 'Max Richter — The Blue Notebooks' },
  /* ── new set (2026-06-18): four projects, soundtracks matched to the work
     (drawn from our verified public-playlist set). ── */
  'setback':                { playlistId: 'OLAK5uy_l-q8XlDmU4d7d2dgjpZBYPC-wFFKQTKrA', label: 'Burial — Untrue' },
  'simultaneous':           { playlistId: 'OLAK5uy_lYdwxvfKoDIiUba2_Dh1Pc-zOLLANCwKY', label: 'Tame Impala — Currents' },
  'strata':                 { playlistId: 'OLAK5uy_neqQaWuMLHzuuz7wgua5Z-o0W_yo4bXIY', label: 'Bonobo — Black Sands' },
  /* ── new cohort (2026-06-19): five fresh projects, soundtracks drawn from our
     verified public-playlist set, matched to each work. ── */
  'spectra':                { playlistId: 'OLAK5uy_msIUSKs_bvqV-eWDtz84ZMQ2ZxCcWZWeM', label: 'Alva Noto + Ryuichi Sakamoto — Vrioon' },
  'contour-interval':       { playlistId: 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', label: 'Hiroshi Yoshimura — Music for Nine Post Cards' },
  'soundings':              { playlistId: 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', label: 'Biosphere — Substrata' },
  'shallow-end':            { playlistId: 'OLAK5uy_neqQaWuMLHzuuz7wgua5Z-o0W_yo4bXIY', label: 'Bonobo — Black Sands' },
  'ticker-tape':            { playlistId: 'OLAK5uy_mNqx-iWQKySNlnq4ZAZpwq3RLzOQHW3J4', label: 'Charles Mingus — Mingus Ah Um' },
};

/* Slug is DERIVED from the display name by the locked rule (deriveSlug) — the
   single source of truth, so a slug can never drift from the name again. The
   first aiDef arg is the SOUNDTRACK KEY (the project's historical id used only
   to look up AI_SOUNDTRACKS); it is NOT the slug. The 50-char @name cap fits
   every creative title, so no per-name overrides are needed. */
function aiDef(
  soundtrackKey: string, displayName: string, artistHandle: string, outputs: number,
  colorway: string, mintPriceEth: number, aspects: readonly number[],
  traitSchema: TraitSchema, render: ProjectDef['render'], traitsOf: ProjectDef['traitsOf'],
): ProjectDef {
  const slug = deriveSlug(displayName);
  return {
    slug, displayName, artistHandle, outputs, colorway, mintPriceEth,
    soundtrack: AI_SOUNDTRACKS[soundtrackKey] ?? null, aspects, traitSchema, render, traitsOf,
  };
}

const AI_PROJECTS: readonly ProjectDef[] = [
  aiDef('full-faith-credit', 'Full Faith & Credit', 'mintcondition-ai', 888, '#1C4428', 0.08, FAITH_ASPECTS, faithSchema, renderFaith, faithTraits),
  /* Renamed Delisted → Price Discovery (Brendon, 2026-06-16); keeps its own
     soundtrack key + engine. The former 'price-discovery' project was removed. */
  aiDef('delisted', 'Price Discovery', 'lastprice-ai', 512, '#27C08A', 0.05, DELISTED_ASPECTS, delistedSchema, renderDelisted, delistedTraits),
  aiDef('the-river-disagrees', 'The River Disagrees', 'countyline-ai', 256, '#36A8C8', 0.12, RIVER_ASPECTS, riverSchema, renderRiver, riverTraits),
  aiDef('stars-nobody-named', 'Names Withheld', 'nightclerk-ai', 333, '#B026FF', 0.07, STARS_ASPECTS, starsSchema, renderStars, starsTraits),
  aiDef('thank-you-no-refunds', 'Thank You, No Refunds', 'regfour-ai', 1024, '#FF5A8A', 0.02, REFUNDS_ASPECTS, refundsSchema, renderRefunds, refundsTraits),
  aiDef('elevations', 'Elevations', 'walkup-ai', 404, '#3C5E8C', 0.06, ELEVATIONS_ASPECTS, elevationsSchema, renderElevations, elevationsTraits),
  aiDef('dyed-in-the-wool', 'Dyed In The Wool', 'dyelot-ai', 222, '#C84A98', 0.15, WOOL_ASPECTS, woolSchema, renderWool, woolTraits),
  aiDef('noise-from-below', 'Noise From Below', 'fathom-ai', 128, '#8A6E3C', 0.18, BELOW_ASPECTS, belowSchema, renderBelow, belowTraits),
  aiDef('letters-never-sent', 'Letters Never Sent', 'deadletter-ai', 96, '#D61A3C', 0.21, LETTERS_ASPECTS, lettersSchema, renderLetters, lettersTraits),
  aiDef('crosstown', 'Crosstown', 'nightnetwork-ai', 144, '#1D4FB8', 0.22, CROSSTOWN_ASPECTS, crosstownSchema, renderCrosstown, crosstownTraits),
  aiDef('average-contents-forty', 'Average Contents Forty', 'strikeanywhere-ai', 640, '#FF7A2B', 0.04, CONTENTS_ASPECTS, contentsSchema, renderContents, contentsTraits),
  aiDef('crossette', 'Use Once, Remember Always', 'shellcount-ai', 365, '#FFD514', 0.09, CROSSETTE_ASPECTS, crossetteSchema, renderCrossette, crossetteTraits),
  aiDef('guaranteed-to-grow', 'Guaranteed To Grow', 'rowseven-ai', 500, '#0F8A3C', 0.05, GROW_ASPECTS, growSchema, renderGrow, growTraits),
  aiDef('wait-till-next-year', 'Wait Till Next Year', 'homestand-ai', 162, '#2F7D4F', 0.11, NEXTYEAR_ASPECTS, nextYearSchema, renderNextYear, nextYearTraits),
  aiDef('every-light-in-town', 'Every Light In Town', 'bsides-ai', 450, '#E0202E', 0.06, EVERYLIGHT_ASPECTS, everyLightSchema, renderEveryLight, everyLightTraits),
  aiDef('nobodys-swimming', "Nobody's Swimming", 'deepend-ai', 288, '#2BB8E8', 0.1, SWIMMING_ASPECTS, swimmingSchema, renderSwimming, swimmingTraits),
  aiDef('between-the-lines', 'Between The Lines', 'secondplate-ai', 200, '#00E5FF', 0.14, BETWEEN_ASPECTS, betweenSchema, renderBetween, betweenTraits),
  aiDef('loud-on-cheap-paper', 'Loud On Cheap Paper', 'overprint-ai', 600, '#FF2BD1', 0.04, CHEAPPAPER_ASPECTS, cheapPaperSchema, renderCheapPaper, cheapPaperTraits),
  aiDef('scissors-no-plan', 'Hard Splice', 'nogluedrying-ai', 350, '#FF005C', 0.08, SCISSORS_ASPECTS, scissorsSchema, renderScissors, scissorsTraits),
  aiDef('hard-water', 'Hard Water', 'flatsea-ai', 99, '#7A00CC', 0.25, HARDWATER_ASPECTS, hardWaterSchema, renderHardWater, hardWaterTraits),
  aiDef('turf-war', 'Turf War', 'adjacency-ai', 200, '#C8FF00', 0.09, TURFWAR_ASPECTS, turfWarSchema, renderTurfWar, turfWarTraits),
  aiDef('avalanche', 'Avalanche', 'graincount-ai', 128, '#7FFFD4', 0.16, AVALANCHE_ASPECTS, avalancheSchema, renderAvalanche, avalancheTraits),
  /* ── new cohort (2026-06-13) ── */
  aiDef('everyone-is-typing', 'Everyone Is Typing', 'groupchat-ai', 512, '#5865f2', 0.03, CHATROOM_ASPECTS, chatroomSchema, renderChatroom, chatroomTraits),
  aiDef('breach-protocol', 'Breach Protocol', 'netrunner-ai', 333, '#00C2C7', 0.06, BREACH_ASPECTS, breachSchema, renderBreach, breachTraits),
  aiDef('teletext', 'Teletext', 'glyphfield-ai', 360, '#33ff66', 0.07, ASCII_ASPECTS, asciiSchema, renderAscii, asciiTraits),
  aiDef('riding-the-oil', 'Riding The Oil', 'firstchannel-ai', 600, '#ff8c42', 0.03, DISCORD_ASPECTS, discordSchema, renderDiscord, discordTraits),
  aiDef('konkret', 'Konkret', 'konkret-ai', 200, '#c0392b', 0.09, KONKRET_ASPECTS, konkretSchema, renderKonkret, konkretTraits),
  aiDef('ode-to-rudxane', 'Ode to Rudxane', 'firstmember-ai', 200, '#1c1a17', 0.1, RUDXANE_ASPECTS, rudxaneSchema, renderRudxane, rudxaneTraits),
  aiDef('materia', 'The Lapidary', 'lapidary-ai', 333, '#9a9a93', 0.08, MATERIA_ASPECTS, materiaSchema, renderMateria, materiaTraits),
  aiDef('diffusion', 'Turing’s Garden', 'turing-ai', 222, '#3D9B6C', 0.18, DIFFUSION_ASPECTS, diffusionSchema, renderDiffusion, diffusionTraits),
  aiDef('growth', 'Coral Logic', 'coralline-ai', 222, '#00e5c8', 0.16, GROWTH_ASPECTS, growthSchema, renderGrowth, growthTraits),
  aiDef('pigment', 'Divided Light', 'divisionist-ai', 256, '#1e88e5', 0.1, PIGMENT_ASPECTS, pigmentSchema, renderPigment, pigmentTraits),
  aiDef('filament', 'Filament', 'filament-ai', 200, '#7a2a22', 0.12, ISKRA_ASPECTS, iskraSchema, renderIskra, iskraTraits),
  aiDef('junction', 'Crossed Wires', 'truchet-ai', 333, '#2ad4ff', 0.05, JUNCTION_ASPECTS, junctionSchema, renderJunction, junctionTraits),
  aiDef('asterism', 'Asterism', 'nightclerk-ai', 333, '#5a7bd8', 0.07, ASTERISM_ASPECTS, asterismSchema, renderAsterism, asterismTraits),
  aiDef('seedhead', 'The Golden Angle', 'phyllo-ai', 300, '#CC6B49', 0.06, SEEDHEAD_ASPECTS, seedheadSchema, renderSeedhead, seedheadTraits),
  aiDef('circuit', 'Trace Routes', 'tracedeck-ai', 333, '#2bd47a', 0.06, CIRCUIT_ASPECTS, circuitSchema, renderCircuit, circuitTraits),
  /* ── new set (2026-06-18): a second project for four single-project artists ── */
  aiDef('setback', 'Setback', 'walkup-ai', 404, '#e0552e', 0.08, SETBACK_ASPECTS, setbackSchema, renderSetback, setbackTraits),
  aiDef('simultaneous', 'Simultaneous', 'divisionist-ai', 256, '#13a89e', 0.06, SIMULTANEOUS_ASPECTS, simultaneousSchema, renderSimultaneous, simultaneousTraits),
  aiDef('strata', 'Strata', 'dyelot-ai', 333, '#a8455e', 0.07, STRATA_ASPECTS, strataSchema, renderStrata, strataTraits),
  /* ── new cohort (2026-06-19): five fresh projects — a 3rd for divisionist-ai
     and a 2nd each for countyline / fathom / deepend / shellcount. ── */
  aiDef('spectra', 'Spectra', 'nightclerk-ai', 256, '#241a52', 0.09, SPECTRA_ASPECTS, spectraSchema, renderSpectra, spectraTraits),
  aiDef('contour-interval', 'Contour Interval', 'countyline-ai', 333, '#123a30', 0.07, CONTOUR_ASPECTS, contourSchema, renderContour, contourTraits),
  aiDef('soundings', 'Soundings', 'fathom-ai', 222, '#05131e', 0.12, SOUNDINGS_ASPECTS, soundingsSchema, renderSoundings, soundingsTraits),
  aiDef('shallow-end', 'Shallow End', 'deepend-ai', 300, '#0a6e7a', 0.06, SHALLOW_ASPECTS, shallowSchema, renderShallow, shallowTraits),
  aiDef('ticker-tape', 'Ticker Tape', 'shellcount-ai', 288, '#0d1a2b', 0.08, TICKERTAPE_ASPECTS, tickertapeSchema, renderTickertape, tickertapeTraits),
];

/* ── HALO surreal cohort (2026-06-28) ─────────────────────────────────────
 * Four new AI artists with kindred bodies of work + a sequel for fathom-ai:
 *   foolscap-ai    : The Loaded Question, Provenance, Datum  (value / text / systems)
 *   newsprint-ai : Off Register, Interference              (ink & optics on paper)
 *   veil-ai      : Against The Light, Drapery              (translucency & cloth)
 *   umbra-ai     : Vestibule (live), Heliodon (HELD)       (shadow & metaphysical space)
 *   fathom-ai    : Noise From Below 2                      (sequel to Noise From Below)
 */
// (merged alongside the VESPERS/ARMILLARY + surreal-vista cohorts already on dev)
const LOADED_QUESTION: ProjectDef = {
  slug: 'loaded-question', displayName: 'The Loaded Question', artistHandle: 'foolscap-ai', outputs: 777,
  colorway: '#f7c400', mintPriceEth: 0,
  soundtrack: { playlistId: 'PLUEMihO9lT7-yvLCQxUOojL_dcRNwRW06', label: 'Boards of Canada — Music Has the Right to Children' },
  aspects: LOADEDQUESTION_ASPECTS, traitSchema: loadedQuestionSchema, render: renderLoadedQuestion, traitsOf: loadedQuestionTraits,
};
const PROVENANCE: ProjectDef = {
  slug: 'provenance', displayName: 'Provenance', artistHandle: 'foolscap-ai', outputs: 256,
  colorway: '#b23a2e', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_mGng1-1F5dTzxQK7ONy9aqE350bh9ayHc', label: 'Arvo Pärt — Tabula Rasa' },
  aspects: PROVENANCE_ASPECTS, traitSchema: provenanceSchema, render: renderProvenance, traitsOf: provenanceTraits,
};
const DATUM: ProjectDef = {
  slug: 'datum', displayName: 'Datum', artistHandle: 'foolscap-ai', outputs: 333,
  colorway: '#14365e', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_msIUSKs_bvqV-eWDtz84ZMQ2ZxCcWZWeM', label: 'Alva Noto + Ryuichi Sakamoto — Vrioon' },
  aspects: DATUM_ASPECTS, traitSchema: datumSchema, render: renderDatum, traitsOf: datumTraits,
};
const OFF_REGISTER: ProjectDef = {
  slug: 'off-register', displayName: 'Off Register', artistHandle: 'newsprint-ai', outputs: 256,
  colorway: '#ff5a3c', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_mkw5lnHV_WtzF65IfSBTHqHcj_bvqiBU0', label: 'Kraftwerk — Trans-Europe Express' },
  aspects: OFFREGISTER_ASPECTS, traitSchema: offRegisterSchema, render: renderOffRegister, traitsOf: offRegisterTraits,
};
const INTERFERENCE: ProjectDef = {
  slug: 'interference', displayName: 'Interference', artistHandle: 'newsprint-ai', outputs: 222,
  colorway: '#8a93a0', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', label: 'Biosphere — Substrata' },
  aspects: INTERFERENCE_ASPECTS, traitSchema: interferenceSchema, render: renderInterference, traitsOf: interferenceTraits,
};
const AGAINST_LIGHT: ProjectDef = {
  slug: 'against-the-light', displayName: 'Against The Light', artistHandle: 'veil-ai', outputs: 256,
  colorway: '#b8a070', mintPriceEth: 0,
  soundtrack: { playlistId: 'PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS', label: 'Stars of the Lid — The Tired Sounds Of' },
  aspects: AGAINSTLIGHT_ASPECTS, traitSchema: againstLightSchema, render: renderAgainstLight, traitsOf: againstLightTraits,
};
const DRAPERY: ProjectDef = {
  slug: 'drapery', displayName: 'Drapery', artistHandle: 'veil-ai', outputs: 222,
  colorway: '#7a3b3b', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_kS0xK-8stFnvAtN5wIIAidUD2MAXSOxAI', label: 'Sigur Rós — Ágætis byrjun' },
  aspects: DRAPERY_ASPECTS, traitSchema: draperySchema, render: renderDrapery, traitsOf: draperyTraits,
};
const VESTIBULE: ProjectDef = {
  slug: 'vestibule', displayName: 'Vestibule', artistHandle: 'umbra-ai', outputs: 256,
  colorway: '#c2613b', mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_lpG0l4Qyw1VEijbIO1usIb9gMy7V7zFnA', label: 'Max Richter — The Blue Notebooks' },
  aspects: VESTIBULE_ASPECTS, traitSchema: vestibuleSchema, render: renderVestibule, traitsOf: vestibuleTraits,
};
const NOISE_BELOW_2: ProjectDef = {
  slug: 'noise-from-below-2', displayName: 'Noise From Below 2', artistHandle: 'fathom-ai', outputs: 128,
  colorway: '#8A6E3C', mintPriceEth: 0,
  soundtrack: { playlistId: 'PL2MEf0Id3TeFo6QBeY76d_zvOicDoG_lg', label: 'Godspeed You! Black Emperor — Lift Your Skinny Fists' },
  aspects: BELOW2_ASPECTS, traitSchema: below2Schema, render: renderBelow2, traitsOf: below2Traits,
};


/* ── HALO cohort — 8 abstract projects by opus4-8 (2026-06-30). From a 12-way
 * tournament of surreal "real-but-off" systems, developed to gallery grade.
 * Each owns its own palette world and value key (no two alike across the room).
 * Soundtracks beyond Rime are curated as a fast-follow. */
const LONG_NOON: ProjectDef = {
  slug: 'long-noon',
  displayName: 'Long Noon',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#B07C3C',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: LONGNOON_ASPECTS,
  traitSchema: longNoonSchema,
  render: renderLongNoon,
  traitsOf: longNoonTraits,
};

const SAP_RISING: ProjectDef = {
  slug: 'sap-rising',
  displayName: 'Sap Rising',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#7E8C76',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: SAPRISING_ASPECTS,
  traitSchema: sapRisingSchema,
  render: renderSapRising,
  traitsOf: sapRisingTraits,
};

const COLD_JOINT: ProjectDef = {
  slug: 'cold-joint',
  displayName: 'Cold Joint',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#8A9488',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: COLDJOINT_ASPECTS,
  traitSchema: coldJointSchema,
  render: renderColdJoint,
  traitsOf: coldJointTraits,
};

const RIME: ProjectDef = {
  slug: 'rime',
  displayName: 'Rime',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#3C7E8E',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PLobEMHfBbtTa4_I_EuEAPoBA_94TxDGz-', label: 'Biosphere — Arctic Ambient' },
  aspects: RIME_ASPECTS,
  traitSchema: rimeSchema,
  render: renderRime,
  traitsOf: rimeTraits,
};

const LAST_LAMP: ProjectDef = {
  slug: 'last-lamp',
  displayName: 'Last Lamp',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#E5A36A',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PLQz6PJ04bouOH_ntfdWhnOXIAW74Cxywa', label: 'Bohren & der Club of Gore — Sunset Mission' },
  aspects: LASTLAMP_ASPECTS,
  traitSchema: lastLampSchema,
  render: renderLastLamp,
  traitsOf: lastLampTraits,
};

const VANITAS: ProjectDef = {
  slug: 'vanitas',
  displayName: 'Vanitas',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#6E2A26',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_nnGLS5r8Q3tsdQNJXHA6IXqppW7TLmgAM', label: 'Jóhann Jóhannsson — Orphée' },
  aspects: VANITAS_ASPECTS,
  traitSchema: vanitasSchema,
  render: renderVanitas,
  traitsOf: vanitasTraits,
};

const MINIUM: ProjectDef = {
  slug: 'minium',
  displayName: 'Minium',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#A8543A',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: MINIUM_ASPECTS,
  traitSchema: miniumSchema,
  render: renderMinium,
  traitsOf: miniumTraits,
};

const NOCTILUCENT: ProjectDef = {
  slug: 'noctilucent',
  displayName: 'Noctilucent',
  artistHandle: 'opus4-8',
  outputs: 256,
  colorway: '#9FC4DA',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PLvsYXqtYjMYd1On1Rqof9AboHuAkOcZ5A', label: 'Loscil — Clara' },
  aspects: NOCTILUCENT_ASPECTS,
  traitSchema: noctilucentSchema,
  render: renderNoctilucent,
  traitsOf: noctilucentTraits,
};

const DEAD_RECKONING: ProjectDef = {
  slug: 'dead-reckoning',
  displayName: 'Dead Reckoning',
  artistHandle: 'opus4-8',
  outputs: 217,
  colorway: '#7E8C91',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PLDE6874E48524BA11', label: 'Eluvium — Talk Amongst the Trees' },
  aspects: DEADRECKONING_ASPECTS,
  traitSchema: deadreckoningSchema,
  render: renderDeadReckoning,
  traitsOf: deadreckoningTraits,
};


/* ── HALO cohort 2 — 24 new abstract projects (opus4-8 build, assigned to -ai artists) ── */
const AFTER_GRAVITY: ProjectDef = {
  slug: 'after-gravity',
  displayName: 'After Gravity',
  artistHandle: 'umbra-ai',
  outputs: 256,
  colorway: '#2E5FA3',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: AFTERGRAVITY_ASPECTS,
  traitSchema: aftergravitySchema,
  render: renderAfterGravity,
  traitsOf: aftergravityTraits,
};

const VANGUARD: ProjectDef = {
  slug: 'vanguard',
  displayName: 'Vanguard',
  artistHandle: 'tracedeck-ai',
  outputs: 256,
  colorway: '#D02E22',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: VANGUARD_ASPECTS,
  traitSchema: vanguardSchema,
  render: renderVanguard,
  traitsOf: vanguardTraits,
};

const QUIET_MUTINY: ProjectDef = {
  slug: 'quiet-mutiny',
  displayName: 'Quiet Mutiny',
  artistHandle: 'foolscap-ai',
  outputs: 333,
  colorway: '#2B2A28',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: QUIET_MUTINY_ASPECTS,
  traitSchema: quietMutinySchema,
  render: renderQuietMutiny,
  traitsOf: quietMutinyTraits,
};

const ANDANTE: ProjectDef = {
  slug: 'andante',
  displayName: 'Andante',
  artistHandle: 'lowgravity-ai',
  outputs: 288,
  colorway: '#2D52C9',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: ANDANTE_ASPECTS,
  traitSchema: andanteSchema,
  render: renderAndante,
  traitsOf: andanteTraits,
};

const THRESHOLD: ProjectDef = {
  slug: 'threshold',
  displayName: 'Threshold',
  artistHandle: 'firstchannel-ai',
  outputs: 222,
  colorway: '#233E8C',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: THRESHOLD_ASPECTS,
  traitSchema: thresholdSchema,
  render: renderThreshold,
  traitsOf: thresholdTraits,
};

const ICTUS: ProjectDef = {
  slug: 'ictus',
  displayName: 'Ictus',
  artistHandle: 'nightpour-ai',
  outputs: 222,
  colorway: '#7A2E26',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: ICTUS_ASPECTS,
  traitSchema: ictusSchema,
  render: renderIctus,
  traitsOf: ictusTraits,
};

const JAZZ: ProjectDef = {
  slug: 'jazz',
  displayName: 'Jazz',
  artistHandle: 'newsprint-ai',
  outputs: 256,
  colorway: '#E8643C',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: JAZZ_ASPECTS,
  traitSchema: jazzSchema,
  render: renderJazz,
  traitsOf: jazzTraits,
};

const REVERIE: ProjectDef = {
  slug: 'reverie',
  displayName: 'Reverie',
  artistHandle: 'veil-ai',
  outputs: 256,
  colorway: '#C98B86',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: REVERIE_ASPECTS,
  traitSchema: reverieSchema,
  render: renderReverie,
  traitsOf: reverieTraits,
};

const CADENCE: ProjectDef = {
  slug: 'cadence',
  displayName: 'Cadence',
  artistHandle: 'foolscap-ai',
  outputs: 288,
  colorway: '#1D4E89',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: CADENCE_ASPECTS,
  traitSchema: cadenceSchema,
  render: renderCadence,
  traitsOf: cadenceTraits,
};

const APERTURE: ProjectDef = {
  slug: 'aperture',
  displayName: 'Aperture',
  artistHandle: 'lapidary-ai',
  outputs: 256,
  colorway: '#1C8C7A',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: APERTURE_ASPECTS,
  traitSchema: apertureSchema,
  render: renderAperture,
  traitsOf: apertureTraits,
};

const INTERIM: ProjectDef = {
  slug: 'interim',
  displayName: 'Interim',
  artistHandle: 'lowgravity-ai',
  outputs: 222,
  colorway: '#2C3E70',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: INTERIM_ASPECTS,
  traitSchema: interimSchema,
  render: renderInterim,
  traitsOf: interimTraits,
};

const STILLPOINT: ProjectDef = {
  slug: 'stillpoint',
  displayName: 'Stillpoint',
  artistHandle: 'umbra-ai',
  outputs: 333,
  colorway: '#C0392B',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'OLAK5uy_l61jyu2-HfVxbgW4KFUruUOjU56T0az-s', label: 'Alice Coltrane — Journey in Satchidananda' },
  aspects: STILLPOINT_ASPECTS,
  traitSchema: stillpointSchema,
  render: renderStillpoint,
  traitsOf: stillpointTraits,
};

const CHLADNI: ProjectDef = {
  slug: 'chladni',
  displayName: 'Chladni',
  artistHandle: 'murmur-ai',
  outputs: 256,
  colorway: '#C7A878',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: CHLADNI_ASPECTS,
  traitSchema: chladniSchema,
  render: renderChladni,
  traitsOf: chladniTraits,
};

const CAUSTICS: ProjectDef = {
  slug: 'caustics',
  displayName: 'Caustics',
  artistHandle: 'slacktide-ai',
  outputs: 288,
  colorway: '#1FA6A0',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: CAUSTICS_ASPECTS,
  traitSchema: causticsSchema,
  render: renderCaustics,
  traitsOf: causticsTraits,
};

const SCHLIEREN: ProjectDef = {
  slug: 'schlieren',
  displayName: 'Schlieren',
  artistHandle: 'veil-ai',
  outputs: 222,
  colorway: '#8A9099',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: SCHLIEREN_ASPECTS,
  traitSchema: schlierenSchema,
  render: renderSchlieren,
  traitsOf: schlierenTraits,
};

const FROST_FERN: ProjectDef = {
  slug: 'frost-fern',
  displayName: 'Frost Fern',
  artistHandle: 'coralline-ai',
  outputs: 256,
  colorway: '#8FC7E0',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: FROST_FERN_ASPECTS,
  traitSchema: frostFernSchema,
  render: renderFrostFern,
  traitsOf: frostFernTraits,
};

const CYANOTYPE: ProjectDef = {
  slug: 'cyanotype',
  displayName: 'Cyanotype',
  artistHandle: 'overprint-ai',
  outputs: 256,
  colorway: '#2A4A8C',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: CYANOTYPE_ASPECTS,
  traitSchema: cyanotypeSchema,
  render: renderCyanotype,
  traitsOf: cyanotypeTraits,
};

const KINTSUGI: ProjectDef = {
  slug: 'kintsugi',
  displayName: 'Kintsugi',
  artistHandle: 'lapidary-ai',
  outputs: 333,
  colorway: '#C9A227',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: KINTSUGI_ASPECTS,
  traitSchema: kintsugiSchema,
  render: renderKintsugi,
  traitsOf: kintsugiTraits,
};

const EFFLORESCENCE: ProjectDef = {
  slug: 'efflorescence',
  displayName: 'Efflorescence',
  artistHandle: 'fathom-ai',
  outputs: 222,
  colorway: '#9FB0AE',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: EFFLORESCENCE_ASPECTS,
  traitSchema: efflorescenceSchema,
  render: renderEfflorescence,
  traitsOf: efflorescenceTraits,
};

const EVAPORATE: ProjectDef = {
  slug: 'evaporate',
  displayName: 'Evaporate',
  artistHandle: 'overprint-ai',
  outputs: 256,
  colorway: '#8A5A3C',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: EVAPORATE_ASPECTS,
  traitSchema: evaporateSchema,
  render: renderEvaporate,
  traitsOf: evaporateTraits,
};

const ENCAUSTIC: ProjectDef = {
  slug: 'encaustic',
  displayName: 'Encaustic',
  artistHandle: 'firstchannel-ai',
  outputs: 256,
  colorway: '#D9A24E',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: ENCAUSTIC_ASPECTS,
  traitSchema: encausticSchema,
  render: renderEncaustic,
  traitsOf: encausticTraits,
};

const PATINA: ProjectDef = {
  slug: 'patina',
  displayName: 'Patina',
  artistHandle: 'fathom-ai',
  outputs: 256,
  colorway: '#3E8C6E',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: PATINA_ASPECTS,
  traitSchema: patinaSchema,
  render: renderPatina,
  traitsOf: patinaTraits,
};

const FROTTAGE: ProjectDef = {
  slug: 'frottage',
  displayName: 'Frottage',
  artistHandle: 'offset-ai',
  outputs: 222,
  colorway: '#6E7378',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: FROTTAGE_ASPECTS,
  traitSchema: frottageSchema,
  render: renderFrottage,
  traitsOf: frottageTraits,
};

const FUMAGE: ProjectDef = {
  slug: 'fumage',
  displayName: 'Fumage',
  artistHandle: 'offset-ai',
  outputs: 222,
  colorway: '#3A332C',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: FUMAGE_ASPECTS,
  traitSchema: fumageSchema,
  render: renderFumage,
  traitsOf: fumageTraits,
};

/* ── HALO cohort (2026-07) — 12 surreal "real-but-off" systems, a 12-way
 * tournament assigned across kindred -ai artists by style. Champion: Narthex
 * (a freestanding dusk arch framing another world; signature colorway Grail).
 * All continuous seed-driven engines with distinct palette worlds. */
const NARTHEX: ProjectDef = {
  slug: 'narthex',
  displayName: 'Narthex',
  artistHandle: 'veil-ai',
  outputs: 333,
  colorway: '#2A2B2F',
  mintPriceEth: 0,
  soundtrack: { playlistId: 'PLQNHYNv9IpSzzaQMuH7ji2bEy6o8T8Wwn', label: 'Hiroshi Yoshimura — Music for Nine Post Cards' },
  aspects: NARTHEX_ASPECTS,
  traitSchema: narthexSchema,
  render: renderNarthex,
  traitsOf: narthexTraits,
};
const SECOND_SUN: ProjectDef = {
  slug: 'secondsun',
  displayName: 'Second Sun',
  artistHandle: 'filament-ai',
  outputs: 256,
  colorway: '#E8895A',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: SECONDSUN_ASPECTS,
  traitSchema: secondSunSchema,
  render: renderSecondSun,
  traitsOf: secondSunTraits,
};
const SLACK_TIDE: ProjectDef = {
  slug: 'slacktide',
  displayName: 'Slack Tide',
  artistHandle: 'fathom-ai',
  outputs: 256,
  colorway: '#6F8A86',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: SLACKTIDE_ASPECTS,
  traitSchema: slackTideSchema,
  render: renderSlackTide,
  traitsOf: slackTideTraits,
};
const APPOINTMENT: ProjectDef = {
  slug: 'appointment',
  displayName: 'The Appointment',
  artistHandle: 'umbra-ai',
  outputs: 256,
  colorway: '#C98B86',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: APPOINTMENT_ASPECTS,
  traitSchema: appointmentSchema,
  render: renderAppointment,
  traitsOf: appointmentTraits,
};
const CABINET: ProjectDef = {
  slug: 'cabinet',
  displayName: 'Cabinet',
  artistHandle: 'lapidary-ai',
  outputs: 256,
  colorway: '#6B7A52',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: CABINET_ASPECTS,
  traitSchema: cabinetSchema,
  render: renderCabinet,
  traitsOf: cabinetTraits,
};
const OVERCAST: ProjectDef = {
  slug: 'overcast',
  displayName: 'Overcast',
  artistHandle: 'murmur-ai',
  outputs: 256,
  colorway: '#5B6470',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: OVERCAST_ASPECTS,
  traitSchema: overcastSchema,
  render: renderOvercast,
  traitsOf: overcastTraits,
};
const STILL_RAIN: ProjectDef = {
  slug: 'stillrain',
  displayName: 'Still Rain',
  artistHandle: 'deepend-ai',
  outputs: 256,
  colorway: '#6E8794',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: STILLRAIN_ASPECTS,
  traitSchema: stillRainSchema,
  render: renderStillRain,
  traitsOf: stillRainTraits,
};
const PAPER_COUNTRY: ProjectDef = {
  slug: 'papercountry',
  displayName: 'Paper Country',
  artistHandle: 'graincount-ai',
  outputs: 256,
  colorway: '#B7AB97',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: PAPERCOUNTRY_ASPECTS,
  traitSchema: paperCountrySchema,
  render: renderPaperCountry,
  traitsOf: paperCountryTraits,
};
const BALLAST: ProjectDef = {
  slug: 'ballast',
  displayName: 'Ballast',
  artistHandle: 'stellar-ai',
  outputs: 256,
  colorway: '#4E5A66',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: BALLAST_ASPECTS,
  traitSchema: ballastSchema,
  render: renderBallast,
  traitsOf: ballastTraits,
};
const SALT_MIRROR: ProjectDef = {
  slug: 'saltmirror',
  displayName: 'Salt Mirror',
  artistHandle: 'flatsea-ai',
  outputs: 256,
  colorway: '#BCA89E',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: SALTMIRROR_ASPECTS,
  traitSchema: saltMirrorSchema,
  render: renderSaltMirror,
  traitsOf: saltMirrorTraits,
};
const EVENING_ROOMS: ProjectDef = {
  slug: 'eveningrooms',
  displayName: 'Evening Rooms',
  artistHandle: 'afterhours-ai',
  outputs: 256,
  colorway: '#B07C3E',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: EVENINGROOMS_ASPECTS,
  traitSchema: eveningRoomsSchema,
  render: renderEveningRooms,
  traitsOf: eveningRoomsTraits,
};
const VESTMENT: ProjectDef = {
  slug: 'vestment',
  displayName: 'Vestment',
  artistHandle: 'glyphfield-ai',
  outputs: 256,
  colorway: '#7A2E2A',
  mintPriceEth: 0,
  soundtrack: null,
  aspects: VESTMENT_ASPECTS,
  traitSchema: vestmentSchema,
  render: renderVestment,
  traitsOf: vestmentTraits,
};

const PROJECTS: readonly ProjectDef[] = [PRISMS, ORACLE, ...AI_PROJECTS, TEST_PATTERN, CULTIVAR, PENDULA, BOREAL, RELIQUARY, BULLETIN, ARCOLOGY, CARNIVALE, HALO_B, HALO_C, HALO_D, TERMINAL_NETWORK, LEVIATHAN, EMPYREAN, ELECTRUM, QUICKSILVER, LUSTRE, BLOOMWATER, VOLTAIC, FACET, VESPERS, ARMILLARY, MURMURATION, TOKEH, CONSERVATORY, ORBITAL, PRESSROOM, CINDER, CATENARY, TOPIARY, SLACK_WATER, LOADED_QUESTION, PROVENANCE, DATUM, OFF_REGISTER, INTERFERENCE, AGAINST_LIGHT, DRAPERY, VESTIBULE, NOISE_BELOW_2, LONG_NOON, SAP_RISING, COLD_JOINT, RIME, LAST_LAMP, VANITAS, MINIUM, NOCTILUCENT, DEAD_RECKONING, AFTER_GRAVITY, VANGUARD, QUIET_MUTINY, ANDANTE, THRESHOLD, ICTUS, JAZZ, REVERIE, CADENCE, APERTURE, INTERIM, STILLPOINT, CHLADNI, CAUSTICS, SCHLIEREN, FROST_FERN, CYANOTYPE, KINTSUGI, EFFLORESCENCE, EVAPORATE, ENCAUSTIC, PATINA, FROTTAGE, FUMAGE, NARTHEX, SECOND_SUN, SLACK_TIDE, APPOINTMENT, CABINET, OVERCAST, STILL_RAIN, PAPER_COUNTRY, BALLAST, SALT_MIRROR, EVENING_ROOMS, VESTMENT];
const BY_SLUG = new Map<string, ProjectDef>(PROJECTS.map((p) => [p.slug, p]));

/* True Name — each Project's permanent, unique secret-name glyph (uppercase
   Glagolitic, 4 letters; lib/project/trueName.ts). Assigned once over the
   registry with collision-nudge, so it's stable per slug and unique across all
   Projects. The reverse map powers true-name search (slug ⇄ name). */
const TRUE_NAMES = assignTrueNames(PROJECTS.map((p) => p.slug));
const SLUG_BY_TRUE_NAME = new Map<string, string>(
  [...TRUE_NAMES].map(([slug, name]) => [name, slug]),
);

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

/* ── Colorway: DB-driven, registry value as fallback ─────────────────────────
   A Project's signature colour lives in the DB (`projects.custom_color`) so the
   artist can change it without a code deploy — same standard as the soundtrack.
   The registry `colorway` is only the fallback for first paint / missing rows.
   ProjectContext fills this override map when the project data lands (then fires
   `pd:custom-color-changed` so the page bg repaints). All colour reads go
   through `projectColorway()` so DB and fallback are resolved in one place. */
const COLOR_OVERRIDE = new Map<string, string>();

/** Record the DB colour for a slug (null/blank clears it). */
export function setProjectColorOverride(slug: string, hex: string | null | undefined): void {
  const s = slug.toLowerCase();
  if (hex && /^#[0-9a-f]{6}$/i.test(hex.trim())) COLOR_OVERRIDE.set(s, hex.trim());
  else COLOR_OVERRIDE.delete(s);
}

/** A Project's signature colour: DB override if present, else the registry
    fallback, else null for an unknown slug. */
export function projectColorway(slug: string): string | null {
  const s = slug.toLowerCase();
  return COLOR_OVERRIDE.get(s) ?? BY_SLUG.get(s)?.colorway ?? null;
}

/** Whether a slug names a registered Project. */
export function isProjectSlug(slug: string): boolean {
  return BY_SLUG.has(slug.toLowerCase());
}

/** The Project's permanent, unique true name (uppercase-Glagolitic glyphs). */
export function projectTrueName(slug: string): string {
  return TRUE_NAMES.get(slug.toLowerCase()) ?? '';
}

/** An Output's true name — the Project's true name with the edition number
    appended (id ≤ 4 digits, 9,999 max per the contract): e.g. `ⰀⰁⰂⰃ1234`. */
export function outputTrueName(slug: string, tokenId: number): string {
  const base = projectTrueName(slug);
  return base ? `${base}${tokenId}` : '';
}

/** Resolve a true name (the glyph string) back to its Project, or null. */
export function findProjectByTrueName(name: string): ProjectDef | null {
  const slug = SLUG_BY_TRUE_NAME.get(name);
  return slug ? getProject(slug) : null;
}

/* The Artwork's stored image lives in Cloudflare storage (standing in for
   Arweave): `${ART_IMAGE_BASE}/{slug}/{tokenId}.png`. When a base is configured
   the whole app draws the STORED image everywhere the Artwork appears — cards,
   grids, thumbnails, home, profiles, bench, search — instead of running the
   generative engine. The ONE exception is the Output's own feature page, which
   asks for the live render (`live: true`). Empty base ⇒ the app renders live as
   before (safe default before images are uploaded). */
export const ART_IMAGE_BASE = (process.env.NEXT_PUBLIC_ART_IMAGE_BASE || '').replace(/\/+$/, '');

/**
 * Render an Output's Artwork by slug. Sizes the canvas, returns aspect +
 * the Output's full traits (artist traits + Fate). Unknown slug → no paint,
 * square aspect, Fate-only traits (keeps callers safe during data drift).
 *
 * When `ART_IMAGE_BASE` is set and `live` is not requested, the stored image is
 * drawn onto the canvas instead of the live engine — this is the app-wide
 * default so every surface shows the Cloudflare-hosted picture. The feature
 * page passes `live: true` to keep the real generative render.
 */
export function renderArtwork(
  canvas: HTMLCanvasElement,
  slug: string,
  tokenId: number,
  width: number,
  live = false,
): { aspect: number; traits: OutputTraits } {
  const project = getProject(slug);
  if (!project) {
    return { aspect: 1, traits: { Fate: outputFate(slug, tokenId) } };
  }
  if (!live && ART_IMAGE_BASE) {
    const traits = { ...project.traitsOf(tokenId), Fate: outputFate(slug, tokenId) };
    // Draw the stored image onto the same canvas the engine would have used, so
    // every existing surface (layout, virtualizer, hover) keeps working unchanged.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !img.naturalWidth) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      // Correct the container's aspect to the real image once it's known
      // (callers set a provisional ratio from the sync return below).
      const wrap = typeof canvas.closest === 'function' ? canvas.closest('.canvas-wrapper') : null;
      if (wrap instanceof HTMLElement) wrap.style.aspectRatio = String(img.naturalWidth / img.naturalHeight);
    };
    img.src = `${ART_IMAGE_BASE}/${slug}/${tokenId}.png`;
    // Provisional aspect from the project's palette keeps layout from collapsing
    // to zero height before the image loads; onload corrects it exactly.
    return { aspect: project.aspects?.[0] ?? 1, traits };
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
    out[PLATFORM_TRAIT.priceDay] = `PriceDay #${priceDayNumber(new Date(mintMs))}`;
    const chart = natalChart(mintMs);
    out[PLATFORM_TRAIT.sun] = chart.sun;
    out[PLATFORM_TRAIT.moon] = chart.moon;
    out[PLATFORM_TRAIT.rising] = chart.rising;
  }
  out[PLATFORM_TRAIT.fate] = outputFate(slug, tokenId);
  return out;
}

/* Project Status (live mint progress) — the project-level analogue of an
   Output's Listed/Held. Derived from supply consumed, so it varies across the
   minting set (everything in Now Minting is, by definition, "minting"). */
export type MintProgress = 'Fresh' | 'Filling' | 'Almost Gone';
export function mintProgress(mintedCount: number, maxSupply: number): MintProgress {
  if (maxSupply <= 0) return 'Fresh';
  const pct = mintedCount / maxSupply;
  if (pct >= 0.8) return 'Almost Gone';
  if (pct >= 0.34) return 'Filling';
  return 'Fresh';
}

/**
 * Full per-PROJECT traits — a project is "born" at upload exactly as an Output
 * is born at mint, so it carries the same birth-order platform traits computed
 * the same way (Artist › @name › PriceDay › Natal Sun/Moon/Rising › Fate), plus
 * a live Status (mint progress). Derived, not stored — identical model to
 * `outputTraits` (which computes from the mint moment + slug, never a DB column).
 *
 * Pass `birthMs` (upload Unix-ms) for the PriceDay + Natal trio; omit it for the
 * deterministic subset. Pass minted/supply for Status; omit to skip it.
 */
export function projectTraits(
  slug: string,
  birthMs?: number,
  mintedCount?: number,
): OutputTraits {
  const project = getProject(slug);
  const out: OutputTraits = {};
  if (project) {
    out[PLATFORM_TRAIT.artist] = `@${project.artistHandle}`;
    // The project's @name. Slug is the canonical handle until the authored
    // upload @name lands as its own field; swap the source then, UI unchanged.
    out[PLATFORM_TRAIT.project] = `@${project.slug}`;
  }
  if (birthMs != null && Number.isFinite(birthMs)) {
    out[PLATFORM_TRAIT.priceDay] = `PriceDay #${priceDayNumber(new Date(birthMs))}`;
    const chart = natalChart(birthMs);
    out[PLATFORM_TRAIT.sun] = chart.sun;
    out[PLATFORM_TRAIT.moon] = chart.moon;
    out[PLATFORM_TRAIT.rising] = chart.rising;
  }
  out[PLATFORM_TRAIT.fate] = projectFate(slug);
  // Status = the milestone tier the project's mint count has reached
  // (Graduated → Lucky 22 → … → Hi-Def); sold-out is not a status.
  if (mintedCount != null) {
    out.Status = projectStatus(mintedCount);
  }
  return out;
}

/** Merged trait schema (artist traits + Fate) for the filter UI. */
export function fullTraitSchema(slug: string): TraitSchema {
  const project = getProject(slug);
  const artist = project ? project.traitSchema.traits : [];
  return { traits: [...artist, FATE_TRAIT] };
}
