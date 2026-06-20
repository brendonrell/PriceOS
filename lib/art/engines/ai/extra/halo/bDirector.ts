// @ts-nocheck
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GLYPHSTORM — by bDirector-ai.  "The mainframe dreams in glyphs."          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * CONCEPT
 * A dense storm of terminal glyphs — hex digits, box-drawing strokes, runic
 * tick-marks, katakana-flavoured slashes — cascading through a hazy phosphor
 * void, then CONDENSING out of the noise into a coherent semi-architectural /
 * figural form. The edges of the frame are pure decode-noise (loose, dim,
 * jittered glyph dust); as you move toward the focus the storm RESOLVES — glyphs
 * snap to a structure, brighten, gain bloom, and reveal the hidden shape the
 * mainframe is "rendering": a Monolith, an Apparition (face), a Cascade wave, a
 * Wellspring upwelling, or an Eye. A living mainframe mid-computation — NOT an
 * outrun poster: no sunset, no horizon grid, no chrome. Deep dark grounds,
 * electric jewel neon, scanlines, glitch tears, phosphor decay trails, bloom.
 *
 * Crucially the SCENE is built from DRAWN primitives — vector glyph strokes,
 * gradient masses, wireframe — so the hero forms render identically everywhere.
 * `fillText` is used only as a capped fine glyph-dust texture on top, never for
 * the load-bearing structure.
 *
 * LAYOUTS (the PRIMARY trait — 5 structurally distinct draw routines; the storm
 * condenses into a different thing in each, and the whole composition changes):
 *   1. Monolith    — the glyphs gather into a tall central data-tower / slab,
 *                    a wireframe megastructure rising out of the cascade, with
 *                    a bright resolved spine and noise falling away at the edges.
 *   2. Apparition  — a colossal semi-abstract FACE/mask decodes out of the
 *                    storm: a radial glyph field whose density is sculpted by a
 *                    face mask (brow, eyes, cheek planes), eyes as bright cores.
 *   3. Cascade     — a Matrix-style vertical rain of glyph columns that bends
 *                    and CONDENSES into a sweeping diagonal WAVE crest of light,
 *                    foam of bright glyphs along the breaking edge.
 *   4. Wellspring  — a non-perspective UPWELLING: glyph density fountains up from
 *                    a source low in the frame and spreads outward, ringed by
 *                    concentric radial decode rings condensing from the noise. No
 *                    vanishing point, no horizon — pure abstract-terminal bloom.
 *   5. Eye         — a vast iris/aperture: concentric glyph rings + radial
 *                    spokes spiralling into a blazing pupil core, a scanning
 *                    decode-bar crossing it. A single watching mainframe eye.
 *
 * PALETTES (10, SATURATED jewel neon on deep dark grounds — discipline per
 * palette, never a muddy rainbow): see PALS. Each names a ground, a deep
 * mid-tint, a dominant phosphor, a hot highlight, a wire/grid tint and ONE
 * restrained second accent for signage.
 *
 * WHY HALO-WORTHY
 * Density as a feature — thousands of drawn marks plus capped glyph-dust read as
 * a real busy mainframe with depth; the decode/resolve gradient (noise→coherent)
 * gives every seed a focal narrative; five genuinely different compositions plus
 * 10 bold colorways and 3 formats make a sheet of seeds look like a whole
 * terminal ecosystem, not one image relocated. Saturated, deep, textured, epic.
 *
 * Deterministic from tokenId ONLY. ALL trait-determining randomness is drawn in
 * paramsOf() in a FIXED order so traits() and draw() never disagree. Additive
 * 'lighter'/'screen' compositing for all glow; per-pixel loops avoided for big
 * areas; glyph-dust counts hard-capped.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, paperTooth, blit, PHI, INVPHI } from '../_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../../project/types';

/* ── Palettes ───────────────────────────────────────────────────────────────
 * ground = void base, deep = mid haze/wire fill, phos = dominant phosphor trace,
 * hot = bright resolve highlight, wire = wireframe/scanline tint, accent = the
 * ONE restrained second colour for signage/decoded marks. 10 disciplined,
 * SATURATED cyberpunk colorways — deep dark grounds + electric jewel neon. */
const PALS = [
  // 1. classic mainframe phosphor green, but jewel-bright with a cyan accent.
  { name: 'Terminal Green', ground: '#02110a', deep: '#063a22', phos: '#34ff9a', hot: '#d6ffe6', wire: '#127a48', accent: '#22e0ff' },
  // 2. ice cyan datastream on deep teal-black, hot magenta signage.
  { name: 'Cryo Cyan',      ground: '#02121c', deep: '#063c52', phos: '#1ad8ff', hot: '#d8fbff', wire: '#1b7ea0', accent: '#ff3ce0' },
  // 3. hot magenta lab glow on near-black violet, lime accent.
  { name: 'Magenta Surge',  ground: '#14021a', deep: '#3c0a44', phos: '#ff3ce0', hot: '#ffd4f6', wire: '#a02a90', accent: '#7dff3a' },
  // 4. amber sodium terminal, deep brown-black, cyan accent.
  { name: 'Amber CRT',      ground: '#160c01', deep: '#3e2606', phos: '#ffae18', hot: '#ffe9b0', wire: '#9a6a14', accent: '#22d8ff' },
  // 5. electric violet on indigo void, mint accent.
  { name: 'Violet Mainframe',ground: '#0a0626', deep: '#1e1260', phos: '#9a6cff', hot: '#e2d6ff', wire: '#5a44c0', accent: '#46ffc8' },
  // 6. red-alert console, oxblood void, amber accent.
  { name: 'Red Alert',      ground: '#170303', deep: '#420a0a', phos: '#ff4438', hot: '#ffd0b8', wire: '#a83020', accent: '#ffc83a' },
  // 7. acid lime datastorm on deep green-black, hot pink accent.
  { name: 'Acid Lime',      ground: '#0a1402', deep: '#244006', phos: '#b6ff1f', hot: '#eaffb8', wire: '#7ac414', accent: '#ff3ca0' },
  // 8. azure circuitry on cobalt void, gold accent.
  { name: 'Azure Circuit',  ground: '#030c26', deep: '#0a2470', phos: '#3a8cff', hot: '#d0e6ff', wire: '#2a52c0', accent: '#ffcf3a' },
  // 9. dual cyan+magenta "glitch" pair on black — the boldest, most electric.
  { name: 'Glitch Spectrum',ground: '#06030f', deep: '#241452', phos: '#33e0ff', hot: '#dcefff', wire: '#6a3cc0', accent: '#ff2cc0' },
  // 10. gold-on-black "decrypted gold" — luxe terminal, teal accent.
  { name: 'Decrypt Gold',   ground: '#100b02', deep: '#3a2a06', phos: '#ffd23a', hot: '#fff3c4', wire: '#a07a18', accent: '#2affc8' },
];

/* Formats — real W/H; ratios in HALOB_ASPECTS below (same order). */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1320, t: 'Tall' },
  { W: 1320, H: 1000, t: 'Wide' },
];

/* PRIMARY trait — each value is a different draw routine. */
const LAYOUTS = ['Monolith', 'Apparition', 'Cascade', 'Wellspring', 'Eye'];

