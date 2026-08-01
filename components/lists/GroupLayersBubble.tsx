'use client';

/*
 * GroupLayersBubble — the grouping's THREE LAYERS (Brendon, 2026-07-26).
 *
 * The group toggle's TAP cycles the mains (artist · project · owner · tag ·
 * colour · rarity) — a short flick you can get through. Its HOLD opens this,
 * which is where the FULL vocabulary lives.
 *
 * Shape (Brendon's spec): three SLOTS, one per layer, staircased so the
 * hierarchy reads. A slot shows what it is currently set to; TAP a slot and it
 * opens the picker for that layer, listing every dimension this surface can
 * resolve. Pick one and it drops back to the three slots.
 *
 * ⛔ TALL, NEVER WIDE. This is a phone surface: the slots stack, the picker
 * stacks, and a long list scrolls INSIDE the bubble rather than shoving it out
 * past the screen edge.
 *
 * It is the fiat picker's bubble underneath (Rule #0, and Brendon: "should look
 * similar to the Fiat and pingtoast ones and work the same") — same body
 * portal, Attention fill, tail, `.fiat-opt` chips, on-screen clamp, and
 * outside-tap / scroll / resize dismissal.
 *
 * Layers collapse rather than leaving holes: clearing layer 2 clears layer 3
 * with it, because a third level under nothing is not a hierarchy.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
    type GroupKey, GROUP_LABEL, GROUP_GLYPH, groupDimsFor,
} from '../../lib/state/SortContext';

export interface GroupLayersAnchor {
    /** Viewport top of the control the bubble points at. */
    top: number;
    /** Viewport centre-x of that control. */
    centerX: number;
}

