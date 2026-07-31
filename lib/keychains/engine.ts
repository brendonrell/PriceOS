/*
 * PD Keychains — the app-side twin of the on-chain artist
 * (pd-contracts: PDKeychainRenderer.sol + PDKeychainParts.sol, locked with
 * Brendon 2026-07-27).
 *
 * THE CONTRACT IS THE ARTIST — this file is a byte-faithful port of its
 * drawing code so the test-phase Depanneur (sim-ETH capsule machine) shows
 * EXACTLY the charms the chain will mint: same gene roll (keccak over the
 * same packed bytes), same paths, same palettes, same chain/finish ladders,
 * same swing + blink CSS. When the contracts deploy, tokenURI takes over and
 * this engine keeps powering the mini/preview surfaces.
 *
 * Do NOT "improve" the art here — changes belong in the contract first.
 */

import { keccak256, encodePacked } from 'viem';

const INK = '#131318';

// ─── palettes (name · body · accent) — BODY_RGB / ACC_RGB verbatim ───────

export const PALETTE_NAMES = [
    'BUBBLEGUM', 'BLUEBERRY', 'ACID', 'SLIME', 'VAPOR', 'CREAMSICLE',
    'MALLRAT', 'MIDNIGHT', 'CHERRY', 'GRAPE', 'SEAFOAM', 'STATIC',
] as const;

const BODY_RGB = [
    0xF2D75C, 0x5C6FB3, 0xE93EFF, 0x8A4FD1, 0x7FE8D8, 0xFF8A3D,
    0xF25CA2, 0x9BE8FF, 0xE84A5E, 0xC9F25C, 0x3BC69F, 0x454545,
];
const ACC_RGB = [
    0x5C6FB3, 0xF5A9C6, 0xF2F2F2, 0x303030, 0xF79AC0, 0x45B8E8,
    0xFFE86B, 0xFF7BD5, 0x4A4A4A, 0xFF9DE0, 0xF2698A, 0xE93EFF,
];

function hex6(c: number): string {
    return '#' + c.toString(16).toUpperCase().padStart(6, '0');
}

/** The miniplayer color-mix: lerp each channel toward white/black (verbatim,
 *  including the +50 integer rounding). */
function mix(c: number, toWhite: boolean, pct: number): number {
    const t = toWhite ? 255 : 0;
    const ch = (v: number) => Math.floor((v * (100 - pct) + t * pct + 50) / 100);
    return (ch((c >> 16) & 0xff) << 16) | (ch((c >> 8) & 0xff) << 8) | ch(c & 0xff);
}

// ─── the gene roll — keccak over the same packed bytes as the contract ────

export interface Genes {
    shape: number;
    palette: number;
    material: number; // 0 plastic · 1 rubber
    eyes: number;
    mouth: number;
    brows: number;
    pose: number; // 0 PEACE 1 WAVE 2 CHEER 3 HIPS 4 CHILL
    acc: number; // 0 NONE 1 BOW 2 HALO 3 CROWN 4 ANTENNA 5 WINGS
    shoe: number; // 0 BOOT 1 SNEAKER
    iris: number; // 0 INK · 1 BLUE 2 GREEN 3 AMBER 4 VIOLET 5 RED (pupil styles only)
    sock: boolean;
    blush: boolean;
    raiseLeft: boolean;
    restHip: boolean;
}

/** YIN/YANG — which slot the coin dropped in. 0 = YIN, 1 = YANG. */
export type Coin = 0 | 1;

function d(seed: `0x${string}`, salt: number, mod: bigint): number {
    return Number(BigInt(keccak256(encodePacked(['bytes32', 'uint8'], [seed, salt]))) % mod);
}

/* ── THE RARITY LADDER (Brendon, 2026-07-29) ──────────────────────────────
   THE ART BELONGS TO THE CHARM, NOT THE KEEPER. Colour, finish and chain
   metal used to be repainted live off the keeper's rank/streak, so an entire
   rack came out one colour (Brendon: "they all come out gold, it's boring").
   They now roll PER CHARM off its own seed on a common→rare ladder, and the
   keeper's streak/rank buy LUCK instead — a tilt on those odds, banked into
   the charm at the crank and kept forever. */

/** The keeper's odds tier at the moment of the crank. */
export type Luck = 0 | 1 | 2 | 3;

/** Streak + rank buy better odds — the best of the two, never a repaint. */
export function luckFor(streak: number, rank: number): Luck {
    const s = streak >= 100 ? 3 : streak >= 30 ? 2 : streak >= 7 ? 1 : 0;
    const r = rank >= 9 ? 3 : rank >= 6 ? 2 : rank >= 3 ? 1 : 0;
    return (s > r ? s : r) as Luck;
}

/* COMMON · UNCOMMON · RARE · ULTRA cuts per luck tier, out of 1000.
   luck 0 → 60/25/11.5/3.5   ·   luck 3 → 39/34/17/10 */
const TIER_CUTS: number[][] = [
    [600, 850, 965],
    [540, 815, 950],
    [470, 775, 930],
    [390, 730, 900],
];

/** The live chance of a RARE / an ULTRA at this odds tier, in percent —
 *  read straight off the same cuts the roll uses, so the readout can state
 *  the real numbers instead of a word (Brendon, 2026-07-30). */
export function oddsFor(luck: Luck): { rare: number; ultra: number } {
    const c = TIER_CUTS[luck] ?? TIER_CUTS[0]!;
    return { rare: (c[2]! - c[1]!) / 10, ultra: (1000 - c[2]!) / 10 };
}

function tierRoll(seed: `0x${string}`, salt: number, luck: Luck): number {
    const x = d(seed, salt, 1000n);
    const c = TIER_CUTS[luck] ?? TIER_CUTS[0]!;
    return x < c[0]! ? 0 : x < c[1]! ? 1 : x < c[2]! ? 2 : 3;
}

/** Pick one of a tier's members off a 100-weight table. */
function weighted(seed: `0x${string}`, salt: number, pool: number[], w: number[]): number {
    const x = d(seed, salt, 100n);
    let run = 0;
    for (let i = 0; i < pool.length; ++i) {
        run += w[i] ?? 0;
        if (x < run) return pool[i]!;
    }
    return pool[pool.length - 1]!;
}

/* THE COLOUR TIERS — every colour stays rollable on both coins (the YIN/YANG
   law); the coin only steers WHICH member of the rolled tier lands. */
const PAL_TIERS: number[][] = [
    [0, 1, 6, 5],   // COMMON  — BUBBLEGUM BLUEBERRY MALLRAT CREAMSICLE
    [4, 9, 8, 10],  // UNCOMMON — VAPOR GRAPE CHERRY SEAFOAM
    [3, 7],         // RARE    — SLIME MIDNIGHT
    [2, 11],        // ULTRA   — ACID STATIC
];
const PAL_YIN: number[][] = [[28, 20, 34, 18], [34, 18, 22, 26], [42, 58], [72, 28]];
const PAL_YANG: number[][] = [[24, 30, 14, 32], [18, 32, 32, 18], [62, 38], [34, 66]];

function paletteFor(seed: `0x${string}`, coin: Coin, luck: Luck): number {
    const t = tierRoll(seed, 20, luck);
    return weighted(seed, 21, PAL_TIERS[t]!, (coin === 0 ? PAL_YIN : PAL_YANG)[t]!);
}

function eyesFor(seed: `0x${string}`, coin: Coin): number {
    const x = d(seed, 4, 100n);
    if (coin === 0) {
        // YIN (girls) — ROUND22 SLEEPY14 WINK12 LASHES10 TEARY8 HEARTS8 GOOGLY6 SPIRAL4 3D4 SUNGLASSES3 STARRY3 DIZZY2 XX2 VISOR1 LASERS1
        return x < 22 ? 1 : x < 36 ? 3 : x < 48 ? 2 : x < 58 ? 13 : x < 66 ? 14 : x < 74 ? 5 : x < 80 ? 0
            : x < 84 ? 6 : x < 88 ? 12 : x < 91 ? 11 : x < 94 ? 4 : x < 96 ? 9 : x < 98 ? 7 : x < 99 ? 8 : 10;
    }
    // YANG (boys) — GOOGLY22 STARRY12 ROUND12 DIZZY9 SUNGLASSES8 WINK7 SPIRAL6 HEARTS5 3D5 XX5 LASERS4 TEARY2 LASHES1 SLEEPY1 VISOR1
    return x < 22 ? 0 : x < 34 ? 4 : x < 46 ? 1 : x < 55 ? 9 : x < 63 ? 11 : x < 70 ? 2 : x < 76 ? 6
        : x < 81 ? 5 : x < 86 ? 12 : x < 91 ? 7 : x < 95 ? 10 : x < 97 ? 14 : x < 98 ? 13 : x < 99 ? 3 : 8;
}

