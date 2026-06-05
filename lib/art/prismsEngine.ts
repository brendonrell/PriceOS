/*
 * prismsEngine — Prisms placeholder art (gradient).
 *
 * Faithful port of the gallery art-placeholder from reference/Prismsdemo.html
 * (the CSS-gradient mode, NOT the shape/creature canvas — that engine is the
 * artist's IP and is intentionally not ported). Each token paints a linear
 * gradient built from one of the project's palettes:
 *
 *     linear-gradient((id*37+15)deg, palette.bg 0%, palette.kiki 50%, palette.bouba 100%)
 *
 * Palette + aspect ratio are selected per-id with the demo's exact RNG
 * (mulberry32, pickWeighted on PALETTES, then pick on RATIOS — same draw
 * order as the demo's calc(), so colours match the reference). RUN_OFFSET is
 * 0 here (the demo randomised it per session for variety; the app wants a
 * stable gradient per id). Nothing added beyond the reference.
 *
 * Public contract unchanged: renderPrisms(canvas, tokenId, width) sizes the
 * canvas and returns the aspect ratio (width / height).
 */

type RawPal = { n: string; b: string; g: string; k: string; o: string; nv?: number; p?: number; w?: number };

const RAW_PALS: RawPal[] =
[
        {n:"VID",b:"#FFFFFF",g:"#FFFFFF",k:"#000000",o:"#FF0000",nv:1},{n:"LAVALAMP",b:"#D81B60",g:"#D81B60",k:"#D600FF",o:"#FF1744"},{n:"RENDEZVOUS",b:"#F0C993",g:"#F0C993",k:"#06EB8E",o:"#B7EA08",nv:1},{n:"LSD",b:"#9400d3",g:"#9400d3",k:"#00ff7f",o:"#ff4500",nv:1},{n:"NEONDRIFT",b:"#D600FF",g:"#D600FF",k:"#000080",o:"#FF0000",nv:1},{n:"FOLD",b:"#00FF66",g:"#00FF66",k:"#4B0C51",o:"#00FFD5",nv:1},{n:"782",b:"#13716B",g:"#13716B",k:"#1B9D89",o:"#FF3341",nv:1},{n:"AESTHETE",b:"#0066FF",g:"#0066FF",k:"#FF9900",o:"#FF00E6",nv:1},{n:"AFILM",b:"#3DD2E9",g:"#3DD2E9",k:"#45E021",o:"#F5B6DB",nv:1},{n:"ATTENTION",b:"#0D4AF2",g:"#0D4AF2",k:"#E600FF",o:"#FFE600",nv:1},{n:"ATTODRIFT",b:"#D2A614",g:"#D2A614",k:"#1440D2",o:"#9FD214",nv:1},{n:"AXIS",b:"#FFFF00",g:"#FFFF00",k:"#000000",o:"#0000FF",nv:1},{n:"BB",b:"#FF0000",g:"#FF0000",k:"#AA5500",o:"#311B92",nv:1},{n:"BEACH",b:"#000000",g:"#000000",k:"#00FFCC",o:"#FF0099",nv:1},{n:"BERRY2",b:"#FF0055",g:"#FF0055",k:"#FF1493",o:"#0000FF",nv:1},{n:"BIT",b:"#ADFF2F",g:"#ADFF2F",k:"#D8BFD8",o:"#FF0000",nv:1},{n:"BLUNTDREG",b:"#FC0BF6",g:"#FC0BF6",k:"#E96C45",o:"#E0AF86",nv:1},{n:"BLUNTVOID",b:"#9BFFA6",g:"#9BFFA6",k:"#00FF4C",o:"#8500FF",nv:1},{n:"BONEPULSE",b:"#660066",g:"#660066",k:"#808080",o:"#FF1493",nv:1},{n:"CHEWY",b:"#6B8E23",g:"#6B8E23",k:"#ADFF2F",o:"#FF0000",nv:1},{n:"COOKIES",b:"#EE82EE",g:"#EE82EE",k:"#FF6347",o:"#121212",nv:1},{n:"CRYPTOCURRENCY",b:"#A71DE7",g:"#A71DE7",k:"#F32B35",o:"#AAB305",nv:1},{n:"CYBERGEM",b:"#132AF4",g:"#132AF4",k:"#8C02EB",o:"#011D6D",nv:1},{n:"DARKHUNT",b:"#95FF00",g:"#95FF00",k:"#6A00FF",o:"#00FFEA",nv:1},{n:"DOOM",b:"#A7D279",g:"#A7D279",k:"#000000",o:"#00FF00",nv:1},{n:"EGOMATH",b:"#488BE7",g:"#488BE7",k:"#EE65D7",o:"#971689",nv:1},{n:"EGOTOOL",b:"#9041AA",g:"#9041AA",k:"#2F53F4",o:"#5240F2",nv:1},{n:"ERROR",b:"#481655",g:"#481655",k:"#290C2C",o:"#5CFF33",nv:1},{n:"EXPERIENCE",b:"#FF4500",g:"#FF4500",k:"#FF1493",o:"#CD5C5C",nv:1},{n:"FOGOFWAR",b:"#88918D",g:"#88918D",k:"#FF335F",o:"#898084",nv:1},{n:"FRESHSLAG",b:"#BC8F8F",g:"#BC8F8F",k:"#FF1493",o:"#006400",nv:1},{n:"FUMEGEM",b:"#FF1744",g:"#FF1744",k:"#5500FF",o:"#1E90FF",nv:1},{n:"GNOSIS",b:"#454628",g:"#454628",k:"#6D3BE9",o:"#EC1D11",nv:1},{n:"GRID",b:"#0000FF",g:"#0000FF",k:"#FFFFFF",o:"#FF0000",nv:1},{n:"GTA4",b:"#C86432",g:"#C86432",k:"#B056FA",o:"#000000",nv:1},{n:"HAZE2",b:"#B899D4",g:"#B899D4",k:"#BDD993",o:"#354B46",nv:1},{n:"HAZE3",b:"#75EEF7",g:"#75EEF7",k:"#0DDC3F",o:"#BD8AC5",nv:1},{n:"HELIUMGLAND",b:"#6200EA",g:"#6200EA",k:"#FF4081",o:"#2E002E",nv:1},{n:"HIGHBOT",b:"#EE82EE",g:"#EE82EE",k:"#00FF7F",o:"#40E0D0",nv:1},{n:"HOPIUM",b:"#FF00FF",g:"#FF00FF",k:"#DC143C",o:"#2E8B57",nv:1},{n:"HOTHURT",b:"#EE82EE",g:"#EE82EE",k:"#FFD700",o:"#FF0055",nv:1},{n:"HUH",b:"#E9967A",g:"#E9967A",k:"#20B2AA",o:"#9370DB",nv:1},{n:"HYPNO",b:"#00FFA1",g:"#00FFA1",k:"#FFFFFF",o:"#000000",nv:1},{n:"LINEN",b:"#F6B95A",g:"#F6B95A",k:"#5005CA",o:"#ACFD29",nv:1},{n:"MACHINEELF",b:"#00FF7F",g:"#00FF7F",k:"#FF00FF",o:"#FFFF00",nv:1},{n:"MARROW",b:"#FF1744",g:"#FF1744",k:"#FF1493",o:"#708090",nv:1},{n:"MESMER",b:"#FF4500",g:"#FF4500",k:"#E6E6FA",o:"#D500F9",nv:1},{n:"MIXEDDRINK",b:"#FF00FF",g:"#FF00FF",k:"#F44336",o:"#00FFCC",nv:1},{n:"MOIST",b:"#0100FF",g:"#0100FF",k:"#4A1036",o:"#D098A0",nv:1},{n:"MYTHOUGHTS",b:"#FAD1E5",g:"#FAD1E5",k:"#FCFF33",o:"#F7BAD8",nv:1},{n:"NUMB",b:"#4E3226",g:"#4E3226",k:"#5E4625",o:"#0003FF",nv:1},{n:"OKC",b:"#0000FF",g:"#0000FF",k:"#000000",o:"#FF6347",nv:1},{n:"OMNIFORM",b:"#D293B1",g:"#D293B1",k:"#C06892",o:"#3D1A2B",nv:1},{n:"OOZE",b:"#FF0055",g:"#FF0055",k:"#5500FF",o:"#00FF55",nv:1},{n:"ORDER",b:"#51DC6E",g:"#51DC6E",k:"#29EEA6",o:"#99B85C",nv:1},{n:"PLASMA",b:"#3F51B5",g:"#3F51B5",k:"#FF4081",o:"#002147",nv:1},{n:"POISON",b:"#741A43",g:"#741A43",k:"#4B1124",o:"#33FFA3",nv:1},{n:"PRECOGNITION",b:"#FAD1E5",g:"#FAD1E5",k:"#F7BAD8",o:"#33FF9C",nv:1},{n:"PUREHEAT",b:"#84FF00",g:"#84FF00",k:"#D4FF00",o:"#9900FF",nv:1},{n:"RIPE",b:"#457359",g:"#457359",k:"#FF5F33",o:"#C5FF33",nv:1},{n:"ROOT",b:"#D81B60",g:"#D81B60",k:"#6200EA",o:"#3D0C02",nv:1},{n:"RURALLUSH",b:"#1EBFD1",g:"#1EBFD1",k:"#23E279",o:"#4702F8",nv:1},{n:"SENSITIVE",b:"#1D00FF",g:"#1D00FF",k:"#C10E85",o:"#394837",nv:1},{n:"SEX",b:"#00FFFF",g:"#00FFFF",k:"#EE82EE",o:"#00FF7F",nv:1},{n:"SIMPLE",b:"#1941C8",g:"#1941C8",k:"#8607F3",o:"#747474",nv:1},{n:"SMOKEBREAK",b:"#5D4037",g:"#5D4037",k:"#2E0854",o:"#304FFE",nv:1},{n:"SMS",b:"#1E90FF",g:"#1E90FF",k:"#00FF00",o:"#FF1493",nv:1},{n:"SOFT",b:"#391797",g:"#391797",k:"#2D106A",o:"#C9FF33",nv:1},{n:"SYRUP",b:"#B2FF59",g:"#B2FF59",k:"#304FFE",o:"#D50000",nv:1},{n:"T",b:"#D500F9",g:"#D500F9",k:"#002200",o:"#FF6600",nv:1},{n:"TELEPATHY",b:"#708090",g:"#708090",k:"#BDB76B",o:"#FF1493",nv:1},{n:"TELESTHESIA",b:"#006AFF",g:"#006AFF",k:"#FF9500",o:"#FF00EA",nv:1},{n:"THUNDER",b:"#A0522D",g:"#A0522D",k:"#FF0000",o:"#0a0005",nv:1},{n:"TINDER",b:"#B388FF",g:"#B388FF",k:"#E1BEE7",o:"#FF0000",nv:1},{n:"TOAST",b:"#EE82EE",g:"#EE82EE",k:"#0055FF",o:"#FF9900",nv:1},{n:"TUNEPASTE",b:"#FF1493",g:"#FF1493",k:"#008080",o:"#8B008B",nv:1},{n:"VAIN2",b:"#4DCCE5",g:"#4DCCE5",k:"#EF80B6",o:"#371F47",nv:1},{n:"VHS",b:"#FF0055",g:"#FF0055",k:"#0055FF",o:"#FF9900",nv:1},{n:"VISION",b:"#0C6BF5",g:"#0C6BF5",k:"#6A5081",o:"#743664",nv:1},{n:"WASH",b:"#FF00FF",g:"#FF00FF",k:"#AA00FF",o:"#40E0D0",nv:1},{n:"WAVEDEATH",b:"#d4aaf2",g:"#d4aaf2",k:"#000000",o:"#444444",nv:1},{n:"WEIRDPOSE",b:"#D2691E",g:"#D2691E",k:"#FFFF00",o:"#FF0000",nv:1},{n:"WHAT",b:"#BDB76B",g:"#BDB76B",k:"#FF1493",o:"#1E90FF",nv:1},{n:"ZAP",b:"#ffd700",g:"#ffd700",k:"#0000ff",o:"#ff0000",nv:1},{n:"ZEPTOALLOY",b:"#800000",g:"#800000",k:"#000080",o:"#FF0000",nv:1},{n:"ZERORISK",b:"#BDB76B",g:"#BDB76B",k:"#000000",o:"#4B0082",nv:1},{n:"BAG",b:"#F21C27",g:"#F21C27",k:"#6A09F1",o:"#31A30A",nv:0},{n:"CRUSH",b:"#050005",g:"#050005",k:"#D600FF",o:"#FF0099"},{n:"DEEP",b:"#000005",g:"#000005",k:"#FF6600",o:"#0055FF"},{n:"ENERGY",b:"#2F4F4F",g:"#2F4F4F",k:"#AA00FF",o:"#FF9900"},{n:"HOLOGRAM",b:"#000000",g:"#000000",k:"#00FFFF",o:"#7FFFD4"},{n:"NOSKY",b:"#000000",g:"#000000",k:"#652565",o:"#4414F0",nv:0},{n:"NOTREAL",b:"#48062F",g:"#48062F",k:"#00FFC2",o:"#8A36FF"},{n:"PATIENCE",b:"#000000",g:"#000000",k:"#3A122B",o:"#BADA01",nv:0},{n:"SHROOMY",b:"#1A001A",g:"#1A001A",k:"#00FF99",o:"#FF99CC"},{n:"THERMAL",b:"#000000",g:"#000000",k:"#FF3300",o:"#FFD700"},{n:"TOMATO",b:"#080000",g:"#000000",k:"#00FF66",o:"#FF4400"},{n:"ULTRALINK",b:"#091406",g:"#091406",k:"#66FF8C",o:"#D2FF4D"},{n:"VAMPIRE",b:"#000000",g:"#000000",k:"#FF0000",o:"#E0E0E0"},{n:"ZEPTOCASH",b:"#3f0a06",g:"#3f0a06",k:"#2dff60",o:"#a0a185",w:4},
    ];

