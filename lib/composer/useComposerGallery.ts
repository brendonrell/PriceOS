'use client';

/*
 * useComposerGallery — sort + group the Composer's matched rows into the
 * SAME grouped-gallery blocks the Collected tab renders (GBlock — headers
 * + per-project card runs), so the Composer's output grid is the existing
 * gallery verbatim: same headers, same collapse, same ArtworkCard-in-
 * ProjectProvider rendering. Modeled line-for-line on useCollectedGallery;
 * parameterised on the Composer's own sort/group state instead of the
 * global SortContext (the Composer must never disturb the app's saved
 * sort), while speaking the exact same GroupKey vocabulary.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    GROUP_SOON, GROUP_LABEL, COLLECTED_GROUP_ORDER,
    type SortDir, type GroupKey,
} from '../state/SortContext';
import { COLOR_BUCKET_ORDER } from '../art/outputColor';
import { resolveBucket, useStoredColors } from '../art/colorStore';
import { getProject } from '../project/registry';
import { pdRarityRank } from '../output/rarity';
import type { GBlock, GBHead } from '../../components/profile/useCollectedGallery';
import type { ComposerRow, ComposerSortKey } from './query';

/** Group dimensions the Composer's grid speaks — the Collected (cross-
 *  project) cycle, verbatim. */
export const COMPOSER_GROUP_ORDER: GroupKey[] = COLLECTED_GROUP_ORDER;

