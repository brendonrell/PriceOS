/*
 * Route-level loading state — shown by the App Router the instant an
 * internal navigation starts, while the next page's server render is in
 * flight. Before this existed there was NO transition feedback at all:
 * a click on a slow render looked completely frozen (§9 — every wait
 * surface must show continuous motion).
 *
 * Three breathing dots, Courier, centered in the content area. The navbar
 * and footer stay mounted around it (this renders inside <main>).
 */

export default function Loading() {
    return (
        <div className="route-loading" role="status" aria-label="Loading">
            <span className="route-loading-dot" />
            <span className="route-loading-dot" />
            <span className="route-loading-dot" />
        </div>
    );
}
