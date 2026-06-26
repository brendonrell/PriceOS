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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useProfileHex } from '../../lib/hooks/useProfileHex';

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
    getArrange, getTilt, getExpand, getRows, getAlign, getFlip, getDensity, getBorder,
    setArrange, setTilt, setExpand, setRows, setAlign, setFlip, setDensity, setBorder, shuffleSeed,
    ARRANGES, TILTS, ROW_OPTS, ALIGNS, DENSITIES, BORDERS, stickerHue,
    type Arrange, type Tilt, type Rows, type Align, type Border,
} from '../../lib/stickers/heroPrefs';
import { clearPlacements } from '../../lib/stickers/placements';
import {
    encodeStickerCode, decodeStickerCode,
    ARRANGE_IDS, ROW_IDS, ALIGN_IDS, TILT_IDS, type StickerLook,
} from '../../lib/stickers/setupCode';
import { StickerArt } from './StickerArt';

const VS15 = '︎';
const PAGE_KEY = 'pd_sticker_mgr_page';

/* Colour filter — tap a swatch to show only stickers of that detected dominant
   colour. Expanded to 11 colour families × light/dark (Brendon, 2026-06-26): the
   user picks the hue AND the direction (light vs dark — it matters for which
   colorway it reads against). Order is light,dark per family: red, orange,
   yellow, green, blue, purple, pink, brown, then the neutral set black, grey,
   white. The neutral swatches catch greyscale stickers. */
