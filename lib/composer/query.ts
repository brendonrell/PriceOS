/*
 * Composer ⊚ — query model.
 *
 * A ComposerQuery is a stored, re-runnable view config: scope (which
 * Projects), a stack of rules (ANDed), and the sort/group vocabulary the
 * rest of the app already speaks. Evaluation runs client-side over the
 * ComposerRow dataset (lib/composer/useComposerData) — the same enriched
 * shape the Collected pipeline reads, so predicates can never diverge
 * from what the gallery shows.
 *
 * v1 fields compose over what PD indexes today, no chain-history
 * dependency: Artist · Project · Fate (deterministic platform facets),
 * Listed (presence/price), Owner (me / not me / handle), Colour
 * (fingerprint bucket), Rarity (PD Rarity rank band). PriceDay + natal
 * facets join when composer rows carry mint timestamps (phase 2);
 * history predicates (ATH drop, hold duration) are phase 3, post-cutover.
 */

import type { OutputTraits } from '../project/types';
import { GROUP_LABEL, type SortDir, type GroupKey } from '../state/SortContext';
import { pdRarityRank } from '../output/rarity';
import { resolveBucket, resolveFingerprint, type StoredFingerprint } from '../art/colorStore';
import { getProject } from '../project/registry';
import {
    brightnessBand, saturationBand, complexityBand, toneMood, paletteBand,
    contrastBand, warmthBand, symmetryBand, airBand, textureBand, gravityWord,
    geometryBand, colorfulnessOf, colorfulnessBand, densityOf, densityBand,
    orderOf, orderBand, orientationOf,
} from '../output/derive';

/* ── the dataset row ─────────────────────────────────────────────────── */

export interface ComposerRow {
    slug: string;
    token_id: number;
    listed: boolean;
    /** Parsed ETH number (null = unlisted). */
    priceEth: number | null;
    /** Raw list price string for gallery parity ("0.5" — no unit). */
    list_price_eth: string | null;
    ownerAddr: string;
    ownerHandle: string | null;
    /** Platform + artist traits (Artist/@Project/Fate + engine traits). */
    traits: OutputTraits;
}

/* ── rules ───────────────────────────────────────────────────────────── */

export type FacetField = 'Artist' | 'Project' | 'Fate' | 'Sun' | 'Moon' | 'Rising' | 'PriceDay' | 'Language';

export type OwnerClass =
    | 'me' | 'notMe' | 'handle'
    /* Social classes (v1.1 — the Network-filter + Friend Inspector reads):
       my mutuals · people I follow · my followers · a project's top-5
       holders · THE CARTEL ⟁ (mutuals sharing a project's soil with me —
       the Friend Inspector's shared-holdings read). */
    | 'mutuals' | 'following' | 'followers' | 'topHolders' | 'cartel';

/* ── Fingerprint band axes — every band a piece's sampled pixels can carry
   (lib/output/attributes.ts' "Fingerprint" wall), each with the fixed word
   vocabulary its band function returns. This is what lets Composer promise
   "all moody, purple outputs" — Tone=Moody is one of these, Purple is the
   existing Colour rule. Accent reuses the Colour bucket vocabulary (it's the
   same classifier, just the second-place colour). Scene is free text from
   the AI read (no fixed vocab), so it's left out of the picker. */
export type FingerprintAxis =
    | 'tone' | 'temperature' | 'brightness' | 'saturation' | 'contrast'
    | 'complexity' | 'texture' | 'air' | 'gravity' | 'symmetry' | 'orientation'
    | 'geometry' | 'colorfulness' | 'density' | 'order' | 'palette' | 'accent';

export const FINGERPRINT_AXIS_LABEL: Record<FingerprintAxis, string> = {
    tone: 'Tone', temperature: 'Temperature', brightness: 'Brightness',
    saturation: 'Saturation', contrast: 'Contrast', complexity: 'Complexity',
    texture: 'Texture', air: 'Air', gravity: 'Gravity', symmetry: 'Symmetry',
    orientation: 'Orientation', geometry: 'Geometry', colorfulness: 'Colourfulness',
    density: 'Density', order: 'Order', palette: 'Palette', accent: 'Accent',
};

