'use client';

/*
 * components/chrome/TopBarConnect.tsx
 *
 * The launch-cut wallet connect surface. Three states, all sharing
 * the same Hothurt button vocabulary (no border-radius, Rubik Mono
 * One, white text on #FF0055):
 *
 *   1. Disconnected — "CONNECT" button. Click opens RainbowKit's
 *      connect modal.
 *   2. Connected — pill showing useEnsName() result if it resolves
 *      on mainnet, else truncated address (0xABCD…1234, 4+4 with
 *      VS15 ellipsis \u2026). Click opens RainbowKit's account
 *      modal (where Disconnect lives).
 *   3. Wrong network — "WRONG NETWORK" pill. Click opens chain
 *      modal so the user can switch to mainnet.
 *
 * Built on ConnectButton.Custom render-prop API rather than the
 * default ConnectButton — gives us full control over markup and
 * className so the button renders inside PD's brand discipline
 * instead of RainbowKit's default chrome.
 *
 * The `mounted` flag from the render prop guards against SSR
 * hydration mismatch — we render an opacity:0 placeholder until
 * the wallet provider is fully hydrated client-side.
 *
 * useEnsName runs inside the connected branch only (ConnectedPill
 * subcomponent) so the hook isn't called when there's no address.
 *
 * No PD-specific subdomain logic here — $PRICE.eth subdomain
 * resolution lands later. Standard wagmi useEnsName for now.
 */

import { type CSSProperties } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';

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

function truncateAddress(addr: string): string {
    if (!addr || addr.length < 10) return addr;
    // 4+4 with VS15 ellipsis (sim's PD glyph discipline — VS15
    // forces text-presentation so platform emoji rendering can't
    // hijack the ellipsis).
    return `${addr.slice(0, 6)}\u2026\uFE0E${addr.slice(-4)}`;
}

export function TopBarConnect() {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
            }) => {
                const ready = mounted && authenticationStatus !== 'loading';
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
                                        className="topbar-connect topbar-connect-cta"
                                        style={HOTHURT_BUTTON}
                                        onClick={openConnectModal}
                                        aria-label="Connect wallet"
                                    >
                                        CONNECT
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        type="button"
                                        className="topbar-connect topbar-connect-wrong"
                                        style={HOTHURT_BUTTON}
                                        onClick={openChainModal}
                                        aria-label="Wrong network — switch chain"
                                    >
                                        WRONG NETWORK
                                    </button>
                                );
                            }

                            return (
                                <ConnectedPill
                                    address={account.address}
                                    onClick={openAccountModal}
                                />
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}

function ConnectedPill({
    address,
    onClick,
}: {
    address: string;
    onClick: () => void;
}) {
    // ENS reverse-resolution always against mainnet, regardless of
    // the connected chain. (Will only be mainnet in launch cut, but
    // pinning the chainId makes intent explicit.)
    const { data: ensName } = useEnsName({
        address: address as `0x${string}`,
        chainId: mainnet.id,
    });

    const label = ensName ?? truncateAddress(address);

    return (
        <button
            type="button"
            className="topbar-connect topbar-connect-pill"
            style={HOTHURT_BUTTON}
            onClick={onClick}
            aria-label={`Wallet ${label} — open account`}
            title={address}
        >
            {label}
        </button>
    );
}
