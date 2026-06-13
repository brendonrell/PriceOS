/*
 * AI sample projects — typed boundary over ./core.
 *
 * Each project exports the standard engine triplet (render / traitsOf /
 * schema / aspects) consumed by lib/project/registry.ts, identical in shape
 * to Prisms and Oracle. The core engines paint at their own internal
 * resolution and pick their own aspect per token, so render() paints to an
 * offscreen canvas and blits into the requested width — engines run
 * client-side only (types.ts contract), traitsOf() is pure and server-safe
 * (it replays each engine's leading rng draws; machine-verified against the
 * renders, 40 seeds per engine).
 */

import type {
  EngineFn,
  TraitsFn,
  TraitSchema,
  OutputTraits,
} from '../../../project/types';
import * as C from './core';

/* Paint via the core engine at native resolution, blit at requested width. */
function blit(
  raw: (cv: HTMLCanvasElement, seed: number) => void,
  traitsOf: TraitsFn,
): EngineFn {
  return (canvas, tokenId, width) => {
    const off = document.createElement('canvas');
    raw(off, tokenId);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round((W * off.height) / off.width));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(off, 0, 0, W, H);
    return { aspect: off.width / off.height, traits: traitsOf(tokenId) };
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── Full Faith & Credit ────────────────────────────────────────────────── */
const NATION: Record<string, string> = {
  classic: 'Engravers', vertical: 'Letterpress', modern: 'Grids', window: 'Hatchers',
};
const BANKS = ['BANCO DE LA NIEBLA', 'RESERVE OF THE INTERIOR', 'FIRST MERIDIAN TRUST', 'BANK OF THE SOUTH REACH', 'NATIONAL LYRIC RESERVE', 'TREASURY OF THE LESSER MOONS', 'CAISSE DE PROVIDENCIA', 'STERLING AUTHORITY OF VESPER'];
export const faithTraits: TraitsFn = (id) => {
  const c = C.castSpecimen(id);
  return { Nation: NATION[c.layout], Denomination: String(c.den), Issuer: c.bank };
};
export const faithSchema: TraitSchema = {
  traits: [
    { name: 'Nation', values: ['Engravers', 'Letterpress', 'Grids', 'Hatchers'] },
    { name: 'Denomination', values: ['1', '2', '5', '10', '20', '50', '100', '500', '1000'],
      subtraits: [
        { name: 'Pocket', values: ['1', '2', '5', '10'] },
        { name: 'Vault', values: ['20', '50', '100', '500', '1000'] },
      ] },
    { name: 'Issuer', values: BANKS },
  ],
};
export const renderFaith = blit(C.specimen, faithTraits);
export const FAITH_ASPECTS = [2.21, 0.45, 2.21, 2.5, 1.77] as const;

/* ── Delisted ───────────────────────────────────────────────────────────── */
const CHART: Record<string, string> = {
  candles: 'Candles', line: 'Line', area: 'Area', phone: 'Phone', bars: 'Bars',
};
const TAPE_PAL = ['Terminal', 'Amber', 'Print', 'Vapor', 'Acid', 'Midnight', 'Harbour'];
export const delistedTraits: TraitsFn = (id) => {
  const c = C.castTape(id);
  return { Chart: CHART[c.kind], Palette: TAPE_PAL[c.ti] };
};
export const delistedSchema: TraitSchema = {
  traits: [
    { name: 'Chart', values: ['Candles', 'Line', 'Area', 'Phone', 'Bars'] },
    { name: 'Palette', values: TAPE_PAL,
      subtraits: [
        { name: 'Screen', values: ['Terminal', 'Amber', 'Vapor', 'Acid', 'Midnight', 'Harbour'] },
        { name: 'Paper', values: ['Print'] },
      ] },
  ],
};
export const renderDelisted = blit(C.tape, delistedTraits);
export const DELISTED_ASPECTS = [2.38, 2, 1.48, 0.5] as const;

/* ── The River Disagrees ────────────────────────────────────────────────── */
const PLAT_PAPER = ['Cool White', 'Mint', 'Peach', 'Sky'];
export const riverTraits: TraitsFn = (id) => {
  const c = C.castPlat(id);
  const fmt = c.fmt.W === 1000 ? 'Portrait' : c.fmt.W === 1240 ? 'Landscape' : 'Square';
  return { Format: fmt, Paper: PLAT_PAPER[c.si] };
};
export const riverSchema: TraitSchema = {
  traits: [
    { name: 'Format', values: ['Portrait', 'Landscape', 'Square'] },
    { name: 'Paper', values: PLAT_PAPER },
  ],
};
export const renderRiver = blit(C.plat, riverTraits);
export const RIVER_ASPECTS = [0.81, 1.24, 1] as const;

/* ── Stars Nobody Named ─────────────────────────────────────────────────── */
const SKY = ['Midnight', 'Violet', 'Pine', 'Daylight', 'Harbour', 'Plum'];
const STARS_COMP: Record<string, string> = { field: 'Field', plani: 'Planisphere', horizon: 'Horizon' };
export const starsTraits: TraitsFn = (id) => {
  const c = C.castEphemeris(id);
  return { Sky: SKY[c.si], Composition: STARS_COMP[c.comp] };
};
export const starsSchema: TraitSchema = {
  traits: [
    { name: 'Sky', values: SKY,
      subtraits: [
        { name: 'Night', values: ['Midnight', 'Violet', 'Pine', 'Harbour', 'Plum'] },
        { name: 'Day', values: ['Daylight'] },
      ] },
    { name: 'Composition', values: ['Field', 'Planisphere', 'Horizon'] },
  ],
};
export const renderStars = blit(C.ephemeris, starsTraits);
export const STARS_ASPECTS = [0.81, 1.24, 1] as const;

/* ── Thank You, No Refunds ──────────────────────────────────────────────── */
const STOCK = ['White', 'Canary', 'Pink', 'Blue', 'Mint', 'Violet Ink'];
export const refundsTraits: TraitsFn = (id) => {
  const c = C.castReceipt(id);
  const width = c.W === 380 ? 'Slim' : c.W === 920 ? 'Wide' : 'Standard';
  const items = c.n <= 7 ? 'Short' : c.n <= 14 ? 'Standard' : 'Long';
  return { Width: width, Stock: STOCK[c.si], Items: items };
};
export const refundsSchema: TraitSchema = {
  traits: [
    { name: 'Width', values: ['Slim', 'Standard', 'Wide'] },
    { name: 'Stock', values: STOCK,
      subtraits: [
        { name: 'Plain', values: ['White', 'Violet Ink'] },
        { name: 'Tinted', values: ['Canary', 'Pink', 'Blue', 'Mint'] },
      ] },
    { name: 'Items', values: ['Short', 'Standard', 'Long'] },
  ],
};
export const renderRefunds = blit(C.receipt, refundsTraits);
export const REFUNDS_ASPECTS = [0.42, 0.3, 0.6] as const;

/* ── Elevations ─────────────────────────────────────────────────────────── */
const WINDOW: Record<string, string> = {
  '2pane': 'Two-Pane', arch: 'Arched', grid4: 'Four-Grid', strip: 'Strip',
  ribbon: 'Ribbon', oriel: 'Oriel',
};
const SHEET: Record<string, string> = {
  ink: 'Ink', blueprint: 'Blueprint', day: 'Daylight', dusk: 'Dusk', night: 'Nocturne',
};
const ROOF: Record<string, string> = {
  tank: 'Water Tank', antenna: 'Antenna', bulkhead: 'Bulkhead',
  parapet: 'Parapet', skylight: 'Skylight',
};
export const elevationsTraits: TraitsFn = (id) => {
  const c = C.castFacade(id);
  const storeys = c.floors <= 5 ? 'Low' : c.floors <= 8 ? 'Mid' : 'High';
  return { Sheet: SHEET[c.mode], Storeys: storeys, Window: WINDOW[c.style], Roof: ROOF[c.roof] };
};
export const elevationsSchema: TraitSchema = {
  traits: [
    { name: 'Sheet', values: ['Ink', 'Blueprint', 'Daylight', 'Dusk', 'Nocturne'] },
    { name: 'Storeys', values: ['Low', 'Mid', 'High'] },
    { name: 'Window', values: ['Two-Pane', 'Arched', 'Four-Grid', 'Strip', 'Ribbon', 'Oriel'] },
    { name: 'Roof', values: ['Water Tank', 'Antenna', 'Bulkhead', 'Parapet', 'Skylight'] },
  ],
};
export const renderElevations = blit(C.facade, elevationsTraits);
export const ELEVATIONS_ASPECTS = [0.8, 1, 1.3] as const;

/* ── Dyed In The Wool ───────────────────────────────────────────────────── */
const DYELOT = ['Indigo & Madder', 'Electric Orchid', 'Signal Gold', 'Madder & Sand', 'Acid Moss', 'Plum Ember', 'Harbour Gold', 'Rose Acid', 'Bone & Flame', 'Night Signal'];
export const woolTraits: TraitsFn = (id) => {
  const c = C.castLoom(id);
  const thread = c.T <= 6 ? 'Fine' : c.T === 8 ? 'Standard' : 'Chunky';
  return { 'Dye Lot': DYELOT[c.pi2], Motif: cap(c.motif), Weave: c.twill ? 'Twill' : 'Plain', Thread: thread };
};
export const woolSchema: TraitSchema = {
  traits: [
    { name: 'Dye Lot', values: DYELOT,
      subtraits: [
        { name: 'Classic', values: ['Indigo & Madder', 'Madder & Sand', 'Bone & Flame'] },
        { name: 'Electric', values: ['Electric Orchid', 'Acid Moss', 'Rose Acid', 'Night Signal'] },
        { name: 'Royal', values: ['Signal Gold', 'Plum Ember', 'Harbour Gold'] },
      ] },
    { name: 'Motif', values: ['Diamond', 'Chevron', 'Band', 'Block'] },
    { name: 'Weave', values: ['Plain', 'Twill'] },
    { name: 'Thread', values: ['Fine', 'Standard', 'Chunky'] },
  ],
};
export const renderWool = blit(C.loom, woolTraits);
export const WOOL_ASPECTS = [0.8, 1.1, 0.93] as const;

/* ── Noise From Below ───────────────────────────────────────────────────── */
export const belowTraits: TraitsFn = (id) => {
  const c = C.castCore(id);
  return { Columns: c.two ? 'Twin' : 'Single', Lamp: c.uv ? 'UV' : 'Field' };
};
export const belowSchema: TraitSchema = {
  traits: [
    { name: 'Columns', values: ['Single', 'Twin'] },
    { name: 'Lamp', values: ['Field', 'UV'] },
  ],
};
export const renderBelow = blit(C.core, belowTraits);
export const BELOW_ASPECTS = [0.4, 0.63] as const;

/* ── Letters Never Sent ─────────────────────────────────────────────────── */
const FIELD = ['Crimson', 'Cobalt', 'Green', 'Orange', 'Violet', 'Magenta', 'Amber', 'Teal'];
const FRAME: Record<string, string> = { double: 'Double', thick: 'Bold', dash: 'Dashed' };
const STAMP_MOTIF: Record<string, string> = {
  peak: 'Peak', ship: 'Ship', beacon: 'Beacon', bird: 'Bird', cog: 'Cog', wave: 'Wave', star2: 'Star', tree: 'Pine',
};
export const lettersTraits: TraitsFn = (id) => {
  const c = C.castStamp(id);
  return { Field: FIELD[c.fi], Frame: FRAME[c.fr], Motif: STAMP_MOTIF[c.motif] };
};
export const lettersSchema: TraitSchema = {
  traits: [
    { name: 'Field', values: FIELD,
      subtraits: [
        { name: 'Warm', values: ['Crimson', 'Orange', 'Amber', 'Magenta'] },
        { name: 'Cool', values: ['Cobalt', 'Green', 'Violet', 'Teal'] },
      ] },
    { name: 'Frame', values: ['Double', 'Bold', 'Dashed'] },
    { name: 'Motif', values: ['Peak', 'Ship', 'Beacon', 'Bird', 'Cog', 'Wave', 'Star', 'Pine'],
      subtraits: [
        { name: 'Land', values: ['Peak', 'Pine', 'Cog'] },
        { name: 'Sea', values: ['Ship', 'Beacon', 'Wave'] },
        { name: 'Sky', values: ['Bird', 'Star'] },
      ] },
  ],
};
export const renderLetters = blit(C.stamp, lettersTraits);
export const LETTERS_ASPECTS = [0.83, 1.21, 1] as const;

/* ── Crosstown ──────────────────────────────────────────────────────────── */
export const crosstownTraits: TraitsFn = (id) => {
  const c = C.castTransit(id);
  return {
    Paper: c.dark ? 'Night' : 'Day',
    Pitch: c.G > 40 ? 'Sector' : 'Network',
    Lines: String(c.nLines),
  };
};
export const crosstownSchema: TraitSchema = {
  traits: [
    { name: 'Paper', values: ['Day', 'Night'] },
    { name: 'Pitch', values: ['Network', 'Sector'] },
    { name: 'Lines', values: ['3', '4', '5', '6', '7'] },
  ],
};
export const renderCrosstown = blit(C.transit, crosstownTraits);
export const CROSSTOWN_ASPECTS = [1.24, 0.81, 1] as const;

/* ── Average Contents Forty ─────────────────────────────────────────────── */
const MB_SCHEME = ['Sky', 'Mint', 'Blush', 'Sage', 'Snow', 'Lavender', 'Pink', 'Ice', 'Bone', 'Navy'];
export const contentsTraits: TraitsFn = (id) => {
  const c = C.castMatchbook(id);
  return { Format: c.fmt.W === 840 ? 'Tall' : 'Wide', Scheme: MB_SCHEME[c.si] };
};
export const contentsSchema: TraitSchema = {
  traits: [
    { name: 'Format', values: ['Tall', 'Wide'] },
    { name: 'Scheme', values: MB_SCHEME,
      subtraits: [
        { name: 'Pale', values: ['Sky', 'Mint', 'Snow', 'Ice', 'Bone'] },
        { name: 'Tinted', values: ['Blush', 'Sage', 'Lavender', 'Pink'] },
        { name: 'Dark', values: ['Navy'] },
      ] },
  ],
};
export const renderContents = blit(C.matchbook, contentsTraits);
export const CONTENTS_ASPECTS = [0.76, 1.31] as const;

/* ── Crossette ──────────────────────────────────────────────────────────── */
const PYRO_FMT: Record<number, string> = { 1000: 'Plate', 1240: 'Wide', 1050: 'Square', 700: 'Tall', 1500: 'Panorama' };
const GROUND: Record<string, string> = { hills: 'Hills', city: 'City', water: 'Water', none: 'Open Sky' };
export const crossetteTraits: TraitsFn = (id) => {
  const c = C.castPyro(id);
  return { Format: PYRO_FMT[c.fmt.W], Ground: GROUND[c.ground], Shells: String(c.nb) };
};
export const crossetteSchema: TraitSchema = {
  traits: [
    { name: 'Format', values: ['Plate', 'Wide', 'Square', 'Tall', 'Panorama'],
      subtraits: [
        { name: 'Upright', values: ['Plate', 'Square', 'Tall'] },
        { name: 'Broad', values: ['Wide', 'Panorama'] },
      ] },
    { name: 'Ground', values: ['Hills', 'City', 'Water', 'Open Sky'] },
    { name: 'Shells', values: ['1', '2', '3', '4', '5'] },
  ],
};
export const renderCrossette = blit(C.pyro, crossetteTraits);
export const CROSSETTE_ASPECTS = [0.81, 1.38, 1, 0.55, 2.14] as const;

/* ── Guaranteed To Grow ─────────────────────────────────────────────────── */
const PK_SCHEME = ['Amber', 'Sky', 'Coral', 'Green', 'Powder', 'Lavender', 'Night', 'Aqua'];
export const growTraits: TraitsFn = (id) => {
  const c = C.castPacket(id);
  return { Plant: cap(c.plant), Scheme: PK_SCHEME[c.si] };
};
export const growSchema: TraitSchema = {
  traits: [
    { name: 'Plant', values: ['Radish', 'Carrot', 'Sunflower', 'Tulip', 'Tomato', 'Peas', 'Chili', 'Beet', 'Corn'],
      subtraits: [
        { name: 'Root', values: ['Radish', 'Carrot', 'Beet'] },
        { name: 'Vine', values: ['Tomato', 'Peas', 'Chili'] },
        { name: 'Bloom', values: ['Sunflower', 'Tulip', 'Corn'] },
      ] },
    { name: 'Scheme', values: PK_SCHEME },
  ],
};
export const renderGrow = blit(C.packet, growTraits);
export const GROW_ASPECTS = [0.76] as const;

/* ── Wait Till Next Year ────────────────────────────────────────────────── */
const WALL = ['Charcoal', 'Walnut', 'Forest', 'Sky', 'Fog', 'Pine', 'Navy', 'Oxblood', 'Mist', 'Wine'];
const FELT = ['Crimson', 'Royal', 'Green', 'Orange', 'Violet', 'Steel', 'Berry', 'Gold', 'Black'];
export const nextYearTraits: TraitsFn = (id) => {
  const c = C.castPennant(id);
  return { Hang: c.vert ? 'Drop' : 'Banner', Wall: WALL[c.bi], Felt: FELT[c.fi] };
};
export const nextYearSchema: TraitSchema = {
  traits: [
    { name: 'Hang', values: ['Banner', 'Drop'] },
    { name: 'Wall', values: WALL,
      subtraits: [
        { name: 'Dark', values: ['Charcoal', 'Walnut', 'Forest', 'Pine', 'Navy', 'Oxblood', 'Wine'] },
        { name: 'Light', values: ['Sky', 'Fog', 'Mist'] },
      ] },
    { name: 'Felt', values: FELT },
  ],
};
export const renderNextYear = blit(C.pennant, nextYearTraits);
export const NEXTYEAR_ASPECTS = [2, 0.56] as const;

/* ── Every Light In Town ────────────────────────────────────────────────── */
const CUT: Record<string, string> = { flat: 'Disc', sleeve: 'Sleeve', crop: 'Close-Up', stack: 'Stack' };
const BACKDROP = ['Aqua', 'Cyan', 'Orange', 'Charcoal', 'Magenta', 'Green', 'Gold', 'Pine', 'Wine', 'Sky'];
export const everyLightTraits: TraitsFn = (id) => {
  const c = C.castFortyfive(id);
  return { Cut: CUT[c.mode], Backdrop: BACKDROP[c.bi] };
};
export const everyLightSchema: TraitSchema = {
  traits: [
    { name: 'Cut', values: ['Disc', 'Sleeve', 'Close-Up', 'Stack'] },
    { name: 'Backdrop', values: BACKDROP,
      subtraits: [
        { name: 'Bright', values: ['Aqua', 'Cyan', 'Orange', 'Magenta', 'Gold', 'Sky'] },
        { name: 'Deep', values: ['Charcoal', 'Green', 'Pine', 'Wine'] },
      ] },
  ],
};
export const renderEveryLight = blit(C.fortyfive, everyLightTraits);
export const EVERYLIGHT_ASPECTS = [1, 0.82, 1.31] as const;

/* ── Nobody's Swimming ──────────────────────────────────────────────────── */
const WATER = ['Lake', 'Tide', 'Sky', 'Deep', 'Teal'];
const POOL: Record<string, string> = {
  rect: 'Rectangle', kidney: 'Kidney', ell: 'L-Shape', lap: 'Lap', round: 'Round',
};
export const swimmingTraits: TraitsFn = (id) => {
  const c = C.castPoolside(id);
  return { Ground: cap(c.base), Water: WATER[c.wi], Pool: POOL[c.kind] };
};
export const swimmingSchema: TraitSchema = {
  traits: [
    { name: 'Ground', values: ['Lawn', 'Deck'] },
    { name: 'Water', values: WATER },
    { name: 'Pool', values: ['Rectangle', 'Kidney', 'L-Shape', 'Lap', 'Round'],
      subtraits: [
        { name: 'Straight', values: ['Rectangle', 'L-Shape', 'Lap'] },
        { name: 'Curved', values: ['Kidney', 'Round'] },
      ] },
  ],
};
export const renderSwimming = blit(C.poolside, swimmingTraits);
export const SWIMMING_ASPECTS = [0.81, 1.24, 1] as const;

/* ── Between The Lines ──────────────────────────────────────────────────── */
const PLATES: Record<string, string> = {
  rings: 'Rings × Rings', ringfan: 'Rings × Fan', fans: 'Fan × Fan', ringgrid: 'Rings × Grid',
};
const BTL_SCHEME = ['Cyan/Magenta', 'Acid/Violet', 'Red/Blue', 'Gold/Rose', 'Mint/Orange', 'Green/Magenta', 'Teal/Gold', 'Rose/Acid', 'Orange/Navy'];
export const betweenTraits: TraitsFn = (id) => {
  const c = C.castInterference(id);
  return { Plates: PLATES[c.combo], Scheme: BTL_SCHEME[c.si] };
};
export const betweenSchema: TraitSchema = {
  traits: [
    { name: 'Plates', values: ['Rings × Rings', 'Rings × Fan', 'Fan × Fan', 'Rings × Grid'] },
    { name: 'Scheme', values: BTL_SCHEME },
  ],
};
export const renderBetween = blit(C.interference, betweenTraits);
export const BETWEEN_ASPECTS = [0.81, 1, 1.24] as const;

/* ── Loud On Cheap Paper ────────────────────────────────────────────────── */
const SCREEN: Record<string, string> = { bayer: 'Bayer', dots: 'Dots', lines: 'Lines', diag: 'Diagonal' };
const DITHER_COMP: Record<string, string> = {
  orb: 'Orb', twin: 'Twin', horizon: 'Horizon', diag: 'Diagonal', well: 'Well', bars: 'Bars', rings: 'Rings', wave: 'Wave',
};
const RAMP = ['Ember', 'Reef', 'Orchid', 'Jade', 'Glacier', 'Rust', 'Harbour', 'Punch', 'Field', 'Berry'];
export const cheapPaperTraits: TraitsFn = (id) => {
  const c = C.castDither(id);
  return { Screen: SCREEN[c.style], Composition: DITHER_COMP[c.comp], Ramp: RAMP[c.ri] };
};
export const cheapPaperSchema: TraitSchema = {
  traits: [
    { name: 'Screen', values: ['Bayer', 'Dots', 'Lines', 'Diagonal'] },
    { name: 'Composition', values: ['Orb', 'Twin', 'Horizon', 'Diagonal', 'Well', 'Bars', 'Rings', 'Wave'] },
    { name: 'Ramp', values: RAMP,
      subtraits: [
        { name: 'Hot', values: ['Ember', 'Rust', 'Punch', 'Berry'] },
        { name: 'Cool', values: ['Reef', 'Glacier', 'Harbour', 'Jade'] },
        { name: 'Neon', values: ['Orchid', 'Field'] },
      ] },
  ],
};
export const renderCheapPaper = blit(C.dither, cheapPaperTraits);
export const CHEAPPAPER_ASPECTS = [0.81, 1.24, 1, 0.61] as const;

/* ── Scissors, No Plan ──────────────────────────────────────────────────── */
const CUT_GROUND = ['Royal', 'Ice', 'Crimson', 'Charcoal', 'Green', 'Amber', 'Snow', 'Plum', 'Navy', 'Pink'];
export const scissorsTraits: TraitsFn = (id) => {
  const c = C.castCutout(id);
  return { Ground: CUT_GROUND[c.si], Layout: cap(c.comp) };
};
export const scissorsSchema: TraitSchema = {
  traits: [
    { name: 'Ground', values: CUT_GROUND,
      subtraits: [
        { name: 'Loud', values: ['Royal', 'Crimson', 'Green', 'Amber', 'Plum', 'Navy', 'Pink'] },
        { name: 'Quiet', values: ['Ice', 'Charcoal', 'Snow'] },
      ] },
    { name: 'Layout', values: ['Anchor', 'Scatter', 'Totem'] },
  ],
};
export const renderScissors = blit(C.cutout, scissorsTraits);
export const SCISSORS_ASPECTS = [0.81, 1.24, 1] as const;

/* ── Hard Water ─────────────────────────────────────────────────────────── */
export const hardWaterTraits: TraitsFn = (id) => {
  const c = C.castHardwater(id);
  const bands = c.nb <= 6 ? 'Sparse' : c.nb <= 11 ? 'Stacked' : 'Pinstripe';
  return { Flow: c.vert ? 'Column' : 'Horizon', Bands: bands };
};
export const hardWaterSchema: TraitSchema = {
  traits: [
    { name: 'Flow', values: ['Horizon', 'Column'] },
    { name: 'Bands', values: ['Sparse', 'Stacked', 'Pinstripe'] },
  ],
};
export const renderHardWater = blit(C.hardwater, hardWaterTraits);
export const HARDWATER_ASPECTS = [0.81, 1.38, 1] as const;

/* ── Turf War ───────────────────────────────────────────────────────────── */
const CYCLE = ['Pink Gold', 'Electric', 'Ember Teal', 'Meadow', 'Violet Orange', 'Gold Crimson'];
export const turfWarTraits: TraitsFn = (id) => {
  const c = C.castTurfwar(id);
  return { Factions: String(c.k), Cycle: CYCLE[c.ai] };
};
export const turfWarSchema: TraitSchema = {
  traits: [
    { name: 'Factions', values: ['8', '9', '10', '11', '12', '13', '14', '15'] },
    { name: 'Cycle', values: CYCLE },
  ],
};
export const renderTurfWar = blit(C.turfwar, turfWarTraits);
export const TURFWAR_ASPECTS = [0.81, 1, 1.24] as const;

/* ── Avalanche ──────────────────────────────────────────────────────────── */
export const avalancheTraits: TraitsFn = (id) => {
  const c = C.castAvalanche(id);
  const grains = c.grains < 40000 ? 'Light' : c.grains < 56000 ? 'Medium' : 'Heavy';
  return { Piles: c.two ? 'Two' : 'One', Grains: grains };
};
export const avalancheSchema: TraitSchema = {
  traits: [
    { name: 'Piles', values: ['One', 'Two'] },
    { name: 'Grains', values: ['Light', 'Medium', 'Heavy'] },
  ],
};
export const renderAvalanche = blit(C.avalanche, avalancheTraits);
export const AVALANCHE_ASPECTS = [1] as const;

/* ===================== NEW PROJECTS (2026-06-13) — typed wrappers ===================== */

/* Everyone Is Typing */
export const chatroomTraits: TraitsFn = (id) => { const c = C.castChatroom(id) as any; return { Layout: cap(c.layout), Theme: c.theme, Accent: c.accent, Members: c.members, Notice: c.notice }; };
export const chatroomSchema: TraitSchema = { traits: [
  { name: 'Layout', values: ['Thread','Hero','Lockscreen','Split','Presence','Panorama'] },
  { name: 'Theme', values: ['Daylight','After Dark','Midnight','Mint','Paper','Noir','Bubblegum'] },
  { name: 'Accent', values: ['Ultramarine','Hot Pink','Acid','Tangerine','Violet','Teal','Crimson','Gold'] },
  { name: 'Members', values: ['Duo','Small','Crowd'] },
  { name: 'Notice', values: ['None','Unread','Everyone Typing','Left On Read','Pinned'] },
] };
export const renderChatroom = blit(C.chatroom, chatroomTraits);
export const CHATROOM_ASPECTS = [0.7, 1, 0.66, 1.51, 2.08] as const;

/* Night Service (glow) */
export const afterglowTraits: TraitsFn = (id) => { const c = C.castAfterglow(id) as any; return { Palette: c.palette, Format: c.format, Mode: cap(c.mode), Density: c.density }; };
export const afterglowSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Synthwave','Miami','Toxic','Blade','Ember','Ultraviolet','Ice','Sakura','Acid Rain','Magma','Vapor','Signal'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'] },
  { name: 'Mode', values: ['Stream','Rain','Spiral','Orbit'] },
  { name: 'Density', values: ['Sparse','Dense','Swarm'] },
] };
export const renderAfterglow = blit(C.afterglow, afterglowTraits);
export const AFTERGLOW_ASPECTS = [1, 0.72, 1.39, 0.58, 1.97] as const;

