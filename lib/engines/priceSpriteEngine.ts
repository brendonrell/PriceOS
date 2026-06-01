'use client';

/*
 * priceSpriteEngine — animation state machine.
 *
 * Cadence (all intervals tuned for natural feel, not mechanical):
 *   turn     20-35s   75% plain / 25% action-with-arms
 *   throw    150-300s ultra-rare forward-facing action (CSS flip)
 *   idle     120-180s before goSleep
 *   yawn→sleep  1600ms
 *   sleep→void  30-60s  (dreaming — ◡‿◡, warm)
 *   void→astral 45-90s  (transcendent — ((∞⌇∞)), double brackets)
 *   astral→wake 20-40s
 *   Total to see void:   ~3-5 min idle. Total to see astral: ~5-10 min.
 *
 * Action turns (25%): forced glyph-swap, arm char changes.
 *   vibe_2 → arguing (MAD brows locked)
 *   vibe_4 → casting (sparkle brows)
 *   others → awake + glyph-swap arm shows via isTurned, no brow change
 *
 * Throw: arm changes + CSS flip. Natural brows preserved (no override).
 *   "Angry" wallet like the standin keeps angry brows through the throw.
 *
 * Timer isolation: _turnEndTimer separate from _stateTimer (blink/sleep)
 * to prevent blink mid-turn from cancelling the turn-return.
 */

import {
    composeSprite,
    type SpriteAnimState,
    type SpriteParts,
} from '../sprites/composer';
import { type PriceSpriteVibe } from '../sprites/vibes';

export { type SpriteAnimState, type SpriteParts };

export interface SpriteFrame {
    face:        string;
    transform:   string;
    sleeping:    boolean;
    hasIdentity: boolean;
    parts:       SpriteParts | null;
    shadesLens:  string | null;
}

const STANDIN_AWAKE_R = '(ง •\u0300_•\u0301)ง';
const STANDIN_AWAKE_L = '\u30FD(•\u0301_•\u0300\u30FD)';
const STANDIN_BLINK_R = '(ง -_-)ง';
const STANDIN_BLINK_L = '\u30FD(-_-\u30FD)';
const STANDIN_YAWN_R  = '(ง \u1D15_\u1D15)ง';
const STANDIN_SLEEP_R = '(ง zzz)ง';
const STANDIN_VOID_R  = '(ง \u25E1\u203F\u25E1)ง';   // (ง ◡‿◡)ง
const STANDIN_ASTRAL_R = '((ง \u221E\u2307\u221E)ง)'; // ((ง ∞⌇∞)ง)

type State = 'awake' | 'blinking' | 'yawning' | 'sleeping'
           | 'arguing' | 'throwing' | 'casting'
           | 'void' | 'astral';

let _facing:     1 | -1 = 1;
let _mirrorMode  = false;
let _state:      State  = 'awake';
let _armVariant: 0 | 1  = 0;

let _identity: { walletAddress: string; vibe: PriceSpriteVibe } | null = null;

let _idleTimer:       ReturnType<typeof setTimeout> | null = null;
let _blinkTimer:      ReturnType<typeof setTimeout> | null = null;
let _turnTimer:       ReturnType<typeof setTimeout> | null = null;
let _stateTimer:      ReturnType<typeof setTimeout> | null = null; // blink + yawn→sleep
let _turnEndTimer:    ReturnType<typeof setTimeout> | null = null; // isolated turn hold
let _throwSchedTimer: ReturnType<typeof setTimeout> | null = null;
let _throwEndTimer:   ReturnType<typeof setTimeout> | null = null;
let _deepTimer:       ReturnType<typeof setTimeout> | null = null; // sleep→void, void→astral, astral→wake

const _subs = new Set<() => void>();
let _visAttached = false;
let _running     = false;

function _emit(): void {
    _subs.forEach(fn => { try { fn(); } catch { /* isolate */ } });
}