function accFor(seed: `0x${string}`, coin: Coin): number {
    const x = d(seed, 8, 170n);
    if (coin === 0) {
        // YIN (girls) — BOWS lead: NONE88 BOW34 HALO22 WINGS14 ANTENNA8 CROWN4
        return x < 88 ? 0 : x < 122 ? 1 : x < 144 ? 2 : x < 158 ? 5 : x < 166 ? 4 : 3;
    }
    // YANG (boys) — crowned heads: NONE84 CROWN30 ANTENNA26 WINGS12 HALO12 BOW6
    return x < 84 ? 0 : x < 114 ? 3 : x < 140 ? 4 : x < 152 ? 5 : x < 164 ? 2 : 1;
}

export function genes(seed: `0x${string}`, coin: Coin = 0, luck: Luck = 0): Genes {
    let x = d(seed, 1, 100n); // HEART16 STAR12 FLOWER12 GHOST10 CLOVER10 BOLT8 TAG8 MOON7 GEM6 PLANET5 SPARK4 ALIEN2 — UNIVERSAL, both coins
    const shape = x < 16 ? 0 : x < 28 ? 1 : x < 40 ? 2 : x < 50 ? 3 : x < 60 ? 4 : x < 68 ? 5 : x < 76 ? 6 : x < 83 ? 7 : x < 89 ? 8 : x < 94 ? 9 : x < 98 ? 10 : 11;
    const palette = paletteFor(seed, coin, luck);
    const material = d(seed, 3, 100n) < 70 ? 0 : 1;
    const eyes = eyesFor(seed, coin);
    x = d(seed, 5, 100n); // SMILE26 OPEN22 CAT13 O11 TONGUE11 FLAT8 FANG9
    const mouth = x < 26 ? 0 : x < 48 ? 1 : x < 61 ? 2 : x < 72 ? 3 : x < 83 ? 4 : x < 91 ? 5 : 6;
    x = d(seed, 6, 100n); // NONE66 RAISED20 BENT14
    const brows = x < 66 ? 0 : x < 86 ? 1 : 2;
    x = d(seed, 7, 100n); // PEACE40 WAVE18 CHEER12 HIPS15 CHILL15
    const pose = x < 40 ? 0 : x < 58 ? 1 : x < 70 ? 2 : x < 85 ? 3 : 4;
    const acc = accFor(seed, coin);
    // IRIS COLORS (salt 14, appended so every pre-round axis is untouched):
    // INK65 · BLUE7 GREEN7 AMBER7 VIOLET7 RED7 — worn only by pupil styles.
    x = d(seed, 14, 100n);
    let iris = x < 65 ? 0 : x < 72 ? 1 : x < 79 ? 2 : x < 86 ? 3 : x < 93 ? 4 : 5;
    if (!(eyes === 0 || eyes === 1 || eyes === 2 || eyes === 13 || eyes === 14)) iris = 0;
    return {
        shape, palette, material, eyes, mouth, brows, pose, acc, iris,
        shoe: d(seed, 9, 100n) < 50 ? 0 : 1,
        sock: d(seed, 10, 100n) < 35,
        blush: d(seed, 11, 100n) < 60,
        raiseLeft: d(seed, 12, 100n) < 50,
        restHip: d(seed, 13, 100n) < 50,
    };
}

// ─── shape geometry ──────────────────────────────────────────────────────

interface ShapeD {
    bailX: number; bailY: number;
    aLx: number; aLy: number; aRx: number; aRy: number;
    lLx: number; lLy: number; lRx: number; lRy: number;
    fx: number; fy: number;
    fs: number; // face scale, percent
    noLegs: boolean;
}

const SHAPE_D: ShapeD[] = [
    { bailX: 500, bailY: 448, aLx: 312, aLy: 555, aRx: 688, aRy: 555, lLx: 445, lLy: 770, lRx: 555, lRy: 770, fx: 500, fy: 545, fs: 100, noLegs: false }, // HEART
    { bailX: 500, bailY: 355, aLx: 352, aLy: 590, aRx: 648, aRy: 590, lLx: 430, lLy: 800, lRx: 570, lRy: 800, fx: 500, fy: 595, fs: 92, noLegs: false }, // STAR
    { bailX: 500, bailY: 365, aLx: 368, aLy: 668, aRx: 632, aRy: 668, lLx: 448, lLy: 795, lRx: 552, lRy: 795, fx: 500, fy: 585, fs: 82, noLegs: false }, // FLOWER
    { bailX: 500, bailY: 352, aLx: 332, aLy: 590, aRx: 668, aRy: 590, lLx: 0, lLy: 0, lRx: 0, lRy: 0, fx: 500, fy: 530, fs: 100, noLegs: true }, // GHOST
    { bailX: 500, bailY: 395, aLx: 305, aLy: 580, aRx: 695, aRy: 580, lLx: 448, lLy: 780, lRx: 552, lRy: 780, fx: 500, fy: 570, fs: 88, noLegs: false }, // CLOVER
    { bailX: 520, bailY: 338, aLx: 358, aLy: 470, aRx: 640, aRy: 452, lLx: 0, lLy: 0, lRx: 0, lRy: 0, fx: 478, fy: 478, fs: 80, noLegs: true }, // BOLT
    { bailX: 500, bailY: 435, aLx: 340, aLy: 600, aRx: 660, aRy: 600, lLx: 445, lLy: 785, lRx: 555, lRy: 785, fx: 500, fy: 610, fs: 90, noLegs: false }, // TAG
    { bailX: 500, bailY: 340, aLx: 338, aLy: 620, aRx: 618, aRy: 700, lLx: 455, lLy: 800, lRx: 560, lRy: 795, fx: 468, fy: 560, fs: 82, noLegs: false }, // MOON
    { bailX: 500, bailY: 402, aLx: 318, aLy: 540, aRx: 682, aRy: 540, lLx: 455, lLy: 745, lRx: 545, lRy: 745, fx: 500, fy: 560, fs: 84, noLegs: false }, // GEM
    { bailX: 500, bailY: 372, aLx: 310, aLy: 530, aRx: 690, aRy: 530, lLx: 450, lLy: 780, lRx: 550, lRy: 780, fx: 500, fy: 545, fs: 92, noLegs: false }, // PLANET
    { bailX: 500, bailY: 335, aLx: 368, aLy: 660, aRx: 632, aRy: 660, lLx: 455, lLy: 795, lRx: 545, lRy: 795, fx: 500, fy: 580, fs: 84, noLegs: false }, // SPARK
    { bailX: 500, bailY: 330, aLx: 340, aLy: 590, aRx: 660, aRy: 590, lLx: 455, lLy: 810, lRx: 545, lRy: 810, fx: 500, fy: 555, fs: 96, noLegs: false }, // ALIEN
];

/** The specular glint's per-shape home — FLOWER on the face disc, BOLT upper
 *  face (Brendon's placement round, 2026-07-27). */
function shineSpot(i: number): [number, number] {
    if (i === 2) return [425, 512];
    if (i === 5) return [443, 396];
    return [400, 452];
}

// ─── body silhouettes (PDKeychainShapes verbatim) ────────────────────────

