/*
 * app/collection/[slug]/page.tsx
 *
 * Collection page shell. Will be fully ported from collection.html
 * in D2 — at that point the proof shell below disappears and the
 * full hero (sim line 5099 .collection-hero) takes over with title,
 * stats grid, .hero-group-2 .action-row containing the mint CTA.
 *
 * Build #4 mount: until that port lands, MintButton + RoyaltyPreview
 * sit inside the proof shell so the wallet → mint → royalty surface
 * is testable on the live preview without waiting for D2. When the
 * real hero ports in, these two components move into the
 * .hero-group-2 .action-row slot (sim 5147–5159) — the components
 * themselves don't change, just their parent.
 *
 * Sim landmark for the eventual move:
 *   .hero-group-2 > .action-row > .btn-mint  (sim line 5148–5152)
 * Note: sim's .btn-mint uses rounded corners + CSS variables; the
 * Launch Cut MintButton overrides that with the Hothurt vocabulary
 * locked in Build #3 (no border-radius, height 32, #FF0055 bg).
 * Deliberate brand override — do not revert to sim's .btn-mint
 * style under "match sim" reasoning.
 */

import { MintButton } from '../../../components/mint/MintButton';
import { RoyaltyPreview } from '../../../components/mint/RoyaltyPreview';

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

            {/*
              * Build #4 mint surface. Temporary mount inside the
              * proof shell — moves into .hero-group-2 .action-row
              * once the full hero ports in (D2). Component contracts
              * stay stable across the move.
              */}
            <div
                className="proof-mint"
                style={{
                    marginTop: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 8,
                }}
            >
                <MintButton />
                <RoyaltyPreview />
            </div>
        </main>
    );
}
