// @ts-nocheck
/*
 * ============================================================================
 *  STRATAVOX  —  by aDirector  (halo submission)
 *  "A living mainframe, sectioned and lit. Read the tower like a circuit board."
 * ============================================================================
 *
 * CONCEPT
 * -------
 * An epic VERTICAL MEGASTRUCTURE CROSS-SECTION: a neon arcology / mainframe
 * tower sliced edge-on so the jury sees straight INTO it. Stacked decks and
 * strata, vertical data-risers and conduits, decoded-glyph signage, hanging
 * cabling, lit hive-cells, and deep atmospheric haze racked between layers so
 * the eye falls THROUGH the section. This is cyberpunk TERMINAL — phosphor/CRT
 * glow, hex/datastream, scanlines, wireframe, glitch, bloom — and it is
 * deliberately NOT outrun: no sunset gradient, no horizon grid, no chrome 80s.
 * It is a busy, crowded, deep machine that happens to be beautiful.
 *
 * Every mark is built from terminal primitives — monospace glyph runs, hex
 * nibbles, scanline rules, conduit pipes, wireframe cells, bracket signage —
 * so the architecture is SUGGESTED, never literally drawn. Abstract enough to
 * read as art, structured enough to read as a place.
 *
 * THE FIVE LAYOUTS (Layout is the PRIMARY trait — each is a distinct routine):
 *   1. Spire          — one slender tower core dead-centre, risers climbing it,
 *                       signage rungs and cabling fanning out into haze. A hero.
 *   2. Hive Wall      — a dense full-frame lattice of lit cells (a sectioned
 *                       hive), uneven cell sizes, glyph fill, conduits threading
 *                       between. Maximum density, no negative space.
 *   3. Reactor Core   — a glowing circular/annular core mid-frame with radial
 *                       conduits and concentric data-rings; strata wrap around
 *                       it. Radial energy, a beating heart of the machine.
 *   4. Strata Stack   — horizontal decks stacked floor-on-floor like a building
 *                       section: each deck a lit corridor of cells + a riser
 *                       spine, hanging cables between floors. A skyline in
 *                       cross-section.
 *   5. Severed Section— a torn diagonal cut through the structure: one half
 *                       dense decks, the other ragged exposed conduits bleeding
 *                       datastream into void. Asymmetric, dramatic, glitched.
 *
 * THE PALETTES (8, all SATURATED jewel-neon on deep dark grounds):
 *   Halon (cyan/lime/amber on black) · Magenta Bus (hot pink/violet/cyan) ·
 *   Acid Terminal (electric lime/teal/yellow) · Cobalt Core (azure/indigo/ice) ·
 *   Ember Stack (orange/red/gold on oxblood) · Vapor Hex (aqua/mint/lilac) ·
 *   Ultraviolet (violet/magenta/blue) · Signal Red (scarlet/amber/cyan accent).
 * Each is a ground + an ordered set of neon hues; signage/cells/conduits pull
 * from the set so the piece stays disciplined per seed but the SET screams.
 *
 * WHY IT'S HALO-WORTHY
 * --------------------
 * Five structurally different machines, eight bold colorways, three formats —
 * seeds diverge dramatically. It is dense and deep (the brief's "density is a
 * feature"), it is unmistakably terminal (not synthwave), and it is built from
 * one coherent visual language so 256 outputs feel like one body of work, not a
 * random generator. It is the flagship lobby piece: a tower you can fall into.
 *
 * Deterministic from tokenId only. ALL trait-determining randomness is drawn in
 * paramsOf(r) in a FIXED order so traits() and draw() never disagree. The engine
 * is a pure function of tokenId.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, paperTooth, blit, PHI, INVPHI } from '../_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../../project/types';

/* ── Palettes — 8 SATURATED jewel-neon terminal colorways ──────────────────
 * ground : the deep dark substrate the machine sits in.
 * deep   : a slightly lifted ground for atmospheric haze racking.
 * neon[] : the ordered electric hue set — cells, risers, signage, glyphs and
 *          conduits all pull from here so each seed is disciplined.
 * hot    : the brightest accent (signage rims, glyph cores, bloom).
 * line   : the wireframe / scanline ink (a cool near-neutral that still glows). */
