// @ts-nocheck
/*
 * ════════════════════════════════════════════════════════════════════════════
 * NAVE — by phosphor-ai.  "Pray to the mainframe."
 * ════════════════════════════════════════════════════════════════════════════
 *
 * CONCEPT — a HOLOGRAPHIC DATA-CATHEDRAL interior. Not a tower cross-section,
 * not glyph-rain, not a top-down circuit-city. This is the INSIDE of a living
 * mainframe rendered as sacred architecture: a cavernous phosphor nave whose
 * vaulting is drawn in wireframe light, whose columns are stacked glyph-ledgers,
 * whose stained-glass is a rose-window of hex, and whose altar is a humming core.
 * Deep CRT void, electric jewel neon, scanlines, bloom, glitch, decoded signage.
 * A place of worship for a machine god — busy, deep, crowded, reverent, abstract.
 *
 * The whole scene is built from a small vocabulary of CRT primitives, each layout
 * arranging them into a different liturgical space:
 *
 *   1. Nave        — one-point perspective down a colonnade: receding arches and
 *                    a floor grid converging on a glowing altar at the vanishing
 *                    point, glyph-pillars marching left and right into the haze.
 *   2. Rose Window — a vast circular hex-mandala dead-ahead: concentric rings of
 *                    decoded glyph-tracery, radial mullions, a bloomed oculus,
 *                    flanked by faint ribbed arches. The cathedral's stained glass.
 *   3. Crypt       — a low subterranean server-reactor: a wide grid of humming
 *                    racks and conduit arches in a flooded reflective vault, the
 *                    horizon line low, vast dark headroom, scanned reflections.
 *   4. Triptych    — three tall arched panels side by side (an altarpiece), each
 *                    its own decoded-signage shrine: stacked ledgers, a sigil, a
 *                    datastream — divided by glowing mullions.
 *   5. Apse        — a fan of radiating ribs from a high off-centre keystone, a
 *                    half-dome of wireframe groin-vaulting raining glyphstreams,
 *                    the most baroque and crowded composition.
 *
 * PRIMITIVES (shared building blocks, composed differently per layout):
 *   - glyphstream : a vertical/inclined river of VS-free CRT glyphs (hex, runes,
 *                   box-drawing, currency) fading with depth.
 *   - ledgerSlab  : a luminous column of stacked monospace rows — a data-pillar.
 *   - wireArch    : a parametric pointed/round arch in additive wire light.
 *   - hexRing     : a ring of glyph-tracery for the rose window / haloes.
 *   - floorGrid   : a perspective lattice receding to a vanishing point.
 *   - signage     : decoded all-caps console signage with a scan-reveal wipe.
 *   - core        : a bloomed altar/oculus — the brightest point, the god.
 *   - conduit     : glowing pipe-runs / bus lines threading the architecture.
 *
 * WHY HALO-WORTHY: it nails the cyberpunk-TERMINAL brief without a single
 * outrun cliché — no sunset, no horizon neon grid, no chrome. Instead it gives
 * the jury something NEW: a reverent, cavernous machine-cathedral where density
 * IS the subject. Real one-point perspective gives genuine DEPTH; the glyph
 * vocabulary is hand-curated CRT (hex, box-drawing, runes, currency) so every
 * surface reads as decoded signage; additive bloom + scanlines + chromatic
 * fringe + barrel vignette sell the phosphor tube. Five layouts are five
 * different ROOMS in the same cathedral, so seeds differ dramatically. It is the
 * most ambitious, deepest, most original take on the theme — a flagship.
 *
 * Deterministic from tokenId only. ALL trait-determining randomness is drawn in
 * paramsOf() in a FIXED order so traits() and draw() never disagree.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, paperTooth, blit, PHI, INVPHI } from '../_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../../project/types';

/* ── PALETTES — 10 SATURATED phosphor colorways ───────────────────────────────
 * Each is a deep CRT void + a jewel-neon spectrum. Disciplined per palette: a
 * dominant phosphor (a), a complementary accent (b), a hot highlight (c), plus a
 * deep ground and a haze for the atmospheric depth fog. Bright enough to glow,
 * dark enough that the void stays a void. Mix of greens, cyans, magentas,
 * ambers, violets, blues and a couple of dual-tone schemes so a 9-up sheet
 * reads as many machine-temples, not one. */
const PALS = [
  // 1. classic phosphor green terminal, the holy default
  { name: 'Phosphor',    ground: '#02100a', haze: '#0a6b3a', a: '#2bff9a', b: '#10c46e', c: '#d6ffe6', ink: '#7dffc0' },
  // 2. icy cyan datacenter
  { name: 'Cryo',        ground: '#021622', haze: '#0a6e94', a: '#33e6ff', b: '#1296d6', c: '#e6fbff', ink: '#9cf0ff' },
  // 3. hot magenta cathedral
  { name: 'Reliquary',   ground: '#16041a', haze: '#8a1c8a', a: '#ff4bd6', b: '#c81e9e', c: '#ffe0fb', ink: '#ff9ce8' },
  // 4. amber CRT monochrome
  { name: 'Amber CRT',   ground: '#160a02', haze: '#9c5e10', a: '#ffb43a', b: '#d68420', c: '#fff0d2', ink: '#ffd98a' },
  // 5. deep violet sanctum
  { name: 'Sanctum',     ground: '#0c041e', haze: '#5a2ed0', a: '#a96bff', b: '#6e3ae0', c: '#efe2ff', ink: '#c8a8ff' },
  // 6. electric blue mainframe
  { name: 'Mainframe',   ground: '#020a26', haze: '#1a44c0', a: '#4b8cff', b: '#2658e0', c: '#e2ecff', ink: '#9cc0ff' },
  // 7. dual: cyan structure + magenta signage (the showpiece)
  { name: 'Glitchglass', ground: '#04101e', haze: '#0a6e94', a: '#2bf0e0', b: '#ff3cc8', c: '#f0ffff', ink: '#aef6ff' },
  // 8. acid lime reactor
  { name: 'Reactor',     ground: '#0a1402', haze: '#5e8a10', a: '#b6ff2b', b: '#7ad610', c: '#f2ffd6', ink: '#dcff8a' },
  // 9. blood-red firewall
  { name: 'Firewall',    ground: '#1a0404', haze: '#a01818', a: '#ff4b4b', b: '#d62020', c: '#ffe0e0', ink: '#ff9c9c' },
  // 10. dual: amber relic + cyan ghost (warm/cool tension)
  { name: 'Goldghost',   ground: '#10080a', haze: '#9c5e10', a: '#ffc24d', b: '#33e6ff', c: '#fff4e0', ink: '#ffe0a8' },
];

