'use client';

/*
 * Sound engine — plays the locked recipes through Web Audio.
 *
 * Every blip is synthesized on the spot (renderRecipe → AudioBuffer,
 * cached per sound). No files. playSound() is a no-op unless the user's
 * sound flag is on, so call sites wire it unconditionally.
 *
 * iOS PWA reality (the brief): the AudioContext needs one user gesture
 * to unlock — unlockSound() runs on the dots-row key tap. If the context
 * is suspended when a play lands (e.g. a ping arriving after a nav), we
 * try a resume and otherwise skip silently — never fight the platform,
 * and the ringer switch muting us is fine.
 */

import { renderRecipe, SOUND_RECIPES, type SoundName } from './recipes';
import { readSoundOn } from './soundStore';

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer>();

/* Master playback level — every blip plays at three-quarters of the rendered
   loudness (Brendon, 2026-07-31). The recipes still render at their locked
   peak; only the output is turned down. */
const MASTER_GAIN = 0.75;

/* A bulk action (wishlisting a whole page from the Composer, the stone
   etching a plan) calls its handler once per item — without this, the same
   blip machine-guns. One sound can't retrigger inside this window; different
   sounds are unaffected. */
const RETRIGGER_MS = 70;
const lastPlayed = new Map<SoundName, number>();

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
        armWake();
    }
    return ctx;
}

function bufferFor(name: SoundName, ac: AudioContext): AudioBuffer {
    let b = buffers.get(name);
    if (!b) {
        const samples = renderRecipe(SOUND_RECIPES[name], ac.sampleRate);
        b = ac.createBuffer(1, samples.length, ac.sampleRate);
        b.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
        buffers.set(name, b);
    }
    return b;
}

/** The one shared context. Theme music plays through this too — iOS gives a
 *  page a limited number of them, and two would need unlocking separately. */
export function getAudioContext(): AudioContext | null {
    return getCtx();
}

/** Call from a user gesture (the sound key tap) so iOS unlocks audio. */
export function unlockSound(): void {
    const ac = getCtx();
    if (ac && ac.state === 'suspended') void ac.resume().catch(() => {});
}

/* iOS suspends the audio the moment you leave for another app, and coming
   back does NOT restore it — so the layer stayed dead until you toggled it
   off and on again (Brendon, 2026-07-31). Two wake-ups, both cheap no-ops
   once the context is already running: when the tab becomes visible again,
   and on the next touch after that in case iOS refused the first attempt
   outside a gesture. */
let woken = false;
function armWake(): void {
    if (woken || typeof document === 'undefined') return;
    woken = true;
    const wake = () => {
        if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') wake();
    });
    document.addEventListener('pointerdown', wake, { capture: true, passive: true });
    window.addEventListener('pageshow', wake);
}

/**
 * ⛔ THE LAYER HAS TO BE ALIVE WHEN YOU COME BACK (Brendon, 2026-07-31: the
 * settings survive, but the sound didn't until you toggled it off and on).
 * The flag lives on the account and hydrates on load, so the audio has to be
 * armed the moment the app knows the layer is on — not lazily at the first
 * blip, which lands too late and is thrown away while iOS is still locked.
 * Called once from the shell: it builds the context (which arms the wake-ups
 * above, so the session's first tap unlocks it) and re-arms whenever the flag
 * flips or the account snapshot lands.
 */
let armedFlag = false;
export function armSound(): void {
    if (typeof window === 'undefined') return;
    if (!armedFlag) {
        armedFlag = true;
        window.addEventListener('pd:sound-changed', () => armSound());
    }
    if (!readSoundOn()) return;
    const ac = getCtx();
    if (ac && ac.state === 'suspended') void ac.resume().catch(() => {});
}

/** Play one of the blips. Silent no-op when the layer is off. */
export function playSound(name: SoundName): void {
    if (!readSoundOn()) return;
    const ac = getCtx();
    if (!ac) return;
    const now = ac.currentTime * 1000;
    if (now - (lastPlayed.get(name) ?? -Infinity) < RETRIGGER_MS) return;
    lastPlayed.set(name, now);
    if (ac.state === 'suspended') {
        void ac.resume().catch(() => {});
        if (ac.state === 'suspended') return; // locked — skip, never queue
    }
    try {
        const src = ac.createBufferSource();
        src.buffer = bufferFor(name, ac);
        const g = ac.createGain();
        g.gain.value = MASTER_GAIN;
        src.connect(g);
        g.connect(ac.destination);
        src.start();
    } catch { /* never let a blip break the app */ }
}
