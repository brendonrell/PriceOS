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
 *     "???". Tally = unlocked / VISIBLE_COUNT · score / MAX_PRICE_SCORE.
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

import { useEffect, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useAuth } from '../lib/state/AuthContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useDragScroll } from '../lib/hooks/useDragScroll';
import { rankProgress } from '../lib/achievements/tiers';
import {
    ACHIEVEMENTS,
    MAX_PRICE_SCORE,
    VISIBLE_COUNT,
} from '../lib/achievements/catalog';
import { tileGlyph } from './achievements/AchievementsGrid';
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

/* The achievements rail now reads the REAL merged catalog
   (lib/achievements/catalog). For the logged-in wallet we fetch
   /api/achievements/{address} on open to learn which ids are unlocked +
   the live PriceScore; tiles render unlocked/locked from that set. */

/* Identity Plate export — composes the wallet's identity surfaces into a
   single downloadable PNG, generated client-side at export time (no file is
   stored; consistent with PD's media-storage avoidance). The card carries the
   surfaces that actually exist on PD today — the PriceSprite portrait, the
   PriceRank medallion, and the wallet's name — painted onto the live colorway.
   Returns false if the browser can't give us a canvas. */
function downloadIdentityPlate(opts: {
    face: string;
    name: string;
    rankGlyph: string;
}): boolean {
    if (typeof document === 'undefined') return false;
    const root = getComputedStyle(document.documentElement);
    const bg = root.getPropertyValue('--bg-color').trim() || '#111111';
    const fg = root.getPropertyValue('--text-color').trim() || '#e0e0e0';

    const W = 600;
    const H = 360;
    const dpr = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2)));
    const canvas = document.createElement('canvas');
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.scale(dpr, dpr);

    const mono = "'Courier New', Courier, monospace";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Frame.
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.globalAlpha = 1;

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Header.
    ctx.font = `bold 14px ${mono}`;
    ctx.globalAlpha = 0.7;
    ctx.fillText('P R I C E   D I S C U S S I O N', W / 2, 58);
    ctx.globalAlpha = 1;

    // PriceSprite portrait.
    ctx.font = `bold 60px ${mono}`;
    ctx.fillText(opts.face, W / 2, 178);

    // PriceRank medallion.
    ctx.font = `30px ${mono}`;
    ctx.fillText(opts.rankGlyph, W / 2, 232);
    ctx.font = `bold 11px ${mono}`;
    ctx.globalAlpha = 0.6;
    ctx.fillText('PRICERANK', W / 2, 252);
    ctx.globalAlpha = 1;

    // Wallet name.
    ctx.font = `bold 18px ${mono}`;
    ctx.fillText(opts.name, W / 2, 300);

    // Footer mark.
    ctx.font = `11px ${mono}`;
    ctx.globalAlpha = 0.5;
    ctx.fillText('identity plate', W / 2, 326);
    ctx.globalAlpha = 1;

    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `priceos-identity${opts.name.startsWith('@') ? '-' + opts.name.slice(1) : ''}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
    return true;
}

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
    const { priceRank, priceScore, handle, siweAddress } = useAuth();
    const { notifs, toggle } = usePdNotifs();
    const isOpen = openModal?.name === 'priceSprite';

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
    const fetchedFor = useRef<string | null>(null);

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
            .then((d: { unlocked?: string[]; priceScore?: number } | null) => {
                if (cancelled || !d) return;
                setUnlocked(new Set(d.unlocked ?? []));
                if (typeof d.priceScore === 'number') setAchScore(d.priceScore);
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

                {/* ACHIEVEMENTS — Xbox-style rail off the REAL catalog. Tiles
                    show unlocked/locked for the logged-in wallet; secret +
                    locked render as "???" with a locked blurb. Tap a tile to
                    read it (no hover on mobile). Tally = real unlocked count /
                    visible total · PriceScore / max. */}
                <div className="ps-section-header ps-ach-header ps-reveal ps-d4">
                    <span>ACHIEVEMENTS</span>
                    <span className="ps-ach-tally">
                        {`${unlockedCount} / ${VISIBLE_COUNT} · ${achScore.toLocaleString()} / ${MAX_PRICE_SCORE.toLocaleString()} PTS`}
                    </span>
                </div>
                <div className="ps-ach-rail ps-reveal ps-d4" ref={achRailRef}>
                    {ACHIEVEMENTS.map((a) => {
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

                {/* ASCII-ID toggle — moved here from the MY PD settings row.
                    Hides the ASCII identity (sprite + level badge) across the
                    UI. Negative flag, so the readout shows OFF when hidden. */}
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

                {/* Identity Plate Export — composes the live PriceSprite +
                    PriceRank + wallet name into a downloadable PNG on the
                    current colorway (real export; was a placeholder toast). */}
                <div className="ps-action-row ps-reveal ps-d7">
                    <button
                        className="ps-action-btn"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const name = handle
                                ? `@${handle}`
                                : siweAddress
                                  ? `${siweAddress.slice(0, 6)}…${siweAddress.slice(-4)}`
                                  : 'anon';
                            const rankGlyph =
                                priceRank <= 0
                                    ? '⓿'
                                    : String.fromCodePoint(0x2775 + Math.min(priceRank, 10));
                            const ok = downloadIdentityPlate({ face: frame.face, name, rankGlyph });
                            showToast(ok ? 'Identity Plate: SAVED' : 'Identity Plate: EXPORT FAILED');
                        }}
                    >
                        <span className="ps-action-icon">{`⍈${VS15}`}</span>
                        EXPORT IDENTITY PLATE
                    </button>
                </div>
            </div>
        </div>
    );
}
