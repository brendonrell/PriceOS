'use client';

/*
 * priceSpriteEngine — Ship 1 (PriceSprite + Signup + Levels)
 *
 * Module singleton driving the visible "main" sprite — the menu sprite
 * in UserMenuButtons and the modal hero in PriceSpriteModal. Both
 * surfaces subscribe to the same engine so they share frame state.
 *
 * Two render modes:
 *   1. Standin (no identity set)  — sim-faithful kaomoji at sim.html
 *      12090–12231, preserved verbatim. Default behaviour; renders
 *      the same `(ง •̀_•́)ง` family that's been on dev since Batch I.
 *      `hasIdentity` flag on each frame is false in this mode.
 *
 *   2. Composed (identity set)    — wallet + vibe → deterministic
 *      8-slot composition via lib/sprites/composer.ts. Activated by
 *      setMainSpriteIdentity(walletAddress, vibe). `hasIdentity` flag
 *      flips to true. Ship 2 wires SIWE state into this setter and
 *      gates UI visibility on the flag.
 *
 * The state machine (blink / turn / yawn / sleep cadence) is shared
 * between modes. Mode only affects what `_computeFrame()` returns for
 * a given state.
 *
 * Cadence verbatim from sim:
 *   blink:  scheduleBlink → 2800 + Math.random()*3200 ms; 160ms duration
 *   turn:   scheduleTurn  → 10000 + Math.random()*10000 ms; 800 + Math.random()*1500 hold
 *   idle:   resetIdleTimer → 45000 + Math.random()*30000 ms before goSleep
 *   yawn → sleep transition: 1600ms
 *   sleep duration: 20000 + Math.random()*15000 ms
 *
 * Visibility: visibilitychange listener pauses all chains on hidden
 * and restarts them on visible. Frame state is preserved across
 * pause; on resume the chains restart fresh from the current state.
 *
 * Mirror behaviour:
 *   - standin: _facing/_mirrorMode swap between AWAKE_R/BLINK_R and
 *     AWAKE_L/BLINK_L glyphs (the kaomoji has hand-authored mirrors).
 *   - composed: no glyph swap — pure CSS scaleX(-1). Brackets and
 *     asymmetric arms flip correctly under the transform.
 *
 * In both modes sleeping/yawning frames are NEVER mirrored (transform
 * stays scaleX(1)) so literal "zzz" text doesn't render reversed.
 *
 * wake() is a no-op when no subscribers. UserMenuButtons calls it on
 * menu open so a sleeping/yawning sprite snaps awake when the user
 * opens the connect menu (sim 12213-12219 btnUser handler).
 */

import {
    composeSprite,
    type SpriteAnimState,
    type SpriteParts,
} from '../sprites/composer';
import { type PriceSpriteVibe } from '../sprites/vibes';

export { type SpriteAnimState, type SpriteParts };

export interface SpriteFrame {
    face: string;
    transform: string; // 'scaleX(1)' | 'scaleX(-1)'
    sleeping: boolean;
    /**
     * True when the engine is rendering the user's composed sprite
     * (identity set via setMainSpriteIdentity). False when rendering
     * the standin kaomoji. Ship 2 gates UI visibility on this flag —
     * a logged-out user has no identity and should see no sprite.
     */
    hasIdentity: boolean;
    /**
     * Per-slot parts of the composed sprite. Present only in composed
     * mode (hasIdentity === true). Consumers render each slot in a
     * fixed-width inline-block so blink / yawn / sleep character
     * swaps don't squish the sprite. Null in standin mode — the
     * standin's kaomoji structure doesn't map cleanly to the 8-slot
     * shape and the hand-authored mirror glyphs balance widths
     * naturally, so consumers fall back to rendering `face` as a
     * single string when parts is null.
     */
    parts: SpriteParts | null;
}

/* Standin kaomoji — sim 12100-12105 verbatim. Codepoints verified
   against sim.html. Do NOT tidy or "normalize"; the combining accents
   on •̀ / •́ are intentional and the mirror-mode logic depends on the
   exact glyph shapes. */
const STANDIN_AWAKE_R = '(ง •̀_•́)ง';
const STANDIN_AWAKE_L = 'ヽ(•́_•̀ヽ)';
const STANDIN_BLINK_R = '(ง -_-)ง';
const STANDIN_BLINK_L = 'ヽ(-_-ヽ)';
const STANDIN_YAWN_R  = '(ง ᵕ_ᵕ)ง';
const STANDIN_SLEEP_R = '(ง zzz)ง';

