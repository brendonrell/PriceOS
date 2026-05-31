'use client';

/*
 * priceSpriteEngine — animation state machine.
 *
 * Base cadence (sim-verbatim):
 *   blink  2800+rand×3200 ms; 160 ms
 *   turn   10000+rand×10000 ms; 800+rand×1500 hold
 *   idle   45000+rand×30000 ms → goSleep
 *   yawn→sleep 1600 ms; sleep 20000+rand×15000 ms
 *
 * Action animations:
 *   throw  all vibes   22000+rand×18000 ms; 400-800 ms  (arm+CSS flip)
 *   argue  vibe_2 only 18000+rand×14000 ms; 800-1600 ms (arms up, MAD brows)
 *   cast   vibe_4 only 20000+rand×15000 ms; 1200-1800 ms (energy arms, sparkle brows)
 *
 * Each action has its own end-timer (not shared with _stateTimer) to
 * prevent any possibility of timer cross-contamination.
 *
 * Turn transform:
 *   glyph-swap (_mirrorMode=false): arm chars change, no CSS flip
 *   css-mirror (_mirrorMode=true):  arm stable, scaleX(-1)
 *   throwing: arm chars change AND scaleX(-1) — the "throw down"
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

type State = 'awake' | 'blinking' | 'yawning' | 'sleeping'
           | 'arguing' | 'throwing' | 'casting';

let _facing:     1 | -1 = 1;
let _mirrorMode  = false;
let _state:      State  = 'awake';
let _armVariant: 0 | 1  = 0;

let _identity: { walletAddress: string; vibe: PriceSpriteVibe } | null = null;

// Base timers
let _idleTimer:   ReturnType<typeof setTimeout> | null = null;
let _blinkTimer:  ReturnType<typeof setTimeout> | null = null;
let _turnTimer:   ReturnType<typeof setTimeout> | null = null;
let _stateTimer:  ReturnType<typeof setTimeout> | null = null; // blink/yawn/sleep durations

// Action schedulers
let _throwSchedTimer:  ReturnType<typeof setTimeout> | null = null;
let _argueSchedTimer:  ReturnType<typeof setTimeout> | null = null;
let _castSchedTimer:   ReturnType<typeof setTimeout> | null = null;

// Action end timers (separate from _stateTimer to avoid cross-contamination)
let _throwEndTimer: ReturnType<typeof setTimeout> | null = null;
let _argueEndTimer: ReturnType<typeof setTimeout> | null = null;
let _castEndTimer:  ReturnType<typeof setTimeout> | null = null;

const _subs = new Set<() => void>();
let _visAttached = false;
let _running     = false;

function _emit(): void {
    _subs.forEach(fn => { try { fn(); } catch { /* isolate */ } });
}

function _computeFrame(): SpriteFrame {
    const isLeft     = _facing === -1;
    const isAsleep   = _state === 'sleeping' || _state === 'yawning';
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
    if      (_state === 'sleeping')                        face = STANDIN_SLEEP_R;
    else if (_state === 'yawning')                         face = STANDIN_YAWN_R;
    else if (_state === 'blinking')                        face = (_mirrorMode || !sl) ? STANDIN_BLINK_R : STANDIN_BLINK_L;
    else if (_state === 'arguing' || _state === 'casting') face = STANDIN_AWAKE_R;
    else                                                   face = (_mirrorMode || !sl) ? STANDIN_AWAKE_R : STANDIN_AWAKE_L;
    const transform = (_mirrorMode && isLeft && !isAsleep) || isThrowing ? 'scaleX(-1)' : 'scaleX(1)';
    return { face, transform, sleeping: isAsleep, hasIdentity: false, parts: null, shadesLens: null };
}

function _clearAll(): void {
    const timers = [
        _idleTimer, _blinkTimer, _turnTimer, _stateTimer,
        _throwSchedTimer, _argueSchedTimer, _castSchedTimer,
        _throwEndTimer,   _argueEndTimer,   _castEndTimer,
    ];
    timers.forEach(t => { if (t) clearTimeout(t); });
    _idleTimer = _blinkTimer = _turnTimer = _stateTimer =
    _throwSchedTimer = _argueSchedTimer = _castSchedTimer =
    _throwEndTimer   = _argueEndTimer   = _castEndTimer   = null;
}