function _computeFrame(): SpriteFrame {
    const isLeft   = _facing === -1;
    const isAsleep = _state === 'sleeping' || _state === 'yawning'
                  || _state === 'void'     || _state === 'astral';
    const isThrowing = _state === 'throwing';

    if (_identity !== null) {
        const isAction = _state === 'arguing' || isThrowing || _state === 'casting';
        const isTurned =
            (isLeft && !_mirrorMode && !isAsleep) ||
            isThrowing || _state === 'arguing' || _state === 'casting';

        const composed = composeSprite(
            _identity.walletAddress,
            _identity.vibe,
            _state as SpriteAnimState,
            isTurned,
            isAction ? _armVariant : undefined,
        );
        if (composed !== null) {
            const transform =
                (_mirrorMode && isLeft && !isAsleep) || isThrowing
                    ? 'scaleX(-1)' : 'scaleX(1)';
            return {
                face: composed.fullString, transform,
                sleeping: isAsleep, hasIdentity: true,
                parts: composed.parts, shadesLens: composed.shadesLens,
            };
        }
    }

    // Standin path
    const sl = isLeft || isThrowing;
    let face: string;
    if      (_state === 'astral')                          face = STANDIN_ASTRAL_R;
    else if (_state === 'void')                            face = STANDIN_VOID_R;
    else if (_state === 'sleeping')                        face = STANDIN_SLEEP_R;
    else if (_state === 'yawning')                         face = STANDIN_YAWN_R;
    else if (_state === 'blinking')                        face = (_mirrorMode || !sl) ? STANDIN_BLINK_R : STANDIN_BLINK_L;
    else if (_state === 'arguing' || _state === 'casting') face = STANDIN_AWAKE_R;
    else                                                   face = (_mirrorMode || !sl) ? STANDIN_AWAKE_R : STANDIN_AWAKE_L;
    const transform = (_mirrorMode && isLeft && !isAsleep) || isThrowing ? 'scaleX(-1)' : 'scaleX(1)';
    return { face, transform, sleeping: isAsleep, hasIdentity: false, parts: null, shadesLens: null };
}

function _clearAll(): void {
    [_idleTimer, _blinkTimer, _turnTimer, _stateTimer,
     _turnEndTimer, _throwSchedTimer, _throwEndTimer, _deepTimer]
        .forEach(t => { if (t) clearTimeout(t); });
    _idleTimer = _blinkTimer = _turnTimer = _stateTimer =
    _turnEndTimer = _throwSchedTimer = _throwEndTimer = _deepTimer = null;
}

// ── Base cadence ─────────────────────────────────────────────────────

function _blink(): void {
    if (_state !== 'awake') return;
    _state = 'blinking'; _emit();
    if (_stateTimer) clearTimeout(_stateTimer);
    _stateTimer = setTimeout(() => {
        if (_state === 'blinking') { _state = 'awake'; _emit(); }
    }, 160);
}

function _turn(forceGlyphSwap = false): void {
    if (_state !== 'awake') return;

    if (forceGlyphSwap) {
        // Action turns always CSS-flip — sprite clearly faces LEFT, not forward.
        // Arm animation still fires via _state=arguing/casting hitting isTurned.
        _mirrorMode = true;
        _armVariant = Math.random() < 0.5 ? 0 : 1;
        if      (_identity?.vibe === 'vibe_2') _state = 'arguing';
        else if (_identity?.vibe === 'vibe_4') _state = 'casting';
        // Observer/Hacker: state='awake', arm change via CSS flip only
    } else {
        // Plain turns always CSS-flip — sprite clearly faces LEFT, no arm change.
        // Glyph-swap arm animation is reserved for action turns and throws only.
        _mirrorMode = true;
    }
    _facing = -1;
    _emit();

    if (_turnEndTimer) clearTimeout(_turnEndTimer);
    _turnEndTimer = setTimeout(() => {
        if (_state === 'awake' || _state === 'arguing' || _state === 'casting') {
            _state = 'awake'; _facing = 1; _mirrorMode = false; _emit();
        }
    }, forceGlyphSwap
        ? 1200 + Math.random() * 2000
        : 800  + Math.random() * 1500);
}

function _goSleep(): void {
    if (_state !== 'awake') return;
    _state = 'yawning'; _emit();
    if (_stateTimer) clearTimeout(_stateTimer);
    _stateTimer = setTimeout(() => {
        _state = 'sleeping'; _emit();
        // Sleep → void (dreaming) after 30-60s
        if (_deepTimer) clearTimeout(_deepTimer);
        _deepTimer = setTimeout(() => {
            if (_state !== 'sleeping') return;
            _state = 'void'; _emit();
            // Void → astral (transcendent) after 45-90s
            if (_deepTimer) clearTimeout(_deepTimer);
            _deepTimer = setTimeout(() => {
                if (_state !== 'void') return;
                _state = 'astral'; _emit();
                // Astral holds 20-40s then wakes
                if (_deepTimer) clearTimeout(_deepTimer);
                _deepTimer = setTimeout(() => {
                    if (_state === 'astral') _wakeUp();
                }, 20000 + Math.random() * 20000);
            }, 45000 + Math.random() * 45000);
        }, 30000 + Math.random() * 30000);
    }, 1600);
}