export function useComposerGallery(
    matched: readonly ComposerRow[],
    sort: ComposerSortKey,
    dir: SortDir,
    group: GroupKey,
) {
    /* Stored dominant colours for every project in the match set (colour
       grouping re-renders when they arrive). */
    const slugs = useMemo(() => [...new Set(matched.map((r) => r.slug))], [matched]);
    const colorsVer = useStoredColors(slugs);

    const sorted = useMemo(() => {
        const rows = [...matched];
        const dirMult = dir === 'asc' ? 1 : -1;
        const projName = (slug: string) => getProject(slug)?.displayName ?? slug;
        const byId = (a: ComposerRow, b: ComposerRow) =>
            a.slug === b.slug ? (a.token_id - b.token_id) * dirMult : a.slug.localeCompare(b.slug);
        if (sort === 'price') {
            rows.sort((a, b) => {
                const na = a.priceEth ?? Infinity;
                const nb = b.priceEth ?? Infinity;
                return na !== nb ? (na - nb) * dirMult : byId(a, b);
            });
        } else if (sort === 'az') {
            rows.sort((a, b) => {
                const c = projName(a.slug).localeCompare(projName(b.slug)) * dirMult;
                return c !== 0 ? c : a.token_id - b.token_id;
            });
        } else if (sort === 'rarity') {
            // Cross-project comparable: percentile rank (0 = rarest). asc = rarest first.
            const pctile = (r: ComposerRow) => {
                const rk = pdRarityRank(r.slug, r.token_id);
                return rk && rk.total > 0 ? rk.rank / rk.total : 1;
            };
            rows.sort((a, b) => {
                const pa = pctile(a), pb = pctile(b);
                return pa !== pb ? (pa - pb) * dirMult : byId(a, b);
            });
        } else {
            rows.sort(byId);
        }
        return rows;
    }, [matched, sort, dir]);

    /* Grouped blocks — the useCollectedGallery builder over ComposerRows. */
    const blocks = useMemo<GBlock[] | null>(() => {
        if (group === 'none') return null;
        if (!COMPOSER_GROUP_ORDER.includes(group)) return null;
        const projName = (slug: string) => getProject(slug)?.displayName ?? slug;
        const artistOfRow = (r: ComposerRow) => r.traits.Artist ?? '—';

        if (GROUP_SOON[group]) {
            return [{
                key: 'soon',
                l1Key: 'soon',
                heads: [{ level: 1, label: GROUP_LABEL[group], soon: true }],
                cards: sorted.map((r) => ({ slug: r.slug, id: r.token_id })),
            }];
        }

        if (group === 'color') {
            const buckets = new Map<string, { slug: string; id: number }[]>();
            for (const r of sorted) {
                const b = resolveBucket(r.slug, r.token_id) ?? 'Other';
                const arr = buckets.get(b) ?? [];
                arr.push({ slug: r.slug, id: r.token_id });
                buckets.set(b, arr);
            }
            const order = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            return [...buckets.entries()]
                .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
                .map(([label, cards]) => ({
                    key: `c-${label}`, l1Key: `c-${label}`,
                    heads: [{ level: 1 as const, label, count: cards.length }], cards,
                }));
        }

        if (group === 'artistColor' || group === 'projectColor') {
            const colorOrder = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            const idOf = (r: ComposerRow) =>
                group === 'artistColor' ? artistOfRow(r) : r.slug;
            const idLabel = (k: string) => (group === 'artistColor' ? k : projName(k));
            const byId = new Map<string, ComposerRow[]>();
            const artistOf = new Map<string, string>();
            for (const r of sorted) {
                const k = idOf(r);
                const arr = byId.get(k) ?? [];
                arr.push(r);
                byId.set(k, arr);
                if (!artistOf.has(k)) artistOf.set(k, artistOfRow(r));
            }
            const ids = [...byId.keys()].sort((a, b) => idLabel(a).localeCompare(idLabel(b)));
            const blocksOut: GBlock[] = [];
            for (const k of ids) {
                const cbuckets = new Map<string, { slug: string; id: number }[]>();
                for (const r of byId.get(k)!) {
                    const b = resolveBucket(r.slug, r.token_id) ?? 'Other';
                    const arr = cbuckets.get(b) ?? [];
                    arr.push({ slug: r.slug, id: r.token_id });
                    cbuckets.set(b, arr);
                }
                const ordered = [...cbuckets.entries()]
                    .sort((a, b) => colorOrder.indexOf(a[0]) - colorOrder.indexOf(b[0]));
                let first = true;
                for (const [clabel, cards] of ordered) {
                    const heads: GBHead[] = [];
                    if (first) {
                        heads.push(
                            group === 'projectColor'
                                ? { level: 1, label: idLabel(k), by: artistOf.get(k) ?? null, count: byId.get(k)!.length }
                                : { level: 1, label: idLabel(k), count: byId.get(k)!.length },
                        );
                        first = false;
                    }
                    heads.push({ level: 2, label: clabel, count: cards.length });
                    blocksOut.push({
                        key: `${k}::${clabel}`,
                        l1Key: `i:${k}`,
                        l2Key: `s:${k}::${clabel}`,
                        heads,
                        cards,
                    });
                }
            }
            return blocksOut;
        }

        // artist / project / artistProject — project boundaries hold (one
        // provider per project); order/title by dimension.
        const bySlug = new Map<string, number[]>();
        const slugArtist = new Map<string, string>();
        for (const r of sorted) {
            const arr = bySlug.get(r.slug) ?? [];
            arr.push(r.token_id);
            bySlug.set(r.slug, arr);
            if (!slugArtist.has(r.slug)) slugArtist.set(r.slug, artistOfRow(r));
        }
        const slugList = [...bySlug.keys()];
        if (group === 'project') {
            slugList.sort((a, b) => projName(a).localeCompare(projName(b)));
            return slugList.map((slug) => ({
                key: slug,
                l1Key: slug,
                heads: [{ level: 1 as const, label: projName(slug), by: slugArtist.get(slug) ?? null, count: bySlug.get(slug)!.length }],
                group: { slug, ids: bySlug.get(slug)! },
            }));
        }
        slugList.sort((a, b) =>
            slugArtist.get(a)!.localeCompare(slugArtist.get(b)!) || projName(a).localeCompare(projName(b)));
        const artistTotals = new Map<string, number>();
        for (const [slug, ids] of bySlug) {
            const a = slugArtist.get(slug)!;
            artistTotals.set(a, (artistTotals.get(a) ?? 0) + ids.length);
        }
        let lastArtist: string | null = null;
        const blocksOut: GBlock[] = [];
        for (const slug of slugList) {
            const artist = slugArtist.get(slug)!;
            const heads: GBHead[] = [];
            if (artist !== lastArtist) { heads.push({ level: 1, label: artist, count: artistTotals.get(artist) }); lastArtist = artist; }
            if (group === 'artistProject') heads.push({ level: 2, label: projName(slug), count: bySlug.get(slug)!.length });
            blocksOut.push({
                key: slug,
                l1Key: `a:${artist}`,
                ...(group === 'artistProject' ? { l2Key: `p:${slug}` } : {}),
                heads,
                group: { slug, ids: bySlug.get(slug)! },
            });
        }
        return blocksOut;
        // colorsVer re-runs bucketing when sampled colours land.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [group, sorted, colorsVer]);

    /* Ungrouped render path — per-project runs in sorted order (same shape
       as collectedByProject, but preserving the cross-project sort order by
       emitting a new run whenever the slug changes). */
    const runs = useMemo(() => {
        const out: { slug: string; ids: number[] }[] = [];
        for (const r of sorted) {
            const last = out[out.length - 1];
            if (last && last.slug === r.slug) last.ids.push(r.token_id);
            else out.push({ slug: r.slug, ids: [r.token_id] });
        }
        return out;
    }, [sorted]);

    /* Collapsible headers — same contract as the Collected grid. */
    const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
    const toggleGroupCollapse = (key: string) =>
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    useEffect(() => { setCollapsedGroups(new Set()); }, [group]);

    return { sorted, blocks, runs, collapsedGroups, toggleGroupCollapse };
}
