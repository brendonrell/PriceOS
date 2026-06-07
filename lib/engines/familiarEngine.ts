'use client';

/*
 * familiarEngine — Batch G / F56 / BUG-23
 *
 * Sim port of the Digital Familiar IIFE at sim.html 12750–12935.
 * Module singleton — owns the floating ASCII companion's frame
 * lifecycle (sprite text, name badge, speech bubble, outline) and
 * drives the four-state machine: idle / scroll / action / sleep.
 *
 * Lifecycle is callback-driven, like hashSynEngine. enableFamiliar()
 * mounts species + outline (sticky for page lifetime per sim 12898's
 * `if (!mounted)` guard), starts timers + listeners, emits frames.
 * disableFamiliar() stops timers + listeners and emits a hidden
 * frame; species/outline persist for re-enable on the same page.
 *
 * Frame consumer (Backgrounds.tsx) subscribes once at mount and
 * mirrors snapshot → JSX (sprite text, badge text, bubble text,
 * .visible toggle, .outlined class, --familiar-outline CSS var,
 * host display via `visible`).
 *
 * Sprite click → openModal('familiar') is owned by Backgrounds.tsx
 * via React onClick on the host. Sim handles this through a
 * document-level capture-phase click listener (sim 12877-12886);
 * the React port keeps the action-button branch (.btn-mint /
 * .modal-action-btn / .btn-list / .btn-offer → onAction) inside
 * the engine's document handler, since those targets are
 * scattered across many components and a global listener stays
 * faithful to sim's "ambient reaction to user activity" intent.
 *
 * Cadence verbatim from sim:
 *   frame:    setInterval(renderFrame, 600)        [sim 12861]
 *   idle:     setInterval(emitDialogue('idle'),     [sim 12863]
 *               20000 + Math.random()*20000)
 *   scroll:   500ms revert to idle                  [sim 12851]
 *   action:   1500ms revert to idle, 40% reaction   [sim 12856-12857]
 *   sleep:    5*60*1000 ms idle → sleep state       [sim 12845]
 *   bubble:   .visible class for 4000ms             [sim 12840]
 */

interface Species {
    name: string;
    idle: string[];
    scroll: string[];
    action: string[];
    sleep: string[];
}

type FamiliarState = 'idle' | 'scroll' | 'action' | 'sleep';

export interface FamiliarFrame {
    spriteText: string;
    badgeText: string;
    bubbleText: string;
    bubbleVisible: boolean;
    outlined: boolean;
    outlineColor: string | null;
    visible: boolean;
}

/* sim 12752-12756 verbatim. Five species; per-page random pick (or
   ?familiar=name URL override per sim 12811). Frame arrays are read
   round-robin via frameIdx % frames.length. Glyphs are copied
   exactly — combining/box-drawing characters are intentional. */
const SPECIES: Species[] = [
    { name: 'Wisp',     idle: ['( ¤ )', '( ☼ )', '( ¤ )'],            scroll: ['~¤~ ', ' -☼-', ' ~¤~'],          action: ['< ❂ >', '« ✺ »', '< ❂ >'],         sleep:  ['( . )', '( . )', '( . )'] },
    { name: 'Watcher',  idle: ['[ ◉ ]', '[ ◎ ]', '[ ◉ ]'],            scroll: ['[ » ]', '[ » ]', '[ » ]'],        action: ['[ ⊛ ]', '[ ⊛ ]', '[ ⊛ ]'],         sleep:  ['[ - ]', '[ - ]', '[ - ]'] },
    { name: 'Slime',    idle: ['(~o~)', '(~O~)', '(~o~)'],            scroll: ['( o=)', '(= o)', '( o=)'],        action: ['(@o@)', '(@O@)', '(@o@)'],         sleep:  ['(--z)', '(--z)', '(--z)'] },
    { name: 'Spider',   idle: ['/|o.o|\\', '\\|o.o|/', '/|o.o|\\'],   scroll: ['/|>.>|\\', '\\|<.<|/', '/|>.>|\\'], action: ['/|✱.✱|\\', '\\|✱.✱|/', '/|✱.✱|\\'], sleep:  ['/|-.-|\\', '\\|-.-|/', '/|-.-|\\'] },
    { name: 'Orbit',    idle: ['(◯·)', '(·◯)', '(◯·)'],                scroll: ['(○»)', '(»○)', '(○»)'],           action: ['(◉‼)', '(‼◉)', '(◉‼)'],           sleep:  ['(◌-)', '(-◌)', '(◌-)'] },
];

