'use client';

/*
 * priceSpriteEngine — Batch I / F66 / BUG-27
 *
 * Sim port of the PriceSprite (a.k.a. asciiSprite) state machine at
 * sim.html 12090–12231. Module singleton — owns the kaomoji frame
 * driving #asciiSprite (UserMenuButtons) and the modal hero
 * #priceSpriteHeroSprite (PriceSpriteModal).
 *
 * 4 logical states × facing × mirrorMode → 6 visible variants:
 *   awake-right, awake-left, blink-right, blink-left, yawn, sleep
 *
 * Sim mirrors the menu sprite's frame into the modal hero via a
 * MutationObserver on textContent (sim 12988–12995). React port
 * collapses that into the same engine: the modal subscribes
 * directly, no DOM observation needed.
 *
 * Cadence verbatim from sim:
 *   blink:  scheduleBlink → 2800 + Math.random()*3200 ms; 160ms duration
 *   turn:   scheduleTurn  → 10000 + Math.random()*10000 ms; 800 + Math.random()*1500 hold
 *   idle:   resetIdleTimer → 45000 + Math.random()*30000 ms before goSleep
 *   yawn → sleep transition: 1600ms
 *   sleep duration: 20000 + Math.random()*15000 ms
 *
 * Visibility: visibilitychange listener pauses all chains on hidden
 * and restarts them on visible. Sim doesn't pause the sprite (its
 * idle timer still fires while the tab is hidden), but spec asks for
 * pause-on-hidden so we add it. Frame state is preserved across
 * pause; on resume the chains restart fresh from the current state.
 *
 * wake() is a no-op when no subscribers. UserMenuButtons calls it on
 * menu open so a sleeping/yawning sprite snaps awake when the user
 * opens the connect menu (sim 12213-12219 btnUser handler).
 */

export interface SpriteFrame {
    face: string;
    transform: string; // 'scaleX(1)' | 'scaleX(-1)'
    sleeping: boolean;
}

/* sim 12100-12105 verbatim. Kaomoji — verified codepoint-by-codepoint
   against sim.html. Do NOT tidy or "normalize"; the combining accents
   on •̀ / •́ are intentional and the mirror-mode logic depends on the
   exact glyph shapes. */
const AWAKE_R = '(ง •̀_•́)ง';
const AWAKE_L = 'ヽ(•́_•̀ヽ)';
const BLINK_R = '(ง -_-)ง';
const BLINK_L = 'ヽ(-_-ヽ)';
const YAWN_R  = '(ง ᵕ_ᵕ)ง';
const SLEEP_R = '(ง zzz)ง';

type State = 'awake' | 'blinking' | 'yawning' | 'sleeping';

let _facing: 1 | -1 = 1;
let _mirrorMode = false;
let _state: State = 'awake';

let _idleTimer: ReturnType<typeof setTimeout> | null = null;
let _blinkTimer: ReturnType<typeof setTimeout> | null = null;
let _turnTimer: ReturnType<typeof setTimeout> | null = null;
let _stateTimer: ReturnType<typeof setTimeout> | null = null; // turn-hold / blink-end / yawn-end / sleep-end

const _subscribers = new Set<() => void>();
let _visListenerAttached = false;
let _running = false;

function _emit(): void {
    _subscribers.forEach((fn) => {
        try { fn(); } catch { /* subscriber error must not break the loop */ }
    });
}

function _computeFrame(): SpriteFrame {
    const isLeft = _facing === -1;
    const isAsleep = _state === 'sleeping' || _state === 'yawning';
    let face: string;
    /* sim 12117-12120 verbatim */
    if (_state === 'sleeping')      face = SLEEP_R;
    else if (_state === 'yawning')  face = YAWN_R;
    else if (_state === 'blinking') face = (_mirrorMode || !isLeft) ? BLINK_R : BLINK_L;
    else                            face = (_mirrorMode || !isLeft) ? AWAKE_R : AWAKE_L;
    /* sim 12126-12132 — skip the CSS flip when sleeping/yawning so the
       literal "zzz" letters don't render mirrored (unreadable) */
    const transform = (_mirrorMode && isLeft && !isAsleep) ? 'scaleX(-1)' : 'scaleX(1)';
    return { face, transform, sleeping: isAsleep };
}

