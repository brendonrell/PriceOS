'use client';

/*
 * lib/hooks/useMintInfo.ts
 *
 * Batched read of PDCollection's three liveness numbers:
 * totalMinted, maxSupply, price. One useReadContracts call
 * (multicall under the hood — single RPC roundtrip) instead
 * of three separate reads.
 *
 * Refresh-on-block: subscribe to mainnet block number and
 * invalidate the read query each new block. wagmi v2 doesn't
 * auto-refetch reads on block, so we wire it manually. This
 * is intentionally cheap — multicall is one request per block,
 * and useBlockNumber's WebSocket subscription handles back-
 * pressure if the wallet's RPC is slow.
 *
 * `ready` is true only when ALL three reads have resolved with
 * non-undefined values. MintButton uses this to gate the
 * "MINT — 0.014 ETH" copy: if any value is missing (stub
 * address, RPC blip, contract not deployed) we hold the button
 * in its loading state instead of rendering a half-truth.
 *
 * mainnet only — chainId is pinned so a wallet on the wrong
 * chain still reads the live mint state from mainnet RPC. The
 * MintButton handles the wrong-network UX separately.
 */

import { useEffect } from 'react';
import { useBlockNumber, useReadContracts } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import {
    COLLECTION_ADDRESS,
    PDCollectionAbi,
} from '../contracts/PDCollection';

export interface MintInfo {
    totalMinted: bigint | undefined;
    maxSupply: bigint | undefined;
    priceWei: bigint | undefined;
    ready: boolean;
    isLoading: boolean;
}

export function useMintInfo(): MintInfo {
    const { data: blockNumber } = useBlockNumber({
        chainId: mainnet.id,
        watch: true,
    });
    const queryClient = useQueryClient();

    const { data, isLoading, queryKey } = useReadContracts({
        allowFailure: true,
        contracts: [
            {
                address: COLLECTION_ADDRESS,
                abi: PDCollectionAbi,
                functionName: 'totalMinted',
                chainId: mainnet.id,
            },
            {
                address: COLLECTION_ADDRESS,
                abi: PDCollectionAbi,
                functionName: 'maxSupply',
                chainId: mainnet.id,
            },
            {
                address: COLLECTION_ADDRESS,
                abi: PDCollectionAbi,
                functionName: 'price',
                chainId: mainnet.id,
            },
        ],
    });

    // Invalidate once per new block. queryClient.invalidateQueries
    // triggers a refetch under the hood; cheaper than polling.
    useEffect(() => {
        if (!blockNumber) return;
        queryClient.invalidateQueries({ queryKey });
        // queryKey is stable per-config; blockNumber drives the tick.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blockNumber]);

    const totalMinted =
        data?.[0]?.status === 'success' ? (data[0].result as bigint) : undefined;
    const maxSupply =
        data?.[1]?.status === 'success' ? (data[1].result as bigint) : undefined;
    const priceWei =
        data?.[2]?.status === 'success' ? (data[2].result as bigint) : undefined;

    const ready =
        totalMinted !== undefined &&
        maxSupply !== undefined &&
        priceWei !== undefined;

    return { totalMinted, maxSupply, priceWei, ready, isLoading };
}