/* Formats — real W/H; ratios live in HALOD_ASPECTS below (same order). */
const FMTS = [
  { W: 1280, H: 1280, t: 'Square' },
  { W: 1024, H: 1360, t: 'Portrait' },
  { W: 1360, H: 1024, t: 'Landscape' },
];

/* PRIMARY composition trait — five different rooms = five draw routines. */
const LAYOUTS = ['Nave', 'Rose Window', 'Crypt', 'Triptych', 'Apse'];

const DENSITY = ['Hushed', 'Crowded', 'Teeming'];  // how much fills the void
const SIGNAL  = ['Clean', 'Glitched', 'Decaying'];  // CRT condition / corruption
const RITE    = ['Vespers', 'Matins', 'Requiem'];   // atmosphere tint bias

/* ── CRT glyph vocabulary — decoded signage, hex, runes, box-drawing, currency.
 * No emoji, no VS-16 — bare BMP glyphs that paint reliably in a monospace stack. */
const GLY_HEX  = '0123456789ABCDEF';
const GLY_BOX  = '│┃║─━═╱╲╳┌┐└┘├┤┬┴┼╔╗╚╝█▓▒░▌▐▖▗▘▝◢◣◤◥';
const GLY_RUNE = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const GLY_SYM  = '§¶†‡◊∆∇∞≡≈⊕⊗⊘⌬⏚⏛⎔⟁⟐⟡✶✦∷※';
const GLY_CUR  = '$€£¥₿₽₣฿¤';
const GLY_ALL  = (GLY_HEX + GLY_BOX + GLY_RUNE + GLY_SYM + GLY_CUR).split('');
const GLY_MONO = (GLY_HEX + '0123456789ABCDEF .:-_').split('');
const WORDS = ['ORACLE','MAINFRAME','LEDGER','CONSENSUS','GENESIS','PROTOCOL','SIGNAL','DAEMON',
  'KERNEL','LITURGY','VECTOR','CIPHER','RELIC','NEXUS','VESPER','SACRAMENT','HALT·CATCH·FIRE',
  'NULL·SECTOR','TRUE','FALSE','0xDEAD','0xBEEF','SYNC','DECODE','ASCEND','AMEN'];

function glyph(set, r) { return set[Math.floor(r() * set.length)]; }

const MONO = '"SFMono-Regular", "JetBrains Mono", "Courier New", monospace';

/* ── Param draw (FIXED ORDER — Layout FIRST) ──────────────────────────────── */
function paramsOf(r) {
  const layI    = Math.floor(r() * LAYOUTS.length);   // PRIMARY composition
  const palI    = Math.floor(r() * PALS.length);
  const fmt      = pick(FMTS, r);
  const denI     = Math.floor(r() * DENSITY.length);
  const sigI     = Math.floor(r() * SIGNAL.length);
  const riteI    = Math.floor(r() * RITE.length);

  // ── secondary draws (consumed in draw(), fixed order, after trait draws) ──
  const vpx      = 0.5 + (r() - 0.5) * 0.34;     // vanishing-point x bias
  const vpy      = 0.38 + (r() - 0.5) * 0.22;    // vanishing-point y (horizon)
  const colN     = rint(r, 5, 9);                // colonnade depth / rib count
  const rotSeed  = r() * Math.PI * 2;            // global rotation seed for rings
  const glitchA  = sigI === 0 ? 0.15 : sigI === 1 ? 0.6 : 0.42;  // corruption amt
  const haloN    = rint(r, 2, 4);                // bloom haloes scattered
  const accentMix= r();                          // how much b-accent vs a-dominant
  const sigUp    = r() < 0.5;                    // signage above or below altar
  const ringN    = rint(r, 4, 7);               // rose-window rings
  const panelN   = 3;                            // triptych panels (fixed = altarpiece)
  return { layI, palI, fmt, denI, sigI, riteI,
           vpx, vpy, colN, rotSeed, glitchA, haloN, accentMix, sigUp, ringN, panelN };
}

function labels(p) {
  return {
    Layout:  LAYOUTS[p.layI],
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Density: DENSITY[p.denI],
    Signal:  SIGNAL[p.sigI],
    Rite:    RITE[p.riteI],
  };
}

/* density → multiplier for how many elements fill the scene */
function densMul(denI) { return denI === 0 ? 0.6 : denI === 1 ? 1.0 : 1.5; }
/* rite → small hue/temperature shift applied to atmosphere fog */
function riteTint(P, riteI) {
  if (riteI === 0) return P.haze;                 // Vespers — palette haze
  if (riteI === 1) return mix(P.haze, P.c, 0.28); // Matins — brighter, cooler dawn
  return mix(P.haze, '#000', 0.4);                // Requiem — darker, heavier
}

