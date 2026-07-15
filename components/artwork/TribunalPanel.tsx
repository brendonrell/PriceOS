'use client';

/*
 * TribunalPanel — TRIBUNAL, the Spell Book's case file for one Output.
 *
 * Spell-gated: the pill only appears on the Output's +More row when
 * spell_tribunal is on (toggled in the Spell Book). Opening it convenes the
 * full case file for the piece, assembled from the SAME data the page already
 * holds — the per-token event ledger (mint / list / sale / xfer) and the live
 * market (owner, standing offers, floor, volume) — so there is NO extra fetch.
 *
 * Nothing here is invented. The strands the ledger doesn't yet carry — offers
 * already withdrawn or refused, and the view history ("the full event index"
 * the spell is still waiting on) — are named ON THE RECORD as absent rather
 * than faked (Atlas: "gaps are surfaced explicitly, not hidden").
 *
 * Presentation rides the +More box language (more-section-header / more-box-
 * card, reused verbatim) so the exhibits sit identically to Attributes / Price
 * Story; the weighty docket header up top is the one bespoke surface. Glyphs
 * are the canonical market vocabulary (docs/GLYPHS.md): ✶ mint/sale · ✹ listed
 * · ✦ offer · ✸ transfer · ⌂ owner · ⚖ the tribunal mark · ∅ off the record.
 */

import type { ReactNode } from 'react';
import type { FeedEvent } from '../../lib/feed/feedRow';
import type { MarketOfferRow } from '../../lib/market/orderTypes';
import { formatEth } from '../../lib/format/eth';

const VS = '︎';

/* The slice of the Output market read the case file needs. Structural, so the
   page's fuller market object passes straight in. */
interface TribunalMarket {
    owner: string | null;
    owner_handle: string | null;
    listing: { price_eth: string; end_time: number | null } | null;
    offers: MarketOfferRow[];
    last_sale: string | null;
    floor: string | null;
    volume_eth: string | null;
}

interface Props {
    slug: string;
    id: number;
    projectName: string;
    feedRows: FeedEvent[];
    market: TribunalMarket | null;
    mintMs: number | null;
}

function shortAddr(a: string | null): string {
    if (!a || a.length < 10) return a || '—';
    return '0x' + a.slice(2, 6) + '…' + a.slice(-4);
}

/* "JUL 09 2026" — viewer-local, like every clock/date stamp on the page. */
function fmtDate(ms: number | null): string {
    if (!ms) return '—';
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = String(d.getDate()).padStart(2, '0');
    return `${mon} ${day} ${d.getFullYear()}`;
}