/* Breach Protocol */
export const breachTraits: TraitsFn = (id) => { const c = C.castBreach(id) as any; return { Palette: c.palette, Format: c.format, Layout: cap(c.layout), Density: c.density }; };
export const breachSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Hazard','Militech','Arasaka','NetWatch','Trauma','Voodoo','Toxic','Kang Tao'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'] },
  { name: 'Layout', values: ['Reticle','Dashboard','Breach','Signage'] },
  { name: 'Density', values: ['Low','Mid','High'] },
] };
export const renderBreach = blit(C.breach, breachTraits);
export const BREACH_ASPECTS = [1, 0.72, 1.39, 0.58, 1.97] as const;

/* Graffiti Soul */
export const graffitiTraits: TraitsFn = (id) => { const c = C.castGraffiti(id) as any; return { Palette: c.palette, Format: c.format, Mode: cap(c.mode), Density: c.density }; };
export const graffitiSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Tokyo-to','Rudie','Concrete','Funk','Acid','Bubblegum','Heatwave','Ice Cream','Midnight Tag','Brick','Vapor Wall','Mono Pop'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'] },
  { name: 'Mode', values: ['Piece','Bombing','Arrows','Splash','Character'] },
  { name: 'Density', values: ['Few','Many','Swarm'] },
] };
export const renderGraffiti = blit(C.graffiti, graffitiTraits);
export const GRAFFITI_ASPECTS = [1, 0.72, 1.39, 0.58, 1.97] as const;