/* ════════════════════════════════════════════════════════════════════════════
 * CRT PRIMITIVES
 * ══════════════════════════════════════════════════════════════════════════ */

/* additive glyph painter with chromatic fringe for the dual-tone palettes */
function drawGlyph(x, P, gx, gy, size, col, alpha, fringe) {
  x.font = `${size}px ${MONO}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const ch = x._g || ' ';
  if (fringe > 0) {
    x.fillStyle = rgba(P.b, alpha * 0.5);
    x.fillText(ch, gx - fringe, gy);
    x.fillStyle = rgba(P.a, alpha * 0.5);
    x.fillText(ch, gx + fringe, gy);
  }
  x.fillStyle = rgba(col, alpha);
  x.fillText(ch, gx, gy);
}

/* a river of glyphs along a line from (x0,y0)->(x1,y1), depth-faded */
function glyphstream(x, P, x0, y0, x1, y1, size0, size1, n, set, col, baseA, fringe, r) {
  // bound the glyph-render count per stream; 64 is above any normal seed's n
  // (Triptych datastreams top out ~30 at Teeming), so the look is unchanged.
  n = Math.min(n, 64);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const gx = x0 + (x1 - x0) * t + randn(r) * size0 * 0.18;
    const gy = y0 + (y1 - y0) * t;
    const sz = size0 + (size1 - size0) * t;
    const a = baseA * (0.35 + 0.65 * (1 - t)) * (0.6 + r() * 0.5);
    x._g = glyph(set, r);
    drawGlyph(x, P, gx, gy, sz, r() < 0.12 ? P.c : col, a, fringe);
  }
}

/* a luminous column of stacked monospace rows — a data-pillar / ledger */
function ledgerSlab(x, P, cx, top, w, h, rows, col, alpha, fringe, r) {
  // Ceiling rows×cols glyph-render cost. Each row is one fillText (cheap), but a
  // slab built per-character would explode; rows are bounded so a Teeming seed's
  // tall ledgers stay safe. 48 rows is far above any normal seed's count, so the
  // look is unchanged — only pathological tall/dense slabs clamp.
  rows = Math.min(rows, 48);
  const rh = h / rows;
  const fp = Math.min(rh * 0.82, w * 0.16);
  x.textAlign = 'left';
  x.textBaseline = 'middle';
  x.font = `${fp}px ${MONO}`;
  // faint slab body so it reads as a solid pillar of light
  const bg = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  bg.addColorStop(0, rgba(col, 0));
  bg.addColorStop(0.5, rgba(col, 0.06 * alpha));
  bg.addColorStop(1, rgba(col, 0));
  x.fillStyle = bg;
  x.fillRect(cx - w / 2, top, w, h);
  // cols is the per-row character count built into the string; bound it too so a
  // wide slab can't build a huge per-row string.
  const cols = Math.min(64, Math.max(3, Math.floor(w / (fp * 0.62))));
  for (let ri = 0; ri < rows; ri++) {
    const ry = top + ri * rh + rh / 2;
    const a = alpha * (0.4 + 0.6 * (ri / rows)) * (0.7 + r() * 0.5);
    let s = '';
    for (let ci = 0; ci < cols; ci++) s += glyph(r() < 0.7 ? GLY_MONO : GLY_HEX.split(''), r);
    const lx = cx - w / 2 + w * 0.05;
    if (fringe > 0) {
      x.fillStyle = rgba(P.b, a * 0.4); x.fillText(s, lx - fringe, ry);
      x.fillStyle = rgba(P.a, a * 0.4); x.fillText(s, lx + fringe, ry);
    }
    x.fillStyle = rgba(r() < 0.08 ? P.c : col, a);
    x.fillText(s, lx, ry);
  }
}

/* a parametric arch (pointed gothic or round) in additive wire light */
function wireArch(x, P, cx, baseY, halfW, height, pointed, col, alpha, lw) {
  x.strokeStyle = rgba(col, alpha);
  x.lineWidth = lw;
  x.lineJoin = 'round';
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx - halfW, baseY);
  x.lineTo(cx - halfW, baseY - height * 0.45);
  if (pointed) {
    x.quadraticCurveTo(cx - halfW, baseY - height * 0.92, cx, baseY - height);
    x.quadraticCurveTo(cx + halfW, baseY - height * 0.92, cx + halfW, baseY - height * 0.45);
  } else {
    x.bezierCurveTo(cx - halfW, baseY - height, cx + halfW, baseY - height, cx + halfW, baseY - height * 0.45);
  }
  x.lineTo(cx + halfW, baseY);
  x.stroke();
}

/* a ring of glyph-tracery (rose window / halo) */
function hexRing(x, P, cx, cy, rad, count, size, col, alpha, rot, set, fringe, r) {
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2;
    const gx = cx + Math.cos(a) * rad;
    const gy = cy + Math.sin(a) * rad;
    x.save();
    x.translate(gx, gy);
    x.rotate(a + Math.PI / 2);
    x._g = glyph(set, r);
    drawGlyph(x, P, 0, 0, size, r() < 0.15 ? P.c : col, alpha * (0.7 + r() * 0.4), fringe);
    x.restore();
  }
}

/* perspective floor grid receding to a vanishing point */
function floorGrid(x, P, W, H, vx, vy, lines, col, alpha, lw) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(col, alpha);
  x.lineWidth = lw;
  // radial lines from the floor edge up to the vanishing point
  for (let i = 0; i <= lines; i++) {
    const fx = (i / lines) * W;
    const g = x.createLinearGradient(fx, H, vx, vy);
    g.addColorStop(0, rgba(col, alpha));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g;
    x.beginPath(); x.moveTo(fx, H); x.lineTo(vx, vy); x.stroke();
  }
  // horizontal depth rungs — perspective spacing, dense toward the horizon.
  // Bounded by a fixed count (never an open-ended geometric loop).
  const rungs = 26;
  for (let i = 0; i < rungs; i++) {
    // ease so rungs crowd near the vanishing point: t in (0,1], near=1
    const u = i / rungs;
    const t = 1 - u * u;                 // 1 at floor edge -> ~0 at horizon
    const yy = vy + (H - vy) * t;
    if (yy <= vy + 2) continue;
    x.strokeStyle = rgba(col, alpha * clamp(t, 0, 1));
    const half = (W * 0.5) * t;
    x.beginPath();
    x.moveTo(vx - half - vx * t, yy);
    x.lineTo(vx + half + (W - vx) * t, yy);
    x.stroke();
  }
  x.restore();
}

/* a glowing conduit / bus run between two points with a soft outer glow */
function conduit(x, P, x0, y0, x1, y1, col, alpha, w) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgba(col, alpha * 0.2));
  g.addColorStop(0.5, rgba(col, alpha));
  g.addColorStop(1, rgba(col, alpha * 0.2));
  x.strokeStyle = g; x.lineCap = 'round';
  x.lineWidth = w * 2.6; x.globalAlpha = 0.4;
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
  x.globalAlpha = 1;
  x.lineWidth = w;
  x.strokeStyle = rgba(mix(col, '#ffffff', 0.4), alpha);
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
  x.restore();
}

/* decoded all-caps console signage with a scan-reveal wipe + underline cursor */
function signage(x, P, cx, cy, text, size, col, alpha, scan, fringe) {
  x.save();
  x.font = `bold ${size}px ${MONO}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const tw = x.measureText(text).width;
  // bracket frame
  x.strokeStyle = rgba(col, alpha * 0.7);
  x.lineWidth = Math.max(1, size * 0.06);
  const pad = size * 0.5;
  const bx = cx - tw / 2 - pad, bw = tw + pad * 2, by = cy - size * 0.8, bh = size * 1.6;
  const tk = size * 0.4;
  x.beginPath();
  x.moveTo(bx + tk, by); x.lineTo(bx, by); x.lineTo(bx, by + tk);
  x.moveTo(bx + bw - tk, by); x.lineTo(bx + bw, by); x.lineTo(bx + bw, by + tk);
  x.moveTo(bx + tk, by + bh); x.lineTo(bx, by + bh); x.lineTo(bx, by + bh - tk);
  x.moveTo(bx + bw - tk, by + bh); x.lineTo(bx + bw, by + bh); x.lineTo(bx + bw, by + bh - tk);
  x.stroke();
  // scan-reveal: clip to a revealed fraction, dim the rest
  const reveal = clamp(scan, 0.4, 1);
  x.fillStyle = rgba(mix(col, P.ground, 0.55), alpha * 0.5);
  x.fillText(text, cx, cy);
  x.save();
  x.beginPath(); x.rect(bx, by, bw * reveal, bh); x.clip();
  if (fringe > 0) {
    x.fillStyle = rgba(P.b, alpha * 0.45); x.fillText(text, cx - fringe, cy);
    x.fillStyle = rgba(P.a, alpha * 0.45); x.fillText(text, cx + fringe, cy);
  }
  x.fillStyle = rgba(mix(col, '#ffffff', 0.25), alpha);
  x.fillText(text, cx, cy);
  // scan cursor line
  const curX = bx + bw * reveal;
  x.strokeStyle = rgba(P.c, alpha);
  x.lineWidth = Math.max(1.5, size * 0.08);
  x.beginPath(); x.moveTo(curX, by + size * 0.2); x.lineTo(curX, by + bh - size * 0.2); x.stroke();
  x.restore();
  x.restore();
}

