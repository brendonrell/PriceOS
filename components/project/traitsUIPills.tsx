'use client';

/* Split out of components/project/TraitsUI.tsx 2026-07-06 (tech-debt pass)
   — pure move, no behavior change. */

import React, { type CSSProperties, type ReactNode } from 'react';
import { PerMilleMark } from '../shell/PerMilleMark';
import SpriteFace from '../SpriteFace';
import { NET_VALUE_ICON } from './traitsUIShared';
import {
    type SortKey, type SortDir, type FeedKind, type SortRank,
    GROUP_BTN_ICON,
} from '../../lib/state/SortContext';
import { formatEth } from '../../lib/format/eth';
import { useLongPress } from '../../lib/hooks/useLongPress';

/* ── Sub-components ─────────────────────────────────────────────────── */

interface BarPillProps {
    label: ReactNode;
    active: boolean;
    dimmed: boolean;
    /* Numeric badge inside the pill — sim 8488. Omit / 0 = no badge. */
    count?: number;
    onClick: () => void;
    title?: string;
    extraClass?: string;
}

export function BarPill({
    label,
    active,
    dimmed,
    count,
    onClick,
    title,
    extraClass,
}: BarPillProps) {
    const cls = [
        'pill',
        'pill-l1',
        active ? 'active' : '',
        dimmed ? 'dimmed' : '',
        extraClass ?? '',
    ]
        .filter(Boolean)
        .join(' ');
    const showBadge = typeof count === 'number' && count > 0;
    return (
        <div
            className={cls}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            title={title}
        >
            <span className="stat-name">{label}</span>
            {showBadge && <span className="badge">{count}</span>}
        </div>
    );
}

interface SubPillProps {
    label: string;
    active: boolean;
    dimmed: boolean;
    onClick: () => void;
}

/* L2 sub-pill — used for value selections within the active L1 category.
   Visual prefix `↴` matches sim's L2 row at sim 8585 / 8613 (the L2 row
   uses ↴ even though sim's L3 row uses ↳). */
export function SubPill({ label, active, dimmed, onClick }: SubPillProps) {
    const cls = [
        'pill',
        'pill-l2',
        active ? 'active' : '',
        dimmed ? 'dimmed' : '',
    ]
        .filter(Boolean)
        .join(' ');
    return (
        <div
            className={cls}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <span className="stat-name">↴ {label}</span>
        </div>
    );
}

interface L3PillProps {
    label: string;
    count: number;
    active: boolean;
    dimmed: boolean;
    isZero: boolean;
    /** Active L1 category. Drives the inner-span variant — sim 8679
     *  renders Breadcrumb (Recent) L3 pills as `<recent-dot>⬤</recent-dot>
     *  #${name}` with NO stat-count, while every other category uses
     *  the `↳ ${name}` + count form. Optional so legacy call sites
     *  (none today, but keeps the surface flexible) keep the original
     *  rendering by default. */
    category?: string;
    /** Long-press to favourite this trait value (Brendon, 2026-06-18). Only
     *  real token traits are starrable; feed-special pills pass starrable=false
     *  and behave exactly as before. */
    starrable?: boolean;
    starred?: boolean;
    onToggleStar?: () => void;
    /** Best standing trait offer on this value ("0.400") — ambient demand
     *  (Brendon, 2026-07-02: sellers should SEE live trait bids). */
    bidEth?: string | null;
    onClick: () => void;
    /** Half opacity — a Recent pill from a Project other than the one being
     *  viewed (Brendon, 2026-06-24). */
    halfDim?: boolean;
    /** Dead pill — no click/focus, just there for context (the half-opacity
     *  other-Project Recent pills) (Brendon, 2026-06-24). */
    inert?: boolean;
    /** Signed-in user's still PriceSprite face — rendered as the icon on the
     *  Network 'Me' value pill (Brendon, 2026-06-24). Null → plain "Me". */
    meFace?: string | null;
}

