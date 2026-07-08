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
 *   Flat flex-wrap row — up to 3 pills render as direct children, followed
 *   by …more inline. Active pill is always first; rest are alphabetical.
 *   No wrapper div needed: we render only the visible set so there is
 *   nothing to clip.
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
 * ENS names display:
 *   Subdomains (any ENS with more than 2 dot-separated parts) render the
 *   sub-part in italic: *brendon*.dcl.eth. Top-level and second-level
 *   names (name.eth) render plainly.
 *
 * ENS data source:
 *   Loaded by ensEngine (lib/engines/ensEngine.ts) which is triggered from
 *   WalletProviders on siweAddress change — so data is ready before the
 *   settings panel ever opens. WalletSection subscribes to the engine;
 *   no fetch happens inside this component.
 *
 * S2 logged-out preview:
 *   The entire section is auth-gated when !isAuthed — every top-level
 *   child gets the `.auth-gated` class (opacity 0.4 + pointer-events:
 *   none + user-select: none). The wallet handle, ENS pills, copy /
 *   incognito / rpc-ping buttons, and PRICE balance toggle all become
 *   inert. The block stays visible so the logged-out user sees the
 *   shape of their future Settings panel.
 *
 * S3 live wallet data:
 *   When isAuthed, the displayed values pull from live sources rather
 *   than hardcoded mocks:
 *     - handle      → shortAddr(siweAddress)
 *     - ensPills    → ensEngine (subgraph query, localStorage-cached)
 *     - balance     → usePriceBalance(siweAddress).balanceFormatted
 *                     (one-shot per address per Tier 2 cost arch — no
 *                     polling on per-user data)
 *   When !isAuthed, the PLACEHOLDER_* constants fill in so the S2
 *   gated preview keeps its full shape under the auth-gated class.
 */

import React, { useEffect, useRef, useState } from 'react';
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
import { usePriceBalance } from '../../../lib/hooks/usePriceBalance';
import { getEnsNames, subscribeEnsNames } from '../../../lib/engines/ensEngine';
import { fetchMe } from '../../../lib/wallet/accountClient';
import { pushState } from '../../../lib/state/userState';
import { useDragScroll } from '../../../lib/hooks/useDragScroll';
import { FiatCurrencyPicker } from './FiatCurrencyPicker';

/* Placeholder values shown while !isAuthed so the S2 logged-out preview
   keeps its full shape (opacity 0.4 + pointer-events: none — the gating
   class handles the inertness). When authed, these are replaced with
   live data from siweAddress / ensEngine / usePriceBalance. */
const PLACEHOLDER_HANDLE = '0x1234...abcd';
const PLACEHOLDER_FULL_ADDRESS = '0x1234567890abcdef1234567890abcdef1234abcd';
const PLACEHOLDER_ENS_PILLS = ['name.eth', 'name.pricediscussion.eth'];
const PLACEHOLDER_BALANCE = '17,450.54';

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Render an ENS name with its subdomain part in italic.
 * brendon.dcl.eth → <em>brendon</em>.dcl.eth
 * name.eth        → name.eth  (no change — only 2 parts)
 */
function ensLabel(ens: string): React.ReactNode {
    const parts = ens.split('.');
    if (parts.length <= 2) return ens;
    const sub = parts.slice(0, parts.length - 2).join('.');
    const base = parts.slice(parts.length - 2).join('.');
    return <><em>{sub}</em>.{base}</>;
}

