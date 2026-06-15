'use client';

/*
 * AddToShowcaseModal — the "feature an Output on your profile" picker (Brendon,
 * 2026-06-15). Opens when you tap one of the ghost frames on your OWN empty
 * Showcase. Lists the Outputs you hold; tap one to add/remove it from your
 * Showcase. Same value-prompt bottom-sheet treatment as the Add-to-Album sheet
 * (dim backdrop + slide-up box, never a full-screen takeover).
 *
 * Source of truth is lib/pins/userShowcaseStore (the same store the output
 * modal's ⑆ Add-to-Showcase button writes to), so the two entry points stay in
 * lockstep and the profile grid reflects picks live.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OutputThumb from './OutputThumb';
import { useToast } from '../../lib/state/ToastContext';
import {
    getShowcaseKeys,
    toggleShowcase,
    subscribeShowcase,
} from '../../lib/pins/userShowcaseStore';

const CLOSE_FADE_MS = 250;

export default function AddToShowcaseModal({
    holdings,
    onClose,
}: {
    /** The viewer's held Outputs — the candidates to feature. */
    holdings: ReadonlyArray<{ slug: string; id: number }>;
    onClose: () => void;
}) {
    const { showToast } = useToast();
    const [keys, setKeys] = useState<ReadonlySet<string>>(() => new Set(getShowcaseKeys()));
    const [active, setActive] = useState(false);
    const closingRef = useRef(false);

    useEffect(() => {
        setKeys(new Set(getShowcaseKeys()));
        return subscribeShowcase((next) => setKeys(new Set(next)));
    }, []);

    // Slide-up on mount — rAF so .active lands a paint after mount and the CSS
    // transition engages (same dance as AlbumPickerCard / ValuePromptModal).
    useEffect(() => {
        const raf = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const dismiss = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        setActive(false);
        setTimeout(onClose, CLOSE_FADE_MS);
    };

    const toggle = (slug: string, id: number) => {
        const r = toggleShowcase(slug, id);
        showToast(r === 'full' ? 'Showcase: FULL · 6 max' : r === 'added' ? 'Showcase: ADDED' : 'Showcase: REMOVED');
    };

    return createPortal(
        <div
            className={`value-prompt-wrap mounted${active ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Add to Showcase"
            onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <div className="value-prompt-box showcase-pick-sheet">
                <span
                    className="value-prompt-close-x"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={dismiss}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); } }}
                >
                    {'×︎'}
                </span>
                <div className="value-prompt-title">Add to Showcase</div>
                {holdings.length === 0 ? (
                    <div className="album-sheet-empty">
                        Nothing to feature yet — collect an Output and it&rsquo;ll show up here.
                    </div>
                ) : (
                    <div className="showcase-pick-grid">
                        {holdings.map(({ slug, id }) => {
                            const picked = keys.has(`${slug}:${id}`);
                            return (
                                <button
                                    key={`${slug}:${id}`}
                                    type="button"
                                    className={`showcase-pick-item${picked ? ' picked' : ''}`}
                                    onClick={() => toggle(slug, id)}
                                    title={picked ? 'Remove from showcase' : 'Add to showcase'}
                                >
                                    <OutputThumb slug={slug} id={id} size={72} />
                                    <span className="showcase-pick-id">#{id}</span>
                                    {picked && <span className="showcase-pick-check">{'✓︎'}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
                <div className="value-prompt-actions">
                    <button type="button" className="value-prompt-btn primary" onClick={dismiss}>
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
