'use client';

/*
 * TarotSpreadModal — TAROT SPREAD (Spell Book).
 *
 * A real tarot reading where your Collected pieces become the deck. The pill
 * opens this reading (Spite Book precedent: a spell pill drives a themed
 * surface). Three Major Arcana are drawn into Past · Present · Future, each
 * wearing one of your pieces as its face; the draw is fixed for the day and
 * re-rollable. Deterministic clientside — no server round-trip.
 *
 * Gated behind a collection floor (GATE): below it, the reading stays face-down
 * — an unlock hook that pulls you to collect (Brendon, 2026-07-16: get people
 * talking + attached to their collections). 22 = one piece per Major Arcana card.
 *
 * Mounted once in PriceOSShell; rides ModalContext for scroll-lock + Escape.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { paintOutput } from '../lib/state/ProjectContext';
import { getProject } from '../lib/project/registry';
import { drawReading, localDayKey, type TarotHolding, type DrawnCard } from '../lib/tarot/reading';

const VS15 = '︎';
/** Collection floor — one piece for each card of the Major Arcana. */
const GATE = 22;

/* One tarot card: the reader's piece painted as the face, the card's numeral +
   name, its orientation, and the woven read. A reversed card hangs upside-down —
   the ART flips, the plate stays readable (a real reversal, still legible). */
function TarotCardView({ card, dealDelay }: { card: DrawnCard; dealDelay: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        try { paintOutput(cv, card.holding.slug, card.holding.id, 360); } catch { /* unknown slug — leave blank */ }
    }, [card.holding.slug, card.holding.id]);
    const projName = getProject(card.holding.slug)?.displayName ?? card.holding.slug;
    return (
        <div className="tarot-card" style={{ animationDelay: `${dealDelay}ms` }}>
            <div className="tarot-card-pos">{card.position}</div>
            <div className={`tarot-card-frame${card.reversed ? ' reversed' : ''}`}>
                <canvas ref={ref} className="tarot-card-art" role="img" aria-label={`${projName} #${card.holding.id}`} />
                <div className="tarot-card-plate">
                    <span className="tarot-card-roman">{card.card.roman}</span>
                    <span className="tarot-card-name">{card.card.name}</span>
                    <span className="tarot-card-orient">{card.reversed ? 'REVERSED' : 'UPRIGHT'} · {card.card.keyword}</span>
                </div>
            </div>
            <div className="tarot-card-faceid">{projName} #{card.holding.id}</div>
            <p className="tarot-card-read">{card.read}</p>
        </div>
    );
}

export default function TarotSpreadModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const { isOpen, isTopStacked } = useModalLayer('tarot');

    const [holdings, setHoldings] = useState<TarotHolding[] | null>(null);
    const [total, setTotal] = useState<number | null>(null);
    const [reroll, setReroll] = useState(0);
    const dayKey = useMemo(() => localDayKey(), [isOpen]);

    // Load the reader's collection when the reading opens.
    useEffect(() => {
        if (!isOpen) return;
        if (!siweAddress) { setHoldings([]); setTotal(0); return; }
        let cancelled = false;
        setHoldings(null); setTotal(null);
        fetch(`/api/user/${siweAddress}/outputs`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                const hs: TarotHolding[] = Array.isArray(d.holdings)
                    ? d.holdings.map((h: { slug: string; token_id: number }) => ({ slug: h.slug, id: h.token_id }))
                    : [];
                setHoldings(hs);
                setTotal(typeof d.total === 'number' ? d.total : hs.length);
            })
            .catch(() => { if (!cancelled) { setHoldings([]); setTotal(0); } });
        return () => { cancelled = true; };
    }, [isOpen, siweAddress]);

    // Each fresh open lands on the day's canonical spread (re-roll from zero).
    useEffect(() => { if (isOpen) setReroll(0); }, [isOpen]);

    const owned = total ?? 0;
    const unlocked = owned >= GATE && (holdings?.length ?? 0) >= 3;

    const spread = useMemo(() => {
        if (!unlocked || !holdings || !siweAddress) return null;
        return drawReading(siweAddress, holdings, dayKey, reroll);
    }, [unlocked, holdings, siweAddress, dayKey, reroll]);

    const onReroll = () => {
        setReroll((r) => r + 1);
        showToast('Tarot: A NEW SPREAD');
    };

    return (
        <div
            className={`tarot-backdrop${isOpen ? ' active' : ''}`}
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Tarot Spread"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="tarot-sheet" onClick={(e) => e.stopPropagation()}>
                <div
                    className="tarot-close"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                >
                    {`×${VS15}`}
                </div>

                <div className="tarot-head">
                    <span className="tarot-head-glyph">{`▯▯▯${VS15}`}</span>
                    <span className="tarot-head-title">THE SPREAD</span>
                    <span className="tarot-head-sub">Past · Present · Future — dealt from your own collection</span>
                </div>

                {holdings === null || total === null ? (
                    <div className="tarot-loading">Shuffling the deck…</div>
                ) : !siweAddress ? (
                    <div className="tarot-locked">
                        <div className="tarot-veil" aria-hidden="true">{`▯${VS15}`}</div>
                        <div className="tarot-locked-title">THE CARDS AREN&apos;T READY</div>
                        <div className="tarot-locked-line">Connect your wallet to sit for a reading.</div>
                    </div>
                ) : !unlocked ? (
                    <div className="tarot-locked">
                        <div className="tarot-veil" aria-hidden="true">{`▯${VS15}`}</div>
                        <div className="tarot-locked-title">THE CARDS AREN&apos;T READY</div>
                        <div className="tarot-locked-line">
                            Hold <b>{GATE}</b> pieces to unlock your daily reading — one for each card of the Major Arcana.
                        </div>
                        <div className="tarot-progress">
                            <div className="tarot-progress-bar">
                                <div className="tarot-progress-fill" style={{ width: `${Math.min(100, (owned / GATE) * 100)}%` }} />
                            </div>
                            <div className="tarot-progress-count">{owned} / {GATE}</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="tarot-spread">
                            {spread!.map((c, i) => (
                                <TarotCardView key={`${c.position}-${reroll}`} card={c} dealDelay={i * 140} />
                            ))}
                        </div>
                        <div className="tarot-foot">
                            <button type="button" className="tarot-reroll" onClick={onReroll}>
                                {`↻${VS15}`} Draw again
                            </button>
                            <span className="tarot-foot-note">The cards are fixed for the day — a re-draw is yours to keep or ignore.</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
