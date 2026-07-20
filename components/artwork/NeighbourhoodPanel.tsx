'use client';

/*
 * NeighbourhoodPanel — the artwork page's +More › Neighbourhood: THE TASTE
 * NEIGHBOURHOOD this piece lives in (the Taste Cluster idea — cultural
 * mapping, not recommendation). One section per wallet around the piece
 * (keeper · minter · past hands, from the real ledger), each a grid of the
 * OTHER pieces that wallet holds. Rides the character sheet's own
 * .attr-group anatomy and the profile lists' OutputThumb painter — nothing
 * hand-rolled.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OutputThumb from '../profile/OutputThumb';
import { getProject } from '../../lib/project/registry';
import { shortAddress } from '../../lib/project/projectAddress';
import type { NeighbourhoodResponse, NeighbourWallet } from '../../app/api/output/[id]/neighbourhood/route';

const VS15 = '︎';

/** "Prisms #7" — the app's piece-naming convention. */
function pieceLabel(slug: string, id: number): string {
    const title = getProject(slug)?.displayName ?? slug.toUpperCase();
    return `${title.charAt(0)}${title.slice(1).toLowerCase()} #${id}`;
}

function walletName(w: NeighbourWallet): string {
    return w.handle ? `@${w.handle}` : shortAddress(w.address);
}

export default function NeighbourhoodPanel({ slug, id }: { slug: string; id: number }) {
    const router = useRouter();
    const [data, setData] = useState<NeighbourhoodResponse | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let gone = false;
        setData(null);
        setFailed(false);
        fetch(`/api/output/${slug}-${id}/neighbourhood`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: NeighbourhoodResponse) => { if (!gone) setData(j); })
            .catch(() => { if (!gone) setFailed(true); });
        return () => { gone = true; };
    }, [slug, id]);

    return (
        <>
            <div className="more-section-header">NEIGHBOURHOOD</div>
            <div className="ach-section nbhd-section">
                {!data && !failed && <div className="nbhd-note">Walking the block<span className="nbhd-ellipsis">…</span></div>}
                {failed && <div className="nbhd-note">The neighbourhood is unreachable right now.</div>}
                {data && data.wallets.length === 0 && (
                    <div className="nbhd-note">UNMINTED — no wallets around this piece yet.</div>
                )}
                {data && data.wallets.map((w) => (
                    <section className="attr-group" key={w.address} aria-label={`${walletName(w)} — ${w.relation}`}>
                        <div className="attr-group-head">
                            <span className="attr-group-name nbhd-head-name">
                                <a
                                    href={`/${w.handle ?? w.address}`}
                                    onClick={(e) => { e.preventDefault(); router.push(`/${w.handle ?? w.address}`); }}
                                >
                                    {walletName(w)}
                                </a>
                                {' · '}{w.relation}
                            </span>
                            <span className="attr-group-count">{w.held} HELD</span>
                        </div>
                        {w.pieces.length === 0 ? (
                            <div className="nbhd-note">Holds nothing else — this piece is the whole collection.</div>
                        ) : (
                            <div className="nbhd-grid">
                                {w.pieces.map((p) => (
                                    <a
                                        key={`${p.slug}-${p.token_id}`}
                                        className="nbhd-tile"
                                        href={`/art/${p.slug}/${p.token_id}`}
                                        title={pieceLabel(p.slug, p.token_id)}
                                        onClick={(e) => { e.preventDefault(); router.push(`/art/${p.slug}/${p.token_id}`); }}
                                    >
                                        <OutputThumb slug={p.slug} id={p.token_id} size={92} crop />
                                        <span className="nbhd-tile-label">{pieceLabel(p.slug, p.token_id)}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </section>
                ))}
                {data && data.wallets.length > 0 && (
                    <div className="nbhd-footnote">
                        {`⬚${VS15} The wallets around this piece and what else they keep — the taste neighbourhood, from the real ledger.`}
                    </div>
                )}
            </div>
        </>
    );
}
