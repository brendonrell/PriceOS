/*
 * Project + trait-schema types — the standard shape every PD Project
 * conforms to. Oracle is the template; Prisms is rebuilt to match.
 *
 * Nomenclature (Platform Nomenclature SoT, page 2kyd6gx6-3274):
 *   - Project  : a mintable body of work (the platform release).
 *   - Output   : the individual minted unit. `outputs` below is the supply.
 *   - Artwork  : the rendered canvas inside an Output.
 *   - Colorway : the Project's signature colour (NOT "theme").
 *   - Mint     : what a User does to acquire an Output on primary.
 *
 * PD has NO project descriptions — storytelling is carried by the trait
 * taxonomy and the (optional) soundtrack only.
 */

/* ── Trait taxonomy: Trait → Subtrait → Value ─────────────────────────────
 * Locked model (Subtraits SoT, page 2kyd6gx6-5414).
 *
 *   Trait "Layer"  (L1 pill)
 *     ├─ Subtrait "Surface"  (L2 narrow)  values: Crust, Sediment, Drift
 *     └─ Subtrait "Deep"     (L2 narrow)  values: Mantle, Bedrock, Vein
 *
 * A Subtrait is a PD-unique middle layer: a *derived grouping of one trait's
 * values* into named buckets — NOT per-token data and NOT a separate axis.
 * A value's bucket membership IS its subtrait. The grouping lives in the
 * schema and can change without re-minting. A trait may be flat (no
 * subtraits) — then the L1 pill drills straight to its values.
 *
 * INVARIANT: every value of a subtrait-ed trait appears in exactly one
 * bucket, so concatenating the buckets reproduces the full value pool ("All").
 *
 * Traits + subtraits are always OPTIONAL for an artist. Platform auto-traits
 * (see platform-traits.ts) are layered on top so every Output carries traits
 * regardless.
 */

export interface SubtraitDef {
  /** L2 bucket label, e.g. "Surface". */
  name: string;
  /** The subset of the parent trait's values in this bucket. */
  values: readonly string[];
}

export interface TraitDef {
  /** L1 trait axis name, e.g. "Layer". Keys the per-token trait map. */
  name: string;
  /** Every value this trait can take (the full L3 pool). */
  values: readonly string[];
  /** Optional L2 grouping. Omit / empty = flat trait (no subtrait pills). */
  subtraits?: readonly SubtraitDef[];
}

export interface TraitSchema {
  traits: readonly TraitDef[];
}

/** A single Output's frozen traits: trait name → chosen value. */
export type OutputTraits = Record<string, string>;

/* ── Art engine ───────────────────────────────────────────────────────────
 * An engine sizes the canvas, paints the Artwork for `tokenId`, and reports
 * the aspect ratio it chose plus the token's artist-trait values. Runs
 * client-side only (canvas APIs). Deterministic in tokenId.
 */
export interface RenderResult {
  /** width / height of the painted canvas. */
  aspect: number;
  traits: OutputTraits;
}

export type EngineFn = (
  canvas: HTMLCanvasElement,
  tokenId: number,
  width: number,
) => RenderResult;

/** Pure trait derivation without painting — for API/server trait listing. */
export type TraitsFn = (tokenId: number) => OutputTraits;

/* ── Soundtrack ───────────────────────────────────────────────────────────
 * The only accepted soundtrack is a public YouTube playlist. Stored as the
 * bare playlist id; normalisation (URL → id) is fail-soft (see soundtrack.ts).
 */
export interface Soundtrack {
  /** YouTube playlist id (the value after `list=`). */
  playlistId: string;
  /** Human label shown in UI, e.g. "Wardruna — Kvitravn". */
  label: string;
}

/* ── Project definition ───────────────────────────────────────────────────
 * Static, frontend-canonical Project record: identity + render contract.
 * Dynamic state (ownership, listings, events, stats) is DB-sourced and is
 * NOT held here. The trait schema below is the ARTIST schema only; platform
 * auto-traits are merged in by the registry helpers.
 */
export interface ProjectDef {
  /** URL slug, e.g. "oracle". Canonical lowercase. */
  slug: string;
  /** Display name, e.g. "ORACLE". */
  displayName: string;
  /** Artist handle (no @), e.g. "opus4-6". */
  artistHandle: string;
  /** Total Outputs (supply). */
  outputs: number;
  /** Signature colour, e.g. "#C4902A". */
  colorway: string;
  /** Primary mint price in ETH (chainless sim). */
  mintPriceEth: number;
  /** Optional public YouTube playlist. */
  soundtrack: Soundtrack | null;
  /** Artist trait taxonomy (traits → subtraits → values). May be empty. */
  traitSchema: TraitSchema;
  /** Paints an Output's Artwork, returns aspect + artist traits. */
  render: EngineFn;
  /** Derives an Output's artist traits without painting. */
  traitsOf: TraitsFn;
}