/* sim 12765-12803 verbatim. Four dialogue pools: idle quips on
   interval, action lines on user CTA clicks, scroll lines during
   heavy scroll bursts, sleep whispers in the 5min-idle state. */
const LINES_IDLE = [
    'THE WATCHER HAS SEEN TOO MUCH.',
    'PRICE DISCUSSION IN PROGRESS.',
    'SOMEONE IS MINTING. I CAN FEEL IT.',
    'THE CHART PLEADS FOR MERCY.',
    'GENERATIVE. NOT RANDOM.',
    "THAT ONE. THAT'S THE ONE.",
    'FLOOR IS A SUGGESTION.',
    'I DREAMT I WAS AN AUTOGLYPH.',
    'HAVE YOU LOOKED AT #22 LATELY?',
    'THE GRAILS ARE HIDING IN PLAIN SIGHT.',
    'TRUST THE PROCESS. BID THE FLOOR.',
    'LIQUIDITY IS A STATE OF MIND.',
    'ALL PROVENANCE IS GOSSIP.',
    'OBSERVED ENOUGH TO BECOME REAL.',
    'SOMEWHERE A WALLET JUST WOKE UP.',
    'THE CODE IS THE ART. MAYBE.',
    'A 2X ON AN UGLY ONE STILL COUNTS.',
    "YOU CAN'T UNSEE A BAD PALETTE.",
    'THE SECONDARY KNOWS.',
];
const LINES_ACTION = [
    'SEND IT.',
    'CONFIRMED. BLOCK INBOUND.',
    'BRAVE. OR STUPID. OR BOTH.',
    'NO BACKSIES.',
    'THIS IS A PRICE DISCUSSION.',
    'GOSSIP PROTOCOL LIT UP.',
];
const LINES_SCROLL = [
    'SLOW DOWN. LOOK AT THIS ONE.',
    "YOU'RE MISSING THE GOOD STUFF.",
    'FEED SPEED: REGRETTABLE.',
];
const LINES_SLEEP = [
    'ZZZ... BID ZZZ... SOLD...',
    'QUIET ON THE MEMPOOL.',
    "WAKE ME WHEN IT'S INTERESTING.",
];

/* ── Internal state ───────────────────────────────────────── */

let _species: Species | null = null;
let _frameIdx = 0;
let _state: FamiliarState = 'idle';
let _speciesPicked = false; // sticky for page lifetime per sim 12898 `if (!mounted)`
let _visible = false;
let _outlined = false;
let _outlineColor: string | null = null;

let _spriteText = '';
let _badgeText = '';
let _bubbleText = '';
let _bubbleVisible = false;

let _frameTimer: ReturnType<typeof setInterval> | null = null;
let _dialogueTimer: ReturnType<typeof setInterval> | null = null;
let _sleepTimer: ReturnType<typeof setTimeout> | null = null;
let _scrollRevertTimer: ReturnType<typeof setTimeout> | null = null;
let _actionRevertTimer: ReturnType<typeof setTimeout> | null = null;
let _bubbleHideTimer: ReturnType<typeof setTimeout> | null = null;

const _subscribers = new Set<(frame: FamiliarFrame) => void>();

/* ── Frame snapshot + emit ────────────────────────────────── */

function _snapshot(): FamiliarFrame {
    return {
        spriteText: _spriteText,
        badgeText: _badgeText,
        bubbleText: _bubbleText,
        bubbleVisible: _bubbleVisible,
        outlined: _outlined,
        outlineColor: _outlineColor,
        visible: _visible,
    };
}

function _emit() {
    const frame = _snapshot();
    _subscribers.forEach((cb) => cb(frame));
}

