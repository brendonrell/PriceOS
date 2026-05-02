/*
 * Phase 1 shipped a random-gradient placeholder at / on indigo (#6366F1).
 * Step 1 of Phase 2 swaps that to a flat Hothurt red placeholder so the
 * deploy is visibly distinct from Phase 1 — proof step 1 landed correctly.
 *
 * The homepage gets replaced with the global feed in a later phase. Until
 * then this is a presence beacon (single period, top-left) and a tall
 * scrollable canvas so connect-menu debug has scroll headroom. Sim doesn't
 * have a homepage at all — it loads straight to the collection page — so
 * matching gutters here means matching .collection-hero's 40/20 padding.
 */

export const dynamic = 'force-dynamic';

export default function Home() {
    return (
        <div className="placeholder-shell">
            <div className="placeholder-dot">.</div>
        </div>
    );
}
