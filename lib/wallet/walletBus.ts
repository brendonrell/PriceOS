'use client';

/*
 * walletBus — bridge between the eager UI and the deferred wallet stack.
 *
 * Perf batch 2026-06-10. The wagmi + RainbowKit + connector-SDK bundle is
 * the single heaviest thing the app ships (~1.2MB raw in one chunk), and it
 * used to ride in the root layout's first load on every page for every
 * visitor. It now lives in components/wallet/WalletStack.tsx, loaded by
 * WalletProviders on first idle after paint (or immediately on the first
 * connect tap, whichever comes first).
 *
 * That split leaves two UI surfaces (UserMenuButtons, LinksView) needing
 * things only the heavy stack can provide — the RainbowKit connect modal
 * and the ENS name for the signed-in address — without importing it. This
 * module is the seam:
 *
 *   eager side                       deferred side
 *   ─────────────────────────────    ───────────────────────────────────
 *   openConnectModal()           →   opener registered by WalletStack;
 *                                    taps before it's ready queue ONE
 *                                    pending open and force the load —
 *                                    the modal appears the moment the
 *                                    stack lands (sub-second in practice;
 *                                    the chunk is idle-prefetched long
 *                                    before a human reaches the button).
 *   requestWalletDisconnect()    →   same pattern for sign-out's wagmi
 *                                    disconnect.
 *   getWalletEnsName()           ←   published by the stack's useEnsName
 *   (useSyncExternalStore-ready)     watcher; null until resolved — the
 *                                    pill's shortAddr fallback covers it,
 *                                    exactly as it covered the in-flight
 *                                    lookup before the split.
 *
 * Module singleton (same pattern as the engines). No React imports — the
 * consumers wire it up with useSyncExternalStore themselves.
 */

type VoidFn = () => void;

let requestLoadFn: VoidFn | null = null;
let loadFailed = false;

let openConnectFn: VoidFn | null = null;
let disconnectFn: VoidFn | null = null;
let pendingConnectOpen = false;
let pendingDisconnect = false;

let ensName: string | null = null;

/* Forever-free RPC pass (2026-07-10): read-only eth_call served by the
   CONNECTED WALLET'S OWN provider (MetaMask/Rainbow/Coinbase/WC all expose
   one). Registered by WalletStack only while the wallet is connected on the
   app's chain; consumers (usePriceBalance) use it when present and fall back
   to the cached Worker route when absent or failing — so per-user reads ride
   the user's own RPC and our Alchemy key stays out of the per-user path. */
type WalletEthCall = (to: string, data: string) => Promise<string>;
let walletEthCallFn: WalletEthCall | null = null;

const subs = new Set<VoidFn>();

function emit(): void {
    subs.forEach((fn) => {
        try { fn(); } catch { /* subscriber error must not break the bus */ }
    });
}

/** Subscribe to bus state changes (ENS name). Returns unsubscribe. */
export function subscribeWalletBus(fn: VoidFn): VoidFn {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
}

/** ENS name for the SIWE address, published by the deferred stack.
    Null until the stack mounts + the lookup resolves (or when unset). */
export function getWalletEnsName(): string | null {
    return ensName;
}

/** Server-snapshot getter for useSyncExternalStore — ENS resolution is
    client-only (was inside wagmi's client tree before the split too). */
export function getWalletEnsNameServer(): null {
    return null;
}

/** Stack side: publish the resolved ENS name (or null). */
export function setWalletEnsName(v: string | null): void {
    if (v === ensName) return;
    ensName = v;
    emit();
}

/** Stack side: register (or clear) the connected wallet's read-only
    eth_call. Cleared on disconnect / wrong chain so a stale provider can
    never serve a read. */
export function registerWalletEthCall(fn: WalletEthCall | null): void {
    walletEthCallFn = fn;
}

/** Consumer side: the wallet's eth_call, or null when no connected wallet
    on the app's chain can serve reads (callers fall back to the route). */
export function getWalletEthCall(): WalletEthCall | null {
    return walletEthCallFn;
}

/** Eager provider registers how to force-load the stack chunk. */
export function registerStackLoader(fn: VoidFn): void {
    requestLoadFn = fn;
}

/** Eager provider marks the stack import as failed (network error). The
    pending flags stay set so a retry that succeeds still completes the
    queued action. */
export function markStackLoadFailed(): void {
    loadFailed = true;
}

export function markStackLoadRecovered(): void {
    loadFailed = false;
}

/** Stack side: register (or clear, on unmount) the live RainbowKit
    connect-modal opener. Flushes a queued open from a pre-load tap. */
export function registerConnectModalOpener(fn: VoidFn | null): void {
    openConnectFn = fn;
    if (fn && pendingConnectOpen) {
        pendingConnectOpen = false;
        fn();
    }
}

/** Stack side: register (or clear) wagmi's disconnect. Flushes a queued
    disconnect from a pre-load sign-out. */
export function registerWalletDisconnect(fn: VoidFn | null): void {
    disconnectFn = fn;
    if (fn && pendingDisconnect) {
        pendingDisconnect = false;
        fn();
    }
}

/**
 * Open the wallet connect modal. If the stack isn't loaded yet, queue the
 * open and force the load — the modal opens the moment it lands.
 * `onUnavailable` fires only when a previous load attempt actually FAILED
 * (offline, chunk error) so callers can keep their existing toast.
 */
export function openConnectModal(onUnavailable?: VoidFn): void {
    if (openConnectFn) {
        openConnectFn();
        return;
    }
    if (loadFailed) {
        onUnavailable?.();
        // Retry the import anyway — a transient network blip shouldn't
        // permanently kill the connect path until refresh.
        requestLoadFn?.();
        pendingConnectOpen = true;
        return;
    }
    pendingConnectOpen = true;
    requestLoadFn?.();
}

/** Disconnect wagmi (sign-out path). Queues if the stack isn't up — a
    pre-load sign-out has no live wallet connection worth keeping anyway;
    the queued disconnect tears down whatever the stack restores. */
export function requestWalletDisconnect(): void {
    if (disconnectFn) {
        disconnectFn();
        return;
    }
    pendingDisconnect = true;
    requestLoadFn?.();
}
