'use client';

/*
 * MarketActions — chainless secondary-market controls for one Output, shown
 * inside the output modal. Talks to /api/output/{slug}-{tokenId}/market.
 *
 * Owner sees: List / Cancel / Accept-top-offer. Non-owner sees: Buy (if
 * listed) / Make offer. Gated behind a SIWE session. After any action it
 * refetches and fires 'pd:project-refresh' so the gallery updates.
 *
 * Visuals are intentionally minimal (plain buttons) — styling is Brendon's.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';

interface MarketState {
  owner: string | null;
  listing: { price_eth: string } | null;
  offers: { id: string; bidder: string; price_eth: string }[];
  viewer: { address: string; isOwner: boolean; balance: number } | null;
}

export default function MarketActions({ slug, tokenId }: { slug: string; tokenId: number }) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const [state, setState] = useState<MarketState | null>(null);
  const [busy, setBusy] = useState(false);

  const id = `${slug}-${tokenId}`;

  const load = useCallback(() => {
    fetch(`/api/output/${id}/market`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setState(d))
      .catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const act = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      setBusy(true);
      try {
        const r = await fetch(`/api/output/${id}/market`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          showToast(j?.error ? String(j.error) : 'Action failed');
        } else {
          if (action === 'list') showToast(`Listed for ${j.listed} ETH`);
          else if (action === 'cancel') showToast('Listing cancelled');
          else if (action === 'buy') showToast(`Bought for ${j.bought} ETH`);
          else if (action === 'offer') showToast(`Offer placed: ${j.offered} ETH`);
          else if (action === 'accept') showToast(`Sold for ${j.sold} ETH`);
          load();
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('pd:project-refresh'));
        }
      } finally {
        setBusy(false);
      }
    },
    [id, showToast, load],
  );

  const promptPrice = (label: string): number | null => {
    const raw = typeof window !== 'undefined' ? window.prompt(label) : null;
    if (raw == null) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  if (!siweAddress) {
    return <div className="market-actions market-actions-note">Connect your wallet to trade this Output.</div>;
  }
  if (!state) return null;

  const isOwner = state.viewer?.isOwner ?? false;
  const topOffer = state.offers[0];

  return (
    <div className="market-actions">
      {!isOwner && state.listing && (
        <button className="market-btn market-buy" disabled={busy} onClick={() => act('buy')}>
          BUY ({state.listing.price_eth} ETH)
        </button>
      )}
      {!isOwner && (
        <button
          className="market-btn"
          disabled={busy}
          onClick={() => { const p = promptPrice('Offer amount in ETH:'); if (p) act('offer', { price: p }); }}
        >
          MAKE OFFER
        </button>
      )}
      {isOwner && !state.listing && (
        <button
          className="market-btn"
          disabled={busy}
          onClick={() => { const p = promptPrice('List price in ETH:'); if (p) act('list', { price: p }); }}
        >
          LIST FOR SALE
        </button>
      )}
      {isOwner && state.listing && (
        <button className="market-btn" disabled={busy} onClick={() => act('cancel')}>
          CANCEL LISTING ({state.listing.price_eth} ETH)
        </button>
      )}
      {isOwner && topOffer && (
        <button className="market-btn market-accept" disabled={busy} onClick={() => act('accept', { offerId: topOffer.id })}>
          ACCEPT TOP OFFER ({topOffer.price_eth} ETH)
        </button>
      )}
      {state.offers.length > 0 && (
        <span className="market-offer-count">{state.offers.length} open offer{state.offers.length > 1 ? 's' : ''}</span>
      )}
    </div>
  );
}
