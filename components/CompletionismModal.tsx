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

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SHEETS } from '../lib/stickers/catalog';
import { getOwnedIds, ownsSheet, useOwnedStickerIds } from '../lib/stickers/owned';

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
    const ownedIds = useOwnedStickerIds();

    /* Two-stage mounted/active — CartPanel's open/close, verbatim. */
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (open) {
            if (unmountTimer.current) { clearTimeout(unmountTimer.current); unmountTimer.current = null; }
            setMounted(true);
            const raf = requestAnimationFrame(() => setActive(true));
            return () => cancelAnimationFrame(raf);
        }
        setActive(false);
        unmountTimer.current = setTimeout(() => { setMounted(false); unmountTimer.current = null; }, UNMOUNT_DELAY_MS);
        return () => {
            if (unmountTimer.current) { clearTimeout(unmountTimer.current); unmountTimer.current = null; }
        };
    }, [open]);

    useEffect(() => {
        if (!open || !address) return;
        let cancelled = false;
        fetch(`/api/completionism?address=${encodeURIComponent(address)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setMonths((d.months as MonthRow[]) ?? []); })
            .catch(() => { if (!cancelled) setMonths([]); });
        return () => { cancelled = true; };
    }, [open, address]);

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
                            <span className="cart-panel-title-count">
                                ({months.filter((m) => m.complete).length}/{months.length})
                            </span>
                        )}
                    </span>
                    <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">
                        {`×${VS15}`}
                    </span>
                </div>

                <div className="cart-items-list">
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
                </div>
            </div>
        </div>,
        document.body,
    );
}
