'use client';

/*
 * The stone's STEALTH styling console (Brendon, 2026-07-20).
 *
 * Hidden, deliberately absent from the user docs: typed straight into the
 * stone, power-user discoverable (the bare word `stone` whispers the
 * command list once). Device-local, like the workspace dots' order.
 *
 *   stone #ff0055   → the stone's accent (caret · ON-AIR LED · widget pops)
 *   stone white     → force the white stage
 *   stone black     → force the black stage
 *   stone auto      → back to the rule (opposite of the colorway's buttons)
 *   stone reset     → wipe everything
 *   stone           → the whisper (returns the hint line, applies nothing)
 */

import { resolveStoneColor, stoneColorName } from './colors';

const LS_KEY = 'pd_stone_style';

export interface StoneStyle {
    accent?: string;            // '#rrggbb'
    stage?: 'white' | 'black';  // absent = auto (opposite of the buttons)
}

export function readStoneStyle(): StoneStyle {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (!raw) return {};
        const p = JSON.parse(raw) as StoneStyle;
        const out: StoneStyle = {};
        if (typeof p.accent === 'string' && /^#[0-9a-f]{6}$/i.test(p.accent)) out.accent = p.accent.toLowerCase();
        if (p.stage === 'white' || p.stage === 'black') out.stage = p.stage;
        return out;
    } catch {
        return {};
    }
}

function writeStoneStyle(s: StoneStyle): void {
    try {
        if (!s.accent && !s.stage) window.localStorage.removeItem(LS_KEY);
        else window.localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch { /* private mode — session-only is fine */ }
}

/** Paint the current style onto the document (idempotent; call on boot +
 *  after every command). */
export function applyStoneStyle(s: StoneStyle = readStoneStyle()): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (s.accent) root.style.setProperty('--stone-accent', s.accent);
    else root.style.removeProperty('--stone-accent');
    document.body.classList.toggle('pd-stone-force-white', s.stage === 'white');
    document.body.classList.toggle('pd-stone-force-black', s.stage === 'black');
}

export interface StoneCommandResult {
    /** The line the stone answers with (etched line + fallback toast). */
    line: string;
    /** A chosen colour (#rrggbb) — the recolour toast paints itself this. */
    tint?: string;
    /** The colour's display name (or hex) for that toast: `⌘ NAME ⌘`. */
    name?: string;
}

/** Set the accent to a resolved colour + answer with the coloured recolour
    toast (Brendon, 2026-07-21): the pill wears the colour, named on it. */
function paintStone(hex: string, spoken: string): StoneCommandResult {
    const h = hex.toLowerCase();
    writeStoneStyle({ ...readStoneStyle(), accent: h });
    applyStoneStyle(readStoneStyle());
    const name = (stoneColorName(h) ?? spoken.trim()).toUpperCase();
    return { line: `Stone: ${name}`, tint: h, name };
}

/** Parse + execute a stone console line. Null = not a stone command. */
export function runStoneCommand(raw: string): StoneCommandResult | null {
    const t = raw.trim();

    // `stonecolor: cinnabar` · `stone colour red` · `stonecolor #ff0055` — the
    // named-colour door (Brendon, 2026-07-21). Knows the popular colour words.
    const sc = /^stone\s*colou?r\s*:?\s+(.+)$/i.exec(t);
    if (sc) {
        const hex = resolveStoneColor(sc[1]);
        if (hex) return paintStone(hex, sc[1]);
        return { line: `the stone doesn't know "${sc[1].trim()}"` };
    }

    const m = /^stone(?:\s+(.+))?$/i.exec(t);
    if (!m) return null;
    const arg = (m[1] ?? '').trim().toLowerCase();
    const cur = readStoneStyle();

    if (!arg) {
        // The whisper — the only place the console is written down.
        return { line: 'the stone hears: a colour · white · black · auto · reset' };
    }
    if (arg === 'white' || arg === 'black') {
        writeStoneStyle({ ...cur, stage: arg });
        applyStoneStyle(readStoneStyle());
        return { line: `Stone: ${arg.toUpperCase()}` };
    }
    if (arg === 'auto') {
        writeStoneStyle({ accent: cur.accent });
        applyStoneStyle(readStoneStyle());
        return { line: 'Stone: AUTO' };
    }
    if (arg === 'reset') {
        writeStoneStyle({});
        applyStoneStyle({});
        return { line: 'Stone: RESET' };
    }
    // a hex or a known colour name → paint the accent, coloured toast.
    const hex = resolveStoneColor(arg);
    if (hex) return paintStone(hex, arg);
    return null; // "stone something-else" — not ours, fall through to GO/FIND
}
