'use client';

/*
 * PriceSpriteModal
 *
 * Sim id #priceSpriteModal — original markup sim.html 4292–4358; the
 * body was redesigned 2026-06-12 (Brendon: "take it from 5-6/10 to
 * 10/10, aimed at the Xbox-achievements + PriceRank + Anointment end
 * state"). Opened from clicking the asciiSpriteWrap or asciiPfpBadge
 * inside the user-menu-wrapper. Rides the platform-modal scaffold
 * (close-hint, modal-info) like the Familiar modal.
 *
 * Sim refs (still authoritative for open/close + hero sync):
 *   open/close ....... sim.html 12975–13026
 *   hero sync ........ sim.html 12966–12973 (_syncHeroSprite)
 *
 * Hero sprite is subscribed to priceSpriteEngine (Ship 1+) — frame
 * state mirrors the menu sprite in real time, and the composed sprite
 * renders per-slot when an identity is bound so blink/yawn/sleep
 * don't squish the sprite.
 *
 * PRICERANK is THE one progression number on PD — ONE name, DEFAULT 0
 * (Brendon 2026-06-10). Medallion glyph and XP labels read
 * useAuth().priceRank (users.price_rank). There is no separate
 * "account level" concept. XP bar renders a `-- / --` placeholder
 * (with an idle scanner sweep) until the rank-up workstream lands.
 *
 * Forward-looking surfaces (all honest about being locked/unwired):
 *   - ACHIEVEMENTS rail — Xbox-style tiles, ALL LOCKED. The set below
 *     is a placeholder drawn from real planned mechanics (mints, buys,
 *     breadcrumbs, 60-day hold, Anointment/Egregore per the ClickUp
 *     Anointment & Egregore spec, doc page 2kyd6gx6-1434). Names/pts
 *     are Brendon's to rename; unlock wiring follows the user-stats
 *     indexer + achievements workstream.
 *   - ANOINTMENT socket — empty-state preview of the one-✢-per-account
 *     pledge (60-day lock). Tapping toasts COMING SOON.
 *   - Score-breakdown tiles remain sim-faithful mocks (sim 4319–4348)
 *     pending the real user-stats indexer; values count up on open.
 *   - Identity Plate Export → placeholder toast.
 *
 * Hooks discipline: every hook before any conditional return; the
 * component renders the modal element on every render and gates
 * internals on `isOpen`.
 */

import { useEffect, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useAuth } from '../lib/state/AuthContext';
import SpriteEyeSlot from './SpriteEyeSlot';
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
    { label: 'Volume · ETH', value: '4.22', pts: '+84 pts'  },
    { label: 'Breadcrumbs',      value: '128',  pts: '+64 pts'  },
    { label: 'Artists Followed', value: '92',   pts: '+92 pts'  },
    { label: 'Days Active',      value: '222',  pts: '+100 pts' },
];

interface Achievement {
    glyph: string;
    name: string;
    desc: string;
    pts: number;
    secret?: boolean;
}

/* Placeholder achievement set — every tile LOCKED until the
   achievements workstream wires real unlock checks. Drawn from real
   planned mechanics only (no invented features): mint/buy/breadcrumb
   metrics mirror the score rows; ANOINTED + THE EGREGORE come from
   the ClickUp Anointment & Egregore spec; DIAMOND PALMS uses PD's
   sacred 60-day number. */
const ACHIEVEMENTS: readonly Achievement[] = [
    { glyph: '◍', name: 'First Light',      desc: 'Mint your first Output',                    pts: 15 },
    { glyph: '⊚', name: 'Patron',           desc: 'Make your first secondary buy',             pts: 15 },
    { glyph: '∴', name: 'Breadcrumb Trail', desc: 'Leave 10 breadcrumbs',                      pts: 10 },
    { glyph: '◈', name: 'Diamond Palms',    desc: 'Hold an Output for 60 days',                pts: 30 },
    { glyph: '⌗', name: 'The Collector',    desc: 'Own Outputs from 5 Projects',               pts: 20 },
    { glyph: '✢', name: 'Anointed',         desc: 'Place your Anointment',                     pts: 25 },
    { glyph: '⍎', name: 'The Egregore',     desc: 'Your anointed Project awakens its Egregore', pts: 100 },
    { glyph: '⁇', name: 'Secret',           desc: 'Keep playing',                              pts: 25, secret: true },
];
const ACH_TOTAL_PTS = ACHIEVEMENTS.reduce((sum, a) => sum + a.pts, 0);

/* Counts a numeric string up from 0 on open — decimals preserved
   ('4.22' animates as 0.00 → 4.22). Snaps straight to the target when
   the value isn't numeric or the user prefers reduced motion. */