const PALS = [
  { name: 'Halon',         ground: '#03060a', deep: '#06121a', neon: ['#27f0d0', '#62ff7a', '#ffd23f', '#1fd1ff'], hot: '#eafff4', line: '#0e3a40' },
  { name: 'Magenta Bus',   ground: '#0a0410', deep: '#170a22', neon: ['#ff3fae', '#a64bff', '#36e6ff', '#ff7adf'], hot: '#ffe6ff', line: '#3a1450' },
  { name: 'Acid Terminal', ground: '#04090a', deep: '#0a1814', neon: ['#aaff1f', '#19f0a0', '#f4ff3f', '#23e0d0'], hot: '#f2fff0', line: '#1c4434' },
  { name: 'Cobalt Core',   ground: '#020616', deep: '#06122e', neon: ['#2f7bff', '#4dd0ff', '#7a5cff', '#b8e6ff'], hot: '#eaf4ff', line: '#173a66' },
  { name: 'Ember Stack',   ground: '#0d0402', deep: '#1c0a06', neon: ['#ff6a1f', '#ff2f3f', '#ffc23f', '#ff9d57'], hot: '#fff0e0', line: '#4a1c10' },
  { name: 'Vapor Hex',     ground: '#050a0c', deep: '#0c1c20', neon: ['#3ff0e6', '#7affc6', '#b89bff', '#5cd6ff'], hot: '#f0fffb', line: '#1f4448' },
  { name: 'Ultraviolet',   ground: '#070414', deep: '#120a2c', neon: ['#8a4bff', '#ff4be0', '#3f6bff', '#c89bff'], hot: '#f4e6ff', line: '#2c1a5a' },
  { name: 'Signal Red',    ground: '#0c0306', deep: '#1c060c', neon: ['#ff2f4f', '#ffb02f', '#ff5a7a', '#34e0ff'], hot: '#ffe8ec', line: '#4a121f' },
];

/* Formats — real W/H ratios live in HALOA_ASPECTS below (same order).
 * Tall is the natural home for a tower section; Square + Wide widen the range. */
const FMTS = [
  { W: 1080, H: 1440, t: 'Tall' },
  { W: 1280, H: 1280, t: 'Square' },
  { W: 1440, H: 1040, t: 'Wide' },
];

/* PRIMARY composition trait — each value is a different draw routine. */
const LAYOUTS = ['Spire', 'Hive Wall', 'Reactor Core', 'Strata Stack', 'Severed Section'];

const DENSITY = ['Sparse', 'Packed', 'Overclocked']; // how much machine fills the frame
const HAZE    = ['Clear', 'Smog'];                    // atmospheric depth racking
const SIGNAL  = ['Stable', 'Glitched'];               // datastream / corruption finish

/* ── Param draw (FIXED ORDER — Layout FIRST) ──────────────────────────────── */
function paramsOf(r) {
  const layout  = pick(LAYOUTS, r);
  const palI    = Math.floor(r() * PALS.length);
  const fmt     = pick(FMTS, r);
  const density = pick(DENSITY, r);
  const haze    = pick(HAZE, r);
  const signal  = pick(SIGNAL, r);
  return { layout, palI, fmt, density, haze, signal };
}

function labels(p) {
  return {
    Layout:  p.layout,
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Density: p.density,
    Haze:    p.haze,
    Signal:  p.signal,
  };
}

/* ── tiny terminal primitives ─────────────────────────────────────────────── */

const GLYPHS = '0123456789ABCDEF<>/\\[]{}=+*#%$&|:.';
function gl(r) { return GLYPHS[Math.floor(r() * GLYPHS.length)]; }
function hexNib(r) { return '0123456789ABCDEF'[Math.floor(r() * 16)]; }
function neon(P, r) { return P.neon[Math.floor(r() * P.neon.length)]; }

/* soft additive glow blob */
function glow(x, cx, cy, rad, col, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.5, rgba(col, a * 0.35));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
}