/* Teletext */
export const asciiTraits: TraitsFn = (id) => { const c = C.castAscii(id) as any; return { Format: c.fmtT, Field: cap(c.field), Palette: c.palName, Density: c.density }; };
export const asciiSchema: TraitSchema = { traits: [
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'] },
  { name: 'Field', values: ['Rings','Sine','Interfere','Spiral','Blobs','Ripple'] },
  { name: 'Palette', values: ['Paper','Noir','Amber','Phosphor','Night','Violet','Slate','Inkpaper'] },
  { name: 'Density', values: ['Fine','Medium','Coarse'] },
] };
export const renderAscii = blit(C.ascii, asciiTraits);
export const ASCII_ASPECTS = [1, 0.73, 1.37, 0.58, 1.74] as const;

/* Chrome Dreams */
export const chromedreamsTraits: TraitsFn = (id) => { const c = C.castChromedreams(id) as any; return { Palette: c.palName, Format: c.fmtT, Layout: cap(c.layout), Finish: cap(c.finish), Motif: cap(c.motif), Word: c.word }; };
export const chromedreamsSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Chrome','Sky','Acid Gel','Bubblegum','Sunburst','Aqua','Steel','Holo'] },
  { name: 'Format', values: ['Square','Landscape','Portrait','Wide','Tall'] },
  { name: 'Layout', values: ['Badge','Wordmark','Emblem','Swoosh'] },
  { name: 'Finish', values: ['Chrome','Gel','Holo'] },
  { name: 'Motif', values: ['Atom','Star','Blob','Burst'] },
] };
export const renderChromedreams = blit(C.chromedreams, chromedreamsTraits);
export const CHROMEDREAMS_ASPECTS = [1, 1.45, 0.75, 1.97, 0.59] as const;