/* ── Species + state machine ──────────────────────────────── */

function _urlSpeciesOverride(): Species | null {
    if (typeof window === 'undefined') return null;
    try {
        const m = new URLSearchParams(window.location.search).get('familiar');
        if (m) return SPECIES.find((s) => s.name.toLowerCase() === m.toLowerCase()) ?? null;
    } catch {}
    return null;
}

function _pickSpecies(): Species {
    return _urlSpeciesOverride() || SPECIES[Math.floor(Math.random() * SPECIES.length)];
}

function _setState(next: FamiliarState) {
    if (_state === next) return;
    _state = next;
    _frameIdx = 0;
}

function _renderFrame() {
    if (!_species) return;
    const frames = _species[_state] || _species.idle;
    _spriteText = frames[_frameIdx % frames.length];
    _frameIdx++;
    if (!_badgeText) _badgeText = _species.name;
    _emit();
}

function _emitDialogue(pool: 'idle' | 'action' | 'scroll' | 'sleep') {
    const pools = { idle: LINES_IDLE, action: LINES_ACTION, scroll: LINES_SCROLL, sleep: LINES_SLEEP };
    const lines = pools[pool] || LINES_IDLE;
    _bubbleText = lines[Math.floor(Math.random() * lines.length)];
    _bubbleVisible = true;
    _emit();
    /* Sim's setTimeout in emitDialogue (sim 12840) doesn't track its
       handle — rapid emissions stack and the latest one wins. We
       track a single hide-timer so disableFamiliar() can clear it
       cleanly; functionally identical UX (latest emission still
       wins, just without orphan timers). */
    if (_bubbleHideTimer) clearTimeout(_bubbleHideTimer);
    _bubbleHideTimer = setTimeout(() => {
        _bubbleVisible = false;
        _bubbleHideTimer = null;
        _emit();
    }, 4000);
}

function _resetSleep() {
    if (_sleepTimer) clearTimeout(_sleepTimer);
    if (_state === 'sleep') _setState('idle');
    _sleepTimer = setTimeout(() => {
        _setState('sleep');
        _emitDialogue('sleep');
    }, 5 * 60 * 1000);
}

function _onScroll() {
    if (_state === 'action') return;
    _setState('scroll');
    if (_scrollRevertTimer) clearTimeout(_scrollRevertTimer);
    _scrollRevertTimer = setTimeout(() => {
        if (_state === 'scroll') _setState('idle');
        _resetSleep();
    }, 500);
}

function _onAction() {
    _setState('action');
    /* 40% chance of reaction line per sim 12856 — preserves restraint */
    if (Math.random() < 0.4) _emitDialogue('action');
    if (_actionRevertTimer) clearTimeout(_actionRevertTimer);
    _actionRevertTimer = setTimeout(() => {
        if (_state === 'action') _setState('idle');
        _resetSleep();
    }, 1500);
}

/* Document capture-phase click listener — fires onAction when major
   CTAs are clicked. Sim's handler at 12877-12886 also detects
   #digital-familiar to open the modal; that branch is owned by
   Backgrounds.tsx (React onClick on the host JSX) so we keep it
   out of here. */
function _handleDocClick(ev: Event) {
    const target = ev.target as Element | null;
    if (!target || !target.closest) return;
    if (target.closest('.btn-mint, .modal-action-btn, .btn-list, .btn-offer')) {
        _onAction();
    }
}

function _start() {
    if (_frameTimer) return;
    _frameTimer = setInterval(_renderFrame, 600);
    _dialogueTimer = setInterval(
        () => _emitDialogue('idle'),
        20000 + Math.random() * 20000,
    );
    window.addEventListener('scroll', _onScroll, { passive: true });
    document.addEventListener('click', _handleDocClick, true);
    /* Activity reset for sleep timer — any of these inputs counts as
       user being awake-and-around per sim 12866. */
    document.addEventListener('mousemove', _resetSleep, { passive: true });
    document.addEventListener('keydown', _resetSleep, { passive: true });
    document.addEventListener('touchstart', _resetSleep, { passive: true });
    _resetSleep();
}

