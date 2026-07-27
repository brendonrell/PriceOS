'use client';

/*
 * groupBlocks — build the gallery's grouped blocks for ANY number of layers
 * (Brendon, 2026-07-26: "3 layers").
 *
 * WHY THIS EXISTS. Grouping used to be a chain of bespoke branches inside each
 * gallery, one per hardcoded PAIR — artist+project, artist+colour,
 * project+colour, owner+colour. That is why only those four combinations could
 * ever exist, why a third level was impossible, and why the two galleries kept
 * drifting apart. Every dimension now resolves through one label engine
 * (groupDimensions), so this walks N layers with no knowledge of which
 * dimensions they are, and both surfaces call it.
 *
 * The rules it preserves from the hand-written version:
 *   • a header appears only on the FIRST block of its section, so a section
 *     titles once no matter how many blocks sit under it;
 *   • a level-1 count totals the WHOLE section, deeper counts their own slice;
 *   • each level carries its own collapse key, so folding a parent folds
 *     everything nested beneath it;
 *   • sections order by their dimension's own rule (groupLabelComparator), so
 *     colour follows the wheel and rarity its tiers rather than section size.
 *
 * Pieces render per-card, EXCEPT where a leaf block happens to hold one
 * project's pieces — then it emits a project block so the art still paints
 * inside that project's own provider. That was previously a property of the
 * artist/project branches; here it falls out of the data, so it keeps working
 * at any layer depth.
 */

import type { GroupKey } from './SortContext';
import { groupLabelComparator } from './groupDimensions';

/** One rendered header line. `level` drives the staircase indent. */
export type GBHead = {
    level: 1 | 2 | 3;
    label: string;
    by?: string | null;
    soon?: boolean;
    count?: number;
};

export type GBlock = {
    key: string;
    /** Collapse key for the level-1 section this block belongs to. */
    l1Key: string;
    /** Collapse key for its level-2 sub-section, when it has one. */
    l2Key?: string;
    /** Collapse key for its level-3 sub-section, when it has one. */
    l3Key?: string;
    heads: GBHead[];
    group?: { slug: string; ids: number[] };
    cards?: { slug: string; id: number }[];
};

export interface BuildGroupsOpts<T> {
    /** This item's section label at the given layer. */
    labelOf: (item: T, layer: GroupKey) => string;
    /** The card coordinates for an item. */
    cardOf: (item: T) => { slug: string; id: number };
    /** Optional subtitle for a header (the artist under a project title). */
    byOf?: (item: T, layer: GroupKey) => string | null;
}

/**
 * Bucket `items` down `layers` and flatten to render blocks.
 * `layers` is already hole-free (SortContext.groupLayers); [] returns [].
 */
export function buildGroupBlocks<T>(
    items: readonly T[],
    layers: readonly GroupKey[],
    opts: BuildGroupsOpts<T>,
): GBlock[] {
    if (!layers.length || !items.length) return [];

    type Node = { items: T[]; kids: Map<string, Node> };
    const root: Node = { items: [], kids: new Map() };

    for (const item of items) {
        let node = root;
        node.items.push(item);
        for (const layer of layers) {
            const label = opts.labelOf(item, layer);
            let kid = node.kids.get(label);
            if (!kid) { kid = { items: [], kids: new Map() }; node.kids.set(label, kid); }
            kid.items.push(item);
            node = kid;
        }
    }

    const blocks: GBlock[] = [];

    /* Walk the tree depth-first. `pending` carries the headers owed by the
       levels we just descended through — they attach to the first leaf block
       that comes out, which is what makes a section title exactly once. */
    const walk = (
        node: Node,
        depth: number,
        keys: string[],
        pending: GBHead[],
    ): void => {
        const layer = layers[depth]!;
        const cmp = groupLabelComparator(layer);
        const entries = [...node.kids.entries()]
            .sort((a, b) => cmp([a[0], a[1].items.length], [b[0], b[1].items.length]));

        for (const [label, kid] of entries) {
            const level = (depth + 1) as 1 | 2 | 3;
            const nextKeys = [...keys, `${depth}:${label}`];
            const head: GBHead = { level, label, count: kid.items.length };
            const by = opts.byOf?.(kid.items[0]!, layer) ?? null;
            if (by) head.by = by;
            const heads = [...pending, head];

            if (depth + 1 < layers.length) {
                walk(kid, depth + 1, nextKeys, heads);
                continue;
            }

            /* Leaf — emit the block. One project's worth of pieces renders as a
               project block so the art keeps its own provider; anything mixed
               renders per-card. */
            const cards = kid.items.map(opts.cardOf);
            const slug = cards[0]!.slug;
            const oneProject = cards.every((c) => c.slug === slug);
            blocks.push({
                key: nextKeys.join('||'),
                l1Key: nextKeys[0]!,
                ...(nextKeys[1] ? { l2Key: nextKeys.slice(0, 2).join('||') } : {}),
                ...(nextKeys[2] ? { l3Key: nextKeys.slice(0, 3).join('||') } : {}),
                heads,
                ...(oneProject
                    ? { group: { slug, ids: cards.map((c) => c.id) } }
                    : { cards }),
            });
        }
    };

    walk(root, 0, [], []);
    return blocks;
}


/* ── The project page's flat shape ──────────────────────────────────────────
   That gallery renders one INTERLEAVED list — a header, then the ids beneath
   it, then the next header — rather than blocks. Same tree walk, same rules,
   different output: a parent section carries no ids of its own (only the
   running total for its header) and the leaf carries the pieces. */

export type GSec = {
    ckey: string;
    /** Ancestor fold keys — folding any of them hides this section. */
    l1Key: string;
    l2Key?: string;
    level: 1 | 2 | 3;
    label: string;
    ids: number[];
    total: number;
    soon: boolean;
};

export function buildGroupSections<T>(
    items: readonly T[],
    layers: readonly GroupKey[],
    opts: { labelOf: (item: T, layer: GroupKey) => string; idOf: (item: T) => number },
): GSec[] {
    if (!layers.length || !items.length) return [];

    type Node = { items: T[]; kids: Map<string, Node> };
    const root: Node = { items: [], kids: new Map() };
    for (const item of items) {
        let node = root;
        for (const layer of layers) {
            const label = opts.labelOf(item, layer);
            let kid = node.kids.get(label);
            if (!kid) { kid = { items: [], kids: new Map() }; node.kids.set(label, kid); }
            kid.items.push(item);
            node = kid;
        }
    }

    const out: GSec[] = [];
    const walk = (node: Node, depth: number, keys: string[]): void => {
        const layer = layers[depth]!;
        const cmp = groupLabelComparator(layer);
        const entries = [...node.kids.entries()]
            .sort((a, b) => cmp([a[0], a[1].items.length], [b[0], b[1].items.length]));

        for (const [label, kid] of entries) {
            const level = (depth + 1) as 1 | 2 | 3;
            const nextKeys = [...keys, `${depth}:${label}`];
            const ckey = nextKeys.join('||');
            const isLeaf = depth + 1 >= layers.length;
            out.push({
                ckey,
                l1Key: nextKeys[0]!,
                ...(nextKeys[1] ? { l2Key: nextKeys.slice(0, 2).join('||') } : {}),
                level,
                label,
                /* Only the leaf owns pieces; a parent is a title plus a total. */
                ids: isLeaf ? kid.items.map(opts.idOf) : [],
                total: kid.items.length,
                soon: false,
            });
            if (!isLeaf) walk(kid, depth + 1, nextKeys);
        }
    };
    walk(root, 0, []);
    return out;
}
