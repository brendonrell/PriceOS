'use client';

/*
 * PopTablePanel — RARITY LABS (approved 2026-07-26; named and put into plain
 * English 2026-07-29 by Brendon: "exactly zero users will have any clue what's
 * going on"). Every axis of the census (artist traits · Fate · colour), every
 * value with how many pieces carry it and what share of the edition that is,
 * rarest first. Computed from the same memoised, seed-deterministic census the
 * badges and the character sheet read — no fetch, no rarity API, identical for
 * every viewer.
 *
 * The copy is written for someone who has never heard the word "census": say
 * how many pieces have a thing, say what share that is, and say plainly that
 * fewer means rarer.
 */

import { useMemo } from 'react';
import { projectCensus } from '../../lib/output/rarity';

export default function PopTablePanel({ slug }: { slug: string }) {
    const axes = useMemo(() => projectCensus(slug), [slug]);

    if (!axes || axes.length === 0) {
        return (
            <div className="pop-table-wrap">
                <div className="pop-table-row">
                    <span className="pop-table-val">NOTHING MINTED YET — THIS FILLS IN WITH THE FIRST PIECE</span>
                </div>
            </div>
        );
    }

    return (
        <div className="pop-table-wrap">
            <p className="pop-table-intro">
                Every look this project can make, and how many pieces got it.
                The fewer pieces share a look, the rarer that look is. A look
                only one piece has is marked POP 1.
            </p>
            {axes.map((axis) => (
                <div key={axis.name}>
                    <div className="pop-table-axis-name">
                        {axis.name} · {axis.values.length} to go around
                    </div>
                    <div className="pop-table-row pop-table-head">
                        <span className="pop-table-val">Look</span>
                        <span className="pop-table-count">Pieces</span>
                        <span className="pop-table-pct">Share</span>
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
