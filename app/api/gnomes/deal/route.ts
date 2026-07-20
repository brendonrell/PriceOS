// /api/gnomes/deal — the COUNTING HOUSE (Brendon, 2026-07-19).
//
// Gnomes are a NO-FEE system ("gnome ore fees"): the buyer pays the
// seller's ask straight to the seller's real wallet — 100%, wallet to
// wallet, no platform cut, no custody, no contract. PD's only job is the
// books: verify the payment on-chain, then flip the gnome. Two actions,
// both SIWE-guarded as the buyer:
//
//   { action: 'start', project_id }
//     Strikes the deal against the hung sign: records (project, seller,
//     buyer, ask snapshot) and returns the payment slip — the seller's
//     address, the exact value, and a data tag naming the deal that the
//     buyer's wallet stamps into the send. Re-calling returns the same
//     open deal (resume after a dropped connection).
//
//   { action: 'confirm', deal_id, tx_hash }
//     Verifies the payment against the chain (right payer, right seller,
//     exact value, the deal tag in the data, mined + 1 confirmation) and
//     flips the gnome to the buyer. Idempotent: a settled deal confirms
//     as settled; an unmined tx returns pending (poll again). The tx hash
//     is stored on first sight so a dropped session can always resume,
//     and a unique index guarantees one payment settles at most one deal.
//
// Reliability shape: the hanging sign is the standing commitment — the
// seller has no delivery step and no veto. A sign taken down after a deal
// was struck doesn't void the deal: the ask snapshot rules.

import { NextResponse } from 'next/server';
import { parseEther } from 'viem';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { publicClient } from '@/lib/indexer/chain';
import { createPing } from '@/lib/pings/createPing';

export const dynamic = 'force-dynamic';

interface Body {
  action?: 'start' | 'confirm';
  project_id?: string;
  deal_id?: string;
  tx_hash?: string;
}

type DealRow = {
  id: string;
  project_id: string;
  seller_address: string;
  buyer_address: string;
  ask_eth: number | string;
  status: string;
  tx_hash: string | null;
};

