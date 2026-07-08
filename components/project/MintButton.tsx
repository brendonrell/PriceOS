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

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useFiat } from '../../lib/state/FiatContext';
import { formatEthAmount } from '../../lib/format/eth';
import { MINT_FEE_ETH } from '../../lib/project/registry';
import { acquireWakeLock } from '../../lib/pwa/wakeLock';
import { storeMintPreviews } from '../../lib/art/storePreview';

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
  const { ethToFiat, ethToFiatValue, currency } = useFiat();
  const [phase, setPhase] = useState<Phase>('idle');
  const [qty, setQty] = useState(1);
  const [pct, setPct] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ count: number; balance: number } | null>(null);

  const max = Math.min(MAX_PER_MINT, Math.max(1, remaining));
  // Total = (mint price + platform mint fee) × qty. Fee is $0 for now but
  // always part of the math + shown, so turning it on flows straight through.
  const perOutput = mintPrice + MINT_FEE_ETH;
  const totalEth = perOutput * qty;
  const confirmFiat = ethToFiat(totalEth);
  const total = formatEthAmount(totalEth, !!confirmFiat);

  /* The pill is a FIXED width and posted prices must be 100% visible — never
     clipped (Brendon 2026-07-08). So we measure the readout and, only if it
     would exceed the pill's inner width (minus a thin 4px buffer), scale it down
     just enough to fit. At natural size nothing changes; when tight it eases
     down a hair so MINT + the full price/fiat all stay readable. */
  const faceRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (phase === 'done') { setScale(1); return; }
    setScale(1); // measure at natural size first
    const raf = requestAnimationFrame(() => {
      const face = faceRef.current, inner = innerRef.current;
      if (!face || !inner) return;
      const BUFFER = 4; // stay a hair inside the inner edge
      const available = face.clientWidth - BUFFER; // the room the readout has
      const natural = inner.offsetWidth;            // what it wants, unconstrained
      setScale(natural > available ? Math.max(0.5, available / natural) : 1);
    });
    return () => cancelAnimationFrame(raf);
    // ethToFiat identity changes when the rate loads → re-measure so a freshly
    // added ~fiat is scaled to fit immediately.
  }, [phase, mintPrice, currency, remaining, qty, ethToFiat]);

  const start = () => {
    if (!siweAddress) { showToast('Wallet: CONNECT TO MINT'); return; }
    setQty(1);
    setPhase('choosing');
  };

  const confirm = async () => {
    setPhase('minting');
    setPct(6);
    // Keep the screen awake for the duration of the mint so it never dims/sleeps
    // mid-action (no-op where the platform lacks the API). Released in finally.
    const releaseWakeLock = acquireWakeLock();
    // Two rAFs so the CSS width transition runs from ~0 to near-full.
    requestAnimationFrame(() => requestAnimationFrame(() => setPct(92)));
    const minShow = new Promise((r) => setTimeout(r, 900));
    let ok = false;
    let j: { count?: number; balance?: number; error?: string; minted?: number[] } = {};
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
    } finally {
      releaseWakeLock();
    }
    await minShow;
    setPct(100);
    if (!ok) {
      showToast(j?.error ? String(j.error) : 'Mint: FAILED');
      setPhase('idle');
      setPct(0);
      return;
    }
    // Pin each freshly-minted piece's preview PNG — the Arweave-writer sim.
    // Fire-and-forget: a deterministic render + upload that never delays the
    // buyer's done face or toast. Covers batch mints (one id per piece).
    if (Array.isArray(j.minted) && j.minted.length) void storeMintPreviews(slug, j.minted);
    const count = j.count ?? qty;
    // Balance trimmed to ≤3 decimals everywhere it shows — a raw float
    // ("99.97799999…") was what blew the done face out of the button.
    const balance = parseFloat(Number(j.balance ?? 0).toFixed(3));
    setResult({ count, balance });
    setPhase('done');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pd:project-refresh'));
    // Linger well past the default + fade gently — gives the buyer confidence
    // (Brendon 2026-06-13, doubled to 4000ms). Slow 700ms fade (vs 250).
    showToast(`Minted: ${count} × ${projectTitle} · ${balance} ETH left`, 4000, 700);
    setTimeout(() => { setPhase('idle'); setPct(0); setResult(null); }, 1600);
  };

  if (phase === 'choosing') {
    // Same MINT footprint, but the pill SPLITS down the middle into two fused
    // tabs — qty | CONFIRM — mirroring the artwork modal's modal-action-btn-wrap
    // (action + tab share one rounded shell, divided by a hairline). CONFIRM is
    // filled (inverted) so it reads "press me"; the ✕ is the slim secondary tab.
    return (
      <>
      <div className={`btn-mint mint-chooser${confirmFiat ? ' mint-chooser-fiat' : ''}`} role="group" aria-label={`Mint ${projectTitle}`}>
        <div className="mint-seg mint-seg-qty">
          <button type="button" className="mint-step" aria-label="Fewer" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span className="mint-qty-val">{qty}</span>
          <button type="button" className="mint-step" aria-label="More" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>+</button>
        </div>
        <button type="button" className="mint-seg mint-confirm" onClick={() => setConfirming(true)}>
          <span className="mint-lbl">CONFIRM</span>
          <span className="mint-price">({total} ETH){MINT_FEE_ETH > 0 ? ` · incl. ${(MINT_FEE_ETH * qty).toFixed(3)} fee` : ''}</span>
          {confirmFiat && <span className="mint-fiat">{confirmFiat}</span>}
        </button>
        <button type="button" className="mint-cancel" aria-label="Cancel" onClick={() => setPhase('idle')}>✕</button>
      </div>
      {/* Portal to <body> so the overlay is a true full-screen, screen-centred
          card — identical to the Starred unstar confirm. Rendered in-place it
          was confined/cramped by the project hero's stacking context
          (Brendon 2026-06-19, screenshots). */}
      {confirming && typeof document !== 'undefined' && createPortal(
        <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirming(false)}>
          <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
            <div className="ms-confirm-question">Mint {qty} × {projectTitle}?</div>
            <div className="ms-confirm-btns">
              <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirming(false)}>Cancel</button>
              <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={() => { setConfirming(false); void confirm(); }}>Mint</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      </>
    );
  }

  const label =
    phase === 'minting' ? 'MINTING…' : phase === 'done' ? `MINTED ✓ ×${result?.count ?? ''}` : 'MINT';
  // Fiat rides under the ETH price on the resting/minting faces only (the done
  // face shows a balance, not a price). Null unless a currency is turned on.
  const idleFiat = phase === 'done' ? null : ethToFiat(perOutput);
  // 4-digit ETH rule; leading 0 dropped in fiat mode.
  const ethAmt = formatEthAmount(perOutput, !!idleFiat);
  const price =
    phase === 'done' && result ? `(${result.balance} ETH left)` : `(${ethAmt} ETH)`;

  return (
    <button
      type="button"
      // The done face stacks label over balance at reduced sizes so the
      // success readout FITS the fixed 224px pill (it used to overflow and
      // clip on desktop — Brendon 2026-06-12).
      className={`btn-mint${phase === 'done' ? ' mint-done' : ''}${idleFiat && (ethToFiatValue(perOutput) ?? 0) >= 10 ? ' mint-fiat-on' : ''}`}
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
      {phase === 'done' ? (
        <>
          <span className="mint-lbl" style={{ position: 'relative' }}>{label}</span>
          <span className="mint-price" style={{ position: 'relative' }}>{price}</span>
        </>
      ) : (
        <span className="mint-face" ref={faceRef} style={{ position: 'relative' }}>
          <span
            className="mint-face-in"
            ref={innerRef}
            style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}
          >
            <span className="mint-lbl">{label}</span>
            <span className="mint-price">{price}</span>
            {idleFiat && (
              // Just the fiat is stacked — amount on top, currency code below — in
              // smaller text, sitting after the ETH price (Brendon 2026-07-08).
              <span className="mint-fiat">
                <span className="mint-fiat-amt">{idleFiat}</span>
                <span className="mint-fiat-cur">{currency}</span>
              </span>
            )}
          </span>
        </span>
      )}
    </button>
  );
}
