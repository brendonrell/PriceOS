'use client';

/*
 * lib/hooks/useMint.ts
 *
 * Wraps wagmi's useWriteContract + useWaitForTransactionReceipt
 * into a single mint() entry point with a flat status enum that
 * the button renders directly.
 *
 * Status machine:
 *
 *   idle        — no in-flight tx. Default.
 *   confirming  — wallet popup is open, waiting for user to
 *                 sign. (wagmi: useWriteContract.isPending.)
 *   pending     — tx hash received, waiting for inclusion.
 *                 (wagmi: receipt.isLoading.)
 *   success     — tx confirmed on-chain.
 *   error       — either the user rejected, the wallet failed
 *                 to send, or the tx reverted. `error` carries a
 *                 mapped, human-friendly message.
 *
 * Error mapping:
 *   - viem's UserRejectedRequestError → "Cancelled."
 *     (Quiet copy — user knows they cancelled, no need to shout.)
 *   - InsufficientFundsError or message containing 'insufficient
 *     funds' → "Insufficient funds." (Cheap to detect by walking
 *     the BaseError cause chain; some wallets surface it as a
 *     plain string instead of the typed class.)
 *   - Anything else → the raw shortMessage if available, else a
 *     generic "Mint failed." We surface a string, not the Error,
 *     because the caller renders it directly.
 *
 * mint() refuses to fire against the zero-address stub. This
 * keeps Build #4 safe for Brendon to test the disconnected /
 * connected / wrong-network UX without burning gas — the actual
 * write path only goes live once a real address lands in
 * lib/contracts/PDCollection.ts.
 */

import { useCallback, useMemo } from 'react';
import {
    useWriteContract,
    useWaitForTransactionReceipt,
    useChainId,
} from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { BaseError, UserRejectedRequestError } from 'viem';
import {
    COLLECTION_ADDRESS,
    PDCollectionAbi,
    isStubAddress,
} from '../contracts/PDCollection';

export type MintStatus =
    | 'idle'
    | 'confirming'
    | 'pending'
    | 'success'
    | 'error';

export interface UseMintReturn {
    mint: (priceWei: bigint) => void;
    status: MintStatus;
    hash: `0x${string}` | undefined;
    error: string | undefined;
    reset: () => void;
}

function mapError(err: unknown): string {
    if (!err) return 'Mint failed.';

    if (err instanceof BaseError) {
        // walk() climbs the cause chain looking for a typed match
        const rejected = err.walk(
            (e) => e instanceof UserRejectedRequestError,
        );
        if (rejected) return 'Cancelled.';

        // Insufficient funds isn't always wrapped in a typed class
        // depending on wallet — check shortMessage / details too.
        const msg = (err.shortMessage || err.message || '').toLowerCase();
        if (msg.includes('insufficient funds')) return 'Insufficient funds.';

        return err.shortMessage || 'Mint failed.';
    }

    if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('user rejected')) return 'Cancelled.';
        if (msg.includes('insufficient funds')) return 'Insufficient funds.';
        return err.message || 'Mint failed.';
    }

    return 'Mint failed.';
}

export function useMint(): UseMintReturn {
    const chainId = useChainId();

    const {
        writeContract,
        data: hash,
        isPending: isConfirming,
        error: writeError,
        reset: resetWrite,
    } = useWriteContract();

    const {
        isLoading: isReceiptPending,
        isSuccess: isReceiptSuccess,
        error: receiptError,
    } = useWaitForTransactionReceipt({
        hash,
        chainId: mainnet.id,
    });

    const mint = useCallback(
        (priceWei: bigint) => {
            // Stub-address guard — Build #4 ships against the zero
            // address. Refuse to even pop the wallet until Brendon
            // wires the real deploy address. This is belt-and-
            // suspenders; the button is supposed to gate this too.
            if (isStubAddress()) {
                // eslint-disable-next-line no-console
                console.warn(
                    '[useMint] Refusing to send: PDCollection address ' +
                        'is the zero-address stub. Wire the real ' +
                        'deploy address in lib/contracts/PDCollection.ts.',
                );
                return;
            }

            writeContract({
                address: COLLECTION_ADDRESS,
                abi: PDCollectionAbi,
                functionName: 'mint',
                value: priceWei,
                chainId: mainnet.id,
            });
        },
        [writeContract],
    );

    const status: MintStatus = useMemo(() => {
        if (writeError || receiptError) return 'error';
        if (isReceiptSuccess) return 'success';
        if (hash && isReceiptPending) return 'pending';
        if (isConfirming) return 'confirming';
        return 'idle';
    }, [
        writeError,
        receiptError,
        isReceiptSuccess,
        hash,
        isReceiptPending,
        isConfirming,
    ]);

    const error = useMemo(() => {
        if (writeError) return mapError(writeError);
        if (receiptError) return mapError(receiptError);
        return undefined;
    }, [writeError, receiptError]);

    // Suppress the unused-var lint until the wrong-chain branch
    // grows past the MintButton's own check.
    void chainId;

    return { mint, status, hash, error, reset: resetWrite };
}
