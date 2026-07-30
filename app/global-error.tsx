'use client';

/*
 * Last-resort error boundary (Next.js App Router convention).
 *
 * Catches a render-phase crash in the ROOT LAYOUT itself — the one place
 * app/error.tsx can't reach, because error.tsx renders *inside* the layout.
 * When this fires the layout is gone, so this component must supply its own
 * <html>/<body> (Next requirement) and can rely on nothing from the app.
 *
 * Should almost never show. If it does, the whole shell failed to render;
 * the only honest recovery is a full reload.
 */

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 18,
                    padding: 24,
                    textAlign: 'center',
                    background: '#111',
                    color: '#e0e0e0',
                    fontFamily: "'Courier New', Courier, monospace",
                }}
            >
                <div style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: '0.12em' }}>
                    PRICE DISCUSSION
                </div>
                <div style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.5 }}>
                    The app hit an unexpected snag and needs to reload.
                </div>
                <button
                    type="button"
                    onClick={() => reset()}
                    style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: 12,
                        fontWeight: 'bold',
                        letterSpacing: '0.1em',
                        padding: '10px 18px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        border: 'none',
                        background: '#e0e0e0',
                        color: '#111',
                    }}
                >
                    RELOAD
                </button>
            </body>
        </html>
    );
}
