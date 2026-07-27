'use client';

/*
 * PopTablePanel — Rarity Labs (approved 2026-07-26): the project-wide Pop
 * Table. Every axis of the census (artist traits · Fate · colour), every
 * value with its edition count + share, sorted rarest-first. Computed from
 * the same memoised, seed-deterministic census the badges and the character
 * sheet read — no fetch, no rarity API, identical for every viewer.
 */

import { useMemo } from 'react';
import { projectCensus } from '../../lib/output/rarity';

export default function PopTablePanel({ slug }: { slug: string }) {
    const axes = useMemo(() => projectCensus(slug), [slug]);

    if (!axes || axes.length === 0) {
        return (
            <div className="pop-table-wrap">
                <div className="pop-table-row">
                    <span className="pop-table-val">THE CENSUS APPEARS WITH THE FIRST MINT</span>
                </div>
            </div>
        );
    }

    return (
        <div className="pop-table-wrap">
            {axes.map((axis) => (
                <div key={axis.name}>
                    <div className="pop-table-axis-name">
                        {axis.name} · {axis.values.length} value{axis.values.length === 1 ? '' : 's'}
                    </div>
                    {axis.values.map((v) => (
                        <div key={v.value} className={`pop-table-row${v.count === 1 ? ' pop-one' : ''}`}>
                            <span className="pop-table-val">{v.value}</span>
                            <span className="pop-table-count">{v.count}</span>
                            <span className="pop-table-pct">{(v.pct * 100).toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