export function WalletSection() {
    const { showToast } = useToast();
    const { notifs, toggle: toggleNotif } = usePdNotifs();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const gatedClass = isAuthed ? '' : ' auth-gated';

    /* ENS names from engine. Engine is fed by WalletProviders on
       siweAddress change so data is ready before this component mounts.
       useState initialiser reads current engine state for instant warm
       display; subscribeEnsNames keeps in sync if a background fetch
       completes after mount. */
    const [ensNames, setEnsNames] = useState<string[]>(() => getEnsNames());
    useEffect(() => {
        setEnsNames(getEnsNames());
        return subscribeEnsNames((names) => setEnsNames(names));
    }, []);

    const priceBalance = usePriceBalance(siweAddress);

    const handle = isAuthed && siweAddress
        ? shortAddr(siweAddress)
        : PLACEHOLDER_HANDLE;
    const fullAddress = isAuthed && siweAddress
        ? siweAddress
        : PLACEHOLDER_FULL_ADDRESS;

    const rawPills: string[] = isAuthed ? ensNames : PLACEHOLDER_ENS_PILLS;

    // F2: ENS pills behave as a toggle — tapping the active pill again
    // deselects it (no active pill). Mirrors sim's selectENS.
    const [activeEns, setActiveEns] = useState<string | null>(null);
    // Saved ENS from the user's own row — seeds the active pill on mount so
    // the profile's chosen ENS survives reload. null until loaded.
    const [savedEns, setSavedEns] = useState<string | null>(null);
    const savedEnsLoaded = useRef(false);
    useEffect(() => {
        if (!isAuthed) return;
        let active = true;
        fetchMe()
            .then((row) => {
                if (active && row) {
                    savedEnsLoaded.current = true;
                    setSavedEns(row.ens_name);
                    if (row.ens_name) setActiveEns(row.ens_name);
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, [isAuthed]);
    const [ensExpanded, setEnsExpanded] = useState(false);
    const ensDragRef = useDragScroll<HTMLDivElement>();
    const [balanceHidden, setBalanceHidden] = useState(false);
    const [walletCopied, setWalletCopied] = useState(false);
    const walletCopyTimer = useRef<number | null>(null);

    /* Sync activeEns with the live pill list — set it to the first
       pill when one becomes available, clear it if the current active
       pill disappears (e.g., wallet swap). */
    useEffect(() => {
        if (rawPills.length === 0) {
            if (activeEns !== null) setActiveEns(null);
            return;
        }
        // If the user has a saved ENS that's still in the pill list, it wins
        // over the first-pill default.
        if (savedEns && rawPills.includes(savedEns)) {
            if (activeEns !== savedEns && !savedEnsLoaded.current) return;
        }
        if (activeEns === null || !rawPills.includes(activeEns)) {
            // Respect "no ENS chosen" — restore the saved pick if there is one,
            // otherwise leave it OFF. Never auto-highlight the first pill
            // (Brendon, 2026-06-24).
            setActiveEns(savedEns && rawPills.includes(savedEns) ? savedEns : null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawPills.join('|'), savedEns]);

    /* Build the display-order pill list:
       - Active pill first (always visible, always at position 0).
       - Remaining pills sorted alphabetically.
       This order applies to both collapsed and expanded states. */
    const sortedRest = [...rawPills]
        .filter((n) => n !== activeEns)
        .sort((a, b) => a.localeCompare(b));
    const ensPills: string[] = activeEns && rawPills.includes(activeEns)
        ? [activeEns, ...sortedRest]
        : [...rawPills].sort((a, b) => a.localeCompare(b));

    // Build 33 — engine state mirrors.
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

    const handleRpcPing = () => {
        const nowActive = engineToggleRpcPing();
        showToast(nowActive ? 'RPC Ping: ON' : 'RPC Ping: OFF');
    };

    const handleIncognito = () => {
        const nowActive = engineToggleIncognito();
        if (nowActive && notifs.spell_hammer) {
            toggleNotif('spell_hammer');
        }
        showToast(`Incognito Proxy: ${nowActive ? 'ON' : 'OFF'}`);
    };

    const handleCopyWallet = async () => {
        const confirm = () => {
            if (walletCopyTimer.current != null) window.clearTimeout(walletCopyTimer.current);
            setWalletCopied(true);
            walletCopyTimer.current = window.setTimeout(() => { setWalletCopied(false); walletCopyTimer.current = null; }, 1500);
        };
        try {
            await navigator.clipboard?.writeText(fullAddress);
            confirm();
        } catch {
            confirm();
        }
    };

    const balanceDisplay = isAuthed
        ? priceBalance.balanceFormatted ?? '—'
        : PLACEHOLDER_BALANCE;

    // Show …more only when there are more than 3 pills.
    const showMoreBtn = ensPills.length > 3;

    // Collapsed visible set — first 3 pills (active is always first
    // in ensPills so it's naturally included).
    const collapsedVisible = new Set(ensPills.slice(0, 3));

    // Expanded state pill split — first half → row 1, second half → row 2.
    const splitIndex = Math.ceil(ensPills.length / 2);
    const pillsRow1 = ensPills.slice(0, splitIndex);
    const pillsRow2 = ensPills.slice(splitIndex);

    const renderPill = (ens: string) => {
        const isActive = ens === activeEns;
        return (
            <button
                key={ens}
                type="button"
                className={`pill-ens${isActive ? ' active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveEns((prev) => {
                        const next = prev === ens ? null : ens;
                        // Persist the chosen ENS (or null to clear) so the
                        // public profile reflects it. Fire-and-forget.
                        pushState({ ens_name: next });
                        setSavedEns(next);
                        // Tell the profile so its identity row repaints live
                        // (no reload needed).
                        window.dispatchEvent(new CustomEvent('pd:ens-changed', { detail: next }));
                        return next;
                    });
                }}
            >
                ↳ {ensLabel(ens)}
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
                {/* Keep both states in the DOM at fixed width so the row
                    never reflows on copy. The address string is always the
                    widest content; COPIED sits in an absolutely-positioned
                    overlay so it inherits that width without shifting
                    the incognito/ping buttons beside it. */}
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ visibility: walletCopied ? 'hidden' : 'visible' }}>
                        {handle} <span className="icon-copy">⧉{'\uFE0E'}</span>
                    </span>
                    <span style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        visibility: walletCopied ? 'visible' : 'hidden',
                        whiteSpace: 'nowrap',
                    }}>
                        COPIED!
                    </span>
                </span>
                <FiatCurrencyPicker gated={!isAuthed} />
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
                        {/* Desktop mouse users pan this row by click-dragging
                            (useDragScroll) — wheel-only mice have no native
                            horizontal scroll gesture. Touch is untouched. */}
                        <div className="ens-scroll-viewport" ref={ensDragRef}>
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
                        {ensPills
                            .filter((p) => collapsedVisible.has(p))
                            .map(renderPill)}
                        {moreButton}
                    </>
                )}
            </div>

            <div
                className={`settings-ens-row price-held-row${gatedClass}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthed) return;
                    const next = !balanceHidden;
                    setBalanceHidden(next);
                    showToast(next ? '$PRICE Balance: HIDDEN' : '$PRICE Balance: SHOWN');
                }}
                role="button"
                tabIndex={isAuthed ? 0 : -1}
                style={{
                    cursor: 'pointer',
                    userSelect: 'none',
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
                    {balanceHidden ? '***' : balanceDisplay}
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
                    {/* Predictive icon: shows what pressing will DO.
                        Visible → ⊘ (pressing will hide).
                        Hidden  → ⊙ (pressing will reveal). */}
                    {balanceHidden ? '⊙\uFE0E' : '⊘\uFE0E'}
                </span>
            </div>
        </>
    );
}
