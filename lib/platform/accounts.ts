/*
 * PLATFORM ACCOUNTS — profiles that belong to the platform, not to a person
 * (Brendon, 2026-07-28).
 *
 * The first and only one is @price, the official page for $PRICE. Its identity
 * is the TOKEN CONTRACT ITSELF — the mainnet ERC-20 at 0x173a…4638 — not a
 * wallet we control. That single choice does most of the work:
 *
 *   • It can never be signed into. A contract has no private key, so no SIWE
 *     signature can ever be produced for it. The page is unclaimable by
 *     construction rather than by a flag we have to keep defending.
 *   • Every "owned by" readout on the site resolves to the real contract, so
 *     the page agrees with Etherscan without us restating anything.
 *
 * What the flag itself gates: the person-to-person actions. A platform account
 * is not a counterparty — nobody can trade with it or cast a Takeover on it,
 * refused in the UI AND at the route so it can't be reached by hand. The
 * hazard being closed off is real: ERC-20s sent to their own contract address
 * are unrecoverable, so this is a hard refusal, never a warning.
 *
 * What stays open: the SOCIAL side, in our direction only. Users follow it and
 * ping it exactly as they would any profile. The account has no inbox and no
 * feed of its own — nothing is on the other end reading them.
 */

import type { PriceSpriteVibe } from '../sprites/vibes';

/** $PRICE — the mainnet ERC-20. 100M fixed supply, deployed 2026-07-03. */
export const PRICE_TOKEN_ADDRESS = '0x173a012c7c8ca3cfb531dcad84a40c53dbe74638';

/** The token's actual deployment date — @price's account/join date shows
 *  this instead of the row's DB created_at (which just reflects whenever
 *  the platform profile row happened to be inserted). */
export const PRICE_TOKEN_CREATED_AT = '2026-07-03T00:00:00.000Z';

export interface PlatformAccount {
    /** The handle the page lives at (/price). */
    handle: string;
    /** The account's on-chain identity — for @price, the token contract. */
    address: string;
    /** PriceSprite archetype (Brendon's pick, 2026-07-28). The face itself is
     *  derived from the address, so only the archetype is a choice. */
    spriteVibe: PriceSpriteVibe;
}

export const PLATFORM_ACCOUNTS: readonly PlatformAccount[] = [
    { handle: 'price', address: PRICE_TOKEN_ADDRESS, spriteVibe: 'mystic' },
];

const BY_ADDRESS = new Map(PLATFORM_ACCOUNTS.map((a) => [a.address.toLowerCase(), a]));
const BY_HANDLE = new Map(PLATFORM_ACCOUNTS.map((a) => [a.handle.toLowerCase(), a]));

/** The platform account for an address, or null for an ordinary wallet. */
export function platformAccountByAddress(address: string | null | undefined): PlatformAccount | null {
    if (!address) return null;
    return BY_ADDRESS.get(address.toLowerCase()) ?? null;
}

/** The platform account for a handle, or null. */
export function platformAccountByHandle(handle: string | null | undefined): PlatformAccount | null {
    if (!handle) return null;
    return BY_HANDLE.get(handle.replace(/^@/, '').toLowerCase()) ?? null;
}

/**
 * True when this address is a platform account — the one check every
 * person-to-person action asks before it offers itself or accepts a request.
 */
export function isPlatformAccount(address: string | null | undefined): boolean {
    return platformAccountByAddress(address) !== null;
}