/* Riding The Oil (Discord) */
export const discordTraits: TraitsFn = (id) => { const c = C.castDiscord(id) as any; return { Layout: cap(c.comp), Theme: c.theme, Density: c.dens === 1 ? 'Quiet' : c.dens === 2 ? 'Busy' : 'Packed' }; };
export const discordSchema: TraitSchema = { traits: [
  { name: 'Layout', values: ['Sales','Channel','Members','Emoji','Servers'] },
  { name: 'Theme', values: ['Blurple','Midnight','Light','Crude','Mint','Rose'] },
  { name: 'Density', values: ['Quiet','Busy','Packed'] },
] };
export const renderDiscord = blit(C.discord, discordTraits);
export const DISCORD_ASPECTS = [1.6, 0.67, 1, 0.63] as const;

/* Quorum */
export const quorumTraits: TraitsFn = (id) => { const c = C.castQuorum(id) as any; return { Palette: c.palette, Format: c.format, Movement: c.movement, Multitude: c.multitude }; };
export const quorumSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Ink','Charcoal','Indigo Dusk','Sepia','Slate','Payne Grey','Oxblood','Twilight','Nocturne','Bone'] },
  { name: 'Format', values: ['Portrait','Landscape','Square','Panorama','Tall'] },
  { name: 'Movement', values: ['Drift','Gather','Cascade','Split','Settle'] },
  { name: 'Multitude', values: ['Few','Many','Legion'] },
] };
export const renderQuorum = blit(C.quorum, quorumTraits);
export const QUORUM_ASPECTS = [0.79, 1.27, 1, 1.83, 0.64] as const;