/* Secondary axes. */
const DENSITY  = ['Sparse', 'Dense', 'Storm'];   // glyph-mark volume
const DECODE   = ['Booting', 'Resolving', 'Locked']; // how coherent the focus is
const GLITCH   = ['Clean', 'Torn', 'Shattered'];     // glitch-tear intensity

/* The drawn-glyph vocabulary: each is a tiny set of strokes in a unit cell
 * [-0.5..0.5]. These build the SCENE (render identically everywhere). The codes
 * below are indices, picked deterministically; renderGlyph() draws them. */
const GLYPH_KINDS = 13;

/* Capped glyph-dust characters (fillText texture ONLY, on top, hard-capped). */
const DUST_CHARS = '01XAF#%$&/\\|=+<>[]{}╫╪┼░▓★ｱｶｷﾂﾈﾗ◊';

/* ── Param draw (FIXED ORDER — Layout FIRST) ──────────────────────────────── */
function paramsOf(r) {
  const layoutI  = Math.floor(r() * LAYOUTS.length);   // PRIMARY
  const palI     = Math.floor(r() * PALS.length);
  const fmt      = pick(FMTS, r);
  const densI    = Math.floor(r() * DENSITY.length);
  const decodeI  = Math.floor(r() * DECODE.length);
  const glitchI  = Math.floor(r() * GLITCH.length);

  // ── Free composition params (NOT surfaced as traits) ──
  const focusX   = clamp(0.5 + randn(r) * 0.12, 0.3, 0.7);   // resolve focal point
  const focusY   = clamp(0.5 + randn(r) * 0.12, 0.3, 0.7);
  const seedNoise= r() * 1000;
  const tilt     = randn(r) * 0.18;                          // slight scene tilt
  const flip     = r() < 0.5 ? 1 : -1;                       // mirror some forms
  const hueShift = (r() - 0.5) * 18;                         // small per-seed hue drift

  // Monolith
  const monoW    = 0.22 + r() * 0.14;                        // tower width frac
  const monoTiers= rint(r, 5, 9);
  const monoLean = randn(r) * 0.06;

  // Apparition (face)
  const faceTilt = randn(r) * 0.12;
  const faceW    = 0.46 + r() * 0.12;
  const eyeGap   = 0.16 + r() * 0.06;

  // Cascade (wave)
  const waveDir  = r() < 0.5 ? 1 : -1;
  const waveCrest= 0.42 + r() * 0.18;
  const colN     = rint(r, 22, 38);

  // Wellspring (non-perspective upwelling — same fixed RNG draw order as before)
  const wellRings = rint(r, 6, 10);                          // concentric decode rings
  const wellArms  = rint(r, 5, 8);                           // upwelling plume arms
  const wellX     = clamp(0.5 + randn(r) * 0.18, 0.32, 0.68);// source x
  const wellY     = clamp(0.74 + randn(r) * 0.10, 0.6, 0.9); // source low in frame

  // Eye
  const eyeRings = rint(r, 9, 15);
  const eyeSpokes= rint(r, 36, 64);
  const eyeSpin  = randn(r) * 0.6;

  // Glyph storm volume
  const stormMul = densI === 0 ? 0.55 : densI === 1 ? 1.0 : 1.6;
  const resolveR = decodeI === 0 ? 0.22 : decodeI === 1 ? 0.34 : 0.5; // resolved radius frac
  const glitchN  = glitchI === 0 ? rint(r, 1, 2) : glitchI === 1 ? rint(r, 3, 5) : rint(r, 6, 10);

  return {
    layoutI, palI, fmt, densI, decodeI, glitchI,
    focusX, focusY, seedNoise, tilt, flip, hueShift,
    monoW, monoTiers, monoLean,
    faceTilt, faceW, eyeGap,
    waveDir, waveCrest, colN,
    wellRings, wellArms, wellX, wellY,
    eyeRings, eyeSpokes, eyeSpin,
    stormMul, resolveR, glitchN,
  };
}

function labels(p) {
  return {
    Layout:  LAYOUTS[p.layoutI],
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Density: DENSITY[p.densI],
    Decode:  DECODE[p.decodeI],
    Glitch:  GLITCH[p.glitchI],
  };
}

