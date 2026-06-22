'use client';

/*
 * familiarEngine — the floating Digital Familiar's brain.
 *
 * Module singleton — owns the floating companion's frame lifecycle (sprite
 * text, name badge, speech bubble, outline) and drives the four-state machine:
 * idle / scroll / action / sleep. Lifecycle is callback-driven: enableFamiliar()
 * mounts species + outline, starts timers + listeners, emits frames;
 * disableFamiliar() stops everything and emits a hidden frame.
 *
 * The roster (all tiers, animated) lives in lib/familiar/species. Every
 * familiar's voice — its personality lines plus how it regards you at your
 * PriceRank — lives in lib/familiar/dialogue. The companion's knowledge of YOU
 * (Omniscience: hold times, sold-at-a-loss, streak, collections, pulled live
 * from your account record + activity) lives in lib/familiar/intel; those
 * personal lines EMERGE the longer the familiar stays on screen, on a no-repeat
 * cycle, and only when Omniscience is on (it is, by default).
 *
 * Cadence (unchanged from the original sim port):
 *   frame:   600ms round-robin   ·   idle dialogue: every 20-40s
 *   scroll:  500ms revert         ·   action: 1500ms revert, 40% reaction
 *   sleep:   5min idle → sleep    ·   bubble: visible 4000ms
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import {
    ANIMATED_SPECIES,
    findAnimatedSpecies,
    type AnimatedSpecies,
} from '../familiar/species';
import { pickDialogue } from '../familiar/dialogue';
import { loadIntel } from '../familiar/intel';

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

/* ── Internal state ───────────────────────────────────────── */

let _species: AnimatedSpecies | null = null;
let _frameIdx = 0;
let _state: FamiliarState = 'idle';
let _speciesPicked = false; // sticky for page lifetime
let _visible = false;
let _outlined = false;
let _outlineColor: string | null = null;

let _spriteText = '';
let _badgeText = '';
let _bubbleText = '';
let _bubbleVisible = false;

/* Context the engine learns from the auth layer (set by Backgrounds.tsx). */
let _rank = 0;
let _address: string | null = null;
let _omniscient = true;

/* Omniscience knowledge of the user + its emergence / no-repeat cycle. */
let _intelFacts: string[] = [];
let _factQueue: string[] = [];
let _enabledAt = 0;
const EMERGE_DELAY_MS = 40_000; // familiar must be present a while before it gets personal

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

/* ── Species selection ────────────────────────────────────── */

function _urlSpeciesOverride(): AnimatedSpecies | null {
    if (typeof window === 'undefined') return null;
    try {
        const m = new URLSearchParams(window.location.search).get('familiar');
        if (m) return findAnimatedSpecies(m);
    } catch {}
    return null;
}

/** The user's saved familiar choice from the write-through cache. */
function _savedSpecies(): AnimatedSpecies | null {
    if (typeof window === 'undefined') return null;
    try {
        const name = localStorage.getItem(STATE_CACHE_KEYS.familiarSpecies);
        return name ? findAnimatedSpecies(name) : null;
    } catch {
        return null;
    }
}

/* Selection priority: ?familiar= URL override, then saved choice, then a random
   roll for a first-time visitor. */
function _pickSpecies(): AnimatedSpecies {
    return (
        _urlSpeciesOverride() ||
        _savedSpecies() ||
        ANIMATED_SPECIES[Math.floor(Math.random() * ANIMATED_SPECIES.length)]
    );
}

/* Read the persisted omniscience flag (absent = on). */
function _readOmniscience(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return localStorage.getItem(STATE_CACHE_KEYS.familiarOmniscience) !== '0';
    } catch {
        return true;
    }
}

/* ── State machine ────────────────────────────────────────── */

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

/* ── Dialogue + Omniscience ───────────────────────────────── */

/** Next personal fact from the no-repeat cycle (full pass before any repeat). */
function _nextFact(): string | null {
    if (!_intelFacts.length) return null;
    if (!_factQueue.length) {
        // refill + shuffle so facts spread out and don't repeat until exhausted
        _factQueue = [..._intelFacts];
        for (let i = _factQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [_factQueue[i], _factQueue[j]] = [_factQueue[j], _factQueue[i]];
        }
    }
    return _factQueue.pop() ?? null;
}

