// THE DEPANNEUR — one crank of the capsule machine (test phase, sim-ETH).
//
// Mirrors the PDKeychains purchase for the no-chain phase: the crank costs
// CRANK_PRICE_ETH of the caller's sim-ETH, the seed is rolled server-side
// (crypto-random bytes32 — the Project-mint entropy stands in only at chain
// cutover), and the charm lands in the owner's settings envelope
// (`keychains`), the albums/vaults storage pattern reused verbatim.
//
// Money safety: the debit is an optimistic conditional update keyed on the
// read balance (retried once) — the balance can never go negative and a
// concurrent double-crank can't double-spend one balance read.

import { type NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { CRANK_PRICE_ETH, sanitizeCharms, type CharmRecord, type Coin } from '@/lib/keychains/engine';

export const dynamic = 'force-dynamic';

function rollSeed(): `0x${string}` {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return ('0x' + Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

export const POST = requireAuth(async (req: NextRequest, _ctx, address: string): Promise<NextResponse> => {
    try {
        // YIN/YANG (2026-07-28) — which of the machine's two coin slots the
        // coin dropped in. Required, like the contract's crank(coin).
        const body = (await req.json().catch(() => null)) as { coin?: unknown } | null;
        if (body?.coin !== 0 && body?.coin !== 1) return badRequest('Pick a coin slot (yin or yang)');
        const coin: Coin = body.coin;

        const db = getSupabaseService();

        for (let attempt = 0; attempt < 2; ++attempt) {
            const { data: row, error } = await db
                .from('users')
                .select('sim_eth_balance, keychains:settings->keychains')
                .eq('address', address)
                .maybeSingle();
            if (error) return serverError(error.message);
            if (!row) return badRequest('No account row for this address');

            const balance = Number((row as { sim_eth_balance: number }).sim_eth_balance) || 0;
            if (balance < CRANK_PRICE_ETH) return badRequest('Insufficient sim-ETH');

            // The conditional debit — only lands if the balance is still the
            // one we read; a miss means a concurrent spend, so re-read once.
            const { data: paid, error: payErr } = await db
                .from('users')
                .update({ sim_eth_balance: balance - CRANK_PRICE_ETH } as never)
                .eq('address', address)
                .eq('sim_eth_balance', balance)
                .select('sim_eth_balance');
            if (payErr) return serverError(payErr.message);
            if (!paid || paid.length === 0) continue; // balance moved — retry

            const charms = sanitizeCharms((row as { keychains?: unknown }).keychains);
            const charm: CharmRecord = {
                id: charms.reduce((m, c) => Math.max(m, c.id), 0) + 1,
                seed: rollSeed(),
                name: '',
                at: Date.now(),
                coin,
            };

            const { error: mergeErr } = await (db.rpc as (
                fn: string,
                args: Record<string, unknown>
            ) => PromiseLike<{ data: unknown; error: { message: string } | null }>)(
                'app_merge_user_state',
                { p_address: address, p_patch: { settings: { keychains: [...charms, charm] } } },
            );
            if (mergeErr) {
                // The charm failed to land — hand the crank money back.
                await db
                    .from('users')
                    .update({ sim_eth_balance: balance } as never)
                    .eq('address', address)
                    .eq('sim_eth_balance', balance - CRANK_PRICE_ETH);
                return serverError(mergeErr.message);
            }

            return NextResponse.json({
                charm,
                balance: balance - CRANK_PRICE_ETH,
                price: CRANK_PRICE_ETH,
            });
        }
        return badRequest('Balance changed mid-crank — try again');
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