/* Deterministic value-noise. */
function vnoise(i, seed) {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/* Phosphor colour at a hue-shifted palette base. */
function phos(P, shift) {
  return mix(P.phos, P.hot, clamp(shift, 0, 1));
}

/* COOLED PHOSPHOR — a saturated near-white that still carries palette colour,
 * so peak bloom cores read CHROMATIC instead of blowing to paper-white. Tints
 * a hot base toward white but caps the mix so hue survives at the seed. */
function coolHot(P) {
  return mix(P.hot, '#ffffff', 0.6);
}

/* The "cold/noise" hue at the unresolved edge of the decode sweep — a deep,
 * desaturated tint pooled from the palette's deep + wire, distinct from the hot
 * resolved hue so the hero reads as a COLOUR transition, not just brightness. */
function coldHue(P) {
  return mix(P.deep, P.wire, 0.55);
}

/* ════════════════════════════════════════════════════════════════════════
 * CORE: a single DRAWN terminal glyph in a unit cell, scaled to `s`, at (x,y).
 * 13 kinds — hex-bars, box-drawing, runes, slashes, brackets — pure strokes so
 * it renders identically everywhere. `bright` 0..1 drives both alpha and a
 * resolve→coherent crispness. Glow is the caller's composite ('lighter').
 * ════════════════════════════════════════════════════════════════════════ */
function renderGlyph(x, kind, gx, gy, s, col, bright, jitter, r) {
  const a = clamp(bright, 0, 1);
  const lw = Math.max(0.6, s * (0.10 + 0.05 * a));
  x.save();
  x.translate(gx, gy);
  // unresolved glyphs are jittered/rotated; resolved ones snap to grid
  if (jitter > 0) {
    x.translate(randn(r) * jitter * s, randn(r) * jitter * s);
    x.rotate(randn(r) * jitter * 0.5);
  }
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = rgba(col, 0.25 + 0.6 * a);
  x.fillStyle = rgba(col, 0.25 + 0.6 * a);
  x.lineWidth = lw;
  const u = s * 0.42; // half-extent
  x.beginPath();
  switch (kind) {
    case 0: // hex "0" — rounded box
      x.rect(-u * 0.7, -u, u * 1.4, u * 2); x.stroke();
      x.beginPath(); x.moveTo(-u * 0.7, -u); x.lineTo(u * 0.7, u); x.stroke();
      break;
    case 1: // "1"/tick
      x.moveTo(0, -u); x.lineTo(0, u); x.stroke();
      x.beginPath(); x.moveTo(-u * 0.5, -u * 0.6); x.lineTo(0, -u); x.stroke();
      break;
    case 2: // box-drawing cross ┼
      x.moveTo(-u, 0); x.lineTo(u, 0); x.moveTo(0, -u); x.lineTo(0, u); x.stroke();
      break;
    case 3: // double cross ╫
      x.moveTo(-u, -u * 0.3); x.lineTo(u, -u * 0.3);
      x.moveTo(-u, u * 0.3); x.lineTo(u, u * 0.3);
      x.moveTo(0, -u); x.lineTo(0, u); x.stroke();
      break;
    case 4: // slash /
      x.moveTo(-u * 0.8, u); x.lineTo(u * 0.8, -u); x.stroke();
      break;
    case 5: // backslash \
      x.moveTo(-u * 0.8, -u); x.lineTo(u * 0.8, u); x.stroke();
      break;
    case 6: // bracket [
      x.moveTo(u * 0.4, -u); x.lineTo(-u * 0.4, -u); x.lineTo(-u * 0.4, u); x.lineTo(u * 0.4, u); x.stroke();
      break;
    case 7: // angle <
      x.moveTo(u * 0.6, -u); x.lineTo(-u * 0.5, 0); x.lineTo(u * 0.6, u); x.stroke();
      break;
    case 8: // rune Y-fork
      x.moveTo(0, u); x.lineTo(0, 0); x.lineTo(-u * 0.7, -u);
      x.moveTo(0, 0); x.lineTo(u * 0.7, -u); x.stroke();
      break;
    case 9: // hex digit "A" — peak
      x.moveTo(-u * 0.7, u); x.lineTo(0, -u); x.lineTo(u * 0.7, u);
      x.moveTo(-u * 0.35, u * 0.1); x.lineTo(u * 0.35, u * 0.1); x.stroke();
      break;
    case 10: // diamond ◊
      x.moveTo(0, -u); x.lineTo(u * 0.7, 0); x.lineTo(0, u); x.lineTo(-u * 0.7, 0); x.closePath(); x.stroke();
      break;
    case 11: // katakana-ish ｱ : a stroke + a hook
      x.moveTo(-u * 0.8, -u * 0.4); x.lineTo(u * 0.8, -u * 0.4);
      x.moveTo(u * 0.2, -u); x.lineTo(-u * 0.3, u); x.lineTo(-u * 0.8, u * 0.6); x.stroke();
      break;
    default: // filled data-pip (resolved bit)
      x.beginPath(); x.arc(0, 0, u * 0.4 * (0.6 + 0.6 * a), 0, Math.PI * 2); x.fill();
      break;
  }
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════
 * COMPOSITION — phi-point focal hierarchy (the fix).
 *
 * The old engine dumped ONE oversized glyph dead-centre on every seed. This
 * builds a real composition instead: a DOMINANT focal point on a golden-ratio /
 * rule-of-thirds line (never 0.5,0.5), ANSWERED by a SECONDARY mass on the
 * opposite phi line and a smaller TERTIARY accent — asymmetric balance — with
 * one quadrant left deliberately quiet as negative space. All of it is drawn
 * from a FREE composition RNG created in draw() AFTER paramsOf(), so traits()
 * never sees this randomness and determinism by tokenId is preserved.
 *
 * `composeFoci` returns the focal set for a seed. `anchor` is an optional layout
 * hint (e.g. Eye/Wellspring pin the dominant to their structural centre); when
 * absent the dominant lands on a varied phi/thirds intersection.
 * ════════════════════════════════════════════════════════════════════════ */
const PHI_PTS = [INVPHI, 1 - INVPHI, 1 / 3, 2 / 3];   // 0.618, 0.382, 0.333, 0.667
// The four golden/thirds intersections — strong off-centre focal anchors. Every
// one sits well clear of the dead-centre 40% box (0.30..0.70 on both axes), so a
// dominant placed here can NEVER read as a centred hero.
const PHI_X = [INVPHI, 1 - INVPHI];   // 0.618 / 0.382
const PHI_Y = [INVPHI, 1 - INVPHI];   // 0.618 / 0.382
// "is this point inside the dead-centre box?" — used to assert no centred hero.
function inDeadZone(x, y) { return x > 0.40 && x < 0.60 && y > 0.40 && y < 0.60; }

/* Build the off-centre focal CONSTELLATION for a seed: a dominant on a chosen
 * phi intersection, a phi-scaled secondary diagonally opposite (asymmetric
 * balance), two smaller tertiaries scattered to the remaining thirds, and a
 * deliberately QUIET quadrant left empty as negative space. The dominant is
 * pushed HARD off-centre — if a caller-supplied anchor lands near the middle it
 * is shoved to the nearest phi corner. This is the single focal authority; no
 * layout dumps a glyph at the geometric centre any more. */
function composeFoci(W, H, cr, anchor) {
  // dominant: a golden intersection, varied per seed; pushed off-centre always.
  let dx, dy;
  if (anchor) {
    // snap a structural anchor away from the dead zone toward a phi corner.
    dx = inDeadZone(anchor.x, 0.4) ? (anchor.x < 0.5 ? 1 - INVPHI : INVPHI) : clamp(anchor.x, 0.18, 0.82);
    dy = anchor.yLock != null ? anchor.y
       : (inDeadZone(0.4, anchor.y) ? (anchor.y < 0.5 ? 1 - INVPHI : INVPHI) : clamp(anchor.y, 0.18, 0.82));
  } else {
    dx = PHI_X[Math.floor(cr() * 2)];
    dy = PHI_Y[Math.floor(cr() * 2)];
  }
  // which corner is the dominant in? secondary answers DIAGONALLY opposite for
  // asymmetric balance; the empty diagonal becomes the quiet negative-space.
  const leftDom = dx < 0.5, topDom = dy < 0.5;
  const sx = clamp((leftDom ? 0.66 : 0.34) + (cr() - 0.5) * 0.10, 0.18, 0.82);
  const sy = clamp((topDom ? 0.64 : 0.36) + (cr() - 0.5) * 0.14, 0.18, 0.82);
  // tertiary A — same vertical band as dominant, pushed to the far horizontal
  // third (spreads mass across, threads the eye sideways).
  const tx = clamp((leftDom ? 0.78 : 0.22) + (cr() - 0.5) * 0.10, 0.12, 0.88);
  const ty = clamp(dy + (cr() - 0.5) * 0.22, 0.14, 0.86);
  // tertiary B — a far accent in the OTHER vertical band but same side as
  // dominant, to break the diagonal symmetry without filling the quiet corner.
  const ux = clamp(dx + (cr() - 0.5) * 0.16, 0.12, 0.88);
  const uy = clamp((topDom ? 0.72 : 0.28) + (cr() - 0.5) * 0.16, 0.14, 0.86);
  return {
    dom: { x: dx, y: dy, w: 1.0 },                       // dominant
    sec: { x: sx, y: sy, w: INVPHI },                    // secondary (phi)
    ter: { x: tx, y: ty, w: INVPHI * INVPHI },           // tertiary (phi²)
    qad: { x: ux, y: uy, w: INVPHI * INVPHI * INVPHI },  // far accent (phi³)
    leftDom, topDom,
    list: [
      { x: dx, y: dy, w: 1 },
      { x: sx, y: sy, w: INVPHI },
      { x: tx, y: ty, w: INVPHI * INVPHI },
      { x: ux, y: uy, w: INVPHI * INVPHI * INVPHI },
    ],
  };
}

/* A FOCAL MASS — a tight cluster of a few oversized glyphs centred on a focal
 * point, brightest at the core, with bloom backing so it reads as one coherent
 * resolved form sitting above the fine grid. Replaces the old single centred
 * tower: called once per focal point (dominant + secondary + tertiary) so every
 * seed has multiple weighted forms, never one lonely thing. */
function focalMass(x, W, H, P, p, r, cxp, cyp, size, weight, maskFn, seedOff) {
  const S = Math.min(W, H);
  const n = weight > 0.8 ? 5 : weight > 0.45 ? 3 : 2;   // dominant denser
  x.save();
  x.globalCompositeOperation = 'lighter';
  // a soft mass halo so the cluster reads as one body, not scattered marks
  bloom(x, cxp, cyp, size * 0.85, mix(P.deep, P.phos, 0.45), 0.05 + weight * 0.05);
  for (let i = 0; i < n; i++) {
    // a tight rosette around the focus rather than a tall vertical stack
    const ang = (i / n) * Math.PI * 2 + vnoise(i * 2.9, p.seedNoise + seedOff) * 1.4;
    const rad = i === 0 ? 0 : size * (0.20 + vnoise(i * 5.1, p.seedNoise + seedOff + 3) * 0.30);
    const sz = size * (i === 0 ? 1.0 : 0.46 + vnoise(i * 7.3, p.seedNoise + seedOff) * 0.22) * (0.7 + weight * 0.5);
    const gx = cxp + Math.cos(ang) * rad;
    const gy = cyp + Math.sin(ang) * rad;
    const m = maskFn ? clamp(maskFn(gx / W, gy / H), 0, 1) : 0.7;
    // brightness scales with the focal WEIGHT (hierarchy) and local resolve.
    const bright = clamp((0.40 + m * 0.5) * (0.55 + weight * 0.5), 0, 1);
    const col = bright > 0.66 ? mix(P.hot, coolHot(P), 0.5)
              : bright > 0.46 ? P.phos
              : mix(coldHue(P), P.phos, 0.5);
    const kind = Math.floor(vnoise(i * 3.7 + seedOff, p.seedNoise + 11) * GLYPH_KINDS);
    bloom(x, gx, gy, sz * 0.6, mix(P.deep, P.phos, 0.5), 0.04 + bright * 0.05);
    renderGlyph(x, kind, gx, gy, sz, col, bright, (1 - m) * 0.18, r);
  }
  x.restore();
}

/* Draw the full focal hierarchy for a seed: dominant + answering masses. The
 * dominant is colossal; secondary and tertiary are phi-scaled and dimmer, placed
 * by composeFoci for asymmetric balance. This is what fills the frame with a
 * multi-focal SCENE instead of one centred hero. */
function heroAnchor(x, W, H, P, p, r, cxp, cyp, size, maskFn) {
  // Back-compat shim: the dominant focal mass at the layout's structural centre.
  // (Kept so any direct callers still get a strong anchor; the richer multi-focal
  // pass runs via drawFoci below, driven by p.foci set in draw().)
  focalMass(x, W, H, P, p, r, cxp, cyp, size, 1.0, maskFn, 0);
}

function drawFoci(x, W, H, P, p, r, maskFn, domSize) {
  const f = p.foci;
  if (!f) return;
  // The full off-centre constellation: dominant + diagonally-opposite secondary
  // + two scattered phi-scaled accents. Sizes step down by phi so a clear focal
  // HIERARCHY reads (near/large → mid → far), the eye travels across the frame,
  // and the heaviest mass sits OFF-centre with a quiet quadrant left open.
  focalMass(x, W, H, P, p, r, f.dom.x * W, f.dom.y * H, domSize, 1.0, maskFn, 0);
  focalMass(x, W, H, P, p, r, f.sec.x * W, f.sec.y * H, domSize * INVPHI, INVPHI, maskFn, 17);
  focalMass(x, W, H, P, p, r, f.ter.x * W, f.ter.y * H, domSize * INVPHI * INVPHI, INVPHI * INVPHI, maskFn, 41);
  focalMass(x, W, H, P, p, r, f.qad.x * W, f.qad.y * H, domSize * INVPHI * INVPHI * INVPHI, INVPHI * INVPHI * INVPHI, maskFn, 73);
}

/* ════════════════════════════════════════════════════════════════════════
 * THE GLYPH STORM FIELD — the shared engine. Walks a grid of cells; each cell's
 * resolve `bright` is driven by a per-layout MASK fn (1 = condensed/coherent at
 * the form, 0 = loose noise). Coherent cells: bright, on-grid, palette phos.
 * Noise cells: dim, jittered, deep-tint, sometimes skipped. Additive glow.
 * `maskFn(u,v)` takes normalised [0..1] coords → resolve strength 0..1.
 * ════════════════════════════════════════════════════════════════════════ */
function glyphStorm(x, W, H, P, p, r, maskFn, opts) {
  opts = opts || {};
  const S = Math.min(W, H);
  // cell size scales with density; capped to keep mark count bounded. Tighter
  // base cell than before so the field reads BUSY and fills the frame instead
  // of leaving the void mostly black.
  const cell = S * (opts.cell || 0.024) / Math.sqrt(p.stormMul);
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  // hard cap on drawn glyphs so big/Storm seeds never blow up.
  const cap = opts.cap || 6500;
  // FOCAL FIELD — extra resolve pooled around every focal point so the storm
  // condenses into the multi-focal hierarchy, not one centre. A leading-line
  // term threads brightness between the dominant and secondary so the eye flows.
  const foci = p.foci ? p.foci.list : null;
  const total = cols * rows;
  const stride = Math.max(1, Math.ceil(total / cap));
  const hotCol = phos(P, p.hueShift > 0 ? 0.18 : 0.0);
  const cold = coldHue(P);          // cold/noise hue at the unresolved edge
  const peak = coolHot(P);          // cooled (chromatic) near-white at the core
  x.save();
  x.globalCompositeOperation = 'lighter';
  let drawn = 0, k = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      k++;
      if (k % stride !== 0) continue;
      const gx0 = cx * cell + cell * 0.5;
      const gy0 = cy * cell + cell * 0.5;
      const u = gx0 / W, v = gy0 / H;
      let m = clamp(maskFn(u, v), 0, 1);
      // pool extra resolve around each focal point (hierarchy-weighted) and along
      // the dominant→secondary axis (a leading line), so the field condenses into
      // the composition and threads the eye between the masses.
      if (foci) {
        let fb = 0;
        for (const fp of foci) {
          const d = Math.hypot((u - fp.x) * W, (v - fp.y) * H) / (S * (0.34 + 0.18 * fp.w));
          fb = Math.max(fb, clamp(1 - d, 0, 1) * (0.45 + 0.55 * fp.w));
        }
        // leading line: distance to the dominant→secondary segment
        const a = foci[0], b = foci[1];
        const ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H;
        const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
        const t = clamp(((u * W - ax) * vx + (v * H - ay) * vy) / L2, 0, 1);
        const lx = ax + vx * t, ly = ay + vy * t;
        const ld = Math.hypot(u * W - lx, v * H - ly) / (S * 0.06);
        const line = clamp(1 - ld, 0, 1) * 0.4;
        m = clamp(m + fb * 0.6 + line, 0, 1);
      }
      // noise threshold: drop most loose cells so the void breathes,
      // keep almost all coherent ones for density at the focus.
      // DENSITY FLOOR: a baseline of loose dust survives everywhere so even a
      // sparse / low-resolve seed never renders thin or empty. Raised so the
      // frame is filled, not mostly black — deliberate quiet quadrants come from
      // the focal layout, not from a globally empty void.
      // ASYMMETRIC FLOOR: full baseline dust on the dominant's side of the frame,
      // but it THINS toward the quadrant diagonally opposite the dominant — that
      // corner becomes deliberate negative space, so the densest mass sits clearly
      // off-centre and the eye reads a composed scene, not an even rectangular haze.
      let floor = 0.26 + (1 - p.stormMul / 1.6) * 0.05;
      if (p.foci) {
        const d0 = p.foci.dom;
        // 1 near the dominant corner → 0 in the opposite (quiet) corner.
        const side = clamp(1 - (Math.abs(u - d0.x) + Math.abs(v - d0.y)) / 1.3, 0, 1);
        floor *= 0.32 + 0.68 * side;       // up to ~⅔ thinner in the quiet corner
      }
      const keep = m * 0.9 + 0.10 + floor * 0.6 + (vnoise(cx * 3.1 + cy * 7.7, p.seedNoise) - 0.5) * 0.3;
      if (keep < 0.30) continue;
      const bright = clamp(m * m * 1.15, 0, 1);
      const jitter = (1 - m) * 0.55;                 // loose at edges, snapped at focus
      const sz = cell * (0.78 + bright * 0.5);
      // colour: TWO-HUE decode sweep — cold/noise hue at the unresolved edge
      // transitions through phosphor to a cooled (chromatic) near-white core,
      // so the resolve reads as a colour transition, not just a brightness ramp.
      let col;
      if (bright > 0.72) col = mix(mix(P.hot, hotCol, 0.4), peak, 0.5);
      else if (bright > 0.4) col = mix(P.phos, P.hot, (bright - 0.4) / 0.32 * 0.4);
      else col = mix(cold, P.phos, clamp(bright / 0.4, 0, 1));
      // occasional accent signage glyph in resolved zones
      if (bright > 0.5 && vnoise(cx * 5.3 + cy * 2.1, p.seedNoise + 9) > 0.93) col = P.accent;
      const kind = Math.floor(vnoise(cx * 2.7 + cy * 4.3, p.seedNoise + 3) * GLYPH_KINDS);
      renderGlyph(x, kind, gx0, gy0, sz, col, bright * (0.55 + 0.45 * (opts.gain || 1)), jitter, r);
      drawn++;
    }
  }
  x.restore();
  return drawn;
}