/* Glyphs mirror the Character Sheet's Fingerprint wall (attributes.ts) 1:1,
   so the same axis always wears the same mark everywhere in the app. */
export const FINGERPRINT_AXIS_GLYPH: Record<FingerprintAxis, string> = {
    tone: '◕︎', temperature: '✦︎', brightness: '◐︎', saturation: '❖︎',
    contrast: '◨︎', complexity: '⌗︎', texture: '▒︎', air: '◌︎', gravity: '◒︎',
    symmetry: '◫︎', orientation: '▭︎', geometry: '∠︎', colorfulness: '◧︎',
    density: '▓︎', order: '∷︎', palette: '▤︎', accent: '◎︎',
};

export const FINGERPRINT_AXIS_VALUES: Record<FingerprintAxis, readonly string[]> = {
    tone: ['Brooding', 'Sombre', 'Moody', 'Electric', 'Serene', 'Airy', 'Bold', 'Hushed', 'Balanced'],
    temperature: ['Cold', 'Cool', 'Split', 'Warm', 'Molten'],
    brightness: ['Dark', 'Dim', 'Mid', 'Bright', 'Luminous'],
    saturation: ['Muted', 'Soft', 'Balanced', 'Rich', 'Vivid'],
    contrast: ['Flat', 'Soft', 'Measured', 'Crisp', 'Stark'],
    complexity: ['Minimal', 'Calm', 'Balanced', 'Detailed', 'Busy'],
    texture: ['Smooth', 'Even', 'Textured', 'Grainy'],
    air: ['Vast', 'Airy', 'Open', 'Packed'],
    gravity: ['Sits Low', 'Held High', 'Leans Left', 'Leans Right', 'Centered'],
    symmetry: ['Mirrored', 'Balanced', 'Leaning', 'Askew'],
    orientation: ['Landscape', 'Portrait', 'Square'],
    geometry: ['Organic', 'Flowing', 'Mixed', 'Angular', 'Geometric'],
    colorfulness: ['Monochrome', 'Restrained', 'Tempered', 'Colorful', 'Riotous'],
    density: ['Sparse', 'Roomy', 'Balanced', 'Dense', 'Teeming'],
    order: ['Chaotic', 'Unruly', 'Poised', 'Ordered', 'Structured'],
    palette: ['Monochrome', 'Duotone', 'Trichrome', 'Polychrome'],
    /* Accent shares the Colour rule's bucket vocabulary — filled in by the
       caller (ComposerModal already has COLOR_BUCKET_ORDER); left empty
       here so this table stays a pure derive.ts mirror. */
    accent: [],
};

/** A row's word for a given Fingerprint axis — the exact same band function
 *  the Character Sheet uses, so a filter and the tile it reads never
 *  disagree. Null when the underlying scalar(s) haven't been sampled yet. */
