'use client';

/*
 * WalletSection
 *
 * Settings panel section 1 — the Wallet block.
 *
 * Layout (top to bottom):
 *   - WALLET header
 *   - 0x1234...abcd handle | copy ⧉ | incognito ⚇ | rpc ping ⌁
 *   - ENS pills row: 3 visible by default, …more reveals the full list
 *   - 17,450.54 PRICE | balance-toggle eyeball
 *
 * Step 4 ships:
 *   - Tap handle → copies to clipboard, shows toast (toast wired in step 6)
 *   - ENS pill click → marks that pill active (single-active radio behavior)
 *   - …more / …hide → toggles visibility of pills 4+
 *   - Balance toggle → swaps the number for ***
 *
 * Step 4 defers:
 *   - RPC ping interaction (would show latency popover)
 *   - Incognito proxy interaction
 *   - The two-row horizontal-scroll expanded view (the sim's full
 *     ens-scroll-stack with split rows). Our expand just shows all
 *     pills wrapped — same data visible, same active pill, simpler
 *     internals. The full split-and-scroll behavior can land later
 *     once the wallet ENS list is real.
 */

import { useState } from 'react';

const HANDLE = '0x1234...abcd';

const ENS_PILLS = [
    'pricediscussion.eth',
    'brendon.eth',
    'brendon.$PRICE.eth',
    'brendonrell.$PRICE.eth',
    'pd.$PRICE.eth',
    'pricediscussion.$PRICE.eth',
    'founder.$PRICE.eth',
    '22.$PRICE.eth',
];

const INITIAL_BALANCE = '17,450.54';

export function WalletSection() {
    const [activeEns, setActiveEns] = useState<string>(ENS_PILLS[0]);
    const [ensExpanded, setEnsExpanded] = useState(false);
    const [balanceHidden, setBalanceHidden] = useState(false);

    const handleCopyWallet = async () => {
        try {
            await navigator.clipboard?.writeText('0x1234567890abcdef1234567890abcdef1234abcd');
        } catch {
            // ignore
        }
    };

    // Only show the …more affordance when there are more than 3 pills.
    const showMoreBtn = ENS_PILLS.length > 3;
    // Which pills are visible in the collapsed state — first 3 pills,
    // bumping the active one in if it's beyond the cutoff.
    const collapsedVisible = (() => {
        if (ENS_PILLS.length <= 3) return new Set(ENS_PILLS);
        const visible = new Set<string>();
        if (ENS_PILLS.indexOf(activeEns) >= 0) visible.add(activeEns);
        for (const p of ENS_PILLS) {
            if (visible.size >= 3) break;
            visible.add(p);
        }
        return visible;
    })();

    return (
        <>
            <div className="settings-header">WALLET</div>

            <div
                className="settings-wallet"
                onClick={handleCopyWallet}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCopyWallet();
                    }
                }}
                title="Copy wallet address"
            >
                {HANDLE} <span className="icon-copy">⧉{'\uFE0E'}</span>
                <span
                    className="rpc-ping-btn incognito-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        // step 5+: open incognito proxy panel
                    }}
                    title="Incognito Proxy"
                    role="button"
                    tabIndex={0}
                >
                    ⚇{'\uFE0E'}
                </span>
                <span
                    className="rpc-ping-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        // step 5+: trigger RPC latency ping
                    }}
                    title="RPC Latency Ping"
                    role="button"
                    tabIndex={0}
                >
                    ⌁{'\uFE0E'}
                </span>
            </div>

            <div
                className={`settings-ens-row${ensExpanded ? ' ens-expanded' : ''}`}
                id="walletEnsRow"
            >
                {ENS_PILLS.map((ens) => {
                    const visible = ensExpanded || collapsedVisible.has(ens);
                    if (!visible) return null;
                    const isActive = ens === activeEns;
                    return (
                        <button
                            key={ens}
                            type="button"
                            className={`pill-ens${isActive ? ' active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveEns(ens);
                            }}
                        >
                            ↳ {ens}
                        </button>
                    );
                })}

                {showMoreBtn && (
                    <button
                        type="button"
                        className="ens-more-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEnsExpanded((v) => !v);
                        }}
                        title={ensExpanded ? 'Hide extra ENS' : 'Show all wallet ENS'}
                    >
                        {ensExpanded ? '…hide' : '…more'}
                    </button>
                )}
            </div>

            <div
                className="settings-ens-row price-held-row"
                onClick={(e) => {
                    e.stopPropagation();
                    setBalanceHidden((v) => !v);
                }}
                role="button"
                tabIndex={0}
                style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    opacity: 0.6,
                    fontSize: 11,
                    marginTop: -6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
                title="Toggle balance visibility"
            >
                <span id="priceBalanceText">
                    {balanceHidden ? '***' : INITIAL_BALANCE}
                </span>{' '}
                PRICE
                <span
                    className="balance-toggle-icon"
                    style={{
                        fontSize: 14,
                        position: 'relative',
                        top: -1,
                        opacity: 0.8,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {balanceHidden ? '⊘\uFE0E' : '⊚\uFE0E'}
                </span>
            </div>
        </>
    );
}
