/*
 * Phase 1 shipped a random-gradient placeholder at / on indigo (#6366F1).
 * Step 1 of Phase 2 swaps that to a flat Hothurt red placeholder so the
 * deploy is visibly distinct from Phase 1 — proof step 1 landed correctly.
 *
 * The homepage gets replaced with the global feed in a later phase. Until
 * then this is a presence beacon and a quick visual diff target between
 * deploys.
 */

export const dynamic = 'force-dynamic';

export default function Home() {
    return (
        <div className="placeholder-shell">
            <div>
                <div className="placeholder-wordmark">PRICE&nbsp;DISCUSSION</div>
                <div className="placeholder-tagline">COLLECT · CHAT · DEBATE · PROFIT</div>
            </div>
        </div>
    );
}