export function fingerprintBandOf(axis: FingerprintAxis, fp: StoredFingerprint | null): string | null {
    if (!fp) return null;
    switch (axis) {
        case 'tone':
            return fp.brightness != null && fp.saturation != null ? toneMood(fp.brightness, fp.saturation) : null;
        case 'temperature': return fp.warmth != null ? warmthBand(fp.warmth) : null;
        case 'brightness': return fp.brightness != null ? brightnessBand(fp.brightness) : null;
        case 'saturation': return fp.saturation != null ? saturationBand(fp.saturation) : null;
        case 'contrast': return fp.contrast != null ? contrastBand(fp.contrast) : null;
        case 'complexity': return fp.complexity != null ? complexityBand(fp.complexity) : null;
        case 'texture': return fp.texture != null ? textureBand(fp.texture) : null;
        case 'air': return fp.air != null ? airBand(fp.air) : null;
        case 'gravity': return fp.gravity ? gravityWord(fp.gravity) : null;
        case 'symmetry': return fp.symmetry != null ? symmetryBand(fp.symmetry) : null;
        case 'orientation': return orientationOf(fp.aspect) || null;
        case 'geometry': return fp.geometry != null ? geometryBand(fp.geometry) : null;
        case 'colorfulness':
            return fp.saturation != null && fp.paletteCount != null
                ? colorfulnessBand(colorfulnessOf(fp.saturation, fp.paletteCount)) : null;
        case 'density':
            return fp.air != null && fp.complexity != null ? densityBand(densityOf(fp.air, fp.complexity)) : null;
        case 'order':
            return fp.symmetry != null && fp.texture != null
                ? orderBand(orderOf(fp.symmetry, fp.texture, fp.pattern)) : null;
        case 'palette': return fp.paletteCount != null ? paletteBand(fp.paletteCount) : null;
        case 'accent': return fp.accent ?? null;
    }
}

export type MyList = 'starred' | 'wishlist' | 'album';

export type ComposerRule =
    | { kind: 'facet'; field: FacetField; op: 'is' | 'isNot'; values: string[] }
    | { kind: 'listed'; op: 'listed' | 'unlisted' | 'below' | 'above'; eth?: string }
    | { kind: 'owner'; op: OwnerClass; handle?: string }
    | { kind: 'color'; values: string[] }
    | { kind: 'rarity'; op: 'top' | 'bottom'; pct: number }
    /* Any Fingerprint band (Tone, Temperature, Brightness, ... Accent) — the
       full pixel-derived wall, filterable the same way Colour already is. */
    | { kind: 'band'; axis: FingerprintAxis; values: string[] }
    /* v1.1 — my-lists membership (starred ★ / wishlist ✛ / albums ◰). */
    | { kind: 'list'; list: MyList; op: 'in' | 'notIn' }
    /* v1.1 — a PROJECT's own trait (only offered under single-project
       scope; the schema is that project's trait vocabulary). */
    | { kind: 'trait'; name: string; op: 'is' | 'isNot'; values: string[] };

export type ComposerSortKey = 'price' | 'id' | 'rarity' | 'az';

export interface ComposerQuery {
    /** Project slugs in scope; null = all projects. */
    scope: string[] | null;
    rules: ComposerRule[];
    sort: ComposerSortKey;
    dir: SortDir;
    group: GroupKey;
}

export const EMPTY_QUERY: ComposerQuery = {
    scope: null,
    rules: [],
    sort: 'price',
    dir: 'asc',
    group: 'none',
};

/** A rule with nothing to match yet (fresh row, values not picked) — the
 *  predicate skips it so a half-built rule never blanks the grid. */
export function ruleIsComplete(r: ComposerRule): boolean {
    switch (r.kind) {
        case 'facet':  return r.values.length > 0;
        case 'listed': return r.op === 'listed' || r.op === 'unlisted'
            || (r.eth != null && !Number.isNaN(parseFloat(r.eth)));
        case 'owner':  return r.op !== 'handle' || !!r.handle?.trim();
        case 'color':  return r.values.length > 0;
        case 'band':   return r.values.length > 0;
        case 'rarity': return Number.isFinite(r.pct) && r.pct > 0 && r.pct <= 100;
        case 'list':   return true;
        case 'trait':  return r.values.length > 0;
    }
}

/* ── evaluation context — the viewer's world the social/list rules read ──
   Everything here is the EXISTING machinery's data, handed in by the modal:
   the follow graph (useProjectSocial's /api/follows shape), the pin stores'
   `slug:id` key-sets, and two per-project derivations computed straight off
   the composer dataset (top-5 holders; the Cartel = my mutuals who hold a
   project I also hold). */
