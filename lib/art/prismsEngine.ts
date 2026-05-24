/*
 * prismsEngine.ts
 *
 * Verbatim port of the KikiEngine generative art system from
 * reference/Prismsdemo.html. Each token id maps to a unique,
 * fully-deterministic artwork via the mulberry32 PRNG seeded on
 * the token id alone (no session-level RUN_OFFSET — the demo uses
 * a random RUN_OFFSET per page load, but the React gallery needs
 * stable output across reloads, virt-evictions, and modal renders).
 *
 * Public API:
 *   renderPrisms(canvas, tokenId, width)
 *     Paints the artwork for tokenId into canvas at the given width.
 *     Sets canvas.width / canvas.height internally (matches demo
 *     render() behaviour). Returns the calculated aspect ratio so
 *     callers can set a matching CSS aspect-ratio on the wrapper.
 *
 * Nothing else in this file is exported — all constants and helpers
 * are module-private to avoid polluting the global namespace.
 */

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

function mulberry32(a: number): () => number {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------------------------------------------------------------------------
// Palettes  (RAW_PALS from demo, verbatim)
// ---------------------------------------------------------------------------

interface Palette {
    name: string;
    bg: string;
    gap: string;
    kiki: string;
    bouba: string;
    weight: number;
    void: boolean;
    noVoid: boolean;
}

const MAIN_PALETTES = ['VID', 'LAVALAMP', 'RENDEZVOUS', 'LSD', 'NEONDRIFT', 'FOLD'];
const WEIGHT_MAIN = 50;
const WEIGHT_SPECIAL = 12;

const RAW_PALS: Array<{ n: string; b: string; g: string; k: string; o: string; nv?: number; p?: number; w?: number }> = [
    {n:'VID',b:'#FFFFFF',g:'#FFFFFF',k:'#000000',o:'#FF0000',nv:1},
    {n:'LAVALAMP',b:'#D81B60',g:'#D81B60',k:'#D600FF',o:'#FF1744'},
    {n:'RENDEZVOUS',b:'#F0C993',g:'#F0C993',k:'#06EB8E',o:'#B7EA08',nv:1},
    {n:'LSD',b:'#9400d3',g:'#9400d3',k:'#00ff7f',o:'#ff4500',nv:1},
    {n:'NEONDRIFT',b:'#D600FF',g:'#D600FF',k:'#000080',o:'#FF0000',nv:1},
    {n:'FOLD',b:'#00FF66',g:'#00FF66',k:'#4B0C51',o:'#00FFD5',nv:1},
    {n:'782',b:'#13716B',g:'#13716B',k:'#1B9D89',o:'#FF3341',nv:1},
    {n:'AESTHETE',b:'#0066FF',g:'#0066FF',k:'#FF9900',o:'#FF00E6',nv:1},
    {n:'AFILM',b:'#3DD2E9',g:'#3DD2E9',k:'#45E021',o:'#F5B6DB',nv:1},
    {n:'ATTENTION',b:'#0D4AF2',g:'#0D4AF2',k:'#E600FF',o:'#FFE600',nv:1},
    {n:'ATTODRIFT',b:'#D2A614',g:'#D2A614',k:'#1440D2',o:'#9FD214',nv:1},
    {n:'AXIS',b:'#FFFF00',g:'#FFFF00',k:'#000000',o:'#0000FF',nv:1},
    {n:'BB',b:'#FF0000',g:'#FF0000',k:'#AA5500',o:'#311B92',nv:1},
    {n:'BEACH',b:'#000000',g:'#000000',k:'#00FFCC',o:'#FF0099',nv:1},
    {n:'BERRY2',b:'#FF0055',g:'#FF0055',k:'#FF1493',o:'#0000FF',nv:1},
    {n:'BIT',b:'#ADFF2F',g:'#ADFF2F',k:'#D8BFD8',o:'#FF0000',nv:1},
    {n:'BLUNTDREG',b:'#FC0BF6',g:'#FC0BF6',k:'#E96C45',o:'#E0AF86',nv:1},
    {n:'BLUNTVOID',b:'#9BFFA6',g:'#9BFFA6',k:'#00FF4C',o:'#8500FF',nv:1},
    {n:'BONEPULSE',b:'#660066',g:'#660066',k:'#808080',o:'#FF1493',nv:1},
    {n:'CHEWY',b:'#6B8E23',g:'#6B8E23',k:'#ADFF2F',o:'#FF0000',nv:1},
    {n:'COOKIES',b:'#EE82EE',g:'#EE82EE',k:'#FF6347',o:'#121212',nv:1},
    {n:'CRYPTOCURRENCY',b:'#A71DE7',g:'#A71DE7',k:'#F32B35',o:'#AAB305',nv:1},
    {n:'CYBERGEM',b:'#132AF4',g:'#132AF4',k:'#8C02EB',o:'#011D6D',nv:1},
    {n:'DARKHUNT',b:'#95FF00',g:'#95FF00',k:'#6A00FF',o:'#00FFEA',nv:1},
    {n:'DOOM',b:'#A7D279',g:'#A7D279',k:'#000000',o:'#00FF00',nv:1},
    {n:'EGOMATH',b:'#488BE7',g:'#488BE7',k:'#EE65D7',o:'#971689',nv:1},
    {n:'EGOTOOL',b:'#9041AA',g:'#9041AA',k:'#2F53F4',o:'#5240F2',nv:1},
    {n:'ERROR',b:'#481655',g:'#481655',k:'#290C2C',o:'#5CFF33',nv:1},
    {n:'EXPERIENCE',b:'#FF4500',g:'#FF4500',k:'#FF1493',o:'#CD5C5C',nv:1},
    {n:'FOGOFWAR',b:'#88918D',g:'#88918D',k:'#FF335F',o:'#898084',nv:1},
    {n:'FRESHSLAG',b:'#BC8F8F',g:'#BC8F8F',k:'#FF1493',o:'#006400',nv:1},
    {n:'FUMEGEM',b:'#FF1744',g:'#FF1744',k:'#5500FF',o:'#1E90FF',nv:1},
    {n:'GNOSIS',b:'#454628',g:'#454628',k:'#6D3BE9',o:'#EC1D11',nv:1},
    {n:'GRID',b:'#0000FF',g:'#0000FF',k:'#FFFFFF',o:'#FF0000',nv:1},
    {n:'GTA4',b:'#C86432',g:'#C86432',k:'#B056FA',o:'#000000',nv:1},
    {n:'HAZE2',b:'#B899D4',g:'#B899D4',k:'#BDD993',o:'#354B46',nv:1},
    {n:'HAZE3',b:'#75EEF7',g:'#75EEF7',k:'#0DDC3F',o:'#BD8AC5',nv:1},
    {n:'HELIUMGLAND',b:'#6200EA',g:'#6200EA',k:'#FF4081',o:'#2E002E',nv:1},
    {n:'HIGHBOT',b:'#EE82EE',g:'#EE82EE',k:'#00FF7F',o:'#40E0D0',nv:1},
    {n:'HOPIUM',b:'#FF00FF',g:'#FF00FF',k:'#DC143C',o:'#2E8B57',nv:1},
    {n:'HOTHURT',b:'#EE82EE',g:'#EE82EE',k:'#FFD700',o:'#FF0055',nv:1},
    {n:'HUH',b:'#E9967A',g:'#E9967A',k:'#20B2AA',o:'#9370DB',nv:1},
    {n:'HYPNO',b:'#00FFA1',g:'#00FFA1',k:'#FFFFFF',o:'#000000',nv:1},
    {n:'LINEN',b:'#F6B95A',g:'#F6B95A',k:'#5005CA',o:'#ACFD29',nv:1},
    {n:'MACHINEELF',b:'#00FF7F',g:'#00FF7F',k:'#FF00FF',o:'#FFFF00',nv:1},
    {n:'MARROW',b:'#FF1744',g:'#FF1744',k:'#FF1493',o:'#708090',nv:1},
    {n:'MESMER',b:'#FF4500',g:'#FF4500',k:'#E6E6FA',o:'#D500F9',nv:1},
    {n:'MIXEDDRINK',b:'#FF00FF',g:'#FF00FF',k:'#F44336',o:'#00FFCC',nv:1},
    {n:'MOIST',b:'#0100FF',g:'#0100FF',k:'#4A1036',o:'#D098A0',nv:1},
    {n:'MYTHOUGHTS',b:'#FAD1E5',g:'#FAD1E5',k:'#FCFF33',o:'#F7BAD8',nv:1},
    {n:'NUMB',b:'#4E3226',g:'#4E3226',k:'#5E4625',o:'#0003FF',nv:1},
    {n:'OKC',b:'#0000FF',g:'#0000FF',k:'#000000',o:'#FF6347',nv:1},
    {n:'OMNIFORM',b:'#D293B1',g:'#D293B1',k:'#C06892',o:'#3D1A2B',nv:1},
    {n:'OOZE',b:'#FF0055',g:'#FF0055',k:'#5500FF',o:'#00FF55',nv:1},
    {n:'ORDER',b:'#51DC6E',g:'#51DC6E',k:'#29EEA6',o:'#99B85C',nv:1},
    {n:'PLASMA',b:'#3F51B5',g:'#3F51B5',k:'#FF4081',o:'#002147',nv:1},
    {n:'POISON',b:'#741A43',g:'#741A43',k:'#4B1124',o:'#33FFA3',nv:1},
    {n:'PRECOGNITION',b:'#FAD1E5',g:'#FAD1E5',k:'#F7BAD8',o:'#33FF9C',nv:1},
    {n:'PUREHEAT',b:'#84FF00',g:'#84FF00',k:'#D4FF00',o:'#9900FF',nv:1},
    {n:'RIPE',b:'#457359',g:'#457359',k:'#FF5F33',o:'#C5FF33',nv:1},
    {n:'ROOT',b:'#D81B60',g:'#D81B60',k:'#6200EA',o:'#3D0C02',nv:1},
    {n:'RURALLUSH',b:'#1EBFD1',g:'#1EBFD1',k:'#23E279',o:'#4702F8',nv:1},
    {n:'SENSITIVE',b:'#1D00FF',g:'#1D00FF',k:'#C10E85',o:'#394837',nv:1},
    {n:'SEX',b:'#00FFFF',g:'#00FFFF',k:'#EE82EE',o:'#00FF7F',nv:1},
    {n:'SIMPLE',b:'#1941C8',g:'#1941C8',k:'#8607F3',o:'#747474',nv:1},
    {n:'SMOKEBREAK',b:'#5D4037',g:'#5D4037',k:'#2E0854',o:'#304FFE',nv:1},
    {n:'SMS',b:'#1E90FF',g:'#1E90FF',k:'#00FF00',o:'#FF1493',nv:1},
    {n:'SOFT',b:'#391797',g:'#391797',k:'#2D106A',o:'#C9FF33',nv:1},
    {n:'SYRUP',b:'#B2FF59',g:'#B2FF59',k:'#304FFE',o:'#D50000',nv:1},
    {n:'T',b:'#D500F9',g:'#D500F9',k:'#002200',o:'#FF6600',nv:1},
    {n:'TELEPATHY',b:'#708090',g:'#708090',k:'#BDB76B',o:'#FF1493',nv:1},
    {n:'TELESTHESIA',b:'#006AFF',g:'#006AFF',k:'#FF9500',o:'#FF00EA',nv:1},
    {n:'THUNDER',b:'#A0522D',g:'#A0522D',k:'#FF0000',o:'#0a0005',nv:1},
    {n:'TINDER',b:'#B388FF',g:'#B388FF',k:'#E1BEE7',o:'#FF0000',nv:1},
    {n:'TOAST',b:'#EE82EE',g:'#EE82EE',k:'#0055FF',o:'#FF9900',nv:1},
    {n:'TUNEPASTE',b:'#FF1493',g:'#FF1493',k:'#008080',o:'#8B008B',nv:1},
    {n:'VAIN2',b:'#4DCCE5',g:'#4DCCE5',k:'#EF80B6',o:'#371F47',nv:1},
    {n:'VHS',b:'#FF0055',g:'#FF0055',k:'#0055FF',o:'#FF9900',nv:1},
    {n:'VISION',b:'#0C6BF5',g:'#0C6BF5',k:'#6A5081',o:'#743664',nv:1},
    {n:'WASH',b:'#FF00FF',g:'#FF00FF',k:'#AA00FF',o:'#40E0D0',nv:1},
    {n:'WAVEDEATH',b:'#d4aaf2',g:'#d4aaf2',k:'#000000',o:'#444444',nv:1},
    {n:'WEIRDPOSE',b:'#D2691E',g:'#D2691E',k:'#FFFF00',o:'#FF0000',nv:1},
    {n:'WHAT',b:'#BDB76B',g:'#BDB76B',k:'#FF1493',o:'#1E90FF',nv:1},
    {n:'ZAP',b:'#ffd700',g:'#ffd700',k:'#0000ff',o:'#ff0000',nv:1},
    {n:'ZEPTOALLOY',b:'#800000',g:'#800000',k:'#000080',o:'#FF0000',nv:1},
    {n:'ZERORISK',b:'#BDB76B',g:'#BDB76B',k:'#000000',o:'#4B0082',nv:1},
    {n:'BAG',b:'#F21C27',g:'#F21C27',k:'#6A09F1',o:'#31A30A'},
    {n:'CRUSH',b:'#050005',g:'#050005',k:'#D600FF',o:'#FF0099'},
    {n:'DEEP',b:'#000005',g:'#000005',k:'#FF6600',o:'#0055FF'},
    {n:'ENERGY',b:'#2F4F4F',g:'#2F4F4F',k:'#AA00FF',o:'#FF9900'},
    {n:'HOLOGRAM',b:'#000000',g:'#000000',k:'#00FFFF',o:'#7FFFD4'},
    {n:'NOSKY',b:'#000000',g:'#000000',k:'#652565',o:'#4414F0'},
    {n:'NOTREAL',b:'#48062F',g:'#48062F',k:'#00FFC2',o:'#8A36FF'},
    {n:'PATIENCE',b:'#000000',g:'#000000',k:'#3A122B',o:'#BADA01'},
    {n:'SHROOMY',b:'#1A001A',g:'#1A001A',k:'#00FF99',o:'#FF99CC'},
    {n:'THERMAL',b:'#000000',g:'#000000',k:'#FF3300',o:'#FFD700'},
    {n:'TOMATO',b:'#080000',g:'#000000',k:'#00FF66',o:'#FF4400'},
    {n:'ULTRALINK',b:'#091406',g:'#091406',k:'#66FF8C',o:'#D2FF4D'},
    {n:'VAMPIRE',b:'#000000',g:'#000000',k:'#FF0000',o:'#E0E0E0'},
    {n:'ZEPTOCASH',b:'#3f0a06',g:'#3f0a06',k:'#2dff60',o:'#a0a185',w:4},
];

const PALETTES: Palette[] = RAW_PALS.map((p) => {
    const weight = MAIN_PALETTES.includes(p.n) ? WEIGHT_MAIN : (p.w ?? WEIGHT_SPECIAL);
    return {
        name:   p.n,
        bg:     p.b,
        gap:    p.g,
        kiki:   p.k,
        bouba:  p.o,
        weight,
        void:   p.p === 1,
        noVoid: p.nv === 1,
    };
});

const RATIOS = [1.6, 2.35, 2.35, 2.75, 3.2, 1.33, 1, 0.75];
const BANNED_GROUPTHINK_VARIANTS = ['blade', 'organic', 'star', 'bolt'];

// ---------------------------------------------------------------------------
// DNA point type
// ---------------------------------------------------------------------------
type DnaPoint = { a: number; r: number };
type Dna = DnaPoint[] & { variant?: string };

// ---------------------------------------------------------------------------
// KikiEngine  (verbatim port from demo)
// ---------------------------------------------------------------------------
class KikiEngine {
    private R: () => number;

    constructor(seed: number) {
        // Fixed offset 0 so output is stable per token id across reloads.
        // The demo uses a random RUN_OFFSET per page load; we intentionally
        // omit it here for determinism. Seed = token id.
        this.R = mulberry32(seed);
    }

    rand(min: number, max: number) { return this.R() * (max - min) + min; }
    randInt(min: number, max: number) { return Math.floor(this.rand(min, max)); }
    pick<T>(arr: T[]): T { return arr[Math.floor(this.R() * arr.length)]; }
    pickWeighted(arr: Palette[]): Palette {
        const total = arr.reduce((acc, item) => acc + item.weight, 0);
        let sum = 0;
        const r = this.R() * total;
        for (const item of arr) {
            sum += item.weight;
            if (r <= sum) return item;
        }
        return arr[0];
    }
    dist(x1: number, y1: number, x2: number, y2: number) { return Math.hypot(x2 - x1, y2 - y1); }

    createOrganicKikiDNA(isClean: boolean): Dna {
        const points = isClean ? this.randInt(12, 20) : this.randInt(16, 40);
        const starFactor = isClean ? this.rand(0.6, 0.9) : this.R();
        const biasStrength = Math.pow(this.R(), 2);
        const biasAngle = this.rand(0, Math.PI * 2);
        const dna: Dna = [];
        for (let i = 0; i < points; i++) {
            const a = (Math.PI * 2 * i) / points;
            let r = this.rand(0.5, 1.5);
            if (i % 2 === 0) r = r * (1 - starFactor) + 1.6 * starFactor;
            else              r = r * (1 - starFactor) + 0.4 * starFactor;
            if (biasStrength > 0.1) {
                let diff = Math.abs(a - biasAngle);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                r += (1 - diff / Math.PI) * biasStrength * 1.5;
            }
            if (!isClean) r += this.rand(-0.05, 0.05);
            r = Math.max(0.3, Math.min(r, 8.0));
            dna.push({ a, r });
        }
        dna.variant = 'organic';
        return dna;
    }

    createGeometricKikiDNA(variant: string): Dna {
        const dna: Dna = [];
        const rot = this.rand(0, Math.PI * 2);
        if (variant === 'manager') {
            const pts = 60, hullVar = this.randInt(2, 5);
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                let r = (1.8 + 0.8 * Math.cos(a)) * 1.2;
                r += i % hullVar === 0 ? 1.2 * 1.2 : this.rand(0.1, 0.4) * 1.2;
                dna.push({ a, r });
            }
        } else if (variant === 'u_beam') {
            const w = 0.1;
            dna.push({ a: rot, r: 2.5 });
            dna.push({ a: rot + Math.PI / 2 - 0.1, r: w });
            dna.push({ a: rot + Math.PI / 2, r: w });
            dna.push({ a: rot + Math.PI, r: 2.5 });
            dna.push({ a: rot + Math.PI * 1.5 - 0.1, r: w });
            dna.push({ a: rot + Math.PI * 1.5, r: w });
        } else if (variant === 'u_chevron') {
            dna.push({ a: rot, r: 2.0 });
            dna.push({ a: rot + 2.5, r: 1.5 });
            dna.push({ a: rot + Math.PI, r: 0.2 });
            dna.push({ a: rot - 2.5, r: 1.5 });
        } else if (variant === 'u_antenna') {
            const pts = 8;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                let r = (i === 0 || i === 4) ? 2.2 : 0.4;
                if (i === 2 || i === 6) r = 1.0;
                dna.push({ a, r });
            }
        } else if (variant === 'u_shard') {
            const pts = 7;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                dna.push({ a, r: i === 0 ? 2.8 : 0.5 });
            }
        } else if (variant === 'u_circuit') {
            const pts = 12;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                let r = i % 4 === 0 ? 1.8 : 0.8;
                if (i === 0) r = 2.4;
                dna.push({ a, r });
            }
        } else if (variant === 'u_sawtooth') {
            const pts = 30;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                dna.push({ a, r: 1.6 });
                dna.push({ a: a + 0.1, r: 1.0 });
            }
        } else if (variant === 'u_shatter') {
            const pts = 12;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                dna.push({ a, r: this.rand(0.5, 2.5) });
            }
        } else if (variant === 'touch') {
            dna.push({ a: rot, r: 2.5 });
            dna.push({ a: rot + Math.PI * 0.5, r: 0.2 });
            dna.push({ a: rot + Math.PI, r: 2.5 });
            dna.push({ a: rot + Math.PI * 1.5, r: 0.2 });
        } else if (variant === 'star') {
            const points = 4;
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points + rot;
                dna.push({ a, r: 2.0 });
                dna.push({ a: a + Math.PI / points, r: 0.4 });
            }
        } else if (variant === 'blade') {
            const points = 24;
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points + rot;
                dna.push({ a, r: 1.5 });
                dna.push({ a: a + (Math.PI / points) * 0.8, r: 1.1 });
            }
        } else if (variant === 'bolt') {
            const pts = 7;
            for (let i = 0; i < pts; i++) {
                const a = (Math.PI * 2 * i) / pts + rot;
                let r = (i % 2 === 0) ? 1.8 : 0.6;
                r *= this.rand(0.5, 1.5);
                dna.push({ a, r });
            }
        } else if (variant === 'triangle_fat') {
            [{ a: 0 + rot, r: 0.7 }, { a: Math.PI * 0.7 + rot, r: 1.3 }, { a: Math.PI * 1.3 + rot, r: 1.3 }]
                .forEach(p => dna.push(p));
        } else {
            const sides = this.pick([5, 6, 8]);
            for (let i = 0; i < sides; i++) {
                const a = (Math.PI * 2 * i) / sides + rot;
                dna.push({ a, r: 1.4 });
            }
        }
        dna.forEach(p => { p.r = Math.min(p.r, 8.0); });
        dna.variant = variant;
        return dna;
    }

    createBoubaDNA(variant: string): Dna {
        const dna: Dna = [];
        const points = 60;
        const rot = this.rand(0, Math.PI * 2);
        if (variant === 'manager') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const r = (2.0 + 0.6 * Math.sin(3 * a) + 0.4 * Math.cos(7 * a) + 0.2 * Math.sin(2 * a)) * 1.2;
                dna.push({ a: a + rot, r });
            }
        } else if (variant === 'u_puddle') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const r = (1.0 + 0.1 * Math.sin(a * 3) + 0.5 * Math.sin(a)) * 0.8;
                dna.push({ a: a + rot, r });
            }
        } else if (variant === 'u_amoeba') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.2 + 0.3 * Math.sin(3 * a) + 0.2 * Math.cos(5 * a) });
            }
        } else if (variant === 'u_orbit') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.0 + 0.6 * Math.cos(a) });
            }
        } else if (variant === 'u_melt') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const r = Math.max(0.5, a > 0 && a < Math.PI ? 1.5 * Math.sin(a) : 0.8);
                dna.push({ a: a + rot, r });
            }
        } else if (variant === 'u_yolk') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.4 + 0.05 * Math.sin(12 * a) });
            }
        } else if (variant === 'u_worm') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 0.8 + 0.6 * Math.sin(a) });
            }
        } else if (variant === 'u_bubble') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.0 + 0.5 * Math.sin(3 * a) });
            }
        } else if (variant === 'u_capsule') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.0 + 0.8 * Math.pow(Math.abs(Math.cos(a)), 4) });
            }
        } else if (variant === 'u_eclipse') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                let r = 1.5 * (1 - 0.5 * Math.sin(a));
                if (a > Math.PI && a < 2 * Math.PI) r *= 0.4;
                dna.push({ a: a + rot, r });
            }
        } else if (variant === 'u_larva') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.0 + 0.2 * Math.sin(6 * a) + 0.4 * Math.cos(a) });
            }
        } else if (variant === 'u_pudding') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                let r = 1.2;
                if (a > 0 && a < Math.PI) r += 0.4 * Math.sin(a);
                dna.push({ a: a + rot, r });
            }
        } else if (variant === 'u_wormhole') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const r = Math.max(0.2, 1.5 * (1 - Math.cos(a))) * 0.6;
                dna.push({ a: a + rot, r });
            }
        } else if (variant === 'drop') {
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const r = Math.max(0.1, 1.5 * Math.pow(Math.sin(a / 2), 0.7));
                dna.push({ a: a + rot + Math.PI, r });
            }
        } else if (variant === 'clover') {
            const leaves = this.pick([3, 4]);
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                dna.push({ a: a + rot, r: 1.0 + 0.6 * Math.abs(Math.cos(leaves * a * 0.5)) });
            }
        } else if (variant === 'squircle') {
            const exponent = 4;
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const denom = Math.pow(
                    Math.pow(Math.abs(Math.cos(a)), exponent) +
                    Math.pow(Math.abs(Math.sin(a)), exponent),
                    1 / exponent
                );
                dna.push({ a: a + rot, r: 1.4 / denom });
            }
        } else {
            // default
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 * i) / points;
                const r = 1.0 + 0.3 * Math.sin(3 * a + rot) + 0.2 * Math.cos(5 * a + rot * 2);
                dna.push({ a: a + rot, r: Math.max(0.3, r) });
            }
        }
        dna.variant = variant;
        return dna;
    }

    getStandardDNA(type: string): Dna {
        if (type === 'kiki') {
            const v = this.pick(['organic','manager','u_beam','u_chevron','u_antenna','u_shard','u_circuit','u_sawtooth','u_shatter','touch','star','blade','bolt','triangle_fat']);
            return v === 'organic' ? this.createOrganicKikiDNA(this.R() > 0.5) : this.createGeometricKikiDNA(v);
        } else {
            return this.createBoubaDNA(this.pick(['default','manager','u_puddle','u_amoeba','u_orbit','u_melt','u_yolk','u_worm','u_bubble','u_capsule','u_eclipse','u_larva','u_pudding','u_wormhole','drop','clover','squircle']));
        }
    }

    getBossDNA(type: string, variant: string): Dna {
        if (type === 'kiki') {
            if (variant === 'manager') return this.createGeometricKikiDNA('manager');
            return this.createOrganicKikiDNA(false);
        } else {
            return this.createBoubaDNA(variant === 'manager' ? 'manager' : 'squircle');
        }
    }

    calc() {
        const pal = this.pickWeighted(PALETTES);
        const ar = this.pick(RATIOS);
        const voidRoll = this.R();
        let renderMode = 'standard';
        if (!pal.noVoid && voidRoll < 0.15) renderMode = 'void';
        else if (pal.void) renderMode = 'standard';

        const encounterTypes = ['standard','standard','standard','standard','standard','standard','standard','same_dna','boss'];
        const encounterType = this.pick(encounterTypes);
        const bossVariants = ['manager', 'u_puddle', 'u_amoeba'];
        const bossVariant = this.pick(bossVariants);

        const entities: Array<{ type: string; rx: number; ry: number; dna: Dna; scale: number; gapGene: number; pupil: string; isExpTarget: boolean }> = [];

        const addEnt = (type: string, rx: number, ry: number, _zoom: number, dna: Dna) => {
            const gapGene = this.rand(0.2, 0.95);
            const scale = this.rand(0.7, 1.4);
            const pupilTypes = ['round','slit','goat','cross','ring','star_pupil','x_pupil','void'];
            const pupil = this.pick(pupilTypes);
            const isExpTarget = this.R() > 0.5;
            entities.push({ type, rx, ry, dna, scale, gapGene, pupil, isExpTarget });
        };

        const zoomLevel = this.rand(0.25, 0.55);
        const p1 = { x: this.rand(0.2, 0.5), y: this.rand(0.25, 0.75) };
        const p2 = { x: this.rand(0.5, 0.8), y: this.rand(0.25, 0.75) };

        if (encounterType === 'boss') {
            const isKB = this.R() > 0.5;
            if (isKB) {
                addEnt('kiki',  p1.x, p1.y, zoomLevel, this.getBossDNA('kiki', bossVariant));
                addEnt('bouba', p2.x, p2.y, zoomLevel, this.getStandardDNA('bouba'));
            } else {
                addEnt('kiki',  p1.x, p1.y, zoomLevel, this.getStandardDNA('kiki'));
                addEnt('bouba', p2.x, p2.y, zoomLevel, this.getBossDNA('bouba', bossVariant));
            }
        } else if (encounterType === 'same_dna') {
            let sharedDNA: Dna;
            do { sharedDNA = this.getStandardDNA('kiki'); }
            while (sharedDNA.variant === 'touch' || sharedDNA.variant === 'u_beam');
            addEnt('kiki',  p1.x, p1.y, zoomLevel, sharedDNA);
            addEnt('bouba', p2.x, p2.y, zoomLevel, sharedDNA);
        } else {
            addEnt('kiki',  p1.x, p1.y, zoomLevel, this.getStandardDNA('kiki'));
            addEnt('bouba', p2.x, p2.y, zoomLevel, this.getStandardDNA('bouba'));
        }

        let mutation = 'NONE';
        const mutRoll = this.R();
        if      (mutRoll < 0.0018) mutation = 'GHOSTED';
        else if (mutRoll < 0.0268) mutation = 'TOTALINVERSION';
        else if (mutRoll < 0.1232) mutation = 'FLIPFLOPPER';
        else if (mutRoll < 0.1732) mutation = 'PEOPLEPLEASER';
        else if (mutRoll < 0.2232) mutation = 'SPELLCASTER';
        else if (mutRoll < 0.2732) mutation = 'ACQUIESCENCE';
        else if (mutRoll < 0.3232) mutation = 'GROUPTHINK';
        else if (mutRoll < 0.3482) mutation = 'RAGEBAIT';

        if (mutation === 'GROUPTHINK') {
            const kE = entities.find(e => e.type === 'kiki');
            if (kE && kE.dna && kE.dna.variant && BANNED_GROUPTHINK_VARIANTS.includes(kE.dna.variant)) {
                mutation = 'NONE';
            }
        }

        return { aspectRatio: ar, palette: pal, entities, zoomLevel, renderMode, mutation, encounterType };
    }

    traceShape(
        ctx: CanvasRenderingContext2D,
        cx: number, cy: number,
        dna: Dna, r: number,
        type: string,
        extra: { maxDist?: number; mutation?: string } = {}
    ): boolean {
        if (!isFinite(cx) || !isFinite(cy) || !isFinite(r)) return false;
        const maxDist = extra.maxDist || 1;
        const normR = r / maxDist;
        const mutation = extra.mutation || 'NONE';

        const pts = dna.map((pt, i) => {
            let m_a = pt.a, m_r = pt.r;
            if (mutation === 'PEOPLEPLEASER' && type === 'bouba') {
                let t = Math.min(1.0, normR * 1.3);
                t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                m_r = m_r * (1 - t) + 1.2 * t;
            }
            if (mutation === 'RAGEBAIT' && type === 'bouba') {
                if (i % 2 === 0) m_r += Math.pow(normR, 1.8) * 6.0;
            }
            return { x: cx + Math.cos(m_a) * (m_r * r), y: cy + Math.sin(m_a) * (m_r * r) };
        });

        if (pts.some(p => !isFinite(p.x) || !isFinite(p.y))) return false;

        if (type === 'kiki') {
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();
        } else {
            const f = pts[0], l = pts[pts.length - 1];
            ctx.moveTo((l.x + f.x) / 2, (l.y + f.y) / 2);
            for (let i = 0; i < pts.length; i++) {
                const n = pts[(i + 1) % pts.length], c = pts[i];
                ctx.quadraticCurveTo(c.x, c.y, (c.x + n.x) / 2, (c.y + n.y) / 2);
            }
            ctx.closePath();
        }
        return true;
    }

    drawShape(
        ctx: CanvasRenderingContext2D,
        cx: number, cy: number,
        dna: Dna, r: number, color: string,
        type: string,
        extra: { maxDist?: number; mutation?: string } = {}
    ) {
        ctx.beginPath();
        if (this.traceShape(ctx, cx, cy, dna, r, type, extra)) {
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    drawPupil(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number, type: string,
        coreColor: string
    ) {
        let color = '#FFF';
        const c = coreColor.toUpperCase();
        const isBright = (c === '#FFFFFF' || c === '#FFF' || c === '#E0E0E0' ||
                          c === '#88CCFF' || c === '#CCFF00' || c === '#FFFF00' || c === '#FFD700');
        if (isBright) color = '#000';
        else if (type === 'void') color = '#000';

        ctx.fillStyle = color;
        if (type === 'slit') {
            const w = size * 0.4, h = size * 1.8;
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
        } else if (type === 'goat') {
            const w = size * 2.0, h = size * 0.5;
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
        } else if (type === 'cross') {
            const w = size * 0.3, h = size * 1.8;
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
            ctx.fillRect(x - h / 2, y - w / 2, h, w);
        } else if (type === 'ring') {
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = coreColor;
            ctx.beginPath(); ctx.arc(x, y, size * 0.5, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'star_pupil') {
            for (let j = 0; j < 4; j++) {
                ctx.save(); ctx.translate(x, y); ctx.rotate(j * Math.PI / 4);
                ctx.fillRect(-size * 0.15, -size, size * 0.3, size * 2);
                ctx.restore();
            }
        } else if (type === 'x_pupil') {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
            ctx.fillRect(-size * 0.15, -size, size * 0.3, size * 2);
            ctx.fillRect(-size, -size * 0.15, size * 2, size * 0.3);
            ctx.restore();
        } else {
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        }
    }

    render(canvas: HTMLCanvasElement, width: number): number {
        const data = this.calc();
        const W = width;
        const H = W / data.aspectRatio;
        const MIN_DIM = Math.min(W, H);
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return data.aspectRatio;

        ctx.clearRect(0, 0, W, H);
        const { palette, entities, renderMode, mutation } = data;

        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, W, H);
        canvas.style.filter = 'none';

        if (mutation === 'GHOSTED') {
            ctx.globalCompositeOperation = 'hard-light';
            ctx.globalAlpha = 0.40;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        const absEntities = entities.map(e => ({ ...e, x: e.rx * W, y: e.ry * H }));

        let globalMaxDist = 0;
        const corners = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
        absEntities.forEach(e => {
            corners.forEach(c => {
                const d = this.dist(e.x, e.y, c.x, c.y);
                if (d > globalMaxDist) globalMaxDist = d;
            });
        });

        const bandCount = Math.floor(this.randInt(7, 22) * Math.max(1, data.aspectRatio * 0.8));
        const step = (globalMaxDist * 1.1) / bandCount;
        const baseCoreSize = MIN_DIM * 0.04;

        const ringRadii: number[] = [];
        for (let r = baseCoreSize + step; r < globalMaxDist * 1.5; r += step) ringRadii.push(r);
        ringRadii.reverse();

        let overlapR: number | null = null, bThick = 0;
        if (ringRadii.length > 0) {
            bThick = MIN_DIM * this.rand(0.02, 0.05);
            const targetR = MIN_DIM * this.rand(0.35, 0.55);
            overlapR = ringRadii.reduce((prev, curr) =>
                Math.abs(curr - targetR) < Math.abs(prev - targetR) ? curr : prev
            );
        }

        ringRadii.forEach((r, idx) => {
            if (r === overlapR) {
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, W, bThick);
                ctx.fillRect(0, H - bThick, W, bThick);
                ctx.fillRect(0, 0, bThick, H);
                ctx.fillRect(W - bThick, 0, bThick, H);
                ctx.restore();
            }

            const extra = { maxDist: globalMaxDist, mutation };
            absEntities.forEach(e => {
                if (mutation === 'GROUPTHINK' && e.type === 'kiki' && idx % 3 !== 0) return;

                let currentGapGene = e.gapGene;
                if (mutation === 'ACQUIESCENCE' && e.isExpTarget) {
                    currentGapGene = 0.05 + 0.85 * Math.pow(r / globalMaxDist, 1.5);
                }

                let gapR = r - step * (1 - currentGapGene);
                let mappedR = r, mappedGapR = gapR;

                if (mutation === 'SPELLCASTER' && e.type === 'bouba') {
                    mappedR = Math.pow(r / globalMaxDist, 2.0) * globalMaxDist;
                    mappedGapR = Math.pow(gapR / globalMaxDist, 2.0) * globalMaxDist;
                    const minThickness = MIN_DIM * 0.018;
                    if (mappedR - mappedGapR < minThickness) mappedGapR = mappedR - minThickness;
                }

                let shapeCol: string, gapCol: string;
                if (renderMode === 'wireframe') {
                    shapeCol = palette.bg;
                    gapCol = e.type === 'kiki' ? palette.kiki : palette.bouba;
                } else {
                    shapeCol = e.type === 'kiki' ? palette.kiki : palette.bouba;
                    gapCol = palette.gap;
                }
                if (shapeCol === gapCol) shapeCol = e.type === 'kiki' ? palette.kiki : palette.bouba;
                if (mutation === 'FLIPFLOPPER' && idx % 2 === 0) shapeCol = palette.bg;

                this.drawShape(ctx, e.x, e.y, e.dna, mappedR * e.scale, shapeCol, e.type, extra);
                this.drawShape(ctx, e.x, e.y, e.dna, mappedGapR * e.scale, gapCol, e.type, extra);
            });
        });

        // Core dots
        const finalColors: Map<typeof absEntities[0], string> = new Map();
        absEntities.forEach(e => {
            const coreCol = renderMode === 'wireframe' ? palette.bg : (e.type === 'kiki' ? palette.kiki : palette.bouba);
            finalColors.set(e, coreCol);
            this.drawShape(ctx, e.x, e.y, e.dna, baseCoreSize * e.scale, coreCol, e.type, { maxDist: globalMaxDist, mutation });
        });

        // Pupils
        absEntities.forEach(e => {
            const pSize = Math.max(4, (MIN_DIM * 0.012) * e.scale);
            this.drawPupil(ctx, e.x, e.y, pSize, e.pupil, finalColors.get(e) ?? palette.kiki);
        });

        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        if (mutation === 'TOTALINVERSION') {
            ctx.save();
            ctx.globalCompositeOperation = 'difference';
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 1.0;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        return data.aspectRatio;
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render Prisms artwork for tokenId into canvas at the given pixel width.
 * Sets canvas.width / canvas.height internally.
 * Returns the aspect ratio (width / height) so callers can apply a
 * matching CSS aspect-ratio on the wrapper element.
 */
export function renderPrisms(
    canvas: HTMLCanvasElement,
    tokenId: number,
    width: number
): number {
    const engine = new KikiEngine(tokenId);
    return engine.render(canvas, width);
}
