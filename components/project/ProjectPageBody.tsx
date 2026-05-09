'use client';

/*
 * ProjectPageBody
 *
 * Inner body of the project page (`/art/{slug}`). PriceOSShell already
 * wraps the route's children in <main> via app/layout.tsx, so this
 * component emits the hero <section> + gallery <section> directly —
 * no nested <main> tag.
 *
 * V0 scope (this build):
 *   - Header lockup: .collection-title (title + date) + .stats-row
 *     (editions / volume / people) + .action-row (BUY price strip).
 *     Title + total editions + floor read from ProjectContext;
 *     volume + owners + minted-count are sim's mock display values
 *     until the indexer ships.
 *   - Gallery: <section id="gallery"> with one <ArtworkCard /> per id
 *     in [1..totalEditions]. Card click opens OutputPreview via
 *     useModal().open('output', id) — wiring already lives inside
 *     ArtworkCard, so this page just mounts the consumers.
 *
 * Out of v0 scope (own ships):
 *   - Showcase / Artworks / + More tabs (.profile-tabs-row, sim ~5168)
 *   - Traits UI (.traits-ui, sim ~5174)
 *   - Sort bar (.sort-bar)
 *   - Search row (.search-row)
 *   - Real BUY → mint flow (button is a static visual; no onClick)
 *   - Stats Row 2 (your-relationship row — depends on persona/wallet,
 *     hidden on logged-out anyway via globals.css body.persona-default)
 *   - Breadcrumb sticker pick (page-level random draw not wired yet)
 *   - Burn-pick / showcase-pick passes (depend on tabs / spell book)
 *
 * Sim refs:
 *   .collection-hero ........ sim 5099
 *   .hero-group-1 ........... sim 5100
 *   .collection-title ....... sim 5101
 *   .stats-grid ............. sim 5119
 *   .stats-row .............. sim 5121
 *   .hero-group-2 ........... sim 5147
 *   .action-row ............. sim 5148
 *   .btn-mint / .mint-price . sim 5149-5152
 *   #gallery ................ sim 5193
 *   render loop ............. sim 7944
 */

import ArtworkCard from '../ArtworkCard';
import { useProject } from '../../lib/state/ProjectContext';

/* Sim 5122-5124 mock display values. Real numbers come from the
   indexer once that workstream lands; until then these match sim
   verbatim so the visual surface is byte-for-byte identical to the
   prototype. */
const MOCK_MINTED = 198;
const MOCK_VOLUME = '14 VOL';
const MOCK_OWNERS = '67 PPL';
const MOCK_DATE = 'AUG 14 2026';

function formatFloor(eth: number): string {
    return `(${eth.toFixed(3)} ETH)`;
}

export default function ProjectPageBody() {
    const { title, totalEditions, floorEth } = useProject();

    /* Build the id array once per render. totalEditions is stable for
       the session (ProjectProvider sets it at mount), so React's
       key={id} prop on ArtworkCard keeps the gallery's reconciler
       happy across re-renders driven by upstream context (modal open,
       theme change, etc.). */
    const ids: number[] = [];
    for (let i = 1; i <= totalEditions; i++) ids.push(i);

    return (
        <>
            <section className="collection-hero" aria-label="Collection Info">
                <div className="hero-group-1">
                    <h1 className="collection-title">
                        <span>{title}</span>
                        <span className="collection-date">{MOCK_DATE}</span>
                    </h1>

                    <div className="stats-grid">
                        <div className="hero-line stats-row">
                            <span
                                className="stat-item"
                                title="Editions Minted / Total Supply"
                            >
                                <span className="stat-icon stat-icon-box">
                                    {'\u2B1A\uFE0E'}
                                </span>{' '}
                                <span className="stat-val">
                                    {MOCK_MINTED}/{totalEditions}
                                </span>
                            </span>
                            <span className="stat-item stat-item-vol">
                                <span className="stat-icon-eth">
                                    {'\u27E0\uFE0E'}
                                </span>{' '}
                                <span className="stat-val stat-val-vol">
                                    {MOCK_VOLUME}
                                </span>
                            </span>
                            <span className="stat-item stat-item-owners">
                                <span className="stat-icon stat-icon-owners">
                                    {'\u2317\uFE0E'}
                                </span>{' '}
                                <span className="stat-val stat-val-owners">
                                    {MOCK_OWNERS}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hero-group-2">
                    <div className="action-row">
                        {/* Static price-strip visual. Real BUY → mint flow
                            is its own ship per the locked Launch Cut
                            sequence — no onClick here on purpose. */}
                        <button
                            type="button"
                            className="btn-mint"
                            title="Buy the Lowest Listed Edition"
                        >
                            <span className="mint-lbl">BUY</span>
                            <span className="mint-price">
                                {formatFloor(floorEth)}
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            <section id="gallery" aria-label="Gallery">
                {ids.map((id) => (
                    <ArtworkCard key={id} id={id} />
                ))}
            </section>
        </>
    );
}
