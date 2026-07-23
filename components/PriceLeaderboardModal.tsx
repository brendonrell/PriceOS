'use client';

/*
 * PriceLeaderboardModal — TOP HOLDERS by $PRICE held (Brendon, 2026-07-23).
 *
 * The $PRICE sibling of LeaderboardModal. Rides the SAME Followers-Manager
 * COMPACT shell (sticker-mgr-backdrop + ambient-pop + followers-pop) and the
 * exact fm-row / lb-row anatomy, so a row reads identically to the PriceScore
 * board — position · sprite · @name, with the amount held on the right. Ranked
 * purely by $PRICE balance (the price-holdings sweep fills the rank); your own
 * row is highlighted.
 *
 * Opened from the $PRICE link in the Petey logo menu AND by tapping your shown
 * $PRICE balance in Wallet.
 *
 * Title icon = △, the Top Holders mark (GLYPHS.md — the hollow triangle freed
 * for exactly this). The header carries the shared ▶ store-button (the Sticker
 * Manager's), here labelled ETHERSCAN → the live $PRICE contract (the link the
 * Petey $PRICE item used to point at).
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import CollectedPair from './hero/CollectedPair';
import type { PriceHolderRow } from '../app/api/leaderboard/price/route';

const VS15 = '︎';
/* Podium medals for the top three (GLYPHS.md §7); ranks 4+ stay plain. */
const MEDALS = [`❶${VS15}`, `❷${VS15}`, `❸${VS15}`];
/* $PRICE ERC-20 on Etherscan (CLAUDE.md §2) — the link the Petey $PRICE item
   carried before it became the board's door. */
const ETHERSCAN_URL =
  'https://etherscan.io/address/0x173a012c7c8ca3cfb531dcad84a40c53dbe74638';

/* Whole-token amount → readable string. Under 1,000 keeps two decimals; larger
   holdings round to whole tokens so the number stays glanceable. */
function fmtHeld(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: n >= 1000 ? 0 : 2 });
}

export default function PriceLeaderboardModal() {
  const { close } = useModal();
  const { siweAddress } = useAuth();
  const { isOpen, isTopStacked } = useModalLayer('price-leaderboard');

  const [rows, setRows] = useState<PriceHolderRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* Freeze the page underneath while open (matches the Followers Manager). */
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  /* Top 100 — fetched fresh on every open (holdings move). */
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setLoading(true);
    fetch('/api/leaderboard/price', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: PriceHolderRow[] } | null) => {
        if (!alive) return;
        setRows(Array.isArray(d?.rows) ? d.rows : []);
      })
      .catch(() => { if (alive) setRows([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const me = siweAddress?.toLowerCase() ?? null;

  return createPortal(
    <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="Top Holders" data-stack-top={isTopStacked || undefined} onClick={close}>
      <div className="ambient-pop followers-pop price-lb-pop" role="dialog" aria-label="Top Holders" onClick={(e) => e.stopPropagation()}>
        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
          {`×${VS15}`}
        </span>
        <div className="ambient-pop-title">
          <span className="ambient-pop-title-text">
            <span className="smgr-title-ic">{`△${VS15}`}</span>{' '}
            <span className="smgr-title-words">TOP HOLDERS · $PRICE</span>
          </span>
          <a
            className="smgr-store"
            href={ETHERSCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="$PRICE on Etherscan"
          >
            <span className="smgr-store-ic">{`▶${VS15}`}</span> ETHERSCAN
          </a>
        </div>
        <div className="followers-pop-body">
          <div className="fm-list">
            {loading && rows.length === 0 ? (
              <div className="fm-empty fm-loading">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="fm-empty">No ranked holders yet — the board is wide open.</div>
            ) : (
              rows.map((r, i) => (
                <div className={`fm-row lb-row${i < 3 ? ` lb-podium lb-rank${i + 1}` : ''}${me === r.address ? ' lb-me' : ''}`} key={r.address}>
                  <span className="lb-pos">{i < 3 ? MEDALS[i] : i + 1}</span>
                  <div className="fm-row-main">
                    <div className="fm-row-id">
                      <CollectedPair handle={r.handle} />
                    </div>
                    <div className="fm-row-stats">
                      <span className="fm-stat" title="$PRICE held">
                        <b className="lb-score-num">{fmtHeld(r.priceHeld)}</b>
                        <span className="lb-price-unit">PRICE</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