function expiresIn(endTime: number | null): string {
    if (!endTime) return 'open-ended';
    const s = endTime - Math.floor(Date.now() / 1000);
    if (s <= 0) return 'expired';
    if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m left`;
    if (s < 86400) return `${Math.floor(s / 3600)}h left`;
    return `${Math.floor(s / 86400)}d left`;
}

/* One named party in the file — links to their profile (handle, else the raw
   address). Full-strength, underlined so it reads as a party of record. */
function Party({ handle, address }: { handle: string | null; address: string | null }) {
    const name = handle ? `@${handle}` : shortAddr(address);
    const href = handle ? `/${handle}` : address ? `/${address}` : null;
    return href
        ? <a className="tribunal-party" href={href}>{name}</a>
        : <span className="tribunal-party">{name}</span>;
}

function Price({ eth }: { eth: number }) {
    return <span className="tribunal-price">{formatEth(eth)} ETH</span>;
}

/* A docket entry — glyph rail + heading (the act + its date) + the detail line.
   Kin to the Price Story chapter, but its own class so the two can diverge. */
function Entry({ glyph, title, date, last, children }: {
    glyph: string; title: string; date: string; last: boolean; children: ReactNode;
}) {
    return (
        <div className="tribunal-entry">
            <div className="tribunal-entry-rail">
                <span className="tribunal-entry-glyph">{glyph}</span>
                {!last && <span className="tribunal-entry-line" />}
            </div>
            <div className="tribunal-entry-body">
                <div className="tribunal-entry-head">
                    <span className="tribunal-entry-title">{title}</span>
                    <span className="tribunal-entry-date">{date}</span>
                </div>
                <p className="tribunal-entry-text">{children}</p>
            </div>
        </div>
    );
}

/* An exhibit — the reused +More section header + dashed box, so it aligns with
   every sibling tab; the header is un-faded (a heading meant to be read). */
function Exhibit({ label, glyph, children }: { label: string; glyph: string; children: ReactNode }) {
    return (
        <>
            <div className="more-section-header tribunal-xhead">
                <span className="tribunal-xglyph">{glyph}</span>
                <span>{label}</span>
            </div>
            <div className="more-box-wrap">
                <div className="more-box-card">{children}</div>
            </div>
        </>
    );
}

export default function TribunalPanel({ slug, id, projectName, feedRows, market, mintMs }: Props) {
    const ready = feedRows.length > 0 || market != null;

    // Chain of custody — mint + every hand-off, oldest first (LIST isn't a
    // custody change, so it's excluded here and gets its own exhibit).
    const custody = feedRows
        .filter((fe) => fe.type === 'MINT' || fe.type === 'SALE' || fe.type === 'XFER')
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);

    // The money — the mint price (if any) then every sale, oldest first.
    const mint = feedRows.find((fe) => fe.type === 'MINT') ?? null;
    const sales = feedRows.filter((fe) => fe.type === 'SALE').slice().sort((a, b) => a.timestamp - b.timestamp);
    const moneyRows: FeedEvent[] = [];
    if (mint && mint.price > 0) moneyRows.push(mint);
    moneyRows.push(...sales);
    const ath = Math.max(0, ...feedRows.filter((fe) => fe.type === 'MINT' || fe.type === 'SALE').map((fe) => fe.price));

    // On the block — every listing, oldest first.
    const listings = feedRows.filter((fe) => fe.type === 'LIST').slice().sort((a, b) => a.timestamp - b.timestamp);

    // Standing offers — the open book right now.
    const offers = market?.offers ?? [];

    const ownerName = market?.owner_handle ? `@${market.owner_handle}` : shortAddr(market?.owner ?? null);
    const ownerLink = <Party handle={market?.owner_handle ?? null} address={market?.owner ?? null} />;

    return (
        <div className="tribunal">
            {/* The docket crown — case caption, docket line, the charge. */}
            <div className="more-box-wrap">
                <div className="tribunal-docket">
                    <span className="tribunal-crest">{`⚖${VS}`}</span>
                    <span className="tribunal-docket-title">THE TRIBUNAL</span>
                    <span className="tribunal-caption">IN RE: {projectName} #{id}</span>
                    <span className="tribunal-docket-no">
                        DOCKET № {slug}-{id}{mintMs ? ` · CONVENED ${fmtDate(mintMs)}` : ''}
                    </span>
                    <div className="tribunal-rule" />
                    <p className="tribunal-charge">
                        Every hand it passed through, every price paid, every claim still
                        standing — entered into the record.
                    </p>
                </div>
            </div>

            {!ready ? (
                <div className="more-box-wrap">
                    <div className="more-box-card">
                        <div className="tribunal-empty">Assembling the case file…</div>
                    </div>
                </div>
            ) : (
                <>
                    {/* EXHIBIT A — CHAIN OF CUSTODY */}
                    <Exhibit label="EXHIBIT A · CHAIN OF CUSTODY" glyph={`⌂${VS}`}>
                        {custody.length === 0 ? (
                            <div className="tribunal-empty">Unminted — no custody on the record yet.</div>
                        ) : (
                            <>
                                {custody.map((fe, i) => {
                                    const last = i === custody.length - 1;
                                    const to = <Party handle={fe.star.toHandle} address={fe.star.toAddress} />;
                                    const from = <Party handle={fe.star.fromHandle} address={fe.star.fromAddress} />;
                                    if (fe.type === 'MINT') {
                                        return (
                                            <Entry key={fe.id} glyph={`✶${VS}`} title="MINTED" date={fmtDate(fe.timestamp)} last={last}>
                                                Struck to {to}{fe.price > 0 ? <> for <Price eth={fe.price} /></> : null}.
                                            </Entry>
                                        );
                                    }
                                    if (fe.type === 'SALE') {
                                        return (
                                            <Entry key={fe.id} glyph={`✶${VS}`} title="SOLD" date={fmtDate(fe.timestamp)} last={last}>
                                                Passed from {from} to {to} for <Price eth={fe.price} />.
                                            </Entry>
                                        );
                                    }
                                    return (
                                        <Entry key={fe.id} glyph={`✸${VS}`} title="TRANSFERRED" date={fmtDate(fe.timestamp)} last={last}>
                                            Handed from {from} to {to}.
                                        </Entry>
                                    );
                                })}
                                <div className="tribunal-verdict">
                                    <span>IN CUSTODY OF</span><span>{ownerLink}</span>
                                </div>
                            </>
                        )}
                    </Exhibit>

                    {/* EXHIBIT B — THE MONEY */}
                    <Exhibit label="EXHIBIT B · THE MONEY" glyph={`✶${VS}`}>
                        {moneyRows.length === 0 ? (
                            <div className="tribunal-empty">Not a wei has changed hands — held since mint.</div>
                        ) : (
                            <>
                                {moneyRows.map((fe, i) => {
                                    const last = i === moneyRows.length - 1;
                                    const who = <Party handle={fe.star.toHandle} address={fe.star.toAddress} />;
                                    return (
                                        <Entry
                                            key={fe.id}
                                            glyph={`✶${VS}`}
                                            title={fe.type === 'MINT' ? 'PRIMARY' : 'SECONDARY'}
                                            date={fmtDate(fe.timestamp)}
                                            last={last}
                                        >
                                            {who} paid <Price eth={fe.price} />
                                            {fe.type === 'MINT' ? ' at the mint' : ''}.
                                        </Entry>
                                    );
                                })}
                                <div className="tribunal-verdict">
                                    <span>TOTAL VOLUME</span>
                                    <span>{market?.volume_eth ? `${formatEth(Number(market.volume_eth))} ETH` : '—'}</span>
                                </div>
                                <div className="tribunal-verdict">
                                    <span>HIGH-WATER MARK</span>
                                    <span>{ath > 0 ? `${formatEth(ath)} ETH` : '—'}</span>
                                </div>
                            </>
                        )}
                    </Exhibit>

                    {/* EXHIBIT C — ON THE BLOCK */}
                    <Exhibit label="EXHIBIT C · ON THE BLOCK" glyph={`✹${VS}`}>
                        {listings.length === 0 && !market?.listing ? (
                            <div className="tribunal-empty">Never brought to market.</div>
                        ) : (
                            <>
                                {listings.map((fe, i) => {
                                    const last = i === listings.length - 1 && !market?.listing;
                                    const seller = <Party handle={fe.star.fromHandle} address={fe.star.fromAddress} />;
                                    return (
                                        <Entry key={fe.id} glyph={`✹${VS}`} title="LISTED" date={fmtDate(fe.timestamp)} last={last}>
                                            {seller} put it up{fe.price > 0 ? <> for <Price eth={fe.price} /></> : null}.
                                        </Entry>
                                    );
                                })}
                                {market?.listing && (
                                    <div className="tribunal-verdict">
                                        <span>STANDING ASK</span>
                                        <span>
                                            {formatEth(Number(market.listing.price_eth))} ETH
                                            {market.listing.end_time ? ` · ${expiresIn(market.listing.end_time)}` : ''}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </Exhibit>

                    {/* EXHIBIT D — STANDING OFFERS */}
                    <Exhibit label="EXHIBIT D · STANDING OFFERS" glyph={`✦${VS}`}>
                        {offers.length === 0 ? (
                            <div className="tribunal-empty">No offers on the table.</div>
                        ) : (
                            offers.map((o, i) => {
                                const scopeTag = o.scope === 'collection'
                                    ? ' on any piece'
                                    : o.scope === 'trait'
                                        ? ` on a trait (${o.criteria?.category ?? ''}: ${o.criteria?.value ?? ''})`
                                        : '';
                                return (
                                    <Entry
                                        key={o.id}
                                        glyph={`✦${VS}`}
                                        title="OFFER"
                                        date={expiresIn(o.end_time)}
                                        last={i === offers.length - 1}
                                    >
                                        <Party handle={o.bidder_handle ?? null} address={o.bidder_address} /> bid{' '}
                                        <span className="tribunal-price">{formatEth(Number(o.price_eth))} {o.currency === 'WETH' ? 'WETH' : 'ETH'}</span>
                                        {scopeTag}.
                                    </Entry>
                                );
                            })
                        )}
                    </Exhibit>

                    {/* OFF THE RECORD — the honest gaps (Atlas: surfaced, not hidden). */}
                    <Exhibit label="OFF THE RECORD" glyph={`∅${VS}`}>
                        <div className="tribunal-gap">
                            <b>The full event index isn&apos;t wired yet.</b> This file holds what the
                            ledger keeps — mints, sales, transfers, listings, and the offers standing
                            now. Not yet on the record: offers already withdrawn or refused, and the
                            view history. They&apos;re entered the moment the index lands.
                        </div>
                    </Exhibit>
                </>
            )}
        </div>
    );
}
