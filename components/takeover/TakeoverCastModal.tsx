'use client';

/*
 * TakeoverCastModal — cast a HOSTILE TAKEOVER.
 *
 * Opened from another collector's profile (modal payload slot carries the
 * target address + handle). One sheet, three facts, one irreversible button:
 * pick the position (only 3+-piece holdings are targetable), name the
 * per-piece price (the 1.2× premium floor is shown and enforced), read the
 * terms — 72 HOURS · PUBLIC · NON-CANCELLABLE — and CAST.
 *
 * Rides the house platform-modal scaffold (same chrome as every modal).
 */

import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal, useModalLayer } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';

interface Position { slug: string; title: string; pieces: number; min_price_eth: number | null }

export default function TakeoverCastModal() {
  const { openModal, close } = useModal();
  const { showToast } = useToast();
  const { isOpen, isTopStacked } = useModalLayer('takeover');
  const target = (openModal?.slug ?? '').toLowerCase();
  const targetLabel = typeof openModal?.payload === 'string' && openModal.payload ? `@${openModal.payload}` : `${target.slice(0, 6)}…${target.slice(-4)}`;

  const [positions, setPositions] = useState<Position[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !target || loadedFor.current === target) return;
    loadedFor.current = target;
    setPositions(null);
    setPick(null);
    setPrice('');
    fetch(`/api/takeover?castinfo=${encodeURIComponent(target)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPositions((j?.positions as Position[]) ?? []))
      .catch(() => setPositions([]));
  }, [isOpen, target]);
  useEffect(() => {
    if (!isOpen) loadedFor.current = null;
  }, [isOpen]);

  const chosen = positions?.find((p) => p.slug === pick) ?? null;
  const priceN = Number(price);
  const meetsPremium = chosen != null && priceN > 0 &&
    (chosen.min_price_eth == null || priceN >= chosen.min_price_eth - 1e-9);

  const cast = async () => {
    if (!chosen || !meetsPremium || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/takeover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target, slug: chosen.slug, priceEth: priceN }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; pieces?: number };
      if (!res.ok || !j.ok) {
        showToast(`Takeover: REFUSED — ${j.error ?? 'try again'}`);
      } else {
        showToast(`Takeover: CAST · ${j.pieces} pieces · 72h`);
        window.dispatchEvent(new Event('pd:project-refresh'));
        close();
      }
    } catch {
      showToast('Takeover: REFUSED — network');
    } finally {
      setBusy(false);
    }
  };

  const onBackdropClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) close();
    },
    [close],
  );

  return (
    <div
      id="takeoverModal"
      className={`platform-modal${isOpen ? ' active' : ''}`}
      data-stack-top={isTopStacked || undefined}
      role="dialog"
      aria-modal="true"
      onClick={onBackdropClick}
    >
      <div
        className="close-hint"
        role="button"
        tabIndex={0}
        onClick={close}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
        title="Close"
      >
        {'×'}{'︎'}
      </div>
      {isOpen && (
        <div className="modal-info tko-sheet" style={{ marginTop: 0, maxWidth: 460, width: '100%' }}>
          <div className="tko-head">{'⚑︎'} TAKEOVER</div>
          <div className="tko-sub">Target: <span className="tko-target">{targetLabel}</span></div>

          {positions == null ? (
            <div className="tko-line">Reading their holdings…</div>
          ) : positions.length === 0 ? (
            <div className="tko-line">No targetable position — a takeover needs 3+ pieces of one project.</div>
          ) : (
            <>
              <div className="tko-label">THE POSITION</div>
              <div className="tko-positions">
                {positions.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    className={`tko-pos${pick === p.slug ? ' picked' : ''}`}
                    onClick={() => setPick(p.slug)}
                  >
                    <span className="tko-pos-name">{p.title}</span>
                    <span className="tko-pos-count">{p.pieces} pieces</span>
                  </button>
                ))}
              </div>
              {chosen && (
                <>
                  <div className="tko-label">PER-PIECE PRICE (ETH)</div>
                  <input
                    className="tko-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.001"
                    placeholder={chosen.min_price_eth != null ? `min ${chosen.min_price_eth}` : '0.00'}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <div className="tko-line">
                    {chosen.min_price_eth != null
                      ? `Premium floor: ${chosen.min_price_eth} ETH (1.2× their market) · total exposure ${priceN > 0 ? Number((priceN * chosen.pieces).toFixed(4)) : '—'} ETH`
                      : 'No reference price on this project yet — the cast will be refused until one exists.'}
                  </div>
                  <div className="tko-terms">72 HOURS · PUBLIC · NON-CANCELLABLE</div>
                  <button
                    type="button"
                    className="tko-cast"
                    disabled={!meetsPremium || busy}
                    onClick={cast}
                  >
                    {busy ? 'CASTING…' : `CAST ON ${chosen.pieces} PIECES`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
