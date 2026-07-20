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

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
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

/** Call from a user gesture (the sound key tap) so iOS unlocks audio. */
export function unlockSound(): void {
    const ac = getCtx();
    if (ac && ac.state === 'suspended') void ac.resume().catch(() => {});
}

/** Play one of the five blips. Silent no-op when the layer is off. */
export function playSound(name: SoundName): void {
    if (!readSoundOn()) return;
    const ac = getCtx();
    if (!ac) return;
    if (ac.state === 'suspended') {
        void ac.resume().catch(() => {});
        if (ac.state === 'suspended') return; // locked — skip, never queue
    }
    try {
        const src = ac.createBufferSource();
        src.buffer = bufferFor(name, ac);
        src.connect(ac.destination);
        src.start();
    } catch { /* never let a blip break the app */ }
}
