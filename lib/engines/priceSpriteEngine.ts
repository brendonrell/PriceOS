'use client';

/*
 * priceSpriteEngine — animation state machine.
 *
 * Cadence:
 *   turn     8-16s   fires every cycle; 75% plain, 25% action-with-arms
 *   throw    60-120s rare forward-facing action (CSS flip + arm variant)
 *   idle     90-150s before goSleep (doubled from sim for easter-egg depth)
 *   yawn→sleep  1600ms transition
 *   sleep→void  20-35s of sleep before going deeper
 *   void     30-45s  ultra-rare deep state: ∅…∅ face, arms at rest
 *   void→wake  wakeUp()
 *
 * Turn breakdown (25% action):
 *   Plain turn: 50/50 glyph-swap or CSS-mirror, no brow change.
 *   Action turn: forced glyph-swap, armVariant random 0|1.
 *     vibe_2 → arguing state (MAD brows)
 *     vibe_4 → casting state (sparkle brows)
 *     others → awake state but glyph-swap arm shows via isTurned
 *
 * Turn transform:
 *   glyph-swap (!mirrorMode): arm chars change, no CSS flip
 *   css-mirror (mirrorMode):  arm stable, scaleX(-1)
 *   throwing:  arm chars change AND scaleX(-1)
 *
 * Timer isolation: _turnEndTimer is separate from _stateTimer
 * (blink/sleep). This prevents turn-hold being cancelled by a blink
 * that fires mid-turn. Each action animation also has its own end-timer.
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
const STANDIN_VOID_R  = '(ง \u2205\u2026\u2205)ง'; // (ง ∅…∅)ง

type State = 'awake' | 'blinking' | 'yawning' | 'sleeping'
           | 'arguing' | 'throwing' | 'casting' | 'void';

let _facing:     1 | -1 = 1;
let _mirrorMode  = false;
let _state:      State  = 'awake';
let _armVariant: 0 | 1  = 0;

let _identity: { walletAddress: string; vibe: PriceSpriteVibe } | null = null;

let _idleTimer:       ReturnType<typeof setTimeout> | null = null;
let _blinkTimer:      ReturnType<typeof setTimeout> | null = null;
let _turnTimer:       ReturnType<typeof setTimeout> | null = null;
let _stateTimer:      ReturnType<typeof setTimeout> | null = null; // blink dur + yawn→sleep
let _turnEndTimer:    ReturnType<typeof setTimeout> | null = null; // turn hold (isolated)
let _throwSchedTimer: ReturnType<typeof setTimeout> | null = null;
let _throwEndTimer:   ReturnType<typeof setTimeout> | null = null;
let _voidTimer:       ReturnType<typeof setTimeout> | null = null; // sleep→void + void dur

const _subs = new Set<() => void>();
let _visAttached = false;
let _running     = false;

function _emit(): void {
    _subs.forEach(fn => { try { fn(); } catch { /* isolate */ } });
}

function _computeFrame(): SpriteFrame {
    const isLeft   = _facing === -1;
    // void is treated as asleep: no flip, sleeping=true, no isTurned
    const isAsleep = _state === 'sleeping' || _state === 'yawning' || _state === 'void';
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
    if      (_state === 'void')                            face = STANDIN_VOID_R;
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
     _turnEndTimer, _throwSchedTimer, _throwEndTimer, _voidTimer]
        .forEach(t => { if (t) clearTimeout(t); });
    _idleTimer = _blinkTimer = _turnTimer = _stateTimer =
    _turnEndTimer = _throwSchedTimer = _throwEndTimer = _voidTimer = null;
}

// ── Base cadence ─────────────────────────────────────────────────────

function _blink(): void {
    if (_state !== 'awake') return;
    _state = 'blinking'; _emit();
    // _stateTimer used only for blink + yawn/sleep transitions
    if (_stateTimer) clearTimeout(_stateTimer);
    _stateTimer = setTimeout(() => {
        if (_state === 'blinking') { _state = 'awake'; _emit(); }
    }, 160);
}

/** @param forceGlyphSwap true = action turn (25%): glyph-swap, arm animation,
 *  vibe-specific brow change. false = plain turn (75%): random mirror/swap. */
