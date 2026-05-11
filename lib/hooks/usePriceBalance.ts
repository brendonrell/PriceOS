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
 * The underlying /api/price/[address] route is edge-cached at 10s,
 * so repeated refetches within that window collapse to a cache hit.
 * Each unique address creates its own cache key, but the per-address
 * call count stays bounded by the connect cadence rather than wall-
 * clock time — exactly the property Tier 2 needs to fit inside
 * Alchemy's free-tier budget at 100k+ daily connects.
 *
 * Consumers:
 *   - WalletSection: usePriceBalance(siweAddress).balanceFormatted →
 *     PRICE balance row. Fires once on auth, holds until the user
 *     disconnects or refreshes the page.
 */

import { useCallback, useEffect, useState } from 'react';

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

        fetch(`/api/price/${address}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json() as Promise<PriceBalanceResponse>;
            })
            .then((json) => {
                if (cancelled) return;
                setBalanceFormatted(json.balance_formatted);
                setError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'fetch failed');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [address, refetchCount]);

    return { balanceFormatted, loading, error, refetch };
}
