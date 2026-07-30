'use client';

/*
 * CompletionismModal — COMPLETIONISM, opened from the ⬚ Outputs Collected
 * stat on YOUR OWN profile hero. Month-based (the PriceDay calendar spine):
 * every month lists its releases with little ✓ checks; collect one of each
 * and the month reads COMPLETE. Below it, STICKER COMPLETIONISM — the sheets,
 * same checks (full slot-by-slot detail lives in My Sticker Album, in the
 * store).
 *
 * Shell = the Cart panel verbatim (house slide-up), two-stage mounted/active.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useEffectiveAddress } from '../lib/incognito/useEffectiveAddress';
import { SHEETS } from '../lib/stickers/catalog';
import { getOwnedIds, ownsSheet, useOwnedStickerIds } from '../lib/stickers/owned';
import { genes, SHAPE_NAMES } from '../lib/keychains/engine';
import { useKeychainRack } from '../lib/keychains/rack';
import { formatEth } from '../lib/format/eth';

const VS15 = '︎';
const UNMOUNT_DELAY_MS = 240;

interface MonthRow {
    key: string;
    label: string;
    collected: number;
    total: number;
    complete: boolean;
    projects: { slug: string; title: string; collected: boolean }[];
}

/* ── THE COMPLETIONIST'S LEDGER — the whole analytics read, hidden behind the
   one small STATS button so the resting modal stays minimal (Brendon,
   2026-07-16). Everything computes from the months payload already fetched;
   the only extra reads are the floor probes for THE CLOSE. ── */

/** "AUGUST 2026" → "AUG 26" — bar-chart-width month labels. */
function shortLabel(label: string): string {
    const [m, y] = label.split(' ');
    return `${m.slice(0, 3)} ${y.slice(2)}`;
}

function CompletionLedger({
    months,
    sheetsOwned,
    sheetsTotal,
}: {
    months: MonthRow[];
    sheetsOwned: number;
    sheetsTotal: number;
}) {
    const stats = useMemo(() => {
        const totalReleases = months.reduce((n, m) => n + m.total, 0);
        const totalCollected = months.reduce((n, m) => n + m.collected, 0);
        const monthsComplete = months.filter((m) => m.complete).length;
        const pct = totalReleases > 0 ? Math.round((totalCollected / totalReleases) * 100) : 0;
        /* THE CLOSE — the incomplete month you're nearest to finishing. */
        const open = months
            .filter((m) => !m.complete && m.total > 0)
            .map((m) => ({ ...m, missing: m.projects.filter((p) => !p.collected) }))
            .sort((a, b) => a.missing.length - b.missing.length);
        const closest = open[0] ?? null;
        /* Chronological for the chart (payload arrives newest-first). */
        const chart = [...months].reverse();
        return { totalReleases, totalCollected, monthsComplete, pct, closest, chart };
    }, [months]);

    /* THE CLOSE's price tag — live floors for the missing releases (capped;
       fails soft to "no live listing"). This is the buy-the-gap read. */
    const [floors, setFloors] = useState<Record<string, number | null> | null>(null);
    const closest = stats.closest;
    useEffect(() => {
        if (!closest) { setFloors(null); return; }
        let alive = true;
        const slugs = closest.missing.slice(0, 12).map((p) => p.slug);
        Promise.all(slugs.map(async (slug) => {
            try {
                const j = await fetch(`/api/project/${slug}/floor`).then((r) => (r.ok ? r.json() : null));
                return [slug, typeof j?.floor_eth === 'number' ? j.floor_eth : null] as const;
            } catch { return [slug, null] as const; }
        })).then((entries) => { if (alive) setFloors(Object.fromEntries(entries)); });
        return () => { alive = false; };
    }, [closest]);

    const closeRead = useMemo(() => {
        if (!closest) return null;
        const m = closest;
        if (!floors) return { month: m.label, missing: m.missing.length, line: 'pricing the gap…' };
        const listed = m.missing.map((p) => floors[p.slug]).filter((f): f is number => typeof f === 'number');
        const line = listed.length === 0
            ? 'no live listings — watch the market'
            : `${listed.length} of ${m.missing.length} listed now · from ${formatEth(listed.reduce((a, b) => a + b, 0))} total`;
        return { month: m.label, missing: m.missing.length, line };
    }, [closest, floors]);

    return (
        <div className="cpl-ledger">
            <div className="cpl-tiles">
                <div className="cpl-tile">
                    <span className="cpl-tile-label">{`⬚${VS15}`} RELEASES</span>
                    <span className="cpl-tile-value">{stats.totalCollected}/{stats.totalReleases}</span>
                </div>
                <div className="cpl-tile">
                    <span className="cpl-tile-label">{`▦${VS15}`} MONTHS</span>
                    <span className="cpl-tile-value">{stats.monthsComplete}/{months.length}</span>
                </div>
                <div className="cpl-tile">
                    <span className="cpl-tile-label">{`⊞${VS15}`} STICKERS</span>
                    <span className="cpl-tile-value">{sheetsOwned}/{sheetsTotal}</span>
                </div>
                <div className="cpl-tile">
                    <span className="cpl-tile-label">{`✓${VS15}`} COMPLETE</span>
                    <span className="cpl-tile-value">{stats.pct}%</span>
                </div>
            </div>

            {/* Month-by-month — one bar per release month, fill = collected share. */}
            <div className="cpl-bars" role="img" aria-label="Completion by month">
                {stats.chart.map((m) => (
                    <div className="cpl-bar-row" key={m.key}>
                        <span className="cpl-bar-label">{shortLabel(m.label)}</span>
                        <span className="cpl-bar">
                            <span
                                className={`cpl-bar-fill${m.complete ? ' is-complete' : ''}`}
                                style={{ width: `${m.total > 0 ? Math.max(2, Math.round((m.collected / m.total) * 100)) : 0}%` }}
                            />
                        </span>
                        <span className="cpl-bar-n">{m.collected}/{m.total}</span>
                    </div>
                ))}
            </div>

            {/* THE CLOSE — the nearest finish line, priced live. */}
            {closeRead && (
                <div className="cpl-close">
                    <span className="cpl-close-head">THE CLOSE — {closeRead.month}</span>
                    <span className="cpl-close-line">{closeRead.missing} to go · {closeRead.line}</span>
                </div>
            )}
        </div>
    );
}

