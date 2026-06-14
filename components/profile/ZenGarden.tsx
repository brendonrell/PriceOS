'use client';

/*
 * ZenGarden — a karesansui (dry rock garden) rendering of a Collector's
 * portfolio. Appears only in Zen Mode (Profile Page). Each owned Output is a
 * stone (⬟ / ⬣); the sand (≋) is raked into concentric rings AROUND every
 * stone — distance-to-nearest-stone banded into alternating textures so the
 * rake visibly curves around the rocks, the way a real raked garden does.
 *
 * Deterministic per wallet (same garden every visit) — pure aesthetic, no data
 * writes, no interaction.
 */

import { useMemo } from 'react';

const COLS = 46;
const ROWS = 15;
const MAX_ROCKS = 14;
const ROCK_GLYPHS = ['⬟', '⬣'];
const SAND_RAKE = '≋'; // raked sand
const SAND_GAP = '·'; // the trough between rake lines

/* Cheap deterministic PRNG seeded off the wallet — same garden every time. */
function seedFrom(addr: string): number {
    let h = 2166136261 >>> 0;
    const s = addr || 'pd';
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}
function mulberry32(a: number): () => number {
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Rock { x: number; y: number; g: string; }

function buildGarden(address: string, count: number): string {
    const rng = mulberry32(seedFrom(address));
    const n = Math.max(0, Math.min(MAX_ROCKS, count));

    const rocks: Rock[] = [];
    let guard = 0;
    while (rocks.length < n && guard < 500) {
        guard++;
        const x = 3 + Math.floor(rng() * (COLS - 6));
        const y = 2 + Math.floor(rng() * (ROWS - 4));
        // Keep stones apart so each owns a clear set of rings.
        if (rocks.some((r) => Math.hypot(r.x - x, (r.y - y) * 2) < 6)) continue;
        rocks.push({ x, y, g: ROCK_GLYPHS[Math.floor(rng() * ROCK_GLYPHS.length)] });
    }

    const lines: string[] = [];
    for (let y = 0; y < ROWS; y++) {
        let row = '';
        for (let x = 0; x < COLS; x++) {
            const rock = rocks.find((r) => r.x === x && r.y === y);
            if (rock) { row += rock.g; continue; }

            if (rocks.length === 0) {
                // Empty garden — calm parallel rake lines.
                row += y % 2 === 0 ? SAND_RAKE : SAND_GAP;
                continue;
            }

            // Distance to nearest stone, with the ~2:1 char aspect corrected so
            // the rings read as round. Band it into alternating rake/gap → the
            // sand rakes into concentric rings around each stone.
            let d = Infinity;
            for (const r of rocks) {
                const dist = Math.hypot(r.x - x, (r.y - y) * 2);
                if (dist < d) d = dist;
            }
            const ring = Math.round(d / 2);
            row += ring % 2 === 0 ? SAND_RAKE : SAND_GAP;
        }
        lines.push(row);
    }
    return lines.join('\n');
}

export default function ZenGarden({
    address,
    count,
}: {
    address: string;
    count: number;
}) {
    const field = useMemo(() => buildGarden(address, count), [address, count]);
    const stones = Math.min(MAX_ROCKS, Math.max(0, count));
    return (
        <section className="zen-garden" aria-label="Zen Garden">
            <pre className="zen-garden-field">{field}</pre>
            <div className="zen-garden-caption">
                {stones} {stones === 1 ? 'stone' : 'stones'} in the sand
            </div>
        </section>
    );
}
