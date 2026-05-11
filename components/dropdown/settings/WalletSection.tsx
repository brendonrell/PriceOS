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
 * Collapsed ENS row (default):
 *   Flat flex-wrap of the first 3 pills (active pill bumped in if it sits
 *   beyond the cutoff) + the …more button.
 *
 * Expanded ENS row (after tapping …more):
 *   DOM reshapes to a single nowrap container holding a scroll viewport
 *   + the …hide button:
 *
 *     row.settings-ens-row.ens-expanded
 *       > .ens-scroll-viewport          (flex: 1 1 auto, overflow-x: auto)
 *           > .ens-scroll-stack         (inline-flex column, width: max-content)
 *               > .ens-scroll-row       (top half, flex-shrink: 0 nowrap)
 *               > .ens-scroll-row       (bottom half)
 *       > button.ens-more-btn (…hide)   (pinned right of viewport)
 *
 *   Pills split with `Math.ceil(N/2)` going to row 1, the rest to row 2 —
 *   biases row 1 by one when the count is odd, which keeps the first three
 *   (always-visible collapsed set) pinned to row 1 as long as there are 6+
 *   pills total. Pills keep natural widths via flex-shrink: 0 + nowrap;
 *   viewport scrolls horizontally as needed.
 *
 * S2 logged-out preview:
 *   The entire section is auth-gated when !isAuthed — every top-level
 *   child gets the `.auth-gated` class (opacity 0.4 + pointer-events:
 *   none + user-select: none). The wallet handle, ENS pills, copy /
 *   incognito / rpc-ping buttons, and PRICE balance toggle all become
 *   inert. The block stays visible so the logged-out user sees the
 *   shape of their future Settings panel.
 */