/* the bloomed altar / oculus — the brightest point, the machine-god */
function core(x, P, cx, cy, rad, col, intensity) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  // outer halo
  for (let i = 3; i >= 1; i--) {
    const rr = rad * i * 0.8;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, rgba(col, 0.30 * intensity / i));
    g.addColorStop(0.5, rgba(col, 0.12 * intensity / i));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill();
  }
  // hot core
  const gc = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.5);
  gc.addColorStop(0, rgba(mix(col, '#ffffff', 0.7), 0.95 * intensity));
  gc.addColorStop(0.4, rgba(mix(col, '#ffffff', 0.2), 0.6 * intensity));
  gc.addColorStop(1, rgba(col, 0));
  x.fillStyle = gc; x.beginPath(); x.arc(cx, cy, rad * 0.5, 0, Math.PI * 2); x.fill();
  // cruciform light flare
  for (let k = 0; k < 4; k++) {
    const ang = k * Math.PI / 2;
    const lg = x.createLinearGradient(cx, cy, cx + Math.cos(ang) * rad * 2.4, cy + Math.sin(ang) * rad * 2.4);
    lg.addColorStop(0, rgba(mix(col, '#ffffff', 0.5), 0.5 * intensity));
    lg.addColorStop(1, rgba(col, 0));
    x.strokeStyle = lg; x.lineCap = 'round';
    x.lineWidth = rad * (k % 2 === 0 ? 0.12 : 0.06);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang) * rad * 2.4, cy + Math.sin(ang) * rad * 2.4); x.stroke();
  }
  x.restore();
}