const MAIN_PALETTES = ['VID', 'LAVALAMP', 'RENDEZVOUS', 'LSD', 'NEONDRIFT', 'FOLD'];
const WEIGHT_MAIN = 50;
const WEIGHT_SPECIAL = 12;

interface Palette { bg: string; kiki: string; bouba: string; weight: number; }

const PALETTES: Palette[] = RAW_PALS.map((p) => ({
    bg: p.b,
    kiki: p.k,
    bouba: p.o,
    weight: MAIN_PALETTES.indexOf(p.n) !== -1 ? WEIGHT_MAIN : WEIGHT_SPECIAL,
}));

const RATIOS = [1.6, 2.35, 2.35, 2.75, 3.2, 1.33, 1, 0.75];
const RUN_OFFSET = 0;

function mulberry32(a: number): () => number {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickWeighted(arr: Palette[], R: () => number): Palette {
    const total = arr.reduce((acc, item) => acc + item.weight, 0);
    let sum = 0;
    const r = R() * total;
    for (const item of arr) {
        sum += item.weight;
        if (r <= sum) return item;
    }
    return arr[0];
}

function pick<T>(arr: T[], R: () => number): T {
    return arr[Math.floor(R() * arr.length)];
}

export function renderPrisms(
    canvas: HTMLCanvasElement,
    tokenId: number,
    width: number,
): number {
    const R = mulberry32(tokenId + RUN_OFFSET);
    // Same draw order as the demo's calc(): palette first, then ratio.
    const pal = pickWeighted(PALETTES, R);
    const aspect = pick(RATIOS, R);
    const angle = (tokenId * 37 + 15) % 360;

    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.floor(W / aspect));
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    if (!ctx) return aspect;

    // CSS angle (0deg = up, clockwise) -> canvas gradient line through centre.
    const rad = (angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const cx = W / 2;
    const cy = H / 2;
    const half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
    const grad = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    grad.addColorStop(0, pal.bg);
    grad.addColorStop(0.5, pal.kiki);
    grad.addColorStop(1, pal.bouba);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    return aspect;
}