/* Phosphor bloom blob at a point — the resolved-core glow. */
function bloom(x, cx, cy, rad, col, alpha) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(col, alpha));
  g.addColorStop(0.4, rgba(col, alpha * 0.35));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  x.restore();
}

/* Capped glyph-DUST: fine fillText texture on top, hard-capped count. */
function glyphDust(x, W, H, P, p, r, focusPts) {
  const S = Math.min(W, H);
  const n = Math.min(2600, Math.floor(W * H / 2600 * p.stormMul));
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = r() * W, py = r() * H;
    // dust biased to brighten near a focus point
    let near = 0;
    for (const f of focusPts) {
      const d = Math.hypot(px - f.x, py - f.y) / (S * 0.5);
      near = Math.max(near, clamp(1 - d, 0, 1));
    }
    const sz = S * (0.008 + r() * 0.012) * (0.8 + near * 0.8);
    const col = near > 0.6 ? P.hot : near > 0.3 ? P.phos : mix(P.deep, P.phos, 0.3);
    x.fillStyle = rgba(col, (0.05 + near * 0.4) * (0.5 + r() * 0.5));
    x.font = `${Math.max(6, Math.round(sz))}px monospace`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const ch = DUST_CHARS[Math.floor(r() * DUST_CHARS.length)];
    x.fillText(ch, px, py);
  }
  x.restore();
}