/* Konkret */
export const konkretTraits: TraitsFn = (id) => { const c = C.castKonkret(id) as any; return { Palette: c.palette, Format: c.format, System: cap(c.system) }; };
export const konkretSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['De Stijl','Bauhaus','Concrete','Graphite','Ochre & Slate','Oxblood','Indigo & Cream','Sage'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'System', values: ['Grid','Destijl','Concentric','Lines','Bauhaus','Columns'] },
] };
export const renderKonkret = blit(C.konkret, konkretTraits);
export const KONKRET_ASPECTS = [1, 0.8, 1.26, 0.69] as const;

/* Ode to Rudxane */
export const rudxaneTraits: TraitsFn = (id) => { const c = C.castRudxane(id) as any; return { Palette: c.palette, Format: c.format, Layout: cap(c.layout), Reading: c.reading }; };
export const rudxaneSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Ivory & Ink','Navy & Cream','Oxblood & Bone','Sage & Charcoal','Slate & Ecru','Gold Leaf','Graphite','Aubergine'] },
  { name: 'Format', values: ['Folio','Tall','Square','Broadside'] },
  { name: 'Layout', values: ['Specimen','Plate','Ledger','Wave'] },
] };
export const renderRudxane = blit(C.rudxane, rudxaneTraits);
export const RUDXANE_ASPECTS = [0.71, 0.67, 1, 1.35] as const;