function _turn(forceGlyphSwap = false): void {
    if (_state !== 'awake') return;

    if (forceGlyphSwap) {
        _mirrorMode = false;
        _armVariant = Math.random() < 0.5 ? 0 : 1;
        if      (_identity?.vibe === 'vibe_2') _state = 'arguing';
        else if (_identity?.vibe === 'vibe_4') _state = 'casting';
        // Observer/Hacker: state stays 'awake'; isTurned fires via isLeft&&!mirrorMode
    } else {
        _mirrorMode = Math.random() < 0.5;
    }
    _facing = -1;
    _emit();

    // Isolated turn-end timer — blink cannot cancel this
    if (_turnEndTimer) clearTimeout(_turnEndTimer);
    _turnEndTimer = setTimeout(() => {
        if (_state === 'awake' || _state === 'arguing' || _state === 'casting') {
            _state = 'awake';
            _facing = 1;
            _mirrorMode = false;
            _emit();
        }
    }, forceGlyphSwap
        ? 1200 + Math.random() * 2000   // action turns hold 1.2-3.2s
        : 800  + Math.random() * 1500); // plain turns hold 0.8-2.3s
}

function _goSleep(): void {
    if (_state !== 'awake') return;
    _state = 'yawning'; _emit();
    if (_stateTimer) clearTimeout(_stateTimer);
    _stateTimer = setTimeout(() => {
        _state = 'sleeping'; _emit();
        // After 20-35s of sleep → void
        if (_voidTimer) clearTimeout(_voidTimer);
        _voidTimer = setTimeout(() => {
            if (_state !== 'sleeping') return;
            _state = 'void'; _emit();
            // Void lasts 30-45s then wakes
            if (_voidTimer) clearTimeout(_voidTimer);
            _voidTimer = setTimeout(() => {
                if (_state === 'void') _wakeUp();
            }, 30000 + Math.random() * 15000);
        }, 20000 + Math.random() * 15000);
    }, 1600);
}

function _wakeUp(): void {
    if (_voidTimer) { clearTimeout(_voidTimer); _voidTimer = null; }
    _state = 'awake'; _facing = 1; _mirrorMode = false; _emit();
    _resetIdleTimer();
}

function _resetIdleTimer(): void {
    if (_idleTimer) clearTimeout(_idleTimer);
    // Doubled from sim — sleep is an easter egg, 90-150s of idle to reach it
    _idleTimer = setTimeout(_goSleep, 90000 + Math.random() * 60000);
}

function _scheduleBlink(): void {
    if (_blinkTimer) clearTimeout(_blinkTimer);
    _blinkTimer = setTimeout(() => { _blink(); _scheduleBlink(); }, 2800 + Math.random() * 3200);
}

/** Turn fires every 8-16s. 75% plain, 25% arm-action (glyph-swap + brows). */
function _scheduleTurn(): void {
    if (_turnTimer) clearTimeout(_turnTimer);
    _turnTimer = setTimeout(() => {
        if (_state === 'awake') {
            _turn(Math.random() < 0.25);
        }
        _scheduleTurn();
    }, 8000 + Math.random() * 8000);
}

/** Throw — ultra-rare forward-facing action, 1-2 min cadence.
 *  CSS flip + turn arm = the "throw down" effect.  */
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
    }, 60000 + Math.random() * 60000);
}

// ── Lifecycle ────────────────────────────────────────────────────────

function _onVisibility(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
        _clearAll();
    } else if (_running) {
        _scheduleBlink();
        _scheduleTurn();
        _scheduleThrow();
        if (_state === 'awake') _resetIdleTimer();
    }
}

function _start(): void {
    if (_running) return;
    _running = true;
    if (typeof document !== 'undefined' && !_visAttached) {
        document.addEventListener('visibilitychange', _onVisibility);
        _visAttached = true;
    }
    if (typeof document === 'undefined' || !document.hidden) {
        _scheduleBlink();
        _scheduleTurn();
        _scheduleThrow();
        _resetIdleTimer();
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
    if (_state === 'sleeping' || _state === 'yawning' || _state === 'void') _wakeUp();
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
