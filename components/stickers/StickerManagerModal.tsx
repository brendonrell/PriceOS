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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* Measure-before-paint on the client (plain effect on the server, where there's
   no layout) so the popup is positioned on its very first painted frame. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { createPortal } from 'react-dom';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/state/bodyScrollLock';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { SHEETS, type Sticker } from '../../lib/stickers/catalog';
import {
    computeOwnedFor, getOffSheets, getOffIds, isActive,
    toggleSheetActive, toggleStickerActive,
} from '../../lib/stickers/owned';
import {
    getArrange, getTilt, getExpand, getRows, getAlign, getFlip, getDensity,
    setArrange, setTilt, setExpand, setRows, setAlign, setFlip, setDensity, shuffleSeed,
    ARRANGES, TILTS, ROW_OPTS, ALIGNS, DENSITIES,
    type Arrange, type Tilt, type Rows, type Align,
} from '../../lib/stickers/heroPrefs';
import { clearPlacements } from '../../lib/stickers/placements';
import {
    encodeStickerCode, decodeStickerCode,
    ARRANGE_IDS, ROW_IDS, ALIGN_IDS, TILT_IDS, type StickerLook,
} from '../../lib/stickers/setupCode';
import { StickerArt } from './StickerArt';

const VS15 = '︎';
const PAGE_KEY = 'pd_sticker_mgr_page';
const PAGES = 4;