import { useEffect, useState } from 'react';
import {
    isIncognitoActive,
    subscribeIncognito,
    toggleIncognito as engineToggleIncognito,
} from '../../../lib/incognito/incognitoEngine';
import {
    isRpcActive,
    subscribeRpc,
    toggleRpcPing as engineToggleRpcPing,
} from '../../../lib/rpc/rpcEngine';
import { usePdNotifs } from '../../../lib/state/PdNotifsContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useAuth } from '../../../lib/state/AuthContext';

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
    // F2: ENS pills behave as a toggle — tapping the active pill again
    // deselects it (no active pill). Mirrors sim's selectENS, which removes
    // the active class from all pills, then re-adds it only if the click
    // target wasn't already active. So `activeEns` can be null.
    const [activeEns, setActiveEns] = useState<string | null>(ENS_PILLS[0]);
    const [ensExpanded, setEnsExpanded] = useState(false);
    const [balanceHidden, setBalanceHidden] = useState(false);

    // Build 33 — engine state mirrors. Both engines are session-only
    // singletons; on first hydrate they read `false`, then stay
    // subscribed for any toggle from this or another mount point.
    const [rpcActive, setRpcActive] = useState(false);
    const [incognitoActive, setIncognitoActive] = useState(false);
    useEffect(() => {
        setRpcActive(isRpcActive());
        const offRpc = subscribeRpc((s) => setRpcActive(s.active));
        setIncognitoActive(isIncognitoActive());
        const offInc = subscribeIncognito((s) => setIncognitoActive(s.active));
        return () => {
            offRpc();
            offInc();
        };
    }, []);

    const { showToast } = useToast();
    const { notifs, toggle: toggleNotif } = usePdNotifs();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const gatedClass = isAuthed ? '' : ' auth-gated';

    const handleRpcPing = () => {
        const nowActive = engineToggleRpcPing();
        showToast(nowActive ? 'RPC Ping ON' : 'RPC Ping OFF');
    };

    const handleIncognito = () => {
        const nowActive = engineToggleIncognito();
        // Turning Incognito ON deactivates Hammer (mutually exclusive
        // top-bar modes). Reverse direction is handled inside spell
        // logic; not our concern here.
        if (nowActive && notifs.spell_hammer) {
            toggleNotif('spell_hammer');
        }
        showToast(`Incognito Proxy ${nowActive ? 'ON' : 'OFF'}`);
    };

    const handleCopyWallet = async () => {
        // Brendon item 16 (chat A) — copy was wired to clipboard but
        // gave zero feedback ("the copy icon does nothing, or at least
        // it doesnt react"). Toast on success + on clipboard failure
        // so the user always sees the click registered.
        try {
            await navigator.clipboard?.writeText(
                '0x1234567890abcdef1234567890abcdef1234abcd'
            );
            showToast('Wallet Address Copied');
        } catch {
            showToast('Copy Failed');
        }
    };

    // Only show the …more affordance when there are more than 3 pills.
    const showMoreBtn = ENS_PILLS.length > 3;

    // Which pills are visible in the collapsed state — first 3 pills,
    // bumping the active one in if it's beyond the cutoff.
    const collapsedVisible = (() => {
        if (ENS_PILLS.length <= 3) return new Set(ENS_PILLS);
        const visible = new Set<string>();
        if (activeEns && ENS_PILLS.indexOf(activeEns) >= 0) visible.add(activeEns);
        for (const p of ENS_PILLS) {
            if (visible.size >= 3) break;
            visible.add(p);
        }
        return visible;
    })();

    // Expanded state pill split — first half → row 1, second half → row 2.
    // Math.ceil biases row 1 to one more pill when the count is odd.
    const splitIndex = Math.ceil(ENS_PILLS.length / 2);
    const pillsRow1 = ENS_PILLS.slice(0, splitIndex);
    const pillsRow2 = ENS_PILLS.slice(splitIndex);

    const renderPill = (ens: string) => {
        const isActive = ens === activeEns;
        return (
            <button
                key={ens}
                type="button"
                className={`pill-ens${isActive ? ' active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveEns((prev) => (prev === ens ? null : ens));
                }}
            >
                ↳ {ens}
            </button>
        );
    };

    const moreButton = showMoreBtn ? (
        <button
            type="button"
            className="ens-more-btn"
            onClick={(e) => {
                e.stopPropagation();
                setEnsExpanded((v) => !v);
            }}
            title={ensExpanded ? 'Collapse wallet ENS list' : 'Show all wallet ENS'}
        >
            {ensExpanded ? '…hide' : '…more'}
        </button>
    ) : null;

    return (
        <>
            <div className={`settings-header${gatedClass}`}>WALLET</div>

            <div
                className={`settings-wallet${gatedClass}`}
                onClick={handleCopyWallet}
                role="button"
                tabIndex={isAuthed ? 0 : -1}
                onKeyDown={(e) => {
                    if (!isAuthed) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCopyWallet();
                    }
                }}
                title="Copy wallet address"
            >
                {HANDLE} <span className="icon-copy">⧉{'\uFE0E'}</span>
                <span
                    className={`rpc-ping-btn incognito-btn${incognitoActive ? ' rpc-active' : ''}`}
                    id="incognitoProxyBtn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isAuthed) return;
                        handleIncognito();
                    }}
                    title="Incognito Proxy"
                    role="button"
                    tabIndex={isAuthed ? 0 : -1}
                >
                    ⚇{'\uFE0E'}
                </span>
                <span
                    className={`rpc-ping-btn${rpcActive ? ' rpc-active' : ''}`}
                    id="rpcPingBtn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isAuthed) return;
                        handleRpcPing();
                    }}
                    title="RPC Latency Ping"
                    role="button"
                    tabIndex={isAuthed ? 0 : -1}
                >
                    ⌁{'\uFE0E'}
                </span>
            </div>

            <div
                className={`settings-ens-row${ensExpanded ? ' ens-expanded' : ''}${gatedClass}`}
                id="walletEnsRow"
            >
                {ensExpanded ? (
                    <>
                        <div className="ens-scroll-viewport">
                            <div className="ens-scroll-stack">
                                <div className="ens-scroll-row">
                                    {pillsRow1.map(renderPill)}
                                </div>
                                <div className="ens-scroll-row">
                                    {pillsRow2.map(renderPill)}
                                </div>
                            </div>
                        </div>
                        {moreButton}
                    </>
                ) : (
                    <>
                        {ENS_PILLS.filter((p) => collapsedVisible.has(p)).map(renderPill)}
                        {moreButton}
                    </>
                )}
            </div>

            <div
                className={`settings-ens-row price-held-row${gatedClass}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthed) return;
                    setBalanceHidden((v) => !v);
                }}
                role="button"
                tabIndex={isAuthed ? 0 : -1}
                style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    /* Inline opacity beats class specificity — apply
                       the 0.6 secondary-info dim only when not gated,
                       so .auth-gated's 0.4 wins in the logged-out
                       preview. */
                    ...(isAuthed ? { opacity: 0.6 } : {}),
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
