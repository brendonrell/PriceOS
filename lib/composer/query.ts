/*
 * The Composer ⊚ — query model.
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
import type { SortDir, GroupKey } from '../state/SortContext';
import { pdRarityRank } from '../output/rarity';
import { resolveBucket } from '../art/colorStore';

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

export type FacetField = 'Artist' | 'Project' | 'Fate';

export type ComposerRule =
    | { kind: 'facet'; field: FacetField; op: 'is' | 'isNot'; values: string[] }
    | { kind: 'listed'; op: 'listed' | 'unlisted' | 'below' | 'above'; eth?: string }
    | { kind: 'owner'; op: 'me' | 'notMe' | 'handle'; handle?: string }
    | { kind: 'color'; values: string[] }
    | { kind: 'rarity'; op: 'top' | 'bottom'; pct: number };

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
        case 'rarity': return Number.isFinite(r.pct) && r.pct > 0 && r.pct <= 100;
    }
}

/* ── evaluation ──────────────────────────────────────────────────────── */

function matchRule(r: ComposerRule, row: ComposerRow, me: string | null): boolean {
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
            const h = (r.handle ?? '').trim().replace(/^@/, '').toLowerCase();
            return !!h && (row.ownerHandle?.toLowerCase() === h || row.ownerAddr === h);
        }
        case 'color': {
            const b = resolveBucket(row.slug, row.token_id) ?? 'Other';
            return r.values.includes(b);
        }
        case 'rarity': {
            const rank = pdRarityRank(row.slug, row.token_id);
            if (!rank || rank.total <= 0) return false;
            const pctile = rank.rank / rank.total;             // 0..1, 0 = rarest
            const band = r.pct / 100;
            return r.op === 'top' ? pctile <= band : pctile > 1 - band;
        }
    }
}

/** Run the query's rules (ANDed; incomplete rules skipped) over the dataset.
 *  Scope is applied first. `me` = viewer's wallet (lowercase) for OWNER. */
export function runQuery(
    query: ComposerQuery,
    rows: readonly ComposerRow[],
    me: string | null,
): ComposerRow[] {
    const scope = query.scope ? new Set(query.scope) : null;
    const active = query.rules.filter(ruleIsComplete);
    return rows.filter((row) => {
        if (scope && !scope.has(row.slug)) return false;
        for (const r of active) if (!matchRule(r, row, me)) return false;
        return true;
    });
}

/* ── labels (builder pills · results chips · Program summaries) ─────── */

export const FIELD_GLYPH: Record<string, string> = {
    Artist: '✺︎', Project: '⬚︎', Fate: '䷲︎',
    listed: '✹︎', owner: '⌂︎', color: '◉︎', rarity: '❖︎',
};

export function ruleFieldLabel(r: ComposerRule): { glyph: string; label: string } {
    switch (r.kind) {
        case 'facet':  return { glyph: FIELD_GLYPH[r.field], label: r.field.toUpperCase() };
        case 'listed': return { glyph: FIELD_GLYPH.listed, label: 'LISTED' };
        case 'owner':  return { glyph: FIELD_GLYPH.owner, label: 'OWNER' };
        case 'color':  return { glyph: FIELD_GLYPH.color, label: 'COLOUR' };
        case 'rarity': return { glyph: FIELD_GLYPH.rarity, label: 'RARITY' };
    }
}

export function ruleOpLabel(r: ComposerRule): string {
    switch (r.kind) {
        case 'facet':  return r.op === 'is' ? 'IS ANY OF' : 'IS NOT';
        case 'listed':
            return r.op === 'listed' ? 'YES' : r.op === 'unlisted' ? 'NO'
                : r.op === 'below' ? 'BELOW' : 'ABOVE';
        case 'owner':  return r.op === 'me' ? 'IS' : r.op === 'notMe' ? 'IS NOT' : 'IS';
        case 'color':  return 'IS ANY OF';
        case 'rarity': return r.op === 'top' ? 'TOP' : 'BOTTOM';
    }
}

/** The value pill's face. Multi-value facets show first value +N. */
export function ruleValueLabel(r: ComposerRule): string {
    switch (r.kind) {
        case 'facet':
        case 'color': {
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
            return r.op === 'me' ? 'ME' : r.op === 'notMe' ? 'ME'
                : (r.handle ? '@' + r.handle.replace(/^@/, '') : 'PICK…');
        case 'rarity': return `${r.pct}%`;
    }
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