function _wakeUp(): void {
    if (_deepTimer) { clearTimeout(_deepTimer); _deepTimer = null; }
    _state = 'awake'; _facing = 1; _mirrorMode = false; _emit();
    _resetIdleTimer();
}

function _resetIdleTimer(): void {
    if (_idleTimer) clearTimeout(_idleTimer);
    // 120-180s idle before sleeping — deeply buried, easter-egg territory
    _idleTimer = setTimeout(_goSleep, 120000 + Math.random() * 60000);
}

function _scheduleBlink(): void {
    if (_blinkTimer) clearTimeout(_blinkTimer);
    _blinkTimer = setTimeout(() => { _blink(); _scheduleBlink(); }, 2800 + Math.random() * 3200);
}

/* Turn fires every 20-35s. 75% plain (just look away),
   25% action (glyph-swap with arm animation + vibe brows). */
function _scheduleTurn(): void {
    if (_turnTimer) clearTimeout(_turnTimer);
    _turnTimer = setTimeout(() => {
        if (_state === 'awake') _turn(Math.random() < 0.25);
        _scheduleTurn();
    }, 20000 + Math.random() * 15000);
}

/* Throw — 2.5-5 min cadence. Forward-facing action. Natural brows
   preserved — wallet with angry brows keeps them through the throw. */
function _scheduleThrow(): void {
    if (_throwSchedTimer) clearTimeout(_throwSchedTimer);
    _throwSchedTimer = setTimeout(() => {
        if (_state !== 'awake') { _scheduleThrow(); return; }
        _armVariant = Math.random() < 0.5 ? 0 : 1;
        _state = 'throwing'; _emit();
        if (_throwEndTimer) clearTimeout(_throwEndTimer);
        _throwEndTimer = setTimeout(() => {
            if (_state === 'throwing') { _state = 'awake'; _emit(); }
            _scheduleThrow();
        }, 400 + Math.random() * 400);
    }, 150000 + Math.random() * 150000);
}

// ── Lifecycle ────────────────────────────────────────────────────────

function _onVisibility(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
        _clearAll();
    } else if (_running) {
        _scheduleBlink(); _scheduleTurn(); _scheduleThrow();
        if (_state === 'awake') _resetIdleTimer();
    }
}

function _start(): void {
    if (_running) return;
    _running = true;
    // Always reset to clean awake state — prevents stuck facing/state
    // if subscription rebuilds mid-animation (navigation, remount).
    _state = 'awake'; _facing = 1; _mirrorMode = false; _armVariant = 0;
    if (typeof document !== 'undefined' && !_visAttached) {
        document.addEventListener('visibilitychange', _onVisibility);
        _visAttached = true;
    }
    if (typeof document === 'undefined' || !document.hidden) {
        _scheduleBlink(); _scheduleTurn(); _scheduleThrow(); _resetIdleTimer();
    }
}

function _stop(): void {
    if (!_running) return;
    _running = false;
    _clearAll();
    if (typeof document !== 'undefined' && _visAttached) {
        document.removeEventListener('visibilitychange', _onVisibility);
        _visAttached = false;
    }
}

// ── Public API ───────────────────────────────────────────────────────

export function getSpriteFrame():     SpriteFrame     { return _computeFrame(); }
export function getSpriteAnimState(): SpriteAnimState { return _state; }

export function subscribeSprite(fn: () => void): () => void {
    _subs.add(fn);
    if (_subs.size === 1) _start();
    return () => { _subs.delete(fn); if (_subs.size === 0) _stop(); };
}

export function wakeSprite(): void {
    if (_subs.size === 0) return;
    if (_state === 'sleeping' || _state === 'yawning' ||
        _state === 'void'     || _state === 'astral') _wakeUp();
    else _resetIdleTimer();
}

export function setMainSpriteIdentity(
    walletAddress: string | null,
    vibe: PriceSpriteVibe | null,
): void {
    const next = walletAddress && vibe ? { walletAddress, vibe } : null;
    if (_identity === null && next === null) return;
    if (_identity && next &&
        _identity.walletAddress === next.walletAddress &&
        _identity.vibe === next.vibe) return;
    _identity = next;
    _emit();
}

export function getMainSpriteIdentity(): { walletAddress: string; vibe: PriceSpriteVibe } | null {
    return _identity;
}