/* Probability that an idle remark is a personal (Omniscience) line. Zero until
   the familiar has been present EMERGE_DELAY_MS, then ramps with dwell time and
   caps — the knowledge emerges as an ability, never dominates the chatter. */
function _intelChance(): number {
    if (!_omniscient || !_intelFacts.length) return 0;
    const dwell = Date.now() - _enabledAt;
    if (dwell < EMERGE_DELAY_MS) return 0;
    const minutes = (dwell - EMERGE_DELAY_MS) / 60000;
    return Math.min(0.5, 0.14 + 0.06 * minutes);
}

function _showBubble(text: string) {
    if (!text) return;
    _bubbleText = text;
    _bubbleVisible = true;
    _emit();
    if (_bubbleHideTimer) clearTimeout(_bubbleHideTimer);
    _bubbleHideTimer = setTimeout(() => {
        _bubbleVisible = false;
        _bubbleHideTimer = null;
        _emit();
    }, 4000);
}

function _emitDialogue(state: FamiliarState) {
    if (!_species) return;
    // Idle remarks may surface a personal fact once Omniscience has emerged.
    if (state === 'idle' && Math.random() < _intelChance()) {
        const fact = _nextFact();
        if (fact) {
            _showBubble(fact);
            return;
        }
    }
    _showBubble(pickDialogue(_species.name, _species.tier, state, _rank));
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
    /* 40% chance of a reaction line — preserves restraint */
    if (Math.random() < 0.4) _emitDialogue('action');
    if (_actionRevertTimer) clearTimeout(_actionRevertTimer);
    _actionRevertTimer = setTimeout(() => {
        if (_state === 'action') _setState('idle');
        _resetSleep();
    }, 1500);
}

function _handleDocClick(ev: Event) {
    const target = ev.target as Element | null;
    if (!target || !target.closest) return;
    if (target.closest('.btn-mint, .modal-action-btn, .btn-list, .btn-offer')) {
        _onAction();
    }
}

function _startTickers() {
    if (_frameTimer) return;
    _frameTimer = setInterval(_renderFrame, 600);
    _dialogueTimer = setInterval(
        () => _emitDialogue('idle'),
        20000 + Math.random() * 20000,
    );
}

function _stopTickers() {
    if (_frameTimer) clearInterval(_frameTimer);
    if (_dialogueTimer) clearInterval(_dialogueTimer);
    _frameTimer = null;
    _dialogueTimer = null;
}

function _onVisibility() {
    if (document.hidden) {
        _stopTickers();
    } else {
        _startTickers();
    }
}

function _start() {
    if (_frameTimer) return;
    _startTickers();
    window.addEventListener('scroll', _onScroll, { passive: true });
    document.addEventListener('click', _handleDocClick, true);
    document.addEventListener('visibilitychange', _onVisibility);
    document.addEventListener('mousemove', _resetSleep, { passive: true });
    document.addEventListener('keydown', _resetSleep, { passive: true });
    document.addEventListener('touchstart', _resetSleep, { passive: true });
    _resetSleep();
}

function _stop() {
    _stopTickers();
    if (_sleepTimer) clearTimeout(_sleepTimer);
    if (_scrollRevertTimer) clearTimeout(_scrollRevertTimer);
    if (_actionRevertTimer) clearTimeout(_actionRevertTimer);
    if (_bubbleHideTimer) clearTimeout(_bubbleHideTimer);
    _sleepTimer = null;
    _scrollRevertTimer = null;
    _actionRevertTimer = null;
    _bubbleHideTimer = null;
    if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', _onScroll);
    }
    if (typeof document !== 'undefined') {
        document.removeEventListener('click', _handleDocClick, true);
        document.removeEventListener('visibilitychange', _onVisibility);
        document.removeEventListener('mousemove', _resetSleep);
        document.removeEventListener('keydown', _resetSleep);
        document.removeEventListener('touchstart', _resetSleep);
    }
    _bubbleVisible = false;
}

