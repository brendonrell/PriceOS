'use client';

/*
 * DegenSlab — the Degen Mode data tile, shared by every surface that swaps
 * art for numbers (2026-07-17 — Brendon: Degen works ACROSS THE SITE, not
 * just the grids). One markup, one stylesheet:
 *   #28              ← the id
 *   ❖87 · 3/105      ← PD Rarity score + rank across the edition set
 *   AURORA ×7        ← primary trait value, ×N existing
 *   EMBER ×12        ← Fate, ×N existing
 *   0.032 ETH        ← the ask (UNLISTED dims — a meaning-carrying fade)
 * All reads are the same deterministic, project-cached rarity math the Vault
 * and RARITY grouping use. Callers gate on notifs.degen; the slab assumes on.
 * `modal` scales the typography up for the artwork modal's big panel.
 */

import { useMemo } from 'react';
import { primaryTrait, traitRarity, fateRarity, pdRarity, pdRarityRank } from '../lib/output/rarity';
import { fateDetail } from '../lib/output/derive';

export default function DegenSlab({
    slug,
    id,
    price,
    modal = false,
}: {
    slug: string;
    id: number;
    /** The live listing price string ("0.032 ETH") or null when unlisted. */
    price: string | null;
    modal?: boolean;
}) {
    const read = useMemo(() => {
        const r = pdRarity(slug, id);
        const rank = pdRarityRank(slug, id);
        const pt = primaryTrait(slug, id);
        const ptFreq = pt ? traitRarity(slug, pt.name, pt.value) : null;
        const fate = fateDetail(slug, id).fate;
        const fFreq = fateRarity(slug, fate);
        return {
            score: r?.score ?? null,
            rank,
            trait: pt ? { value: pt.value, count: ptFreq?.count ?? null } : null,
            fate: { value: fate, count: fFreq?.count ?? null },
        };
    }, [slug, id]);

    return (
        <div className={`degen-overlay${modal ? ' degen-overlay--modal' : ''}`}>
            <span className="d-id">#{id}</span>
            {/* The degen number: PD Rarity score + where it ranks across the
                whole edition set. ❖ is the sitewide RARITY glyph. */}
            {read.score != null && (
                <span className="d-rarity">
                    {'❖︎'}{read.score}
                    {read.rank && (
                        <> · {read.rank.rank}/{read.rank.total}</>
                    )}
                </span>
            )}
            {/* Scarcity reads: trait value ×N existing, Fate ×N —
                apples-to-apples down the whole grid. */}
            {read.trait && (
                <span className="d-trait">
                    {read.trait.value}
                    {read.trait.count != null && (
                        <span className="d-count"> ×{read.trait.count}</span>
                    )}
                </span>
            )}
            <span className="d-trait">
                {read.fate.value}
                {read.fate.count != null && (
                    <span className="d-count"> ×{read.fate.count}</span>
                )}
            </span>
            <span className={`d-price${price ? '' : ' d-unlisted'}`}>
                {price ?? 'UNLISTED'}
            </span>
        </div>
    );
}