/* a run of monospace glyphs flowing in a direction; the glyphstream primitive */
function glyphRun(x, P, x0, y0, dx, dy, n, size, col, a, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.font = size + "px 'Courier New', monospace";
  x.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const fade = a * (0.25 + 0.75 * (1 - Math.abs(t - 0.5) * 1.3));
    x.fillStyle = rgba(col, clamp(fade, 0, 1));
    x.fillText(gl(r), x0 + dx * i, y0 + dy * i);
  }
  x.restore();
}

/* a lit cell — wireframe box with a glowing interior + optional glyph fill */
function cell(x, P, x0, y0, w, h, col, lit, r) {
  // interior backlight
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createLinearGradient(x0, y0, x0, y0 + h);
  g.addColorStop(0, rgba(col, lit * 0.5));
  g.addColorStop(0.5, rgba(col, lit * 0.16));
  g.addColorStop(1, rgba(mix(col, '#000', 0.6), lit * 0.05));
  x.fillStyle = g;
  x.fillRect(x0, y0, w, h);
  x.restore();
  // wireframe rim
  x.strokeStyle = rgba(mix(col, P.hot, 0.3), 0.32 + lit * 0.4);
  x.lineWidth = Math.max(0.6, Math.min(w, h) * 0.03);
  x.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  // a couple of glyphs inside if the cell is big and lit enough
  if (lit > 0.4 && Math.min(w, h) > 14 && r() < 0.8) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const fs = clamp(h * 0.42, 6, 22);
    x.font = fs + "px 'Courier New', monospace";
    x.textBaseline = 'middle';
    x.fillStyle = rgba(mix(col, P.hot, 0.5), 0.5 + lit * 0.4);
    const m = Math.max(1, Math.floor(w / (fs * 0.62)) - 1);
    let s = '';
    for (let k = 0; k < m; k++) s += hexNib(r);
    x.fillText(s, x0 + w * 0.08, y0 + h * 0.5);
    x.restore();
  }
}

/* a vertical conduit / data-riser: a glowing pipe with travelling pulses */
function riser(x, P, cx, y0, y1, w, col, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  // body
  const g = x.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.5, rgba(col, 0.4));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(cx - w, Math.min(y0, y1), w * 2, Math.abs(y1 - y0));
  // bright core line
  x.strokeStyle = rgba(mix(col, P.hot, 0.4), 0.6);
  x.lineWidth = Math.max(1, w * 0.5);
  x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx, y1); x.stroke();
  // travelling pulse nodes
  const nodes = rint(r, 3, 7);
  for (let i = 0; i < nodes; i++) {
    const yy = y0 + (y1 - y0) * r();
    glow(x, cx, yy, w * (2.5 + r() * 3), mix(col, P.hot, 0.4), 0.5 + r() * 0.4);
  }
  x.restore();
}

/* hanging cable — a slack catenary line with a node at the end */
function cable(x, P, x0, y0, x1, y1, col, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const sag = Math.abs(x1 - x0) * (0.2 + r() * 0.3) + 12;
  const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + sag;
  x.strokeStyle = rgba(col, 0.22 + r() * 0.2);
  x.lineWidth = 0.8 + r() * 1.2;
  x.beginPath();
  x.moveTo(x0, y0);
  x.quadraticCurveTo(mx, my, x1, y1);
  x.stroke();
  glow(x, x1, y1, 5 + r() * 6, mix(col, P.hot, 0.5), 0.5);
  x.restore();
}

/* signage rung — a bracketed decoded-glyph label bar */
function signage(x, P, x0, y0, w, h, col, r) {
  x.save();
  // bar backing
  x.fillStyle = rgba(mix(P.ground, col, 0.25), 0.55);
  x.fillRect(x0, y0, w, h);
  x.strokeStyle = rgba(col, 0.5);
  x.lineWidth = 1;
  x.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  // glyph label
  x.globalCompositeOperation = 'lighter';
  const fs = clamp(h * 0.6, 7, 20);
  x.font = fs + "px 'Courier New', monospace";
  x.textBaseline = 'middle';
  x.fillStyle = rgba(mix(col, P.hot, 0.6), 0.85);
  const m = Math.max(2, Math.floor(w / (fs * 0.62)) - 2);
  let s = '[';
  for (let k = 0; k < m; k++) s += gl(r);
  s += ']';
  x.fillText(s, x0 + fs * 0.3, y0 + h * 0.52);
  x.restore();
}