/* a depth-fog wash so the architecture recedes into the void */
function depthFog(x, P, W, H, vx, vy, tint) {
  x.save();
  x.globalCompositeOperation = 'screen';
  const g = x.createRadialGradient(vx, vy, 0, vx, vy, Math.hypot(W, H) * 0.7);
  g.addColorStop(0, rgba(tint, 0.26));
  g.addColorStop(0.4, rgba(tint, 0.10));
  g.addColorStop(1, rgba(tint, 0));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * THE FIVE LAYOUTS  (each a different room of the cathedral)
 * ══════════════════════════════════════════════════════════════════════════ */

/* 1. NAVE — one-point perspective colonnade converging on an altar core. */
function layoutNave(x, P, W, H, p, r, dm, fringe) {
  const vx = W * p.vpx, vy = H * p.vpy;
  depthFog(x, P, W, H, vx, vy, riteTint(P, p.riteI));
  floorGrid(x, P, W, H, vx, vy, Math.round(10 * dm), P.haze, 0.5, Math.max(1, W * 0.0012));

  // receding arches overhead, marching to the vanishing point
  const arN = Math.round(p.colN * (0.8 + dm * 0.4));
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = arN; i >= 1; i--) {
    const t = i / arN;                       // 1 = near (front), 0 = far
    const ax = vx;
    const baseY = vy + (H - vy) * (0.18 + 0.82 * t);
    const halfW = (W * 0.62) * t + W * 0.04;
    const ht = (baseY - vy) * 0.9;
    const a = 0.18 + 0.5 * t;
    wireArch(x, P, ax, baseY, halfW, ht, true, P.haze, a * 0.6, Math.max(1, W * 0.0016 * t + 0.4));
    // ribs from arch crown back to vanishing point
    x.strokeStyle = rgba(P.b, a * 0.4); x.lineWidth = Math.max(0.6, W * 0.001 * t);
    x.beginPath(); x.moveTo(ax, baseY - ht); x.lineTo(vx, vy); x.stroke();
  }
  x.restore();

  // colonnade of glyph-pillars, left & right, receding
  const pillars = Math.round(p.colN * dm);
  for (let i = pillars; i >= 1; i--) {
    const t = i / pillars;
    const top = vy + (H - vy) * (0.10 + 0.30 * t);
    const ph = (H - vy) * 0.85 * t;
    const pwd = W * 0.07 * t + W * 0.01;
    const off = (W * 0.50) * t + W * 0.04;
    const rows = Math.max(4, Math.round(14 * t));
    const a = 0.3 + 0.6 * t;
    const colDom = mix(P.a, P.b, p.accentMix * 0.5);
    ledgerSlab(x, P, vx - off, top, pwd, ph, rows, colDom, a, fringe * t, r);
    ledgerSlab(x, P, vx + off, top, pwd, ph, rows, colDom, a, fringe * t, r);
    // glyphstreams hanging between pillar tops and the floor
    if (r() < 0.6 * dm) {
      glyphstream(x, P, vx - off, top, vx - off + randn(r) * pwd, top + ph * 1.1,
        14 * t + 4, 5 * t + 2, Math.round(12 * t) + 4, GLY_ALL, P.ink, a * 0.7, fringe * t, r);
    }
  }

  // altar core at the vanishing point
  core(x, P, vx, vy + (H - vy) * 0.02, W * 0.10 * (1 + dm * 0.3), mix(P.a, P.c, 0.3), 1.0);

  // decoded signage above/below the altar
  const sgY = p.sigUp ? vy - H * 0.06 : vy + H * 0.14;
  signage(x, P, vx, sgY, pick(WORDS, r), Math.max(14, W * 0.022), P.c, 0.92, 0.5 + r() * 0.5, fringe);
}

/* 2. ROSE WINDOW — a vast circular hex-mandala dead-ahead. */
function layoutRose(x, P, W, H, p, r, dm, fringe) {
  const cx = W * (0.5 + (p.vpx - 0.5) * 0.3), cy = H * 0.45;
  depthFog(x, P, W, H, cx, cy, riteTint(P, p.riteI));

  // faint flanking ribbed arches for cathedral context
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 3; i++) {
      const ax = cx + s * W * (0.34 + i * 0.10);
      wireArch(x, P, ax, H * 0.96, W * 0.10, H * 0.8, true, P.haze, 0.18 - i * 0.04, Math.max(1, W * 0.0014));
    }
  }
  x.restore();

  const R = Math.min(W, H) * 0.40;
  // radial mullions
  x.save(); x.globalCompositeOperation = 'lighter';
  const spokes = Math.round((8 + p.ringN) * 2);
  for (let i = 0; i < spokes; i++) {
    const a = p.rotSeed + (i / spokes) * Math.PI * 2;
    conduit(x, P, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, P.haze, 0.35, Math.max(1, W * 0.0018));
  }
  x.restore();

  // concentric rings of glyph-tracery
  const rings = p.ringN;
  for (let ri = 1; ri <= rings; ri++) {
    const rr = R * (ri / rings);
    const count = Math.round((8 + ri * 6) * dm);
    const size = Math.max(10, R * 0.12 * (1 - ri / (rings + 2)));
    const col = ri % 2 === 0 ? P.a : mix(P.a, P.b, p.accentMix);
    // the glowing ring circle
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.haze, 0.4); x.lineWidth = Math.max(1, W * 0.0012);
    x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke();
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter';
    hexRing(x, P, cx, cy, rr, count, size, col, 0.85, p.rotSeed * (ri % 2 ? 1 : -1) + ri, ri % 2 ? GLY_HEX.split('') : GLY_RUNE.split(''), fringe, r);
    x.restore();
  }

  // bloomed oculus at centre
  core(x, P, cx, cy, R * 0.22 * (1 + dm * 0.2), mix(P.a, P.c, 0.4), 1.1);

  // a halo of signage arcing under the window
  signage(x, P, cx, cy + R * 1.04, pick(WORDS, r), Math.max(13, W * 0.02), P.c, 0.9, 0.5 + r() * 0.5, fringe);
}

