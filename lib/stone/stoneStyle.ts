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
    /** The line the stone answers with (toast + etched line). */
    line: string;
}

/** Parse + execute a stone console line. Null = not a stone command. */
export function runStoneCommand(raw: string): StoneCommandResult | null {
    const m = /^stone(?:\s+(.+))?$/i.exec(raw.trim());
    if (!m) return null;
    const arg = (m[1] ?? '').trim().toLowerCase();
    const cur = readStoneStyle();

    if (!arg) {
        // The whisper — the only place the console is written down.
        return { line: 'the stone hears: #hex · white · black · auto · reset' };
    }
    if (/^#[0-9a-f]{6}$/.test(arg)) {
        writeStoneStyle({ ...cur, accent: arg });
        applyStoneStyle(readStoneStyle());
        return { line: `Stone accent: ${arg.toUpperCase()}` };
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
    return null; // "stone something-else" — not ours, fall through to GO/FIND
}
