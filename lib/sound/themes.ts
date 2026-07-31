/*
 * PD theme music — the locked pieces (Brendon, 2026-07-31).
 *
 * Pure data, exactly like the blip recipes: a theme is parts laid over a bar
 * grid, rendered by the same voice math. No audio files ship, ever.
 *
 * Each piece runs about a minute with a middle section, so a surface doesn't
 * repeat the same phrase at you. Nothing here touches Web Audio — the player
 * (themePlayer) renders it two bars at a time while it plays.
 *
 * The set, after the audition rounds:
 *   Homepage AM  — bright and unhurried
 *   Homepage PM  — the clicky arcade one (its backing stays CLIPPED, see
 *                  `tight` — Brendon chose that over the ringing version)
 *   Output Page  — a groove with deliberately NO TUNE, so browsing art is
 *                  never competing with a melody
 *   Profile      — warm, swung, lazy
 *   Artist AM    — major, light on its feet
 *   Artist PM    — slow and reflective
 *   Busy Mint    — bare ticking the whole way through; ⛔ NEVER add a pad or
 *                  an arpeggio to its middle, that was tried and rejected
 *   Sold Out     — calm and resolved
 *   Depanneur    — bouncy toy-machine jingle, clicky backing
 *   Sticker Store— bright walking shop floor
 *   Gnome Wallet — slow minor waltz under the hill (the only 3/4 piece)
 * The last three are OVERLAY themes: they belong to a modal, not a route, and
 * take over from whatever the page underneath was playing while it is open.
 */

import type { SoundVoice } from './recipes';

export interface ThemeRecipe {
    /** total length in seconds */
    dur: number;
    /** one bar in seconds */
    bar: number;
    bars: number;
    /** the running order, one letter per section */
    form: string[];
    voices: SoundVoice[];
}

const SEMI: Record<string, number> = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

