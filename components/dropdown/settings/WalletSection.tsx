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
 *
 * S3 live wallet data:
 *   When isAuthed, the displayed values pull from live sources rather
 *   than hardcoded mocks:
 *     - handle      → shortAddr(siweAddress)
 *     - ensPills    → useEnsName({ address, chainId: 1 }) — wraps the
 *                     single resolved primary ENS in an array; empty
 *                     when no ENS resolves. Multi-ENS list parks
 *                     until the indexer ships.
 *     - balance     → usePriceBalance(siweAddress).balanceFormatted
 *                     (one-shot per address per Tier 2 cost arch — no
 *                     polling on per-user data)
 *   When !isAuthed, the PLACEHOLDER_* constants fill in so the S2
 *   gated preview keeps its full shape under the auth-gated class.
 */

import { useEffect, useState } from 'react';
import { useEnsName } from 'wagmi';
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

/* Placeholder values shown while !isAuthed so the S2 logged-out preview
   keeps its full shape (opacity 0.4 + pointer-events: none — the gating
   class handles the inertness). When authed, these are replaced with
   live data from siweAddress / useEnsName / usePriceBalance. */
const PLACEHOLDER_HANDLE = '0x1234...abcd';
const PLACEHOLDER_FULL_ADDRESS = '0x1234567890abcdef1234567890abcdef1234abcd';
const PLACEHOLDER_ENS_PILLS = ['name.eth', 'name.pricediscussion.eth'];
const PLACEHOLDER_BALANCE = '17,450.54';

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletSection() {
    const { showToast } = useToast();
    const { notifs, toggle: toggleNotif } = usePdNotifs();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const gatedClass = isAuthed ? '' : ' auth-gated';

    /* S3 — live wallet ENS detection.
       Uses account.domains (current registry ownership) NOT registrations
       (which persist after transfers). Filters expired names client-side.
       Cache: read from localStorage on mount for instant display, refresh
       async so the panel always loads immediately. */
    const ensQuery = useEnsName({
        address: (siweAddress ?? undefined) as `0x${string}` | undefined,
        chainId: 1,
    });
    const ensFallback = ensQuery.data ?? null;
    const ENS_CACHE_KEY = 'pd_ens_cache';
    const [ensSubgraphNames, setEnsSubgraphNames] = useState<string[]>(() => {
        // Instant: read from cache on first render
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(ENS_CACHE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as { addr: string; names: string[]; ts: number };
            // Cache valid for 5 minutes
            if (Date.now() - parsed.ts < 5 * 60 * 1000) return parsed.names;
        } catch { /* ignore */ }
        return [];
    });

    useEffect(() => {
        if (!siweAddress) { setEnsSubgraphNames([]); return; }
        const addr = siweAddress.toLowerCase();
        const nowSecs = Math.floor(Date.now() / 1000);
        // Query domains (current ownership in ENS registry), not registrations
        const query = `{
            account(id: "${addr}") {
                domains(first: 100, where: { parent_not: null }) {
                    name
                    expiryDate
                    owner { id }
                }
                wrappedDomains(first: 100) {
                    domain { name expiryDate }
                }
            }
        }`;
        fetch('https://api.thegraph.com/subgraphs/name/ensdomains/ens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        })
            .then((r) => r.ok ? r.json() : Promise.reject(r.status))
            .then((data) => {
                const seen = new Set<string>();
                const names: string[] = [];
                const acc = data?.data?.account;
                if (acc) {
                    // domains: current registry owner — filter expired and non-.eth
                    for (const d of (acc.domains ?? [])) {
                        const n = d?.name;
                        const exp = d?.expiryDate ? Number(d.expiryDate) : null;
                        // Skip expired (expiryDate in the past) and non-.eth names
                        if (!n || !n.endsWith('.eth')) continue;
                        if (exp !== null && exp < nowSecs) continue;
                        if (!seen.has(n)) { seen.add(n); names.push(n); }
                    }
                    // wrappedDomains: NameWrapper ownership — also filter expired
                    for (const r of (acc.wrappedDomains ?? [])) {
                        const n = r?.domain?.name;
                        const exp = r?.domain?.expiryDate ? Number(r.domain.expiryDate) : null;
                        if (!n || !n.endsWith('.eth')) continue;
                        if (exp !== null && exp < nowSecs) continue;
                        if (!seen.has(n)) { seen.add(n); names.push(n); }
                    }
                }
                setEnsSubgraphNames(names);
                // Cache for instant next load
                try {
                    localStorage.setItem(ENS_CACHE_KEY, JSON.stringify({
                        addr, names, ts: Date.now(),
                    }));
                } catch { /* ignore quota */ }
            })
            .catch(() => {
                /* subgraph unavailable — fall back to primary ENS */
                setEnsSubgraphNames([]);
            });
    }, [siweAddress]);

    const priceBalance = usePriceBalance(siweAddress);

    const handle = isAuthed && siweAddress
        ? shortAddr(siweAddress)
        : PLACEHOLDER_HANDLE;
    const fullAddress = isAuthed && siweAddress
        ? siweAddress
        : PLACEHOLDER_FULL_ADDRESS;
    /* Prefer subgraph names (full list); fall back to primary ENS reverse
       record if the subgraph returned nothing (e.g. first load or error). */
    const ensNamesLive = ensSubgraphNames.length > 0
        ? ensSubgraphNames
        : (ensFallback ? [ensFallback] : []);
    const ensPills: string[] = isAuthed ? ensNamesLive : PLACEHOLDER_ENS_PILLS;
    const balanceDisplay = isAuthed
        ? priceBalance.balanceFormatted ?? '—'
        : PLACEHOLDER_BALANCE;

    // F2: ENS pills behave as a toggle — tapping the active pill again
    // deselects it (no active pill). Mirrors sim's selectENS, which removes
    // the active class from all pills, then re-adds it only if the click
    // target wasn't already active. So `activeEns` can be null.
    const [activeEns, setActiveEns] = useState<string | null>(null);
    const [ensExpanded, setEnsExpanded] = useState(false);
    const [balanceHidden, setBalanceHidden] = useState(false);

    /* Sync activeEns with the live pill list — set it to the first
       pill when one becomes available, clear it if the current active
       pill disappears (e.g., wallet swap). */
    useEffect(() => {
        if (ensPills.length === 0) {
            if (activeEns !== null) setActiveEns(null);
            return;
        }
        if (activeEns === null || !ensPills.includes(activeEns)) {
            setActiveEns(ensPills[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ensPills.join('|')]);

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
            await navigator.clipboard?.writeText(fullAddress);
            showToast('Wallet Address Copied');
        } catch {
            showToast('Copy Failed');
        }
    };

    // Only show the …more affordance when there are more than 3 pills.
    const showMoreBtn = ensPills.length > 3;

    // Which pills are visible in the collapsed state — first 3 pills,
    // bumping the active one in if it's beyond the cutoff.
    const collapsedVisible = (() => {
        if (ensPills.length <= 3) return new Set(ensPills);
        const visible = new Set<string>();
        if (activeEns && ensPills.indexOf(activeEns) >= 0) visible.add(activeEns);
        for (const p of ensPills) {
            if (visible.size >= 3) break;
            visible.add(p);
        }
        return visible;
    })();

    // Expanded state pill split — first half → row 1, second half → row 2.
    // Math.ceil biases row 1 to one more pill when the count is odd.
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
                {handle} <span className="icon-copy">⧉{'\uFE0E'}</span>
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
                        {ensPills.filter((p) => collapsedVisible.has(p)).map(renderPill)}
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
                    {balanceHidden ? '⊘\uFE0E' : '⊚\uFE0E'}
                </span>
            </div>
        </>
    );
}
