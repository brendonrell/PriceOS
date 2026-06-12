// @ts-nocheck
/*
 * Prisms engine v3 — palette gradients (Brendon 2026-06-12). The v2
 * ring-encounter system (the full kiki engine) is gone wholesale; the only
 * survivor is its palette table, still a deliberate, unnamed easter egg.
 * Each Output is one 3-stop linear gradient. Deterministic per tokenId:
 * calc() derives every param (palette, aspect ratio, angle) before paint,
 * so calc-only traits always agree with render().
 */

const MAIN_PALETTES = ["VID", "LAVALAMP", "RENDEZVOUS", "LSD", "NEONDRIFT", "FOLD"];
const WEIGHT_MAIN = 50;
const WEIGHT_SPECIAL = 12;

// Each palette: name + its three colours, painted as stops 0% / 50% / 100%.
const RAW_PALS = [
  {n:"VID",c:["#FFFFFF","#000000","#FF0000"]},
  {n:"LAVALAMP",c:["#D81B60","#D600FF","#FF1744"]},
  {n:"RENDEZVOUS",c:["#F0C993","#06EB8E","#B7EA08"]},
  {n:"LSD",c:["#9400d3","#00ff7f","#ff4500"]},
  {n:"NEONDRIFT",c:["#D600FF","#000080","#FF0000"]},
  {n:"FOLD",c:["#00FF66","#4B0C51","#00FFD5"]},
  {n:"782",c:["#13716B","#1B9D89","#FF3341"]},
  {n:"AESTHETE",c:["#0066FF","#FF9900","#FF00E6"]},
  {n:"AFILM",c:["#3DD2E9","#45E021","#F5B6DB"]},
  {n:"ATTENTION",c:["#0D4AF2","#E600FF","#FFE600"]},
  {n:"ATTODRIFT",c:["#D2A614","#1440D2","#9FD214"]},
  {n:"AXIS",c:["#FFFF00","#000000","#0000FF"]},
  {n:"BB",c:["#FF0000","#AA5500","#311B92"]},
  {n:"BEACH",c:["#000000","#00FFCC","#FF0099"]},
  {n:"BERRY2",c:["#FF0055","#FF1493","#0000FF"]},
  {n:"BIT",c:["#ADFF2F","#D8BFD8","#FF0000"]},
  {n:"BLUNTDREG",c:["#FC0BF6","#E96C45","#E0AF86"]},
  {n:"BLUNTVOID",c:["#9BFFA6","#00FF4C","#8500FF"]},
  {n:"BONEPULSE",c:["#660066","#808080","#FF1493"]},
  {n:"CHEWY",c:["#6B8E23","#ADFF2F","#FF0000"]},
  {n:"COOKIES",c:["#EE82EE","#FF6347","#121212"]},
  {n:"CRYPTOCURRENCY",c:["#A71DE7","#F32B35","#AAB305"]},
  {n:"CYBERGEM",c:["#132AF4","#8C02EB","#011D6D"]},
  {n:"DARKHUNT",c:["#95FF00","#6A00FF","#00FFEA"]},
  {n:"DOOM",c:["#A7D279","#000000","#00FF00"]},
  {n:"EGOMATH",c:["#488BE7","#EE65D7","#971689"]},
  {n:"EGOTOOL",c:["#9041AA","#2F53F4","#5240F2"]},
  {n:"ERROR",c:["#481655","#290C2C","#5CFF33"]},
  {n:"EXPERIENCE",c:["#FF4500","#FF1493","#CD5C5C"]},
  {n:"FOGOFWAR",c:["#88918D","#FF335F","#898084"]},
  {n:"FRESHSLAG",c:["#BC8F8F","#FF1493","#006400"]},
  {n:"FUMEGEM",c:["#FF1744","#5500FF","#1E90FF"]},
  {n:"GNOSIS",c:["#454628","#6D3BE9","#EC1D11"]},
  {n:"GRID",c:["#0000FF","#FFFFFF","#FF0000"]},
  {n:"GTA4",c:["#C86432","#B056FA","#000000"]},
  {n:"HAZE2",c:["#B899D4","#BDD993","#354B46"]},
  {n:"HAZE3",c:["#75EEF7","#0DDC3F","#BD8AC5"]},
  {n:"HELIUMGLAND",c:["#6200EA","#FF4081","#2E002E"]},
  {n:"HIGHBOT",c:["#EE82EE","#00FF7F","#40E0D0"]},
  {n:"HOPIUM",c:["#FF00FF","#DC143C","#2E8B57"]},
  {n:"HOTHURT",c:["#EE82EE","#FFD700","#FF0055"]},
  {n:"HUH",c:["#E9967A","#20B2AA","#9370DB"]},
  {n:"HYPNO",c:["#00FFA1","#FFFFFF","#000000"]},
  {n:"LINEN",c:["#F6B95A","#5005CA","#ACFD29"]},
  {n:"MACHINEELF",c:["#00FF7F","#FF00FF","#FFFF00"]},
  {n:"MARROW",c:["#FF1744","#FF1493","#708090"]},
  {n:"MESMER",c:["#FF4500","#E6E6FA","#D500F9"]},
  {n:"MIXEDDRINK",c:["#FF00FF","#F44336","#00FFCC"]},
  {n:"MOIST",c:["#0100FF","#4A1036","#D098A0"]},
  {n:"MYTHOUGHTS",c:["#FAD1E5","#FCFF33","#F7BAD8"]},
  {n:"NUMB",c:["#4E3226","#5E4625","#0003FF"]},
  {n:"OKC",c:["#0000FF","#000000","#FF6347"]},
  {n:"OMNIFORM",c:["#D293B1","#C06892","#3D1A2B"]},
  {n:"OOZE",c:["#FF0055","#5500FF","#00FF55"]},
  {n:"ORDER",c:["#51DC6E","#29EEA6","#99B85C"]},
  {n:"PLASMA",c:["#3F51B5","#FF4081","#002147"]},
  {n:"POISON",c:["#741A43","#4B1124","#33FFA3"]},
  {n:"PRECOGNITION",c:["#FAD1E5","#F7BAD8","#33FF9C"]},
  {n:"PUREHEAT",c:["#84FF00","#D4FF00","#9900FF"]},
  {n:"RIPE",c:["#457359","#FF5F33","#C5FF33"]},
  {n:"ROOT",c:["#D81B60","#6200EA","#3D0C02"]},
  {n:"RURALLUSH",c:["#1EBFD1","#23E279","#4702F8"]},
  {n:"SENSITIVE",c:["#1D00FF","#C10E85","#394837"]},
  {n:"SEX",c:["#00FFFF","#EE82EE","#00FF7F"]},
  {n:"SIMPLE",c:["#1941C8","#8607F3","#747474"]},
  {n:"SMOKEBREAK",c:["#5D4037","#2E0854","#304FFE"]},
  {n:"SMS",c:["#1E90FF","#00FF00","#FF1493"]},
  {n:"SOFT",c:["#391797","#2D106A","#C9FF33"]},
  {n:"SYRUP",c:["#B2FF59","#304FFE","#D50000"]},
  {n:"T",c:["#D500F9","#002200","#FF6600"]},
  {n:"TELEPATHY",c:["#708090","#BDB76B","#FF1493"]},
  {n:"TELESTHESIA",c:["#006AFF","#FF9500","#FF00EA"]},
  {n:"THUNDER",c:["#A0522D","#FF0000","#0a0005"]},
  {n:"TINDER",c:["#B388FF","#E1BEE7","#FF0000"]},
  {n:"TOAST",c:["#EE82EE","#0055FF","#FF9900"]},
  {n:"TUNEPASTE",c:["#FF1493","#008080","#8B008B"]},
  {n:"VAIN2",c:["#4DCCE5","#EF80B6","#371F47"]},
  {n:"VHS",c:["#FF0055","#0055FF","#FF9900"]},
  {n:"VISION",c:["#0C6BF5","#6A5081","#743664"]},
  {n:"WASH",c:["#FF00FF","#AA00FF","#40E0D0"]},
  {n:"WAVEDEATH",c:["#d4aaf2","#000000","#444444"]},
  {n:"WEIRDPOSE",c:["#D2691E","#FFFF00","#FF0000"]},
  {n:"WHAT",c:["#BDB76B","#FF1493","#1E90FF"]},
  {n:"ZAP",c:["#ffd700","#0000ff","#ff0000"]},
  {n:"ZEPTOALLOY",c:["#800000","#000080","#FF0000"]},
  {n:"ZERORISK",c:["#BDB76B","#000000","#4B0082"]},
  {n:"BAG",c:["#F21C27","#6A09F1","#31A30A"]},
  {n:"CRUSH",c:["#050005","#D600FF","#FF0099"]},
  {n:"DEEP",c:["#000005","#FF6600","#0055FF"]},
  {n:"ENERGY",c:["#2F4F4F","#AA00FF","#FF9900"]},
  {n:"HOLOGRAM",c:["#000000","#00FFFF","#7FFFD4"]},
  {n:"NOSKY",c:["#000000","#652565","#4414F0"]},
  {n:"NOTREAL",c:["#48062F","#00FFC2","#8A36FF"]},
  {n:"PATIENCE",c:["#000000","#3A122B","#BADA01"]},
  {n:"SHROOMY",c:["#1A001A","#00FF99","#FF99CC"]},
  {n:"THERMAL",c:["#000000","#FF3300","#FFD700"]},
  {n:"TOMATO",c:["#080000","#00FF66","#FF4400"]},
  {n:"ULTRALINK",c:["#091406","#66FF8C","#D2FF4D"]},
  {n:"VAMPIRE",c:["#000000","#FF0000","#E0E0E0"]},
  {n:"ZEPTOCASH",c:["#3f0a06","#2dff60","#a0a185"]},];