const HEART_D = 'M 500 800 C 430 740 300 650 300 515 C 300 420 372 372 447 388 C 482 396 500 428 500 455 C 500 428 518 396 553 388 C 628 372 700 420 700 515 C 700 650 570 740 500 800 Z';
const STAR_D = 'M 484 372 Q 500 342 516 372 L 565 459 Q 581 488 614 495 L 712 514 Q 745 520 722 545 L 654 618 Q 631 643 635 676 L 648 775 Q 652 809 621 794 L 531 752 Q 500 738 469 752 L 379 794 Q 348 809 352 775 L 365 676 Q 369 643 346 618 L 278 545 Q 255 520 288 514 L 386 495 Q 419 488 435 459 Z';
const GHOST_D = 'M 320 610 C 320 430 390 345 500 345 C 610 345 680 430 680 610 L 680 770 C 680 792 655 796 640 780 C 625 764 615 764 600 780 C 585 796 565 796 550 780 C 535 764 525 764 510 780 C 495 796 475 796 460 780 C 445 764 435 764 420 780 C 405 796 380 792 380 770 L 380 720 C 380 700 320 710 320 610 Z';
const BOLT_D = 'M 545 330 L 415 330 C 402 330 392 337 388 350 L 330 570 C 326 585 336 598 352 598 L 428 598 L 378 806 C 372 830 398 842 412 824 L 668 520 C 680 505 672 484 652 484 L 560 484 L 652 366 C 664 350 654 330 634 330 Z';
const TAG_D = 'M 486 348 C 494 340 506 340 514 348 L 652 460 C 660 467 664 475 664 485 L 664 776 C 664 790 654 800 640 800 L 360 800 C 346 800 336 790 336 776 L 336 485 C 336 475 340 467 348 460 Z M 500 405 C 517 405 530 418 530 435 C 530 452 517 465 500 465 C 483 465 470 452 470 435 C 470 418 483 405 500 405 Z';
const MOON_D = 'M 560 330 C 430 330 330 435 330 575 C 330 715 430 820 560 820 C 610 820 650 806 678 786 C 692 776 686 762 668 764 C 608 760 545 668 545 575 C 545 482 608 390 668 386 C 686 388 692 374 678 364 C 650 344 610 330 560 330 Z';
const GEM_D = 'M 398 400 C 392 400 384 404 380 410 L 310 502 C 302 512 302 524 309 535 L 480 792 C 490 807 510 807 520 792 L 691 535 C 698 524 698 512 690 502 L 620 410 C 616 404 608 400 602 400 Z';
const SPARK_D = 'M 495 343 Q 500 328 505 343 L 549 481 Q 554 496 570 493 L 711 462 Q 727 459 716 471 L 619 578 Q 608 590 619 602 L 716 709 Q 727 721 711 718 L 570 687 Q 554 684 549 699 L 505 837 Q 500 852 495 837 L 451 699 Q 446 684 430 687 L 289 718 Q 273 721 284 709 L 381 602 Q 392 590 381 578 L 284 471 Q 273 459 289 462 L 430 493 Q 446 496 451 481 Z';
const ALIEN_D = 'M 500 845 C 466 845 424 798 400 718 C 362 598 336 468 366 388 C 394 316 444 300 500 300 C 556 300 606 316 634 388 C 664 468 638 598 600 718 C 576 798 534 845 500 845 Z';

function pathBody(dStr: string, fill: string): string {
    return `<path d="${dStr}" fill="${fill}" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>`;
}

function bodySvg(i: number, fill: string, accent: string): string {
    if (i === 0) return pathBody(HEART_D, fill);
    if (i === 1) return pathBody(STAR_D, fill);
    if (i === 2) {
        // FLOWER: six petals at 60-degree steps around the disc
        let petals = '';
        for (const ang of [0, 60, 120, 180, 240, 300]) {
            petals += `<ellipse cx="500" cy="405" rx="78" ry="135" fill="${fill}" stroke="${INK}" stroke-width="16" transform="rotate(${ang} 500 585)"/>`;
        }
        return `${petals}<circle cx="500" cy="585" r="138" fill="${fill}" stroke="${INK}" stroke-width="16"/>`;
    }
    if (i === 3) return pathBody(GHOST_D, fill);
    if (i === 4) {
        // CLOVER: stem + four leaves + seam cover
        let s = `<path d="M 500 690 C 490 745 470 775 440 800 C 505 788 520 788 560 800 C 528 770 512 745 508 690 Z" fill="${fill}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>`;
        const cs = [404, 494, 596, 494, 404, 660, 596, 660];
        for (let k = 0; k < 4; ++k) {
            s += `<circle cx="${cs[k * 2]}" cy="${cs[k * 2 + 1]}" r="108" fill="${fill}" stroke="${INK}" stroke-width="16"/>`;
        }
        return `${s}<circle cx="500" cy="577" r="120" fill="${fill}"/>`;
    }
    if (i === 5) return pathBody(BOLT_D, fill);
    if (i === 6) {
        return `<path d="${TAG_D}" fill="${fill}" fill-rule="evenodd" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/><circle cx="500" cy="435" r="30" fill="none" stroke="${INK}" stroke-width="12"/>`;
    }
    if (i === 7) return pathBody(MOON_D, fill);
    if (i === 8) {
        return pathBody(GEM_D, fill)
            + `<path d="M 388 408 L 448 508 L 552 508 L 612 408 M 316 516 L 448 508 M 684 516 L 552 508 M 448 508 L 500 796 L 552 508" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round" opacity="0.5"/>`;
    }
    if (i === 9) {
        return `<ellipse cx="500" cy="618" rx="318" ry="82" fill="none" stroke="${INK}" stroke-width="38"/>`
            + `<ellipse cx="500" cy="618" rx="318" ry="82" fill="none" stroke="${accent}" stroke-width="17"/>`
            + `<circle cx="500" cy="580" r="212" fill="${fill}" stroke="${INK}" stroke-width="16"/>`
            + `<path d="M 182 618 A 318 82 0 0 0 818 618" fill="none" stroke="${INK}" stroke-width="38"/>`
            + `<path d="M 182 618 A 318 82 0 0 0 818 618" fill="none" stroke="${accent}" stroke-width="17"/>`;
    }
    if (i === 10) return pathBody(SPARK_D, fill);
    return pathBody(ALIEN_D, fill);
}

function clipEl(i: number): string {
    if (i === 2) return '<circle cx="500" cy="585" r="310"/>';
    if (i === 4) return '<circle cx="500" cy="580" r="230"/>';
    if (i === 9) return '<circle cx="500" cy="580" r="212"/>';
    const dStr = i === 0 ? HEART_D
        : i === 1 ? STAR_D : i === 3 ? GHOST_D : i === 5 ? BOLT_D : i === 6 ? TAG_D : i === 7 ? MOON_D : i === 8 ? GEM_D : i === 10 ? SPARK_D : ALIEN_D;
    return `<path d="${dStr}"/>`;
}

// ─── faces (PDKeychainFaces verbatim) ────────────────────────────────────

function eyeWhite(x: number, pct: number): string {
    return `<ellipse cx="${x}" cy="0" rx="${Math.floor((54 * pct) / 100)}" ry="${Math.floor((62 * pct) / 100)}" fill="#FFFFFF" stroke="${INK}" stroke-width="10"/>`;
}

/* IRIS COLORS (the eyes round, 2026-07-28) — contract verbatim. */
const IRIS_HEX = ['#3B7BFF', '#2FA84F', '#E8A13C', '#8A5CF6', '#E0483E'] as const;

function pupil(x: number, y: number, r: number, iris: number): string {
    if (iris === 0) return `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${IRIS_HEX[iris - 1]}"/>`
        + `<circle cx="${x}" cy="${y}" r="${Math.floor((r * 55) / 100)}" fill="${INK}"/>`;
}

