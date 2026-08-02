'use client';

/*
 * StickerManagerModal — your sticker controls, opened by tapping your stickers
 * on your own profile. Built on the AMBIENT LIGHT menu's exact shell: same
 * popup, same swipe-pager with page dots, same chip rows (Brendon 2026-06-22 —
 * "the SAME thing"). It's just taller. Settings are split across windows you
 * swipe between; the dots track + jump pages.
 *
 * Self-contained: reads its state ONCE when it opens and manages a LOCAL copy,
 * so toggling updates instantly with no global re-render (no flash).
 *
 * SAVE (Brendon, 2026-07-27): opening the manager starts a DRAFT. Every change
 * paints on your hero straight away — you're editing your real profile, not a
 * mock-up — but nothing is published to your account until you press SAVE and
 * confirm it. Close without saving and your stickers go back exactly as they
 * were. Spreads keep their own SAVE and are never touched by a discard.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useProfileHex } from '../../lib/hooks/useProfileHex';

/* Measure-before-paint on the client (plain effect on the server, where there's
   no layout) so the popup is positioned on its very first painted frame. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { createPortal } from 'react-dom';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/state/bodyScrollLock';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import {
    SHEETS, STICKERS, BRAND_COLOURS, stickerFill, type Sticker,
} from '../../lib/stickers/catalog';
import {
    computeOwnedFor, getOffSheets, getOffIds, isActive,
    toggleSheetActive, toggleStickerActive,
    getColourLock, applyColourLock, clearColourLock, holdStickerPush, type ColourLock,
} from '../../lib/stickers/owned';
import {
    useSpreads, saveSpread, renameSpread, deleteSpread, applySpread,
    SPREAD_NAME_MAX, MAX_SPREADS, type Spread,
} from '../../lib/stickers/spreads';
import {
    getArrange, getTilt, getExpand, getRows, getAlign, getFlip, getDensity, getBorder, getSeed,
    setArrange, setTilt, setExpand, setRows, setAlign, setFlip, setDensity, setBorder, setSeed, shuffleSeed,
    ARRANGES, TILTS, ROW_OPTS, ALIGNS, DENSITIES, BORDERS, stickerHue,
    type Arrange, type Tilt, type Rows, type Align, type Border,
} from '../../lib/stickers/heroPrefs';
import { clearPlacements } from '../../lib/stickers/placements';
import {
    beginStickerDraft, saveStickerDraft, discardStickerDraft, stickersDiffer,
    type StickerSnapshot,
} from '../../lib/stickers/draft';
import {
    encodeStickerCode, decodeStickerCode,
    ARRANGE_IDS, ROW_IDS, ALIGN_IDS, TILT_IDS, type StickerLook,
} from '../../lib/stickers/setupCode';
import { StickerArt } from './StickerArt';

const VS15 = '︎';
const PAGE_KEY = 'pd_sticker_mgr_page';
/** Slot marks for the Spreads row — the same numbering the gallery's saved
 *  views use, so a saved thing looks like a saved thing everywhere. */
const SLOT_GLYPHS = ['①', '②', '③'] as const;

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
/* Family names, in HUE_SWATCHES order (each family = its light,dark pair) — used
   by the long-press "all of this hue" toast. */
const HUE_FAMILY_NAMES = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'PINK', 'BROWN', 'BLACK', 'GREY', 'WHITE'];
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

/** The whole hue FAMILY a freeform colour belongs to — its light + dark pair,
 *  plus the family's name. Exactly what long-pressing a swatch selects, so the
 *  keychain's one-tap match narrows on the SAME set the menu would (Rule #0). */
export function hueFamilyForHex(hex: string): { hexes: string[]; label: string } {
    const sw = swatchForHex(hex);
    const at = HUE_SWATCHES.findIndex((s) => s.hex === sw);
    const start = at < 0 ? 0 : at - (at % 2);
    const hexes = [HUE_SWATCHES[start]?.hex, HUE_SWATCHES[start + 1]?.hex].filter(Boolean) as string[];
    return { hexes, label: HUE_FAMILY_NAMES[Math.floor(start / 2)] ?? 'COLOUR' };
}

/** Which family a given sticker sits in — the same read the grid's filter uses. */
export function swatchOfSticker(s: Sticker): string {
    return stickerSwatch(s);
}