/* scanline rule across a region */
function scanlines(x, W, H, y0, y1, col, gap, a) {
  x.save();
  x.globalCompositeOperation = 'overlay';
  x.strokeStyle = rgba(col, a);
  x.lineWidth = 1;
  for (let y = y0; y < y1; y += gap) {
    x.beginPath(); x.moveTo(0, y + 0.5); x.lineTo(W, y + 0.5); x.stroke();
  }
  x.restore();
}

/* ── atmospheric ground + depth haze racking (shared) ──────────────────────── */
function paintGround(x, P, W, H, dim, smog, r) {
  // vertical substrate gradient — darkest at the bottom (deep in the machine)
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(P.ground, P.deep, 0.5));
  bg.addColorStop(0.45, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000', 0.5));
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // depth haze: a few soft horizontal bands of lifted colour racked back-to-front
  x.save();
  x.globalCompositeOperation = 'screen';
  const bands = smog === 'Smog' ? 6 : 3;
  for (let i = 0; i < bands; i++) {
    const cy = H * (0.1 + 0.85 * r());
    const fr = dim * (0.5 + r() * 0.6);
    const col = i % 2 === 0 ? P.deep : neon(P, r);
    const g = x.createRadialGradient(W * (0.3 + r() * 0.4), cy, 0, W * 0.5, cy, fr);
    g.addColorStop(0, rgba(col, smog === 'Smog' ? 0.1 : 0.06));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * THE FIVE LAYOUTS
 * ══════════════════════════════════════════════════════════════════════════ */

/* helper: density → count multiplier */
function densMul(d) { return d === 'Sparse' ? 0.6 : d === 'Packed' ? 1.0 : 1.55; }

/* 1. SPIRE — a slender central tower core, risers climbing it, signage rungs and
 *    cabling fanning into haze. A hero composition with breathing room. */
function layoutSpire(x, P, W, H, dim, dm, smog, r) {
  const cx = W * (0.5 + randn(r) * 0.06);
  const coreW = W * (0.12 + r() * 0.06);
  const top = H * 0.06, bot = H * 0.96;

  // back haze column behind the spire
  glow(x, cx, H * 0.5, W * 0.45, neon(P, r), 0.12);

  // the core shaft: stacked lit cells climbing the tower
  const rungs = Math.round((24 + r() * 14) * dm);
  const rungH = (bot - top) / rungs;
  for (let i = 0; i < rungs; i++) {
    const y = top + i * rungH;
    const t = i / rungs;
    const col = neon(P, r);
    const lit = 0.3 + r() * 0.7;
    // central cell pair
    cell(x, P, cx - coreW, y + rungH * 0.12, coreW, rungH * 0.76, col, lit, r);
    cell(x, P, cx, y + rungH * 0.12, coreW, rungH * 0.76, neon(P, r), 0.3 + r() * 0.7, r);
    // signage rung jutting out on alternating sides
    if (r() < 0.5) {
      const side = r() < 0.5 ? -1 : 1;
      const sw = W * (0.1 + r() * 0.14);
      const sx = side < 0 ? cx - coreW - sw : cx + coreW;
      signage(x, P, sx, y + rungH * 0.2, sw, rungH * 0.5, col, r);
      cable(x, P, side < 0 ? cx - coreW : cx + coreW, y, sx + sw * 0.5, y + rungH * 0.6, col, r);
    }
  }

  // vertical risers either side of the core
  const risers = Math.round((3 + r() * 3) * dm);
  for (let i = 0; i < risers; i++) {
    const rx = cx + (r() < 0.5 ? -1 : 1) * coreW * (1.4 + r() * 2.2);
    riser(x, P, rx, top, bot, 2 + r() * 3, neon(P, r), r);
  }

  // glyphstreams falling beside the tower
  const streams = Math.round((6 + r() * 6) * dm);
  for (let i = 0; i < streams; i++) {
    const sx = W * (0.08 + r() * 0.84);
    const fs = 9 + r() * 7;
    glyphRun(x, P, sx, top + r() * H * 0.2, 0, fs * 1.1, Math.round((H * 0.8) / (fs * 1.1)), fs, neon(P, r), 0.4 + r() * 0.3, r);
  }

  // crown bloom
  glow(x, cx, top + H * 0.04, coreW * 2.4, P.hot, 0.5);
}

/* 2. HIVE WALL — a dense full-frame lattice of lit cells, uneven sizes, glyph
 *    fill, conduits threading between. Maximum density, no negative space. */
function layoutHive(x, P, W, H, dim, dm, smog, r) {
  const cols = Math.round((7 + r() * 5) * (dm * 0.9 + 0.2));
  const rows = Math.round((10 + r() * 7) * (dm * 0.9 + 0.2));
  const cw = W / cols, ch = H / rows;
  // recursive-ish: some cells split into sub-cells for size variety
  for (let cyi = 0; cyi < rows; cyi++) {
    for (let cxi = 0; cxi < cols; cxi++) {
      const x0 = cxi * cw, y0 = cyi * ch;
      const col = neon(P, r);
      if (r() < 0.28 && cw > 30 && ch > 30) {
        // split into a 2x2 of small cells
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
          cell(x, P, x0 + a * cw / 2 + 1, y0 + b * ch / 2 + 1, cw / 2 - 2, ch / 2 - 2, neon(P, r), 0.2 + r() * 0.8, r);
        }
      } else if (r() < 0.12) {
        // an empty/dark cell — a dead terminal, for rhythm
        x.strokeStyle = rgba(P.line, 0.5);
        x.lineWidth = 1;
        x.strokeRect(x0 + 1.5, y0 + 1.5, cw - 3, ch - 3);
      } else {
        cell(x, P, x0 + 1, y0 + 1, cw - 2, ch - 2, col, 0.25 + r() * 0.75, r);
      }
    }
  }
  // conduits threading vertically + horizontally across the lattice
  const vC = Math.round((3 + r() * 4) * dm);
  for (let i = 0; i < vC; i++) riser(x, P, cw * rint(r, 0, cols), 0, H, 2 + r() * 3, neon(P, r), r);
  const hC = Math.round((2 + r() * 3) * dm);
  for (let i = 0; i < hC; i++) {
    const yy = ch * rint(r, 0, rows);
    x.save(); x.globalCompositeOperation = 'lighter';
    const col = neon(P, r);
    x.strokeStyle = rgba(mix(col, P.hot, 0.4), 0.5);
    x.lineWidth = 1.5 + r() * 2;
    x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    for (let k = 0; k < 5; k++) glow(x, W * r(), yy, 8 + r() * 8, col, 0.4);
    x.restore();
  }
  // a few hot signage bars overlaid as section labels
  const sg = Math.round((2 + r() * 3) * dm);
  for (let i = 0; i < sg; i++) {
    signage(x, P, W * r() * 0.7, H * r(), W * (0.12 + r() * 0.12), ch * (0.6 + r() * 0.5), neon(P, r), r);
  }
}

/* 3. REACTOR CORE — a glowing annular core mid-frame with radial conduits and
 *    concentric data-rings; strata wrap around it. Radial energy. */
function layoutReactor(x, P, W, H, dim, dm, smog, r) {
  const cx = W * (0.5 + randn(r) * 0.05);
  const cy = H * (0.46 + randn(r) * 0.06);
  const R = Math.min(W, H) * (0.26 + r() * 0.08);

  // deep core bloom
  glow(x, cx, cy, R * 2.2, neon(P, r), 0.18);
  glow(x, cx, cy, R * 0.9, P.hot, 0.5);

  // concentric data-rings of glyphs / hex nibbles
  const rings = Math.round((4 + r() * 4) * (dm * 0.6 + 0.5));
  for (let i = 0; i < rings; i++) {
    const rr = R * (0.35 + 0.75 * (i / rings));
    const col = neon(P, r);
    // ring stroke
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(col, 0.3 + r() * 0.3);
    x.lineWidth = 1 + r() * 2.5;
    x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke();
    // glyphs marching round the ring
    const cnt = Math.round((rr * 2 * Math.PI) / (10 + r() * 8));
    const fs = 9 + r() * 5;
    x.font = fs + "px 'Courier New', monospace";
    x.textBaseline = 'middle';
    x.textAlign = 'center';
    const a0 = r() * Math.PI * 2;
    for (let k = 0; k < cnt; k++) {
      const a = a0 + (k / cnt) * Math.PI * 2;
      x.save();
      x.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      x.rotate(a + Math.PI / 2);
      x.fillStyle = rgba(mix(col, P.hot, 0.4), 0.4 + r() * 0.4);
      x.fillText(gl(r), 0, 0);
      x.restore();
    }
    x.textAlign = 'left';
    x.restore();
  }

  // radial conduits firing outward to the frame edges
  const spokes = Math.round((10 + r() * 14) * dm);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + randn(r) * 0.1;
    const len = Math.hypot(W, H) * (0.4 + r() * 0.3);
    const col = neon(P, r);
    x.save();
    x.globalCompositeOperation = 'lighter';
    const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
    const g = x.createLinearGradient(cx, cy, ex, ey);
    g.addColorStop(0, rgba(mix(col, P.hot, 0.4), 0.5));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g;
    x.lineWidth = 1 + r() * 3;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
    x.lineTo(ex, ey);
    x.stroke();
    // glyph node clusters along the spoke
    if (r() < 0.7) {
      const t = 0.4 + r() * 0.5;
      glyphRun(x, P, cx + Math.cos(a) * len * t, cy + Math.sin(a) * len * t, Math.cos(a) * 12, Math.sin(a) * 12, rint(r, 3, 7), 10 + r() * 4, col, 0.5, r);
    }
    x.restore();
  }

  // surrounding strata in the corners so the frame stays busy/deep
  const corners = [[0, 0], [W, 0], [0, H], [W, H]];
  for (const [qx, qy] of corners) {
    const n = Math.round((4 + r() * 4) * dm);
    for (let i = 0; i < n; i++) {
      const bw = W * (0.08 + r() * 0.16), bh = H * (0.02 + r() * 0.04);
      const bx = qx === 0 ? r() * W * 0.25 : W - r() * W * 0.25 - bw;
      const by = qy === 0 ? r() * H * 0.22 : H - r() * H * 0.22 - bh;
      cell(x, P, bx, by, bw, bh, neon(P, r), 0.3 + r() * 0.5, r);
    }
  }
}

