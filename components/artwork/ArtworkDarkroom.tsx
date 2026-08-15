'use client';

/*
 * ArtworkDarkroom ◉ — the art-inspection workspace (ClickUp 86b9eu80j,
 * Brendon greenlight 2026-07-27). Full-resolution live render straight from
 * the deterministic engine (never a stored image), pixel-level zoom via the
 * shipped Deep Zoom layer, the piece's real palette as tappable swatches
 * (the same sampler as the character sheet's Swatches tile), and an optional
 * inverted/negative render mode. Minimal chrome — the art is the interface.
 *
 * Door: long-press the artwork on the feature page (DeepZoomLayer
 * onLongPress). Out: the standard × (history back when the visit came from
 * inside the app; the piece's own page on a cold link). Default state is
 * plain — INVERT is off until tapped.
 *
 * Mounted by app/art/[slug]/[localId]/darkroom/page.tsx. Anatomy mirrors
 * ArtworkFullscreen (the proven fullscreen art surface) on purpose.
 */

import { useRef, useState } from 'react';
import ArtworkLive from './ArtworkLive';
import DeepZoomLayer from '../art/DeepZoomLayer';
import { samplePaletteChips } from '../../lib/output/paletteChips';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useToast } from '../../lib/state/ToastContext';

export default function ArtworkDarkroom({ slug, id }: { slug: string; id: number }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const { notifs } = usePdNotifs();
    const { showToast } = useToast();
    const [inverted, setInverted] = useState(false);

    /* The piece's real colours — the same sampler (and cache) as the
       character sheet's Swatches tile. Synchronous + cached per piece. */
    const chips = samplePaletteChips(slug, id);

    return (
        <div className="artwork-fullscreen artwork-darkroom">
            {/* PERMANENT BACK — the exact same arrow, same spot, same
                real-history-first behaviour + cold-link fallback as the
                feature/fullscreen page (Brendon, 2026-08-14: darkroom carried
                a second, differently-behaved × close button here — removed
                so there's exactly one back control, identical to the feature
                page's). */}
            <a
                className="fullscreen-back"
                href={`/art/${slug}/${id}`}
                title="Back"
                aria-label="Back"
                /* Opt out of the shell's in-app click router (capture phase runs
                   before this onClick and would push the href forward again). */
                data-native-nav=""
                onClick={(e) => {
                    if (window.history.length > 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        const from = window.location.href;
                        window.history.back();
                        /* history.length > 1 can still mean "nothing BEHIND us".
                           If back() moved nothing, land on the artwork page so
                           the arrow is never a dead button. */
                        window.setTimeout(() => {
                            if (window.location.href === from) {
                                window.location.assign(`/art/${slug}/${id}`);
                            }
                        }, 400);
                    }
                }}
            >
                {'⇠⇠︎'}
            </a>
            {/* The invert filter wraps the whole stage, so the sharp zoom
                overlay and the loupe read inverted with the art — one
                consistent negative, never a mixed frame. */}
            <div
                ref={hostRef}
                className="dz-host"
                style={inverted ? { filter: 'invert(1)' } : undefined}
            >
                <ArtworkLive slug={slug} id={id} contain className="artwork-fullscreen-art artwork-darkroom-art" />
                <DeepZoomLayer
                    containerRef={hostRef}
                    getArt={() => hostRef.current?.querySelector('.artwork-darkroom-art') ?? null}
                    slug={slug}
                    id={id}
                    disabled={notifs.asciiArt}
                />
            </div>
            <div className="darkroom-bar">
                {chips && chips.length > 0 && (
                    <span className="attr-chips">
                        {chips.map((c) => (
                            <button
                                key={c.hex}
                                type="button"
                                className="attr-chip"
                                title={`Copy ${c.hex}`}
                                onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                        navigator.clipboard.writeText(c.hex).catch(() => {});
                                    }
                                    showToast(`${c.hex}: COPIED`);
                                }}
                            >
                                <span className="attr-chip-swatch" style={{ background: c.hex }} />
                                <span className="attr-chip-hex">{c.hex}</span>
                            </button>
                        ))}
                    </span>
                )}
                <button
                    type="button"
                    className={`darkroom-invert${inverted ? ' is-on' : ''}`}
                    onClick={() => {
                        const next = !inverted;
                        setInverted(next);
                        showToast(`Render: ${next ? 'INVERTED' : 'NORMAL'}`);
                    }}
                >
                    INVERT
                </button>
            </div>
        </div>
    );
}