function _stop() {
    if (_frameTimer) clearInterval(_frameTimer);
    if (_dialogueTimer) clearInterval(_dialogueTimer);
    if (_sleepTimer) clearTimeout(_sleepTimer);
    if (_scrollRevertTimer) clearTimeout(_scrollRevertTimer);
    if (_actionRevertTimer) clearTimeout(_actionRevertTimer);
    if (_bubbleHideTimer) clearTimeout(_bubbleHideTimer);
    _frameTimer = null;
    _dialogueTimer = null;
    _sleepTimer = null;
    _scrollRevertTimer = null;
    _actionRevertTimer = null;
    _bubbleHideTimer = null;
    if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', _onScroll);
    }
    if (typeof document !== 'undefined') {
        document.removeEventListener('click', _handleDocClick, true);
        document.removeEventListener('mousemove', _resetSleep);
        document.removeEventListener('keydown', _resetSleep);
        document.removeEventListener('touchstart', _resetSleep);
    }
    _bubbleVisible = false;
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Mount + start the engine. Sim 12894-12934 `_applyFamiliar(true)`.
 *
 * First call per page picks species + outline (25% chance, palette
 * keyed to body bg luminance). Subsequent calls re-show the same
 * species — the `_speciesPicked` flag is sticky for page lifetime,
 * matching sim's `mounted` flag at 12898.
 */
export function enableFamiliar(): void {
    if (typeof window === 'undefined') return;
    if (!_speciesPicked) {
        _species = _pickSpecies();
        _badgeText = _species.name;
        _spriteText = '';
        _frameIdx = 0;
        _state = 'idle';
        _outlined = false;
        _outlineColor = null;
        /* Outline: ~25% per sim 12908. Palette keyed to body bg
           luminance so the outline stays legible on every colorway.
           Dark bg → bright palette; light/warm bg → deep palette.
           Verbatim from sim 12909-12923. */
        if (Math.random() < 0.25) {
            const bg = getComputedStyle(document.body).backgroundColor;
            const m = bg.match(/rgba?\(([^)]+)\)/);
            let lum = 0;
            if (m) {
                const [r, g, b] = m[1].split(',').map((n) => parseInt(n.trim(), 10));
                /* Relative luminance, perceptual weights — sim 12915 */
                lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            }
            const DARK_BG  = ['#FF0055', '#FFE600', '#FFFFFF', '#00FFD1', '#9D00FF', '#FF8A00'];
            const LIGHT_BG = ['#B8003C', '#7A6E00', '#000000', '#006E5C', '#4A007A', '#8A4A00'];
            const palette = lum < 0.5 ? DARK_BG : LIGHT_BG;
            _outlineColor = palette[Math.floor(Math.random() * palette.length)];
            _outlined = true;
        }
        _speciesPicked = true;
    }
    _visible = true;
    _start();
    _renderFrame();
    _emit();
}

/**
 * Stop + hide the engine. Sim 12930-12932 `_applyFamiliar(false)`.
 *
 * Clears all timers + listeners and flips `visible` false. Species
 * + outline stay set so re-enable on the same page reuses them
 * without picking a new species — matches sim's sticky `mounted`.
 */
export function disableFamiliar(): void {
    _visible = false;
    _stop();
    _emit();
}

/**
 * Subscribe to frame snapshots. Returns an unsubscribe fn. Caller
 * receives the current snapshot synchronously on subscribe so it
 * can render immediately without waiting for the next tick.
 */
export function subscribeFamiliar(cb: (frame: FamiliarFrame) => void): () => void {
    _subscribers.add(cb);
    cb(_snapshot());
    return () => {
        _subscribers.delete(cb);
    };
}

/**
 * Current frame snapshot — used by FamiliarModal to stamp the
 * species name into its title (sim 12942-12946).
 */
export function getFamiliarFrame(): FamiliarFrame {
    return _snapshot();
}

/**
 * Current species name, '' if none picked yet. Sim's
 * `window._getFamiliarSpeciesName()` at 12890.
 */
export function getFamiliarSpeciesName(): string {
    return _species ? _species.name : '';
}