/* Materia */
export const materiaTraits: TraitsFn = (id) => { const c = C.castMateria(id) as any; return { Material: c.material, Stone: c.stone, Format: c.format, Finish: c.finish }; };
export const materiaSchema: TraitSchema = { traits: [
  { name: 'Material', values: ['Marble','Granite','Wood','Glass'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Finish', values: ['Polished','Honed','Matte'] },
] };
export const renderMateria = blit(C.materia, materiaTraits);
export const MATERIA_ASPECTS = [1, 0.75, 1.33, 0.66] as const;

/* Weft */
export const weftTraits: TraitsFn = (id) => { const c = C.castWeft(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density, Weave: c.weave, Panel: c.panel }; };
export const weftSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Albers','Stölzl','Clay','Indigo','Rose Dust','Sage & Ochre','Slate Teal','Charcoal'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Density', values: ['Loose','Medium','Fine'] },
  { name: 'Weave', values: ['Plain','Twill','Tartan','Ikat'] },
  { name: 'Panel', values: ['Full','Banded'] },
] };
export const renderWeft = blit(C.weft, weftTraits);
export const WEFT_ASPECTS = [1, 0.78, 1.28, 0.71] as const;

/* Price Discovery */
export const pricediscoveryTraits: TraitsFn = (id) => { const c = C.castPricediscovery(id) as any; return { Palette: c.palette, Format: c.format, Regime: c.regime, Spread: c.spread, Book: c.book, View: cap(c.view) }; };
export const pricediscoverySchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Dusk','Ember','Abyss','Aurora','Mono','Oxide'] },
  { name: 'Format', values: ['Landscape','Panorama','Square','Portrait'] },
  { name: 'Regime', values: ['Calm','Trending','Volatile','Crash','Squeeze'] },
  { name: 'Spread', values: ['Razor','Normal','Yawning'] },
  { name: 'Book', values: ['Bid-heavy','Balanced','Ask-heavy'] },
  { name: 'View', values: ['Canyon','Radial','Horizon'] },
] };
export const renderPricediscovery = blit(C.pricediscovery, pricediscoveryTraits);
export const PRICEDISCOVERY_ASPECTS = [1.27, 1.83, 1, 0.79] as const;