/* Glitch tears: horizontal displaced bright bars + chromatic offset slivers. */
function glitchTears(x, W, H, P, p, r) {
  if (p.glitchI === 0 && p.glitchN <= 1 && r() < 0.5) { /* still allow a faint one */ }
  x.save();
  for (let i = 0; i < p.glitchN; i++) {
    const ty = r() * H;
    const th = H * (0.004 + r() * (p.glitchI === 2 ? 0.05 : 0.02));
    // dark cut
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = rgba(P.ground, 0.55);
    x.fillRect(0, ty, W, th);
    // bright phosphor sliver offset sideways (datastream rip)
    x.globalCompositeOperation = 'lighter';
    const off = (r() - 0.5) * W * 0.12;
    const col = r() < 0.5 ? P.phos : P.accent;
    x.fillStyle = rgba(col, 0.18 + r() * 0.25);
    x.fillRect(off, ty + th * 0.2, W, th * 0.5);
    // chromatic edge
    x.fillStyle = rgba(P.accent, 0.12);
    x.fillRect(off * 0.6, ty, W, 1.5);
  }
  x.restore();
}

/* Scanlines + CRT curvature vignette wash, palette-tinted. */
function crtFinish(x, W, H, P, p, r) {
  // scanlines
  x.save();
  x.globalCompositeOperation = 'multiply';
  for (let yy = 0; yy < H; yy += 3) { x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, yy, W, 1.4); }
  x.restore();
  // faint phosphor scan-glow horizontals
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let yy = (r() * 6) | 0; yy < H; yy += 3) { x.fillStyle = rgba(P.phos, 0.012); x.fillRect(0, yy, W, 1); }
  x.restore();
  // a slow bright "refresh" bar
  x.save();
  x.globalCompositeOperation = 'lighter';
  const by = H * (0.1 + vnoise(1, p.seedNoise) * 0.8);
  const g = x.createLinearGradient(0, by - H * 0.05, 0, by + H * 0.05);
  g.addColorStop(0, rgba(P.phos, 0)); g.addColorStop(0.5, rgba(P.hot, 0.07)); g.addColorStop(1, rgba(P.phos, 0));
  x.fillStyle = g; x.fillRect(0, by - H * 0.05, W, H * 0.1);
  x.restore();
  grain(x, W, H, 900, r);
  vignette(x, W, H, 0.5);
}

/* Deep void ground with a phosphor haze pooled at the focus. */
function paintGround(x, W, H, P, p, r) {
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(P.ground, '#000', 0.35));
  bg.addColorStop(0.5, P.ground);
  bg.addColorStop(1, mix(P.ground, P.deep, 0.45));
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // pooled haze — a near plane at the DOMINANT focus + a dimmer, hazier far
  // plane at the secondary, so the ground reads DEEP (two depth planes) and the
  // glow follows the off-centre composition instead of the dead centre.
  const dom = p.foci ? p.foci.dom : { x: p.focusX, y: p.focusY };
  const sec = p.foci ? p.foci.sec : { x: 1 - p.focusX, y: 1 - p.focusY };
  x.save();
  x.globalCompositeOperation = 'screen';
  const fx = W * dom.x, fy = H * dom.y, fr = Math.min(W, H) * 0.66;
  const g = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
  g.addColorStop(0, rgba(P.deep, 0.52));
  g.addColorStop(0.5, rgba(P.deep, 0.2));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // far/hazed plane at the secondary mass — dimmer, desaturated toward the cold
  // hue so it recedes (depth), filling the frame opposite the dominant.
  const sxp = W * sec.x, syp = H * sec.y, sr = Math.min(W, H) * 0.5;
  const g2 = x.createRadialGradient(sxp, syp, 0, sxp, syp, sr);
  g2.addColorStop(0, rgba(coldHue(P), 0.3));
  g2.addColorStop(0.6, rgba(coldHue(P), 0.1));
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g2; x.fillRect(0, 0, W, H);
  x.restore();
  mottle(x, 0, 0, W, H, P.deep, 1100, r, 'overlay');
  mottle(x, 0, 0, W, H, mix(P.deep, P.phos, 0.25), 2800, r, 'screen');
}