export interface ComposerCtx {
    /** Viewer wallet, lowercase (null = signed out). */
    me: string | null;
    /** Lowercased handles+addresses, no @ — the /api/follows shape. */
    following: ReadonlySet<string>;
    followers: ReadonlySet<string>;
    /** `slug:id` keys from the pin stores. */
    starred: ReadonlySet<string>;
    wishlist: ReadonlySet<string>;
    albums: ReadonlySet<string>;
    /** slug → top-5 holder addresses (derived from the dataset). */
    topHoldersBySlug: ReadonlyMap<string, ReadonlySet<string>>;
    /** slug → cartel member addresses (derived: mutuals holding where I hold). */
    cartelBySlug: ReadonlyMap<string, ReadonlySet<string>>;
}

export const EMPTY_CTX: ComposerCtx = {
    me: null,
    following: new Set(),
    followers: new Set(),
    starred: new Set(),
    wishlist: new Set(),
    albums: new Set(),
    topHoldersBySlug: new Map(),
    cartelBySlug: new Map(),
};

function inGraph(set: ReadonlySet<string>, row: ComposerRow): boolean {
    return set.has(row.ownerAddr) || (row.ownerHandle != null && set.has(row.ownerHandle.toLowerCase()));
}

/* ── evaluation ──────────────────────────────────────────────────────── */

function matchRule(r: ComposerRule, row: ComposerRow, ctx: ComposerCtx): boolean {
    const me = ctx.me;
    switch (r.kind) {
        case 'facet': {
            const v = row.traits[r.field];
            const hit = v != null && r.values.includes(v);
            return r.op === 'is' ? hit : !hit;
        }
        case 'listed': {
            if (r.op === 'listed') return row.listed;
            if (r.op === 'unlisted') return !row.listed;
            const bound = parseFloat(r.eth ?? '');
            if (Number.isNaN(bound) || row.priceEth == null) return false;
            return r.op === 'below' ? row.priceEth < bound : row.priceEth > bound;
        }
        case 'owner': {
            const mine = me != null && row.ownerAddr === me;
            if (r.op === 'me') return mine;
            if (r.op === 'notMe') return !mine;
            if (r.op === 'following') return inGraph(ctx.following, row);
            if (r.op === 'followers') return inGraph(ctx.followers, row);
            if (r.op === 'mutuals')
                return inGraph(ctx.following, row) && inGraph(ctx.followers, row);
            if (r.op === 'topHolders')
                return ctx.topHoldersBySlug.get(row.slug)?.has(row.ownerAddr) ?? false;
            if (r.op === 'cartel')
                return ctx.cartelBySlug.get(row.slug)?.has(row.ownerAddr) ?? false;
            const h = (r.handle ?? '').trim().replace(/^@/, '').toLowerCase();
            return !!h && (row.ownerHandle?.toLowerCase() === h || row.ownerAddr === h);
        }
        case 'color': {
            const b = resolveBucket(row.slug, row.token_id) ?? 'Other';
            return r.values.includes(b);
        }
        case 'band': {
            const fp = resolveFingerprint(row.slug, row.token_id);
            const v = fingerprintBandOf(r.axis, fp);
            return v != null && r.values.includes(v);
        }
        case 'rarity': {
            const rank = pdRarityRank(row.slug, row.token_id);
            if (!rank || rank.total <= 0) return false;
            const pctile = rank.rank / rank.total;             // 0..1, 0 = rarest
            const band = r.pct / 100;
            return r.op === 'top' ? pctile <= band : pctile > 1 - band;
        }
        case 'list': {
            const key = `${row.slug}:${row.token_id}`;
            const set = r.list === 'starred' ? ctx.starred
                : r.list === 'wishlist' ? ctx.wishlist : ctx.albums;
            return r.op === 'in' ? set.has(key) : !set.has(key);
        }
        case 'trait': {
            const v = row.traits[r.name];
            const hit = v != null && r.values.includes(v);
            return r.op === 'is' ? hit : !hit;
        }
    }
}

/** Run the query's rules (ANDed; incomplete rules skipped) over the dataset.
 *  Scope is applied first; `ctx` carries the viewer's world (wallet, follow
 *  graph, pin stores, per-project derivations) for the social/list rules. */