const PALETTES = RAW_PALS.map((p) => ({
    name: p.n,
    stops: p.c,
    weight: MAIN_PALETTES.includes(p.n) ? WEIGHT_MAIN : WEIGHT_SPECIAL,
}));

const RATIOS = [1.6, 2.35, 2.35, 2.75, 3.2, 1.33, 1, 0.75];

function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export class PrismsEngine {
    constructor(seed) { this.seed = seed; this.R = mulberry32(((Math.imul(seed >>> 0, 2654435761)) >>> 0) || 1); }
    pick(arr) { return arr[Math.floor(this.R() * arr.length)]; }
    pickWeighted(arr) { const total = arr.reduce((acc, item) => acc + item.weight, 0); let sum = 0; const r = this.R() * total; for (let item of arr) { sum += item.weight; if (r <= sum) return item; } return arr[0]; }
    calc() {
        const palette = this.pickWeighted(PALETTES);
        const aspectRatio = this.pick(RATIOS);
        // 37° steps off the tokenId — the reference page's angle spacing.
        const angle = ((this.seed * 37 + 15) % 360 + 360) % 360;
        return { aspectRatio, palette, angle };
    }
    render(canvas, width) {
        const data = this.calc();
        const W = width, H = W / data.aspectRatio;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        // CSS linear-gradient(angle) geometry: line through the centre,
        // 0deg = up, clockwise; length |W·sin| + |H·cos| (corner-to-corner
        // coverage), so the canvas paints exactly what the CSS would.
        const rad = (data.angle * Math.PI) / 180;
        const half = (Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad))) / 2;
        const dx = Math.sin(rad) * half, dy = -Math.cos(rad) * half;
        const grad = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
        grad.addColorStop(0, data.palette.stops[0]);
        grad.addColorStop(0.5, data.palette.stops[1]);
        grad.addColorStop(1, data.palette.stops[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        return data;
    }
}

export const PRISMS_PALETTE_NAMES = PALETTES.map((p) => p.name);
export const PRISMS_MAIN_PALETTES = MAIN_PALETTES;
export const PRISMS_RATIOS = RATIOS;
