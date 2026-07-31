'use client';

/*
 * themePlayer — plays a theme, forever, without ever stalling the page.
 *
 * A theme is about a minute long. Rendering a minute of audio up front would
 * freeze the phone for several seconds before the first note, so nothing is
 * rendered ahead of time: the piece is built TWO BARS AT A TIME and queued
 * just in front of what you're hearing. Starting is the cost of one short
 * block; length after that is free.
 *
 * Each block is rendered long enough to hold the longest note in the piece,
 * so nothing is clipped at a block edge — the overhang simply overlaps the
 * next block and the audio graph sums them. Blocks are cached per theme, so
 * the second time round costs nothing at all.
 *
 * Ducking: when the miniplayer starts, the theme fades down to silence and
 * waits; when the miniplayer stops, it fades back. Two audio sources never
 * fight — the artist's soundtrack always wins (Brendon, 2026-07-31).
 */

import { renderRaw } from './recipes';
import { THEMES, type ThemeName, type ThemeRecipe } from './themes';

/* Themes sit UNDER the blips on purpose — background, not foreground. */
const THEME_GAIN = 0.34;
const CHUNK_BARS = 2;
const LOOKAHEAD = 2.5;      // seconds of audio kept queued
const SCHED_MS = 250;
const FADE_IN = 0.8;
const FADE_OUT = 0.9;
const DUCK_MS = 0.6;

interface Block { buf: AudioBuffer; span: number; peak: number }

const blocks = new Map<string, Block>();
const tails = new WeakMap<ThemeRecipe, number>();

function tailFor(recipe: ThemeRecipe): number {
    let t = tails.get(recipe);
    if (t == null) {
        t = 0;
        for (const v of recipe.voices) t = Math.max(t, v.dur);
        tails.set(recipe, t);
    }
    return t;
}

function blockFor(name: ThemeName, k: number, ac: AudioContext): Block {
    const key = name + '#' + k + '@' + ac.sampleRate;
    const hit = blocks.get(key);
    if (hit) return hit;

    const recipe = THEMES[name];
    const span = CHUNK_BARS * recipe.bar;
    const t0 = k * span;
    const t1 = Math.min(t0 + span, recipe.dur);
    const voices = recipe.voices
        .filter((v) => v.at >= t0 - 1e-9 && v.at < t1 - 1e-9)
        .map((v) => ({ ...v, at: v.at - t0 }));

    const samples = renderRaw({ dur: (t1 - t0) + tailFor(recipe), voices }, ac.sampleRate);
    const buf = ac.createBuffer(1, samples.length, ac.sampleRate);
    buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    let peak = 0;
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));

    const made = { buf, span: t1 - t0, peak };
    blocks.set(key, made);
    return made;
}

interface Running {
    name: ThemeName;
    ac: AudioContext;
    gain: GainNode;
    level: number;
    sources: AudioBufferSourceNode[];
    timer: number;
    next: number;
    at: number;
    total: number;
    ducked: boolean;
}

let live: Running | null = null;

/** Which theme is playing right now, if any. */
export function currentTheme(): ThemeName | null {
    return live ? live.name : null;
}

function pump(): void {
    const r = live;
    if (!r) return;
    /* If the queue falls behind the playhead — a slow block, a return from
       the background — jump forward instead of firing a pile of blocks that
       were all due in the past. */
    if (r.at < r.ac.currentTime) r.at = r.ac.currentTime + 0.05;

    while (r.at < r.ac.currentTime + LOOKAHEAD) {
        const b = blockFor(r.name, r.next % r.total, r.ac);
        const src = r.ac.createBufferSource();
        src.buffer = b.buf;
        src.connect(r.gain);
        src.start(r.at);
        src.onended = () => {
            const i = r.sources.indexOf(src);
            if (i >= 0) r.sources.splice(i, 1);
        };
        r.sources.push(src);
        r.at += b.span;
        r.next += 1;
    }
}

/**
 * Start a theme, fading in. Starting one stops whatever was playing. Calling
 * it with the theme already playing does nothing (so a re-render can't
 * restart the music mid-bar).
 */
export function startTheme(name: ThemeName, ac: AudioContext): void {
    if (live && live.name === name) return;
    stopTheme();
    if (ac.state === 'suspended') void ac.resume().catch(() => {});

    const recipe = THEMES[name];
    /* One block sets the level for the whole piece — levelling each block on
       its own would make the loudness lurch between them. */
    const first = blockFor(name, 0, ac);
    const level = THEME_GAIN * (first.peak > 0 ? 0.62 / first.peak : 1);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.linearRampToValueAtTime(level, ac.currentTime + FADE_IN);
    gain.connect(ac.destination);

    live = {
        name, ac, gain, level,
        sources: [],
        timer: 0,
        next: 0,
        at: ac.currentTime + 0.06,
        total: Math.ceil(recipe.bars / CHUNK_BARS),
        ducked: false,
    };
    pump();
    live.timer = window.setInterval(pump, SCHED_MS);
}

/** Stop whatever is playing, fading out. Safe to call when nothing is. */
export function stopTheme(): void {
    const r = live;
    if (!r) return;
    live = null;
    window.clearInterval(r.timer);
    const t = r.ac.currentTime;
    r.gain.gain.cancelScheduledValues(t);
    r.gain.gain.setValueAtTime(r.gain.gain.value, t);
    r.gain.gain.linearRampToValueAtTime(0.0001, t + FADE_OUT);
    for (const s of r.sources) {
        try { s.stop(t + FADE_OUT + 0.05); } catch { /* already finished */ }
    }
}

/**
 * Duck the theme out of the way (the miniplayer took over) or bring it back.
 * The music keeps running underneath while ducked, so releasing it drops you
 * back where the piece actually is rather than restarting it.
 */
export function duckTheme(on: boolean): void {
    const r = live;
    if (!r || r.ducked === on) return;
    r.ducked = on;
    const t = r.ac.currentTime;
    r.gain.gain.cancelScheduledValues(t);
    r.gain.gain.setValueAtTime(r.gain.gain.value, t);
    r.gain.gain.linearRampToValueAtTime(on ? 0.0001 : r.level, t + DUCK_MS);
}