export default function CompletionismModal({
    address,
    open,
    onClose,
}: {
    address: string;
    open: boolean;
    onClose: () => void;
}) {
    const [months, setMonths] = useState<MonthRow[] | null>(null);
    /* The ledger folds away by default — the resting modal stays minimal. */
    const [statsOpen, setStatsOpen] = useState(false);
    const { open: openPal } = useModal();
    /* INCOGNITO PROXY (2026-07-28) — worn lens = their months. The ⌂ Pal
       door stays shut while proxied (the Pal builds YOUR cart — a lens
       never writes); tap toasts READ ONLY instead. */
    const { address: effectiveAddress, proxied } = useEffectiveAddress();
    const dataAddress = proxied && effectiveAddress ? effectiveAddress : address;
    const { showToast } = useToast();
    const ownedIds = useOwnedStickerIds();
    /* KEYCHAIN COMPLETIONISM — the twelve charm shapes. A shape counts once
       you hold any charm that rolled it (Brendon, 2026-07-30). */
    const rack = useKeychainRack(open ? dataAddress : null);
    const shapesHeld = useMemo(() => {
        const s = new Set<number>();
        for (const c of rack?.charms ?? []) s.add(genes(c.seed, c.coin, c.luck).shape);
        return s;
    }, [rack]);

    /* Two-stage mounted/active — CartPanel's open/close, verbatim. */
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (open) {
            if (unmountTimer.current) { clearTimeout(unmountTimer.current); unmountTimer.current = null; }
            setMounted(true);
            /* ⛔ TWO frames, not one (Brendon, 2026-07-28: "it lags every time
               it opens... there's obviously a build flaw"). The panel goes from
               display:none to visible in the same commit that would flip it
               active — and a browser will not TRANSITION an element that was
               display:none a moment ago, so the sheet arrived in one abrupt
               jump instead of sliding. One frame paints it mounted and
               invisible; the SECOND frame starts the real transition from a
               settled state. */
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setActive(true));
            });
            return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2); };
        }
        setActive(false);
        unmountTimer.current = setTimeout(() => { setMounted(false); unmountTimer.current = null; }, UNMOUNT_DELAY_MS);
        return () => {
            if (unmountTimer.current) { clearTimeout(unmountTimer.current); unmountTimer.current = null; }
        };
    }, [open]);

    useEffect(() => {
        if (!open || !dataAddress) return;
        let cancelled = false;
        fetch(`/api/completionism?address=${encodeURIComponent(dataAddress)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setMonths((d.months as MonthRow[]) ?? []); })
            .catch(() => { if (!cancelled) setMonths([]); });
        return () => { cancelled = true; };
    }, [open, dataAddress]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!mounted || typeof document === 'undefined') return null;

    const owned = getOwnedIds();
    const sheetsOwned = SHEETS.filter((s) => ownsSheet(s.id, ownedIds.length ? ownedIds : owned)).length;

    const wrapClass = ['cart-panel-wrap', 'mk-sheet-wrap', mounted ? 'mounted' : '', active ? 'active' : '']
        .filter(Boolean).join(' ');

    return createPortal(
        <div className={wrapClass} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cart-panel-box" onClick={(e) => e.stopPropagation()}>
                <div className="cart-panel-header">
                    <span className="cart-panel-title">
                        COMPLETIONISM
                        {months && (
                            <>
                                <span className="cart-panel-title-count">
                                    ({months.filter((m) => m.complete).length}/{months.length})
                                </span>
                                {/* The ⌂ is the Purchase Pal door (Brendon, 2026-07-27) —
                                    opens the path builder preloaded with THE CLOSE (the
                                    incomplete month nearest its finish line). */}
                                <span
                                    className="cart-panel-title-glyph cpl-house-door"
                                    role="button"
                                    tabIndex={0}
                                    title="Purchase Pal"
                                    onClick={() => {
                                        if (proxied) { showToast('Incognito: READ ONLY'); return; }
                                        const open = months
                                            .filter((m) => !m.complete && m.total > 0)
                                            .sort((a, b) => (a.total - a.collected) - (b.total - b.collected));
                                        openPal('pal', open[0] ? `purchase:${open[0].key}` : 'purchase');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            (e.currentTarget as HTMLElement).click();
                                        }
                                    }}
                                >{`⌂${VS15}`}</span>
                            </>
                        )}
                        {months && months.length > 0 && (
                            <button
                                type="button"
                                className={`cpl-stats-btn${statsOpen ? ' on' : ''}`}
                                onClick={() => setStatsOpen((v) => !v)}
                                aria-expanded={statsOpen}
                                title="The Completionist's Ledger"
                            >
                                STATS
                            </button>
                        )}
                    </span>
                    <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">
                        {`×${VS15}`}
                    </span>
                </div>

                <div className="cart-items-list">
                    {statsOpen && months && months.length > 0 && (
                        <CompletionLedger
                            months={months}
                            sheetsOwned={sheetsOwned}
                            sheetsTotal={SHEETS.length}
                        />
                    )}
                    {months == null ? (
                        <div className="mk-story-loading">Reading the calendar…</div>
                    ) : months.length === 0 ? (
                        <div className="mk-story-loading">No releases yet.</div>
                    ) : (
                        months.map((m) => (
                            <div className="cpl-month" key={m.key}>
                                <div className="cpl-month-head">
                                    <span className="cpl-month-name">{m.label}</span>
                                    <span className={`cpl-month-tally${m.complete ? ' is-complete' : ''}`}>
                                        {m.complete ? `COMPLETE ✓${VS15}` : `${m.collected}/${m.total}`}
                                    </span>
                                </div>
                                <div className="cpl-grid">
                                    {m.projects.map((p) => (
                                        <a
                                            key={p.slug}
                                            className={`cpl-item${p.collected ? ' is-got' : ''}`}
                                            href={`/art/${p.slug}`}
                                            title={p.collected ? `${p.title} — collected` : p.title}
                                        >
                                            <span className="cpl-check">{p.collected ? `✓${VS15}` : `❐${VS15}`}</span>
                                            <span className="cpl-title">{p.title}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}

                    {/* STICKER COMPLETIONISM — the sheets, same checks. The full
                        slot-by-slot detail is My Sticker Album, in the store. */}
                    <div className="cpl-month">
                        <div className="cpl-month-head">
                            <span className="cpl-month-name">STICKER COMPLETIONISM</span>
                            <span className={`cpl-month-tally${sheetsOwned === SHEETS.length ? ' is-complete' : ''}`}>
                                {sheetsOwned === SHEETS.length ? `COMPLETE ✓${VS15}` : `${sheetsOwned}/${SHEETS.length}`}
                            </span>
                        </div>
                        <div className="cpl-grid">
                            {SHEETS.map((s) => {
                                const got = ownsSheet(s.id, ownedIds.length ? ownedIds : owned);
                                return (
                                    <span key={s.id} className={`cpl-item${got ? ' is-got' : ''}`} title={s.name}>
                                        <span className="cpl-check">{got ? `✓${VS15}` : `❐${VS15}`}</span>
                                        <span className="cpl-title">{s.name}</span>
                                    </span>
                                );
                            })}
                        </div>
                        <div className="cpl-foot">full sheet detail → My Sticker Binder, in the store</div>
                    </div>

                    {/* KEYCHAIN COMPLETIONISM — the twelve shapes, same checks.
                        The rack itself lives in the Depanneur. */}
                    <div className="cpl-month">
                        <div className="cpl-month-head">
                            <span className="cpl-month-name">KEYCHAIN COMPLETIONISM</span>
                            <span className={`cpl-month-tally${shapesHeld.size === SHAPE_NAMES.length ? ' is-complete' : ''}`}>
                                {shapesHeld.size === SHAPE_NAMES.length
                                    ? `COMPLETE ✓${VS15}`
                                    : `${shapesHeld.size}/${SHAPE_NAMES.length}`}
                            </span>
                        </div>
                        <div className="cpl-grid">
                            {SHAPE_NAMES.map((name, i) => {
                                const got = shapesHeld.has(i);
                                return (
                                    <span key={name} className={`cpl-item${got ? ' is-got' : ''}`} title={name}>
                                        <span className="cpl-check">{got ? `✓${VS15}` : `❐${VS15}`}</span>
                                        <span className="cpl-title">{name}</span>
                                    </span>
                                );
                            })}
                        </div>
                        <div className="cpl-foot">crank for the ones you&apos;re missing → The Depanneur</div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
