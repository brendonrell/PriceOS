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
 *   - ACHIEVEMENTS rail — Xbox-style tiles off the REAL merged catalog
 *     (lib/achievements/catalog). For the logged-in wallet we fetch
 *     /api/achievements/{address} on open for the unlocked set + live
 *     PriceScore; tiles paint unlocked/locked, secret+locked show as
 *     "???". Tally = unlocked / TOTAL_COUNT · score / MAX_PRICE_SCORE.
 *   - ANOINTMENT socket — empty-state preview of the one-✢-per-account
 *     pledge (60-day lock). Tapping toasts COMING SOON.
 *   - Score-breakdown tiles remain sim-faithful mocks (sim 4319–4348)
 *     pending the real user-stats indexer; values count up on open.
 *   - Identity Plate Export → builds a King-Mode share card (lib/output/
 *     receipt: the third document beside the Rarity/Trade receipts) — the live
 *     PriceSprite as the hero, the @handle headline, and PriceRank/Score/
 *     Streak/Achievements on the user's colorway accent — and hands the PNG to
 *     the native share sheet (download fallback), the same path as the receipts.
 *
 * Hooks discipline: every hook before any conditional return; the
 * component renders the modal element on every render and gates
 * internals on `isOpen`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useAuth } from '../lib/state/AuthContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useRouter } from 'next/navigation';
import { useDragScroll } from '../lib/hooks/useDragScroll';
import { useMyAnoint } from '../lib/anoint/useAnoint';
import { rankProgress, STREAK_ACTIVATION_DAYS } from '../lib/achievements/tiers';
import {
    ACHIEVEMENTS,
    MAX_PRICE_SCORE,
    TOTAL_COUNT,
    type AchievementCategory,
} from '../lib/achievements/catalog';
import {
    tileGlyph,
    CATEGORY_GLYPH,
    CATEGORY_ORDER,
    CATEGORY_LABEL,
} from './achievements/AchievementsGrid';
import { ACHIEVEMENTS_ICON } from '../lib/achievements/icon';
import SpriteEyeSlot from './SpriteEyeSlot';
import {
    getSpriteFrame,
    subscribeSprite,
    type SpriteFrame,
} from '../lib/engines/priceSpriteEngine';
import { shareIdentityPlate } from '../lib/output/receipt';

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