export function runQuery(
    query: ComposerQuery,
    rows: readonly ComposerRow[],
    ctx: ComposerCtx,
): ComposerRow[] {
    const scope = query.scope ? new Set(query.scope) : null;
    const active = query.rules.filter(ruleIsComplete);
    return rows.filter((row) => {
        if (scope && !scope.has(row.slug)) return false;
        for (const r of active) if (!matchRule(r, row, ctx)) return false;
        return true;
    });
}

/* ── labels (builder pills · results chips · Program summaries) ─────── */

export const FIELD_GLYPH: Record<string, string> = {
    Artist: '✺︎', Project: '⬚︎', Fate: '䷲︎',
    Sun: '☉︎', Moon: '☽︎', Rising: '↑︎', PriceDay: '✶︎', Language: '{',
    listed: '✹︎', owner: '⌂︎', color: '◉︎', rarity: '❖︎',
    /* v1.1 — canonical marks: ★ the star family (lists), ⨝ the trait icon. */
    list: '★︎', trait: '⨝︎',
};

/* Owner-class faces — every glyph is the concept's canonical mark
   (GLYPHS.md): ⚭ mutuals · ⚯ following · ⚬ followers · △ top holders ·
   ⟁ the Cartel. */
export const OWNER_CLASS_FACE: Record<string, { glyph: string; label: string }> = {
    mutuals:    { glyph: '⚭︎', label: 'MY MUTUALS' },
    following:  { glyph: '⚯︎', label: 'FOLLOWING' },
    followers:  { glyph: '⚬︎', label: 'FOLLOWERS' },
    topHolders: { glyph: '△︎', label: 'TOP HOLDERS' },
    cartel:     { glyph: '⟁︎', label: 'CARTEL' },
};

export const LIST_FACE: Record<MyList, { glyph: string; label: string }> = {
    starred:  { glyph: '★︎', label: 'STARRED' },
    wishlist: { glyph: '✛︎', label: 'WISHLIST' },
    album:    { glyph: '◰︎', label: 'AN ALBUM' },
};

export function ruleFieldLabel(r: ComposerRule): { glyph: string; label: string } {
    switch (r.kind) {
        case 'facet':  return { glyph: FIELD_GLYPH[r.field], label: r.field.toUpperCase() };
        case 'listed': return { glyph: FIELD_GLYPH.listed, label: 'LISTED' };
        case 'owner':  return { glyph: FIELD_GLYPH.owner, label: 'OWNER' };
        case 'color':  return { glyph: FIELD_GLYPH.color, label: 'COLOUR' };
        case 'band':   return { glyph: FINGERPRINT_AXIS_GLYPH[r.axis], label: FINGERPRINT_AXIS_LABEL[r.axis].toUpperCase() };
        case 'rarity': return { glyph: FIELD_GLYPH.rarity, label: 'RARITY' };
        case 'list':   return { glyph: FIELD_GLYPH.list, label: 'MY LISTS' };
        case 'trait':  return { glyph: FIELD_GLYPH.trait, label: r.name.toUpperCase() };
    }
}

export function ruleOpLabel(r: ComposerRule): string {
    switch (r.kind) {
        case 'facet':  return r.op === 'is' ? 'IS ANY OF' : 'IS NOT';
        case 'listed':
            return r.op === 'listed' ? 'YES' : r.op === 'unlisted' ? 'NO'
                : r.op === 'below' ? 'BELOW' : 'ABOVE';
        case 'owner':  return r.op === 'me' || r.op === 'handle' ? 'IS'
            : r.op === 'notMe' ? 'IS NOT' : 'IS';
        case 'color':  return 'IS ANY OF';
        case 'band':   return 'IS ANY OF';
        case 'rarity': return r.op === 'top' ? 'TOP' : 'BOTTOM';
        case 'list':   return r.op === 'in' ? 'IS ON' : 'IS NOT ON';
        case 'trait':  return r.op === 'is' ? 'IS ANY OF' : 'IS NOT';
    }
}