export function StickerManagerModal({
    open, onClose, handle, previewNode,
}: {
    open: boolean;
    onClose: () => void;
    handle: string;
    /** A read-only live preview of the owner's arrangement, rendered at the top
     *  of Manager Plus (full-screen). Passed in to avoid a circular import. */
    previewNode?: React.ReactNode;
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
    const [density, setDen] = useState(0);

    const pagerRef = useRef<HTMLDivElement | null>(null);
    const plusBodyRef = useRef<HTMLDivElement | null>(null);
    const [page, setPage] = useState(0);
    /* Manager Plus — the full-screen (mobile) / jumbo (desktop) view. Opened by
       the ↑ in the header; resets when the menu closes. */
    const [full, setFull] = useState(false);

    const look: StickerLook = { arrange, rows, align, tilt, expand, flip };
    const currentCode = encodeStickerCode(look);
    const [codeValue, setCodeValue] = useState(currentCode);
    const [codeEditing, setCodeEditing] = useState(false);
    const codeCopyingRef = useRef(false);
    const codeInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) { setFull(false); return; }
        setOwned(computeOwnedFor(handle));
        setOffSheets(new Set(getOffSheets()));
        setOffIds(new Set(getOffIds()));
        setArr(getArrange());
        setTl(getTilt());
        setExp(getExpand());
        setRw(getRows());
        setAl(getAlign());
        setFl(getFlip());
        setDen(getDensity());
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

    /* Manager Plus: the scrolling control body is vertical-only, but iOS WebKit
       turns a vertical scroller into a horizontal one too and shoves it sideways
       on open — leaving every control row's label + first chip off the left edge.
       Hard-pin its horizontal scroll to 0 across the open + entrance frames so the
       rows always sit flush left (Brendon, 2026-06-24). */
    useEffect(() => {
        if (!full) return;
        const pin = () => { const el = plusBodyRef.current; if (el && el.scrollLeft !== 0) el.scrollLeft = 0; };
        pin();
        const r = requestAnimationFrame(pin);
        const t = window.setTimeout(pin, 300);
        return () => { cancelAnimationFrame(r); window.clearTimeout(t); };
    }, [full]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    /* Freeze the page underneath while the manager is open — without this a drag
       inside the menu scrolls the profile behind it and trips pull-to-refresh
       (Brendon, 2026-06-24). */
    useEffect(() => {
        if (!open) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [open]);

    // Anchor the popup DIRECTLY BELOW the sticker area so your stickers stay
    // visible above it — you watch the changes land as you make them. Height is
    // capped to the room below (never taller than the ambient menu).
    const [anchor, setAnchor] = useState<{ top: number; left: number; maxH: number } | null>(null);
    useIsoLayoutEffect(() => {
        if (!open || typeof window === 'undefined') return;
        const measure = () => {
            const el = document.querySelector('.hero-stickers');
            if (!el) { setAnchor(null); return; }
            const r = el.getBoundingClientRect();
            const gap = 13;
            const top = r.bottom + gap;
            const vw = window.innerWidth, vh = window.innerHeight;
            const popW = Math.min(330, vw * 0.88);
            const left = Math.max(8, Math.min(r.left, vw - popW - 8));
            // FIXED height — the menu is ALWAYS the same height (Brendon
            // 2026-06-23), never scaled to the room below the stickers; the
            // pages scroll inside. Clamped only as an off-screen safety on very
            // short viewports.
            const maxH = Math.min(254, Math.max(190, vh - top - 8));
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
        // At least one owned sheet must stay on — refuse the last one.
        if (!offSheets.has(id)) {
            const ownedSheetIds = new Set(owned.map((s) => s.sheet as string));
            const willOff = new Set(offSheets); willOff.add(id);
            const anyOn = [...ownedSheetIds].some((sh) => !willOff.has(sh));
            if (!anyOn) { showToast('Sheets: KEEP ONE ON'); return; }
        }
        toggleSheetActive(id as Parameters<typeof toggleSheetActive>[0]);
        setOffSheets((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSticker = (id: string) => {
        toggleStickerActive(id);
        setOffIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    /* Every generative tuning control re-rolls the composition, so each one drops
       a locked hand-placed layout back to generative and takes effect immediately
       — the lock only returns on the next drag-drop (Brendon, 2026-06-24). */
    const reshuffle = () => { clearPlacements(); shuffleSeed(); };
    const pickArrange = (a: Arrange) => { clearPlacements(); setArr(a); setArrange(a); };
    const pickTilt = (t: Tilt) => { clearPlacements(); setTl(t); setTilt(t); };
    const pickExpand = (b: boolean) => { clearPlacements(); setExp(b); setExpand(b); };
    const pickRows = (r: Rows) => { clearPlacements(); setRw(r); setRows(r); };
    const pickAlign = (a: Align) => { clearPlacements(); setAl(a); setAlign(a); };
    const pickFlip = (b: boolean) => { clearPlacements(); setFl(b); setFlip(b); };
    const pickDensity = (d: number) => { clearPlacements(); setDen(d); setDensity(d); };

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

    /* The sticker grid (owned, tap to toggle) — shared by both views. Grouped by
       sheet: each sheet starts on its own row, with a gap between groups so the
       end/start of a sheet reads clearly. */
    const stickerGrid = (
        <div className="smgr-grid-groups">
            {ownedSheets.map((sh) => (
                <div className="smgr-grid" key={sh.id}>
                    {owned.filter((s) => s.sheet === sh.id).map((s) => {
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
            ))}
        </div>
    );

    /* Sheet toggles — styled like the trait value pills (outlined/greyed when
       off, filled when on) rather than the default chip. */
    const sheetPill = (sh: (typeof SHEETS)[number]) => (
        <button
            key={sh.id}
            type="button"
            className={`pill smgr-sheet-pill ui-knockout${!offSheets.has(sh.id) ? ' active' : ''}`}
            onClick={() => toggleSheet(sh.id)}
        >
            <StickerArt sticker={sh.cover} size={14} />
            {sh.name}
        </button>
    );

    // ── MANAGER PLUS — full-screen (mobile) / jumbo centred panel (desktop) ──
    // Live preview up top, then ALL controls at once (no paging), then the full
    // collection grid. Reuses the same handlers + Row/Chip as the compact popup.
    if (full) {
        return createPortal(
            <div className="sticker-mgr-plus-backdrop" role="dialog" aria-modal="true" aria-label="Your stickers — full" onClick={onClose}>
                <div className="sticker-mgr-plus" onClick={(e) => e.stopPropagation()}>
                    <div className="smgr-plus-head">
                        <span className="ambient-pop-title-text"><span className="smgr-title-ic">{`⊞${VS15}`}</span> <span className="smgr-title-words">YOUR STICKERS</span></span>
                        <button className="smgr-store" type="button" onClick={() => { onClose(); openStore('stickers'); }} title="Sticker Store">
                            <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKER STORE
                        </button>
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Sticker Manager: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
                            {`↓${VS15}`}
                        </button>
                        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={onClose}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}>
                            {`×${VS15}`}
                        </span>
                    </div>

                    {previewNode != null && <div className="smgr-plus-preview" aria-label="Live preview">{previewNode}</div>}

                    <div
                        className="smgr-plus-body"
                        ref={plusBodyRef}
                        /* Belt-and-suspenders: if WebKit ever scrolls the body
                           sideways, snap it straight back (vertical scroll is
                           untouched — scrollLeft is always meant to be 0). */
                        onScroll={(e) => { const el = e.currentTarget; if (el.scrollLeft !== 0) el.scrollLeft = 0; }}
                    >
                        <Row label="Layout">
                            {ARRANGES.map((a) => (
                                <Chip key={a.id} on={arrange === a.id} onClick={() => pickArrange(a.id)}>{a.label}</Chip>
                            ))}
                            <button className="ambient-chip smgr-shuffle" type="button" onClick={reshuffle} title="Shuffle">{`⟳${VS15}`}</button>
                        </Row>
                        <Row label="Rows">
                            {ROW_OPTS.map((r) => (<Chip key={r.id} on={rows === r.id} onClick={() => pickRows(r.id)}>{r.label}</Chip>))}
                        </Row>
                        <Row label="Density">
                            {DENSITIES.map((d) => (<Chip key={d.id} on={density === d.id} onClick={() => pickDensity(d.id)}>{d.label}</Chip>))}
                        </Row>
                        <Row label="Align">
                            {ALIGNS.map((a) => (<Chip key={a.id} on={align === a.id} onClick={() => pickAlign(a.id)}>{a.label}</Chip>))}
                        </Row>
                        <Row label="Tilt">
                            {TILTS.map((tl) => (<Chip key={tl.id} on={tilt === tl.id} onClick={() => pickTilt(tl.id)}>{tl.label}</Chip>))}
                        </Row>
                        <Row label="Width">
                            <Chip on={!expand} onClick={() => pickExpand(false)}>FIT</Chip>
                            <Chip on={expand} onClick={() => pickExpand(true)}>WIDE</Chip>
                        </Row>
                        <Row label="Flip">
                            <Chip on={!flip} onClick={() => pickFlip(false)}>OFF</Chip>
                            <Chip on={flip} onClick={() => pickFlip(true)}>UPSIDE-DOWN</Chip>
                        </Row>
                        <Row label="Sheets">
                            {ownedSheets.map(sheetPill)}
                        </Row>
                        <div className="ambient-pop-row smgr-grid-row">
                            <span className="ambient-pop-label">Stickers</span>
                            {stickerGrid}
                        </div>
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div className="sticker-mgr-backdrop" role="dialog" aria-modal="true" aria-label="Your stickers" onClick={onClose}>
            <div
                className="ambient-pop sticker-pop"
                role="dialog"
                aria-label="Your stickers"
                onClick={(e) => e.stopPropagation()}
                /* Stay invisible until the anchor is measured, so the menu never
                   flashes at its default spot above the stickers before dropping
                   into place below them (Brendon, 2026-06-24). */
                style={anchor ? { position: 'fixed', top: anchor.top, left: anchor.left, marginTop: 0, maxHeight: anchor.maxH } : { visibility: 'hidden' }}
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
                    <span className="ambient-pop-title-text"><span className="smgr-title-ic">{`⊞${VS15}`}</span> <span className="smgr-title-words">YOUR STICKERS</span></span>
                    <button className="smgr-store" type="button" onClick={() => { onClose(); openStore('stickers'); }} title="Sticker Store">
                        <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKER STORE
                    </button>
                    <button className="smgr-expand" type="button" onClick={() => { setFull(true); showToast('Sticker Manager: PLUS'); }} title="Open Manager Plus" aria-label="Open Manager Plus">
                        {`↑${VS15}`}
                    </button>
                </div>

                <div className="ambient-pop-pager" ref={pagerRef} onScroll={onPagerScroll}>
                    {/* Page 1 — Layout. Each page holds only what fits at the
                        compact height; the control rows never scroll — overflow
                        spills onto a new dot page. Only the sticker grid scrolls. */}
                    <div className="ambient-pop-page">
                        <Row label="Layout">
                            {ARRANGES.map((a) => (
                                <Chip key={a.id} on={arrange === a.id} onClick={() => pickArrange(a.id)}>{a.label}</Chip>
                            ))}
                            <button className="ambient-chip smgr-shuffle" type="button" onClick={reshuffle} title="Shuffle">
                                {`⟳${VS15}`}
                            </button>
                        </Row>
                        <Row label="Rows">
                            {ROW_OPTS.map((r) => (
                                <Chip key={r.id} on={rows === r.id} onClick={() => pickRows(r.id)}>{r.label}</Chip>
                            ))}
                        </Row>
                    </div>

                    {/* Page 2 — Density (stack pile) above Align + Tilt */}
                    <div className="ambient-pop-page">
                        <Row label="Density">
                            {DENSITIES.map((d) => (
                                <Chip key={d.id} on={density === d.id} onClick={() => pickDensity(d.id)}>{d.label}</Chip>
                            ))}
                        </Row>
                        <Row label="Align">
                            {ALIGNS.map((a) => (
                                <Chip key={a.id} on={align === a.id} onClick={() => pickAlign(a.id)}>{a.label}</Chip>
                            ))}
                        </Row>
                        <Row label="Tilt">
                            {TILTS.map((tl) => (
                                <Chip key={tl.id} on={tilt === tl.id} onClick={() => pickTilt(tl.id)}>{tl.label}</Chip>
                            ))}
                        </Row>
                    </div>

                    {/* Page 3 */}
                    <div className="ambient-pop-page">
                        <Row label="Width">
                            <Chip on={!expand} onClick={() => pickExpand(false)}>FIT</Chip>
                            <Chip on={expand} onClick={() => pickExpand(true)}>WIDE</Chip>
                        </Row>
                        <Row label="Flip">
                            <Chip on={!flip} onClick={() => pickFlip(false)}>OFF</Chip>
                            <Chip on={flip} onClick={() => pickFlip(true)}>UPSIDE-DOWN</Chip>
                        </Row>
                    </div>

                    {/* Page 4 — Stickers. Scrolls AS ONE: sheet names not pinned,
                        they scroll together with the grid. */}
                    <div className="ambient-pop-page smgr-sheet-page">
                        <Row label="Sheets">
                            {ownedSheets.map(sheetPill)}
                        </Row>
                        <div className="ambient-pop-row smgr-grid-row">
                            <span className="ambient-pop-label">Stickers</span>
                            {stickerGrid}
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
