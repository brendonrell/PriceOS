'use client';

/*
 * useBudgetStepLine — F57 (BUG-10): the Budget step-line driver.
 * The engine owns budget state + body.budget-active toggle + per-card
 * .in-budget class drive (via ArtworkCard subscribers). The step-line
 * portion is layout-dependent (offsetTop / offsetLeft / offsetWidth)
 * so it MUST be applied imperatively after the page commits — that's
 * the useLayoutEffect's job. Re-runs on:
 *   - budgetsState change  (active budget toggled / added)
 *   - sort + dir change    (price-asc gate flips)
 *   - visibleTokenIds      (filter / search / trait change moves cards)
 * Sim parity refs: applyBudget at sim 8148 (init), 8359 (sort change),
 * 8722 (trait), 8896/8909 (search), 9972 (toggle). One React hook
 * collapses all of those touch points into one place.
 *
 * Resize is handled separately — engine attaches a debounced 150ms
 * resize listener (sim 6076-6078) and invokes registered redraw
 * callbacks. We register a closure that captures the live priceAsc
 * flag via a ref so the listener doesn't go stale.
 *
 * Split out of ProjectPageBody 2026-07-06 — pure move, no behavior change.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSort } from '../../lib/state/SortContext';
import {
    applyStepLine,
    getBudgets,
    registerStepLineRedraw,
    subscribeBudgets,
    type BudgetsState,
} from '../../lib/engines/budgetEngine';

export function useBudgetStepLine(
    visibleTokenIds: number[],
    onShowcaseTab: boolean,
    activeTab: string,
) {
    const { sort, dir } = useSort();
    const [budgetsState, setBudgetsState] = useState<BudgetsState>(() =>
        getBudgets()
    );
    useEffect(() => {
        setBudgetsState(getBudgets());
        return subscribeBudgets((next) => setBudgetsState(next));
    }, []);

    const priceAscActive = sort === 'price' && dir === 'asc';
    const priceAscRef = useRef(priceAscActive);
    priceAscRef.current = priceAscActive;

    useLayoutEffect(() => {
        /* project-showcase-mode CSS-hides all non-pick cards — their
           offsetTop/offsetLeft collapse to 0, which corrupts applyStepLine's
           row-detection geometry and produces phantom step-line overlays.
           Clear any stale step-line state and bail when on showcase tab. */
        if (onShowcaseTab) {
            applyStepLine(false);
            return;
        }
        applyStepLine(priceAscActive);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [budgetsState, sort, dir, visibleTokenIds, priceAscActive, activeTab]);

    useEffect(() => {
        return registerStepLineRedraw(() => {
            applyStepLine(priceAscRef.current);
        });
    }, []);
}