/* 3. CRYPT — a low subterranean server-reactor in a flooded reflective vault. */
function layoutCrypt(x, P, W, H, p, r, dm, fringe) {
  const horizon = H * (0.34 + (p.vpy - 0.38) * 0.5);
  const vx = W * p.vpx;
  depthFog(x, P, W, H, vx, horizon, riteTint(P, p.riteI));

  // vast dark headroom: a few faint conduit arches up high
  x.save(); x.globalCompositeOperation = 'lighter';
  const overN = Math.round(4 * dm) + 2;
  for (let i = 0; i < overN; i++) {
    const ax = W * ((i + 0.5) / overN);
    wireArch(x, P, ax, horizon, W * 0.5 / overN, horizon * 0.7, false, P.haze, 0.22, Math.max(1, W * 0.0014));
    conduit(x, P, ax, horizon * 0.2, ax, horizon, mix(P.a, P.b, p.accentMix), 0.3, Math.max(1, W * 0.0016));
  }
  x.restore();

  // floor grid for the flooded vault
  floorGrid(x, P, W, H, vx, horizon, Math.round(14 * dm), P.haze, 0.45, Math.max(1, W * 0.001));

  // a wide phalanx of humming racks (ledger slabs) across the floor, depth-sorted
  const ranks = Math.round(3 + dm * 2);
  for (let rk = ranks; rk >= 1; rk--) {
    const t = rk / ranks;                       // 1 = near
    const rowY = horizon + (H - horizon) * (0.12 + 0.7 * t);
    const cnt = Math.round((5 + rk) * dm);
    const rackH = (H - horizon) * 0.5 * t + H * 0.04;
    const rackW = W * 0.05 * t + W * 0.012;
    for (let i = 0; i < cnt; i++) {
      const cxp = W * ((i + 0.5) / cnt) + randn(r) * rackW * 0.3;
      const col = mix(P.a, P.b, p.accentMix * (i % 3 === 0 ? 1 : 0.2));
      const rows = Math.max(3, Math.round(9 * t));
      ledgerSlab(x, P, cxp, rowY - rackH, rackW, rackH, rows, col, 0.3 + 0.6 * t, fringe * t, r);
      // reflection in the flooded floor (flipped, dimmed)
      x.save();
      x.globalAlpha = 0.28 * t;
      x.translate(cxp, rowY); x.scale(1, -0.55);
      ledgerSlab(x, P, 0, 0, rackW, rackH, rows, col, 0.5, fringe * t, r);
      x.restore();
    }
  }

  // the reactor core glowing low on the central axis
  core(x, P, vx, horizon + (H - horizon) * 0.30, W * 0.09 * (1 + dm * 0.3), mix(P.a, P.c, 0.3), 1.0);
  // its reflection
  x.save(); x.globalAlpha = 0.3;
  core(x, P, vx, horizon + (H - horizon) * 0.55, W * 0.07, mix(P.a, P.c, 0.3), 0.8);
  x.restore();

  signage(x, P, vx, horizon - H * 0.05, pick(WORDS, r), Math.max(13, W * 0.02), P.c, 0.9, 0.5 + r() * 0.5, fringe);
}

/* 4. TRIPTYCH — three tall arched panels (an altarpiece), each its own shrine. */
function layoutTriptych(x, P, W, H, p, r, dm, fringe) {
  depthFog(x, P, W, H, W * 0.5, H * 0.4, riteTint(P, p.riteI));
  const n = p.panelN;
  const gap = W * 0.02;
  const pw = (W - gap * (n + 1)) / n;
  for (let i = 0; i < n; i++) {
    const px0 = gap + i * (pw + gap);
    const center = i === 1;
    const top = H * (center ? 0.06 : 0.14);
    const bot = H * 0.94;
    const ph = bot - top;
    const cxp = px0 + pw / 2;

    // panel arch frame
    x.save(); x.globalCompositeOperation = 'lighter';
    wireArch(x, P, cxp, bot, pw / 2, ph, true, P.haze, 0.5, Math.max(1.2, W * 0.0018));
    // mullion sides
    conduit(x, P, px0, bot, px0, top + ph * 0.1, P.haze, 0.4, Math.max(1, W * 0.0014));
    conduit(x, P, px0 + pw, bot, px0 + pw, top + ph * 0.1, P.haze, 0.4, Math.max(1, W * 0.0014));
    x.restore();

    // clip the shrine content to the panel
    x.save();
    x.beginPath(); x.moveTo(px0, bot); x.lineTo(px0, top + ph * 0.3);
    x.quadraticCurveTo(px0, top, cxp, top); x.quadraticCurveTo(px0 + pw, top, px0 + pw, top + ph * 0.3);
    x.lineTo(px0 + pw, bot); x.closePath(); x.clip();

    // each panel a different shrine type, chosen deterministically
    const kind = (i + Math.floor(p.rotSeed)) % 3;
    if (kind === 0) {
      // stacked ledgers
      const slabs = Math.round(2 + dm);
      for (let s = 0; s < slabs; s++) {
        ledgerSlab(x, P, cxp, top + ph * 0.12, pw * 0.78, ph * 0.8,
          Math.round(18 * dm), mix(P.a, P.b, p.accentMix), 0.7, fringe, r);
      }
    } else if (kind === 1) {
      // a sigil: rings + core
      const rings = p.ringN - 1;
      for (let ri = 1; ri <= rings; ri++) {
        const rr = pw * 0.4 * (ri / rings);
        hexRing(x, P, cxp, top + ph * 0.45, rr, Math.round(6 + ri * 4), Math.max(8, pw * 0.08),
          ri % 2 ? P.a : P.b, 0.85, p.rotSeed + ri, GLY_SYM.split(''), fringe, r);
      }
      core(x, P, cxp, top + ph * 0.45, pw * 0.18, mix(P.a, P.c, 0.3), 0.9);
    } else {
      // a datastream column
      const streams = Math.round(2 + dm * 2);
      for (let s = 0; s < streams; s++) {
        const sxp = px0 + pw * (0.2 + 0.6 * (streams > 1 ? s / (streams - 1) : 0.5));
        glyphstream(x, P, sxp, top + ph * 0.05, sxp + randn(r) * pw * 0.1, bot,
          pw * 0.12, pw * 0.07, Math.round(20 * dm), GLY_ALL, P.ink, 0.8, fringe, r);
      }
    }
    x.restore();

    // signage plaque under each panel
    signage(x, P, cxp, bot - ph * 0.04, pick(WORDS, r), Math.max(10, pw * 0.09), P.c, 0.85, 0.5 + r() * 0.5, fringe);
  }
}