function eyesSvg(style: number, iris: number, body: string, accent: string): string {
    if (style === 0) {
        // GOOGLY — the signature: overlapping whites, one bigger, shared gaze
        return eyeWhite(-58, 100) + eyeWhite(64, 114)
            + pupil(-44, 10, 25, iris) + pupil(80, 10, 28, iris)
            + '<circle cx="-36" cy="2" r="8" fill="#FFFFFF"/><circle cx="89" cy="2" r="9" fill="#FFFFFF"/>';
    }
    if (style === 1) {
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + pupil(-56, 8, 30, iris) + pupil(68, 8, 30, iris)
            + '<circle cx="-66" cy="-4" r="10" fill="#FFFFFF"/><circle cx="58" cy="-4" r="10" fill="#FFFFFF"/>';
    }
    if (style === 2) {
        return eyeWhite(-62, 100)
            + pupil(-56, 8, 30, iris)
            + '<circle cx="-66" cy="-4" r="10" fill="#FFFFFF"/>'
            + `<path d="M 22 6 Q 62 34 102 6" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`;
    }
    if (style === 3) {
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + `<circle cx="-58" cy="18" r="26" fill="${INK}"/><circle cx="66" cy="18" r="26" fill="${INK}"/>`
            + `<path d="M -116 -18 A 54 62 0 0 1 -8 -18 L -116 -18 M 8 -18 A 54 62 0 0 1 116 -18 L 8 -18" fill="${body}" stroke="${INK}" stroke-width="10"/>`;
    }
    if (style === 4) {
        const star = 'd="M 0 -16 L 4 -4 L 16 0 L 4 4 L 0 16 L -4 4 L -16 0 L -4 -4 Z"';
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + `<path transform="translate(-60 6) scale(2.1)" ${star} fill="${INK}"/>`
            + `<path transform="translate(64 6) scale(2.1)" ${star} fill="${INK}"/>`;
    }
    if (style === 5) {
        const h = 'd="M 0 55 C -18 38 -62 8 -62 -30 C -62 -62 -30 -72 -8 -58 C -3 -55 0 -50 0 -45 C 0 -50 3 -55 8 -58 C 30 -72 62 -62 62 -30 C 62 8 18 38 0 55 Z" fill="#E8506B"';
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + `<path transform="translate(-60 8) scale(0.34)" ${h}/>`
            + `<path transform="translate(64 8) scale(0.34)" ${h}/>`;
    }
    if (style === 6) {
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + `<g fill="none" stroke="${INK}" stroke-width="9"><circle cx="-58" cy="4" r="30"/><circle cx="-52" cy="4" r="17"/><circle cx="-48" cy="4" r="5"/><circle cx="66" cy="4" r="30"/><circle cx="60" cy="4" r="17"/><circle cx="56" cy="4" r="5"/></g>`;
    }
    if (style === 7) {
        return `<g stroke="${INK}" stroke-width="16" stroke-linecap="round"><path d="M -92 -30 L -32 30 M -32 -30 L -92 30"/><path d="M 32 -30 L 92 30 M 92 -30 L 32 30"/></g>`;
    }
    if (style === 8) {
        return `<rect x="-124" y="-34" width="248" height="68" rx="26" fill="${INK}"/>`
            + `<rect x="-96" y="-12" width="52" height="24" rx="12" fill="${accent}"/><rect x="-28" y="-12" width="26" height="24" rx="12" fill="${accent}" opacity="0.55"/>`;
    }
    // ─── the eyes round (Brendon's ask, built 2026-07-28) — contract verbatim ───
    if (style === 9) {
        // DIZZY — true swirls (SPIRAL keeps its concentric rings)
        const swirl = 'd="M 0 0 m -22 0 a 22 22 0 1 1 44 0 a 17 17 0 1 1 -34 0 a 12 12 0 1 1 24 0 a 6 6 0 1 1 -12 0" fill="none" stroke-linecap="round"';
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + `<g stroke="${INK}" stroke-width="9">`
            + `<path transform="translate(-58 4)" ${swirl}/>`
            + `<path transform="translate(66 4) scale(-1 1)" ${swirl}/></g>`;
    }
    if (style === 10) {
        // LASERS — no whites: molten red orbs, hot cores, short flares
        const orb = '<circle r="40" fill="#FF3B30" opacity="0.35"/><circle r="28" fill="#FF3B30"/><circle r="13" fill="#FFD9D6"/>';
        const flare = '<g stroke="#FF3B30" stroke-width="8" stroke-linecap="round"><path d="M -34 -34 L -50 -50"/><path d="M 34 -34 L 50 -50"/><path d="M -34 34 L -50 50"/><path d="M 34 34 L 50 50"/></g>';
        return `<g transform="translate(-58 2)">${orb}${flare}</g><g transform="translate(64 2)">${orb}${flare}</g>`;
    }
    if (style === 11) {
        // SUNGLASSES — ink shades, gleam on each lens
        return `<path d="M -140 -24 L -112 -12 M 140 -24 L 112 -12" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`
            + `<path d="M -18 -12 Q 0 -26 18 -12" fill="none" stroke="${INK}" stroke-width="12"/>`
            + `<rect x="-112" y="-38" width="94" height="76" rx="22" fill="${INK}"/><rect x="18" y="-38" width="94" height="76" rx="22" fill="${INK}"/>`
            + '<path d="M -96 -20 L -66 12 M 34 -20 L 64 12" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.45"/>';
    }
    if (style === 12) {
        // 3D GLASSES — the movie pair: white frame, red left, cyan right
        return `<path d="M -142 -26 L -116 -14 M 142 -26 L 116 -14" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>`
            + `<rect x="-20" y="-16" width="40" height="18" fill="#FFFFFF" stroke="${INK}" stroke-width="9"/>`
            + `<rect x="-116" y="-40" width="100" height="80" rx="10" fill="#FFFFFF" stroke="${INK}" stroke-width="10"/><rect x="16" y="-40" width="100" height="80" rx="10" fill="#FFFFFF" stroke="${INK}" stroke-width="10"/>`
            + '<rect x="-102" y="-26" width="72" height="52" rx="5" fill="#E0483E" opacity="0.85"/>'
            + '<rect x="30" y="-26" width="72" height="52" rx="5" fill="#39C2E8" opacity="0.85"/>';
    }
    if (style === 13) {
        // LASHES — round eyes that flutter; pupils wear the iris
        const lash = `<g stroke="${INK}" stroke-width="9" stroke-linecap="round"><path d="M -100 -46 L -118 -64"/><path d="M -62 -60 L -66 -84"/><path d="M -26 -46 L -10 -64"/><path d="M 24 -46 L 8 -64"/><path d="M 62 -60 L 66 -84"/><path d="M 98 -46 L 116 -64"/></g>`;
        return eyeWhite(-62, 100) + eyeWhite(62, 100)
            + pupil(-56, 8, 28, iris) + pupil(68, 8, 28, iris)
            + '<circle cx="-66" cy="-4" r="9" fill="#FFFFFF"/><circle cx="58" cy="-4" r="9" fill="#FFFFFF"/>' + lash;
    }
    // 14 TEARY — welling lower lids, one drop falling on the right
    return eyeWhite(-62, 100) + eyeWhite(62, 100)
        + pupil(-56, 2, 27, iris) + pupil(68, 2, 27, iris)
        + '<circle cx="-66" cy="-8" r="9" fill="#FFFFFF"/><circle cx="58" cy="-8" r="9" fill="#FFFFFF"/>'
        + '<path d="M -104 34 Q -62 50 -20 34" fill="none" stroke="#7FC9FF" stroke-width="10" stroke-linecap="round"/>'
        + '<path d="M 20 34 Q 62 50 104 34" fill="none" stroke="#7FC9FF" stroke-width="10" stroke-linecap="round"/>'
        + `<path d="M 64 58 C 56 76 56 86 64 91 C 72 86 72 76 64 58 Z" fill="#7FC9FF" stroke="${INK}" stroke-width="7"/>`;
}