/* Pull the user's knowledge for Omniscience (best-effort, async). */
function _loadIntel() {
    if (!_omniscient) {
        _intelFacts = [];
        _factQueue = [];
        return;
    }
    const forAddress = _address;
    loadIntel(forAddress)
        .then((facts) => {
            // Ignore a late resolve for a since-changed address.
            if (forAddress !== _address) return;
            _intelFacts = facts;
            _factQueue = [];
        })
        .catch(() => {
            _intelFacts = [];
            _factQueue = [];
        });
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Tell the engine who the user is + their rank, so dialogue can address them
 * correctly and Omniscience can read their record. Safe to call repeatedly
 * (Backgrounds.tsx calls it when the auth context changes). Re-pulls knowledge
 * when the address changes while enabled.
 */
export function setFamiliarContext(opts: { address?: string | null; rank?: number }): void {
    if (typeof opts.rank === 'number') _rank = opts.rank;
    if ('address' in opts) {
        const next = opts.address ?? null;
        if (next !== _address) {
            _address = next;
            if (_visible) _loadIntel();
        }
    }
}

/**
 * Mount + start the engine. First call per page picks species + outline
 * (~25% outline chance, palette keyed to body bg luminance).
 */
export function enableFamiliar(): void {
    if (typeof window === 'undefined') return;
    _omniscient = _readOmniscience();
    if (!_speciesPicked) {
        _species = _pickSpecies();
        _badgeText = _species.name;
        _spriteText = '';
        _frameIdx = 0;
        _state = 'idle';
        _outlined = false;
        _outlineColor = null;
        if (Math.random() < 0.25) {
            const bg = getComputedStyle(document.body).backgroundColor;
            const m = bg.match(/rgba?\(([^)]+)\)/);
            let lum = 0;
            if (m) {
                const [r, g, b] = m[1].split(',').map((n) => parseInt(n.trim(), 10));
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
    _enabledAt = Date.now();
    _loadIntel();
    _start();
    _renderFrame();
    _emit();
}

/** Stop + hide the engine. Species + outline persist for re-enable. */
export function disableFamiliar(): void {
    _visible = false;
    _stop();
    _emit();
}

/**
 * Subscribe to frame snapshots. Returns an unsubscribe fn. Caller receives the
 * current snapshot synchronously on subscribe.
 */
export function subscribeFamiliar(cb: (frame: FamiliarFrame) => void): () => void {
    _subscribers.add(cb);
    cb(_snapshot());
    return () => {
        _subscribers.delete(cb);
    };
}

/** Current frame snapshot — used by FamiliarModal to stamp its title. */
export function getFamiliarFrame(): FamiliarFrame {
    return _snapshot();
}

/** Current species name, '' if none picked yet. */
export function getFamiliarSpeciesName(): string {
    return _species ? _species.name : '';
}

/** Every selectable familiar name (the full animated roster). */
export function getFamiliarSpeciesList(): string[] {
    return ANIMATED_SPECIES.map((s) => s.name);
}

/**
 * Choose the active familiar species. Updates the live companion immediately
 * (floating sprite + any open modal hero) and persists the choice — local cache
 * for instant re-apply on reload, plus the server settings envelope so it
 * follows the user across devices. No-op for an unknown name.
 */
export function setFamiliarSpecies(name: string): void {
    const sp = findAnimatedSpecies(name);
    if (!sp || sp === _species) return;
    _species = sp;
    _speciesPicked = true;
    _frameIdx = 0;
    _state = 'idle';
    _badgeText = sp.name;
    try {
        localStorage.setItem(STATE_CACHE_KEYS.familiarSpecies, sp.name);
    } catch {
        /* private mode / quota — server sync below still carries the change */
    }
    pushSettings({ familiarSpecies: sp.name });
    _renderFrame();
}

/** Whether Omniscience is currently on (absent persisted value = on). */
export function getFamiliarOmniscience(): boolean {
    return _readOmniscience();
}

/**
 * Turn Omniscience on/off. Persists (local cache + server settings) and takes
 * effect live: turning on pulls the user's knowledge now; turning off clears it
 * so only personality + generic chatter remains.
 */
export function setFamiliarOmniscience(on: boolean): void {
    _omniscient = on;
    try {
        if (on) localStorage.removeItem(STATE_CACHE_KEYS.familiarOmniscience);
        else localStorage.setItem(STATE_CACHE_KEYS.familiarOmniscience, '0');
    } catch {
        /* private mode / quota — server sync below still carries the change */
    }
    pushSettings({ familiarOmniscience: on });
    if (on) {
        _loadIntel();
    } else {
        _intelFacts = [];
        _factQueue = [];
    }
}
