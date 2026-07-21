'use client';

/*
 * GasTrackerModal
 *
 * Etherscan-style 3-card modal: STANDARD / FAST / RAPID at the 50th,
 * 75th, and 95th priority-fee percentiles (sourced from
 * eth_feeHistory over the last 5 blocks via /api/gas).
 *
 * Each card shows gwei (Courier) and USD cost (Courier, dimmed).
 * USD math = (gwei × 21000 × ethUsd) / 1e9 — 21k gas is the EVM-
 * native floor for an ETH transfer; the modal is a "what does sending
 * something right now cost" estimator, not a contract-call estimator.
 *
 * Header reads "GAS TRACKER · ETH $X" — the ETH price is pulled
 * from the same /api/gas batch via Chainlink, so the modal stays on
 * one fetch budget.
 *
 * Tier 1 lead-magnet behavior:
 *   Works fully logged-out. /api/gas has no auth gate; useGasData
 *   polls regardless of SIWE state. The point is for someone landing
 *   on the platform pre-connect to see a live tool and stick around.
 *
 * Polling lifecycle:
 *   useGasData(isOpen) ties the 12s poll to modal-open state. Closing
 *   the modal stops the timer (no background traffic, no leaked
 *   intervals); reopening fires an immediate refresh + restarts the
 *   interval.
 */

import { useEffect, useRef, useState } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useGasData, type GasData } from '../lib/hooks/useGasData';

const VS15 = '\uFE0E';

/* THE READ \u2014 the modal calls the moment, deterministically from the base
   fee. The state word gets the ALLCAPS (house toast rule); thresholds are
   editorial but the number beside them is always the real fee. */
function gasRead(baseFeeGwei: number): { state: string; line: string } {
    if (baseFeeGwei < 1) return { state: 'CHEAP', line: 'the chain is napping \u2014 send anything' };
    if (baseFeeGwei < 10) return { state: 'CALM', line: 'ordinary seas \u2014 mint at will' };
    if (baseFeeGwei < 30) return { state: 'BUSY', line: 'blocks are filling \u2014 time your move' };
    return { state: 'SURGE', line: 'someone lit the mempool \u2014 waiting is a strategy' };
}

/* Standard ETH transfer = 21,000 gas. USD = gwei × gas × ETH/USD / 1e9. */
const TRANSFER_GAS = 21000;

function usdCost(gwei: number, ethUsd: number): number {
    return (gwei * TRANSFER_GAS * ethUsd) / 1e9;
}

function formatGwei(gwei: number): string {
    /* Sub-10 gwei (today's normal range) reads better with two
       decimals; double-digit + only needs one. */
    return gwei < 10 ? gwei.toFixed(2) : gwei.toFixed(1);
}

function formatUsd(usd: number): string {
    return `$${usd.toFixed(2)}`;
}

