/*
 * Route-level loading state — shown by the App Router the instant an
 * internal navigation starts, while the next page's server render is in
 * flight. Before this existed there was NO transition feedback at all:
 * a click on a slow render looked completely frozen (§9 — every wait
 * surface must show continuous motion).
 *
 * Brendon 2026-06-19: this now shows the branded "Loading" panel (the same
 * loading screen as the boot splash), not the old three dots — one loading
 * screen everywhere in the app.
 */

export default function Loading() {
    return (
        <div className="route-loading" role="status" aria-label="Loading">
            <span className="pd-load-panel">
                <span className="pd-load-text">
                    <span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span>
                </span>
            </span>
        </div>
    );
}