// ── Base cadence ─────────────────────────────────────────────────────

function _blink(): void {
    if (_state !== 'awake') return;
    _state = 'blinking'; _emit();
    _stateTimer = setTimeout(() => {
        if (_state === 'blinking') { _state = 'awake'; _emit(); }
    }, 160);
}

function _turn(): void {
    if (_state !== 'awake') return;
    _mirrorMode = Math.random() < 0.5;
    _facing = -1; _emit();
    _stateTimer = setTimeout(() => {
        if (_state === 'awake') { _facing = 1; _mirrorMode = false; _emit(); }
    }, 800 + Math.random() * 1500);
}

function _goSleep(): void {
    if (_state !== 'awake') return;
    _state = 'yawning'; _emit();
    _stateTimer = setTimeout(() => {
        _state = 'sleeping'; _emit();
        _stateTimer = setTimeout(_wakeUp, 20000 + Math.random() * 15000);
    }, 1600);
}

function _wakeUp(): void {
    _state = 'awake'; _facing = 1; _mirrorMode = false; _emit();
    _resetIdleTimer();
}

function _resetIdleTimer(): void {
    if (_idleTimer) clearTimeout(_idleTimer);
    _idleTimer = setTimeout(_goSleep, 45000 + Math.random() * 30000);
}

function _scheduleBlink(): void {
    if (_blinkTimer) clearTimeout(_blinkTimer);
    _blinkTimer = setTimeout(() => { _blink(); _scheduleBlink(); }, 2800 + Math.random() * 3200);
}

function _scheduleTurn(): void {
    if (_turnTimer) clearTimeout(_turnTimer);
    _turnTimer = setTimeout(() => { _turn(); _scheduleTurn(); }, 10000 + Math.random() * 10000);
}

// ── Action animations ────────────────────────────────────────────────

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
    }, 22000 + Math.random() * 18000);
}

function _scheduleArgue(): void {
    if (_argueSchedTimer) clearTimeout(_argueSchedTimer);
    _argueSchedTimer = setTimeout(() => {
        if (_identity?.vibe !== 'vibe_2' || _state !== 'awake') { _scheduleArgue(); return; }
        _armVariant = Math.random() < 0.5 ? 0 : 1;
        _state = 'arguing'; _emit();
        if (_argueEndTimer) clearTimeout(_argueEndTimer);
        _argueEndTimer = setTimeout(() => {
            if (_state === 'arguing') { _state = 'awake'; _emit(); }
            _scheduleArgue();
        }, 800 + Math.random() * 800);
    }, 18000 + Math.random() * 14000);
}

function _scheduleCast(): void {
    if (_castSchedTimer) clearTimeout(_castSchedTimer);
    _castSchedTimer = setTimeout(() => {
        if (_identity?.vibe !== 'vibe_4' || _state !== 'awake') { _scheduleCast(); return; }
        _armVariant = Math.random() < 0.5 ? 0 : 1;
        _state = 'casting'; _emit();
        if (_castEndTimer) clearTimeout(_castEndTimer);
        _castEndTimer = setTimeout(() => {
            if (_state === 'casting') { _state = 'awake'; _emit(); }
            _scheduleCast();
        }, 1200 + Math.random() * 600);
    }, 20000 + Math.random() * 15000);
}

// ── Lifecycle ────────────────────────────────────────────────────────

function _onVisibility(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
        _clearAll();
    } else if (_running) {
        _scheduleBlink(); _scheduleTurn();
        _scheduleThrow(); _scheduleArgue(); _scheduleCast();
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
        _scheduleBlink(); _scheduleTurn();
        _scheduleThrow(); _scheduleArgue(); _scheduleCast();
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

export function getSpriteFrame():     SpriteFrame      { return _computeFrame(); }
export function getSpriteAnimState(): SpriteAnimState  { return _state; }

export function subscribeSprite(fn: () => void): () => void {
    _subs.add(fn);
    if (_subs.size === 1) _start();
    return () => { _subs.delete(fn); if (_subs.size === 0) _stop(); };
}

export function wakeSprite(): void {
    if (_subs.size === 0) return;
    if (_state === 'sleeping' || _state === 'yawning') _wakeUp();
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
