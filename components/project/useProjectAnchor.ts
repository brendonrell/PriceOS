'use client';

/*
 * useProjectAnchor — the D17 anchor: hydrates pd_anchors[project.title]
 * from localStorage (synced on 'pd:anchors-changed'), keeps
 * body.anchor-active honest, and stamps the per-card anchor delta onto
 * every gallery price trigger. Split out of ProjectPageBody 2026-07-06 —
 * pure move, no behavior change.
 */

import { useEffect, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';

export function useProjectAnchor(visibleTokenIds: number[], onArtworksTab: boolean, activeTab: string) {
    const project = useProject();

    /* D17 anchor — local mirror of pd_anchors[project.title]. Hydrated
       from localStorage on mount, kept in sync via the 'pd:anchors-changed'
       window event below. Drives both the .stat-val text rendering for the
       ↧ stat-item AND the price-trigger delta stamping in the gallery. */
    const [anchorEth, setAnchorEth] = useState<number | null>(null);

    /* ── D17 anchor hydration + cross-surface sync ──
       Reads pd_anchors from localStorage on mount AND on every
       'pd:anchors-changed' window event (the ValuePromptContext helper
       fires this after every save). Each pass:
         1. Updates body.anchor-active iff at least one saved anchor > 0
            (defensive — the helper already toggles this on save, but a
             stale class from a prior session is possible if storage was
             cleared externally).
         2. Mirrors pd_anchors[project.title] into local anchorEth
            state, which drives the ↧ .stat-val text rendering AND the
            delta-stamping useEffect that runs after visibleTokenIds. */
    useEffect(() => {
        const sync = () => {
            let anchors: Record<string, number> = {};
            try {
                const raw = window.localStorage.getItem('pd_anchors');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                        anchors = parsed as Record<string, number>;
                    }
                }
            } catch { /* keep empty */ }

            const hasAny = Object.values(anchors).some(
                (v) => typeof v === 'number' && isFinite(v) && v > 0
            );
            document.body.classList.toggle('anchor-active', hasAny);

            const v = anchors[project.title];
            setAnchorEth(
                typeof v === 'number' && isFinite(v) && v > 0 ? v : null
            );
        };

        sync();
        window.addEventListener('pd:anchors-changed', sync);
        return () => {
            window.removeEventListener('pd:anchors-changed', sync);
        };
    }, [project.title]);

    /* ── D17 anchor delta stamping ──
       For every .meta-owner.price-trigger inside #gallery, parse the price
       from text content (format "0.014 ETH" — see ProjectContext token
       seeder) and stamp data-anchor-delta as the fully-formatted delta
       string ("(+18%)" / "(-3%)" / "0"). The CSS ::before appends this
       value verbatim after the ↧ glyph. When anchor is null OR the price
       can't be parsed, the attr is removed so CSS body.anchor-active rules
       don't render a stale delta.

       Scoped to artworks tab only — anchor display has no meaning on the
       Project Showcase tab (cards are CSS-filtered to 6 picks, .meta is
       hidden) or Albums tab. Clear any stale attrs when not on artworks.

       Re-runs on every gallery re-render (visibleTokenIds change) because
       React's reconciler will not preserve imperatively-stamped attrs
       across card mount/unmount. Cheap — single querySelectorAll +
       parseFloat per card. Sim parity ref: applyAnchor sim 11333. */
    useEffect(() => {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        const triggers = gallery.querySelectorAll<HTMLElement>(
            '.meta-owner.price-trigger'
        );

        if (anchorEth == null || !onArtworksTab) {
            triggers.forEach((el) => el.removeAttribute('data-anchor-delta'));
            return;
        }

        triggers.forEach((el) => {
            const p = parseFloat(el.textContent || '');
            if (!(p > 0) || !isFinite(p)) {
                el.removeAttribute('data-anchor-delta');
                return;
            }
            const pct = (p / anchorEth - 1) * 100;
            const sign = pct > 0 ? '+' : pct < 0 ? '-' : '';
            const abs = Math.abs(pct).toFixed(0);
            const isZero = parseFloat(abs) === 0;
            const str = isZero ? '0' : `(${sign}${abs}%)`;
            el.setAttribute('data-anchor-delta', str);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorEth, visibleTokenIds, activeTab]);

    return anchorEth;
}
