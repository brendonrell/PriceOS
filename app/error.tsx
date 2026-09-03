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
            <div style={{ fontSize: 14, letterSpacing: '0.12em', opacity: 1, fontWeight: 'bold' }}>
                SOMETHING GLITCHED
            </div>
            <div style={{ fontSize: 13, maxWidth: 320, lineHeight: 1.5, opacity: 1, fontWeight: 'bold' }}>
                This part of the page hit a snag. The rest of the app is fine.
            </div>
            {/* On-screen console error, mobile has no devtools to check.
                error.message/.stack are the same strings console.error just
                got above; digest is Next's server-side error correlation id. */}
            <div
                style={{
                    fontSize: 11,
                    maxWidth: 340,
                    maxHeight: 220,
                    overflow: 'auto',
                    lineHeight: 1.5,
                    textAlign: 'left',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    opacity: 0.85,
                    fontWeight: 'normal',
                    padding: '10px 12px',
                    border: '1px solid var(--text-color, #e0e0e0)',
                    borderRadius: 4,
                    background: 'rgba(0, 0, 0, 0.15)',
                }}
            >
                {error.name ? `${error.name}: ` : ''}
                {error.message || 'Unknown error'}
                {error.digest ? `\n\ndigest: ${error.digest}` : ''}
                {error.stack ? `\n\n${error.stack}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: 12,
                        fontWeight: 'bold',
                        letterSpacing: '0.1em',
                        padding: '10px 18px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'transparent',
                        border: '1px solid var(--text-color, #e0e0e0)',
                        color: 'var(--text-color, #e0e0e0)',
                    }}
                >
                    BACK
                </button>
            </div>
        </div>
    );
}