export default function GroupLayersBubble({
    surface,
    layers,
    anchor,
    usable,
    onPick,
    onClose,
}: {
    /** Which gallery is asking — the picker only offers what it can resolve.
     *  'all' = the saved default, which applies everywhere. */
    surface: 'project' | 'collected' | 'all';
    /** The live layers, holes already removed (SortContext.groupLayers). */
    layers: readonly GroupKey[];
    /** Where the control is, measured when the hold fired. */
    anchor: GroupLayersAnchor;
    /** Which dimensions can actually cut what is on screen. A dimension not in
     *  here would land every piece in one bucket, so it greys out instead of
     *  being offered (Brendon, 2026-07-30). Absent = offer everything. */
    usable?: ReadonlySet<GroupKey>;
    /** Set one layer. `none` clears it (and everything under it). */
    onPick: (layer: 1 | 2 | 3, key: GroupKey) => void;
    onClose: () => void;
}) {
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<{ centerX: number; tailDx: number } | null>(null);
    /** Which slot is open for picking, or null = showing the three slots. */
    const [picking, setPicking] = useState<1 | 2 | 3 | null>(null);
    const dims = groupDimsFor(surface);

    /* Dismiss on outside tap / scroll / resize — the fiat bubble's guard. */
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (bubbleRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        /* A scroll INSIDE the bubble is the user reading it, not leaving it —
           only a scroll of the page behind dismisses (Brendon, 2026-08-01). */
        const dismiss = (e?: Event) => {
            if (e && e.target instanceof Node && bubbleRef.current?.contains(e.target)) return;
            onClose();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    /* Clamp on-screen, then aim the tail back at the control — verbatim from the
       fiat picker, so a bubble opened near an edge behaves identically. Re-runs
       when the view swaps between the slots and a picker. */
    useEffect(() => {
        if (!bubbleRef.current) return;
        const half = bubbleRef.current.offsetWidth / 2;
        const margin = 8;
        const vw = window.innerWidth;
        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
        const centerX = clamp(anchor.centerX, margin + half, vw - margin - half);
        const tailDx = clamp(anchor.centerX - centerX, -(half - 12), half - 12);
        setLayout({ centerX, tailDx });
    }, [anchor, picking, layers.length]);

    /* A layer only opens once the one above it is set — the slots fill in from
       the top, and a grouping can never have a hole in it. */
    const reachable = (layer: 1 | 2 | 3) => layer === 1 || layers.length >= layer - 1;
    const current = (layer: 1 | 2 | 3): GroupKey | null => layers[layer - 1] ?? null;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={bubbleRef}
            className="fiat-picker-bubble group-layers-bubble"
            role="dialog"
            aria-label="Group by"
            style={{
                top: anchor.top,
                left: layout?.centerX ?? anchor.centerX,
                transform: 'translate(-50%, calc(-100% - 8px))',
                visibility: layout ? 'visible' : 'hidden',
                ['--p3d-tail-dx' as string]: `${layout?.tailDx ?? 0}px`,
            } as CSSProperties}
        >
            {picking === null ? (
                <>
                    <div className="glb-title">GROUP BY</div>
                    {([1, 2, 3] as const).map((layer) => {
                        const key = current(layer);
                        const open = reachable(layer);
                        const slot = (
                            <button
                                type="button"
                                className={`glb-slot${key ? ' is-set' : ''}`}
                                disabled={!open}
                                onClick={(e) => { e.stopPropagation(); setPicking(layer); }}
                                title={open ? `Layer ${layer}` : `Set layer ${layer - 1} first`}
                            >
                                <span className="glb-num">{layer}</span>
                                <span className="glb-val">
                                    {key ? (
                                        <>
                                            {GROUP_GLYPH[key] && <span className="glb-glyph" aria-hidden="true">{GROUP_GLYPH[key]}</span>}
                                            {GROUP_LABEL[key]}
                                        </>
                                    ) : (
                                        <span className="glb-empty">{open ? 'OFF' : '—'}</span>
                                    )}
                                </span>
                                <span className="glb-caret" aria-hidden="true">{'▸︎'}</span>
                            </button>
                        );
                        /* Layers 2 and 3 hang off the layer above them, marked with
                           the same down-and-over ↳ the trait value pills wear
                           (Brendon, 2026-08-01). It sits OUTSIDE the pill, in the
                           staircase step, so the pill starts just after it. */
                        if (layer === 1) return <div key={layer} className="glb-row">{slot}</div>;
                        return (
                            <div key={layer} className={`glb-row glb-l${layer}`}>
                                <span className="glb-arrow" aria-hidden="true">↳</span>
                                {slot}
                            </div>
                        );
                    })}
                </>
            ) : (
                <>
                    <button
                        type="button"
                        className="glb-title glb-back"
                        onClick={(e) => { e.stopPropagation(); setPicking(null); }}
                    >
                        <span aria-hidden="true">{'◂︎'}</span>{` LAYER ${picking}`}
                    </button>
                    <div className="glb-list">
                        {picking > 1 && (
                            <button
                                type="button"
                                className={`fiat-opt glb-opt${!current(picking) ? ' fiat-opt-on' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onPick(picking, 'none'); setPicking(null); }}
                            >
                                OFF
                            </button>
                        )}
                        {dims
                            /* A dimension can only sit at one layer. */
                            .filter((d) => current(picking) === d || !layers.includes(d))
                            .map((d) => {
                                /* Greyed = it would put everything in one
                                   bucket here. The one already set stays
                                   pickable so it can be read and changed. */
                                const dead = !!usable && current(picking) !== d && !usable.has(d);
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`fiat-opt glb-opt${current(picking) === d ? ' fiat-opt-on' : ''}`}
                                        disabled={dead}
                                        title={dead ? `${GROUP_LABEL[d]} — nothing to split here` : GROUP_LABEL[d]}
                                        onClick={(e) => { e.stopPropagation(); onPick(picking, d); setPicking(null); }}
                                    >
                                        {GROUP_GLYPH[d] && <span className="glb-glyph" aria-hidden="true">{GROUP_GLYPH[d]}</span>}
                                        {GROUP_LABEL[d]}
                                    </button>
                                );
                            })}
                    </div>
                </>
            )}
        </div>,
        document.body,
    );
}