/* L3 stat-pill — sim 8670-8682. Visual prefix `↳` matches sim 8681
   (L3 uses ↳ vs L2's ↴). `.is-zero` (sim 8672) is applied when count
   reaches 0 — kept in place even though Build 15 mocks counts at 22 so
   the gallery-wiring build only needs to replace the count source.
   `.active` / `.dimmed` mirror L2 selection state — both rows share
   `activeFilters[cat]`, so toggling here updates the L2 pill above and
   any future gallery predicate. The trailing `<span class="stat-count">`
   carries the numeric count (sim 8681).

   Build 17 — class-emission order tightened to match sim 8671-8676
   verbatim: `pill pill-l3 [is-zero] [active|dimmed]`. `active` and
   `dimmed` are mutually exclusive at the call site (sim 8674-8675's
   if/else mirrored in TraitsUI 350-354 where `dimmed = anySelected &&
   !isActive`). `is-zero` stacks on top of either via CSS source order
   in globals.css (.pill-l3.active 2332 → .pill-l3.dimmed 2337 →
   .pill-l3.is-zero 2338) — so a zero-count pill that's also selected
   renders with the dashed-transparent is-zero treatment dominating. */
export function L3Pill({
    label,
    count,
    active,
    dimmed,
    isZero,
    category,
    starrable = false,
    starred = false,
    onToggleStar,
    onClick,
    halfDim = false,
    inert = false,
    meFace,
    bidEth = null,
}: L3PillProps) {
    const cls = [
        'pill',
        'pill-l3',
        isZero ? 'is-zero' : '',
        active ? 'active' : '',
        dimmed ? 'dimmed' : '',
        starred ? 'trait-starred' : '',
    ]
        .filter(Boolean)
        .join(' ');

    /* Long-press → favourite. A press that fires the timer toggles the star,
       launches the float-up ★ confirm, and swallows the trailing click so the
       trait filter doesn't also toggle. A short tap, or a press that drags
       >10px (a scroll), falls through to the normal filter toggle. */
    const timerRef = React.useRef<number | null>(null);
    const longFired = React.useRef(false);
    const startPt = React.useRef<{ x: number; y: number } | null>(null);
    const [floatId, setFloatId] = React.useState(0);
    const [floatDown, setFloatDown] = React.useState(false);
    const clearTimer = () => {
        if (timerRef.current != null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };
    const onPointerDown = (e: React.PointerEvent) => {
        if (!starrable || !onToggleStar) return;
        longFired.current = false;
        startPt.current = { x: e.clientX, y: e.clientY };
        clearTimer();
        timerRef.current = window.setTimeout(() => {
            longFired.current = true;
            timerRef.current = null;
            // Was starred → this press UNSTARS → float down; else float up.
            setFloatDown(starred);
            setFloatId((n) => n + 1);
            onToggleStar();
        }, 460);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (timerRef.current == null || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > 100) clearTimer();
    };
    const endPress = () => clearTimer();
    /* Build 24 — Breadcrumb (Recent) variant per sim 8679. Renders
       the leading `⬤` glyph as `.recent-dot`, prefixes the label
       with `#`, and omits the stat-count entirely (Breadcrumb counts
       are always 1, so sim hides them to keep the row visually
       aligned with the L2 sub-pills above). */
    const isBreadcrumb = category === 'Breadcrumb';
    return (
        <div
            className={cls}
            role={inert ? undefined : 'button'}
            tabIndex={inert ? undefined : 0}
            aria-disabled={inert ? true : undefined}
            onClick={inert ? undefined : () => {
                if (longFired.current) { longFired.current = false; return; }
                onClick();
            }}
            onKeyDown={inert ? undefined : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            onPointerDown={inert ? undefined : onPointerDown}
            onPointerMove={inert ? undefined : onPointerMove}
            onPointerUp={inert ? undefined : endPress}
            onPointerLeave={inert ? undefined : endPress}
            onPointerCancel={inert ? undefined : endPress}
            onContextMenu={(e) => { if (starrable) e.preventDefault(); }}
            style={{
                ...(starrable ? { position: 'relative' as const, userSelect: 'none' as const, touchAction: 'pan-y' as const } : {}),
                ...(halfDim ? { opacity: 0.5 } : {}),
                ...(inert ? { cursor: 'default' as const } : {}),
            }}
        >
            {isBreadcrumb ? (
                <span className="stat-name">
                    <span className="recent-dot">⬤</span> {label}
                </span>
            ) : (
                <>
                    <span className="stat-name">
                        ↳{' '}
                        {category === 'Network' && label === 'Me' && meFace ? (
                            <>
                                <SpriteFace face={meFace} className="net-pill-sprite" />
                                {' '}{label}
                            </>
                        ) : category === 'Network' && NET_VALUE_ICON[label] ? (
                            <>
                                {label === 'New to PD' ? (
                                    <PerMilleMark className="net-pill-mille net-pill-mille-svg" />
                                ) : (
                                    <span className={NET_VALUE_ICON[label].cls}>
                                        {NET_VALUE_ICON[label].glyph}
                                    </span>
                                )}
                                {' '}{label}
                            </>
                        ) : (
                            label
                        )}
                    </span>
                    {/* count < 0 = no grid tally for this category (feed
                        specials) — show the value with no number rather
                        than a placeholder. */}
                    {count >= 0 && <span className="stat-count">{count}</span>}
                    {bidEth && (
                        <span className="pill-bid-chip" title={`Best trait offer · ${formatEth(Number(bidEth))} ETH`}>
                            {'✶︎'}{formatEth(Number(bidEth))}
                        </span>
                    )}
                </>
            )}
            {/* Persistent ★ when this trait is starred — same glyph + treatment
                as the artist-list star. */}
            {starrable && starred && (
                <span className="l3-trait-star" aria-hidden="true">{'★︎'}</span>
            )}
            {/* Float-up confirm — remounts on each long-press (keyed) so the
                rise+fade replays every time. */}
            {starrable && floatId > 0 && (
                <span key={floatId} className={`trait-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>
            )}
        </div>
    );
}

interface IconBtnProps {
    cls: string;
    glyph: string;
    title: string;
    active: boolean;
    onClick: () => void;
}

export function IconBtn({ cls, glyph, title, active, onClick }: IconBtnProps) {
    return (
        <div
            className={`${cls}${active ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            title={title}
        >
            {glyph}
        </div>
    );
}

interface SortBtnProps {
    label: string;
    family: SortKey;
    active: boolean;
    dir: SortDir;
    feedKind: FeedKind;
    /** #ID / $PRICE running by rarity — marked like FEED's $, with ❖. */
    rank?: SortRank;
    onClick: () => void;
}

/* Sim 8420-8428 — arrow only renders when this family is the active
   sort. ID/PRICE just show ↑/↓ per dir. FEED shows ↓/↑ per dir AND
   prepends a `feed-sort-dollar` $ span when feedKind is 'price'
   (i.e. currentSort is feed-price-desc / feed-price-asc).

   Direction cycling is owned by SortContext.cycleSort (sim 8312-8331).
   For 'id'/'price': click toggles asc↔desc when this family is already
   active; for 'feed': click advances through the 4-step FEED_SORTS
   sequence (sim 8313). */
export function SortBtn({
    label,
    family,
    active,
    dir,
    feedKind,
    rank = 'natural',
    onClick,
}: SortBtnProps) {
    let arrowGlyph = '';
    let dollarSpan: ReactNode = null;
    if (active) {
        if (family === 'id' || family === 'price') {
            arrowGlyph = dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E';
            /* ⛔ RARITY WEARS THE SAME MARK FEED'S PRICE ORDER DOES (Brendon,
               2026-08-02) — the small glyph in front of the arrow, ❖ instead of
               $. Identical anatomy, so the row reads as one idea. */
            if (rank === 'rarity') {
                dollarSpan = (
                    <span
                        className="feed-sort-dollar rarity-sort-mark"
                        style={{
                            fontFamily: "'Courier New', Courier, monospace",
                            /* Two sizes larger + nudged down 3px from the
                               prior 13px/-3px (Brendon, 2026-08-15). */
                            fontSize: '17px',
                            marginRight: '2px',
                            position: 'relative',
                            top: '0px',
                        }}
                    >
                        {'❖\uFE0E'}
                    </span>
                );
            }
        } else if (family === 'feed') {
            arrowGlyph = dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E';
            if (feedKind === 'price') {
                // Sim 8427-8428 — inline-styled $ span. Class hook
                // (.feed-sort-dollar) preserved for any CSS attached
                // to it; sim's own CSS rule for this class (sim 2209)
                // is overridden by these inline styles anyway.
                dollarSpan = (
                    <span
                        className="feed-sort-dollar"
                        style={{
                            fontFamily:
                                "'Courier New', Courier, monospace",
                            /* Two sizes larger + nudged down 3px from the
                               prior 13px/-3px, matching the rarity mark
                               (Brendon, 2026-08-15). */
                            fontSize: '17px',
                            marginRight: '2px',
                            position: 'relative',
                            top: '0px',
                        }}
                    >
                        $
                    </span>
                );
            }
        }
    }
    return (
        <div
            className={`sort-btn${active ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <span className="sort-lbl">{label}</span>
            <span className="sort-arrow">
                {dollarSpan}
                {arrowGlyph}
            </span>
        </div>
    );
}

/* The standalone GROUP toggle (Brendon, 2026-07-12) — leads every sort row.
   Icon-only, NO direction arrow: grouping has no direction, just a dimension.
   Resting (no grouping) it wears GROUP_BTN_ICON; while a grouping is live it
   wears that dimension's glyph and lights up like an active sort. One tap
   advances the surface's grouping cycle — grouping no longer rides inside
   each sort button's cycle. Reuses the ◷ Recent glyph treatment
   (.sort-lbl-recent) so the icon sits on the row baseline in Courier. */
export function GroupBtn({
    glyph,
    on,
    more = false,
    onClick,
    onHold,
}: {
    /** The live grouping's glyph ('' when grouping is off). */
    glyph: string;
    /** Whether a grouping is active (lights the button). */
    on: boolean;
    /** More than one layer is running — the button wears the TOP layer's glyph
     *  and the ↳ (down-and-over, same mark as the layers menu itself) beside
     *  it for the rest (Brendon, 2026-07-30; repositioned + swapped from '+'
     *  to ↳, 2026-08-14). */
    more?: boolean;
    onClick: () => void;
    /** HOLD → the three-layer menu (Brendon, 2026-07-26). Receives where the
     *  button is so the bubble's tail can point back at it, exactly like the
     *  fiat picker. Absent = no hold action on this surface. */
    onHold?: (anchor: { top: number; centerX: number }) => void;
}) {
    const ref = React.useRef<HTMLDivElement>(null);
    const hold = useLongPress(() => {
        const r = ref.current?.getBoundingClientRect();
        if (r) onHold?.({ top: r.top, centerX: r.left + r.width / 2 });
    });
    return (
        <div
            ref={ref}
            className={`sort-btn group-btn${on ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            title={onHold ? 'Group by — hold for layers' : 'Group by'}
            onClick={onClick}
            {...(onHold ? hold : null)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* ⛔ SAME METHOD AS THE ❖ RARITY MARK / $ FEED MARK (Brendon,
                2026-08-14: "nowhere near that spot, re-do it properly") — an
                inline-styled span glued directly against the character it
                marks, not a separately-classed sibling that can drift. Mirrors
                traitsUIPills SortBtn's dollarSpan exactly: Courier, 13px,
                2px right margin, nudged up 3px. Swapped '+' for ↳, the same
                down-and-over glyph the layers menu itself wears
                (GroupLayersBubble's .glb-arrow). */}
            {on && more && (
                <span
                    className="group-btn-more"
                    aria-hidden="true"
                    style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: '13px',
                        marginRight: '2px',
                        position: 'relative',
                        top: '-3px',
                    }}
                >
                    {'\u21B3\uFE0E'}
                </span>
            )}
            <span className="sort-lbl sort-lbl-recent">{on ? glyph : GROUP_BTN_ICON}</span>
        </div>
    );
}