/* 4. STRATA STACK — horizontal decks stacked floor-on-floor; each deck a lit
 *    corridor of cells + a riser spine, hanging cables between floors. */
function layoutStrata(x, P, W, H, dim, dm, smog, r) {
  const decks = Math.round((6 + r() * 6) * (dm * 0.7 + 0.4));
  // uneven deck heights
  const wts = []; let tot = 0;
  for (let i = 0; i < decks; i++) { const w = 0.6 + r(); wts.push(w); tot += w; }
  // one or two vertical riser spines threading ALL decks
  const spineN = rint(r, 1, 3);
  const spines = [];
  for (let i = 0; i < spineN; i++) spines.push(W * (0.12 + r() * 0.76));

  let y = 0;
  for (let i = 0; i < decks; i++) {
    const dh = (wts[i] / tot) * H;
    const col = neon(P, r);
    // deck floor seam
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(col, P.hot, 0.3), 0.4);
    x.lineWidth = Math.max(1, H * 0.0022);
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    x.restore();
    // corridor of cells along the deck
    const cn = Math.round((10 + r() * 14) * dm);
    const cw = W / cn;
    for (let k = 0; k < cn; k++) {
      if (r() < 0.85) cell(x, P, k * cw + 1, y + dh * 0.16, cw - 2, dh * 0.62, neon(P, r), 0.25 + r() * 0.7, r);
    }
    // a signage band on some decks
    if (r() < 0.5) signage(x, P, W * r() * 0.6, y + dh * 0.16, W * (0.14 + r() * 0.16), Math.min(dh * 0.4, 26), col, r);
    // hanging cables dropping to the deck below
    if (i < decks - 1) {
      const cab = rint(r, 3, 7);
      for (let c = 0; c < cab; c++) {
        const sx = W * r();
        cable(x, P, sx, y + dh, sx + randn(r) * W * 0.08, y + dh + (wts[(i + 1) % decks] / tot) * H * (0.3 + r() * 0.5), col, r);
      }
    }
    y += dh;
  }
  // riser spines drawn over everything so they read as continuous structure
  for (const sx of spines) riser(x, P, sx, 0, H, 3 + r() * 4, neon(P, r), r);
  // glyphstreams cascading down the side gutters
  const streams = Math.round((4 + r() * 5) * dm);
  for (let i = 0; i < streams; i++) {
    const sx = r() < 0.5 ? W * (0.02 + r() * 0.06) : W * (0.92 + r() * 0.06);
    const fs = 9 + r() * 6;
    glyphRun(x, P, sx, r() * H * 0.2, 0, fs * 1.1, Math.round((H * 0.85) / (fs * 1.1)), fs, neon(P, r), 0.45, r);
  }
}

