'use client';

/*
 * usePriceBalance — fetches $PRICE ERC-20 balance for an address.
 *
 * Tier 2 cost architecture (page 2kyd6gx6-3234):
 *   Per-user data ($PRICE balance, ENS) fires on connect/refresh only
 *   — NOT on a polling interval. The hook fires when `address`
 *   changes (initial connect, wallet swap, page mount) and via the
 *   returned `refetch` callback. No interval, no visibility-resume.
 *
 * Forever-free RPC pass (2026-07-10): the read goes through the
 * CONNECTED WALLET'S OWN provider first (walletBus.getWalletEthCall,
 * published by WalletStack while connected on the app's chain) — the
 * user's wallet RPC serves their own balance read, so this per-user
 * surface costs our Alchemy key nothing. When no wallet provider is
 * available (or the call fails / answers empty), it falls back to the
 * /api/price/[address] route exactly as before.
 *
 * The fallback route is edge-cached at 10s, so repeated refetches
 * within that window collapse to a cache hit. Each unique address
 * creates its own cache key, but the per-address call count stays
 * bounded by the connect cadence rather than wall-clock time.
 *
 * Consumers:
 *   - WalletSection: usePriceBalance(siweAddress).balanceFormatted →
 *     PRICE balance row. Fires once on auth, holds until the user
 *     disconnects or refreshes the page.
 */

import { useCallback, useEffect, useState } from 'react';
import { getWalletEthCall } from '../wallet/walletBus';

interface UsePriceBalanceReturn {
    balanceFormatted: string | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

interface PriceBalanceResponse {
    address: string;
    token_address: string;
    balance_wei: string;
    balance_formatted: string;
    decimals: number;
}

/* $PRICE ERC-20, DEPLOYED to Ethereum mainnet 2026-07-03 (CLAUDE.md §2) —
   same canonical default the /api/price route uses. The route's env override
   (PRICE_TOKEN_ADDRESS) is server-only; if the token ever migrates, this
   constant moves with the route's default in the same change. */
const PRICE_TOKEN_ADDRESS = '0x173a012c7c8ca3cfb531dcad84a40c53dbe74638';

// keccak256("balanceOf(address)").slice(0, 10)
const BALANCE_OF_SELECTOR = '0x70a08231';
// keccak256("decimals()").slice(0, 10)
const DECIMALS_SELECTOR = '0x313ce567';

const PRICE_DECIMALS_FALLBACK = 18;

/* decimals() never changes — resolve once per session through whichever
   wallet provider first serves a read (mirrors the route's per-instance
   memoise). The fallback is never cached, same as the route. */
let decimalsCache: number | null = null;

function encodeBalanceOf(address: string): string {
    return BALANCE_OF_SELECTOR + address.slice(2).toLowerCase().padStart(64, '0');
}

/* Same formatting the /api/price route ships — kept as a local copy so the
   eager bundle doesn't grow a viem import for ten lines of arithmetic. */
function formatUnits(weiHex: string, decimals: number): string {
    const wei = BigInt(weiHex);
    if (wei === BigInt(0)) return '0';
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = wei / divisor;
    const fraction = wei % divisor;
    if (fraction === BigInt(0)) return whole.toString();
    const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole.toString()}.${fractionStr}`;
}

/** Wallet-provider read. Returns the formatted balance, or null when the
 *  wallet path can't serve it (no provider, wrong answer, thrown) — the
 *  caller falls through to the route. */
async function readViaWallet(address: string): Promise<string | null> {
    const call = getWalletEthCall();
    if (!call) return null;
    try {
        const balHex = await call(PRICE_TOKEN_ADDRESS, encodeBalanceOf(address));
        if (!balHex || balHex === '0x') return null;
        if (decimalsCache === null) {
            try {
                const decHex = await call(PRICE_TOKEN_ADDRESS, DECIMALS_SELECTOR);
                if (decHex && decHex !== '0x') decimalsCache = Number(BigInt(decHex));
            } catch { /* fall through to default — do NOT cache the fallback */ }
        }
        return formatUnits(balHex, decimalsCache ?? PRICE_DECIMALS_FALLBACK);
    } catch {
        return null;
    }
}

export function usePriceBalance(address: string | null): UsePriceBalanceReturn {
    const [balanceFormatted, setBalanceFormatted] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refetchCount, setRefetchCount] = useState(0);

    const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

    useEffect(() => {
        if (!address) {
            setBalanceFormatted(null);
            setError(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const viaWallet = await readViaWallet(address);
                if (cancelled) return;
                if (viaWallet !== null) {
                    setBalanceFormatted(viaWallet);
                    setError(null);
                    return;
                }

                const res = await fetch(`/api/price/${address}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as PriceBalanceResponse;
                if (cancelled) return;
                setBalanceFormatted(json.balance_formatted);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'fetch failed');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [address, refetchCount]);

    return { balanceFormatted, loading, error, refetch };
}
