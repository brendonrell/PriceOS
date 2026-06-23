'use client';

/*
 * StickerManagerModal — your sticker controls, opened by tapping your stickers
 * on your own profile. Built on the AMBIENT LIGHT menu's exact shell: same
 * popup, same swipe-pager with page dots, same chip rows (Brendon 2026-06-22 —
 * "the SAME thing"). It's just taller. Settings are split across windows you
 * swipe between; the dots track + jump pages.
 *
 * Self-contained: reads its state ONCE when it opens and manages a LOCAL copy,
 * so toggling updates instantly with no global re-render (no flash). Each change
 * is saved in the background and the hero updates live via its own subscription.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { SHEETS, type Sticker } from '../../lib/stickers/catalog';
import {
    computeOwnedFor, getOffSheets, getOffIds, isActive,
    toggleSheetActive, toggleStickerActive,
} from '../../lib/stickers/owned';
import {
    getArrange, getTilt, getExpand, getRows, getAlign, getFlip,
    setArrange, setTilt, setExpand, setRows, setAlign, setFlip, shuffleSeed,
    ARRANGES, TILTS, ROW_OPTS, ALIGNS,
    type Arrange, type Tilt, type Rows, type Align,
} from '../../lib/stickers/heroPrefs';
import {
    encodeStickerCode, decodeStickerCode,
    ARRANGE_IDS, ROW_IDS, ALIGN_IDS, TILT_IDS, type StickerLook,
} from '../../lib/stickers/setupCode';
import { StickerArt } from './StickerArt';

const VS15 = '︎';
const PAGE_KEY = 'pd_sticker_mgr_page';
const PAGES = 3;

export function StickerManagerModal({
    open, onClose, handle,
}: {
    open: boolean;
    onClose: () => void;
    handle: string;
}) {
    const { open: openStore } = useModal();
    const { showToast } = useToast();

    // Local state, seeded each time the menu opens — no global subscriptions.
    const [owned, setOwned] = useState<Sticker[]>([]);
    const [offSheets, setOffSheets] = useState<Set<string>>(new Set());
    const [offIds, setOffIds] = useState<Set<string>>(new Set());
    const [arrange, setArr] = useState<Arrange>('spread');
    const [tilt, setTl] = useState<Tilt>('soft');
    const [expand, setExp] = useState(false);
    const [rows, setRw] = useState<Rows>(1);
    const [align, setAl] = useState<Align>('left');
    const [flip, setFl] = useState(false);

    const pagerRef = useRef<HTMLDivElement | null>(null);
    const [page, setPage] = useState(0);

    const look: StickerLook = { arrange, rows, align, tilt, expand, flip };
    const currentCode = encodeStickerCode(look);
    const [codeValue, setCodeValue] = useState(currentCode);
    const [codeEditing, setCodeEditing] = useState(false);
    const codeCopyingRef = useRef(false);
    const codeInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setOwned(computeOwnedFor(handle));
        setOffSheets(new Set(getOffSheets()));
        setOffIds(new Set(getOffIds()));
        setArr(getArrange());
        setTl(getTilt());
        setExp(getExpand());
        setRw(getRows());
        setAl(getAlign());
        setFl(getFlip());
    }, [open, handle]);

    // Restore the last-open swipe page so reopening doesn't snap back to page 1.
    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        let saved = 0;
        try { saved = parseInt(window.localStorage.getItem(PAGE_KEY) || '0', 10) || 0; } catch { /* ignore */ }
        saved = Math.max(0, Math.min(PAGES - 1, saved));
        setPage(saved);
        requestAnimationFrame(() => {
            const el = pagerRef.current;
            if (el) el.scrollLeft = saved * el.clientWidth;
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Anchor the popup DIRECTLY BELOW the sticker area so your stickers stay
    // visible above it — you watch the changes land as you make them. Height is
    // capped to the room below (never taller than the ambient menu).
    const [anchor, setAnchor] = useState<{ top: number; left: number; maxH: number } | null>(null);
    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        const measure = () => {
            const el = document.querySelector('.hero-stickers');
            if (!el) { setAnchor(null); return; }
            const r = el.getBoundingClientRect();
            const gap = 8;
            const top = r.bottom + gap;
            const vw = window.innerWidth, vh = window.innerHeight;
            const popW = Math.min(330, vw * 0.88);
            const left = Math.max(8, Math.min(r.left, vw - popW - 8));
            // Fit in the room below the stickers, and never exceed the ambient
            // menu's own cap (≈ viewport − 150).
            const maxH = Math.max(170, Math.min(vh - top - 12, vh - 150));
            setAnchor({ top, left, maxH });
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, [open]);

    // Keep the code field tracking the live look unless mid-edit/copy.
    useEffect(() => {
        if (codeEditing || codeCopyingRef.current) return;
        setCodeValue(currentCode);
    }, [currentCode, codeEditing]);

    if (!open || typeof document === 'undefined') return null;

    const toggleSheet = (id: string) => {
        toggleSheetActive(id as Parameters<typeof toggleSheetActive>[0]);
        setOffSheets((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSticker = (id: string) => {
        toggleStickerActive(id);
        setOffIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const pickArrange = (a: Arrange) => { setArr(a); setArrange(a); };
    const pickTilt = (t: Tilt) => { setTl(t); setTilt(t); };
    const pickExpand = (b: boolean) => { setExp(b); setExpand(b); };
    const pickRows = (r: Rows) => { setRw(r); setRows(r); };
    const pickAlign = (a: Align) => { setAl(a); setAlign(a); };
    const pickFlip = (b: boolean) => { setFl(b); setFlip(b); };

    // Apply a whole look at once (from a pasted code or Surprise).
    const applyLook = (l: StickerLook) => {
        pickArrange(l.arrange); pickRows(l.rows); pickAlign(l.align);
        pickTilt(l.tilt); pickExpand(l.expand); pickFlip(l.flip);
    };
    const applyCode = () => {
        const trimmed = codeValue.trim();
        if (!trimmed || trimmed.toUpperCase() === currentCode) { setCodeValue(currentCode); setCodeEditing(false); return; }
        // Hidden word — type SPILL (anywhere in the code) to dump the whole sheet
        // out across the hero: a chaotic, flipped, freshly-shuffled collage. Sticker
        // -native egg, no chip for it anywhere.
        const word = trimmed.toUpperCase().replace(/[^A-Z]/g, '');
        if (word.includes('SPILL')) {
            applyLook({ arrange: 'collage', rows: 2, align: 'left', tilt: 'jaunty', expand: true, flip: true });
            shuffleSeed();
            setCodeEditing(false);
            showToast('Stickers: SPILL ✦');
            return;
        }
        const parsed = decodeStickerCode(trimmed);
        setCodeEditing(false);
        if (!parsed.ok || !parsed.look) { setCodeValue(currentCode); showToast('Sticker Code: INVALID'); return; }
        applyLook(parsed.look);
        showToast('Stickers: APPLIED');
    };
    const copyCode = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        try { navigator.clipboard?.writeText(currentCode); } catch { /* ignore */ }
        codeCopyingRef.current = true;
        setCodeValue('COPIED!');
        showToast('Sticker Code: COPIED');
        window.setTimeout(() => { codeCopyingRef.current = false; setCodeValue(currentCode); }, 1500);
    };
    const surprise = () => {
        const r = <T,>(arr: ReadonlyArray<T>): T => arr[Math.floor(Math.random() * arr.length)]!;
        applyLook({ arrange: r(ARRANGE_IDS), rows: r(ROW_IDS), align: r(ALIGN_IDS), tilt: r(TILT_IDS), expand: Math.random() < 0.5, flip: Math.random() < 0.4 });
        shuffleSeed();
        showToast('Stickers: SURPRISE');
    };

    const onPagerScroll = () => {
        const el = pagerRef.current;
        if (!el) return;
        const p = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        if (p !== page) {
            setPage(p);
            try { window.localStorage.setItem(PAGE_KEY, String(p)); } catch { /* ignore */ }
        }
    };
    const goToPage = (i: number) => {
        const el = pagerRef.current;
        if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    };

    const ownedSheets = SHEETS.filter((sh) => owned.some((s) => s.sheet === sh.id));

    return createPortal(
        <div className="sticker-mgr-backdrop" role="dialog" aria-modal="true" aria-label="Your stickers" onClick={onClose}>
            <div
                className="ambient-pop sticker-pop"
                role="dialog"
                aria-label="Your stickers"
                onClick={(e) => e.stopPropagation()}
                style={anchor ? { position: 'fixed', top: anchor.top, left: anchor.left, marginTop: 0, maxHeight: anchor.maxH } : undefined}
            >
                <span
                    className="ambient-pop-close"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={onClose}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
                >
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    <span className="ambient-pop-title-text">{`⊞${VS15}`} YOUR STICKERS</span>
                    <button className="smgr-store" type="button" onClick={() => { onClose(); openStore('stickers'); }} title="Sticker Store">
                        <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKER STORE
                    </button>
                </div>

                <div className="ambient-pop-pager" ref={pagerRef} onScroll={onPagerScroll}>
                    {/* Page 1 — Arrange */}
                    <div className="ambient-pop-page">
                        <Row label="Layout">
                            {ARRANGES.map((a) => (
                                <Chip key={a.id} on={arrange === a.id} onClick={() => pickArrange(a.id)}>{a.label}</Chip>
                            ))}
                            <button className="ambient-chip" type="button" onClick={() => shuffleSeed()} title="Shuffle">
                                {`⟳${VS15}`}
                            </button>
                        </Row>
                        <Row label="Rows">
                            {ROW_OPTS.map((r) => (
                                <Chip key={r.id} on={rows === r.id} onClick={() => pickRows(r.id)}>{r.label}</Chip>
                            ))}
                        </Row>
                        <Row label="Align">
                            {ALIGNS.map((a) => (
                                <Chip key={a.id} on={align === a.id} onClick={() => pickAlign(a.id)}>{a.label}</Chip>
                            ))}
                        </Row>
                    </div>

                    {/* Page 2 — Style */}
                    <div className="ambient-pop-page">
                        <Row label="Tilt">
                            {TILTS.map((tl) => (
                                <Chip key={tl.id} on={tilt === tl.id} onClick={() => pickTilt(tl.id)}>{tl.label}</Chip>
                            ))}
                        </Row>
                        <Row label="Width">
                            <Chip on={!expand} onClick={() => pickExpand(false)}>FIT</Chip>
                            <Chip on={expand} onClick={() => pickExpand(true)}>WIDE</Chip>
                        </Row>
                        <Row label="Flip">
                            <Chip on={!flip} onClick={() => pickFlip(false)}>OFF</Chip>
                            <Chip on={flip} onClick={() => pickFlip(true)}>UPSIDE-DOWN</Chip>
                        </Row>
                    </div>

                    {/* Page 3 — Stickers */}
                    <div className="ambient-pop-page">
                        <Row label="Sheets">
                            {ownedSheets.map((sh) => (
                                <Chip key={sh.id} on={!offSheets.has(sh.id)} onClick={() => toggleSheet(sh.id)}>{sh.name}</Chip>
                            ))}
                        </Row>
                        <div className="ambient-pop-row smgr-grid-row">
                            <span className="ambient-pop-label">Stickers</span>
                            <div className="smgr-grid">
                                {owned.map((s) => {
                                    const on = isActive(s, offSheets, offIds);
                                    return (
                                        <button
                                            key={s.id}
                                            className={`smgr-tile${on ? '' : ' off'}`}
                                            type="button"
                                            title={`${s.name} — ${on ? 'on' : 'off'}`}
                                            onClick={() => toggleSticker(s.id)}
                                        >
                                            <StickerArt sticker={s} size={34} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ambient-pop-dots" role="tablist" aria-label="Menu pages">
                    {Array.from({ length: PAGES }, (_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`ambient-dot${page === i ? ' on' : ''}`}
                            onClick={() => goToPage(i)}
                            aria-label={`Page ${i + 1}`}
                            aria-selected={page === i}
                            role="tab"
                        />
                    ))}
                </div>

                <div className="ambient-code-row">
                    <span className="ambient-code-label">Setup Code</span>
                    <span className="ambient-code-field">
                        <input
                            ref={codeInputRef}
                            type="text"
                            className="ambient-code-input"
                            value={codeValue}
                            onChange={(e) => { setCodeEditing(true); setCodeValue(e.target.value); }}
                            onFocus={() => {
                                setCodeEditing(true);
                                const el = codeInputRef.current;
                                if (el) window.setTimeout(() => { try { el.select(); } catch { /* ignore */ } }, 0);
                            }}
                            onBlur={applyCode}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); codeInputRef.current?.blur(); }
                                else if (e.key === 'Escape') { e.preventDefault(); setCodeValue(currentCode); setCodeEditing(false); codeInputRef.current?.blur(); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            spellCheck={false}
                            autoCapitalize="characters"
                            autoCorrect="off"
                            title="Sticker Setup Code — shares just your sticker arrangement. Paste a code + Enter to apply."
                        />
                        <span
                            className="ambient-code-copy"
                            onClick={copyCode}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyCode(e); } }}
                            title="Copy Sticker Setup Code"
                            role="button"
                            tabIndex={0}
                        >
                            ⧉{VS15}
                        </span>
                    </span>
                    <button className="ambient-chip ambient-surprise" type="button" onClick={surprise} title="Surprise — a random arrangement">
                        Surprise
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="ambient-pop-row">
            <span className="ambient-pop-label">{label}</span>
            <div className="ambient-pop-chips">{children}</div>
        </div>
    );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" className={`ambient-chip${on ? ' on' : ''}`} onClick={onClick}>
            {children}
        </button>
    );
}
