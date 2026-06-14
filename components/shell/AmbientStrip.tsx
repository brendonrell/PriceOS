'use client';

/*
 * AmbientStrip — a skinny oval "LED bar" that sits just under the Tape and
 * casts a slow, colour-shifting glow DOWN onto the canvas scrolling beneath it,
 * like a neon desk lamp tilted to face the surface in front of it.
 *
 * Tap the pill to cycle the mood:
 *   OFF   — just the bar gently drifting colour, no glow, no dim.
 *   RELAX — the page dims ("lights off") and a soft, slow downward glow spills
 *           onto the content; the ambient light does the work.
 *   FUN   — brighter, faster, more saturated; lighter dim.
 *
 * The glow is screen-blended so its colour ADDS to whatever's below (additive
 * light, not a flat wash) — close enough to real spill without ray tracing.
 * Mode persists per device. Mode is mirrored to <body> classes so the dim
 * overlay + pacing can react in CSS.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';

type AmbientMode = 'off' | 'relax' | 'fun';
const MODES: AmbientMode[] = ['off', 'relax', 'fun'];
const STORAGE_KEY = 'pd_ambient_mode';

export default function AmbientStrip() {
    const { showToast } = useToast();
    const [mode, setMode] = useState<AmbientMode>('off');

    /* Hydrate the saved mood after mount (SSR can't read localStorage). */
    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY) as AmbientMode | null;
            if (saved && MODES.includes(saved)) setMode(saved);
        } catch {
            /* private mode / blocked storage — stay OFF */
        }
    }, []);

    /* Reflect the mood onto <body> so the dim overlay + pacing react in CSS. */
    useEffect(() => {
        const cls = document.body.classList;
        cls.toggle('ambient-on', mode !== 'off');
        cls.toggle('ambient-relax', mode === 'relax');
        cls.toggle('ambient-fun', mode === 'fun');
        try {
            window.localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            /* ignore */
        }
        return () => {
            cls.remove('ambient-on', 'ambient-relax', 'ambient-fun');
        };
    }, [mode]);

    const cycle = useCallback(() => {
        setMode((m) => {
            const next = MODES[(MODES.indexOf(m) + 1) % MODES.length];
            showToast(`Ambient: ${next.toUpperCase()}`);
            return next;
        });
    }, [showToast]);

    return (
        <div className="ambient-strip-layer">
            {/* Downward glow pool — screen-blended onto the content below. */}
            <div className="ambient-glow" aria-hidden="true" />
            {/* The oval LED pill — tap to change the mood. */}
            <button
                type="button"
                className="ambient-pill"
                title="Ambient light — tap to change the mood"
                aria-label={`Ambient light: ${mode}`}
                onClick={cycle}
            >
                <span className="ambient-pill-led" />
            </button>
        </div>
    );
}
