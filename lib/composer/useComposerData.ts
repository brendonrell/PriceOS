'use client';

/*
 * useComposerData — the Composer's dataset: every minted Output across
 * every Project, enriched exactly the way the Collected pipeline enriches
 * holdings (outputTraits + live owner/listing), so the two surfaces can
 * never disagree about a piece.
 *
 * Source: the SAME per-project endpoint the project page reconciles from
 * (/api/project/{slug}/outputs), fetched in parallel across the registry.
 * Loads on first open of the Composer, refreshes on the market's own
 * 'pd:project-refresh' event (fired after mint / buy / list) — the modal
 * never shows a stale grid after a market action.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { allProjects, outputTraits } from '../project/registry';
import type { ComposerRow } from './query';

interface OutputDTO {
    token_id: number;
    owner: string;
    owner_handle: string | null;
    list_price_eth: string | null;
}

interface ProjectOutputsResponse {
    outputs?: OutputDTO[];
    total?: number;
}

export interface ComposerData {
    rows: readonly ComposerRow[];
    /** Slugs with at least one minted Output — the scope picker's pool. */
    mintedSlugs: readonly string[];
    loading: boolean;
}

export function useComposerData(active: boolean): ComposerData {
    const [rows, setRows] = useState<readonly ComposerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const loadedOnce = useRef(false);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;

        const load = async () => {
            if (!loadedOnce.current) setLoading(true);
            const slugs = allProjects().map((p) => p.slug);
            const results = await Promise.all(
                slugs.map(async (slug) => {
                    try {
                        const r = await fetch(`/api/project/${slug}/outputs`, { cache: 'no-store' });
                        if (!r.ok) return { slug, data: null };
                        return { slug, data: (await r.json()) as ProjectOutputsResponse };
                    } catch {
                        return { slug, data: null };
                    }
                }),
            );
            if (cancelled) return;
            const next: ComposerRow[] = [];
            for (const { slug, data } of results) {
                if (!data) continue;
                const total = data.total ?? 0;
                const bySeen = new Map<number, OutputDTO>();
                for (const o of data.outputs ?? []) bySeen.set(o.token_id, o);
                for (let id = 1; id <= total; id++) {
                    const o = bySeen.get(id);
                    const price = o?.list_price_eth ?? null;
                    const priceNum = price != null ? parseFloat(price) : NaN;
                    next.push({
                        slug,
                        token_id: id,
                        listed: price != null,
                        priceEth: Number.isNaN(priceNum) ? null : priceNum,
                        list_price_eth: price,
                        ownerAddr: (o?.owner ?? '').toLowerCase(),
                        ownerHandle: o?.owner_handle ?? null,
                        traits: outputTraits(slug, id),
                    });
                }
            }
            loadedOnce.current = true;
            setRows(next);
            setLoading(false);
        };

        load();
        const onRefresh = () => { load(); };
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:project-refresh', onRefresh);
        };
    }, [active]);

    const mintedSlugs = useMemo(
        () => [...new Set(rows.map((r) => r.slug))],
        [rows],
    );

    return { rows, mintedSlugs, loading };
}