/* Text preset filters — multi-swatch groups shown inline after the circles.
   CMYK maps to PD's palette per Brendon: cyan = light blue, magenta = dark
   (deep) pink, yellow = either yellow, black = either black. PRIMARY is the
   painter's red/yellow/blue triad. "Match" (added per-render) leads them. */
interface Preset {
    key: string;
    label: string;
    hexes: string[];
    /* BRAND presets match a sticker's own fill EXACTLY rather than the nearest
       swatch (Brendon, 2026-07-24). Without this the two house colours are
       unfindable by name: Hothurt lands in the "dark pink" bucket and Attention
       in "light yellow", so nothing tells you where the Classics went. */
    exact?: string[];
}
const BRAND_PRESETS: Preset[] = BRAND_COLOURS.map((b) => ({
    key: `BRAND:${b.key}`, label: b.name, hexes: [], exact: [b.hex],
}));
const STATIC_PRESETS: Preset[] = [
    { key: 'RGB',     label: 'RGB',     hexes: ['#FF6B6B', '#A30D2D', '#7BE37B', '#1F7A33', '#6FB7FF', '#163E8F'] },
    { key: 'CMYK',    label: 'CMYK',    hexes: ['#6FB7FF', '#C43E86', '#FFEB5C', '#C9A227', '#555555', '#0A0A0A'] },
    { key: 'PRIMARY', label: 'PR', hexes: ['#FF6B6B', '#A30D2D', '#FFEB5C', '#C9A227', '#6FB7FF', '#163E8F'] },
];
/** How many not-yet-owned stickers the "what you're missing" strip shows before
 *  the count line does the talking. A wide hue can match hundreds. */
const MISSING_SHOWN = 12;
const PAGES = 5;

