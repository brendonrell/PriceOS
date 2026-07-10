/*
 * Sealed-pack wrapper generator — one on-chain-ready SVG per sticker sheet.
 *
 *   node scripts/generate-sticker-wrappers.js
 *
 * Reads the LIVE catalog (lib/stickers/catalog.ts) + the real logo paths, so a
 * NEW SHEET gets its wrapper automatically: add the sheet to the catalog, run
 * this, and its wrapper lands in assets/sticker-wrappers/<id>.svg. These are
 * the images PDStickers stores on-chain per sheet (createSheet's svgData) —
 * what OpenSea shows for a sealed pack until it's peeled.
 *
 * House style: sheet identity colour as the wrap, the PD ‰ bubble (real
 * paths; Petey rotated), the sheet's cover motif full-strength, a whisper ‰
 * wrapping-paper texture, kiss-cut dashed inset, black SEALED corner band,
 * Courier bold type. Self-contained (no fonts, no external refs) — safe for
 * SSTORE2 + OpenSea's sandbox. Approved set: Brendon, 2026-07-10.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'sticker-wrappers');
fs.mkdirSync(OUT, { recursive: true });

// Bundle the TS catalog + logo paths so this plain-node script can read them.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-wrappers-'));
const esbuild = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
execSync(`"${esbuild}" lib/stickers/catalog.ts --bundle --platform=node --format=cjs --outfile="${tmp}/catalog.cjs" --log-level=silent`, { cwd: ROOT });
execSync(`"${esbuild}" lib/stickers/logoPaths.ts --bundle --platform=node --format=cjs --outfile="${tmp}/logoPaths.cjs" --log-level=silent`, { cwd: ROOT });
const { SHEETS } = require(path.join(tmp, 'catalog.cjs'));
const LP = require(path.join(tmp, 'logoPaths.cjs'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function lum(hex) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
const inkFor = (hex) => (lum(hex) >= 140 ? '#1A1A1A' : '#FFFFFF');

/* The PD ‰ bubble at a given box, from the REAL logo paths (761×655 box). */
function bubble(x, y, w, fill, ink, rotated, holoId) {
  const s = w / 761;
  const fillAttr = holoId ? `url(#${holoId})` : fill;
  return `<g transform="translate(${x} ${y}) scale(${s})${rotated ? ` rotate(-90 ${761 / 2} ${655 / 2})` : ''}">` +
    `<path d="${LP.PETEY_BUBBLE_PATH}" fill="${fillAttr}"/>` +
    `<path d="${LP.PETEY_GLYPH_PATH}" fill="${ink}"/>` +
    `<path d="${LP.PETEY_DOT_RIGHT_PATH}" fill="${fillAttr}"/>` +
    `<path d="${LP.PETEY_DOT_LEFT_PATH}" fill="${fillAttr}"/>` +
    `<path d="${LP.PETEY_DOT_TOP_PATH}" fill="${fillAttr}"/>` +
    `</g>`;
}

/* Fit a name into up to 2 lines of big Courier caps. */
function nameLines(name) {
  const words = name.split(' ');
  if (words.length === 1 || name.length <= 10) return [name];
  let best = [name], bestMax = name.length;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const m = Math.max(a.length, b.length);
    if (m < bestMax) { bestMax = m; best = [a, b]; }
  }
  return best;
}