function formatEthUsd(ethUsd: number): string {
    return `$${ethUsd.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

export default function GasTrackerModal() {
    const { openModal, close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('gasTracker');
    const { data, error } = useGasData(isOpen);

    /* THE PULSE — the base fee's recent heartbeat, accumulated while the
       modal is open (one bar per poll, newest rightmost). Real reads only,
       reset each open, capped to the last 24. */
    const [pulse, setPulse] = useState<number[]>([]);
    const lastStamp = useRef(0);
    useEffect(() => {
        if (!isOpen) { setPulse([]); lastStamp.current = 0; return; }
        if (!data || data.fetchedAt === lastStamp.current) return;
        const firstLoad = lastStamp.current === 0;
        lastStamp.current = data.fetchedAt;
        setPulse((p) =>
            /* First read of a fresh open: seed with the recent on-chain base-fee
               history (same fetch, no extra cost) so the pulse is populated the
               instant the modal opens. Every later poll appends one live beat. */
            firstLoad && data.baseFeeSeriesGwei?.length
                ? data.baseFeeSeriesGwei.slice(-24)
                : [...p.slice(-23), data.baseFeeGwei]
        );
    }, [isOpen, data]);
    const pulseMax = Math.max(0.0001, ...pulse);
    const pulseMin = Math.min(...(pulse.length ? pulse : [0]));

    const read = data ? gasRead(data.baseFeeGwei) : null;

    return (
        <div
            id="gasTrackerModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            data-stack-top={isTopStacked || undefined}
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                title="Close"
            >
                {`\u00D7${VS15}`}
            </div>

            <div className="modal-info gas-tracker-info">
                <div className="modal-title gas-tracker-title">
                    GAS TRACKER
                    {data && <span className="gas-tracker-ethusd">{' · ETH'}</span>}
                    {data && <span className="gas-tracker-price">{formatEthUsd(data.ethUsd)}</span>}
                </div>

                {/* THE READ — the moment, called plainly. */}
                {read && (
                    <div className="gas-tracker-read" key={read.state}>
                        THE READ: <span className="gas-tracker-read-state">{read.state}</span> — {read.line}
                    </div>
                )}

                <div className="gas-tracker-cards">
                    <GasCard label="STANDARD" gwei={data?.standardGwei} ethUsd={data?.ethUsd} />
                    <GasCard label="FAST" gwei={data?.fastGwei} ethUsd={data?.ethUsd} />
                    <GasCard label="RAPID" gwei={data?.rapidGwei} ethUsd={data?.ethUsd} />
                </div>

                {/* THE PULSE — one bar per live read while you watch; the
                    newest beat stands full-strength at the right. */}
                {pulse.length > 1 && (
                    <div className="gas-tracker-pulse" aria-label="Base fee, recent reads">
                        {pulse.map((v, i) => {
                            const span = pulseMax - pulseMin;
                            const h = span > 0 ? 18 + ((v - pulseMin) / span) * 82 : 60;
                            return (
                                <span
                                    key={i}
                                    className={`gas-tracker-pulse-bar${i === pulse.length - 1 ? ' now' : ''}`}
                                    style={{ height: `${Math.round(h)}%` }}
                                    title={`${formatGwei(v)} gwei`}
                                />
                            );
                        })}
                        <span className="gas-tracker-pulse-label">GAS PULSE · BASE FEE, LIVE</span>
                    </div>
                )}

                <div
                    className="gas-tracker-footer"
                    key={data ? data.blockNumber : 'waiting'}
                >
                    {error
                        ? `Error: ${error}`
                        : data
                          ? `Block #${data.blockNumber.toLocaleString()} · base ${formatGwei(data.baseFeeGwei)} gwei`
                          : 'Fetching…'}
                </div>
            </div>
        </div>
    );
}

interface GasCardProps {
    label: string;
    gwei: number | undefined;
    ethUsd: number | undefined;
}

function GasCard({ label, gwei, ethUsd }: GasCardProps) {
    const usd =
        gwei !== undefined && ethUsd !== undefined ? usdCost(gwei, ethUsd) : null;

    return (
        <div className="gas-tracker-card">
            <div className="gas-tracker-card-label">{label}</div>
            {/* Keyed by value: a fresh read remounts the number, and the
                remount IS the pop — the price visibly ticks alive. */}
            <div
                className={`gas-tracker-card-gwei${gwei !== undefined ? ' tick' : ' waiting'}`}
                key={gwei ?? 'waiting'}
            >
                {gwei !== undefined ? formatGwei(gwei) : '—'}
            </div>
            <div className="gas-tracker-card-gwei-unit">gwei</div>
            <div className="gas-tracker-card-usd">
                {usd !== null ? formatUsd(usd) : '—'}
            </div>
        </div>
    );
}

/* GasData type re-export keeps consumers from needing to dual-import
   the type alongside the hook in places where this component is the
   primary entry. Not currently used anywhere but cheap to expose. */
export type { GasData };
