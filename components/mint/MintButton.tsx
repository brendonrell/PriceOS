'use client';

/*
 * components/mint/MintButton.tsx
 *
 * The collection-page primary mint CTA. Three states share the
 * Hothurt button vocabulary established by TopBarConnect (no
 * border-radius, height 32, Rubik Mono One, white on #FF0055):
 *
 *   1. Disconnected — "CONNECT TO MINT". Click opens RainbowKit's
 *      connect modal. Same flow as TopBarConnect's CONNECT pill,
 *      but with mint-specific copy so the user knows what the
 *      connection is *for*. Once they connect, the same render
 *      hands off to the ready branch — no second tap needed.
 *   2. Wrong-network — "WRONG NETWORK". Click opens chain modal.
 *   3. Ready — "MINT — 0.014 ETH" (or live priceWei). Click
 *      sends mint() through useMint. While the tx is in flight
 *      the copy steps through CONFIRMING… → MINTING…, button
 *      disabled. On success, fire a toast and reset.
 *
 * Built on ConnectButton.Custom for the disconnected /
 * wrong-network branches — same render-prop pattern as
 * TopBarConnect, so the wallet-state plumbing is consistent
 * across both surfaces. Avoids re-implementing connect-modal /
 * chain-modal openers locally.
 *
 * HOTHURT_BUTTON style is a deliberate duplicate of
 * TopBarConnect's constant. Centralizing into a shared module
 * is tempting but premature — Build #3 locked TopBarConnect's
 * style, and any shared module would invite drift between the
 * two surfaces. Once Launch Cut stabilizes (post Build #5+),
 * lift to a single source.
 *
 * The width is intentionally not fixed — the button grows with
 * its label so "CONFIRMING…" doesn't clip. action-row in sim
 * uses flex-wrap, which mirrors here once the hero ports in.
 */

import { type CSSProperties, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import { useMintInfo } from '../../lib/hooks/useMintInfo';
import { useMint } from '../../lib/hooks/useMint';
import { useToast } from '../../lib/state/ToastContext';

const HOTHURT_BUTTON: CSSProperties = {
    background: '#FF0055',
    color: '#ffffff',
    border: 'none',
    borderRadius: 0,
    height: 32,
    padding: '0 14px',
    fontFamily: "'Rubik Mono One', sans-serif",
    fontSize: 12,
    fontWeight: 'normal',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s',
    WebkitTapHighlightColor: 'transparent',
};

const HOTHURT_DISABLED: CSSProperties = {
    ...HOTHURT_BUTTON,
    cursor: 'default',
    opacity: 0.6,
};

/**
 * Format a wei value as "0.014" — three decimals, trailing-zero
 * trimmed. Sim's price label is "0.014 ETH" via Courier; here we
 * keep Rubik Mono One throughout the button so the price reads
 * as part of the label, not a separate field.
 */
function formatPrice(wei: bigint): string {
    const eth = Number(formatEther(wei));
    if (!isFinite(eth)) return '—';
    // Three decimals max; strip trailing zeros so "0.014" reads
    // clean and "0.020" becomes "0.02". Avoids "0.0140" noise.
    return eth.toFixed(3).replace(/\.?0+$/, '') || '0';
}

export function MintButton() {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
            }) => {
                const ready =
                    mounted && authenticationStatus !== 'loading';
                const connected =
                    ready &&
                    !!account &&
                    !!chain &&
                    (!authenticationStatus ||
                        authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        type="button"
                                        className="mint-cta mint-cta-connect"
                                        style={HOTHURT_BUTTON}
                                        onClick={openConnectModal}
                                        aria-label="Connect wallet to mint"
                                    >
                                        CONNECT TO MINT
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        type="button"
                                        className="mint-cta mint-cta-wrong"
                                        style={HOTHURT_BUTTON}
                                        onClick={openChainModal}
                                        aria-label="Wrong network — switch chain"
                                    >
                                        WRONG NETWORK
                                    </button>
                                );
                            }

                            return <ReadyMintButton />;
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}

/**
 * Connected + on-mainnet branch. Split into its own component so
 * useMint / useMintInfo only run when a wallet is actually
 * connected — avoids spurious RPC calls before the user opts in.
 */
function ReadyMintButton() {
    const { priceWei, ready: infoReady } = useMintInfo();
    const { mint, status, error, reset } = useMint();
    const { showToast } = useToast();

    // Toast on success, then reset internal state so a second
    // mint can be initiated without a page reload. We don't
    // toast on error here — the error message renders inline
    // below the button so it's tied to the action visually.
    useEffect(() => {
        if (status === 'success') {
            showToast('Minted.');
            // Small delay so the toast and the button copy don't
            // both flash back to "MINT —" simultaneously; gives
            // the user a beat to register what just happened.
            const t = setTimeout(reset, 1200);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [status, showToast, reset]);

    const inFlight = status === 'confirming' || status === 'pending';
    const disabled = inFlight || !infoReady || !priceWei;

    let label: string;
    if (status === 'confirming') label = 'CONFIRMING…';
    else if (status === 'pending') label = 'MINTING…';
    else if (!infoReady || !priceWei) label = 'MINT — 0.014 ETH';
    else label = `MINT — ${formatPrice(priceWei)} ETH`;

    return (
        <div
            className="mint-cta-wrap"
            style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}
        >
            <button
                type="button"
                className="mint-cta mint-cta-ready"
                style={disabled ? HOTHURT_DISABLED : HOTHURT_BUTTON}
                onClick={() => priceWei && mint(priceWei)}
                disabled={disabled}
                aria-label={label}
            >
                {label}
            </button>
            {error ? (
                <span
                    className="mint-cta-error"
                    style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: 11,
                        color: '#FF0055',
                        opacity: 0.9,
                    }}
                >
                    {error}
                </span>
            ) : null}
        </div>
    );
}