interface Swatch { hex: string; neutral: boolean; }
const HUE_SWATCHES: Swatch[] = [
    { hex: '#FF6B6B', neutral: false }, { hex: '#A30D2D', neutral: false }, // red    L · D
    { hex: '#FFB347', neutral: false }, { hex: '#B85C00', neutral: false }, // orange L · D
    { hex: '#FFEB5C', neutral: false }, { hex: '#C9A227', neutral: false }, // yellow L · D
    { hex: '#7BE37B', neutral: false }, { hex: '#1F7A33', neutral: false }, // green  L · D
    { hex: '#6FB7FF', neutral: false }, { hex: '#163E8F', neutral: false }, // blue   L · D
    { hex: '#C79CFF', neutral: false }, { hex: '#5B2199', neutral: false }, // purple L · D
    { hex: '#FFAAD4', neutral: false }, { hex: '#C43E86', neutral: false }, // pink   L · D
    { hex: '#C8966A', neutral: false }, { hex: '#5E3A1C', neutral: false }, // brown  L · D
    { hex: '#555555', neutral: true  }, { hex: '#0A0A0A', neutral: true  }, // black  L · D
    { hex: '#CFCFCF', neutral: true  }, { hex: '#888888', neutral: true  }, // grey   L · D
    { hex: '#FFFFFF', neutral: true  }, { hex: '#E2E2E2', neutral: true  }, // white  L · D
];
function hexHS(hex: string): { h: number; s: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const s = mx === 0 ? 0 : d / mx;
    let h = 0;
    if (d > 0.0001) h = (((mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60) + 360) % 360;
    return { h, s };
}
function hexRGB(hex: string): { r: number; g: number; b: number } {
    return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}
/** Full-saturation RGB for a hue — the fallback when a sticker has no stored hex
 *  (we only know its hue). */
function hueToRGB(h: number): { r: number; g: number; b: number } {
    const x = 1 - Math.abs(((h / 60) % 2) - 1);
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = 1; g = x; } else if (h < 120) { r = x; g = 1; }
    else if (h < 180) { g = 1; b = x; } else if (h < 240) { g = x; b = 1; }
    else if (h < 300) { r = x; b = 1; } else { r = 1; b = x; }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
const SWATCH_RGB = HUE_SWATCHES.map((sw) => ({ ...sw, ...hexRGB(sw.hex) }));
/** Light swatches get a stronger ring so they read against the panel. */
function isLightHex(hex: string): boolean {
    const { r, g, b } = hexRGB(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.82;
}
/** Nearest swatch (by colour distance) to a given RGB, kept WITHIN the neutral
 *  set for greyscale and the chromatic set otherwise (so a pale-but-coloured
 *  input never collapses into white). Returns the hex key the filter compares. */
function nearestSwatchFromRGB(rgb: { r: number; g: number; b: number }, neutral: boolean): string {
    let best = HUE_SWATCHES[0]!.hex, bd = Infinity;
    for (const sw of SWATCH_RGB) {
        if (sw.neutral !== neutral) continue;
        const dr = rgb.r - sw.r, dg = rgb.g - sw.g, db = rgb.b - sw.b;
        const dd = dr * dr + dg * dg + db * db;
        if (dd < bd) { bd = dd; best = sw.hex; }
    }
    return best;
}
/** The swatch a sticker belongs to (its detected dominant colour). */
function stickerSwatch(s: Sticker): string {
    const hex = s.color ?? s.bg ?? s.cutout ?? s.fg ?? null;
    if (hex && /^#[0-9a-f]{6}$/i.test(hex)) {
        return nearestSwatchFromRGB(hexRGB(hex), hexHS(hex).s < 0.12);
    }
    return nearestSwatchFromRGB(hueToRGB(stickerHue(s)), false);
}
/** The swatch a freeform hex (e.g. the user's profile colour) maps to — used by
 *  the "Match" filter to pull stickers that suit the chosen profile colorway. */
function swatchForHex(hex: string): string {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return HUE_SWATCHES[0]!.hex;
    return nearestSwatchFromRGB(hexRGB(hex), hexHS(hex).s < 0.12);
}

/* Text preset filters — multi-swatch groups shown inline after the circles.
   CMYK maps to PD's palette per Brendon: cyan = light blue, magenta = dark
   (deep) pink, yellow = either yellow, black = either black. PRIMARY is the
   painter's red/yellow/blue triad. "Match" (added per-render) leads them. */
interface Preset { key: string; label: string; hexes: string[] }
const STATIC_PRESETS: Preset[] = [
    { key: 'RGB',     label: 'RGB',     hexes: ['#FF6B6B', '#A30D2D', '#7BE37B', '#1F7A33', '#6FB7FF', '#163E8F'] },
    { key: 'CMYK',    label: 'CMYK',    hexes: ['#6FB7FF', '#C43E86', '#FFEB5C', '#C9A227', '#555555', '#0A0A0A'] },
    { key: 'PRIMARY', label: 'PRIMARY', hexes: ['#FF6B6B', '#A30D2D', '#FFEB5C', '#C9A227', '#6FB7FF', '#163E8F'] },
];
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
    const [border, setBd] = useState<Border>('off');
    /* Colour filter — modal-local view filter on the grid (not persisted). */
    const [hueFilter, setHueFilter] = useState<string | null>(null);

    const pagerRef = useRef<HTMLDivElement | null>(null);
    const plusBodyRef = useRef<HTMLDivElement | null>(null);
    const previewRef = useRef<HTMLDivElement | null>(null);
    const [page, setPage] = useState(0);
    /* Manager Plus — the full-screen (mobile) / jumbo (desktop) view. Opened by
       the ↑ in the header; resets when the menu closes. */
    const [full, setFull] = useState(false);
    /* Which entrance "build" the preview plays — one of 10 generative variants,
       re-rolled every time Plus opens so the stickers plunk in a fresh way. */
    const [fx, setFx] = useState(0);

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
        setBd(getBorder());
        setHueFilter(null);
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

    /* Manager Plus: FORBID the preview box from ever changing height. It must
       "just be there" at its settled size the instant Plus opens; only the
       stickers animate inside it — never the box (Brendon, 2026-06-24). Measure
       the settled content height once (before paint) and pin the box to it, so no
       entrance build / late paint can grow or shrink the window. */
    useIsoLayoutEffect(() => {
        if (!full) return;
        const el = previewRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const h = el.getBoundingClientRect().height;
        if (h > 0) el.style.height = `${h}px`;
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

    /* "Match" = stickers that suit your current Profile Colorway colour. Maps the
       live profile hex to its swatch and leads the text presets. Declared with
       the other hooks (above the closed-modal early return) so hook order is
       stable whether the menu is open or shut. */
    const { hex: profileHex } = useProfileHex();
    const PRESETS = useMemo<Preset[]>(
        () => [{ key: 'MATCH', label: 'Match', hexes: [swatchForHex(profileHex)] }, ...STATIC_PRESETS],
        [profileHex],
    );

    useIsoLayoutEffect(() => {
        if (!open || typeof window === 'undefined') return;
        const measure = () => {
            const el = document.querySelector('.hero-stickers');
            if (!el) { setAnchor(null); return; }
            const r = el.getBoundingClientRect();
            const gap = 22;
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
    /* Border doesn't change placement (just the kiss-cut edge), so it keeps any
       locked hand-placed layout — no clearPlacements. */
    const pickBorder = (b: Border) => { setBd(b); setBorder(b); };

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
    const activePreset = hueFilter ? PRESETS.find((p) => p.key === hueFilter) ?? null : null;
    const matchesHue = (s: Sticker) => {
        if (!hueFilter) return true;
        const sw = stickerSwatch(s);
        return activePreset ? activePreset.hexes.includes(sw) : sw === hueFilter;
    };
    const stickerGrid = (
        <div className="smgr-grid-groups">
            <div className="smgr-hue-row" role="group" aria-label="Filter by colour">
                <button
                    type="button"
                    className={`smgr-hue smgr-hue-clear${hueFilter === null ? ' on' : ''}`}
                    title="Show all colours"
                    aria-label="Clear colour filter"
                    aria-pressed={hueFilter === null}
                    onClick={() => setHueFilter(null)}
                >
                    {`×${VS15}`}
                </button>
                {HUE_SWATCHES.map(({ hex }) => (
                    <button
                        key={hex}
                        type="button"
                        className={`smgr-hue${hueFilter === hex ? ' on' : ''}${isLightHex(hex) ? ' is-neutral' : ''}`}
                        style={{ background: hex }}
                        title={hueFilter === hex ? 'Show all colours' : 'Filter to this colour'}
                        aria-pressed={hueFilter === hex}
                        onClick={() => setHueFilter((prev) => (prev === hex ? null : hex))}
                    />
                ))}
                {PRESETS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        className={`smgr-hue-preset${hueFilter === p.key ? ' on' : ''}`}
                        title={hueFilter === p.key ? 'Show all colours' : `Filter to ${p.label}`}
                        aria-pressed={hueFilter === p.key}
                        onClick={() => setHueFilter((prev) => (prev === p.key ? null : p.key))}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            {ownedSheets.map((sh) => {
                const tiles = owned.filter((s) => s.sheet === sh.id && matchesHue(s));
                if (tiles.length === 0) return null;
                return (
                    <div className="smgr-grid" key={sh.id}>
                        {tiles.map((s) => {
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
                );
            })}
            {hueFilter && owned.every((s) => !matchesHue(s)) && (
                <div className="smgr-hue-empty">No stickers in this colour.</div>
            )}
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
                        <span className="ambient-pop-title-text"><span className="smgr-title-ic">{`⊞${VS15}`}</span> <span className="smgr-title-words">STICKER MANAGER+</span></span>
                        <button className="smgr-store" type="button" onClick={() => { onClose(); openStore('stickers'); }} title="Sticker Store">
                            <span className="smgr-store-ic">{`▶${VS15}`}</span> STORE
                        </button>
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Sticker Manager: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
                            {`↓${VS15}`}
                        </button>
                        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={onClose}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}>
                            {`×${VS15}`}
                        </span>
                    </div>

                    {previewNode != null && <div ref={previewRef} className={`smgr-plus-preview smgr-fx-${fx}`} aria-label="Live preview">{previewNode}</div>}

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
                        <Row label="Border">
                            {BORDERS.map((b) => (<Chip key={b.id} on={border === b.id} onClick={() => pickBorder(b.id)}>{b.label}</Chip>))}
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
                    <span className="ambient-pop-title-text"><span className="smgr-title-ic">{`⊞${VS15}`}</span> <span className="smgr-title-words">STICKER MANAGER</span></span>
                    <button className="smgr-store" type="button" onClick={() => { onClose(); openStore('stickers'); }} title="Sticker Store">
                        <span className="smgr-store-ic">{`▶${VS15}`}</span> STORE
                    </button>
                    <button className="smgr-expand" type="button" onClick={() => { setFx(Math.floor(Math.random() * 10)); setFull(true); showToast('Sticker Manager: PLUS'); }} title="Open Manager Plus" aria-label="Open Manager Plus">
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
                        <Row label="Border">
                            {BORDERS.map((b) => (<Chip key={b.id} on={border === b.id} onClick={() => pickBorder(b.id)}>{b.label}</Chip>))}
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