/** 'A4' → 440. */
function hz(name: string): number {
    const m = /^([A-G]#?)(-?\d)$/.exec(name);
    if (!m) throw new Error('bad note ' + name);
    const midi = 12 * (Number(m[2]) + 1) + SEMI[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 'E5:.75 D5:.5 -:1' → notes laid end to end. '-' is a rest. */
function mel(line: string): Array<[number, number, number]> {
    const out: Array<[number, number, number]> = [];
    let beat = 0;
    for (const tok of line.trim().split(/\s+/)) {
        const [n, l] = tok.split(':');
        const len = Number(l);
        if (n !== '-') out.push([beat, hz(n), len]);
        beat += len;
    }
    return out;
}

type Partials = [number, number][];

const BELL: Partials = [[1, 1], [2, 0.35], [4, 0.12]];
const GLASS: Partials = [[1, 1], [3, 0.2], [5.4, 0.08]];
const SINE: Partials = [[1, 1]];
const RUBBER: Partials = [[1, 1], [2, 0.22], [3, 0.08]];
const PAD_TONE: Partials = [[1, 1], [2, 0.18], [3, 0.06]];
const SOFT: Partials = [[1, 1], [2, 0.12]];

type Chord = [string, string[]];

interface Parts {
    tight?: boolean;
    pad?: number;
    pulse?: { div?: number; gain?: number };
    arp?: { div?: number; gain?: number; oct?: number | number[]; partials?: Partials; soft?: boolean };
    hat?: { gain?: number; every?: 'odd' | 'even' | 'all' };
    thud?: { on?: number[]; gain?: number };
    bass?: { gain?: number };
    lead?: {
        partials?: Partials; gain?: number; wobble?: number;
        shimmer?: boolean; attack?: number; tail?: number;
    };
}

interface Section {
    chords: Chord[];
    melody: string[];
    bass?: string[];
    /** overrides for this section only */
    parts?: Parts;
}

interface ThemeSpec extends Parts {
    bpm: number;
    /** beats per bar (3 for a waltz) */
    beats?: number;
    swing?: number;
    form: string[];
    sections: Record<string, Section>;
}

function compose(spec: ThemeSpec): ThemeRecipe {
    const beats = spec.beats ?? 4;
    const beat = 60 / spec.bpm;
    const bar = beat * beats;
    const swing = spec.swing ?? 0;
    const voices: SoundVoice[] = [];
    let idx = 0;

    for (const key of spec.form) {
        const sec = spec.sections[key];
        const P: Parts = { ...spec, ...(sec.parts ?? {}) };

        for (let b = 0; b < sec.chords.length; b++, idx++) {
            const t0 = idx * bar;
            const [rootName, toneNames] = sec.chords[b];
            const root = hz(rootName);
            const tones = toneNames.map(hz);

            /* Pad — the chord held under everything. Rings a quarter-bar past
               its own bar so the music never falls into a hole at a bar line. */
            if (P.pad) {
                for (const f of tones) {
                    voices.push({
                        at: t0, dur: bar * 1.25, f0: f, partials: PAD_TONE,
                        gain: P.pad, attack: 0.06, tail: 0.9,
                    });
                }
            }

            /* Pulse — the root repeated. `tight` is the short clipped decay:
               notes die well before the next lands, which reads as clicky. */
            if (P.pulse) {
                const { div = 2, gain = 0.9 } = P.pulse;
                for (let s = 0; s < beats * div; s++) {
                    const sw = (s % 2 === 1) ? swing * (beat / div) : 0;
                    voices.push({
                        at: t0 + s * (beat / div) + sw,
                        dur: P.tight ? Math.min(0.16, (beat / div) * 0.75) : (beat / div) * 1.05,
                        f0: root, partials: [[1, 1], [2, 0.30], [3, 0.10]],
                        gain: s % div === 0 ? gain : gain * 0.65,
                        attack: 0.003, tail: P.tight ? 9 : 5,
                    });
                }
            }

            /* Arpeggio — chord tones climbing under the tune. `oct` may be a
               list, one octave per bar, so a pattern can rise. */
            if (P.arp) {
                const { div = 4, gain = 0.26, oct = 1, partials = BELL, soft = false } = P.arp;
                const up = Array.isArray(oct) ? oct[b % oct.length] : oct;
                for (let s = 0; s < beats * div; s++) {
                    const sw = (s % 2 === 1) ? swing * (beat / div) : 0;
                    voices.push({
                        at: t0 + s * (beat / div) + sw,
                        dur: P.tight ? Math.min(0.12, (beat / div) * 0.9) : (beat / div) * 1.8,
                        f0: tones[s % tones.length] * Math.pow(2, up),
                        partials, gain, shimmer: !soft,
                        attack: soft ? 0.012 : 0.002, tail: P.tight ? 12 : 4,
                    });
                }
            }

            /* Hat — so the bar leans forward. */
            if (P.hat) {
                const { gain = 0.20, every = 'odd' } = P.hat;
                for (let e = 0; e < beats * 2; e++) {
                    if (every === 'odd' && e % 2 === 0) continue;
                    if (every === 'even' && e % 2 === 1) continue;
                    voices.push({
                        at: t0 + e * (beat / 2) + (e % 2 === 1 ? swing * (beat / 2) : 0),
                        dur: 0.020, f0: 6200, partials: SINE,
                        gain, attack: 0.0005, tail: 14,
                    });
                }
            }

            /* Bass — a line that MOVES, instead of the root hammered over and
               over. This is what keeps a driving piece from nagging. */
            if (P.bass && sec.bass) {
                for (const [k, note, len] of mel(sec.bass[b])) {
                    voices.push({
                        at: t0 + k * beat, dur: len * beat * 0.9, f0: note,
                        partials: [[1, 1], [2, 0.30], [3, 0.10]],
                        gain: P.bass.gain ?? 0.9, attack: 0.003, tail: 6,
                    });
                }
            }

            /* Thud — the floor. */
            if (P.thud) {
                const { on = [0, 2], gain = 1.0 } = P.thud;
                for (const k of on) {
                    voices.push({
                        at: t0 + k * beat, dur: 0.15, f0: 130, f1: 52, glide: 34,
                        partials: RUBBER, gain, attack: 0.002, tail: 9,
                    });
                }
            }

            /* The tune. */
            const lead = P.lead ?? {};
            for (const [k, note, len] of mel(sec.melody[b])) {
                voices.push({
                    at: t0 + k * beat, dur: len * beat * 0.95, f0: note,
                    partials: lead.partials ?? BELL,
                    gain: lead.gain ?? 0.60,
                    wobble: lead.wobble ?? 5,
                    shimmer: lead.shimmer ?? false,
                    attack: lead.attack ?? 0.004,
                    tail: lead.tail ?? 2.6,
                });
            }
        }
    }
    return { dur: idx * bar, bar, bars: idx, form: spec.form.slice(), voices };
}

/* Chord shorthand: [bass note, [the tones the arp and pad use]] */
const Am: Chord = ['A2', ['A3', 'C4', 'E4']];
const Em: Chord = ['E2', ['E3', 'G3', 'B3']];
const Dm: Chord = ['D2', ['D3', 'F3', 'A3']];
const C_: Chord = ['C2', ['C3', 'E3', 'G3']];
const F_: Chord = ['F2', ['F3', 'A3', 'C4']];
const G_: Chord = ['G2', ['G3', 'B3', 'D4']];
const Bb: Chord = ['A#2', ['A#3', 'D4', 'F4']];
const E_: Chord = ['E2', ['E3', 'G#3', 'B3']];
const D_: Chord = ['D2', ['D3', 'F#3', 'A3']];
const Am7: Chord = ['A2', ['A3', 'E4', 'G4']];
const Fmaj7: Chord = ['F2', ['F3', 'C4', 'E4']];
const Dm7: Chord = ['D2', ['D3', 'A3', 'C4']];
const Em7: Chord = ['E2', ['E3', 'B3', 'D4']];
const Bm7: Chord = ['B1', ['B2', 'F#3', 'A3']];
const A_maj: Chord = ['A2', ['A3', 'C#4', 'E4']];

const REST4 = ['-:4', '-:4', '-:4', '-:4'];

export type ThemeName =
    | 'homeAm' | 'homePm' | 'output' | 'profile'
    | 'artistAm' | 'artistPm' | 'busyMint' | 'soldOut'
    | 'depanneur' | 'stickerStore' | 'gnomeWallet';

/** What each piece is called in the UI. */
export const THEME_LABELS: Record<ThemeName, string> = {
    homeAm: 'Homepage AM Theme',
    homePm: 'Homepage PM Theme',
    output: 'Output Page Theme',
    profile: 'Profile Theme',
    artistAm: 'Artist AM Theme',
    artistPm: 'Artist PM Theme',
    busyMint: 'Busy Mint Theme',
    soldOut: 'Sold Out Theme',
    depanneur: 'Depanneur Theme',
    stickerStore: 'Sticker Store Theme',
    gnomeWallet: 'Gnome Wallet Theme',
};

export const THEMES: Record<ThemeName, ThemeRecipe> = {
    /* Homepage AM — bright and unhurried. */
    homeAm: compose({
        bpm: 108, form: ['A', 'A', 'B', 'A', 'B', 'A'],
        pad: 0.22, pulse: { div: 2, gain: 0.75 }, arp: { div: 4, gain: 0.22 },
        hat: { gain: 0.14 }, thud: { on: [0, 2], gain: 0.85 },
        sections: {
            A: {
                chords: [C_, G_, Am, F_],
                melody: [
                    'G4:.5 A4:.5 C5:1 B4:1 G4:1',
                    'A4:.5 C5:.5 D5:1 C5:1.5 -:.5',
                    'E5:.5 D5:.5 C5:1 A4:1 G4:1',
                    'F4:.5 G4:.5 A4:1.5 C5:1 -:.5',
                ],
            },
            B: {
                chords: [F_, G_, Em, Am],
                parts: { hat: { gain: 0.18 } },
                melody: [
                    'C5:.5 D5:.5 E5:1 F5:1 E5:1',
                    'D5:.5 E5:.5 F5:1 G5:2',
                    'E5:1 D5:.5 C5:.5 B4:2',
                    'A4:.5 C5:.5 E5:1 A5:2',
                ],
            },
        },
    }),

    /* Homepage PM — the arcade one. ⛔ `tight` is Brendon's call: he heard
       both and kept the CLIPPED backing. Never "improve" it to ring. */
    homePm: compose({
        bpm: 138, form: ['A', 'A', 'B', 'A', 'A', 'B', 'B', 'A'],
        tight: true,
        pulse: { div: 2, gain: 0.95 }, arp: { div: 4, gain: 0.30 },
        hat: { gain: 0.22 }, thud: { on: [0, 2], gain: 1.0 },
        lead: { partials: SINE, gain: 0.55, wobble: 7, tail: 5 },
        sections: {
            A: {
                chords: [C_, Am, F_, G_],
                melody: [
                    'C5:.5 E5:.5 G5:.5 E5:.5 C5:.5 E5:.5 G5:1',
                    'A4:.5 C5:.5 E5:.5 C5:.5 A4:1 -:1',
                    'F4:.5 A4:.5 C5:.5 A4:.5 F4:1 -:1',
                    'G4:.5 B4:.5 D5:.5 B4:.5 G4:1 D5:1',
                ],
            },
            B: {
                chords: [Am, F_, C_, G_],
                parts: { pad: 0.16 },
                melody: [
                    'E5:.5 A5:.5 C6:.5 A5:.5 E5:1 -:1',
                    'F5:.5 A5:.5 C6:.5 A5:.5 F5:1 -:1',
                    'G5:.5 C6:.5 E6:.5 C6:.5 G5:1 -:1',
                    'D5:.5 G5:.5 B5:.5 D6:.5 G5:2',
                ],
            },
        },
    }),

    /* Output Page — browsing art IS the platform, so this moves. ⛔ NO TUNE,
       on purpose: a melody is the thing an ear locks onto, and it drags
       attention off the artwork. The energy is all in the groove. */
    output: compose({
        bpm: 112, form: ['A', 'A', 'B', 'A', 'B', 'A'],
        pad: 0.18, bass: { gain: 0.55 },
        arp: { div: 4, gain: 0.24, oct: 1, partials: SOFT, soft: true },
        hat: { gain: 0.08 }, thud: { on: [0, 2], gain: 0.45 },
        sections: {
            A: {
                chords: [C_, Em, F_, G_],
                bass: [
                    'C2:1 G1:.5 C2:.5 E2:1 G2:1',
                    'E2:1 B1:.5 E2:.5 G2:1 B2:1',
                    'F1:1 C2:.5 F2:.5 A2:1 C3:1',
                    'G1:1 D2:.5 G2:.5 B2:1 D3:1',
                ],
                melody: REST4,
            },
            B: {
                chords: [Am, F_, C_, G_],
                bass: [
                    'A1:1 E2:.5 A2:.5 C3:1 E3:1',
                    'F1:1 C2:.5 F2:.5 A2:1 C3:1',
                    'C2:1 G1:.5 C2:.5 E2:1 G2:1',
                    'G1:1 D2:.5 G2:.5 D2:1 B1:1',
                ],
                melody: REST4,
            },
        },
    }),

    /* Profile — warm, swung, lazy. */
    profile: compose({
        bpm: 84, swing: 0.24, form: ['A', 'A', 'B', 'A'],
        pad: 0.20, pulse: { div: 2, gain: 0.58 }, arp: { div: 4, gain: 0.18 },
        hat: { gain: 0.16 }, thud: { on: [0, 2], gain: 0.70 },
        lead: { partials: SINE, gain: 0.62, wobble: 6, tail: 3.4 },
        sections: {
            A: {
                chords: [F_, F_, Bb, C_],
                melody: [
                    'C5:.5 A4:.5 F4:1 G4:.5 A4:.5 C5:1',
                    'A4:.5 G4:.5 F4:2 -:1',
                    'D5:.5 C5:.5 A#4:1 D5:1 F5:1',
                    'E5:.5 D5:.5 C5:1 A4:2',
                ],
            },
            B: {
                chords: [Dm, Bb, C_, F_],
                melody: [
                    'A4:.5 D5:.5 F5:1 E5:.5 D5:.5 C5:1',
                    'D5:.5 F5:.5 A5:2 -:1',
                    'G4:.5 C5:.5 E5:1 G5:1 E5:1',
                    'C5:.5 A4:.5 F4:2 -:1',
                ],
            },
        },
    }),

    /* Artist AM — major, light on its feet. */
    artistAm: compose({
        bpm: 88, form: ['A', 'A', 'B', 'A', 'B'],
        pad: 0.20, pulse: { div: 1, gain: 0.45 }, arp: { div: 2, gain: 0.20 },
        thud: { on: [0], gain: 0.50 },
        lead: { partials: BELL, gain: 0.55, wobble: 3, tail: 2.8 },
        sections: {
            A: {
                chords: [D_, Bm7, G_, A_maj],
                melody: [
                    'F#5:1 A5:1 D5:2',
                    'D5:1 F#5:.5 E5:.5 B4:2',
                    'B4:1 D5:1 G5:2',
                    'A5:1 F#5:1 E5:2',
                ],
            },
            B: {
                chords: [G_, D_, Em7, A_maj],
                melody: [
                    'B4:.5 D5:.5 G5:1 F#5:2',
                    'A4:.5 D5:.5 F#5:1 A5:2',
                    'G5:1 E5:1 B4:2',
                    'C#5:1 E5:1 A5:2',
                ],
            },
        },
    }),

    /* Artist PM — slow and reflective, lots of air. */
    artistPm: compose({
        bpm: 60, form: ['A', 'A', 'B', 'A', 'B', 'A', 'A'],
        pad: 0.34, arp: { div: 2, gain: 0.16 },
        lead: { partials: GLASS, gain: 0.60, wobble: 2, shimmer: true, tail: 1.6, attack: 0.03 },
        sections: {
            A: { chords: [Am7, Fmaj7], melody: ['E5:1.5 C5:1 A4:1.5', 'C5:2 A4:2'] },
            B: { chords: [Dm7, Em7], melody: ['F5:1.5 D5:1 A4:1.5', 'G5:2 E5:2'] },
        },
    }),

    /* Busy Mint — a mint isn't a song, it's twenty seconds of waiting on
       something you want. Bare ticking, nothing else.
       ⛔ NOTHING but the tick, in EVERY section (Brendon, 2026-07-31 — the
       middle section once brought in a pad and an arpeggio and it landed as
       music awkwardly pasted in). The only thing that changes between
       sections is the PITCH the tick sits on. */
    busyMint: compose({
        bpm: 128, form: ['A', 'A', 'B', 'A', 'A', 'B', 'B', 'A'],
        tight: true,
        pulse: { div: 1, gain: 0.90 }, hat: { gain: 0.22 }, thud: { on: [0], gain: 0.70 },
        sections: {
            A: { chords: [Am, Am, Am, E_], melody: REST4 },
            B: { chords: [F_, G_, Am, E_], melody: REST4 },
        },
    }),

    /* Sold Out — calm and resolved, the party's over. */
    soldOut: compose({
        bpm: 72, form: ['A', 'A', 'B', 'A'],
        pad: 0.34, arp: { div: 2, gain: 0.18 },
        lead: { partials: GLASS, gain: 0.72, wobble: 3, shimmer: true, tail: 1.8, attack: 0.02 },
        sections: {
            A: {
                chords: [C_, Am, F_, C_],
                melody: ['G4:2 E5:2', 'C5:2 A4:2', 'F4:2 A4:2', 'G4:2 C5:2'],
            },
            B: {
                chords: [F_, C_, Dm, G_],
                melody: ['A4:2 C5:2', 'E5:2 G4:2', 'D5:2 F5:2', 'B4:2 D5:2'],
            },
        },
    }),

    /* Depanneur — the corner-shop toy machine: a bouncy little jingle with a
       clicky backing, the sound of standing in front of a capsule machine
       deciding to spend one more coin (Brendon, 2026-07-31). */
    depanneur: compose({
        bpm: 124, form: ['A', 'A', 'B', 'A', 'B', 'A'],
        tight: true,
        pad: 0.14, pulse: { div: 2, gain: 0.70 }, arp: { div: 4, gain: 0.26 },
        hat: { gain: 0.16 }, thud: { on: [0, 2], gain: 0.80 },
        lead: { partials: BELL, gain: 0.58, wobble: 5, tail: 3.2 },
        sections: {
            A: {
                chords: [C_, Am, Dm, G_],
                melody: [
                    'G4:.5 C5:.5 E5:1 D5:.5 C5:.5 G4:1',
                    'A4:.5 C5:.5 E5:1 C5:1.5 -:.5',
                    'F4:.5 A4:.5 D5:1 F5:1 D5:1',
                    'D5:.5 B4:.5 G4:1 B4:1 D5:1',
                ],
            },
            B: {
                chords: [F_, G_, C_, Am],
                parts: { arp: { div: 4, gain: 0.32 } },
                melody: [
                    'C5:.5 F5:.5 A5:1 F5:1 C5:1',
                    'D5:.5 G5:.5 B5:1 G5:1 D5:1',
                    'E5:.5 G5:.5 C6:1.5 G5:1 -:.5',
                    'A5:.5 E5:.5 C5:1 A4:2',
                ],
            },
        },
    }),

    /* Sticker Store — the shop floor: bright, walking, cheerful, the sound of
       flipping through sheets you might buy. */
    stickerStore: compose({
        bpm: 116, swing: 0.12, form: ['A', 'A', 'B', 'A', 'B', 'A'],
        pad: 0.16, bass: { gain: 0.62 }, arp: { div: 4, gain: 0.20, partials: SOFT, soft: true },
        hat: { gain: 0.14 }, thud: { on: [0, 2], gain: 0.62 },
        lead: { partials: SINE, gain: 0.56, wobble: 4, tail: 3.0 },
        sections: {
            A: {
                chords: [C_, Am7, Dm7, G_],
                bass: [
                    'C2:1 E2:1 G2:1 E2:1',
                    'A1:1 C2:1 E2:1 C2:1',
                    'D2:1 F2:1 A2:1 F2:1',
                    'G1:1 B1:1 D2:1 G2:1',
                ],
                melody: [
                    'E5:.5 G5:.5 C6:1 B5:1 G5:1',
                    'A5:.5 G5:.5 E5:1.5 C5:1 -:.5',
                    'F5:.5 A5:.5 D6:1 C6:1 A5:1',
                    'B5:.5 G5:.5 D5:1.5 G5:1 -:.5',
                ],
            },
            B: {
                chords: [Fmaj7, Em7, Dm7, G_],
                bass: [
                    'F1:1 A1:1 C2:1 A1:1',
                    'E2:1 G2:1 B2:1 G2:1',
                    'D2:1 A2:1 C3:1 A2:1',
                    'G1:1 D2:1 G2:1 B2:1',
                ],
                melody: [
                    'A5:1 C6:1 F5:2',
                    'G5:1 B5:1 E5:2',
                    'F5:.5 A5:.5 C6:1 A5:2',
                    'D5:.5 G5:.5 B5:1 D6:2',
                ],
            },
        },
    }),

    /* Gnome Wallet — under the hill: a slow minor waltz, earthy and a little
       secretive. Three beats to the bar, which nothing else in the set has. */
    gnomeWallet: compose({
        bpm: 96, beats: 3, form: ['A', 'A', 'B', 'A', 'B', 'A'],
        pad: 0.26, arp: { div: 2, gain: 0.16, partials: SOFT, soft: true },
        thud: { on: [0], gain: 0.55 },
        lead: { partials: GLASS, gain: 0.58, wobble: 3, shimmer: true, tail: 2.2, attack: 0.02 },
        sections: {
            A: {
                chords: [Am, Dm, Em7, Am],
                melody: [
                    'A4:1 C5:1 E5:1',
                    'D5:1.5 A4:.5 F4:1',
                    'E5:1 B4:1 G4:1',
                    'A4:2 E4:1',
                ],
            },
            B: {
                chords: [F_, C_, Dm, E_],
                melody: [
                    'F5:1 C5:1 A4:1',
                    'E5:1.5 G4:.5 C5:1',
                    'D5:1 F5:1 A5:1',
                    'G#4:1 B4:1 E5:1',
                ],
            },
        },
    }),
};
