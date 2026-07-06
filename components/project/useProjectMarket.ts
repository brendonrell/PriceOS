'use client';

/*
 * useProjectMarket — the project's floor read: walks the reconciled
 * outputs for the lowest listed price (D003 + D004, sim 8127-8141) which
 * drives the sold-out BUY button and the +More Floor tile. Split out of
 * ProjectPageBody 2026-07-06 — pure move, no behavior change.
 */

import { useMemo } from 'react';
import { useProject } from '../../lib/state/ProjectContext';

export function useProjectFloor() {
    const project = useProject();
    /* Sim walks metaCache[1..TOTAL_OUTPUTS] for the lowest listed price
       and wires buyBtn.onclick → openModal(lowestId), .mint-price text →
       `(${lowestFloor.toFixed(3)} ETH)`. Falls back to (SOLD OUT) +
       opacity 0.5 + cursor not-allowed when no listed Outputs exist.
       Token meta has only `price: string | null` (no rawPrice numeric),
       so we parseFloat in the same pattern the gallery predicate uses. */
    return useMemo(() => {
        let lo = Infinity;
        let id: number | null = null;
        for (let i = 1; i <= project.totalOutputs; i++) {
            const meta = project.outputs.get(i);
            if (!meta || !meta.price) continue;
            const n = parseFloat(meta.price);
            if (!Number.isNaN(n) && n < lo) {
                lo = n;
                id = i;
            }
        }
        return { lowestId: id, lowestFloor: id !== null ? lo : null };
    }, [project]);
}