function wrapperSVG(sh) {
  const base = sh.cover.color || sh.cover.bg || '#FF0055';
  const ink = inkFor(base);
  const isHolo = !!sh.cover.holo;
  const holoDefs = isHolo ? `
  <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0%" stop-color="#FF6EC4"/><stop offset="22%" stop-color="#7873F5"/>
   <stop offset="44%" stop-color="#4ADEDE"/><stop offset="66%" stop-color="#9EFF6E"/>
   <stop offset="84%" stop-color="#FFE86E"/><stop offset="100%" stop-color="#FF9F6E"/>
  </linearGradient>` : '';
  const bg = isHolo ? 'url(#holo)' : base;
  const inkH = isHolo ? '#1A1A1A' : ink;

  // Wrapping-paper texture: the ‰ bubble tiled diagonally, whisper-quiet.
  const texScale = 0.07;
  let tex = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const x = -30 + c * 120 + (r % 2 ? 60 : 0);
      const y = -20 + r * 112;
      tex += `<use href="#tb" x="${x / texScale}" y="${y / texScale}"/>`;
    }
  }

  const lines = nameLines(sh.name);
  const nameSize = Math.min(64, Math.floor(520 / (Math.max(...lines.map((l) => l.length)) * 0.62)));
  const nameY = lines.length === 2 ? 418 : 462;
  const nameEls = lines.map((l, i) =>
    `<text x="300" y="${nameY + i * (nameSize + 8)}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-weight="bold" font-size="${nameSize}" fill="${inkH}">${esc(l)}</text>`).join('');

  // Centre motif: the real bubble for logo covers; a glyph chip otherwise.
  let motif = '';
  const kind = sh.cover.kind;
  if (kind === 'logo' || kind === 'output' || !((sh.cover.glyph) || (sh.cover.frames && sh.cover.frames[0]))) {
    motif = bubble(190, 130, 220, isHolo ? null : inkH, isHolo ? '#1A1A1A' : base, !!sh.cover.rotated, isHolo ? 'holo' : null);
  } else {
    const glyph = sh.cover.frames ? sh.cover.frames[0] : sh.cover.glyph;
    const gLines = String(glyph).split('\n');
    const maxLen = Math.max(...gLines.map((l) => [...l].length));
    const fs2 = Math.min(64, Math.floor(300 / (maxLen * 0.62)), Math.floor(150 / gLines.length));
    const chipW = Math.min(420, Math.max(220, maxLen * fs2 * 0.64 + 60));
    const chipH = Math.max(140, gLines.length * fs2 * 1.15 + 50);
    const cy = 230;
    const g0 = cy - ((gLines.length - 1) * fs2 * 1.12) / 2;
    motif = `<rect x="${300 - chipW / 2}" y="${cy - chipH / 2}" width="${chipW}" height="${chipH}" rx="26" fill="${inkH}"/>` +
      gLines.map((l, i) =>
        `<text x="300" y="${g0 + i * fs2 * 1.12}" text-anchor="middle" dominant-baseline="central" font-family="'Courier New',Courier,monospace" font-weight="bold" font-size="${fs2}" fill="${base}">${esc(l)}</text>`).join('');
  }

  const band = `<g transform="rotate(45 480 120)">
   <rect x="330" y="96" width="300" height="48" fill="#1A1A1A"/>
   <text x="480" y="128" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-weight="bold" font-size="30" letter-spacing="6" fill="${isHolo ? '#FFE86E' : base}">SEALED</text>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
 <defs>${holoDefs}
  <g id="tb" opacity="0.06"><path d="${LP.PETEY_BUBBLE_PATH}" fill="${inkH}"/></g>
 </defs>
 <rect width="600" height="600" fill="${bg}"/>
 <g transform="scale(${texScale})">${tex}</g>
 <rect x="18" y="18" width="564" height="564" rx="24" fill="none" stroke="${inkH}" stroke-opacity="0.85" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>
 ${motif}
 ${nameEls}
 <text x="300" y="${lines.length === 2 ? 538 : 520}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-weight="bold" font-size="20" letter-spacing="3" fill="${inkH}">${esc(sh.tag)} · ${sh.count} STICKERS · PEEL TO REVEAL</text>
 <g transform="translate(36 34) scale(0.055)"><path d="${LP.PETEY_BUBBLE_PATH}" fill="${inkH}"/><path d="${LP.PETEY_GLYPH_PATH}" fill="${bg === 'url(#holo)' ? '#FFE86E' : base}"/></g>
 <text x="92" y="66" font-family="'Courier New',Courier,monospace" font-weight="bold" font-size="17" letter-spacing="5" fill="${inkH}">PRICE DISCUSSION</text>
 ${band}
</svg>`;
}

for (const sh of SHEETS) {
  const svg = wrapperSVG(sh);
  fs.writeFileSync(path.join(OUT, `${sh.id}.svg`), svg);
  console.log(`${sh.id}.svg`, Buffer.byteLength(svg), 'bytes');
}
console.log(`\n${SHEETS.length} wrappers → assets/sticker-wrappers/`);
