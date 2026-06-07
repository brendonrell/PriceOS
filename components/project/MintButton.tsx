'use client';

/*
 * MintButton — the entire primary-mint flow, in the button. No navigation, no
 * modal: you sit on the project page, hit MINT, pick how many (max 22 per the
 * PDProject contract), confirm, and a progress bar fills the button; on success
 * a toast fires and the button briefly shows the result, then reverts to MINT.
 *
 * Chainless sim: "confirm" posts to /api/project/[slug]/mint. The real
 * wallet-confirm step slots in here when wired to pd-contracts.
 */

import { useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { MINT_FEE_ETH } from '../../lib/project/registry';

const MAX_PER_MINT = 22;

type Phase = 'idle' | 'choosing' | 'minting' | 'done';

export default function MintButton({
  slug,
  projectTitle,
  mintPrice,
  remaining,
}: {
  slug: string;
  projectTitle: string;
  mintPrice: number;
  remaining: number;
}) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [qty, setQty] = useState(1);
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState<{ count: number; balance: number } | null>(null);

  const max = Math.min(MAX_PER_MINT, Math.max(1, remaining));
  // Total = (mint price + platform mint fee) × qty. Fee is $0 for now but
  // always part of the math + shown, so turning it on flows straight through.
  const perOutput = mintPrice + MINT_FEE_ETH;
  const total = (perOutput * qty).toFixed(3);

  const start = () => {
    if (!siweAddress) { showToast('Connect your wallet to mint'); return; }
    setQty(1);
    setPhase('choosing');
  };

  const confirm = async () => {
    setPhase('minting');
    setPct(6);
    // Two rAFs so the CSS width transition runs from ~0 to near-full.
    requestAnimationFrame(() => requestAnimationFrame(() => setPct(92)));
    const minShow = new Promise((r) => setTimeout(r, 900));
    let ok = false;
    let j: { count?: number; balance?: number; error?: string } = {};
    try {
      const r = await fetch(`/api/project/${slug}/mint`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      j = await r.json().catch(() => ({}));
      ok = r.ok;
    } catch {
      /* network */
    }
    await minShow;
    setPct(100);
    if (!ok) {
      showToast(j?.error ? String(j.error) : 'Mint failed');
      setPhase('idle');
      setPct(0);
      return;
    }
    const count = j.count ?? qty;
    setResult({ count, balance: Number(j.balance ?? 0) });
    setPhase('done');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pd:project-refresh'));
    showToast(`Minted ${count} × ${projectTitle} · ${j.balance} ETH left`);
    setTimeout(() => { setPhase('idle'); setPct(0); setResult(null); }, 2800);
  };

  if (phase === 'choosing') {
    // Same MINT footprint, but the pill SPLITS down the middle into two fused
    // tabs — qty | CONFIRM — mirroring the artwork modal's modal-action-btn-wrap
    // (action + tab share one rounded shell, divided by a hairline). CONFIRM is
    // filled (inverted) so it reads "press me"; the ✕ is the slim secondary tab.
    return (
      <div className="btn-mint mint-chooser" role="group" aria-label={`Mint ${projectTitle}`}>
        <div className="mint-seg mint-seg-qty">
          <button type="button" className="mint-step" aria-label="Fewer" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span className="mint-qty-val">{qty}</span>
          <button type="button" className="mint-step" aria-label="More" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>+</button>
        </div>
        <button type="button" className="mint-seg mint-confirm" onClick={confirm}>
          <span className="mint-lbl">CONFIRM</span>
          <span className="mint-price">({total} ETH){MINT_FEE_ETH > 0 ? ` · incl. ${(MINT_FEE_ETH * qty).toFixed(3)} fee` : ''}</span>
        </button>
        <button type="button" className="mint-cancel" aria-label="Cancel" onClick={() => setPhase('idle')}>✕</button>
      </div>
    );
  }

  const label =
    phase === 'minting' ? 'MINTING…' : phase === 'done' ? `MINTED ✓ ×${result?.count ?? ''}` : 'MINT';
  const price =
    phase === 'done' && result ? `(${result.balance} ETH left)` : `(${perOutput} ETH)`;

  return (
    <button
      type="button"
      className="btn-mint"
      onClick={phase === 'idle' ? start : undefined}
      disabled={phase !== 'idle'}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {phase === 'minting' && (
        // The sliding bar — fills left→right as the mint resolves so the button
        // always reads "moving forward" (CLAUDE.md §9). Brendon's pick over ASCII.
        <span
          aria-hidden
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'rgba(255,255,255,0.28)', transition: 'width 0.9s ease' }}
        />
      )}
      <span className="mint-lbl" style={{ position: 'relative' }}>{label}</span>
      <span className="mint-price" style={{ position: 'relative' }}>{price}</span>
    </button>
  );
}
