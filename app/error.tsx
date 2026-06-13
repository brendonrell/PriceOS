'use client';

/*
 * Routed-page error boundary (Next.js App Router convention).
 *
 * Catches a render-phase crash in the routed page (the `children` under
 * the root layout) WITHOUT tearing down the layout — so the navbar, the
 * providers, and the rest of the shell stay alive and the user can recover
 * in place via "Try again" (Next's `reset()` re-renders the segment).
 *
 * Before this existed, a page crash had nothing to catch it and the whole
 * site went white (Brendon, 2026-06-13 stability pass). This is the net for
 * everything that renders inside a route; app/global-error.tsx is the
 * last-resort net for the root layout itself.
 *
 * Inline-styled on purpose: a crash may have happened before/around the
 * stylesheet, so this fallback can't depend on app CSS to be legible.
 */

import { useEffect } from 'react';

export default function RouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.error('[route error]', error);
    }, [error]);

    return (
        <div
            role="alert"
            style={{
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                padding: 24,
                textAlign: 'center',
                fontFamily: "'Courier New', Courier, monospace",
                color: 'var(--text-color, #e0e0e0)',
            }}
        >
            <div style={{ fontSize: 13, letterSpacing: '0.12em', opacity: 0.7 }}>
                SOMETHING GLITCHED
            </div>
            <div style={{ fontSize: 12, maxWidth: 320, lineHeight: 1.5, opacity: 0.6 }}>
                This part of the page hit a snag. The rest of the app is fine.
            </div>
            <button
                type="button"
                onClick={reset}
                style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: 12,
                    fontWeight: 'bold',
                    letterSpacing: '0.1em',
                    padding: '10px 18px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'var(--text-color, #e0e0e0)',
                    color: 'var(--bg-color, #111)',
                }}
            >
                TRY AGAIN
            </button>
        </div>
    );
}