/* A drawn wireframe slab/box in perspective (used by Monolith tiers). */
function wireBox(x, P, x0, y0, w, h, skew, col, alpha) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(col, alpha);
  x.lineWidth = Math.max(0.8, w * 0.012);
  // front face
  x.strokeRect(x0, y0, w, h);
  // depth edges
  const dx = w * skew, dy = -h * skew * 0.5;
  x.beginPath();
  x.moveTo(x0, y0); x.lineTo(x0 + dx, y0 + dy);
  x.moveTo(x0 + w, y0); x.lineTo(x0 + w + dx, y0 + dy);
  x.moveTo(x0 + w, y0 + h); x.lineTo(x0 + w + dx, y0 + h + dy);
  x.moveTo(x0, y0 + h); x.lineTo(x0 + dx, y0 + h + dy);
  x.stroke();
  // back top edge
  x.beginPath(); x.moveTo(x0 + dx, y0 + dy); x.lineTo(x0 + w + dx, y0 + dy); x.stroke();
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════
 * THE FIVE LAYOUTS — each defines a resolve MASK + bespoke structure.
 * ════════════════════════════════════════════════════════════════════════ */

/* 1 — MONOLITH: a tall off-centre data-tower on a phi line, answered by smaller
 * masses on the opposite side (asymmetric balance) with a quiet quadrant. */
function layoutMonolith(x, W, H, P, p, r) {
  const cxF = p.foci.dom.x, halfW = p.monoW;     // tower on the dominant phi line
  const lean = p.monoLean;
  // resolve mask: a vertical slab around cxF, brightest mid-height, with the
  // storm condensing INTO the tower column; noise outside falls away.
  const mask = (u, v) => {
    const cx = cxF + (v - 0.5) * lean;            // slight lean
    const dx = Math.abs(u - cx) / halfW;
    const col = clamp(1 - dx * dx, 0, 1);         // inside the slab
    const vert = clamp(1 - Math.abs(v - 0.5) * 1.4, 0, 1); // brightest mid
    // a resolved bright spine
    const spine = clamp(1 - Math.abs(u - cx) / (halfW * 0.18), 0, 1);
    return clamp(col * (0.45 + vert * 0.7) + spine * 0.5, 0, 1) * p.resolveR * 2.2;
  };
  // wireframe tower tiers behind the glyphs
  const tx = W * (cxF - halfW), tw = W * halfW * 2;
  const tierH = H * 0.92 / p.monoTiers;
  for (let i = 0; i < p.monoTiers; i++) {
    const y0 = H * 0.04 + i * tierH;
    const t = i / (p.monoTiers - 1);
    const inset = tw * 0.04 * Math.abs(0.5 - t);
    wireBox(x, P, tx + inset + W * lean * (0.5 - t), y0, tw - inset * 2, tierH * 0.92,
            0.10, mix(P.wire, P.phos, t * 0.5), 0.18 + 0.22 * (1 - Math.abs(0.5 - t) * 1.4));
  }
  // the glyph storm (under the masses)
  glyphStorm(x, W, H, P, p, r, mask, { cell: 0.024, gain: 1.0 });
  // bright resolved spine bloom up the tower
  const spineX = W * cxF;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    bloom(x, spineX + W * lean * (0.5 - t), H * (0.08 + t * 0.84), Math.min(W, H) * 0.055,
          mix(P.phos, P.hot, 0.5), 0.05 + 0.06 * (1 - Math.abs(0.5 - t)));
  }
  // crown beacon
  bloom(x, spineX + W * lean * 0.5, H * 0.1, Math.min(W, H) * 0.11, P.hot, 0.2);
  // FOCAL HIERARCHY: dominant spine mass on the off-centre tower + answering
  // secondary/tertiary masses across the other thirds (asymmetric balance).
  drawFoci(x, W, H, P, p, r, mask, Math.min(W, H) * 0.30);
  glyphDust(x, W, H, P, p, r, p.foci.list.map((f) => ({ x: f.x * W, y: f.y * H })));
}

/* 2 — APPARITION: a colossal face decodes from the storm. */
function layoutApparition(x, W, H, P, p, r) {
  // PORTRAIT, not medallion: the face sits ON the dominant phi point (off-centre),
  // smaller than before so a supporting glyph-mass constellation fills the rest of
  // the frame. The dominant focus IS the face centre.
  const fcx = p.foci.dom.x, fcy = p.foci.dom.y - 0.01;
  const fw = (0.34 + p.faceW * 0.18), fh = fw * 1.28;     // narrower head → room for scene
  const tilt = p.faceTilt * p.flip;
  // face mask: an oval head, with brow ridge, eye sockets (bright cores),
  // nose ridge and cheekbones sculpting glyph density.
  const eyeY = fcy - fh * 0.12, eyeDx = p.eyeGap;
  const mask = (u, v) => {
    // rotate into face space
    let du = (u - fcx), dv = (v - fcy);
    const ru = du * Math.cos(-tilt) - dv * Math.sin(-tilt);
    const rv = du * Math.sin(-tilt) + dv * Math.cos(-tilt);
    const oval = clamp(1 - ((ru / (fw * 0.5)) ** 2 + (rv / (fh * 0.5)) ** 2), 0, 1);
    if (oval <= 0) return 0;
    let m = 0.35 + oval * 0.5;
    // brow ridge
    m += clamp(1 - Math.abs(rv - (eyeY - fcy) - fh * 0.04) / (fh * 0.05), 0, 1) * 0.4;
    // cheek planes
    m += clamp(1 - Math.abs(Math.abs(ru) - fw * 0.3) / (fw * 0.12), 0, 1) * oval * 0.3;
    // nose ridge
    m += clamp(1 - Math.abs(ru) / (fw * 0.05), 0, 1) * clamp(1 - Math.abs(rv) / (fh * 0.22), 0, 1) * 0.4;
    // eye sockets: darken the socket, but eyes themselves blaze (added below as cores)
    for (const s of [-1, 1]) {
      const ex = s * eyeDx, ey = eyeY - fcy;
      const ed = Math.hypot(ru - ex, rv - ey);
      m -= clamp(1 - ed / (fw * 0.10), 0, 1) * 0.5;     // socket shadow
    }
    return clamp(m, 0, 1) * (0.7 + p.resolveR);
  };
  glyphStorm(x, W, H, P, p, r, mask, { cell: 0.024, gain: 1.05 });
  // Multi-focal hierarchy: the face anchors the dominant; secondary/tertiary
  // glyph-masses spread to the answering thirds so it reads as a composed scene
  // around an off-centre portrait, never a lone centred medallion.
  drawFoci(x, W, H, P, p, r, mask, Math.min(W, H) * fw * 0.5);
  // blazing eyes
  for (const s of [-1, 1]) {
    const ru = s * eyeDx, rv = (eyeY - fcy);
    const ex = fcx + (ru * Math.cos(tilt) - rv * Math.sin(tilt));
    const ey = fcy + (ru * Math.sin(tilt) + rv * Math.cos(tilt));
    bloom(x, ex * W, ey * H, Math.min(W, H) * 0.085, P.hot, 0.46);
    bloom(x, ex * W, ey * H, Math.min(W, H) * 0.03, coolHot(P), 0.5);
    // iris ring
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.accent, 0.5); x.lineWidth = Math.max(1.2, W * 0.003);
    x.beginPath(); x.arc(ex * W, ey * H, Math.min(W, H) * 0.045, 0, Math.PI * 2); x.stroke();
    x.restore();
  }
  // face contour wire halo
  bloom(x, fcx * W, fcy * H, Math.min(W, H) * fw * 0.6, P.phos, 0.06);
  glyphDust(x, W, H, P, p, r, [{ x: fcx * W, y: fcy * H }]);
}

