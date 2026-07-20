/*
 * Shared fiat-conversion types + constants for the /api/fx route and its
 * client consumers. Lives outside the route file because Next.js route modules
 * may only export handlers + config (GET/POST/revalidate/…), not arbitrary
 * symbols.
 */

export type FiatCode = 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD' | 'JPY';

export const FIAT_CODES: FiatCode[] = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'JPY'];

export interface FxResponse {
    /** ETH price in each fiat. Missing keys mean that currency couldn't be sourced. */
    rates: Partial<Record<FiatCode, number>>;
    /** True only when we're confident enough to show the number to a blind buyer. */
    trusted: boolean;
    source: string;
    fetchedAt: number;
}