function _clearAll(): void {
    if (_idleTimer)  { clearTimeout(_idleTimer);  _idleTimer  = null; }
    if (_blinkTimer) { clearTimeout(_blinkTimer); _blinkTimer = null; }
    if (_turnTimer)  { clearTimeout(_turnTimer);  _turnTimer  = null; }
    if (_stateTimer) { clearTimeout(_stateTimer); _stateTimer = null; }
}

/* sim 12146-12150 */
function _blink(): void {
    if (_state !== 'awake') return;
    _state = 'blinking';
    _emit();
    _stateTimer = setTimeout(() => {
        if (_state === 'blinking') {
            _state = 'awake';
            _emit();
        }
    }, 160);
}

/* sim 12152-12161 */
function _turn(): void {
    if (_state !== 'awake') return;
    _mirrorMode = Math.random() < 0.5;
    _facing = -1;
    _emit();
    const holdTime = 800 + Math.random() * 1500;
    _stateTimer = setTimeout(() => {
        if (_state === 'awake') {
            _facing = 1;
            _mirrorMode = false;
            _emit();
        }
    }, holdTime);
}

/* sim 12163-12170 */
function _goSleep(): void {
    if (_state !== 'awake') return;
    _state = 'yawning';
    _emit();
    _stateTimer = setTimeout(() => {
        _state = 'sleeping';
        _emit();
        _stateTimer = setTimeout(_wakeUp, 20000 + Math.random() * 15000);
    }, 1600);
}

/* sim 12172-12175 */
function _wakeUp(): void {
    _state = 'awake';
    _facing = 1;
    _mirrorMode = false;
    _emit();
    _resetIdleTimer();
}

/* sim 12177-12180 */
function _resetIdleTimer(): void {
    if (_idleTimer) clearTimeout(_idleTimer);
    _idleTimer = setTimeout(_goSleep, 45000 + Math.random() * 30000);
}

/* sim 12182-12185 */
function _scheduleBlink(): void {
    if (_blinkTimer) clearTimeout(_blinkTimer);
    _blinkTimer = setTimeout(() => {
        _blink();
        _scheduleBlink();
    }, 2800 + Math.random() * 3200);
}

/* sim 12187-12190 */
function _scheduleTurn(): void {
    if (_turnTimer) clearTimeout(_turnTimer);
    _turnTimer = setTimeout(() => {
        _turn();
        _scheduleTurn();
    }, 10000 + Math.random() * 10000);
}

function _onVisibility(): void {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
        _clearAll();
    } else if (_running) {
        /* Restart the schedule chains. State is preserved — if the
           sprite was sleeping when the tab hid, it's still sleeping
           when the tab returns. The idle-timer restart wakes it up
           on its normal cadence. */
        _scheduleBlink();
        _scheduleTurn();
        if (_state === 'awake') _resetIdleTimer();
    }
}

function _start(): void {
    if (_running) return;
    _running = true;
    if (typeof document !== 'undefined' && !_visListenerAttached) {
        document.addEventListener('visibilitychange', _onVisibility);
        _visListenerAttached = true;
    }
    /* Don't blast an initial _emit — the mounting subscriber pulls
       the current frame via getSpriteFrame() before subscribing. */
    if (typeof document === 'undefined' || !document.hidden) {
        _scheduleBlink();
        _scheduleTurn();
        _resetIdleTimer();
    }
}

function _stop(): void {
    if (!_running) return;
    _running = false;
    _clearAll();
    if (typeof document !== 'undefined' && _visListenerAttached) {
        document.removeEventListener('visibilitychange', _onVisibility);
        _visListenerAttached = false;
    }
}

/**
 * Get the current sprite frame. Stable between transitions.
 */
export function getSpriteFrame(): SpriteFrame {
    return _computeFrame();
}

/**
 * Subscribe to sprite frame changes. Returns an unsubscribe fn.
 * Engine auto-starts on first subscriber, auto-stops on last.
 */
export function subscribeSprite(fn: () => void): () => void {
    _subscribers.add(fn);
    if (_subscribers.size === 1) _start();
    return () => {
        _subscribers.delete(fn);
        if (_subscribers.size === 0) _stop();
    };
}

/**
 * Snap the sprite awake. No-op when no subscribers. Called from
 * UserMenuButtons when the connect menu opens (sim 12213-12219).
 * If already awake, just resets the idle timer so the user gets a
 * full cycle of attention before the next yawn.
 */
export function wakeSprite(): void {
    if (_subscribers.size === 0) return;
    if (_state === 'sleeping' || _state === 'yawning') {
        _wakeUp();
    } else {
        _resetIdleTimer();
    }
}