function mouthSvg(m: number): string {
    if (m === 0) {
        return `<path d="M -52 78 Q 0 124 52 78" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`;
    }
    if (m === 1) {
        return `<path d="M -58 66 Q 0 152 58 66 Q 0 96 -58 66 Z" fill="${INK}"/><path d="M -30 72 L -8 72 L -8 88 Q -8 94 -14 94 L -24 94 Q -30 94 -30 88 Z M 8 72 L 30 72 L 30 88 Q 30 94 24 94 L 14 94 Q 8 94 8 88 Z" fill="#FFFFFF"/>`;
    }
    if (m === 2) {
        return `<path d="M -58 78 Q -29 106 0 78 Q 29 106 58 78" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`;
    }
    if (m === 3) return `<ellipse cx="0" cy="88" rx="24" ry="30" fill="${INK}"/>`;
    if (m === 4) {
        return `<path d="M -52 74 Q 0 116 52 74" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M -6 92 Q -4 130 16 128 Q 38 126 30 88 Q 12 98 -6 92 Z" fill="#F0879E" stroke="${INK}" stroke-width="9"/>`;
    }
    if (m === 5) {
        return `<path d="M -38 88 L 38 88" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`;
    }
    return `<path d="M -52 78 Q 0 124 52 78" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M 24 86 L 42 84 L 34 112 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
}

function browsSvg(b: number): string {
    if (b === 0) return '';
    if (b === 1) {
        return `<path d="M -96 -76 Q -62 -96 -28 -76 M 28 -76 Q 62 -96 96 -76" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>`;
    }
    return `<path d="M -96 -70 Q -60 -92 -26 -80 M 26 -80 Q 60 -92 96 -70" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>`;
}

/** Glove art is a RIGHT hand (thumb on the INSIDE); left hands mirror. */
function gloveSvg(kind: number): string {
    if (kind === 0) {
        // OPEN wave: four fingers fanned tight + thumb low
        return `<g fill="#FFFFFF" stroke="${INK}" stroke-width="9" stroke-linejoin="round">`
            + '<rect x="-13" y="-76" width="25" height="82" rx="12" transform="rotate(-27)"/>'
            + '<rect x="-13" y="-82" width="25" height="88" rx="12" transform="rotate(-9)"/>'
            + '<rect x="-13" y="-82" width="25" height="88" rx="12" transform="rotate(9)"/>'
            + '<rect x="-13" y="-76" width="25" height="82" rx="12" transform="rotate(27)"/>'
            + '<rect x="-12" y="-58" width="24" height="60" rx="12" transform="rotate(-62)"/>'
            + '<circle cx="0" cy="4" r="36"/></g>';
    }
    if (kind === 1) {
        // PEACE: splayed V, thumb folded horizontal across the palm middle
        return `<g fill="#FFFFFF" stroke="${INK}" stroke-width="9" stroke-linejoin="round">`
            + '<rect x="-28" y="-94" width="26" height="102" rx="13" transform="rotate(-7)"/>'
            + '<rect x="2" y="-94" width="26" height="102" rx="13" transform="rotate(7)"/>'
            + '<circle cx="0" cy="10" r="36"/>'
            + '<rect x="8" y="-62" width="24" height="48" rx="12" transform="rotate(30)"/>'
            + '<rect x="19" y="-50" width="23" height="44" rx="11" transform="rotate(47)"/>'
            + '<g transform="scale(-1 1)"><rect x="-13" y="12" width="27" height="62" rx="13" transform="translate(-24 -16) rotate(-64)"/></g></g>';
    }
    return `<g fill="#FFFFFF" stroke="${INK}" stroke-width="9"><circle cx="0" cy="0" r="38"/><path d="M -22 -14 Q -12 -22 -2 -14 M 2 -14 Q 12 -22 22 -14" fill="none" stroke-linecap="round"/></g>`;
}

function shoeSvg(kind: number, accent: string): string {
    if (kind === 1) {
        return `<g stroke="${INK}" stroke-linejoin="round"><path d="M -34 -34 L 6 -34 Q 58 -34 66 -6 Q 70 8 54 8 L -34 8 Z" fill="${accent}" stroke-width="10"/><path d="M 20 -32 Q 44 -22 54 -4" fill="none" stroke-width="7"/><path d="M -34 8 L 54 8 Q 66 8 66 2 L 66 16 Q 66 24 54 24 L -34 24 Z" fill="#FFFFFF" stroke-width="8"/></g>`;
    }
    return `<g stroke="${INK}" stroke-linejoin="round"><path d="M -36 -40 L 4 -40 Q 60 -40 68 -8 Q 72 10 52 10 L -36 10 Z" fill="#FFFFFF" stroke-width="10"/><path d="M -36 -26 L 10 -26" stroke-width="7"/><path d="M -40 10 L 60 10 Q 72 10 70 22 L -40 22 Z" fill="#FFFFFF" stroke-width="8"/></g>`;
}

function wing(ax: number, ay: number, flip: boolean): string {
    return `<g transform="translate(${ax} ${ay - 35}) scale(${flip ? '-1' : '1'} 1)" fill="#FFFFFF" stroke="${INK}" stroke-width="11" stroke-linejoin="round"><path d="M 0 30 Q 60 -60 150 -74 Q 210 -82 208 -60 Q 190 -48 168 -44 Q 205 -46 216 -34 Q 224 -22 196 -12 Q 172 -6 152 -8 Q 186 0 190 14 Q 192 30 158 34 Q 80 42 0 30 Z"/></g>`;
}

/* ⛔ ACCESSORIES RIDE CLOSE TO THE BODY (Brendon, 2026-07-31 — his crown was
   cut in half on his profile keychain). A worn charm is cropped just above its
   bail, and every accessory used to float well over that line, so the profile
   sliced the top off each one. They now sit tucked against the charm instead of
   hovering above it — they read as WORN, and there is nothing left up there to
   cut. Each one's highest point stays inside the bail's 30-unit headroom with
   room to spare for the sway. */
/** a = [bailX, bailY, aLx, aLy, aRx, aRy]; returns [front, back]. */
function accessorySvg(kind: number, a: number[], accent: string): [string, string] {
    if (kind === 0) return ['', ''];
    const bx = a[0]!;
    const by = a[1]!;
    if (kind === 2) {
        return [`<ellipse cx="${bx + 130}" cy="${by + 25}" rx="92" ry="26" fill="none" stroke="#F5D96B" stroke-width="14" transform="rotate(12 ${bx + 130} ${by + 25})"/>`, ''];
    }
    if (kind === 1) {
        return [`<g transform="translate(${bx + 118} ${by + 58}) rotate(18)" fill="${accent}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"><path d="M -12 0 L -74 -34 Q -88 -40 -86 -22 L -80 26 Q -78 42 -64 34 Z"/><path d="M 12 0 L 74 -34 Q 88 -40 86 -22 L 80 26 Q 78 42 64 34 Z"/><circle cx="0" cy="0" r="17"/></g>`, ''];
    }
    if (kind === 3) {
        return [`<g transform="translate(${bx + 128} ${by + 45}) rotate(14)" fill="#F5D96B" stroke="${INK}" stroke-width="9" stroke-linejoin="round"><path d="M -62 24 L -70 -34 L -34 -6 L 0 -44 L 34 -6 L 70 -34 L 62 24 Z"/><circle cx="0" cy="-52" r="8"/></g>`, ''];
    }
    if (kind === 4) {
        return [`<g stroke="${INK}"><path d="M ${bx + 105} ${by + 105} Q ${bx + 130} ${by + 35} ${bx + 160} ${by + 17}" fill="none" stroke-width="11" stroke-linecap="round"/><circle cx="${bx + 168}" cy="${by + 9}" r="22" fill="${accent}" stroke-width="9"/></g>`, ''];
    }
    return ['', wing(a[4]! - 14, a[5]!, false) + wing(a[2]! + 14, a[3]!, true)];
}

// ─── limbs ───────────────────────────────────────────────────────────────

/** actions: 0 PEACE_UP · 1 WAVE_UP · 2 HIP · 3 DOWN */
function arm(s: ShapeD, left: boolean, action: number, body: string): string {
    const ax = left ? s.aLx : s.aRx;
    const ay = left ? s.aLy : s.aRy;
    const m = left ? -1 : 1;
    let hx: number; let hy: number; let rot: number; let glove: number;
    if (action === 0) { hx = ax + m * 122; hy = ay - 228; rot = m * 14; glove = 1; }
    else if (action === 1) { hx = ax + m * 132; hy = ay - 212; rot = m * 20; glove = 0; }
    else if (action === 2) { hx = ax + m * 55; hy = ay + 165; rot = m * 165; glove = 2; }
    else { hx = ax + m * 62; hy = ay + 205; rot = m * 178; glove = 2; }
    const dStr = `M ${ax} ${ay} C ${ax + m * 95} ${ay + 15} ${hx - m * 30} ${hy + 55} ${hx} ${hy}`;
    return `<path d="${dStr}" fill="none" stroke="${INK}" stroke-width="36" stroke-linecap="round"/>`
        + `<path d="${dStr}" fill="none" stroke="${body}" stroke-width="17" stroke-linecap="round"/>`
        + `<g transform="translate(${hx} ${hy}) rotate(${rot})${left ? ' scale(-1 1)' : ''}">${gloveSvg(glove)}</g>`;
}

function legs(s: ShapeD, g: Genes, body: string, accent: string): string {
    if (s.noLegs) return '';
    const legCol = g.sock ? accent : body;
    let out = '';
    for (let side = 0; side < 2; ++side) {
        const left = side === 0;
        const lx = left ? s.lLx : s.lRx;
        const ly = left ? s.lLy : s.lRy;
        const m = left ? -1 : 1;
        const fx = lx + m * 14;
        const fy = ly + 118;
        const dStr = `M ${lx} ${ly} C ${lx + m * 6} ${ly + 50} ${fx} ${fy - 55} ${fx} ${fy - 12}`;
        out += `<path d="${dStr}" fill="none" stroke="${INK}" stroke-width="38" stroke-linecap="round"/>`
            + `<path d="${dStr}" fill="none" stroke="${legCol}" stroke-width="19" stroke-linecap="round"/>`
            + `<g transform="translate(${fx} ${fy}) scale(${m} 1)">${shoeSvg(g.shoe, accent)}</g>`;
    }
    return out;
}

// ─── the chain (streak) ──────────────────────────────────────────────────

/* THE CHAIN — six real links off the split ring, exactly the art Brendon
   approved (2026-07-29), given to every charm as its floor. The metal is the
   charm's own rare roll; nothing about the chain reads off the keeper any
   more, so the thin cord that used to mark a short streak is gone. */
export function charmChain(seed: `0x${string}`, luck: Luck = 0): { links: number; metal: number; label: string } {
    const t = tierRoll(seed, 24, luck);
    if (t === 3) return { links: 6, metal: 1, label: 'GOLD' };
    if (t === 2) return { links: 6, metal: 2, label: 'CHROME' };
    return { links: 6, metal: 0, label: 'STEEL' };
}

/** The charm's own finish — MATTE common, CHROME the chase. */
export function charmFinish(seed: `0x${string}`, luck: Luck = 0): number {
    const t = tierRoll(seed, 22, luck);
    if (t === 3) return d(seed, 23, 100n) < 60 ? 3 : 4; // GOLD · CHROME
    return t; // 0 MATTE · 1 GLOSS · 2 GLITTER
}

export function chainMetalHex(metalKind: number): string {
    return metalKind === 1 ? '#F5D96B' : metalKind === 2 ? '#EFF4FA' : '#C6CDD8';
}

/** Where the charm's chain hooks on — the bail, in art units. */
export function charmBailY(seed: `0x${string}`, coin: Coin = 0, luck: Luck = 0): number {
    return SHAPE_D[genes(seed, coin, luck).shape]!.bailY;
}

/** The charm's body colour and the name of its palette — what the profile's
 *  one-tap sticker match reads off the keychain you're wearing. */
export function charmPalette(seed: `0x${string}`, coin: Coin = 0, luck: Luck = 0): { hex: string; name: string } {
    const p = genes(seed, coin, luck).palette;
    return { hex: hex6(BODY_RGB[p]!), name: PALETTE_NAMES[p]! };
}

/* ⛔ THE VIEW HAS TO HOLD WHAT THE POSE DRAWS (Brendon, 2026-07-31 — the audit
   that came with the cut-off crown). A worn charm crops to just above its bail,
   which is correct right up until the charm throws a hand in the air: a raised
   glove reaches ~320 units above its shoulder, far higher than the bail, and on
   HEART · CLOVER · TAG · GEM · PLANET · BOLT the crop was slicing the hand clean
   off. The crop now opens as far as the pose actually reaches.

   NOTHING SHRINKS: the art is drawn at a fixed 1000-units-to-91px, so a taller
   view reveals more of the charm at exactly the same size — it never scales it
   down to fit. */
/** How far a raised glove reaches above the hand's own anchor point. */
const GLOVE_REACH = 96;

function cropTop(g: Genes, s: ShapeD, name: string): number {
    if (name.length) return 60;
    const [actL, actR] = armActions(g);
    let top = s.bailY - 30;
    const raised: [number, number][] = [[actL, s.aLy], [actR, s.aRy]];
    for (const [act, ay] of raised) {
        if (act === 0) top = Math.min(top, ay - 228 - GLOVE_REACH);
        else if (act === 1) top = Math.min(top, ay - 212 - GLOVE_REACH);
    }
    return Math.max(0, top);
}

/** The top of a WORN charm's view, in art units — what the profile keychain
 *  sizes its box against so the charm's bail lands on the chain's last link. */
export function charmCropTop(seed: `0x${string}`, coin: Coin = 0, luck: Luck = 0): number {
    const g = genes(seed, coin, luck);
    return cropTop(g, SHAPE_D[g.shape]!, '');
}

/** The chain's link geometry, shared by the drawn art and the hanging solver
 *  so a swinging chain is the SAME chain, link for link. */
export function chainGeom(bailY: number, links: number): {
    top: number; step: number; rx: number; ry: number; off: number;
} {
    const top = 162;
    const span = bailY - top + 8;
    const step = Math.trunc(span / links);
    let ry = Math.trunc((step * 72) / 100);
    if (ry > 34) ry = 34;
    let rx = Math.trunc((ry * 66) / 100);
    if (rx < 12) rx = 12;
    if (rx > 24) rx = 24;
    return { top, step, rx, ry, off: Math.trunc((ry * 7) / 10) };
}

/** One link of the chain drawn at the ORIGIN, long axis down — the same two
 *  shapes the static chain alternates, so the hanging version matches. */
export function chainLinkSvg(i: number, rx: number, ry: number, metal: string): string {
    if (i % 2 === 0) {
        return `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="22"/>`
            + `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="none" stroke="${metal}" stroke-width="10"/>`;
    }
    const w = Math.trunc((rx * 84) / 100);
    const h = Math.trunc((ry * 144) / 100);
    return `<rect x="${-Math.trunc(w / 2)}" y="${-Math.trunc(h / 2)}" width="${w}" height="${h}" rx="${Math.trunc((rx * 42) / 100)}" fill="${metal}" stroke="${INK}" stroke-width="9"/>`;
}

/** The split ring at the top of every chain, drawn at the ORIGIN. */
export function chainRingSvg(metal: string): string {
    return `<circle cx="0" cy="0" r="54" fill="none" stroke="${INK}" stroke-width="34"/>`
        + `<circle cx="0" cy="0" r="54" fill="none" stroke="${metal}" stroke-width="16"/>`;
}

function chainSvg(s: ShapeD, chain: { links: number; metal: number }): string {
    const { links, metal: metalKind } = chain;
    const metal = chainMetalHex(metalKind);
    let out = `<circle cx="500" cy="108" r="54" fill="none" stroke="${INK}" stroke-width="34"/>`
        + `<circle cx="500" cy="108" r="54" fill="none" stroke="${metal}" stroke-width="16"/>`;
    const top = 162;
    const by = s.bailY;
    if (links === 0) {
        return out
            + `<path d="M 500 162 L 500 ${by}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M 500 162 L 500 ${by}" stroke="#C6CDD8" stroke-width="7" stroke-linecap="round"/>`;
    }
    const span = by - top + 8;
    const step = Math.trunc(span / links);
    let ry = Math.trunc((step * 72) / 100);
    if (ry > 34) ry = 34;
    let rx = Math.trunc((ry * 66) / 100);
    if (rx < 12) rx = 12;
    if (rx > 24) rx = 24;
    for (let i = 0; i < links; ++i) {
        const cy = top + step * i + Math.trunc((ry * 7) / 10);
        if (i % 2 === 0) {
            out += `<ellipse cx="500" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="22"/><ellipse cx="500" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${metal}" stroke-width="10"/>`;
        } else {
            out += `<rect x="${500 - Math.trunc((rx * 42) / 100)}" y="${cy - Math.trunc((ry * 72) / 100)}" width="${Math.trunc((rx * 84) / 100)}" height="${Math.trunc((ry * 144) / 100)}" rx="${Math.trunc((rx * 42) / 100)}" fill="${metal}" stroke="${INK}" stroke-width="9"/>`;
        }
    }
    return out;
}

