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

/* Whole days between two ms instants (floored — a court counts full days). */
function daysBetween(a: number, b: number): number {
    return Math.max(0, Math.floor((b - a) / 86400000));
}
/** "41 days" / "1 day" / "under a day" — tenure prose. */
function fmtDays(d: number): string {
    if (d <= 0) return 'under a day';
    return d === 1 ? '1 day' : `${d} days`;
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

    /* ── The court's own arithmetic (depth pass, 2026-07-16) ──────────────
       Every number below is a pure function of the rows already in evidence
       — tenure per hand, each seller's flip against their own entry price,
       the findings, the parties' ledgers, the ruling. Nothing fetched,
       nothing invented; a strand without data simply isn't spoken. */
    const nowMs = Date.now();
    const keyOf = (handle: string | null, address: string | null) =>
        (address ?? handle ?? '').toLowerCase();

    /* Tenure per custody link — entry i's receiving hand keeps the piece
       until entry i+1 takes it; the last hand's clock is still running. */
    const tenureDays: (number | null)[] = custody.map((fe, i) => {
        const end = custody[i + 1]?.timestamp;
        return end != null ? daysBetween(fe.timestamp, end) : daysBetween(fe.timestamp, nowMs);
    });

    /* Each hand's entry price + moment, so a SALE can carry the seller's
       flip read (gain vs their own buy-in, days in hand). A hand-off (XFER)
       resets the basis to zero — the court prices only what was paid. */
    const basis = new Map<string, { price: number; ts: number }>();
    const flipByEventId = new Map<string, { gain: number | null; days: number }>();
    for (const fe of custody) {
        const to = keyOf(fe.star.toHandle, fe.star.toAddress);
        const from = keyOf(fe.star.fromHandle, fe.star.fromAddress);
        if (fe.type === 'SALE' && from) {
            const acq = basis.get(from);
            if (acq) {
                flipByEventId.set(fe.id, {
                    gain: acq.price > 0 && fe.price > 0 ? fe.price - acq.price : null,
                    days: daysBetween(acq.ts, fe.timestamp),
                });
            }
        }
        if (to) basis.set(to, { price: fe.type === 'XFER' ? 0 : fe.price, ts: fe.timestamp });
    }

    /* FINDINGS OF FACT — the numbered facts the file supports. */
    const hands = new Set(custody.map((fe) => keyOf(fe.star.toHandle, fe.star.toAddress)).filter(Boolean));
    const currentTenure = custody.length > 0 ? tenureDays[custody.length - 1] : null;
    let longestHold: { days: number; handle: string | null; address: string | null } | null = null;
    custody.forEach((fe, i) => {
        const d = tenureDays[i];
        if (d != null && (longestHold == null || d > longestHold.days)) {
            longestHold = { days: d, handle: fe.star.toHandle, address: fe.star.toAddress };
        }
    });
    let fastestFlip: { days: number; gain: number | null } | null = null;
    for (const f of flipByEventId.values()) {
        if (fastestFlip == null || f.days < fastestFlip.days) fastestFlip = f;
    }
    const lastSalePrice = sales.length > 0 ? sales[sales.length - 1].price : null;
    const appreciation = mint && mint.price > 0 && lastSalePrice != null && lastSalePrice > 0
        ? lastSalePrice / mint.price
        : null;
    const lastMotionMs = feedRows.reduce((m, fe) => Math.max(m, fe.timestamp), 0);
    const findings: ReactNode[] = [];
    if (hands.size > 0) {
        findings.push(<>The piece has known <b>{hands.size === 1 ? 'one hand' : `${hands.size} hands`}</b> since it was struck.</>);
    }
    if (currentTenure != null) {
        findings.push(<>{ownerLink} has held it <b>{fmtDays(currentTenure)}</b> and counting.</>);
    }
    if (longestHold != null && custody.length > 1) {
        const lh = longestHold as { days: number; handle: string | null; address: string | null };
        findings.push(<>The longest tenure on record — <b>{fmtDays(lh.days)}</b> — belongs to <Party handle={lh.handle} address={lh.address} />.</>);
    }
    if (fastestFlip != null) {
        const ff = fastestFlip as { days: number; gain: number | null };
        findings.push(<>The fastest turnaround was <b>{fmtDays(ff.days)}</b> in hand{
            ff.gain != null
                ? <>, out <b>{formatEth(Math.abs(ff.gain))} ETH {ff.gain >= 0 ? 'ahead' : 'behind'}</b></>
                : null
        }.</>);
    }
    if (appreciation != null && mint) {
        findings.push(<>It last changed hands at <b>{formatEth(lastSalePrice!)} ETH</b> — <b>{appreciation >= 10 ? appreciation.toFixed(0) : appreciation.toFixed(1)}×</b> its mint price of {formatEth(mint.price)} ETH.</>);
    }
    if (market?.listing && market?.floor && Number(market.floor) > 0) {
        const vsFloor = (Number(market.listing.price_eth) / Number(market.floor)) * 100;
        findings.push(<>The standing ask sits at <b>{Math.round(vsFloor)}%</b> of the collection floor.</>);
    }
    if (lastMotionMs > 0) {
        findings.push(<>Last motion of any kind entered the record <b>{fmtDays(daysBetween(lastMotionMs, nowMs))}</b> ago.</>);
    }

    /* EXHIBIT E — THE PARTIES: every named hand's own ledger on this piece. */
    interface PartyLedger {
        handle: string | null; address: string | null;
        acquired: number; paidEth: number; sold: number; receivedEth: number;
        passesIn: number; passesOut: number; listings: number;
    }
    const parties = new Map<string, PartyLedger>();
    const ledgerOf = (handle: string | null, address: string | null): PartyLedger | null => {
        const k = keyOf(handle, address);
        if (!k) return null;
        let p = parties.get(k);
        if (!p) { p = { handle, address, acquired: 0, paidEth: 0, sold: 0, receivedEth: 0, passesIn: 0, passesOut: 0, listings: 0 }; parties.set(k, p); }
        if (!p.handle && handle) p.handle = handle;
        return p;
    };
    for (const fe of feedRows) {
        if (fe.type === 'MINT' || fe.type === 'SALE') {
            const buyer = ledgerOf(fe.star.toHandle, fe.star.toAddress);
            if (buyer) { buyer.acquired += 1; buyer.paidEth += Math.max(0, fe.price); }
            if (fe.type === 'SALE') {
                const seller = ledgerOf(fe.star.fromHandle, fe.star.fromAddress);
                if (seller) { seller.sold += 1; seller.receivedEth += Math.max(0, fe.price); }
            }
        } else if (fe.type === 'XFER') {
            const inP = ledgerOf(fe.star.toHandle, fe.star.toAddress);
            if (inP) inP.passesIn += 1;
            const outP = ledgerOf(fe.star.fromHandle, fe.star.fromAddress);
            if (outP) outP.passesOut += 1;
        } else if (fe.type === 'LIST') {
            const lister = ledgerOf(fe.star.fromHandle, fe.star.fromAddress);
            if (lister) lister.listings += 1;
        }
    }
    const partyRows = [...parties.values()]
        .sort((a, b) => (b.paidEth + b.receivedEth) - (a.paidEth + a.receivedEth)
            || (b.acquired + b.sold + b.passesIn + b.passesOut) - (a.acquired + a.sold + a.passesIn + a.passesOut));
    const partySummary = (p: PartyLedger): string => {
        const bits: string[] = [];
        if (p.acquired > 0) bits.push(`in ×${p.acquired}${p.paidEth > 0 ? ` · ${formatEth(p.paidEth)} ETH paid` : ''}`);
        if (p.sold > 0) bits.push(`out ×${p.sold} · ${formatEth(p.receivedEth)} ETH received`);
        if (p.passesIn > 0 || p.passesOut > 0) bits.push(`passed ${p.passesIn > 0 && p.passesOut > 0 ? 'in + on' : p.passesIn > 0 ? 'in' : 'on'}`);
        if (p.listings > 0) bits.push(`listed ×${p.listings}`);
        const net = p.receivedEth - p.paidEth;
        if (p.sold > 0 && (p.paidEth > 0 || p.receivedEth > 0)) {
            bits.push(`net ${net >= 0 ? '+' : '−'}${formatEth(Math.abs(net))} ETH`);
        }
        return bits.join(' · ') || 'named in the record';
    };

    /* THE RULING — the court speaks from the facts on file. */
    let rulingHead: string;
    let rulingBody: string;
    if (market?.listing) {
        rulingHead = 'ON THE BLOCK';
        rulingBody = `The piece stands at market — ask ${formatEth(Number(market.listing.price_eth))} ETH${offers.length > 0 ? `, ${offers.length === 1 ? 'one claim' : `${offers.length} claims`} standing against it` : ''}.`;
    } else if (offers.length > 0) {
        rulingHead = 'UNDER CLAIM';
        rulingBody = `${offers.length === 1 ? 'One standing offer contests' : `${offers.length} standing offers contest`} a piece its holder has not brought to market.`;
    } else if (currentTenure != null && currentTenure >= 90) {
        rulingHead = 'TIGHTLY HELD';
        rulingBody = `${ownerName} has kept it ${fmtDays(currentTenure)} without a listing, an offer, or a motion of any kind.`;
    } else if (custody.length > 0) {
        rulingHead = 'AT REST';
        rulingBody = 'No ask, no claims — the piece sits with its holder and the record is quiet.';
    } else {
        rulingHead = 'NO CASE';
        rulingBody = 'Unminted — the court has nothing before it.';
    }

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
                                    /* Depth pass: each completed hand states its
                                       tenure; a sale states the seller's flip
                                       against their own entry price. */
                                    const ten = !last && tenureDays[i] != null
                                        ? <> Held {fmtDays(tenureDays[i]!)}.</>
                                        : null;
                                    const flip = flipByEventId.get(fe.id);
                                    const flipLine = flip
                                        ? <> {fmtDays(flip.days)} in hand{flip.gain != null
                                            ? <>, out <b>{formatEth(Math.abs(flip.gain))} ETH {flip.gain >= 0 ? 'ahead' : 'behind'}</b></>
                                            : null}.</>
                                        : null;
                                    if (fe.type === 'MINT') {
                                        return (
                                            <Entry key={fe.id} glyph={`✶${VS}`} title="MINTED" date={fmtDate(fe.timestamp)} last={last}>
                                                Struck to {to}{fe.price > 0 ? <> for <Price eth={fe.price} /></> : null}.{ten}
                                            </Entry>
                                        );
                                    }
                                    if (fe.type === 'SALE') {
                                        return (
                                            <Entry key={fe.id} glyph={`✶${VS}`} title="SOLD" date={fmtDate(fe.timestamp)} last={last}>
                                                Passed from {from} to {to} for <Price eth={fe.price} />.{flipLine}{ten}
                                            </Entry>
                                        );
                                    }
                                    return (
                                        <Entry key={fe.id} glyph={`✸${VS}`} title="TRANSFERRED" date={fmtDate(fe.timestamp)} last={last}>
                                            Handed from {from} to {to}.{ten}
                                        </Entry>
                                    );
                                })}
                                <div className="tribunal-verdict">
                                    <span>IN CUSTODY OF</span>
                                    <span>{ownerLink}{currentTenure != null ? ` · ${fmtDays(currentTenure)}` : ''}</span>
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

                    {/* EXHIBIT E — THE PARTIES (depth pass, 2026-07-16): every
                        named hand's own ledger on this piece, heaviest wallets
                        first. Same rows-of-record language as the verdict lines. */}
                    {partyRows.length > 0 && (
                        <Exhibit label="EXHIBIT E · THE PARTIES" glyph={`☻${VS}`}>
                            {partyRows.map((p) => (
                                <div className="tribunal-verdict tribunal-party-row" key={keyOf(p.handle, p.address)}>
                                    <span><Party handle={p.handle} address={p.address} /></span>
                                    <span>{partySummary(p)}</span>
                                </div>
                            ))}
                        </Exhibit>
                    )}

                    {/* FINDINGS OF FACT — the court's own arithmetic over the
                        evidence above; each ¶ is a checkable statement of the
                        rows already on this page. */}
                    {findings.length > 0 && (
                        <Exhibit label="FINDINGS OF FACT" glyph={`⚖${VS}`}>
                            {findings.map((f, i) => (
                                <div className="tribunal-finding" key={i}>
                                    <span className="tribunal-finding-no">¶{i + 1}</span>
                                    <p className="tribunal-finding-text">{f}</p>
                                </div>
                            ))}
                        </Exhibit>
                    )}

                    {/* THE RULING — the stamp that closes the file, derived
                        entirely from the record's current posture. */}
                    <div className="more-box-wrap">
                        <div className="tribunal-ruling">
                            <span className="tribunal-ruling-label">THE COURT FINDS THE PIECE</span>
                            <span className="tribunal-ruling-verdict">{rulingHead}</span>
                            <p className="tribunal-ruling-body">{rulingBody}</p>
                            <span className="tribunal-ruling-foot">CASE CONTINUED — THE LEDGER REMAINS OPEN</span>
                        </div>
                    </div>

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
