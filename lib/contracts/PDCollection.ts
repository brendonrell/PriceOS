/*
 * lib/contracts/PDCollection.ts
 *
 * Typed surface for the PDCollection contract. Build #4 only
 * needs five functions:
 *
 *   - mint() payable                 — primary mint, value = price()
 *   - totalMinted() view             — current supply counter
 *   - maxSupply() view               — edition cap (Kiki = 2222)
 *   - price() view                   — wei per edition (Kiki ≈ 0.014e18)
 *   - royaltyInfo(uint256,uint256)   — EIP-2981 (receiver, royaltyAmount)
 *
 * The full PDCollection ABI (transfers, approvals, on-chain SVG
 * tokenURI, the 60-day cooldown surfaces, factory hooks) lands
 * in later builds as those features come online. Keeping the ABI
 * narrow here means autocomplete / type-checking only surfaces
 * the methods we actually call in this slice — easier to audit.
 *
 * `as const` is critical: viem's Abi inference only works on
 * literal-typed arrays. Without it, every wagmi hook degrades to
 * `unknown` argument types. Don't drop it.
 *
 * COLLECTION_ADDRESS is the zero address as a deliberate stub.
 * Brendon swaps in the real PDCollection deploy address (per-
 * collection — Kiki gets its own address from PDFactory) before
 * the write path is exercised. Calls against the stub address
 * will return empty bytes / 0n on read, and useMint() rejects
 * the click before sending if address is zero.
 */

import type { Abi, Address } from 'viem';

// TODO(brendon): Replace with real PDCollection deploy address
// once PDFactory.deployCollection() returns the Kiki address.
// Per-collection — each collection has its own PDCollection
// contract deployed by PDFactory; this constant becomes a lookup
// keyed by collection slug once the indexer is wired.
export const COLLECTION_ADDRESS: Address =
    '0x0000000000000000000000000000000000000000';

export const isStubAddress = (addr: Address = COLLECTION_ADDRESS): boolean =>
    addr === '0x0000000000000000000000000000000000000000';

export const PDCollectionAbi = [
    // ---- writes ----
    {
        type: 'function',
        name: 'mint',
        stateMutability: 'payable',
        inputs: [],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
    },

    // ---- reads ----
    {
        type: 'function',
        name: 'totalMinted',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'maxSupply',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'price',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },

    // EIP-2981 — secondary royalty info. Returns
    // (receiver, royaltyAmount) where royaltyAmount is in the
    // same units as salePrice. PD's split (3% artist / 2% PD)
    // is enforced by PaymentSplitter at the receiver address.
    {
        type: 'function',
        name: 'royaltyInfo',
        stateMutability: 'view',
        inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'salePrice', type: 'uint256' },
        ],
        outputs: [
            { name: 'receiver', type: 'address' },
            { name: 'royaltyAmount', type: 'uint256' },
        ],
    },
] as const satisfies Abi;
