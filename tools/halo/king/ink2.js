/* INK2 — marbled poured pigment (suminagashi / alcohol-ink), rebuilt as a SYSTEM.
 *
 * The matte FLUID project. NO chrome, NO specular, NO crinkle. Pigment poured on
 * wet coloured paper, dragged by a current into the classic marbled feather.
 *
 * THE REBUILD (2026-06-21). The prior engine (p_ink) had ONE composition — an
 * off-centre confluence combed into a single feather — so every seed read as the
 * same stamp recoloured. INK2 makes **LAYOUT the primary trait**: a `Layout` axis
 * (drawn FIRST, in fixed RNG order so traits() and draw() never disagree) selects
 * one of SEVEN structurally distinct marbling arrangements. Each is a different
 * way pigment meets water — not the same blob relocated:
 *
 *   1. Suminagashi — one off-centre stack of concentric ink rings combed into a
 *                    long feather; vast active negative space opposite.
 *   2. Scatter     — many small ink drops / rings strewn across the frame on a
 *                    thirds/phi constellation; no hero.
 *   3. Stone       — dense full-field combed stone-marble: rings everywhere,
 *                    raked hard, minimal negative space (the busy one).
 *   4. Confluence  — a few currents (2–4 ring stacks) meeting off-centre, their
 *                    feathers colliding; counterweight pool opposite.
 *   5. River       — a torn current sweeping edge-to-edge full-bleed; a band of
 *                    marbled filaments crossing the whole canvas on a diagonal.
 *   6. Sparse      — 1–2 large blooms with vast shaped negative space; the calm,
 *                    breathing composition.
 *   7. Nonpareil   — the raked grid/comb pattern: parallel ink lines pulled into
 *                    the classic zig-zag nonpareil chevrons, full-field texture.
 *
 * The number of ink SOURCES, the comb/rake direction + frequency, density, and
 * placement all vary by layout so no two pieces read alike. Composition stays
 * strong: asymmetry, off-centre focal, active negative space (except the
 * deliberately-dense Stone/Nonpareil/Field layouts).
 *
 * BESPOKE PALETTE — named ink-combination identities designed FOR marbled ink.
 * Roles: paper (wet ground / pool, a COLOUR never near-black), inkA (dominant
 * pour), inkB (second pigment that combs against A), inkC (sparing accent),
 * vein (fine floating leaf/ink line), bleed (clean transition hue, anti-mud).
 * `richness` (0..1) leans the whole world more saturated/deeper so the set isn't
 * all pale rice-paper grounds.
 *
 * Deterministic per seed. Varied aspect. Rare chase events. Canvas ≤1280px.
 * Flow traces step-capped; no full-res per-pixel loops. FORCE_PAL honoured.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    // Indigo sumi ink + vermilion bloom, threaded with gold leaf on warm rice paper. (pale)
    { name: 'Indigo & Vermilion', paper: '#f3d9a4', inkA: '#1f2f7a', inkB: '#ef3b2c', inkC: '#7a2bd6', vein: '#ffd86b', bleed: '#ff9d5c', richness: 0.25 },
    // Jade green ink poured against coral, cool celadon water, pale-jade veining. (pale)
    { name: 'Jade & Coral',       paper: '#bfeede', inkA: '#0f8a6a', inkB: '#ff6f6b', inkC: '#1d9bd1', vein: '#eafff4', bleed: '#ffd06b', richness: 0.30 },
    // Ultramarine pour + saffron bloom on a warm cream pool, copper veins. (mid)
    { name: 'Ultramarine & Saffron', paper: '#ffe7b0', inkA: '#244bd6', inkB: '#ffae12', inkC: '#ff4f8b', vein: '#ff9a3d', bleed: '#5cd6ff', richness: 0.40 },
    // Magenta and teal alcohol inks fighting over a mint pool, silver veining. (mid)
    { name: 'Magenta & Teal',     paper: '#c8f3ef', inkA: '#e21b8d', inkB: '#0fb6c4', inkC: '#7c4dff', vein: '#f4ffff', bleed: '#ffe14d', richness: 0.45 },
    // Violet sumi + chartreuse bloom on a lilac water, white-gold thread. (mid)
    { name: 'Violet & Chartreuse', paper: '#e3d4ff', inkA: '#6a2bd6', inkB: '#aef03d', inkC: '#ff5ec7', vein: '#fff3c0', bleed: '#5ce6ff', richness: 0.42 },
    // Crimson lake and cobalt marble on warm bone paper, brass veining. (pale)
    { name: 'Crimson & Cobalt',   paper: '#f6e3c8', inkA: '#d11e3c', inkB: '#1f54c4', inkC: '#16b59b', vein: '#ffcf6b', bleed: '#ff8fb0', richness: 0.32 },
    // Tangerine ink + plum bloom over peach water, rose-gold veins (warm world). (mid)
    { name: 'Tangerine & Plum',   paper: '#fbe9d0', inkA: '#e8470a', inkB: '#7a1ea8', inkC: '#ff2e88', vein: '#fff0d0', bleed: '#ffc21f', richness: 0.40 },
    // Emerald and ink-black-teal sumi on jade water, gold leaf (deep-jewel world). (rich)
    { name: 'Emerald & Gold',     paper: '#3aa676', inkA: '#063d2a', inkB: '#0a4a6e', inkC: '#ff9d2e', vein: '#ffe06b', bleed: '#7df0c0', richness: 0.62 },
    // RICH: hot fuchsia + cobalt on a saturated grape water, electric cyan bleed.
    { name: 'Grape & Fuchsia',    paper: '#7b3fb0', inkA: '#16124a', inkB: '#ff2bb0', inkC: '#ffd23f', vein: '#ffe6ff', bleed: '#39e6ff', richness: 0.72 },
    // RICH: deep teal pool, scarlet + gold pours, warm ember bleed (jewel world).
    { name: 'Teal & Ember',       paper: '#1f7d7a', inkA: '#08313a', inkB: '#ff5a1e', inkC: '#ffd23f', vein: '#bdfff6', bleed: '#ff9d3d', richness: 0.70 },
    // RICH: saturated cobalt water, hot coral + chartreuse, peach bleed.
    { name: 'Cobalt & Coral',     paper: '#2f5fd0', inkA: '#0b1f6e', inkB: '#ff5a6e', inkC: '#caff39', vein: '#dfe9ff', bleed: '#ffd06b', richness: 0.68 },
    // RICH: oxblood-rose pool, deep plum + tangerine, gold leaf (warm jewel).
    { name: 'Wine & Tangerine',   paper: '#a83a5a', inkA: '#3a0b2a', inkB: '#ff7a1e', inkC: '#ffd23f', vein: '#ffd9e6', bleed: '#ffb45c', richness: 0.66 },
  ];

  // varied aspect — portrait / landscape / square (square the minority)
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1000, H: 1500, t: 'Scroll' },     // 2:3 (suminagashi handscroll feel)
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.50 ? FMTS[1] : x < 0.72 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  // THE PRIMARY composition trait — each value is a different draw routine.
  const LAYOUTS = ['Suminagashi', 'Scatter', 'Stone', 'Confluence', 'River', 'Sparse', 'Nonpareil'];
  const COMB    = ['Calm', 'Combed', 'Torn'];   // how hard the current pulls
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','None','Gilded Veil','Eclipse Pool'];

  // ── Param draw (FIXED ORDER — Layout FIRST so traits() ↔ draw() agree) ──────
  function params(r) {
    const layout = K.pick(LAYOUTS, r);
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const comb = K.pick(COMB, r);
    const event = K.pick(EVENTS, r);
    // current strength — how far the curl-flow combs the rings
    const flow = comb === 'Calm' ? 0.5 + r() * 0.35 : comb === 'Combed' ? 0.95 + r() * 0.5 : 1.5 + r() * 0.7;
    const flowScale = 110 + r() * 100;     // curl noise spatial scale
    const drift = r() * Math.PI * 2;       // overall current / rake bias direction
    // rake frequency: how many comb tines across the field (varies the feather)
    const rakeFreq = 1.2 + r() * 2.6;
    return { layout, pal, fmt, comb, event, flow, flowScale, drift, rakeFreq };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Current: p.comb, Event: p.event };
  }

  // Apply richness: deepen pigments + saturate the pool for the rich palettes.
  function richen(P) {
    const k = P.richness;
    return {
      paper: P.paper,
      inkA: K.mix(P.inkA, '#0a0820', 0.10 * k),
      inkB: P.inkB,
      inkC: P.inkC,
      vein: P.vein,
      bleed: P.bleed,
      // a deepened pool edge used for vignettes / shadow settle
      deep: K.mix(P.paper, P.inkA, 0.22 + 0.18 * k),
      k,
    };
  }

  // ── MARBLING DISPLACEMENT — the heart of suminagashi. Returns displaced
  // position of (px,py) after the current drags the ink: a coherent curl eddy +
  // a strong directional COMB rake along the drift axis. Magnitude is large so
  // rings shear into long filaments. `gain` scales the whole displacement (lets
  // layouts dial the feather up/down). ──────────────────────────────────────
  function marble(noise, px, py, p, W, H, gain) {
    gain = gain == null ? 1 : gain;
    const minWH = Math.min(W, H);
    const sc = p.flowScale;
    const v = K.curl(noise, px / sc * 100, py / sc * 100, 1);
    const eddy = p.flow * minWH * 0.30 * gain;
    let dx = v[0] * eddy, dy = v[1] * eddy;
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift);
    const perp = (-px * sd + py * cd) / minWH;
    const rake = Math.sin(perp * Math.PI * p.rakeFreq) * p.flow * minWH * 0.16 * gain;
    dx += cd * rake; dy += sd * rake;
    return [px + dx, py + dy];
  }

  // One combed suminagashi ring (stroked contour, marbled).
  function combRing(x, noise, ox, oy, rad, p, col, alpha, lw, W, H, gain) {
    const segs = 150;
    x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const m = marble(noise, ox + Math.cos(a) * rad, oy + Math.sin(a) * rad, p, W, H, gain);
      i === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.lineWidth = lw;
    x.strokeStyle = K.rgba(col, alpha);
    x.lineJoin = 'round';
    x.stroke();
  }

  // Filled combed blob (solid pigment body), marbled.
  function combBlob(x, noise, ox, oy, rad, p, col, alpha, W, H, gain) {
    const segs = 110;
    x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const m = marble(noise, ox + Math.cos(a) * rad, oy + Math.sin(a) * rad, p, W, H, gain);
      i === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.fillStyle = K.rgba(col, alpha);
    x.fill();
  }

  // A whole combed concentric ring STACK at a source (the suminagashi drop).
  function ringStack(x, noise, ox, oy, baseR, gap, n, p, P, ringPair, alphaMul, lwMul, W, H, gain) {
    for (let i = 0; i < n; i++) {
      const rad = baseR + i * gap;
      const col = i % 2 === 0 ? ringPair[0] : ringPair[1];
      const alpha = (i % 2 === 0 ? 0.82 : 0.6) * (1 - 0.42 * i / n) * (alphaMul == null ? 1 : alphaMul);
      const lw = (1.3 + (1 - i / n) * 2.4) * (lwMul == null ? 1 : lwMul);
      combRing(x, noise, ox, oy, rad, p, col, alpha, lw, W, H, gain);
    }
  }

  // Alcohol-ink BLOOM: a marbled cellular pour (filled body + cell contours).
  function bloom(x, noise, bx, by, rad, p, core, edge, alpha, W, H, gain) {
    x.save();
    x.beginPath();
    const segs = 84;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const wob = 1 + 0.14 * noise.fbm(Math.cos(a) * 2.2 + bx * 0.004, Math.sin(a) * 2.2 + by * 0.004, 3);
      const m = marble(noise, bx + Math.cos(a) * rad * wob, by + Math.sin(a) * rad * wob, p, W, H, gain);
      j === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.clip();
    const g = x.createRadialGradient(bx, by, rad * 0.05, bx, by, rad * 1.25);
    g.addColorStop(0, K.rgba(core, alpha));
    g.addColorStop(0.55, K.rgba(core, alpha * 0.72));
    g.addColorStop(0.85, K.rgba(edge, alpha * 0.5));
    g.addColorStop(1, K.rgba(edge, 0));
    x.fillStyle = g;
    x.fillRect(bx - rad * 1.4, by - rad * 1.4, rad * 2.8, rad * 2.8);
    x.restore();
    const cells = 3 + Math.floor(rad / 55);
    for (let i = 1; i <= cells; i++) {
      const rr = rad * (0.5 + 0.55 * (i / cells));
      x.beginPath();
      const cs = 72;
      for (let j = 0; j <= cs; j++) {
        const a = (j / cs) * Math.PI * 2;
        const wob = 1 + 0.10 * noise.fbm(Math.cos(a) * 2 + i * 3.1, Math.sin(a) * 2 + by * 0.003, 3);
        const m = marble(noise, bx + Math.cos(a) * rr * wob, by + Math.sin(a) * rr * wob, p, W, H, gain);
        j === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
      }
      x.closePath();
      x.lineWidth = 1.1;
      x.strokeStyle = K.rgba(edge, alpha * (0.28 + 0.14 * (1 - i / cells)));
      x.lineJoin = 'round';
      x.stroke();
    }
  }

  // Fine floating vein streaming along the current.
  function vein(x, noise, sx, sy, p, col, alpha, len, lw, W, H) {
    const sc = p.flowScale;
    let px = sx, py = sy;
    x.beginPath(); x.moveTo(px, py);
    const steps = Math.min(160, Math.floor(len));
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift);
    for (let i = 0; i < steps; i++) {
      const v = K.curl(noise, px / sc * 100, py / sc * 100, 1);
      const mag = Math.hypot(v[0], v[1]) + 1e-5;
      px += (v[0] / mag) * 2.6 + cd * 0.7;
      py += (v[1] / mag) * 2.6 + sd * 0.7;
      x.lineTo(px, py);
    }
    x.lineWidth = lw;
    x.strokeStyle = K.rgba(col, alpha);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.stroke();
  }

  // contrast guard: deepen an ink that reads too close to the pool luminance.
  function guarder(R) {
    return (c) => Math.abs(K.lum(c) - K.lum(R.paper)) < 0.20 ? K.mix(c, R.inkA, 0.40) : c;
  }

  // Scatter a few clean-bleed tendrils + floating veins around a region.
  function dressing(x, noise, cx, cy, spread, p, P, R, W, H, tendN, veinN) {
    const minWH = Math.min(W, H);
    const guard = guarder(R);
    for (let i = 0; i < tendN; i++) {
      const ang = p.r() * Math.PI * 2;
      const dist = (0.02 + p.r() * spread) * minWH;
      const sx = cx + Math.cos(ang) * dist, sy = cy + Math.sin(ang) * dist;
      const col = guard(K.mix(R.bleed, p.r() < 0.5 ? R.inkA : R.inkB, p.r() * 0.4));
      vein(x, noise, sx, sy, p, col, 0.14 + p.r() * 0.16, 28 + p.r() * 46, 1.0 + p.r() * 1.3, W, H);
    }
    for (let i = 0; i < veinN; i++) {
      let sx, sy;
      if (i % 2 === 0) {
        const ang = p.r() * Math.PI * 2, dist = (0.02 + p.r() * spread * 1.2) * minWH;
        sx = cx + Math.cos(ang) * dist; sy = cy + Math.sin(ang) * dist;
      } else {
        const edge = Math.floor(p.r() * 4);
        sx = edge === 0 ? 0 : edge === 1 ? W : p.r() * W;
        sy = edge === 2 ? 0 : edge === 3 ? H : p.r() * H;
      }
      const col = p.r() < 0.7 ? R.vein : K.mix(R.vein, R.inkC, 0.4);
      vein(x, noise, sx, sy, p, col, 0.14 + p.r() * 0.16, 90 + p.r() * 55, 0.6 + p.r() * 1.0, W, H);
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
   * THE SEVEN LAYOUTS — each composes the marbling primitives differently.
   * Each receives (x, noise, p, P, R, W, H) where p.r is the shared RNG.
   * ════════════════════════════════════════════════════════════════════════ */

  // 1. SUMINAGASHI — one off-centre ring stack combed into a long feather.
  function layoutSuminagashi(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const cx = (r() < 0.5 ? 0.34 : 0.66) * W + (r() - 0.5) * 0.04 * W;
    const cy = (r() < 0.5 ? 0.35 : 0.65) * H + (r() - 0.5) * 0.04 * H;
    const guard = guarder(R);
    // negative-space pool opposite
    pool(x, (W - cx) , (H - cy), Math.max(W, H) * 0.6, p, P, R, W, H);
    // a couple of soft pigment bodies under the rings
    for (let i = 0; i < 3; i++) {
      const ang = r() * Math.PI * 2, dist = (0.03 + r() * 0.16) * minWH;
      combBlob(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist,
               (0.08 + r() * 0.14) * minWH, p, r() < 0.6 ? R.inkA : R.inkB, 0.16 + r() * 0.12, W, H, 1);
    }
    // 1–2 ring stacks, dense
    const sources = K.rint(r, 1, 2);
    for (let s = 0; s < sources; s++) {
      const ang = r() * Math.PI * 2, dist = (r() * 0.10) * minWH;
      const ox = cx + Math.cos(ang) * dist, oy = cy + Math.sin(ang) * dist;
      const baseR = (0.02 + r() * 0.02) * minWH, gap = (0.016 + r() * 0.015) * minWH;
      const ringPair = r() < 0.5 ? [guard(R.inkA), guard(R.bleed)] : [guard(R.inkB), guard(R.bleed)];
      ringStack(x, noise, ox, oy, baseR, gap, K.rint(r, 10, 16), p, P, ringPair, 1, 1, W, H, 1);
    }
    // blooms nested into the worked region
    for (let i = 0; i < K.rint(r, 2, 4); i++) {
      const ang = r() * Math.PI * 2, dist = (0.03 + r() * 0.18) * minWH;
      const bx = cx + Math.cos(ang) * dist, by = cy + Math.sin(ang) * dist;
      const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, bx, by, (0.07 + r() * 0.13) * minWH, p, core, edge, 0.5 + r() * 0.18, W, H, 1);
    }
    dressing(x, noise, cx, cy, 0.28, p, P, R, W, H, 10 + Math.floor(p.flow * 7), 14 + Math.floor(p.flow * 9));
  }

  // 2. SCATTER — many ink drops/rings strewn across a thirds/phi constellation.
  function layoutScatter(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    const xs = [K.INVPHI, 1 - K.INVPHI, 1 / 3, 2 / 3, 0.5, 0.18, 0.82];
    const ys = [K.INVPHI, 1 - K.INVPHI, 1 / 3, 2 / 3, 0.5, 0.2, 0.8];
    const pts = [];
    for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    const n = K.rint(r, 9, 15);
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i % pts.length];
      const ox = W * (ax + (r() - 0.5) * 0.08), oy = H * (ay + (r() - 0.5) * 0.08);
      const kind = r();
      // power-skew the size: most drops small, a few large → real scatter rhythm
      const ss = r(); const sz = (0.035 + ss * ss * 0.16) * minWH;
      if (kind < 0.78) {
        // ring drop — the dominant element; on a small solid pigment core so it
        // reads as ink, not a pale line. Crisp legible rings, varied size.
        const body = r() < 0.5 ? R.inkA : R.inkB;
        combBlob(x, noise, ox, oy, sz * (0.5 + r() * 0.3), p, body, 0.26 + r() * 0.16, W, H, 0.7);
        const ringPair = r() < 0.5 ? [guard(R.inkA), guard(R.bleed)] : [guard(R.inkB), guard(R.bleed)];
        const baseR = sz * 0.16, gap = sz * (0.14 + r() * 0.08);
        ringStack(x, noise, ox, oy, baseR, gap, K.rint(r, 5, 10), p, P, ringPair, 1.1, 1.0, W, H, 0.7);
      } else {
        // a sheared bloom for incident — higher gain so it stretches into the
        // current rather than sitting as a fuzzy disc.
        const core = r() < 0.4 ? R.inkA : r() < 0.7 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
        bloom(x, noise, ox, oy, sz, p, core, edge, 0.55 + r() * 0.2, W, H, 1.1);
      }
    }
    // connective veins drawing the constellation together
    dressing(x, noise, 0.5 * W, 0.5 * H, 0.46, p, P, R, W, H, 10, 16);
  }

  // 3. STONE — dense full-field combed stone marble: rings everywhere, hard rake,
  //    minimal negative space. The busy, fully-worked piece.
  function layoutStone(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // a dense grid of overlapping ring stacks blanketing the whole canvas, each
    // seated on its own solid (full-opacity) marbled pigment body so the field
    // reads as worked stone, not soft blobs floating on paper.
    const cols = K.rint(r, 5, 7), rows = K.rint(r, 5, 8);
    for (let cyi = 0; cyi < rows; cyi++) {
      for (let cxi = 0; cxi < cols; cxi++) {
        const ox = W * ((cxi + 0.5 + (r() - 0.5) * 0.7) / cols);
        const oy = H * ((cyi + 0.5 + (r() - 0.5) * 0.7) / rows);
        const sz = minWH * (0.05 + r() * 0.06);
        const body = [R.inkA, R.inkB, R.inkC][Math.floor(r() * 3)];
        // solid pigment core, marbled — gives the field weight + colour
        combBlob(x, noise, ox, oy, sz * (0.7 + r() * 0.4), p, body, 0.32 + r() * 0.18, W, H, 1.0);
        // crisp combed rings on top (coloured, not just pale bleed)
        const ringPair = r() < 0.5 ? [guard(R.inkA), guard(R.bleed)] : [guard(R.inkB), guard(R.bleed)];
        ringStack(x, noise, ox, oy, sz * 0.18, sz * (0.16 + r() * 0.08), K.rint(r, 5, 9), p, P, ringPair, 1.05, 1.0, W, H, 0.85);
      }
    }
    dressing(x, noise, 0.5 * W, 0.5 * H, 0.55, p, P, R, W, H, 16, 22);
  }

  // 4. CONFLUENCE — a few currents meeting off-centre, feathers colliding.
  function layoutConfluence(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    const cx = (r() < 0.5 ? 0.38 : 0.62) * W, cy = (r() < 0.5 ? 0.4 : 0.6) * H;
    pool(x, (W - cx), (H - cy), Math.max(W, H) * 0.55, p, P, R, W, H);
    // bodies clustered around the meeting point
    for (let i = 0; i < K.rint(r, 4, 7); i++) {
      const ang = r() * Math.PI * 2, dist = (0.04 + r() * 0.24) * minWH;
      const col = [R.inkA, R.inkB, R.inkC][Math.floor(r() * 3)];
      combBlob(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist,
               (0.07 + r() * 0.15) * minWH, p, col, 0.16 + r() * 0.14, W, H, 1);
    }
    // 2–4 ring stacks at distinct offsets — the colliding currents
    const sources = K.rint(r, 2, 4);
    for (let s = 0; s < sources; s++) {
      const ang = (s / sources) * Math.PI * 2 + r() * 0.8;
      const dist = (0.08 + r() * 0.18) * minWH;
      const ox = cx + Math.cos(ang) * dist, oy = cy + Math.sin(ang) * dist;
      const ringPair = r() < 0.5 ? [guard(R.inkA), guard(R.bleed)] : [guard(R.inkB), guard(R.bleed)];
      ringStack(x, noise, ox, oy, minWH * (0.02 + r() * 0.02), minWH * (0.015 + r() * 0.014),
                K.rint(r, 8, 13), p, P, ringPair, 1, 1, W, H, 1);
    }
    for (let i = 0; i < K.rint(r, 3, 5); i++) {
      const ang = r() * Math.PI * 2, dist = (0.03 + r() * 0.2) * minWH;
      const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist,
            (0.07 + r() * 0.13) * minWH, p, core, edge, 0.5 + r() * 0.18, W, H, 1);
    }
    dressing(x, noise, cx, cy, 0.3, p, P, R, W, H, 12 + Math.floor(p.flow * 8), 16 + Math.floor(p.flow * 9));
  }

  // 5. RIVER — a torn current sweeping edge-to-edge full-bleed (diagonal band).
  function layoutRiver(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // axis of the river ~ drift; place a band of sources along it
    const ang = p.drift;
    const cd = Math.cos(ang), sd = Math.sin(ang);
    const midx = 0.5 * W + (r() - 0.5) * 0.2 * W, midy = 0.5 * H + (r() - 0.5) * 0.2 * H;
    // perpendicular offset of the band off-centre (asymmetry)
    const pcd = -sd, psd = cd;
    const bandOff = (r() - 0.5) * 0.5 * minWH;
    const bx = midx + pcd * bandOff, by = midy + psd * bandOff;
    // negative space on the far side of the band
    pool(x, midx - pcd * minWH * 0.5, midy - psd * minWH * 0.5, Math.max(W, H) * 0.6, p, P, R, W, H);
    // a chain of ring stacks + bodies strung along the river axis, off both ends
    const span = Math.hypot(W, H) * 0.65;
    const N = K.rint(r, 5, 8);
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1) - 0.5) * 2;       // -1..1 along the axis
      const ox = bx + cd * t * span + pcd * (r() - 0.5) * 0.18 * minWH;
      const oy = by + sd * t * span + psd * (r() - 0.5) * 0.18 * minWH;
      combBlob(x, noise, ox, oy, (0.08 + r() * 0.14) * minWH, p,
               [R.inkA, R.inkB][Math.floor(r() * 2)], 0.14 + r() * 0.12, W, H, 1.15);
      const ringPair = r() < 0.5 ? [guard(R.inkA), guard(R.bleed)] : [guard(R.inkB), guard(R.bleed)];
      ringStack(x, noise, ox, oy, minWH * 0.02, minWH * (0.018 + r() * 0.012),
                K.rint(r, 7, 12), p, P, ringPair, 0.95, 1, W, H, 1.2);
      if (r() < 0.5) {
        const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
        bloom(x, noise, ox, oy, (0.06 + r() * 0.1) * minWH, p, core, edge, 0.5, W, H, 1.2);
      }
    }
    // veins streaming along the whole river (started from the upstream edge)
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 22 + Math.floor(p.flow * 10); i++) {
      const t = (r() - 0.5) * 2;
      const sx = bx + cd * t * span + pcd * (r() - 0.5) * 0.4 * minWH;
      const sy = by + sd * t * span + psd * (r() - 0.5) * 0.4 * minWH;
      const col = r() < 0.6 ? R.vein : guard(K.mix(R.bleed, R.inkA, 0.3));
      vein(x, noise, sx, sy, p, col, 0.14 + r() * 0.16, 110 + r() * 50, 0.6 + r() * 1.1, W, H);
    }
    x.restore();
  }

  // 6. SPARSE — 1–2 large blooms with vast shaped negative space.
  function layoutSparse(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // one strong focal on a thirds point, big breathing field elsewhere
    const cx = (r() < 0.5 ? 0.32 : 0.68) * W, cy = (r() < 0.5 ? 0.34 : 0.66) * H;
    pool(x, (W - cx), (H - cy), Math.max(W, H) * 0.72, p, P, R, W, H);
    // a faint drifting ink veil so the vast negative space reads as shaped,
    // breathing water — never a dead flat field.
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) {
      const sx = (W - cx) + (r() - 0.5) * 0.5 * W, sy = (H - cy) + (r() - 0.5) * 0.5 * H;
      vein(x, noise, sx, sy, p, K.mix(R.bleed, R.inkB, 0.3), 0.05 + r() * 0.05, 90 + r() * 50, 0.7 + r() * 0.8, W, H);
    }
    x.restore();
    // sub-mode keeps the 3-ish Sparse seeds per dozen from reading alike:
    //   'feather'  — one bold combed ring stack stretched hard into a long feather
    //   'lotus'    — a delicate ring-only bloom, no soft body (airy, linear)
    //   'twin'     — two unequal focals, a big one + a smaller satellite
    const mode = r() < 0.4 ? 'feather' : r() < 0.7 ? 'lotus' : 'twin';
    const big = mode === 'twin' ? 2 : 1;
    for (let i = 0; i < big; i++) {
      const isSat = i === 1;
      const ox = cx + (r() - 0.5) * 0.12 * W + (isSat ? (r() - 0.5) * 0.3 * W : 0);
      const oy = cy + (r() - 0.5) * 0.12 * H + (isSat ? (r() - 0.5) * 0.3 * H : 0);
      const sz = (isSat ? 0.07 + r() * 0.05 : 0.17 + r() * 0.11) * minWH;
      const gain = mode === 'feather' ? 1.3 : 0.7;
      const ringPair = r() < 0.5 ? [guard(R.inkA), guard(R.bleed)] : [guard(R.inkB), guard(R.bleed)];
      if (mode !== 'lotus') {
        combBlob(x, noise, ox, oy, sz * 1.05, p, r() < 0.5 ? R.inkA : R.inkB, 0.16 + r() * 0.1, W, H, gain);
      }
      ringStack(x, noise, ox, oy, sz * 0.12, sz * (0.1 + r() * 0.07), K.rint(r, 8, 14), p, P, ringPair, 1.05, 1, W, H, gain);
      if (mode !== 'lotus') {
        const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
        bloom(x, noise, ox, oy, sz, p, core, edge, 0.5 + r() * 0.18, W, H, gain);
      }
    }
    // a tiny counterweight incident on the far side
    if (r() < 0.7) {
      const fx = (W - cx) + (r() - 0.5) * 0.1 * W, fy = (H - cy) + (r() - 0.5) * 0.1 * H;
      const core = R.inkC, edge = K.mix(core, R.bleed, 0.5);
      bloom(x, noise, fx, fy, (0.04 + r() * 0.04) * minWH, p, core, edge, 0.5, W, H, 0.7);
    }
    // very few veins — keep it calm
    dressing(x, noise, cx, cy, 0.22, p, P, R, W, H, 4, 6);
  }

  // 7. NONPAREIL — the raked grid/comb: parallel ink lines pulled into chevrons.
  function layoutNonpareil(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // direction of the parallel base lines (then raked perpendicular)
    const ang = p.drift;
    const cd = Math.cos(ang), sd = Math.sin(ang);
    const diag = Math.hypot(W, H);
    const lineGap = minWH * (0.014 + r() * 0.012);  // tighter spacing → real comb
    const nLines = Math.ceil((diag * 1.4) / lineGap);
    const cxm = W / 2, cym = H / 2;
    // alternating ink colours for the parallel lines
    const cA = guard(R.inkA), cB = guard(R.inkB), cBl = R.bleed;
    const cols = [cA, cBl, cB, cBl];
    // DEDICATED CHEVRON RAKE — the nonpareil signature. After laying parallel
    // base lines, a comb pulled PERPENDICULAR to them drags each line into the
    // classic zig-zag. A high-frequency sinusoid along the line axis (period =
    // combPeriod) pushed perpendicular, amplitude ~ a fraction of lineGap so
    // neighbours interleave into chevrons. Plus a gentle curl so it's organic.
    const combPeriod = minWH * (0.06 + r() * 0.08);   // chevron wavelength
    const amp = lineGap * (1.6 + r() * 1.4);          // chevron throw
    const phaseDrift = (r() - 0.5) * 2;               // slow phase walk → waviness
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let li = 0; li < nLines; li++) {
      const off = (li - nLines / 2) * lineGap;
      const ox = cxm + (-sd) * off, oy = cym + (cd) * off;
      const col = cols[li % cols.length];
      const alpha = (li % 2 === 0) ? 0.8 : 0.6;
      const lw = (li % 4 === 0) ? 2.4 : 1.6;
      x.beginPath();
      const segs = 260;
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs - 0.5) * 2;
        const along = t * diag * 0.7;                 // distance along the line
        let lx = ox + cd * along, ly = oy + sd * along;
        // perpendicular chevron displacement (high frequency)
        const wob = noise.fbm(lx / 260, ly / 260, 3) * phaseDrift;
        const ch = Math.sin((along / combPeriod) * Math.PI * 2 + wob * 3) * amp;
        lx += (-sd) * ch; ly += (cd) * ch;
        // a touch of curl eddy for organic break-up (small)
        const v = K.curl(noise, lx / p.flowScale * 100, ly / p.flowScale * 100, 1);
        lx += v[0] * minWH * 0.04 * p.flow; ly += v[1] * minWH * 0.04 * p.flow;
        i === 0 ? x.moveTo(lx, ly) : x.lineTo(lx, ly);
      }
      x.lineWidth = lw;
      x.strokeStyle = K.rgba(col, alpha);
      x.lineJoin = 'round'; x.lineCap = 'round';
      x.stroke();
    }
    x.restore();
    // a few drops sitting on the comb for incident
    for (let i = 0; i < K.rint(r, 2, 5); i++) {
      const ox = W * (0.2 + r() * 0.6), oy = H * (0.2 + r() * 0.6);
      const core = r() < 0.5 ? R.inkC : R.inkB, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, ox, oy, (0.05 + r() * 0.07) * minWH, p, core, edge, 0.5, W, H, 1.0);
    }
    dressing(x, noise, cxm, cym, 0.4, p, P, R, W, H, 6, 10);
  }

  // Shaped negative-space pool: a soft flat wash of clean pigment-tinted water.
  function pool(x, px, py, rad, p, P, R, W, H) {
    x.save(); x.globalCompositeOperation = 'source-over';
    const cg = x.createRadialGradient(px, py, 0, px, py, rad);
    cg.addColorStop(0, K.rgba(K.mix(R.paper, R.bleed, 0.26), 0.5));
    cg.addColorStop(0.5, K.rgba(K.mix(R.paper, R.inkB, 0.05), 0.2));
    cg.addColorStop(1, K.rgba(R.paper, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r);
    p.r = r;                                  // expose the RNG to layouts
    const P = p.pal, R = richen(P);
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H);

    // ── WET PAPER GROUND — saturated coloured field, never dark. Two-tone wash.
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, K.mix(R.paper, R.bleed, 0.10));
    gg.addColorStop(0.55, R.paper);
    gg.addColorStop(1, K.mix(R.paper, R.inkA, 0.12 + 0.08 * R.k));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // subtle fbm paper-stain so the pool isn't flat
    x.save(); x.globalCompositeOperation = 'multiply';
    const stainStep = Math.max(4, Math.floor(minWH / 150));
    const stainCol = K.h2r(K.mix(R.paper, R.inkA, 0.18));
    for (let yy = 0; yy < H; yy += stainStep) {
      for (let xx = 0; xx < W; xx += stainStep) {
        const n = (noise.fbm(xx / 240, yy / 240, 4) + 1) / 2;
        const a = K.clamp((n - 0.45) * 0.18, 0, 0.14);
        if (a < 0.01) continue;
        x.fillStyle = 'rgba(' + stainCol[0] + ',' + stainCol[1] + ',' + stainCol[2] + ',' + a + ')';
        x.fillRect(xx, yy, stainStep + 1, stainStep + 1);
      }
    }
    x.restore();

    // ── THE LAYOUT — the primary structural axis ──
    switch (p.layout) {
      case 'Suminagashi': layoutSuminagashi(x, noise, p, P, R, W, H); break;
      case 'Scatter':     layoutScatter(x, noise, p, P, R, W, H); break;
      case 'Stone':       layoutStone(x, noise, p, P, R, W, H); break;
      case 'Confluence':  layoutConfluence(x, noise, p, P, R, W, H); break;
      case 'River':       layoutRiver(x, noise, p, P, R, W, H); break;
      case 'Sparse':      layoutSparse(x, noise, p, P, R, W, H); break;
      case 'Nonpareil':   layoutNonpareil(x, noise, p, P, R, W, H); break;
    }

    // ── RARE CHASE EVENTS ──
    const cx = 0.5 * W, cy = 0.5 * H;
    if (p.event === 'Gilded Veil') {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) {
        const ang = r() * Math.PI * 2, dist = (r() * 0.4) * minWH;
        vein(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, p, R.vein, 0.08 + r() * 0.1, 80 + r() * 60, 0.5 + r() * 0.8, W, H);
      }
      K.bloom(x, cx, cy, minWH * 0.4, R.vein, 0.10);
      x.restore();
    } else if (p.event === 'Eclipse Pool') {
      const er = minWH * 0.2;
      combBlob(x, noise, cx, cy, er, p, K.mix(R.inkA, '#10122a', 0.5), 0.6, W, H, 1);
      for (let i = 0; i < 6; i++) combRing(x, noise, cx, cy, er + i * minWH * 0.012, p, R.bleed, 0.4 * (1 - i / 8), 1.6, W, H, 1);
    }

    // ── MATTE FINISH — paper tooth + grain + soft coloured edge settle (never black).
    K.mottle(x, 0, 0, W, H, R.inkA, 6500, r, 'soft-light');
    K.grain(x, W, H, 1500, r);
    // soft coloured edge settle — pigment pools slightly darker toward the FRAME
    // EDGES only (a gentle paper vignette toward the inked-paper hue, never black).
    // Kept light + edge-confined so it never washes the worked centre to pale.
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(cx, cy, Math.max(W, H) * 0.45, cx, cy, Math.max(W, H) * 0.95);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix('#ffffff', R.deep, 0.55), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'ink2', draw, traits };
})();