/* 5. SEVERED SECTION — a torn diagonal cut: one half dense decks, the other
 *    ragged exposed conduits bleeding datastream into void. */
function layoutSevered(x, P, W, H, dim, dm, smog, r) {
  const leftDense = r() < 0.5;
  // the tear line: a jagged diagonal from top to bottom
  const tearTop = W * (0.35 + r() * 0.3);
  const tearBot = W * (0.35 + r() * 0.3);
  const segs = 22;
  const tearX = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    tearX.push(tearTop + (tearBot - tearTop) * t + randn(r) * W * 0.05);
  }
  const tearAt = (yy) => {
    const t = clamp(yy / H, 0, 1) * segs;
    const i = Math.floor(t), f = t - i;
    return tearX[i] + (tearX[Math.min(segs, i + 1)] - tearX[i]) * f;
  };

  // DENSE SIDE — packed decks clipped to the structure half
  x.save();
  x.beginPath();
  if (leftDense) {
    x.moveTo(0, 0);
    for (let i = 0; i <= segs; i++) x.lineTo(tearX[i], (i / segs) * H);
    x.lineTo(0, H);
  } else {
    x.moveTo(W, 0);
    for (let i = 0; i <= segs; i++) x.lineTo(tearX[i], (i / segs) * H);
    x.lineTo(W, H);
  }
  x.closePath();
  x.clip();
  // pour a strata-like stack inside the clip
  const decks = Math.round((10 + r() * 8) * dm);
  const dh = H / decks;
  for (let i = 0; i < decks; i++) {
    const y0 = i * dh;
    const cn = Math.round((10 + r() * 12) * dm);
    const cw = W / cn;
    for (let k = 0; k < cn; k++) {
      const x0 = k * cw;
      if (r() < 0.85) cell(x, P, x0 + 1, y0 + dh * 0.14, cw - 2, dh * 0.66, neon(P, r), 0.25 + r() * 0.7, r);
    }
  }
  const sp = rint(r, 2, 4);
  for (let i = 0; i < sp; i++) riser(x, P, (leftDense ? W * r() * 0.5 : W * (0.5 + r() * 0.5)), 0, H, 3 + r() * 3, neon(P, r), r);
  x.restore();

  // THE TEAR EDGE — bright torn rim with exposed conduit stubs
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(P.hot, 0.7);
  x.lineWidth = 2 + r() * 2;
  x.beginPath();
  for (let i = 0; i <= segs; i++) { const yy = (i / segs) * H; if (i === 0) x.moveTo(tearX[i], yy); else x.lineTo(tearX[i], yy); }
  x.stroke();
  // ragged conduit stubs poking into the void
  const stubs = Math.round((18 + r() * 16) * dm);
  for (let i = 0; i < stubs; i++) {
    const yy = r() * H;
    const ex = tearAt(yy);
    const dir = leftDense ? 1 : -1;
    const len = W * (0.03 + r() * 0.12);
    const col = neon(P, r);
    const g = x.createLinearGradient(ex, yy, ex + dir * len, yy);
    g.addColorStop(0, rgba(mix(col, P.hot, 0.4), 0.6));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g;
    x.lineWidth = 1 + r() * 2.5;
    x.beginPath(); x.moveTo(ex, yy); x.lineTo(ex + dir * len, yy); x.stroke();
    glow(x, ex, yy, 4 + r() * 5, col, 0.5);
  }
  x.restore();

  // THE VOID SIDE — datastream bleeding into emptiness
  x.save();
  x.globalCompositeOperation = 'lighter';
  const streams = Math.round((14 + r() * 14) * dm);
  for (let i = 0; i < streams; i++) {
    const yy = r() * H;
    const ex = tearAt(yy);
    const dir = leftDense ? 1 : -1;
    const fs = 9 + r() * 7;
    const startX = ex + dir * (W * (0.02 + r() * 0.3));
    glyphRun(x, P, startX, yy, dir * fs * 0.66, randn(r) * fs * 0.3, rint(r, 6, 16), fs, neon(P, r), 0.4 + r() * 0.3, r);
  }
  x.restore();
}