// ─── finishes (rank) ─────────────────────────────────────────────────────


function finishGradient(finish: number, body: number, material: number, uid: string): string {
    if (finish === 3) {
        return `<linearGradient id="f${uid}" gradientUnits="userSpaceOnUse" x1="500" y1="290" x2="500" y2="860"><stop offset="0" stop-color="#F5D96B"/><stop offset="0.45" stop-color="#EDBC4E"/><stop offset="0.55" stop-color="#D9A231"/><stop offset="1" stop-color="#F5D96B"/></linearGradient>`;
    }
    if (finish === 4) {
        return `<linearGradient id="f${uid}" gradientUnits="userSpaceOnUse" x1="440" y1="290" x2="560" y2="860"><stop offset="0" stop-color="#F7FAFF"/><stop offset="0.38" stop-color="#9FB0C4"/><stop offset="0.5" stop-color="#DDE6F2"/><stop offset="0.62" stop-color="#77879C"/><stop offset="0.8" stop-color="#DDE6F2"/><stop offset="1" stop-color="#F7FAFF"/></linearGradient>`;
    }
    // THE DOME — the miniplayer chassis gradient, ported verbatim.
    const [wPct, kPct] = material === 1 ? [13, 9] : [28, 18];
    return `<linearGradient id="f${uid}" gradientUnits="userSpaceOnUse" x1="500" y1="290" x2="500" y2="860"><stop offset="0" stop-color="${hex6(mix(body, true, wPct))}"/><stop offset="0.52" stop-color="${hex6(body)}"/><stop offset="1" stop-color="${hex6(mix(body, false, kPct))}"/></linearGradient>`;
}