function CountUpValue({ value, active }: { value: string; active: boolean }) {
    const [display, setDisplay] = useState(value);
    useEffect(() => {
        if (!active) return;
        const target = parseFloat(value);
        if (
            !isFinite(target) ||
            (typeof window !== 'undefined' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        ) {
            setDisplay(value);
            return;
        }
        const decimals = value.includes('.') ? value.split('.')[1].length : 0;
        const duration = 900;
        const t0 = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay((target * eased).toFixed(decimals));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        setDisplay((0).toFixed(decimals));
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active, value]);
    return <>{display}</>;
}

export default function PriceSpriteModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const { priceRank } = useAuth();
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
                {`×${VS15}`}
            </div>

            <div className="modal-info ps-body">
                <div className="modal-title ps-reveal ps-d1" style={{ marginBottom: 6 }}>
                    PRICESPRITE
                </div>

                {/* Hero sprite — subscribed to the same priceSpriteEngine
                    that drives the menu sprite. Frame.face / transform /
                    sleeping mirror the menu in real time. Renders per
                    slot when composed (frame.parts) so blink / yawn /
                    sleep don't squish; falls back to single-string
                    face for the standin (parts === null). The float
                    animation lives on the inner wrapper so it never
                    fights the engine's inline transform on the sprite. */}
                <div className="ps-hero ps-reveal ps-d2" aria-hidden="true">
                    <span className="ps-hero-float">
                        <span
                            className={`ps-hero-sprite${frame.sleeping ? ' sleeping' : ''}`}
                            id="priceSpriteHeroSprite"
                            style={{ transform: frame.transform }}
                        >
                            {frame.parts ? (
                                <>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-bracketL">{frame.parts.bracketL}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-armL">{frame.parts.armL}</span>
                                    <SpriteEyeSlot className="ascii-sprite-slot ascii-sprite-slot-eyeL" text={frame.parts.eyeL} />
                                    <span className="ascii-sprite-slot ascii-sprite-slot-mouth">{frame.parts.mouth}</span>
                                    <SpriteEyeSlot className="ascii-sprite-slot ascii-sprite-slot-eyeR" text={frame.parts.eyeR} />
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
                    </span>
                </div>

                {/* PRICERANK medallion — live from useAuth().priceRank
                    (users.price_rank). **DEFAULT IS 0 — we start at
                    zero** (Brendon, 2026-06-10). ⓿ for 0, then ❶
                    through ❿ (U+2776..U+277F) once the rank-up rules
                    exist. The retired users.account_level column must
                    never feed any surface. */}
                <div className="ps-rank-wrap ps-reveal ps-d3">
                    <div className="ps-rank-medallion">
                        <span className="ps-rank-glyph">
                            {priceRank <= 0
                                ? '⓿'
                                : String.fromCodePoint(0x2775 + Math.min(priceRank, 10))}
                        </span>
                    </div>
                    <div className="ps-rank-caption">PRICERANK</div>
                </div>

                {/* Progress to the next PriceRank — XP curve isn't locked
                    yet so the fill is 0% and labels read `-- / -- XP`;
                    an idle scanner sweep keeps the bar alive (§9: always
                    feel moving). Real wiring follows the rank-up
                    workstream. */}
                <div className="ps-next-wrap ps-reveal ps-d3">
                    <div className="ps-next-bar">
                        <div className="ps-next-fill" style={{ width: '0%' }} />
                    </div>
                    <div className="ps-next-labels">
                        <span>{`rank ${priceRank} · -- / -- XP`}</span>
                        <span>{`rank ${priceRank + 1} →`}</span>
                    </div>
                </div>

                {/* ACHIEVEMENTS — Xbox-style rail, all tiles locked until
                    the achievements workstream lands. Tap a tile to see
                    its requirement (no hover on mobile). */}
                <div className="ps-section-header ps-ach-header ps-reveal ps-d4">
                    <span>ACHIEVEMENTS</span>
                    <span className="ps-ach-tally">
                        {`0 / ${ACHIEVEMENTS.length} · 0 / ${ACH_TOTAL_PTS} PTS`}
                    </span>
                </div>
                <div className="ps-ach-rail ps-reveal ps-d4">
                    {ACHIEVEMENTS.map((a) => (
                        <button
                            className="ps-ach-tile"
                            type="button"
                            key={a.name}
                            onClick={(e) => {
                                e.stopPropagation();
                                showToast(
                                    a.secret
                                        ? 'SECRET ACHIEVEMENT — keep playing'
                                        : `${a.name.toUpperCase()} — ${a.desc} (+${a.pts} PTS)`
                                );
                            }}
                        >
                            <span className="ps-ach-glyph">{`${a.glyph}${VS15}`}</span>
                            <span className="ps-ach-name">{a.name}</span>
                            <span className="ps-ach-pts">{`${a.pts} PTS`}</span>
                        </button>
                    ))}
                </div>

                {/* ANOINTMENT socket — empty-state preview of the
                    one-✢-per-account pledge (ClickUp spec: zero-sum,
                    60-day lock). Wiring lands with the anointment
                    workstream; tap toasts COMING SOON. */}
                <div className="ps-section-header ps-reveal ps-d5">ANOINTMENT</div>
                <div
                    className="ps-anoint ps-reveal ps-d5"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        showToast('Anointment: COMING SOON');
                    }}
                >
                    <span className="ps-anoint-mark">{`✢${VS15}`}</span>
                    <span className="ps-anoint-copy">
                        <span className="ps-anoint-state">UNPLACED</span>
                        <span className="ps-anoint-sub">
                            one pledge per account · locks 60 days
                        </span>
                    </span>
                </div>

                <div className="ps-section-header ps-reveal ps-d6">SCORE BREAKDOWN</div>
                <div className="ps-metrics ps-reveal ps-d6">
                    {SCORE_ROWS.map((row) => (
                        <div className="ps-metric" key={row.label}>
                            <div className="ps-metric-label">{row.label}</div>
                            <div className="ps-metric-val">
                                <CountUpValue value={row.value} active={isOpen} />
                            </div>
                            <div className="ps-metric-pts">{row.pts}</div>
                        </div>
                    ))}
                </div>

                {/* Identity Plate Export — placeholder toast, sim 4353. */}
                <div className="ps-action-row ps-reveal ps-d7">
                    <button
                        className="ps-action-btn"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            showToast('Identity Plate Export: COMING SOON');
                        }}
                    >
                        <span className="ps-action-icon">{`⍈${VS15}`}</span>{' '}
                        EXPORT IDENTITY PLATE
                    </button>
                </div>
            </div>
        </div>
    );
}