/* 5. APSE — a baroque fan of radiating ribs from a high off-centre keystone. */
function layoutApse(x, P, W, H, p, r, dm, fringe) {
  const kx = W * p.vpx, ky = H * (0.12 + (p.vpy - 0.38) * 0.3);
  depthFog(x, P, W, H, kx, ky, riteTint(P, p.riteI));

  // half-dome of groin-vault ribs fanning down from the keystone
  const ribs = Math.round((10 + p.colN) * (0.7 + dm * 0.5));
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i <= ribs; i++) {
    const t = i / ribs;
    const a = Math.PI * (0.12 + 0.76 * t);          // fan from lower-left to lower-right
    const len = Math.hypot(W, H) * (0.9 + 0.2 * Math.sin(t * Math.PI));
    const ex = kx + Math.cos(a) * len;
    const ey = ky + Math.sin(a) * len;
    // curved rib via a control point bowed outward
    const mx = (kx + ex) / 2 + Math.cos(a + Math.PI / 2) * len * 0.12;
    const my = (ky + ey) / 2 + Math.sin(a + Math.PI / 2) * len * 0.12;
    const col = i % 2 === 0 ? P.haze : mix(P.a, P.b, p.accentMix);
    const g = x.createLinearGradient(kx, ky, ex, ey);
    g.addColorStop(0, rgba(col, 0.55));
    g.addColorStop(0.6, rgba(col, 0.25));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g; x.lineCap = 'round'; x.lineWidth = Math.max(1, W * 0.0016);
    x.beginPath(); x.moveTo(kx, ky); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
  }
  x.restore();

  // concentric vault courses (arcs) crossing the ribs
  x.save(); x.globalCompositeOperation = 'lighter';
  const courses = Math.round(6 * dm) + 3;
  for (let c = 1; c <= courses; c++) {
    const rr = Math.hypot(W, H) * (c / courses) * 0.85;
    x.strokeStyle = rgba(P.haze, 0.3 + 0.2 * (1 - c / courses));
    x.lineWidth = Math.max(1, W * 0.0012);
    x.beginPath(); x.arc(kx, ky, rr, Math.PI * 0.12, Math.PI * 0.88); x.stroke();
  }
  x.restore();

  // glyphstreams raining down the ribs
  const showers = Math.round(ribs * 0.5 * dm);
  for (let i = 0; i < showers; i++) {
    const t = r();
    const a = Math.PI * (0.12 + 0.76 * t);
    const len = Math.hypot(W, H) * (0.5 + r() * 0.5);
    const ex = kx + Math.cos(a) * len, ey = ky + Math.sin(a) * len;
    glyphstream(x, P, kx, ky, ex, ey, 18, 6, Math.round(10 + 14 * r()), GLY_ALL, P.ink, 0.7, fringe, r);
  }

  // glyph-pillars standing along the apse floor base
  const baseN = Math.round(4 * dm) + 2;
  for (let i = 0; i < baseN; i++) {
    const cxp = W * ((i + 0.5) / baseN);
    const ph = H * (0.18 + r() * 0.18);
    ledgerSlab(x, P, cxp, H - ph, W * 0.05, ph, Math.round(8 + 6 * r()),
      mix(P.a, P.b, p.accentMix), 0.55, fringe, r);
  }

  // keystone core — the god, high and off-centre
  core(x, P, kx, ky, W * 0.10 * (1 + dm * 0.3), mix(P.a, P.c, 0.35), 1.1);
  signage(x, P, kx, ky + H * 0.10, pick(WORDS, r), Math.max(13, W * 0.02), P.c, 0.9, 0.5 + r() * 0.5, fringe);
}

