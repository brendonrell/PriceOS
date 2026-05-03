/*
 * app/collection/[slug]/page.tsx
 *
 * Collection page shell. Will be fully ported from collection.html
 * in D2 — at that point the proof shell below disappears and the
 * full hero (sim line 5099 .collection-hero) takes over with title,
 * stats grid, and .hero-group-2 .action-row.
 *
 * The Build #4 mint surface (MintButton / RoyaltyPreview) was ripped
 * in the Launch Cut Reset along with the rest of the wagmi/RainbowKit
 * stack — sim.html has no wallet plumbing, so the port doesn't either.
 * When the real hero ports in, the action-row slot fills with the
 * sim-faithful .btn-mint markup (sim line 5147–5159) and any wallet
 * gating happens out-of-band.
 */

export default function CollectionPage({
    params,
}: {
    params: { slug: string };
}) {
    return (
        <main className="proof">
            <h1 className="proof-logo">collection</h1>
            <p className="proof-status">
                <strong>/collection/{params.slug}</strong>
                <br />
                Route resolves. Port target for D2.
            </p>
        </main>
    );
}