function finishOverlay(finish: number, seed: `0x${string}`, uid: string): string {
    if (finish === 1) {
        return `<g clip-path="url(#c${uid})"><ellipse cx="400" cy="470" rx="150" ry="90" fill="#FFFFFF" opacity="0.4" transform="rotate(-24 400 470)"/></g>`;
    }
    if (finish === 2) {
        let sp = `<g class="gl" clip-path="url(#c${uid})" fill="#FFFFFF" opacity="0.9">`;
        for (let i = 0; i < 14; ++i) {
            const h = BigInt(keccak256(encodePacked(['bytes32', 'string', 'uint256'], [seed, 'GLIT', BigInt(i)])));
            const x = 330 + Number(h % 360n);
            const y = 400 + Number((h >> 16n) % 360n);
            const sc = 70 + Number((h >> 32n) % 110n); // 0.70 – 1.79
            sp += `<path transform="translate(${x} ${y}) scale(${Math.trunc(sc / 100)}.${sc % 100 < 10 ? '0' : ''}${sc % 100})" d="M 0 -16 L 4 -4 L 16 0 L 4 4 L 0 16 L -4 4 L -16 0 L -4 -4 Z"/>`;
        }
        return sp + '</g>';
    }
    return '';
}

// ─── name tag ────────────────────────────────────────────────────────────

function nameTag(name: string): string {
    const len = name.length;
    if (len === 0) return '';
    let w = 46 + len * 30;
    if (w < 150) w = 150;
    return `<g transform="translate(608 96) rotate(24)"><path d="M 12 0 L ${w - 12} 0 Q ${w} 0 ${w} 12 L ${w} 62 Q ${w} 74 ${w - 12} 74 L 12 74 Q 0 74 0 62 L 0 12 Q 0 0 12 0 Z M 30 25 C 37 25 42 30 42 37 C 42 44 37 49 30 49 C 23 49 18 44 18 37 C 18 30 23 25 30 25 Z" fill="#FFFFFF" fill-rule="evenodd" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/><text x="${54 + Math.trunc((w - 74) / 2)}" y="50" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="40" font-weight="bold" fill="${INK}">${name}</text></g>`;
}

// ─── assembly ────────────────────────────────────────────────────────────

function faceSvg(g: Genes, s: ShapeD, body: string, accent: string): string {
    const scale = s.fs === 100 ? '1' : `0.${s.fs}`;
    return `<g transform="translate(${s.fx} ${s.fy}) scale(${scale})">`
        + (g.blush
            ? '<ellipse cx="-124" cy="52" rx="30" ry="19" fill="#F0879E" opacity="0.9"/><ellipse cx="124" cy="52" rx="30" ry="19" fill="#F0879E" opacity="0.9"/>'
            : '')
        + `<g class="ey">${eyesSvg(g.eyes, g.iris, body, accent)}</g>${mouthSvg(g.mouth)}${browsSvg(g.brows)}`
        + '</g>';
}

function shine(shapeI: number, uid: string): string {
    const [sx, sy] = shineSpot(shapeI);
    return `<g clip-path="url(#c${uid})"><ellipse cx="${sx}" cy="${sy}" rx="27" ry="15" fill="#FFFFFF" opacity="0.85" transform="rotate(-28 ${sx} ${sy})"/></g>`;
}

function armActions(g: Genes): [number, number] {
    const rest = g.restHip ? 2 : 3;
    if (g.pose === 0) return g.raiseLeft ? [0, rest] : [rest, 0];
    if (g.pose === 1) return g.raiseLeft ? [1, rest] : [rest, 1];
    if (g.pose === 2) return [1, 0];
    if (g.pose === 3) return [2, 2];
    return [3, 3];
}

/** Draw the full charm — the contract's tokenSVG, verbatim. `name` must be
 *  charset-guarded (A–Z, 0–9, space) by the caller. `uid` must be unique per
 *  charm ON THE PAGE (id suffixes prevent gradient/clip collisions). */
export function charmSVG(seed: `0x${string}`, uid: string, luck: Luck, name: string, coin: Coin = 0, noChain = false, noStyle = false): string {
    const g = genes(seed, coin, luck);
    const s = SHAPE_D[g.shape]!;
    const bodyC = BODY_RGB[g.palette]!;
    const body = hex6(bodyC);
    const accent = hex6(ACC_RGB[g.palette]!);
    const finish = charmFinish(seed, luck);
    const [accFront, accBack] = accessorySvg(g.acc, [s.bailX, s.bailY, s.aLx, s.aLy, s.aRx, s.aRy], accent);
    const [actL, actR] = armActions(g);

    /* noChain — the charm WORN on a profile shows no chain (Brendon,
       2026-07-29). The view tightens to whatever is still drawn so the charm
       fills its box instead of hanging under an empty gap; everything else
       (the name tag included) is untouched. Default false keeps the contract's
       tokenSVG verbatim everywhere else. */
    /* noStyle — the sway/blink/twinkle rules ride along with the app's own
       stylesheet instead of being restated inside every single charm (Brendon,
       2026-07-31). A rack of thirty was shipping thirty identical copies of
       them, all global. The animations themselves are untouched — they run
       exactly as before, just declared once. Default false keeps the contract's
       tokenSVG self-contained and verbatim. */
    const top = noChain ? cropTop(g, s, name) : 0;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} 1000 ${1000 - top}">`
        + (noStyle ? '' : '<style>.sw{transform-box:fill-box;transform-origin:50% -6%;animation:sw 3.4s ease-in-out infinite alternate}@keyframes sw{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}.ey{transform-box:fill-box;transform-origin:center;animation:bl 4.6s infinite}@keyframes bl{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(0.12)}}.gl{animation:tw 2.3s ease-in-out infinite alternate}@keyframes tw{from{opacity:0.5}to{opacity:0.95}}</style>')
        + `<defs><clipPath id="c${uid}">${clipEl(g.shape)}</clipPath>${finishGradient(finish, bodyC, g.material, uid)}</defs>`
        + (noChain ? '' : chainSvg(s, charmChain(seed, luck))) + nameTag(name)
        + `<g class="sw">${accBack}${bodySvg(g.shape, `url(#f${uid})`, accent)}`
        + finishOverlay(finish, seed, uid)
        + ((g.material === 1 && finish < 3) ? '' : shine(g.shape, uid))
        + faceSvg(g, s, body, accent) + legs(s, g, body, accent) + arm(s, true, actL, body)
        + arm(s, false, actR, body) + accFront + '</g></svg>';
}

