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

import { useModal } from '../lib/state/ModalContext';
import { useGasData, type GasData } from '../lib/hooks/useGasData';

const VS15 = '\uFE0E';

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
    const isOpen = openModal?.name === 'gasTracker';
    const { data, error } = useGasData(isOpen);

    return (
        <div
            id="gasTrackerModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
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
                    {data ? (
                        <span className="gas-tracker-ethusd">
                            {' · ETH '}
                            {formatEthUsd(data.ethUsd)}
                        </span>
                    ) : null}
                </div>

                <div className="gas-tracker-cards">
                    <GasCard label="STANDARD" gwei={data?.standardGwei} ethUsd={data?.ethUsd} />
                    <GasCard label="FAST" gwei={data?.fastGwei} ethUsd={data?.ethUsd} />
                    <GasCard label="RAPID" gwei={data?.rapidGwei} ethUsd={data?.ethUsd} />
                </div>

                <div className="gas-tracker-footer">
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
            <div className="gas-tracker-card-gwei">
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
