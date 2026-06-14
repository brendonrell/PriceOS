'use client';

/*
 * BenchDragLayer — the global overlay for an in-flight hold-drag.
 *
 * Renders two things, both driven by BenchContext.drag (the useHoldDrag engine
 * updates it): the floating ghost of the piece under the pointer, and the peek
 * dock that slides up the instant a hold engages — BENCH always, CART when the
 * piece is listed. The dock is the "where do I drop this" affordance Brendon
 * asked for; it must read at a glance.
 *
 * Hit testing is geometric (elementFromPoint in the engine), so the layer
 * itself is pointer-events:none and only the [data-bench-drop] pads opt back
 * in — the ghost never intercepts, and nothing under the dock leaks clicks.
 */

import { useBench } from '../lib/state/BenchContext';
import BenchArt from './bench/BenchArt';

export default function BenchDragLayer() {
    const { drag, items } = useBench();

    const engaged = !!drag?.engaged;
    const listed = !!drag?.listed;

    return (
        <div className={`bench-drag-layer${engaged ? ' active' : ''}`} aria-hidden="true">
            {drag && engaged && (
                <div
                    className="bench-ghost"
                    style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0) translate(-50%, -50%)` }}
                >
                    <div className="bench-ghost-art-wrap">
                        <BenchArt slug={drag.slug} id={drag.id} className="bench-ghost-art" />
                    </div>
                    <span className="bench-ghost-tag">#{drag.id}</span>
                </div>
            )}

            <div className={`bench-dock${engaged ? ' up' : ''}`}>
                <div className={`bench-dock-tab${listed ? ' has-cart' : ''}`}>
                    <span className="bench-dock-grip" aria-hidden="true" />
                    <div className="bench-dock-zones">
                        <div
                            className={`bench-dock-zone bench${drag?.armed === 'bench' ? ' armed' : ''}`}
                            data-bench-drop="bench"
                        >
                            <span className="bench-dock-icon">{'▦'}</span>
                            <span className="bench-dock-text">
                                {drag?.armed === 'bench' ? 'DROP TO COMPARE' : 'BENCH'}
                            </span>
                            {items.length > 0 && (
                                <span className="bench-dock-count">{items.length}</span>
                            )}
                        </div>

                        {listed && (
                            <div
                                className={`bench-dock-zone cart${drag?.armed === 'cart' ? ' armed' : ''}`}
                                data-bench-drop="cart"
                            >
                                <span className="bench-dock-icon">{'▢'}</span>
                                <span className="bench-dock-text">
                                    {drag?.armed === 'cart' ? 'DROP TO BUY' : 'CART'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