/* ── Master draw ─────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const dim = Math.min(W, H);
  const dm = densMul(p.density);

  paintGround(x, P, W, H, dim, p.haze, r);

  switch (p.layout) {
    case 'Spire':            layoutSpire(x, P, W, H, dim, dm, p.haze, r); break;
    case 'Hive Wall':        layoutHive(x, P, W, H, dim, dm, p.haze, r); break;
    case 'Reactor Core':     layoutReactor(x, P, W, H, dim, dm, p.haze, r); break;
    case 'Strata Stack':     layoutStrata(x, P, W, H, dim, dm, p.haze, r); break;
    case 'Severed Section':  layoutSevered(x, P, W, H, dim, dm, p.haze, r); break;
  }

  // atmospheric smog wash so deep layers recede (depth racking, on top)
  if (p.haze === 'Smog') {
    x.save();
    x.globalCompositeOperation = 'screen';
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(P.deep, 0.0));
    g.addColorStop(0.6, rgba(P.deep, 0.18));
    g.addColorStop(1, rgba(P.deep, 0.34));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.restore();
  }

  // colour mottle for terminal texture
  mottle(x, 0, 0, W, H, neon(P, r), 90, r, 'screen');

  // glitch slices when the signal is corrupted
  if (p.signal === 'Glitched') {
    const n = rint(r, 4, 9);
    for (let i = 0; i < n; i++) {
      const yy = r() * H;
      const hh = 2 + r() * 14;
      const col = neon(P, r);
      // RGB-split style tear: a recoloured offset band
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(col, 0.12 + r() * 0.16);
      x.fillRect(0, yy, W, hh);
      // a thin hot scan within it
      x.fillStyle = rgba(P.hot, 0.2 + r() * 0.2);
      x.fillRect(0, yy + hh * 0.5, W, 1.5);
      x.restore();
    }
  }

  // CRT scanlines across the whole frame — the terminal signature
  scanlines(x, W, H, 0, H, '#000000', 3, 0.12);
  scanlines(x, W, H, 0, H, P.hot, 6, 0.03);

  // finishing texture
  grain(x, W, H, 900, r);
  vignette(x, W, H, p.layout === 'Hive Wall' ? 0.34 : 0.42);

  // soft outer bloom corners to seat the machine in dark
  x.save();
  x.globalCompositeOperation = 'multiply';
  const vg = x.createRadialGradient(W / 2, H * 0.45, dim * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(255,255,255,1)');
  vg.addColorStop(1, mix(P.ground, '#000', 0.4));
  x.fillStyle = vg;
  // keep it gentle — overlay a faint version
  x.globalAlpha = 0.25;
  x.fillRect(0, 0, W, H);
  x.restore();
}

/* ── EXACT exports ───────────────────────────────────────────────────────── */
export const haloATraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const haloASchema: TraitSchema = {
  traits: [
    { name: 'Layout',  values: LAYOUTS },
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format',  values: ['Tall', 'Square', 'Wide'] },
    { name: 'Density', values: DENSITY },
    { name: 'Haze',    values: HAZE },
    { name: 'Signal',  values: SIGNAL },
  ],
};

export const renderHaloA: EngineFn = blit(draw, haloATraits);

// W/H of Tall, Square, Wide (matches FMTS order).
export const HALOA_ASPECTS = [0.75, 1, 1.385] as const;
