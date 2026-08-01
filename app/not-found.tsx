'use client';

/*
 * The 404 (Next.js App Router convention) — what every notFound() lands on.
 *
 * Before this existed, a dead address showed Next's stock white "404 — This
 * page could not be found." with no way out but the browser chrome (Brendon,
 * 2026-08-01). It renders INSIDE the root layout, so the navbar and the app
 * shell stay alive around it.
 *
 * Styled off app/error.tsx so the two dead-ends read as the same furniture
 * (Rule #0 — reuse, never reinvent), on the page's own colorway tokens, at
 * full strength (Rule #2).
 */

const BTN: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    padding: '10px 18px',
    borderRadius: 4,
    cursor: 'pointer',
    border: 'none',
    background: 'var(--text-color, #e0e0e0)',
    color: 'var(--bg-color, #111)',
};

export default function NotFound() {
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
            <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.12em' }}>
                NOTHING AT THIS ADDRESS
            </div>
            <div style={{ fontSize: 12, fontWeight: 'bold', maxWidth: 320, lineHeight: 1.5 }}>
                This page does not exist, or it never did.
            </div>
            <button type="button" onClick={() => window.history.back()} style={BTN}>
                BACK
            </button>
        </div>
    );
}