/* Liquid Light */
export const liquidlightTraits: TraitsFn = (id) => { const c = C.castLiquidlight(id) as any; return { Palette: c.palette, Format: c.format, Mode: cap(c.mode), Symmetry: c.fold }; };
export const liquidlightSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Acid','Blacklight','Oil Slick','Sunset','Jade','Dreampool'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Mode', values: ['Kaleido','Oil','Tunnel'] },
] };
export const renderLiquidlight = blit(C.liquidlight, liquidlightTraits);
export const LIQUIDLIGHT_ASPECTS = [1, 0.77, 1.3, 0.71] as const;

/* Diffusion */
export const diffusionTraits: TraitsFn = (id) => { const c = C.castDiffusion(id) as any; return { Palette: c.palette, Format: c.format, Pattern: c.pattern, Seeding: cap(c.seeding) }; };
export const diffusionSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Gold Leaf','Prussian','Oxblood','Verdigris','Silver','Copper'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Pattern', values: ['Fingerprint','Labyrinth','Coral','Spots','Stripes','Mitosis'] },
  { name: 'Seeding', values: ['Scatter','Bloom','Line','Marbled','Rings'] },
] };
export const renderDiffusion = blit(C.diffusion, diffusionTraits);
export const DIFFUSION_ASPECTS = [1, 0.78, 1.28] as const;