// ─── trait names ─────────────────────────────────────────────────────────

export const SHAPE_NAMES = ['HEART', 'STAR', 'FLOWER', 'GHOST', 'CLOVER', 'BOLT', 'TAG', 'MOON', 'GEM', 'PLANET', 'SPARK', 'ALIEN'] as const;
export const EYE_NAMES = ['GOOGLY', 'ROUND', 'WINK', 'SLEEPY', 'STARRY', 'HEARTS', 'SPIRAL', 'X X', 'VISOR', 'DIZZY', 'LASERS', 'SUNGLASSES', '3D GLASSES', 'LASHES', 'TEARY'] as const;
export const IRIS_NAMES = ['INK', 'BLUE', 'GREEN', 'AMBER', 'VIOLET', 'RED'] as const;
export const COIN_NAMES = ['YIN', 'YANG'] as const;
export const MOUTH_NAMES = ['SMILE', 'OPEN', 'CAT', 'O', 'TONGUE', 'FLAT', 'FANG'] as const;
export const FINISH_NAMES = ['MATTE', 'GLOSS', 'GLITTER', 'GOLD', 'CHROME'] as const;
export const POSE_NAMES = ['PEACE', 'WAVE', 'CHEER', 'HIPS', 'CHILL'] as const;
export const ACC_NAMES = ['NONE', 'BOW', 'HALO', 'CROWN', 'ANTENNA', 'WINGS'] as const;
export const BROW_NAMES = ['NONE', 'RAISED', 'BENT'] as const;

/* ── THE ELEMENTS (Brendon, 2026-07-30) ───────────────────────────────────
   THE TOP-LEVEL ATTRIBUTE — the main thing that organizes the charms. Every
   shape belongs to exactly one of six elements, two shapes each, and each
   element owns a colour. It is a CLASSIFICATION of the existing shapes, not
   a new roll: no salt, no change to the gene roll, and the art is untouched.
   An element's rarity is simply its two shapes' weights added up —
   AIR 24 · WATER 22 · SPACE 19 · FIRE 12 · TIME 12 · MINERALS 11. */

export const ELEMENT_NAMES = ['AIR', 'SPACE', 'FIRE', 'MINERALS', 'WATER', 'TIME'] as const;

/** Each element's colour (Brendon's assignment). Drawn from the charm
 *  palette's own hexes so they sit in the same colour world as the art. */
export const ELEMENT_HEX = ['#FF8A3D', '#45B8E8', '#E84A5E', '#3BC69F', '#F2D75C', '#8A4FD1'] as const;

/** shape index → element index. HEART·BOLT air · STAR·MOON space ·
 *  TAG·SPARK fire · GEM·PLANET minerals · FLOWER·CLOVER water ·
 *  GHOST·ALIEN time. */
const SHAPE_ELEMENT = [0, 1, 4, 5, 4, 0, 2, 1, 3, 3, 2, 5] as const;

/** The element a charm belongs to, off its shape. */
export function elementFor(shape: number): number {
    return SHAPE_ELEMENT[shape] ?? 0;
}

/** The element a charm belongs to, off its seed. */
export function charmElement(seed: `0x${string}`, coin: Coin = 0, luck: Luck = 0): number {
    return elementFor(genes(seed, coin, luck).shape);
}

/** The reveal-card trait sheet for a charm. */
export function charmTraits(seed: `0x${string}`, luck: Luck, coin: Coin = 0): { k: string; v: string }[] {
    const g = genes(seed, coin, luck);
    return [
        { k: 'Element', v: ELEMENT_NAMES[elementFor(g.shape)]! },
        { k: 'Coin', v: COIN_NAMES[coin]! },
        { k: 'Shape', v: SHAPE_NAMES[g.shape]! },
        { k: 'Palette', v: PALETTE_NAMES[g.palette]! },
        { k: 'Material', v: g.material === 0 ? 'PLASTIC' : 'RUBBER' },
        { k: 'Eyes', v: EYE_NAMES[g.eyes]! },
        { k: 'Iris', v: IRIS_NAMES[g.iris]! },
        { k: 'Mouth', v: MOUTH_NAMES[g.mouth]! },
        { k: 'Brows', v: BROW_NAMES[g.brows]! },
        { k: 'Pose', v: POSE_NAMES[g.pose]! },
        { k: 'Accessory', v: ACC_NAMES[g.acc]! },
        { k: 'Shoes', v: SHAPE_D[g.shape]!.noLegs ? 'NONE' : g.shoe === 0 ? 'BOOTS' : 'SNEAKERS' },
        { k: 'Finish', v: FINISH_NAMES[charmFinish(seed, luck)]! },
        { k: 'Chain', v: charmChain(seed, luck).label },
    ];
}

/** One crank of the machine, priced in sim-ETH during the test phase —
 *  the ~$22 target, sticker-sheet economics (admin-tunable on chain). */
export const CRANK_PRICE_ETH = 0.01;

/** Christened-name law (the contract's charset guard): 2–12 chars, A–Z 0–9
 *  space, no leading/trailing space. */
export function isValidCharmName(name: string): boolean {
    if (name.length < 2 || name.length > 12) return false;
    if (!/^[A-Z0-9 ]+$/.test(name)) return false;
    return name.trim() === name;
}

/** A charm as stored in the owner's settings envelope. */
export interface CharmRecord {
    /** Sequential per-owner id — doubles as the SVG uid salt. */
    id: number;
    /** The mint seed (bytes32 hex) — genes derive from this forever. */
    seed: `0x${string}`;
    /** Christened name — '' until christened, once ever. */
    name: string;
    /** Epoch-ms of the crank. */
    at: number;
    /** YIN/YANG — which slot the coin dropped in (0 yin · 1 yang). Older
     *  records (pre coin slots) default to 0 = YIN. */
    coin: Coin;
    /** The keeper's odds tier AT THE CRANK, banked into the charm forever —
     *  a long streak buys better rare chances, it never repaints the art
     *  afterwards (Brendon, 2026-07-29). Older records default to 0. */
    luck: Luck;
}

export function sanitizeCharms(parsed: unknown): CharmRecord[] {
    if (!Array.isArray(parsed)) return [];
    const out: CharmRecord[] = [];
    for (const c of parsed) {
        if (!c || typeof c !== 'object') continue;
        const r = c as Partial<CharmRecord>;
        if (typeof r.id !== 'number' || typeof r.seed !== 'string') continue;
        if (!/^0x[0-9a-fA-F]{64}$/.test(r.seed)) continue;
        out.push({
            id: r.id,
            seed: r.seed as `0x${string}`,
            name: typeof r.name === 'string' ? r.name : '',
            at: typeof r.at === 'number' ? r.at : 0,
            coin: r.coin === 1 ? 1 : 0,
            luck: r.luck === 1 || r.luck === 2 || r.luck === 3 ? r.luck : 0,
        });
    }
    return out;
}

/** How many charms may hang at once. */
export const TOP_SLOTS = 3;

/** Legacy-safe read: a bare number, an array, or nothing → a clean id list. */
export function idList(raw: unknown, cap = 64): number[] {
    const out: number[] = [];
    const push = (v: unknown) => {
        if (typeof v !== 'number' || !Number.isFinite(v)) return;
        const n = Math.trunc(v);
        if (n > 0 && !out.includes(n)) out.push(n);
    };
    if (Array.isArray(raw)) raw.forEach(push);
    else push(raw);
    return out.slice(0, cap);
}