type State = 'awake' | 'blinking' | 'yawning' | 'sleeping';

let _facing: 1 | -1 = 1;
let _mirrorMode = false;
let _state: State = 'awake';

let _identity: {
    walletAddress: string;
    vibe: PriceSpriteVibe;
} | null = null;

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

function _stateToAnim(state: State): SpriteAnimState {
    return state;
}

function _computeFrame(): SpriteFrame {
    const isLeft = _facing === -1;
    const isAsleep = _state === 'sleeping' || _state === 'yawning';

    /* Identity path — composed sprite. No glyph-level mirror; rely on
       CSS scaleX(-1) for the L variant. Sleeping/yawning frames stay
       upright so " zzz " reads correctly. */
    if (_identity !== null) {
        const composed = composeSprite(
            _identity.walletAddress,
            _identity.vibe,
            _stateToAnim(_state),
        );
        /* composeSprite returns null only on malformed addresses; the
           identity setter validates before assigning so this is a
           safety net. Fall through to standin on null. */
        if (composed !== null) {
            const transform = (isLeft && !isAsleep)
                ? 'scaleX(-1)'
                : 'scaleX(1)';
            return {
                face: composed.fullString,
                transform,
                sleeping: isAsleep,
                hasIdentity: true,
                parts: composed.parts,
            };
        }
    }

    /* Standin path — sim 12117-12120 verbatim glyph swap. */
    let face: string;
    if (_state === 'sleeping')      face = STANDIN_SLEEP_R;
    else if (_state === 'yawning')  face = STANDIN_YAWN_R;
    else if (_state === 'blinking') face = (_mirrorMode || !isLeft) ? STANDIN_BLINK_R : STANDIN_BLINK_L;
    else                            face = (_mirrorMode || !isLeft) ? STANDIN_AWAKE_R : STANDIN_AWAKE_L;
    /* sim 12126-12132 — skip the CSS flip when sleeping/yawning so the
       literal "zzz" letters don't render mirrored (unreadable). */
    const transform = (_mirrorMode && isLeft && !isAsleep) ? 'scaleX(-1)' : 'scaleX(1)';
    return { face, transform, sleeping: isAsleep, hasIdentity: false, parts: null };
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
    /* Standin needs the random L-vs-R glyph swap; composed flips via
       CSS regardless of _mirrorMode. Keeping both flags so the
       standin path stays sim-faithful. */
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

/**
 * Bind (or unbind) the main sprite to a wallet + vibe identity. When
 * both args are non-null, subsequent frames render the user's
 * composed sprite and `hasIdentity` flips to true on the next emit.
 * Pass (null, null) to detach — frames revert to the standin and
 * `hasIdentity` flips back to false.
 *
 * No-op when the identity is unchanged. Emits on actual change so
 * subscribers re-read the frame.
 *
 * Ship 2 wires this to SIWE state: on successful sign-in with a
 * claimed @name and price_sprite, call with (siweAddress, vibe);
 * on sign-out, call with (null, null).
 */
export function setMainSpriteIdentity(
    walletAddress: string | null,
    vibe: PriceSpriteVibe | null,
): void {
    const next = (walletAddress && vibe)
        ? { walletAddress, vibe }
        : null;
    /* No-op shortcut on identical assignment. */
    if (
        _identity === null && next === null
    ) return;
    if (
        _identity !== null
        && next !== null
        && _identity.walletAddress === next.walletAddress
        && _identity.vibe === next.vibe
    ) return;
    _identity = next;
    _emit();
}

/**
 * Read the current main-sprite identity. Returns null when no
 * identity is bound (logged-out / pre-claim state).
 */
export function getMainSpriteIdentity(): {
    walletAddress: string;
    vibe: PriceSpriteVibe;
} | null {
    return _identity;
}

/**
 * Read the current animation state from the shared state machine.
 * Used by the AccountCreateModal quadrants so their 4 preview
 * sprites animate in lockstep with the menu sprite — each quadrant
 * passes this state to composeSprite() per frame.
 */
export function getSpriteAnimState(): SpriteAnimState {
    return _state;
}