/** The value pill's face. Multi-value facets show first value +N. */
export function ruleValueLabel(r: ComposerRule): string {
    switch (r.kind) {
        case 'facet':
        case 'color':
        case 'band': {
            if (r.values.length === 0) return 'PICK…';
            const first = r.values[0].replace(/^@/, '');
            return r.values.length > 1
                ? `${first.toUpperCase()} +${r.values.length - 1}`
                : first.toUpperCase();
        }
        case 'listed':
            return r.op === 'listed' || r.op === 'unlisted'
                ? '' : `${r.eth ?? '?'} ◊︎`;
        case 'owner':
            return r.op === 'me' || r.op === 'notMe' ? 'ME'
                : r.op === 'handle'
                ? (r.handle ? '@' + r.handle.replace(/^@/, '') : 'PICK…')
                : OWNER_CLASS_FACE[r.op].label;
        case 'rarity': return `${r.pct}%`;
        case 'list':   return LIST_FACE[r.list].label;
        case 'trait': {
            if (r.values.length === 0) return 'PICK…';
            const first = r.values[0];
            return r.values.length > 1
                ? `${first.toUpperCase()} +${r.values.length - 1}`
                : first.toUpperCase();
        }
    }
}

/* ── the readout — the query reading itself back in plain English ────── */

/** "MODIÐA or KIKI" / "MODIÐA, KIKI or 3 others" — spoken value lists. */
function spokenValues(values: string[], face: (v: string) => string): string {
    const faces = values.map(face);
    if (faces.length === 1) return faces[0];
    if (faces.length === 2) return `${faces[0]} or ${faces[1]}`;
    return `${faces[0]}, ${faces[1]} or ${faces.length - 2} other${faces.length - 2 > 1 ? 's' : ''}`;
}

/** The live English sentence for the builder's readout line:
 *  "Every listed piece by MODIÐA, under 0.5◊, from the rarest 10%, that I
 *   don't own — cheapest first, grouped by artist." Composes clause-by-clause
 *  from the complete rules; half-built rules stay silent, so the sentence
 *  always tells the truth about what's filtering. */