/** The data tag the buyer's wallet stamps into the send: gnome:<deal id>. */
function dealTag(dealId: string): `0x${string}` {
  return `0x${Buffer.from(`gnome:${dealId}`, 'utf8').toString('hex')}` as `0x${string}`;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const buyer = address.toLowerCase();
  const db = getSupabaseService();

  try {
    if (body.action === 'start') {
      const slug = (body.project_id ?? '').toLowerCase();
      if (!slug) return badRequest('Missing project_id');

      /* Resume an already-struck open deal first. */
      const existing = await db.from('gnome_deals').select('*')
        .eq('project_id', slug).eq('buyer_address', buyer).eq('status', 'open')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (existing.error) return serverError(existing.error.message);
      let deal = existing.data as DealRow | null;

      if (!deal) {
        const g = await db.from('gnomes').select('project_id, owner_address, ask_eth')
          .eq('project_id', slug).maybeSingle();
        if (g.error) return serverError(g.error.message);
        const row = g.data as { owner_address: string; ask_eth: number | string | null } | null;
        if (!row || row.ask_eth == null) return badRequest('No sign on this door');
        if (row.owner_address.toLowerCase() === buyer) return badRequest('Already your gnome');
        const ins = await db.from('gnome_deals').insert({
          project_id: slug,
          seller_address: row.owner_address.toLowerCase(),
          buyer_address: buyer,
          ask_eth: Number(row.ask_eth),
        } as never).select('*').single();
        if (ins.error) return serverError(ins.error.message);
        deal = ins.data as DealRow;
      }

      return NextResponse.json({
        deal_id: deal.id,
        to: deal.seller_address,
        value_eth: String(Number(deal.ask_eth)),
        data: dealTag(deal.id),
        tx_hash: deal.tx_hash,
      });
    }

    if (body.action === 'confirm') {
      const dealId = body.deal_id ?? '';
      const txHash = (body.tx_hash ?? '').toLowerCase();
      if (!dealId || !/^0x[0-9a-f]{64}$/.test(txHash)) return badRequest('Missing deal_id or tx_hash');

      const dRes = await db.from('gnome_deals').select('*').eq('id', dealId).maybeSingle();
      if (dRes.error) return serverError(dRes.error.message);
      const deal = dRes.data as DealRow | null;
      if (!deal) return badRequest('Unknown deal');
      if (deal.buyer_address.toLowerCase() !== buyer) return badRequest('Not your deal');
      if (deal.status === 'settled') return NextResponse.json({ settled: true });

      /* Remember the hash immediately so a dropped session can resume. */
      if (deal.tx_hash?.toLowerCase() !== txHash) {
        const remember = await db.from('gnome_deals').update({ tx_hash: txHash } as never).eq('id', dealId);
        // A unique-index hit here means this payment already settled another
        // deal — never accept it twice.
        if (remember.error) return badRequest('This payment already settled a deal');
      }

      /* Verify the payment on-chain. */
      const client = publicClient();
      let tx, receipt, latest;
      try {
        [tx, receipt, latest] = await Promise.all([
          client.getTransaction({ hash: txHash as `0x${string}` }),
          client.getTransactionReceipt({ hash: txHash as `0x${string}` }),
          client.getBlockNumber(),
        ]);
      } catch {
        return NextResponse.json({ pending: true }); // not mined / not seen yet
      }
      if (!tx || !receipt) return NextResponse.json({ pending: true });
      if (receipt.status !== 'success') return badRequest('Payment transaction failed');
      if (latest - receipt.blockNumber < BigInt(1)) return NextResponse.json({ pending: true });
      if (tx.from.toLowerCase() !== buyer) return badRequest('Payment not from the buyer');
      if ((tx.to ?? '').toLowerCase() !== deal.seller_address.toLowerCase()) return badRequest('Payment not to the seller');
      if (tx.value !== parseEther(String(Number(deal.ask_eth)))) return badRequest('Payment is not the exact ask');
      if (!tx.input.toLowerCase().includes(dealTag(deal.id).slice(2).toLowerCase())) {
        return badRequest('Payment does not name this deal');
      }

      /* The books: flip the gnome (only if the seller still holds it) and
         close the deal. */
      const flip = await db.from('gnomes')
        .update({ ask_eth: null, listed_at: null, owner_address: buyer } as never)
        .eq('project_id', deal.project_id)
        .eq('owner_address', deal.seller_address)
        .select('project_id');
      if (flip.error) return serverError(flip.error.message);
      if (!flip.data || flip.data.length === 0) {
        /* Already flipped (a replayed confirm) — or the gnome left the
           seller's hands some other way, which the deal model doesn't
           allow; either way check where it stands now. */
        const now = await db.from('gnomes').select('owner_address').eq('project_id', deal.project_id).maybeSingle();
        const holder = (now.data as { owner_address?: string } | null)?.owner_address?.toLowerCase();
        if (holder !== buyer) return serverError('The gnome could not be flipped — contact the hill');
      }
      const settle = await db.from('gnome_deals')
        .update({ status: 'settled', settled_at: new Date().toISOString() } as never)
        .eq('id', dealId);
      if (settle.error) return serverError(settle.error.message);

      /* The town crier — both parties hear the deal settle (best-effort,
         never blocks the books). Seller's row wears the buyer's handle;
         the buyer gets the receipt. */
      await Promise.all([
        createPing({
          recipientAddress: deal.seller_address,
          kind: 'PING',
          actorAddress: buyer,
          projectId: deal.project_id,
          amountEth: Number(deal.ask_eth),
          data: { gnome: true, side: 'sold', deal_id: deal.id },
        }),
        createPing({
          recipientAddress: buyer,
          kind: 'PING',
          projectId: deal.project_id,
          amountEth: Number(deal.ask_eth),
          data: { gnome: true, side: 'bought', deal_id: deal.id },
        }),
      ]);

      return NextResponse.json({ settled: true });
    }

    return badRequest('Unknown action');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
