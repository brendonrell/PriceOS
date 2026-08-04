/*
 * lib/drops/order.ts — the held order's own testimony.
 *
 * A drop entry is a COMPLETE pre-signed mint transaction the app holds on the
 * entrant's behalf ("a signed instruction, never funds"). The number of SEATS
 * that entry carries is not a claim the client gets to make: it decides the
 * wallet's weight in the draw AND becomes its on-chain mint allowance at
 * closeWindowContested. Taken on trust, a wallet could enter a scarce drop
 * with a one-token order while claiming ten seats and take ten times the
 * intended share — paying full price for whatever it minted, so never theft,
 * but defeating the exact fairness the entry window exists to deliver, and
 * invisible in the published transcript because the transcript would commit
 * the same unchecked number.
 *
 * So seats are DERIVED here, from the order itself: the transaction must be
 * this chain's, aimed at this project, signed by the authenticated wallet, and
 * calling mint(quantity). That quantity IS the seat count. Nothing the client
 * sends is consulted.
 */

import { decodeFunctionData, parseAbi, parseTransaction, recoverTransactionAddress, type Hex } from 'viem';
import { CHAIN_ID } from '@/lib/market/chain';

/** PDProject.MAX_MINT_PER_TX — the contract's hard per-transaction cap. */
export const MAX_MINT_PER_TX = 22;

const MINT_ABI = parseAbi(['function mint(uint256 quantity)']);

export class OrderRejected extends Error {}

export interface VerifiedOrder {
    /** Tokens the signed order actually mints — the entry's true weight. */
    seats: number;
    /** Wei the order sends, for the record. */
    value: bigint;
}

/**
 * Verify a held order and derive its seat count. Throws OrderRejected with a
 * user-facing reason if the order is not what it claims to be.
 */
export async function verifyOrder(params: {
    signedOrder: Hex;
    project: string;
    wallet: string;
}): Promise<VerifiedOrder> {
    const { signedOrder, project, wallet } = params;

    let tx: ReturnType<typeof parseTransaction>;
    try {
        tx = parseTransaction(signedOrder);
    } catch {
        throw new OrderRejected('signedOrder is not a valid transaction');
    }

    // Same chain. A signed order for another network would simply never land,
    // and must not be allowed to buy draw weight here.
    if (tx.chainId !== undefined && tx.chainId !== CHAIN_ID) {
        throw new OrderRejected('signedOrder is for the wrong network');
    }

    // Aimed at this project, not at some other contract or a bare transfer.
    if (!tx.to || tx.to.toLowerCase() !== project.toLowerCase()) {
        throw new OrderRejected('signedOrder must be a mint on this project');
    }

    // Signed by the wallet that holds this session. The client never names its
    // own wallet, and now it cannot enter on someone else's signature either.
    let signer: string;
    try {
        signer = await recoverTransactionAddress({ serializedTransaction: signedOrder as never });
    } catch {
        throw new OrderRejected('signedOrder is not signed');
    }
    if (signer.toLowerCase() !== wallet.toLowerCase()) {
        throw new OrderRejected('signedOrder must be signed by your own wallet');
    }

    // It must be a mint, and the quantity it mints is the seat count.
    let quantity: bigint;
    try {
        const decoded = decodeFunctionData({ abi: MINT_ABI, data: tx.data ?? '0x' });
        if (decoded.functionName !== 'mint') throw new Error('not mint');
        quantity = decoded.args[0] as bigint;
    } catch {
        throw new OrderRejected('signedOrder must call mint');
    }

    if (quantity < 1n || quantity > BigInt(MAX_MINT_PER_TX)) {
        throw new OrderRejected(`mint quantity must be 1–${MAX_MINT_PER_TX}`);
    }

    return { seats: Number(quantity), value: tx.value ?? 0n };
}