/* The achievements rail now reads the REAL merged catalog
   (lib/achievements/catalog). For the logged-in wallet we fetch
   /api/achievements/{address} on open to learn which ids are unlocked +
   the live PriceScore; tiles render unlocked/locked from that set. */

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
    const { close, closeAll, open } = useModal();
    const { showToast } = useToast();
    const { priceRank, priceScore, priceStreak, handle, siweAddress } = useAuth();
    const { notifs, toggle } = usePdNotifs();
    /* The socket now reads the caller's REAL pledge — placed state + lock, and
       taps through to the anointed project (Brendon 2026-07-07). */
    const router = useRouter();
    const { pledge } = useMyAnoint();
    /* Stay VISIBLE while anywhere in the stack — not only when we're the top
       modal — so opening the Leaderboard (or Golf board) OVER this modal
       leaves it sitting unchanged underneath (Brendon, 2026-07-21). The
       shared rule (useModalLayer) does this for every modal now. */
    const { isOpen, isTopStacked } = useModalLayer('priceSprite');

    /* ASCII-ID lives here now (moved off the MY PD settings row — this is
       where people look). It's a negative flag: asciiId=true means the
       ASCII identity is HIDDEN, so the readout reads OFF when the flag is on,
       matching the old settings toast exactly. */
    const asciiIdHidden = notifs.asciiId;
    const toggleAsciiId = () => {
        const next = !notifs.asciiId;
        toggle('asciiId');
        showToast(`ASCII-ID: ${next ? 'OFF' : 'ON'}`);
    };

    /* Mirror priceSpriteEngine into the modal hero so the hero's
       blink/turn/yawn/sleep stays in sync with the menu sprite (sim
       12135-12143 + 12988-12995). Subscribe only while the modal is
       open — when closed, the hero isn't visible and we shouldn't
       hold the engine running on its behalf. */
    const [frame, setFrame] = useState<SpriteFrame>(() => getSpriteFrame());
    /* Identity Plate export busy flag — the build awaits fonts + paints a
       canvas, so the button shows a working state (same shape as the Rarity
       Receipt button) and can't be double-fired. */
    const [plateBusy, setPlateBusy] = useState(false);
    useEffect(() => {
        if (!isOpen) return;
        setFrame(getSpriteFrame());
        const unsubscribe = subscribeSprite(() => {
            setFrame(getSpriteFrame());
        });
        return unsubscribe;
    }, [isOpen]);

    /* The logged-in wallet's achievements — fetched once per open from
       /api/achievements/{address}. `unlocked` is the set of earned ids (joined
       against the catalog to paint each tile); `achScore` is the live
       PriceScore the API returns (the achievement total). Guarded so it fetches
       once per address and never on every render: we remember the address we
       fetched for and skip when the modal isn't open / there's no wallet. */
    const [unlocked, setUnlocked] = useState<ReadonlySet<string>>(() => new Set());
    const [achScore, setAchScore] = useState<number>(priceScore);
    const [streakBest, setStreakBest] = useState<number>(0);
    const fetchedFor = useRef<string | null>(null);

    /* The 1,000-achievement catalog browses by CATEGORY — one section at a
       time on the rail, picked from the pill row (a single strip of 1,000
       tiles is not a browse, it's a punishment). Default = MINTING, the
       first + heaviest section. */
    const [achCat, setAchCat] = useState<AchievementCategory>('primary');
    const catItems = useMemo(
        () => ACHIEVEMENTS.filter((a) => a.category === achCat),
        [achCat],
    );
    /* Per-category unlocked tallies for the pills. */
    const catCounts = useMemo(() => {
        const m = new Map<AchievementCategory, { done: number; total: number }>();
        for (const a of ACHIEVEMENTS) {
            const c = m.get(a.category) ?? { done: 0, total: 0 };
            c.total += 1;
            if (unlocked.has(a.id)) c.done += 1;
            m.set(a.category, c);
        }
        return m;
    }, [unlocked]);
    const catRowRef = useDragScroll<HTMLDivElement>();

    /* Desktop mouse drag-to-scroll on the achievements carousel (touch scrolls
       natively). Shared mouse-only hook; swallows the trailing click so a pan
       never fires a tile's tap (Brendon, 2026-06-16). */
    const achRailRef = useDragScroll<HTMLDivElement>();
    useEffect(() => {
        if (!isOpen || !siweAddress) return;
        const addr = siweAddress.toLowerCase();
        if (fetchedFor.current === addr) return;
        fetchedFor.current = addr;
        let cancelled = false;
        fetch(`/api/achievements/${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { unlocked?: string[]; priceScore?: number; streakBest?: number } | null) => {
                if (cancelled || !d) return;
                setUnlocked(new Set(d.unlocked ?? []));
                if (typeof d.priceScore === 'number') setAchScore(d.priceScore);
                if (typeof d.streakBest === 'number') setStreakBest(d.streakBest);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isOpen, siweAddress]);

    const unlockedCount = ACHIEVEMENTS.reduce(
        (n, a) => (!a.secret && unlocked.has(a.id) ? n + 1 : n),
        0,
    );

    return (
        <div
            id="priceSpriteModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            data-stack-top={isTopStacked || undefined}
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
                {/* Tapping the medallion opens the Top-100 Leaderboard
                    (Brendon, 2026-07-02) — your rank is the door to the board. */}
                <div className="ps-rank-wrap ps-reveal ps-d3">
                    <div
                        className="ps-rank-medallion ps-rank-tappable"
                        role="button"
                        tabIndex={0}
                        title="Leaderboard"
                        onClick={(e) => {
                            e.stopPropagation();
                            close();
                            open('leaderboard');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                close();
                                open('leaderboard');
                            }
                        }}
                    >
                        <span className="ps-rank-glyph">
                            {priceRank <= 0
                                ? '⓿'
                                : String.fromCodePoint(0x2775 + Math.min(priceRank, 10))}
                        </span>
                    </div>
                    <div className="ps-rank-caption">PRICERANK</div>
                </div>

                {/* Progress to the next PriceRank — REAL wiring now: the fill is
                    PriceScore's fraction into the current tier band
                    (lib/achievements/tiers). Left label = your PriceScore; right
                    label = points to the next tier, or APEX at the top. */}
                {(() => {
                    const prog = rankProgress(priceScore);
                    const pct = Math.max(2, Math.round(prog.fraction * 100));
                    const remaining =
                        prog.nextTier === null ? 0 : prog.bandSize - prog.intoBand;
                    return (
                        <div className="ps-next-wrap ps-reveal ps-d3">
                            <div className="ps-next-bar">
                                <div className="ps-next-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="ps-next-labels">
                                <span>{`${priceScore.toLocaleString()} PriceScore`}</span>
                                <span>
                                    {prog.nextTier === null
                                        ? 'APEX'
                                        : `${remaining.toLocaleString()} → rank ${prog.nextTier}`}
                                </span>
                            </div>
                        </div>
                    );
                })()}

                {/* PRICESTREAK — the daily-action streak, finally visible.
                    Current run from the live user row; best run from the
                    achievements profile. Never ticked by a bare app-open —
                    only a real move counts (mint, market, follow, anoint) —
                    and it activates at 60 days. The ◈ is the canonical
                    streak glyph (GLYPHS.md §2); treatment mirrors the
                    Anointment socket row exactly. */}
                <div className="ps-section-header ps-reveal ps-d4">PRICESTREAK</div>
                <div className="ps-streak ps-reveal ps-d4">
                    <span className="ps-streak-mark">{`◈${VS15}`}</span>
                    <span className="ps-streak-copy">
                        <span className="ps-streak-state">
                            {priceStreak > 0 ? `DAY ${priceStreak}` : 'NONE YET'}
                        </span>
                        <span className="ps-streak-sub">
                            {(priceStreak > 0
                                ? priceStreak >= STREAK_ACTIVATION_DAYS
                                    ? `active · best ${Math.max(streakBest, priceStreak)}`
                                    : `one real move a day · activates at ${STREAK_ACTIVATION_DAYS}`
                                : 'one real move a day starts it — not a login'
                            ).split(' · ').map((line, i, arr) => (
                                <span className="ps-streak-sub-line" key={i}>{i < arr.length - 1 ? `${line},` : line}</span>
                            ))}
                        </span>
                    </span>
                </div>

                {/* ⚷ Keychains — the capsule machine door. Moved directly under
                    PRICESTREAK and restyled OUTLINED (Brendon, 2026-07-28). */}
                <div className="ps-action-row ps-reveal ps-d4">
                    <button
                        className="ps-action-btn ps-action-btn--outline"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            open('depanneur');
                        }}
                    >
                        <span className="ps-action-icon">{`⚷${VS15}`}</span>
                        {'KEYCHAINS'}
                    </button>
                </div>

                {/* ACHIEVEMENTS — Xbox-style rail off the REAL catalog, browsed
                    one CATEGORY at a time (pill row picks the section; a flat
                    strip of 1,000 tiles is unusable). Tiles show unlocked/
                    locked for the logged-in wallet; secret + locked render as
                    "???" with a locked blurb. Tap a tile to read it (no hover
                    on mobile). Tally = real unlocked count / visible total ·
                    PriceScore / max. */}
                <div className="ps-section-header ps-ach-header ps-reveal ps-d4">
                    <span>ACHIEVEMENTS</span>
                    <span className="ps-ach-count">{`${unlockedCount} / ${TOTAL_COUNT.toLocaleString()} (${Math.round((unlockedCount / TOTAL_COUNT) * 100)}%)`}</span>
                    <span className="ps-ach-score">{`${ACHIEVEMENTS_ICON} ${achScore.toLocaleString()} / ${MAX_PRICE_SCORE.toLocaleString()} PTS (${Math.round((achScore / MAX_PRICE_SCORE) * 100)}%) ${ACHIEVEMENTS_ICON}`}</span>
                </div>
                <div className="ps-cat-row ps-reveal ps-d4" ref={catRowRef}>
                    {CATEGORY_ORDER.map((c) => {
                        const counts = catCounts.get(c);
                        if (!counts) return null;
                        return (
                            <button
                                className={`ps-cat-pill${c === achCat ? ' selected' : ''}`}
                                type="button"
                                key={c}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAchCat(c);
                                }}
                            >
                                <span className="ps-cat-glyph">{`${CATEGORY_GLYPH[c]}${VS15}`}</span>
                                <span>{CATEGORY_LABEL[c]}</span>
                                <span className="ps-cat-count">{`${counts.done}/${counts.total}`}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="ps-ach-rail ps-reveal ps-d4" ref={achRailRef} key={achCat}>
                    {catItems.map((a) => {
                        const isUnlocked = unlocked.has(a.id);
                        const hidden = a.secret && !isUnlocked;
                        return (
                            <button
                                className={`ps-ach-tile${isUnlocked ? ' unlocked' : ''}${hidden ? ' secret' : ''}`}
                                type="button"
                                key={a.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    showToast(
                                        hidden
                                            ? 'SECRET ACHIEVEMENT — keep playing'
                                            : `${a.name.toUpperCase()} — ${a.blurb} (${isUnlocked ? 'UNLOCKED' : `+${a.points} PTS`})`
                                    );
                                }}
                            >
                                <span className="ps-ach-glyph">
                                    {hidden ? `?${VS15}` : `${tileGlyph(a)}${VS15}`}
                                </span>
                                <span className="ps-ach-name">{hidden ? '???' : a.name}</span>
                                <span className="ps-ach-pts">{`${a.points} PTS`}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ANOINTMENT socket — the caller's REAL one-✢-per-account
                    pledge (GET /api/anoint?me). Placed → shows the project +
                    lock state and taps through to that project's Anointed tab;
                    unplaced → points at where to place it. */}
                <div className="ps-section-header ps-reveal ps-d5">ANOINTMENT</div>
                <div
                    className="ps-anoint ps-reveal ps-d5"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (pledge) {
                            closeAll();
                            router.push(`/art/${pledge.project_id}`);
                        } else {
                            showToast('Anointment: PLACE IT ON ANY PROJECT');
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (pledge) {
                                closeAll();
                                router.push(`/art/${pledge.project_id}`);
                            } else {
                                showToast('Anointment: PLACE IT ON ANY PROJECT');
                            }
                        }
                    }}
                >
                    <span className="ps-anoint-mark">{`✢${VS15}`}</span>
                    <span className="ps-anoint-copy">
                        <span className="ps-anoint-state">
                            {pledge ? `@${pledge.project_id}`.toUpperCase() : 'UNPLACED'}
                        </span>
                        <span className="ps-anoint-sub">
                            {(pledge
                                ? `via #${pledge.output_token_id} · ${pledge.locked ? 'locked 60 days' : 'unlocked'}`
                                : 'one pledge per account · locks 60 days'
                            ).split(' · ').map((line, i, arr) => (
                                <span className="ps-anoint-sub-line" key={i}>{i < arr.length - 1 ? `${line},` : line}</span>
                            ))}
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

                {/* Identity Plate Export — builds the King-Mode identity card
                    (live PriceSprite hero · @handle · PriceRank/Score/Streak/
                    Achievements on the user's colorway accent) and hands the PNG
                    to the native share sheet, the same path + button as the
                    Rarity Receipt. Pulses while it builds. */}
                <div className="ps-action-row ps-reveal ps-d7">
                    <button
                        className="rarity-receipt-btn"
                        type="button"
                        disabled={plateBusy}
                        aria-busy={plateBusy}
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (plateBusy) return;
                            setPlateBusy(true);
                            try {
                                const name = handle
                                    ? `@${handle}`
                                    : siweAddress
                                      ? `${siweAddress.slice(0, 6)}…${siweAddress.slice(-4)}`
                                      : 'anon';
                                const rankGlyph =
                                    priceRank <= 0
                                        ? '⓿'
                                        : String.fromCodePoint(0x2775 + Math.min(priceRank, 10));
                                const res = await shareIdentityPlate({
                                    face: frame.face,
                                    name,
                                    rankGlyph,
                                    priceScore,
                                    streak: priceStreak,
                                    achUnlocked: unlockedCount,
                                    achTotal: TOTAL_COUNT,
                                });
                                showToast(
                                    res === 'shared'
                                        ? 'Identity Plate: SHARED'
                                        : res === 'downloaded'
                                          ? 'Identity Plate: SAVED'
                                          : 'Identity Plate: EXPORT FAILED',
                                );
                            } finally {
                                setPlateBusy(false);
                            }
                        }}
                    >
                        <span className="rrb-glyph">{`⍈${VS15}`}</span>
                        <span className="rrb-label">{plateBusy ? 'BUILDING PLATE…' : 'EXPORT IDENTITY PLATE'}</span>
                    </button>
                </div>

                {/* ASCII-ID toggle — moved here from the MY PD settings row, and
                    sits UNDER the Export plate button (Brendon, 2026-06-18). Hides
                    the ASCII identity (sprite + level badge) across the UI. Negative
                    flag, so the readout shows OFF when hidden. */}
                <div className="ps-action-row ps-reveal ps-d7">
                    <button
                        className="ps-action-btn"
                        type="button"
                        aria-pressed={asciiIdHidden}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleAsciiId();
                        }}
                    >
                        <span className="ps-action-icon">{`⍢${VS15}`}</span>
                        {`ASCII-ID: ${asciiIdHidden ? 'OFF' : 'ON'}`}
                    </button>
                </div>

            </div>
        </div>
    );
}