/* 3 — CASCADE: vertical glyph rain condensing into a diagonal wave crest. */
function layoutCascade(x, W, H, P, p, r) {
  const dir = p.waveDir;
  const crest = p.waveCrest;
  // wave crest line: a diagonal sweep; resolve peaks ALONG the breaking edge.
  const crestAt = (u) => crest + Math.sin(u * Math.PI * 1.5 + p.seedNoise) * 0.10 * dir + u * 0.18 * dir;
  const mask = (u, v) => {
    const cv = crestAt(u);
    const d = (v - cv);
    // bright foam in a band just under the crest; falls to noise above & far below
    const band = clamp(1 - Math.abs(d) / 0.12, 0, 1);
    const body = clamp(1 - Math.abs(d - 0.18) / 0.4, 0, 1) * 0.5;
    return clamp(band * 1.1 + body, 0, 1) * (0.6 + p.resolveR);
  };
  // draw streaking rain columns first (decay trails) — drawn primitives
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < p.colN; i++) {
    const u = (i + 0.5) / p.colN;
    const cx = u * W;
    const cv = crestAt(u);
    const len = H * (0.18 + vnoise(i * 1.3, p.seedNoise) * 0.4);
    const top = clamp(cv * H - len, 0, H);
    const g = x.createLinearGradient(cx, top, cx, cv * H);
    g.addColorStop(0, rgba(P.phos, 0));
    g.addColorStop(0.7, rgba(P.phos, 0.12));
    g.addColorStop(1, rgba(P.hot, 0.4));
    x.strokeStyle = g; x.lineWidth = Math.max(1, W / p.colN * 0.4);
    x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, cv * H); x.stroke();
    // head bead riding the crest
    bloom(x, cx, cv * H, W / p.colN * 1.6, P.hot, 0.3);
  }
  x.restore();
  // the glyph storm sculpted to the wave
  glyphStorm(x, W, H, P, p, r, mask, { cell: 0.024, gain: 1.0 });
  // HARD-asymmetric foci: the dominant rides the breaking crest at its off-centre
  // phi-x, the answering masses scatter to the other thirds (foam beads + decode
  // clusters) so the diagonal wave reads as a full scene, not a centred glyph.
  drawFoci(x, W, H, P, p, r, mask, Math.min(W, H) * 0.30);
  // breaking foam: a bright drawn ribbon along the crest
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(P.hot, 0.5); x.lineWidth = Math.max(2, H * 0.006);
  x.beginPath();
  for (let i = 0; i <= 60; i++) { const u = i / 60; const px = u * W, py = crestAt(u) * H; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); }
  x.stroke();
  x.strokeStyle = rgba(P.phos, 0.18); x.lineWidth = Math.max(6, H * 0.02);
  x.stroke();
  x.restore();
  glyphDust(x, W, H, P, p, r, [{ x: W * 0.5, y: crestAt(0.5) * H }]);
}

/* 4 — WELLSPRING: a non-perspective UPWELLING. Glyph density fountains up from a
 * source low in the frame, spreading outward, ringed by concentric radial decode
 * rings condensing out of the noise. NO vanishing point, NO horizon cue. */
function layoutWellspring(x, W, H, P, p, r) {
  // SOURCE off-centre: bias the upwelling origin firmly to one side so the
  // fountain rises off-axis (asymmetric), never straight up the middle.
  const wellXoff = p.wellX < 0.5 ? clamp(p.wellX, 0.18, 0.34) : clamp(p.wellX, 0.66, 0.82);
  const sx = W * wellXoff, sy = H * p.wellY;     // source point (low, off-centre)
  const S = Math.min(W, H);
  const reach = S * 0.92;                        // how far the plume rises/spreads
  // resolve mask: bright dense at the source, fanning UPWARD in a plume that
  // widens with height, plus concentric rings of resolve rippling out.
  const mask = (u, v) => {
    const px = u * W, py = v * H;
    const dx = px - sx, dy = py - sy;
    const dist = Math.hypot(dx, dy) / reach;     // 0 at source → 1 at reach
    // core upwelling: brightest at source, fading with distance
    const core = clamp(1 - dist, 0, 1);
    // plume: bias resolve UPWARD (dy<0) and let it spread laterally with height.
    const up = clamp(-dy / reach, 0, 1);                       // 0 below → 1 high above
    const spread = 0.10 + up * 0.34;                           // plume widens upward
    const lateral = clamp(1 - Math.abs(dx) / (W * spread), 0, 1);
    const plume = lateral * clamp(up * 1.3, 0, 1);
    // concentric radial decode rings rippling out from the source
    const ring = 0.5 + 0.5 * Math.sin(dist * Math.PI * p.wellRings - p.seedNoise);
    const rings = ring * clamp(1 - dist * 0.7, 0, 1) * 0.45;
    return clamp(core * 0.7 + plume * 0.9 + rings, 0, 1) * (0.6 + p.resolveR);
  };
  // drawn structure: concentric decode rings expanding from the source (radial,
  // never receding — no horizon), each ring brighter as it resolves inward.
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= p.wellRings; i++) {
    const t = i / p.wellRings;
    const rad = reach * t;
    x.strokeStyle = rgba(mix(P.wire, P.phos, 1 - t), 0.06 + 0.18 * (1 - t));
    x.lineWidth = Math.max(0.8, S * 0.003 * (1.2 - t));
    x.beginPath(); x.arc(sx, sy, rad, 0, Math.PI * 2); x.stroke();
  }
  // upwelling plume arms: drawn glyph-density streams fanning up and out.
  for (let i = 0; i < p.wellArms; i++) {
    const t = i / (p.wellArms - 1);
    const ang = -Math.PI / 2 + (t - 0.5) * Math.PI * 0.9;     // spray upward fan
    const len = reach * (0.6 + vnoise(i * 2.3, p.seedNoise) * 0.4);
    const ex = sx + Math.cos(ang) * len;
    const ey = sy + Math.sin(ang) * len;
    const g = x.createLinearGradient(sx, sy, ex, ey);
    g.addColorStop(0, rgba(coolHot(P), 0.42));
    g.addColorStop(0.4, rgba(P.phos, 0.16));
    g.addColorStop(1, rgba(coldHue(P), 0));
    x.strokeStyle = g; x.lineWidth = Math.max(1.4, S * 0.006);
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
  glyphStorm(x, W, H, P, p, r, mask, { cell: 0.025, gain: 1.0 });
  // Multi-focal hierarchy: dominant in the rising plume (off-centre, above the
  // off-centre source), answered by masses fanning across the upper thirds so the
  // upwelling reads as a spreading scene, not one column up the middle.
  drawFoci(x, W, H, P, p, r, mask, S * 0.34);
  // blazing source core
  bloom(x, sx, sy, S * 0.22, P.phos, 0.18);
  bloom(x, sx, sy, S * 0.08, P.hot, 0.36);
  bloom(x, sx, sy, S * 0.025, coolHot(P), 0.42);
  glyphDust(x, W, H, P, p, r, [{ x: sx, y: sy - reach * 0.2 }]);
}