export function StickerManagerModal({
    open, onClose: closeRequested, handle, previewNode,
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
    /* The live generative roll — part of the look now (the Setup Code carries
       it), tracked locally so the code field updates the moment it changes. */
    const [seedV, setSeedV] = useState(1);
    /* Colour filter — modal-local view filter on the grid (not persisted). A
       single swatch tap filters to that exact colour; LONG-PRESSING a swatch
       selects the WHOLE hue family (its light + dark), held in `famHexes`. */
    const [hueFilter, setHueFilter] = useState<string | null>(null);
    const [famHexes, setFamHexes] = useState<string[] | null>(null);
    /* The one-tap colour lock, if the profile is currently narrowed to one.
       Account-backed, so the way back out survives closing the menu. */
    const [lock, setLock] = useState<ColourLock | null>(null);
    /* Spreads — saved arrangements. Live, so a save shows instantly. */
    const spreads = useSpreads();
    const [renaming, setRenaming] = useState<string | null>(null);
    const [renameText, setRenameText] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<Spread | null>(null);
    /* THE DRAFT — the stickers exactly as they stood when this opened, and
       whether anything has moved since. Nothing reaches the account until SAVE. */
    const snapRef = useRef<StickerSnapshot>({});
    const [unsaved, setUnsaved] = useState(false);
    const [confirmSave, setConfirmSave] = useState(false);

    const pagerRef = useRef<HTMLDivElement | null>(null);
    const plusBodyRef = useRef<HTMLDivElement | null>(null);
    const previewRef = useRef<HTMLDivElement | null>(null);
    const lpTimer = useRef<number | null>(null);
    const lpFired = useRef(false);
    const [page, setPage] = useState(0);
    /* Manager Plus — the full-screen (mobile) / jumbo (desktop) view. Opened by
       the ↑ in the header; resets when the menu closes. */
    const [full, setFull] = useState(false);
    /* Which entrance "build" the preview plays — one of 10 generative variants,
       re-rolled every time Plus opens so the stickers plunk in a fresh way. */
    const [fx, setFx] = useState(0);

    const look: StickerLook = { arrange, rows, align, tilt, expand, flip, density, border, seed: seedV };
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
        setSeedV(getSeed());
        setHueFilter(null);
        setFamHexes(null);
        setLock(getColourLock());
        setRenaming(null);
        setConfirmDelete(null);
        setConfirmSave(false);
        setUnsaved(false);
        snapRef.current = beginStickerDraft();
    }, [open, handle]);

    /* Any change to any sticker surface re-checks the draft against the
       snapshot, so SAVE lights the moment something really differs — and goes
       dark again if you put it back yourself. */
    useEffect(() => {
        if (!open) return;
        const check = () => setUnsaved(stickersDiffer(snapRef.current));
        window.addEventListener('pd:stickers-changed', check);
        return () => window.removeEventListener('pd:stickers-changed', check);
    }, [open]);

    /* Leaving without saving puts every sticker back where it was. The gate is
       released either way, so a closed manager never holds an account write. */
    const onClose = useCallback(() => {
        const hadChanges = stickersDiffer(snapRef.current);
        discardStickerDraft(snapRef.current);
        if (hadChanges) showToast('Stickers: UNCHANGED');
        setUnsaved(false);
        setConfirmSave(false);
        closeRequested();
    }, [closeRequested, showToast]);

    const commitSave = useCallback(() => {
        snapRef.current = saveStickerDraft();
        setUnsaved(false);
        setConfirmSave(false);
        showToast('Stickers: SAVED');
    }, [showToast]);

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

    /* Safety: a manager that disappears without going through its own close
       must never leave the account write held shut. */
    useEffect(() => () => { holdStickerPush(false); }, []);

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
        () => [
            { key: 'MATCH', label: 'Match', hexes: [swatchForHex(profileHex)] },
            ...BRAND_PRESETS,
            ...STATIC_PRESETS,
        ],
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
        /* ⛔ IT FOLLOWS THE STICKERS DOWN (Brendon, 2026-08-01: "sticker manager
           covers the stickers, I thought we set this up to not do that"). The
           spot was measured ONCE, on open — then the first thing you do in the
           menu is change the look, the hero grows (1 row → 3), and the card is
           left sitting on top of the rows it is supposed to sit under. It
           re-measures whenever the sticker area actually changes size, so it
           stays below them through every change you make. */
        const el = document.querySelector('.hero-stickers');
        const ro = el && typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => measure())
            : null;
        if (el && ro) ro.observe(el);
        /* Every look change fires this — it also covers the hero being replaced
           outright, which the observer alone would lose track of. */
        let raf = 0;
        const onChanged = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => requestAnimationFrame(measure));
        };
        window.addEventListener('pd:stickers-changed', onChanged);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
            window.removeEventListener('pd:stickers-changed', onChanged);
            cancelAnimationFrame(raf);
            ro?.disconnect();
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
    const reshuffle = () => { clearPlacements(); shuffleSeed(); setSeedV(getSeed()); };
    const pickArrange = (a: Arrange) => { clearPlacements(); setArr(a); setArrange(a); };
    const pickTilt = (t: Tilt) => { clearPlacements(); setTl(t); setTilt(t); };
    /* ⛔ ALWAYS FIT (Brendon, 2026-08-02: "making the profile wide fucks up so
       much of the UI it's dumb. ALWAYS FIT"). The WIDE chips are gone and the
       setter is pinned off, so a saved look, a Setup Code or SURPRISE can never
       hand it back. */
    const pickExpand = (_b: boolean) => { clearPlacements(); setExp(false); setExpand(false); };
    const pickRows = (r: Rows) => { clearPlacements(); setRw(r); setRows(r); };
    const pickAlign = (a: Align) => { clearPlacements(); setAl(a); setAlign(a); };
    const pickFlip = (b: boolean) => { clearPlacements(); setFl(b); setFlip(b); };
    const pickDensity = (d: number) => { clearPlacements(); setDen(d); setDensity(d); };
    /* Border doesn't change placement (just the kiss-cut edge), so it keeps any
       locked hand-placed layout — no clearPlacements. */
    const pickBorder = (b: Border) => { setBd(b); setBorder(b); };

    // Apply a whole look at once (from a pasted code or Surprise). A code that
    // carries a seed restores the EXACT picture; a seedless (old) code leaves
    // the current roll alone.
    const applyLook = (l: StickerLook) => {
        pickArrange(l.arrange); pickRows(l.rows); pickAlign(l.align);
        pickTilt(l.tilt); pickExpand(l.expand); pickFlip(l.flip);
        pickDensity(l.density); pickBorder(l.border);
        if (l.seed !== undefined) { setSeed(l.seed); setSeedV(l.seed); }
    };
    const applyCode = () => {
        const trimmed = codeValue.trim();
        if (!trimmed || trimmed.toUpperCase() === currentCode) { setCodeValue(currentCode); setCodeEditing(false); return; }
        // Hidden word — type SPILL (anywhere in the code) to dump the whole sheet
        // out across the hero: a chaotic, flipped, freshly-shuffled collage. Sticker
        // -native egg, no chip for it anywhere.
        const word = trimmed.toUpperCase().replace(/[^A-Z]/g, '');
        if (word.includes('SPILL')) {
            applyLook({ arrange: 'collage', rows: 2, align: 'left', tilt: 'jaunty', expand: false, flip: true, density, border });
            shuffleSeed();
            setSeedV(getSeed());
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
        applyLook({ arrange: r(ARRANGE_IDS), rows: r(ROW_IDS), align: r(ALIGN_IDS), tilt: r(TILT_IDS), expand: false, flip: Math.random() < 0.4, density, border });
        shuffleSeed();
        setSeedV(getSeed());
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

    /* Rows is a first-class control in EVERY layout (Brendon, 2026-07-10): the
       linear modes chunk into rows; the canvas modes read it as lid height. */
    const rowsChips = ROW_OPTS.map((r) => (
        <Chip key={r.id} on={rows === r.id} onClick={() => pickRows(r.id)}>{r.label}</Chip>
    ));

    /* The sticker grid (owned, tap to toggle) — shared by both views. Grouped by
       sheet: each sheet starts on its own row, with a gap between groups so the
       end/start of a sheet reads clearly. */
    const activePreset = hueFilter ? PRESETS.find((p) => p.key === hueFilter) ?? null : null;
    const matchesHue = (s: Sticker) => {
        if (famHexes) return famHexes.includes(stickerSwatch(s));
        if (!hueFilter) return true;
        if (activePreset?.exact) {
            const fill = stickerFill(s);
            return fill != null && activePreset.exact.some((h) => h.toLowerCase() === fill.toLowerCase());
        }
        const sw = stickerSwatch(s);
        return activePreset ? activePreset.hexes.includes(sw) : sw === hueFilter;
    };

    /* ── THE ONE-TAP COLOUR (Brendon, 2026-07-24) ──────────────────────────
       "Make my stickers Hothurt" narrows the profile to the ones you ALREADY
       OWN in that colour — it cannot repaint anything, because a sticker's
       colour IS its identity and that identity is what you own. What you're
       missing shows underneath, unowned and unpushy; the completionist does
       the selling, and there is no paywall anywhere in it. */
    const filterOn = famHexes !== null || hueFilter !== null;
    const filterKey = famHexes ? `fam:${famHexes.join(',')}` : hueFilter ?? '';
    const filterLabel = (() => {
        if (famHexes) {
            const i = HUE_SWATCHES.findIndex((sw) => sw.hex === famHexes[0]);
            return i >= 0 ? (HUE_FAMILY_NAMES[Math.floor(i / 2)] ?? 'COLOUR') : 'COLOUR';
        }
        if (!hueFilter) return '';
        if (activePreset) return activePreset.label.toUpperCase();
        const i = HUE_SWATCHES.findIndex((sw) => sw.hex === hueFilter);
        return i >= 0 ? `${i % 2 === 0 ? 'LIGHT' : 'DARK'} ${HUE_FAMILY_NAMES[Math.floor(i / 2)] ?? ''}`.trim() : 'COLOUR';
    })();
    /* Everything in the whole catalog wearing this colour, and the split
       between what you hold and what you don't. */
    const inColour = filterOn ? STICKERS.filter(matchesHue) : [];
    const ownedIdSet = new Set(owned.map((s) => s.id));
    const haveInColour = inColour.filter((s) => ownedIdSet.has(s.id));
    const missingInColour = inColour.filter((s) => !ownedIdSet.has(s.id));
    const toggleWear = () => {
        if (lock) {
            /* Tapping the lit pill always UNDOES — the way out is the same
               button as the way in (Rule #-0.4). */
            clearColourLock();
            setLock(null);
            setOffIds(new Set(getOffIds()));
            showToast(`Stickers: ALL BACK`);
            return;
        }
        if (!filterOn || haveInColour.length === 0) {
            showToast(`Stickers: NONE IN ${filterLabel || 'THIS COLOUR'}`);
            return;
        }
        applyColourLock(filterKey, filterLabel, haveInColour.map((s) => s.id), owned.map((s) => s.id));
        setLock(getColourLock());
        setOffIds(new Set(getOffIds()));
        showToast(`Profile: ${filterLabel}`);
    };
    /* Long-press a swatch → its whole hue family (the light + dark pair, which
       sit adjacent in HUE_SWATCHES). A normal tap stays single-colour. A toast
       names what just happened — most people trigger it by accident the first
       time (Brendon, 2026-06-26). */
    const selectFamily = (i: number) => {
        const start = i - (i % 2);
        const pair = [HUE_SWATCHES[start]?.hex, HUE_SWATCHES[start + 1]?.hex].filter(Boolean) as string[];
        if (pair.length) {
            setHueFilter(null);
            setFamHexes(pair);
            showToast(`Stickers: ALL ${HUE_FAMILY_NAMES[start / 2] ?? ''}`.trimEnd());
        }
    };
    const lpStart = (i: number) => {
        lpFired.current = false;
        if (lpTimer.current != null) window.clearTimeout(lpTimer.current);
        lpTimer.current = window.setTimeout(() => { lpFired.current = true; lpTimer.current = null; selectFamily(i); }, 420);
    };
    const lpEnd = () => { if (lpTimer.current != null) { window.clearTimeout(lpTimer.current); lpTimer.current = null; } };

    const noneOn = hueFilter === null && !famHexes;
    const stickerGrid = (
        <div className="smgr-grid-groups">
            <div className="smgr-hue-row" role="group" aria-label="Filter by colour">
                <button
                    type="button"
                    className={`smgr-hue smgr-hue-clear${noneOn ? ' on' : ''}`}
                    title="Show all colours"
                    aria-label="Clear colour filter"
                    aria-pressed={noneOn}
                    onClick={() => { setHueFilter(null); setFamHexes(null); showToast('Stickers: ALL COLOURS'); }}
                >
                    {`×${VS15}`}
                </button>
                {HUE_SWATCHES.map(({ hex }, i) => {
                    const on = hueFilter === hex || (famHexes?.includes(hex) ?? false);
                    return (
                        <button
                            key={hex}
                            type="button"
                            className={`smgr-hue${on ? ' on' : ''}${isLightHex(hex) ? ' is-neutral' : ''}`}
                            style={{ background: hex }}
                            title={on ? 'Show all colours' : 'Tap: this colour · Hold: all of this hue'}
                            aria-pressed={on}
                            onPointerDown={() => lpStart(i)}
                            onPointerUp={lpEnd}
                            onPointerLeave={lpEnd}
                            onPointerCancel={lpEnd}
                            onClick={() => {
                                if (lpFired.current) { lpFired.current = false; return; }
                                setFamHexes(null);
                                const next = hueFilter === hex ? null : hex;
                                setHueFilter(next);
                                showToast(next
                                    ? `Stickers: ${i % 2 === 0 ? 'LIGHT' : 'DARK'} ${HUE_FAMILY_NAMES[Math.floor(i / 2)] ?? ''}`.trimEnd()
                                    : 'Stickers: ALL COLOURS');
                            }}
                        />
                    );
                })}
                {PRESETS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        className={`smgr-hue-preset${p.exact ? ' is-brand' : ''}${hueFilter === p.key ? ' on' : ''}`}
                        title={hueFilter === p.key ? 'Show all colours' : `Filter to ${p.label}`}
                        aria-pressed={hueFilter === p.key}
                        /* A brand pill wears its own colour as a dot, so the
                           house colours are pickable BY NAME and by sight. */
                        style={p.exact ? ({ ['--smgr-brand' as string]: p.exact[0] } as React.CSSProperties) : undefined}
                        onClick={() => { setFamHexes(null); setHueFilter((prev) => (prev === p.key ? null : p.key)); }}
                    >
                        {p.label}
                    </button>
                ))}
                {(filterOn || lock) && (
                    <button
                        type="button"
                        className={`smgr-wear${lock ? ' on' : ''}`}
                        aria-pressed={lock !== null}
                        title={lock
                            ? `Your profile is showing only ${lock.label} — tap to put every sticker back`
                            : `Show only the ${filterLabel} stickers you own on your profile`}
                        onClick={toggleWear}
                    >
                        {lock ? `WEARING · ${lock.label}` : 'WEAR'}
                    </button>
                )}
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
            {/* WHAT YOU'RE MISSING — the quiet half of the one-tap colour. It
                states the split and shows the gaps as unowned art; tapping one
                opens the shelf. No price, no push, no paywall (Brendon,
                2026-07-24: "the completionist hook does the selling"). */}
            {filterOn && missingInColour.length > 0 && (
                <div className="smgr-missing">
                    <div className="smgr-missing-line">
                        YOU HAVE {haveInColour.length} OF {inColour.length} · {filterLabel}
                    </div>
                    <div className="smgr-grid smgr-grid--ghost">
                        {missingInColour.slice(0, MISSING_SHOWN).map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                className="smgr-tile smgr-tile--ghost"
                                title={`${s.name} — not yours yet`}
                                onClick={() => { onClose(); openStore('stickers'); }}
                            >
                                <StickerArt sticker={s} size={34} />
                            </button>
                        ))}
                        {missingInColour.length > MISSING_SHOWN && (
                            <span className="smgr-missing-more">+{missingInColour.length - MISSING_SHOWN}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    /* ── SPREADS — saved, named arrangements (Brendon, 2026-07-24) ─────────
       The gallery's saved-views row, verbatim (Rule #0): SAVE, then up to three
       numbered named slots, tap to restore, ✎ to rename in place, ✕ to remove.
       A Spread captures the WHOLE picture — the hand-placed spots and the
       generative look with its exact roll — so it comes back as you left it,
       for you and for every visitor. */
    const commitRename = () => {
        const id = renaming;
        const next = renameText.trim();
        setRenaming(null);
        if (!id || !next) return;
        if (renameSpread(id, next)) showToast('Spread: RENAMED');
    };
    const spreadsRow = (
        <div className="ambient-pop-row smgr-spreads-row">
            <span className="ambient-pop-label">Spreads</span>
            <div className="ambient-pop-chips">
                <button
                    type="button"
                    className="pill-preset pill-preset--save"
                    title="Save the hero exactly as it looks now"
                    onClick={() => {
                        const { spread, replaced } = saveSpread();
                        showToast(`Spread: ${replaced ? 'REPLACED' : 'SAVED'} · ${spread.name}`);
                    }}
                >
                    SAVE
                </button>
                {spreads.map((sp, i) => (renaming === sp.id ? (
                    <input
                        key={sp.id}
                        autoFocus
                        className="value-prompt-input smgr-spread-input"
                        value={renameText}
                        maxLength={SPREAD_NAME_MAX}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={commitRename}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                            if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
                        }}
                    />
                ) : (
                    <button
                        key={sp.id}
                        type="button"
                        className="pill-preset"
                        title={`Put “${sp.name}” back on your hero`}
                        onClick={() => {
                            applySpread(sp);
                            setArr(getArrange()); setTl(getTilt()); setExp(getExpand());
                            setRw(getRows()); setAl(getAlign()); setFl(getFlip());
                            setDen(getDensity()); setBd(getBorder()); setSeedV(getSeed());
                            showToast(`Spread: ${sp.name.toUpperCase()}`);
                        }}
                    >
                        <span className="pill-preset__index">{SLOT_GLYPHS[i]}</span>
                        <span className="pill-preset__name">{sp.name}</span>
                        <span
                            className="smgr-spread-edit"
                            role="button"
                            tabIndex={0}
                            title="Rename spread"
                            aria-label="Rename spread"
                            onClick={(e) => { e.stopPropagation(); setRenameText(sp.name); setRenaming(sp.id); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setRenameText(sp.name); setRenaming(sp.id); } }}
                        >{`✎${VS15}`}</span>
                        <span
                            className="pill-preset__delete"
                            role="button"
                            tabIndex={0}
                            title="Remove spread"
                            aria-label="Remove spread"
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(sp); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setConfirmDelete(sp); } }}
                        >{`×${VS15}`}</span>
                    </button>
                )))}
                {Array.from({ length: Math.max(0, MAX_SPREADS - spreads.length) }).map((_, i) => (
                    <span key={`empty-${i}`} className="pill-preset pill-preset--empty" title="Empty spread slot">
                        {SLOT_GLYPHS[spreads.length + i]}
                    </span>
                ))}
            </div>
        </div>
    );

    /* The app's own remove-confirm card — a Spread is a saved look, and the
       stickers themselves are untouched, so say that plainly. */
    const spreadConfirm = confirmDelete ? (
        <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmDelete(null)}>
            <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                <div className="ms-confirm-question">
                    Remove the spread “{confirmDelete.name}”? Your stickers stay exactly as they are.
                </div>
                <div className="ms-confirm-btns">
                    <button className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    <button
                        className="ms-confirm-btn ms-confirm-btn--ok"
                        onClick={() => {
                            const name = confirmDelete.name;
                            if (deleteSpread(confirmDelete.id)) showToast(`${name.toUpperCase()}: REMOVED`);
                            setConfirmDelete(null);
                        }}
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    /* SAVE — the commit for everything in here. Its own full-width bar at the
       foot of the menu, so it's reachable from every page and never fights the
       header for room. It appears ONLY when something is genuinely unsaved, so
       the menu you know is untouched until you've changed something. */
    const saveBar = unsaved ? (
        <div className="smgr-save-bar">
            <button
                type="button"
                className="smgr-save"
                title="Save your stickers as they look now"
                onClick={() => setConfirmSave(true)}
            >
                SAVE CHANGES
            </button>
        </div>
    ) : null;

    /* The app's own confirm card, same as the Spread remove — you get to decide
       to keep your stickers as they are. */
    const saveConfirm = confirmSave ? (
        <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmSave(false)}>
            <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                <div className="ms-confirm-question">
                    Save your stickers as they look now? Cancel and they stay exactly as they were.
                </div>
                <div className="ms-confirm-btns">
                    <button className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmSave(false)}>Cancel</button>
                    <button className="ms-confirm-btn ms-confirm-btn--ok" onClick={commitSave}>Save</button>
                </div>
            </div>
        </div>
    ) : null;

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
                {spreadConfirm}
                {saveConfirm}
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
                            {rowsChips}
                        </Row>
                        {spreadsRow}
                        <Row label="Density">
                            {DENSITIES.map((d) => (<Chip key={d.id} on={density === d.id} onClick={() => pickDensity(d.id)}>{d.label}</Chip>))}
                        </Row>
                        <Row label="Align">
                            {ALIGNS.map((a) => (<Chip key={a.id} on={align === a.id} onClick={() => pickAlign(a.id)}>{a.label}</Chip>))}
                        </Row>
                        <Row label="Tilt">
                            {TILTS.map((tl) => (<Chip key={tl.id} on={tilt === tl.id} onClick={() => pickTilt(tl.id)}>{tl.label}</Chip>))}
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
                    {saveBar}
                </div>
            </div>,
            document.body,
        );
    }

    return createPortal(
        <div className="sticker-mgr-backdrop" role="dialog" aria-modal="true" aria-label="Your stickers" onClick={onClose}>
            {spreadConfirm}
            {saveConfirm}
            <div
                className="ambient-pop sticker-pop"
                role="dialog"
                aria-label="Your stickers"
                onClick={(e) => e.stopPropagation()}
                /* Stay invisible until the anchor is measured, so the menu never
                   flashes at its default spot above the stickers before dropping
                   into place below them (Brendon, 2026-06-24). */
                /* The SAVE bar ADDS to the menu's height rather than eating into
                   it — the control pages keep the exact room they were designed
                   for, so nothing clips when there's something to save. */
                style={anchor
                    ? { position: 'fixed', top: anchor.top, left: anchor.left, marginTop: 0, maxHeight: anchor.maxH + (unsaved ? 44 : 0) }
                    : { visibility: 'hidden' }}
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
                            {rowsChips}
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

                    {/* Page 3 — SPREADS (Brendon, 2026-07-27: the third window).
                        Its own page on purpose: three named pills plus SAVE need
                        two lines at iPhone width, and the compact pages are a
                        FIXED height that never scrolls. */}
                    <div className="ambient-pop-page">
                        {spreadsRow}
                    </div>

                    {/* Page 4 */}
                    <div className="ambient-pop-page">
                        <Row label="Flip">
                            <Chip on={!flip} onClick={() => pickFlip(false)}>OFF</Chip>
                            <Chip on={flip} onClick={() => pickFlip(true)}>UPSIDE-DOWN</Chip>
                        </Row>
                        <Row label="Border">
                            {BORDERS.map((b) => (<Chip key={b.id} on={border === b.id} onClick={() => pickBorder(b.id)}>{b.label}</Chip>))}
                        </Row>
                    </div>

                    {/* Page 5 — Stickers. Scrolls AS ONE: sheet names not pinned,
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
                {saveBar}
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