export function querySentence(q: ComposerQuery): string {
    const rules = q.rules.filter(ruleIsComplete);
    const artistFace = (v: string) => v.replace(/^@/, '').toUpperCase();
    const projectFace = (v: string) =>
        getProject(v.replace(/^@/, ''))?.displayName ?? v.replace(/^@/, '').toUpperCase();

    let listedAdj = '';
    const clauses: string[] = [];
    for (const r of rules) {
        switch (r.kind) {
            case 'listed':
                if (r.op === 'listed') listedAdj = 'listed ';
                else if (r.op === 'unlisted') listedAdj = 'unlisted ';
                else clauses.push(`${r.op === 'below' ? 'under' : 'over'} ${r.eth}◊︎`);
                break;
            case 'facet': {
                if (r.field === 'Artist') {
                    clauses.push(r.op === 'is'
                        ? `by ${spokenValues(r.values, artistFace)}`
                        : `not by ${spokenValues(r.values, artistFace)}`);
                } else if (r.field === 'Project') {
                    clauses.push(r.op === 'is'
                        ? `from ${spokenValues(r.values, projectFace)}`
                        : `not from ${spokenValues(r.values, projectFace)}`);
                } else if (r.field === 'Fate') {
                    clauses.push(r.op === 'is'
                        ? `fated ${spokenValues(r.values, (v) => v.toUpperCase())}`
                        : `never fated ${spokenValues(r.values, (v) => v.toUpperCase())}`);
                } else if (r.field === 'PriceDay') {
                    clauses.push(r.op === 'is'
                        ? `born on ${spokenValues(r.values, (v) => v.replace(/^PriceDay\s*/, 'PriceDay '))}`
                        : `never born on ${spokenValues(r.values, (v) => v.replace(/^PriceDay\s*/, 'PriceDay '))}`);
                } else {
                    // Sun / Moon / Rising / Language — "Sun in Leo" reads
                    // truest for the natal facets; Language reads fine too.
                    const word = r.field === 'Language' ? 'in' : `${r.field.toLowerCase()} in`;
                    clauses.push(r.op === 'is'
                        ? `${word} ${spokenValues(r.values, (v) => v.toUpperCase())}`
                        : `never ${word} ${spokenValues(r.values, (v) => v.toUpperCase())}`);
                }
                break;
            }
            case 'color':
                clauses.push(`in ${spokenValues(r.values, (v) => v.toUpperCase())}`);
                break;
            case 'band':
                clauses.push(
                    `${spokenValues(r.values, (v) => v.toLowerCase())} in ${FINGERPRINT_AXIS_LABEL[r.axis].toLowerCase()}`,
                );
                break;
            case 'rarity':
                clauses.push(r.op === 'top'
                    ? `from the rarest ${r.pct}%`
                    : `from the commonest ${r.pct}%`);
                break;
            case 'owner':
                clauses.push(r.op === 'me' ? 'that I own'
                    : r.op === 'notMe' ? "that I don't own"
                    : r.op === 'mutuals' ? 'held by my mutuals'
                    : r.op === 'following' ? 'held by people I follow'
                    : r.op === 'followers' ? 'held by my followers'
                    : r.op === 'topHolders' ? 'held by top holders'
                    : r.op === 'cartel' ? 'held by Cartel ⟁︎'
                    : `held by @${(r.handle ?? '').replace(/^@/, '')}`);
                break;
            case 'list':
                clauses.push(
                    r.list === 'starred' ? (r.op === 'in' ? 'that I starred' : "that I haven't starred")
                    : r.list === 'wishlist' ? (r.op === 'in' ? 'on my wishlist' : 'not on my wishlist')
                    : (r.op === 'in' ? 'in one of my albums' : 'in none of my albums'));
                break;
            case 'trait':
                clauses.push(r.op === 'is'
                    ? `whose ${r.name} is ${spokenValues(r.values, (v) => v.toUpperCase())}`
                    : `whose ${r.name} is never ${spokenValues(r.values, (v) => v.toUpperCase())}`);
                break;
        }
    }

    const scope =
        q.scope == null ? ''
        : q.scope.length === 1 ? `${projectFace(q.scope[0])} `
        : `${q.scope.length}-project `;
    let s = `Every ${listedAdj}${scope}piece`;
    if (clauses.length) s += ` ${clauses.join(', ')}`;
    else if (!listedAdj && !scope) s += ' on PD';

    const sortTail =
        q.sort === 'price' ? (q.dir === 'asc' ? 'cheapest first' : 'priciest first')
        : q.sort === 'rarity' ? (q.dir === 'asc' ? 'rarest first' : 'commonest first')
        : q.sort === 'az' ? (q.dir === 'asc' ? 'A to Z' : 'Z to A')
        : (q.dir === 'asc' ? 'in mint order' : 'latest mints first');
    s += ` — ${sortTail}`;
    if (q.group !== 'none') s += `, grouped by ${GROUP_LABEL[q.group].toLowerCase()}`;
    return s + '.';
}

/** One-line summary of a whole query (Program shelf sub-line). */
export function querySummary(q: ComposerQuery): string {
    const bits: string[] = [];
    for (const r of q.rules.filter(ruleIsComplete)) {
        const f = ruleFieldLabel(r);
        const op = ruleOpLabel(r).toLowerCase();
        const v = ruleValueLabel(r);
        bits.push(`${f.glyph} ${r.kind === 'listed' && !v ? `listed ${op}` : `${op} ${v}`.trim()}`.trim());
    }
    if (q.scope && q.scope.length > 0) bits.push(`${q.scope.length} project${q.scope.length > 1 ? 's' : ''}`);
    else bits.push('all projects');
    return bits.join(' · ');
}
