'use client';

/*
 * PriceSpriteModal
 *
 * Sim id #priceSpriteModal — sim.html 4292–4358. Opened from clicking
 * the asciiSpriteWrap or asciiPfpBadge inside the user-menu-wrapper
 * (sim 4449, 4452). Mirrors the Familiar modal visual language
 * (platform-modal, close-hint, modal-info).
 *
 * Sim refs:
 *   markup ........... sim.html 4292–4358
 *   open/close ....... sim.html 12975–13026
 *   hero sync ........ sim.html 12966–12973 (_syncHeroSprite)
 *
 * Hero sprite is subscribed to priceSpriteEngine (Ship 1+) — frame
 * state mirrors the menu sprite in real time, and the composed sprite
 * renders per-slot when an identity is bound so blink/yawn/sleep
 * don't squish the sprite.
 *
 * PRICERANK readout is live from useAuth().priceRank (users.price_rank;
 * DEFAULT 0 — Brendon 2026-06-10). The lvl/XP labels are the separate
 * accountLevel axis. Curve and Xbox-style achievements are still
 * deferred to a dedicated workstream; XP bar renders a `-- / --`
 * placeholder until that lands, and the six score-breakdown rows
 * below the bar are still sim-faithful mocks pending the real
 * user-stats indexer.
 *
 * Surfaces deferred:
 *   - Identity Plate Export → placeholder toast.
 *   - Live XP / score-breakdown — real wiring goes through the
 *     user-stats indexer in a dedicated workstream.
 *
 * Hooks discipline: every hook before any conditional return; the
 * component renders the modal element on every render and gates
 * internals on `isOpen`.
 */

import { useEffect, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useAuth } from '../lib/state/AuthContext';
import {
    getSpriteFrame,
    subscribeSprite,
    type SpriteFrame,
} from '../lib/engines/priceSpriteEngine';

const VS15 = '\uFE0E';

interface ScoreRow {
    label: string;
    value: string;
    pts: string;
}

/* Mock score breakdown — sim.html 4319–4348 verbatim. Six rows that
   compose the LEVEL display from contributing activity metrics. */
const SCORE_ROWS: readonly ScoreRow[] = [
    { label: 'Primary Mints',    value: '17',   pts: '+170 pts' },
    { label: 'Secondary Buys',   value: '34',   pts: '+170 pts' },
    { label: 'Volume \u00B7 ETH', value: '4.22', pts: '+84 pts'  },
    { label: 'Breadcrumbs',      value: '128',  pts: '+64 pts'  },
    { label: 'Artists Followed', value: '92',   pts: '+92 pts'  },
    { label: 'Days Active',      value: '222',  pts: '+100 pts' },
];

export default function PriceSpriteModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const { accountLevel, priceRank } = useAuth();
    const isOpen = openModal?.name === 'priceSprite';

    /* Mirror priceSpriteEngine into the modal hero so the hero's
       blink/turn/yawn/sleep stays in sync with the menu sprite (sim
       12135-12143 + 12988-12995). Subscribe only while the modal is
       open — when closed, the hero isn't visible and we shouldn't
       hold the engine running on its behalf. */
    const [frame, setFrame] = useState<SpriteFrame>(() => getSpriteFrame());
    useEffect(() => {
        if (!isOpen) return;
        setFrame(getSpriteFrame());
        const unsubscribe = subscribeSprite(() => {
            setFrame(getSpriteFrame());
        });
        return unsubscribe;
    }, [isOpen]);

    return (
        <div
            id="priceSpriteModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) close();
            }}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    close();
                }}
                title="Close"
            >
                {`\u00D7${VS15}`}
            </div>

            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 440, width: '100%' }}
            >
                <div className="modal-title" style={{ marginBottom: 6 }}>
                    PRICESPRITE
                </div>

                {/* Hero sprite — subscribed to the same priceSpriteEngine
                    that drives the menu sprite. Frame.face / transform /
                    sleeping mirror the menu in real time. Renders per
                    slot when composed (frame.parts) so blink / yawn /
                    sleep don't squish; falls back to single-string
                    face for the standin (parts === null). */}
                <div className="ps-hero" aria-hidden="true">
                    <span
                        className={`ps-hero-sprite${frame.sleeping ? ' sleeping' : ''}`}
                        id="priceSpriteHeroSprite"
                        style={{ transform: frame.transform }}
                    >
                        {frame.parts ? (
                            <>
                                <span className="ascii-sprite-slot ascii-sprite-slot-bracketL">{frame.parts.bracketL}</span>
                                <span className="ascii-sprite-slot ascii-sprite-slot-armL">{frame.parts.armL}</span>
                                <span className="ascii-sprite-slot ascii-sprite-slot-eyeL">{frame.parts.eyeL}</span>
                                <span className="ascii-sprite-slot ascii-sprite-slot-mouth">{frame.parts.mouth}</span>
                                <span className="ascii-sprite-slot ascii-sprite-slot-eyeR">{frame.parts.eyeR}</span>
                                <span className="ascii-sprite-slot ascii-sprite-slot-bracketR">{frame.parts.bracketR}</span>
                                <span className="ascii-sprite-slot ascii-sprite-slot-armR">{frame.parts.armR}</span>
                                {frame.parts.trail && (
                                    <span className="ascii-sprite-slot ascii-sprite-slot-trail">{frame.parts.trail}</span>
                                )}
                            </>
                        ) : (
                            frame.face
                        )}
                    </span>
                </div>

                {/* PRICERANK — live from useAuth().priceRank, which is
                    users.price_rank. **DEFAULT IS 0** (Brendon, 2026-06-10
                    — agreed spec; an earlier build wired this readout to
                    accountLevel by mistake, which made everyone read rank 1).
                    ⓿ for 0, then ❶ through ❿ (U+2776..U+277F) once the
                    rank-up rules exist. accountLevel is a separate axis
                    (the lvl/XP labels below) and must never feed this. */}
                <div className="ps-level-row">
                    <div className="ps-level-label">PRICERANK</div>
                    <div className="ps-level-value">
                        {priceRank <= 0
                            ? '\u24FF'
                            : String.fromCodePoint(0x2775 + Math.min(priceRank, 10))}
                    </div>
                </div>

                {/* Progress bar to next level — XP curve isn't locked yet
                    so the bar shows 0% and the labels read `-- / -- XP`.
                    Real wiring follows when the curve workstream lands. */}
                <div className="ps-next-wrap">
                    <div className="ps-next-bar">
                        <div
                            className="ps-next-fill"
                            style={{ width: '0%' }}
                        />
                    </div>
                    <div className="ps-next-labels">
                        <span>{`lvl ${accountLevel} \u00B7 -- / -- XP`}</span>
                        <span>{`lvl ${accountLevel + 1} \u2192`}</span>
                    </div>
                </div>

                <div className="ps-section-header">SCORE BREAKDOWN</div>
                <div className="ps-metrics">
                    {SCORE_ROWS.map((row) => (
                        <div className="ps-metric" key={row.label}>
                            <div className="ps-metric-label">{row.label}</div>
                            <div className="ps-metric-val">{row.value}</div>
                            <div className="ps-metric-pts">{row.pts}</div>
                        </div>
                    ))}
                </div>

                {/* Identity Plate Export — placeholder toast, sim 4353. */}
                <div className="ps-action-row">
                    <button
                        className="ps-action-btn"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            showToast('Identity Plate Export: COMING SOON');
                        }}
                    >
                        <span className="ps-action-icon">{`\u2348${VS15}`}</span>{' '}
                        EXPORT IDENTITY PLATE
                    </button>
                </div>
            </div>
        </div>
    );
}