/* 5 — EYE: a vast iris/aperture of glyph rings spiralling into a pupil. */
function layoutEye(x, W, H, P, p, r) {
  // The iris sits ON the off-centre dominant phi point — an asymmetric portrait of
  // a watching eye, not a centred target. Pulled in a touch so a supporting
  // glyph-mass constellation fills the rest of the frame.
  const cx = p.foci.dom.x, cy = p.foci.dom.y;
  const cxp = cx * W, cyp = cy * H;
  const R = Math.min(W, H) * 0.28;   // portrait-scale iris, not a frame-filling target
  const mask = (u, v) => {
    const d = Math.hypot((u - cx) * W, (v - cy) * H) / R;
    if (d > 1.05) return clamp(0.3 - (d - 1.05), 0, 0.3);    // faint outer noise
    // bright iris band, dark-ish mid, blazing pupil
    const iris = clamp(1 - Math.abs(d - 0.6) / 0.4, 0, 1);
    const pupil = clamp(1 - d / 0.16, 0, 1);
    return clamp(iris * 0.9 + pupil * 1.2, 0, 1) * (0.6 + p.resolveR);
  };
  // concentric glyph rings drawn as structure (rings + radial spokes)
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= p.eyeRings; i++) {
    const t = i / p.eyeRings;
    const rad = R * t;
    x.strokeStyle = rgba(mix(P.wire, P.phos, t), 0.08 + 0.16 * (1 - Math.abs(t - 0.6) * 1.5));
    x.lineWidth = Math.max(0.8, R * 0.004);
    x.beginPath(); x.arc(cxp, cyp, rad, 0, Math.PI * 2); x.stroke();
  }
  for (let i = 0; i < p.eyeSpokes; i++) {
    const a = (i / p.eyeSpokes) * Math.PI * 2 + p.eyeSpin;
    x.strokeStyle = rgba(P.wire, 0.06); x.lineWidth = 0.7;
    x.beginPath(); x.moveTo(cxp + Math.cos(a) * R * 0.16, cyp + Math.sin(a) * R * 0.16);
    x.lineTo(cxp + Math.cos(a) * R, cyp + Math.sin(a) * R); x.stroke();
  }
  x.restore();
  glyphStorm(x, W, H, P, p, r, mask, { cell: 0.024, gain: 1.0 });
  // Supporting constellation around the off-centre eye — the dominant is the iris
  // itself; secondary/tertiary glyph-masses answer on the far thirds so the eye
  // sits as an asymmetric portrait with scene mass, not a lone centred aperture.
  drawFoci(x, W, H, P, p, r, mask, R * 0.66);
  // a scanning decode-bar crossing the eye
  x.save();
  x.globalCompositeOperation = 'lighter';
  const sby = cyp + (vnoise(2, p.seedNoise) - 0.5) * R * 0.9;
  const g = x.createLinearGradient(0, sby - R * 0.04, 0, sby + R * 0.04);
  g.addColorStop(0, rgba(P.phos, 0)); g.addColorStop(0.5, rgba(P.hot, 0.4)); g.addColorStop(1, rgba(P.phos, 0));
  x.fillStyle = g; x.fillRect(cxp - R, sby - R * 0.04, R * 2, R * 0.08);
  x.restore();
  // iris ring accents + blazing pupil
  x.save(); x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(P.accent, 0.4); x.lineWidth = Math.max(1.4, R * 0.01);
  x.beginPath(); x.arc(cxp, cyp, R * 0.18, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cxp, cyp, R, 0, Math.PI * 2); x.stroke();
  x.restore();
  bloom(x, cxp, cyp, R * 0.4, P.phos, 0.14);
  bloom(x, cxp, cyp, R * 0.14, P.hot, 0.4);
  bloom(x, cxp, cyp, R * 0.05, coolHot(P), 0.58);
  glyphDust(x, W, H, P, p, r, [{ x: cxp, y: cyp }]);
}

/* ── Master draw ─────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // FREE composition RNG — drawn AFTER paramsOf so traits() is untouched. All
  // phi-point focal placement uses this stream; pure function of tokenId.
  const cr = rng(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  // per-layout dominant anchor — every layout's primary focal element lands on a
  // golden/thirds intersection OFF the dead centre. composeFoci then builds the
  // answering constellation. No anchor => a freely-chosen phi corner.
  let anchor = null;
  if (p.layoutI === 1) {                         // Apparition — face on a phi corner
    anchor = { x: PHI_X[Math.floor(cr() * 2)], y: 1 - INVPHI + (cr() - 0.5) * 0.06 };
  } else if (p.layoutI === 4) {                  // Eye — iris on a phi corner
    anchor = { x: PHI_X[Math.floor(cr() * 2)], y: PHI_Y[Math.floor(cr() * 2)] };
  } else if (p.layoutI === 3) {                  // Wellspring — plume above off-x source
    const wxo = p.wellX < 0.5 ? clamp(p.wellX, 0.18, 0.34) : clamp(p.wellX, 0.66, 0.82);
    anchor = { x: clamp(wxo + (cr() - 0.5) * 0.08, 0.16, 0.84), y: 0.40 + (cr() - 0.5) * 0.1, yLock: 1 };
  } else if (p.layoutI === 2) {                  // Cascade — dominant rides the crest at a phi-x
    const ux = PHI_X[Math.floor(cr() * 2)];
    const cv = p.waveCrest + Math.sin(ux * Math.PI * 1.5 + p.seedNoise) * 0.10 * p.waveDir + ux * 0.18 * p.waveDir;
    anchor = { x: ux, y: clamp(cv, 0.22, 0.78), yLock: 1 };
  } else if (p.layoutI === 0) {                  // Monolith — tower on a phi-x
    anchor = { x: PHI_X[Math.floor(cr() * 2)], y: 1 - INVPHI + (cr() - 0.5) * 0.08, yLock: 1 };
  }
  p.foci = composeFoci(W, H, cr, anchor);

  paintGround(x, W, H, P, p, r);

  // a faint slight scene tilt for non-mechanical feel (visual only)
  x.save();
  if (p.tilt) {
    x.translate(W / 2, H / 2); x.rotate(p.tilt * 0.06); x.translate(-W / 2, -H / 2);
  }
  switch (p.layoutI) {
    case 0: layoutMonolith(x, W, H, P, p, r); break;
    case 1: layoutApparition(x, W, H, P, p, r); break;
    case 2: layoutCascade(x, W, H, P, p, r); break;
    case 3: layoutWellspring(x, W, H, P, p, r); break;
    default: layoutEye(x, W, H, P, p, r); break;
  }
  x.restore();

  glitchTears(x, W, H, P, p, r);
  crtFinish(x, W, H, P, p, r);
}

export const haloBTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const haloBSchema: TraitSchema = {
  traits: [
    { name: 'Layout',  values: LAYOUTS },
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format',  values: ['Square', 'Tall', 'Wide'] },
    { name: 'Density', values: DENSITY },
    { name: 'Decode',  values: DECODE },
    { name: 'Glitch',  values: GLITCH },
  ],
};

export const renderHaloB: EngineFn = blit(draw, haloBTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
export const HALOB_ASPECTS = [1, 0.758, 1.32] as const;