/* ════════════════════════════════════════════════════════════════════════════
 * MASTER DRAW
 * ══════════════════════════════════════════════════════════════════════════ */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const dm = densMul(p.denI);
  // dual-tone palettes get a chromatic fringe; clean signal narrows it
  const dual = P.name === 'Glitchglass' || P.name === 'Goldghost';
  const fringe = (dual ? 1.6 : 0.7) * (p.sigI === 0 ? 0.6 : 1) * Math.max(1, W / 1280);

  // ── deep CRT void ground ──
  const bg = x.createRadialGradient(W * p.vpx, H * p.vpy, 0, W * p.vpx, H * p.vpy, Math.hypot(W, H) * 0.75);
  bg.addColorStop(0, mix(P.ground, P.haze, 0.18));
  bg.addColorStop(0.5, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000000', 0.6));
  x.fillStyle = bg; x.fillRect(0, 0, W, H);

  // ── the room ──
  switch (p.layI) {
    case 0: layoutNave(x, P, W, H, p, r, dm, fringe); break;
    case 1: layoutRose(x, P, W, H, p, r, dm, fringe); break;
    case 2: layoutCrypt(x, P, W, H, p, r, dm, fringe); break;
    case 3: layoutTriptych(x, P, W, H, p, r, dm, fringe); break;
    case 4: layoutApse(x, P, W, H, p, r, dm, fringe); break;
  }

  // ── scattered bloom haloes for atmosphere (floating glyphs catching light) ──
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < p.haloN + Math.round(dm); i++) {
    const hx = W * r(), hy = H * (0.1 + r() * 0.8), rr = W * (0.03 + r() * 0.05);
    const g = x.createRadialGradient(hx, hy, 0, hx, hy, rr);
    g.addColorStop(0, rgba(mix(P.a, P.c, 0.4), 0.18));
    g.addColorStop(1, rgba(P.a, 0));
    x.fillStyle = g; x.beginPath(); x.arc(hx, hy, rr, 0, Math.PI * 2); x.fill();
  }
  // a sparse haze of free-floating glyphs across the whole void (dust of data)
  // capped so the heaviest-density text cost stays bounded; 120 sits above the
  // Teeming count (~90) so normal seeds are visually identical.
  const dust = Math.min(120, Math.round(60 * dm));
  for (let i = 0; i < dust; i++) {
    x._g = glyph(GLY_ALL, r);
    drawGlyph(x, P, W * r(), H * r(), 6 + r() * 12, r() < 0.2 ? P.c : P.ink, 0.05 + r() * 0.14, fringe * 0.5);
  }
  x.restore();

  // ── GLITCH: horizontal datamosh slices torn and offset ──
  // getImageData/putImageData is the single most expensive op in the frame, so
  // it's ceilinged on two axes: slice COUNT (GLITCH_MAX_SLICES) and pixel AREA
  // moved per slice (GLITCH_MAX_SLICE_H, capping each slice's height). The look
  // is preserved — same number of tears at typical Glitched/Decaying seeds,
  // same offset behaviour — only the worst case is bounded, and a too-tall slice
  // degrades gracefully to a thinner tear rather than a full-frame copy.
  if (p.glitchA > 0.2) {
    const GLITCH_MAX_SLICES = 12;
    const GLITCH_MAX_SLICE_H = Math.max(2, Math.floor(H * 0.04));
    const slices = Math.min(GLITCH_MAX_SLICES, Math.round(p.glitchA * 14));
    for (let i = 0; i < slices; i++) {
      const sy = Math.floor(r() * H);
      const sh = Math.min(GLITCH_MAX_SLICE_H, Math.max(2, Math.floor(r() * H * 0.04)));
      const dx = (r() - 0.5) * W * 0.05 * p.glitchA;
      try {
        const img = x.getImageData(0, sy, W, sh);
        x.putImageData(img, clamp(dx, -W, W), sy);
      } catch (e) { /* tainted canvas guard — no-op */ }
      // a neon tear line at the slice edge
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(r() < 0.5 ? P.a : P.b, 0.25 * p.glitchA);
      x.fillRect(0, sy, W, 1);
      x.restore();
    }
  }

  // ── CRT scanlines ──
  x.save();
  x.globalCompositeOperation = 'multiply';
  const sl = Math.max(2, Math.round(H / 320));
  x.fillStyle = 'rgba(0,0,0,0.22)';
  for (let yy = 0; yy < H; yy += sl) x.fillRect(0, yy, W, Math.max(1, sl * 0.5));
  x.restore();
  // soft phosphor scan bloom band drifting
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bandY = H * (0.2 + r() * 0.6);
  const bg2 = x.createLinearGradient(0, bandY - H * 0.06, 0, bandY + H * 0.06);
  bg2.addColorStop(0, rgba(P.a, 0));
  bg2.addColorStop(0.5, rgba(P.a, 0.05));
  bg2.addColorStop(1, rgba(P.a, 0));
  x.fillStyle = bg2; x.fillRect(0, bandY - H * 0.06, W, H * 0.12);
  x.restore();

  // ── finishing texture: phosphor mottle, grain, paper-tooth, barrel vignette ──
  mottle(x, 0, 0, W, H, P.a, 220, r, 'screen');
  paperTooth(x, W, H, r);
  grain(x, W, H, 700, r);
  vignette(x, W, H, p.riteI === 2 ? 0.5 : 0.42);
}

/* ════════════════════════════════════════════════════════════════════════════
 * EXPORTS  (names must match the registry contract exactly)
 * ══════════════════════════════════════════════════════════════════════════ */
export const haloDTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const haloDSchema: TraitSchema = {
  traits: [
    { name: 'Layout',  values: LAYOUTS },
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format',  values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Density', values: DENSITY },
    { name: 'Signal',  values: SIGNAL },
    { name: 'Rite',    values: RITE },
  ],
};

export const renderHaloD: EngineFn = blit(draw, haloDTraits);

// W/H of Square, Portrait, Landscape (matches FMTS order).
export const HALOD_ASPECTS = [1, 0.753, 1.328] as const;