/* Growth */
export const growthTraits: TraitsFn = (id) => { const c = C.castGrowth(id) as any; return { Palette: c.palette, Format: c.format, Form: c.form }; };
export const growthSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Abyss','Gilded','Ember','Bone Black','Viridian','Ink','Sepia'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Form', values: ['Coral','Colony','Tendril'] },
] };
export const renderGrowth = blit(C.growth, growthTraits);
export const GROWTH_ASPECTS = [1, 0.78, 1.28] as const;

/* Pigment */
export const pigmentTraits: TraitsFn = (id) => { const c = C.castPigment(id) as any; return { Harmony: c.harmony, Format: c.format, Mode: c.mode, Ground: c.ground }; };
export const pigmentSchema: TraitSchema = { traits: [
  { name: 'Harmony', values: ['Complementary','Triad','Analogous','Split'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Mode', values: ['Walk','Axon','Field'] },
  { name: 'Ground', values: ['Dark','Paper'] },
] };
export const renderPigment = blit(C.pigment, pigmentTraits);
export const PIGMENT_ASPECTS = [1, 0.78, 1.28, 0.71] as const;

/* Iskra */
export const iskraTraits: TraitsFn = (id) => { const c = C.castIskra(id) as any; return { Palette: c.palette, Format: c.format, Form: c.form }; };
export const iskraSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Graphite','Slate','Rose Ash','Indigo','Noir','Pine'] },
  { name: 'Format', values: ['Folio','Square','Landscape'] },
  { name: 'Form', values: ['Bloom','Rift','Veil'] },
] };
export const renderIskra = blit(C.iskra, iskraTraits);
export const ISKRA_ASPECTS = [0.8, 1, 1.25] as const;

/* Siggi */
export const siggiTraits: TraitsFn = (id) => { const c = C.castSiggi(id) as any; return { Palette: c.palette, Format: c.format, Composition: c.composition }; };
export const siggiSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Set 1','Set 2','Set 3','Set 4','Set 5','Set 6'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Composition', values: ['Allover','Medallion','Bands'] },
] };
export const renderSiggi = blit(C.siggi, siggiTraits);
export const SIGGI_ASPECTS = [1, 0.78, 1.28] as const;

/* Junction */
export const junctionTraits: TraitsFn = (id) => { const c = C.castJunction(id) as any; return { Palette: c.palette, Format: c.format, Grid: c.grid, Style: c.style }; };
export const junctionSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Neon','Amber','Mono','Ink','Iris'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Grid', values: ['8×','10×','12×','16×'] },
  { name: 'Style', values: ['Arcs','Diag','Mix'] },
] };
export const renderJunction = blit(C.junction, junctionTraits);
export const JUNCTION_ASPECTS = [1, 0.78, 1.28] as const;

/* Asterism */
export const asterismTraits: TraitsFn = (id) => { const c = C.castAsterism(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density }; };
export const asterismSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Deep Space','Nebula','Amber Sky','Verdant','Antique'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Panorama'] },
  { name: 'Density', values: ['Sparse','Field','Dense'] },
] };
export const renderAsterism = blit(C.asterism, asterismTraits);
export const ASTERISM_ASPECTS = [1, 0.78, 1.28, 1.79] as const;

/* Seedhead */
export const seedheadTraits: TraitsFn = (id) => { const c = C.castSeedhead(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density, Mark: c.mark }; };
export const seedheadSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Ember','Ice','Verdant','Rose','Bone'] },
  { name: 'Format', values: ['Square','Portrait'] },
  { name: 'Density', values: ['Open','Full','Packed'] },
  { name: 'Mark', values: ['Dot','Ring','Petal'] },
] };
export const renderSeedhead = blit(C.seedhead, seedheadTraits);
export const SEEDHEAD_ASPECTS = [1, 0.8] as const;

/* Facets */
export const facetsTraits: TraitsFn = (id) => { const c = C.castFacets(id) as any; return { Palette: c.palette, Format: c.format, Shards: c.shards }; };
export const facetsSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Jewel','Dusk','Cool','Warm Stone','Mono'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Shards', values: ['Bold','Fine','Splinter'] },
] };
export const renderFacets = blit(C.facets, facetsTraits);
export const FACETS_ASPECTS = [1, 0.78, 1.28] as const;

/* Quasicrystal */
export const quasicrystalTraits: TraitsFn = (id) => { const c = C.castQuasicrystal(id) as any; return { Palette: c.palette, Format: c.format, Symmetry: c.symmetry, Bands: c.bands }; };
export const quasicrystalSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Cobalt','Ember','Verdant','Magenta','Gilt','Mono'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Symmetry', values: ['5-fold','7-fold','9-fold','11-fold','13-fold'] },
  { name: 'Bands', values: ['5 bands','7 bands','9 bands'] },
] };
export const renderQuasicrystal = blit(C.quasicrystal, quasicrystalTraits);
export const QUASICRYSTAL_ASPECTS = [1, 0.78, 1.28] as const;

/* Circuit */
export const circuitTraits: TraitsFn = (id) => { const c = C.castCircuit(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density }; };
export const circuitSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Green','Blue','Black','Purple','Crimson'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Density', values: ['Sparse','Dense'] },
] };
export const renderCircuit = blit(C.circuit, circuitTraits);
export const CIRCUIT_ASPECTS = [1, 0.78, 1.28] as const;
