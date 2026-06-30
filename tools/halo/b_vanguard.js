/* VANGUARD — non-objective Constructivist composition.
 * Bold intersecting DIAGONAL BARS, a large CIRCLE, crossing LINES and a WEDGE
 * locked into a dynamic off-axis layout with strong directional thrust. Hard,
 * energetic, machine-age geometry — pure form, NO subject. (Rodchenko / Lissitzky
 * undercurrent, but the work is ours.) Palette world: RED / BLACK / CREAM / STEEL.
 *
 * NOT flat clip-art: every shape carries printed-ink mottle, paper tooth, a faint
 * haze sheet, a vignette grade and slightly imperfect hand edges — a fine
 * screenprint, tactile and atmospheric, while staying crisp non-objective.
 *
 * Variation contract: every salient parameter — counts, positions, sizes,
 * proportions, ratios, rotations, spacings, asymmetry, focal placement, crop/
 * zoom, density, format and colour VALUES — varies CONTINUOUSLY with the seed.
 * Structure is fully de-correlated from palette (palette only colours forms; a
 * global rng-driven control field decides every measurement). Two same-mode,
 * same-palette pieces still differ hard. No discrete "looks".
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six bespoke palettes — RED / BLACK / CREAM / STEEL world, now pitched
     DARK + SATURATED: half sit on dark grounds (ink black, deep oxblood,
     gunmetal) with cream/scarlet forms, the rest keep cream. Constructivist
     works on black. The set reads bold and dark-capable, not a cream project. */
  const PALS = [
    // ── DARK grounds (cream / scarlet forms) ──
    { name: 'Oxblood Manifesto',   bg: '#2a0f0d', ink: '#ece2cf', red: '#e0492a', steel: '#9aa0a3', tooth: '#160605', accents: ['#ece2cf', '#e0492a'] },
    { name: 'Ink Vanguard',        bg: '#14110f', ink: '#ece3d2', red: '#d8341d', steel: '#8b9196', tooth: '#050403', accents: ['#ece3d2', '#d8341d'] },
    { name: 'Gunmetal Drive',      bg: '#23282b', ink: '#e7dcc6', red: '#cf3320', steel: '#aeb4b8', tooth: '#101416', accents: ['#e7dcc6', '#cf3320'] },
    // ── CREAM grounds (black / scarlet forms) ──
    { name: 'Iron Proletariat',    bg: '#ded6c4', ink: '#100d0c', red: '#b8281a', steel: '#565d62', tooth: '#100d0c', accents: ['#100d0c', '#b8281a'] },
    { name: 'Bone & Cinnabar',     bg: '#efe8d8', ink: '#1a1614', red: '#e2492a', steel: '#8a9094', tooth: '#1a1614', accents: ['#1a1614', '#e2492a'] },
    { name: 'Ember Constructivist',bg: '#f0e7d4', ink: '#19120f', red: '#e8501f', steel: '#959a9c', tooth: '#19120f', accents: ['#19120f', '#e8501f'] },
  ];
  const isDark = (p) => K.lum(p.bg) < 0.4;

  const MODES = ['Wedge Thrust', 'Eclipse Cross', 'Lattice Drive', 'Severed Disc', 'Beam Cluster', 'Counterpoint'];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* Jitter a hex's value within the palette-world: small hue rotate toward a
     neighbour, plus lightness/saturation nudge. Keeps the colour family but
     makes two same-palette pieces carry visibly different ink/red/steel values
     so structure isn't the only thing distinguishing them. amt in 0..1. */
  function jitterCol(col, r, amt) {
    amt = amt == null ? 1 : amt;
    const c = K.h2r(col);
    // pull toward white or black by a small signed amount → value shift
    const lShift = (r() - 0.5) * 0.16 * amt;
    let out = lShift > 0 ? K.mix(col, '#ffffff', lShift) : K.mix(col, '#000000', -lShift);
    // tiny warm/cool cross-mix → hue drift inside family
    const warm = r() < 0.5 ? '#ff7a3c' : '#3c6bff';
    out = K.mix(out, warm, (r() * 0.07) * amt);
    return out;
  }

  /* ── hand-edge helpers ─────────────────────────────────────────────────── */
  function inkPoly(x, pts, col, r, jit) {
    jit = jit == null ? 1.6 : jit;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dx = (r() - 0.5) * jit, dy = (r() - 0.5) * jit;
      if (i === 0) x.moveTo(p[0] + dx, p[1] + dy); else x.lineTo(p[0] + dx, p[1] + dy);
    }
    x.closePath();
    x.fillStyle = col; x.fill();
  }

  function barPts(cx, cy, ang, L, T) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const px = -uy, py = ux;
    const hl = L / 2, ht = T / 2;
    return [
      [cx - ux * hl - px * ht, cy - uy * hl - py * ht],
      [cx + ux * hl - px * ht, cy + uy * hl - py * ht],
      [cx + ux * hl + px * ht, cy + uy * hl + py * ht],
      [cx - ux * hl + px * ht, cy - uy * hl + py * ht],
    ];
  }

  function drawBar(x, cx, cy, ang, L, T, col, r) {
    const pts = barPts(cx, cy, ang, L, T);
    x.save();
    K.softShadow(x, cx + Math.cos(ang + 1.6) * T * 0.4, cy + Math.sin(ang + 1.6) * T * 0.4, Math.max(L, T) * 0.6, 0.10);
    x.restore();
    inkPoly(x, pts, col, r, Math.min(3, T * 0.05 + 1));
    return pts;
  }

  // Wedge with an independent half-spread on each base side (asymmetric taper).
  function drawWedge(x, ax, ay, ang, L, spreadA, spreadB, col, r) {
    if (spreadB == null) spreadB = spreadA;
    const tipx = ax + Math.cos(ang) * L, tipy = ay + Math.sin(ang) * L;
    const px = -Math.sin(ang), py = Math.cos(ang);
    const pts = [
      [ax + px * spreadA, ay + py * spreadA],
      [ax - px * spreadB, ay - py * spreadB],
      [tipx, tipy],
    ];
    inkPoly(x, pts, col, r, 2.2);
    return pts;
  }

  let NOISE = null;
  function texturePoly(x, pts, col, r, density, noise) {
    noise = noise || NOISE;
    x.save();
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { if (i === 0) x.moveTo(pts[i][0], pts[i][1]); else x.lineTo(pts[i][0], pts[i][1]); }
    x.closePath(); x.clip();
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const p of pts) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); }
    const w = maxx - minx, h = maxy - miny;
    K.mottle(x, minx, miny, w, h, col, (density || 30) * 0.7, r, 'overlay');
    const flecks = Math.floor(w * h / 90);
    for (let i = 0; i < flecks; i++) {
      const fx = minx + r() * w, fy = miny + r() * h;
      const up = r() < 0.5;
      const c = up ? K.mix(col, '#ffffff', 0.22) : K.mix(col, '#000000', 0.28);
      const s = 0.7 + r() * 1.8;
      x.fillStyle = K.rgba(c, 0.05 + r() * 0.07);
      x.fillRect(fx, fy, s, s);
    }
    if (noise) {
      const step = Math.max(6, Math.floor(Math.min(w, h) / 22));
      x.globalCompositeOperation = 'overlay';
      for (let yy = miny; yy < maxy; yy += step) {
        for (let xx = minx; xx < maxx; xx += step) {
          const n = noise.fbm(xx / 90, yy / 90, 3, 0.55, 2.2);
          const a = Math.abs(n) * 0.10;
          if (a < 0.012) continue;
          x.fillStyle = K.rgba(n < 0 ? '#000000' : '#ffffff', a);
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
    }
    x.restore();
  }

  function inkCircle(x, cx, cy, rad, col, r, fill) {
    const n = 80;
    x.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = rad + (r() - 0.5) * Math.max(1.2, rad * 0.006);
      const xx = cx + Math.cos(a) * rr, yy = cy + Math.sin(a) * rr;
      if (i === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy);
    }
    x.closePath();
    if (fill) { x.fillStyle = col; x.fill(); } else { x.strokeStyle = col; x.stroke(); }
  }

  // filled disc polygon helper (returns pts for texturing)
  function discPts(cx, cy, rad, segs) {
    segs = segs || 64;
    const p = [];
    for (let i = 0; i <= segs; i++) { const a = i / segs * 6.283185; p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    return p;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    NOISE = noise;
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);

    /* ── CONTINUOUS GLOBAL CONTROL FIELD ──────────────────────────────────
       Every measurement below derives from these seed-driven knobs, NOT from
       per-mode constants. This is what de-correlates structure from palette
       and guarantees two same-mode/same-palette pieces differ hard. */

    // FORMAT: continuous aspect, not 3 discrete tiles. Bias to portrait/sq/land
    // bands but with a continuous ratio inside each band.
    const fband = r();
    let aspect;
    if (fband < 0.4) aspect = 0.66 + r() * 0.26;        // portrait 0.66–0.92
    else if (fband < 0.66) aspect = 0.94 + r() * 0.12;  // near-square 0.94–1.06
    else aspect = 1.12 + r() * 0.42;                    // landscape 1.12–1.54
    const longEdge = 1180 + Math.floor(r() * 140);      // 1180–1320 long edge
    let W, H;
    if (aspect >= 1) { W = longEdge; H = Math.round(longEdge / aspect); }
    else { H = longEdge; W = Math.round(longEdge * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H), D = Math.hypot(W, H);

    // GLOBAL SCALE / DENSITY / CROP — hard variance so some are sparse & vast,
    // others dense & tight.
    const scale = 0.74 + r() * 0.70;        // 0.74–1.44 master size multiplier
    const density = 0.55 + r() * 0.95;       // 0.55–1.50 element-count multiplier
    const crop = 0.82 + r() * 0.48;          // 0.82–1.30 zoom (>1 pushes off-edge)
    const asym = (r() - 0.5) * 2;            // -1..1 left/right weight bias

    // GLOBAL ROTATION of the whole composition — breaks the locked diagonal.
    const rot = (r() - 0.5) * 0.9;           // ±~26°

    // FOCAL placement — fully free across the canvas, not a fixed third.
    const fxN = 0.20 + r() * 0.60;
    const fyN = 0.20 + r() * 0.60;
    const fx = W * fxN, fy = H * fyN;

    // primary thrust angle — diagonal, biased away from horiz/vert, full range.
    const quad = r() < 0.5 ? -1 : 1;
    const baseAng = (Math.PI * (0.12 + r() * 0.30)) * quad + (r() < 0.5 ? 0 : Math.PI) + rot;

    // value-jittered palette colours (so colour VALUES vary within the world)
    const ink = jitterCol(pal.ink, r, 0.8);
    const red = jitterCol(pal.red, r, 0.7);
    const steel = jitterCol(pal.steel, r, 0.9);

    // ── PAPER GROUND ──
    const dark = isDark(pal);
    const tooth = pal.tooth || K.mix(pal.bg, pal.ink, 0.18);
    x.fillStyle = pal.bg; x.fillRect(0, 0, W, H);
    const gang = r() < 0.5 ? 1 : -1;
    const gx2 = W * (0.4 + r() * 0.6), gy2 = gang > 0 ? H : 0;
    const pg = x.createLinearGradient(W * r() * 0.3, 0, gx2, gy2);
    if (dark) {
      pg.addColorStop(0, K.rgba(K.mix(pal.bg, pal.steel, 0.16), 0.0));
      pg.addColorStop(0.4 + r() * 0.3, K.rgba(K.mix(pal.bg, pal.steel, 0.16), 0.20));
      pg.addColorStop(1, K.rgba(K.mix(pal.bg, '#000000', 0.5), 0.30));
    } else {
      pg.addColorStop(0, K.rgba(K.mix(pal.bg, '#ffffff', 0.55), 0.0));
      pg.addColorStop(0.4 + r() * 0.3, K.rgba(K.mix(pal.bg, '#ffffff', 0.4), 0.55));
      pg.addColorStop(1, K.rgba(K.mix(pal.bg, pal.steel, 0.18), 0.14));
    }
    x.fillStyle = pg; x.fillRect(0, 0, W, H);
    K.mottle(x, 0, 0, W, H, tooth, 80, r, 'multiply');
    if (dark) K.mottle(x, 0, 0, W, H, K.mix(pal.bg, pal.ink, 0.5), 55, r, 'screen');

    // crossing-line helper
    function crossLine(cx, cy, ang, len, w, col, alpha) {
      x.save();
      x.globalAlpha = alpha == null ? 1 : alpha;
      x.lineCap = 'butt';
      x.strokeStyle = col; x.lineWidth = w;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const seg = 6;
      x.beginPath();
      for (let i = 0; i <= seg; i++) {
        const t = i / seg - 0.5;
        const jx = (r() - 0.5) * w * 0.25, jy = (r() - 0.5) * w * 0.25;
        const xx = cx + ux * len * t + jx, yy = cy + uy * len * t + jy;
        if (i === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy);
      }
      x.stroke();
      x.restore();
    }

    // common focal disc radius, scaled by master scale + crop
    let discR = S * (0.16 + r() * 0.14) * scale;
    let dcx = fx, dcy = fy;

    // ═══════════ MODE COMPOSITIONS (all measurements now ride the knobs) ═══
    if (mode === 'Wedge Thrust') {
      dcx = fx; dcy = fy; discR = S * (0.12 + r() * 0.12) * scale;
      const discCol = r() < 0.58 ? red : ink;
      const dp = discPts(dcx, dcy, discR);
      inkCircle(x, dcx, dcy, discR, discCol, r, true);
      texturePoly(x, dp, discCol, r, 24);
      // giant wedge — apex side, target point, length, taper all continuous
      const apexEdgeX = (asym < 0 ? 0.02 : 0.98) + (r() - 0.5) * 0.1;
      const apex = [W * apexEdgeX, H * (0.6 + r() * 0.36)];
      const tgt = [W * (0.3 + r() * 0.5), H * (0.05 + r() * 0.3)];
      const wAng = Math.atan2(tgt[1] - apex[1], tgt[0] - apex[0]);
      const wLen = D * (0.62 + r() * 0.42) * crop;
      const sA = S * (0.08 + r() * 0.16) * scale, sB = S * (0.08 + r() * 0.16) * scale;
      const wpts = drawWedge(x, apex[0], apex[1], wAng, wLen, sA, sB, ink, r);
      texturePoly(x, wpts, ink, r, 26);
      // 1–2 crossing red/steel bars at continuous offsets
      const nb = 1 + (r() < (0.4 + density * 0.3) ? 1 : 0);
      for (let i = 0; i < nb; i++) {
        const bc = i === 0 ? red : steel;
        const bx = W * (0.4 + r() * 0.3), by = H * (0.4 + r() * 0.3);
        const ba = baseAng + (i ? (r() - 0.5) * 1.4 : (r() - 0.5) * 0.5);
        const bT = S * (0.03 + r() * 0.05) * scale;
        const bp = drawBar(x, bx, by, ba, D * (0.6 + r() * 0.35), bT, bc, r);
        texturePoly(x, bp, bc, r, 22);
      }
      const lines = 1 + Math.round(density * 1.6);
      for (let i = 0; i < lines; i++) {
        crossLine(W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), baseAng + Math.PI / 2 + (r() - 0.5) * 0.6, D, Math.max(2, S * (0.003 + r() * 0.005)), r() < 0.5 ? steel : ink, 0.5 + r() * 0.45);
      }

    } else if (mode === 'Eclipse Cross') {
      const c = [W * (0.36 + r() * 0.30 + asym * 0.06), H * (0.36 + r() * 0.30)];
      const a1 = baseAng, a2 = baseAng + Math.PI / 2 + (r() - 0.5) * 0.7;
      const T1 = S * (0.06 + r() * 0.08) * scale, T2 = S * (0.035 + r() * 0.06) * scale;
      const bb1 = drawBar(x, c[0], c[1], a1, D * (0.8 + r() * 0.3), T1, ink, r); texturePoly(x, bb1, ink, r, 26);
      const bb2 = drawBar(x, c[0], c[1], a2, D * (0.8 + r() * 0.3), T2, red, r); texturePoly(x, bb2, red, r, 22);
      discR = S * (0.11 + r() * 0.19) * scale;
      // disc can sit at the cross or be displaced (continuous, wide range)
      const dox = (r() - 0.5) * S * 0.42, doy = (r() - 0.5) * S * 0.42;
      const dcc = [c[0] + dox, c[1] + doy];
      const dcol = r() < 0.5 ? red : steel;
      const dp = discPts(dcc[0], dcc[1], discR);
      inkCircle(x, dcc[0], dcc[1], discR, dcol, r, true);
      texturePoly(x, dp, dcol, r, 24);
      // re-stamp ink bar for the eclipse cut
      inkPoly(x, bb1, ink, r, 2); texturePoly(x, bb1, ink, r, 26);
      // optional orbiting ring at continuous radius/offset
      if (r() < 0.7) {
        x.save(); x.lineWidth = Math.max(2.5, S * (0.005 + r() * 0.006));
        inkCircle(x, dcc[0] + (r() - 0.5) * S * 0.16, dcc[1] - (r() - 0.5) * S * 0.16, discR * (1.15 + r() * 0.5), K.rgba(steel, 0.7 + r() * 0.25), r, false);
        x.restore();
      }
      dcx = dcc[0]; dcy = dcc[1];

    } else if (mode === 'Lattice Drive') {
      const n = 3 + Math.round(density * 4 + r() * 2);   // 3–9 bars
      const ang = baseAng;
      const px = -Math.sin(ang), py = Math.cos(ang);
      const cxn = W * (0.4 + r() * 0.2 + asym * 0.08), cyn = H * (0.4 + r() * 0.2);
      // non-uniform spacing → rhythm
      const gaps = []; let span = 0;
      for (let i = 0; i < n - 1; i++) { const g = S * (0.045 + r() * 0.11) * scale; gaps.push(g); span += g; }
      const offs = [-span * (0.35 + r() * 0.3)]; for (let i = 0; i < gaps.length; i++) offs.push(offs[i] + gaps[i]);
      const heavyIdx = (r() * n) | 0;
      let redIdx = (r() * n) | 0; if (redIdx === heavyIdx) redIdx = (redIdx + 1) % n;
      for (let i = 0; i < n; i++) {
        const cx = cxn + px * offs[i] + (r() - 0.5) * 10;
        const cy = cyn + py * offs[i] + (r() - 0.5) * 10;
        const aJit = ang + (r() - 0.5) * 0.06;  // each bar slightly off-parallel
        let col, T;
        if (i === heavyIdx) { col = ink; T = S * (0.07 + r() * 0.05) * scale; }
        else if (i === redIdx) { col = red; T = S * (0.035 + r() * 0.035) * scale; }
        else { col = i % 2 ? K.mix(ink, steel, 0.15 + r() * 0.2) : K.mix(ink, steel, 0.35 + r() * 0.25); T = S * (0.01 + r() * 0.025) * scale; }
        const bp = drawBar(x, cx, cy, aJit, D * (0.85 + r() * 0.25) * crop, T, col, r);
        texturePoly(x, bp, col, r, 26);
      }
      const m = 1 + Math.round(density * 2 + r());
      for (let j = 0; j < m; j++) {
        crossLine(W * (0.25 + r() * 0.5), H * (0.25 + r() * 0.5), ang + Math.PI / 2 + (r() - 0.5) * 0.4, D, Math.max(2, S * (0.003 + r() * 0.007)), r() < 0.5 ? steel : ink, 0.6 + r() * 0.3);
      }
      // focal disc anywhere, continuous
      dcx = W * (0.22 + r() * 0.56); dcy = H * (0.22 + r() * 0.56); discR = S * (0.08 + r() * 0.09) * scale;
      const dp = discPts(dcx, dcy, discR);
      inkCircle(x, dcx, dcy, discR, r() < 0.7 ? red : ink, r, true); texturePoly(x, dp, red, r, 22);

    } else if (mode === 'Severed Disc') {
      dcx = W * (0.3 + r() * 0.4 + asym * 0.06); dcy = H * (0.3 + r() * 0.36);
      discR = S * (0.2 + r() * 0.13) * scale * crop;
      const dcol = r() < 0.5 ? red : ink;
      const dp = discPts(dcx, dcy, discR, 72);
      inkCircle(x, dcx, dcy, discR, dcol, r, true); texturePoly(x, dp, dcol, r, 22);
      // severing bar — continuous offset, thickness, angle
      const sang = baseAng + (r() - 0.5) * 0.3;
      const T = S * (0.02 + r() * 0.05) * scale;
      const sOff = (r() - 0.5) * discR * 0.8;
      const barCol = dcol === red ? ink : red;
      const sb = drawBar(x, dcx + Math.cos(sang + 1.57) * sOff, dcy + Math.sin(sang + 1.57) * sOff, sang, D * (0.9 + r() * 0.25), T, barCol, r);
      texturePoly(x, sb, barCol, r, 24);
      crossLine(dcx, dcy, sang + Math.PI / 2 + (r() - 0.5) * 0.4, discR * (1.8 + r() * 1.2), Math.max(2, S * (0.003 + r() * 0.004)), steel, 0.7 + r() * 0.25);
      // counter-dots in negative space — count & placement continuous
      const dots = r() < 0.7 ? 1 + (r() < 0.4 ? 1 : 0) : 0;
      for (let i = 0; i < dots; i++) {
        const far = discR + S * (0.1 + r() * 0.22);
        const da = sang + (i ? Math.PI : 0) + (r() - 0.5) * 0.5;
        const adx = dcx + Math.cos(da) * far, ady = dcy + Math.sin(da) * far;
        const acx = K.clamp(adx, S * 0.06, W - S * 0.06), acy = K.clamp(ady, S * 0.06, H - S * 0.06);
        inkCircle(x, acx, acy, S * (0.012 + r() * 0.022), r() < 0.5 ? red : ink, r, true);
      }

    } else if (mode === 'Beam Cluster') {
      const node = [W * (0.15 + r() * 0.55 + asym * 0.08), H * (0.2 + r() * 0.6)];
      const k = 4 + Math.round(density * 5 + r() * 2);   // 4–11 beams
      const spreadA = 0.7 + r() * 1.5;                   // fan width, wide range
      const base = baseAng + (r() - 0.5) * 1.2;          // fan centre rotates
      // beam-length profile is continuous PER FAN: uneven taper across the fan so
      // two fans never share the same envelope (kills the "fan in the void" twin).
      const Lbase = 0.42 + r() * 0.5, Lspan = 0.18 + r() * 0.6, Lskew = (r() - 0.5) * 2;
      // a continuously-placed heavy counter-bar crosses the empty field at a free
      // position/angle, present most of the time → breaks the bare-ground gestalt.
      const counter = r() < 0.78;
      const redBeam = (r() * k) | 0;
      let capA = 0, capL = 0;
      for (let i = 0; i < k; i++) {
        const t = k > 1 ? i / (k - 1) : 0.5;             // 0..1 along the fan
        const a = base + (t - 0.5) * spreadA + (r() - 0.5) * 0.12;
        // length rides a skewed profile + jitter → ragged, per-seed envelope
        const env = Lbase + Lspan * (t + Lskew * (t - 0.5) * (t - 0.5) * 4) * 0.5 * (0.6 + r() * 0.8);
        const L = D * K.clamp(env, 0.32, 1.18) * crop;
        const cx = node[0] + Math.cos(a) * L * 0.5, cy = node[1] + Math.sin(a) * L * 0.5;
        const col = i === redBeam ? red : (i % 3 === 0 ? K.mix(ink, steel, 0.2 + r() * 0.3) : ink);
        const T = i === redBeam ? S * (0.035 + r() * 0.03) * scale : S * (0.008 + r() * 0.026) * scale;
        const bp = drawBar(x, cx, cy, a, L, T, col, r); texturePoly(x, bp, col, r, 28);
        if (i === redBeam) { capA = a; capL = L; }
      }
      // counter-bar across the void at a free placement — continuous everything
      if (counter) {
        const ccx = W * (0.25 + r() * 0.5), ccy = H * (0.25 + r() * 0.5);
        const ca = base + Math.PI / 2 + (r() - 0.5) * 1.3;
        const cT = S * (0.02 + r() * 0.06) * scale;
        const ccol = r() < 0.4 ? red : (r() < 0.6 ? steel : ink);
        const cb = drawBar(x, ccx, ccy, ca, D * (0.6 + r() * 0.55) * crop, cT, ccol, r);
        texturePoly(x, cb, ccol, r, 26);
      }
      // disc caps the red beam — placement derives from that beam
      if (r() < 0.85) {
        const ex = node[0] + Math.cos(capA) * capL, ey = node[1] + Math.sin(capA) * capL;
        const rr = S * (0.07 + r() * 0.08) * scale;
        const dp = discPts(ex, ey, rr, 60);
        inkCircle(x, ex, ey, rr, r() < 0.5 ? ink : red, r, true); texturePoly(x, dp, ink, r, 24);
        dcx = ex; dcy = ey; discR = rr;
      } else { dcx = node[0]; dcy = node[1]; discR = S * 0.05; }
      inkCircle(x, node[0], node[1], S * (0.02 + r() * 0.03) * scale, red, r, true);

    } else { // Counterpoint
      const a1 = baseAng;
      const hbx = W * (0.25 + r() * 0.25 + asym * 0.06), hby = H * (0.3 + r() * 0.3);
      const heavy = drawBar(x, hbx, hby, a1, D * (0.7 + r() * 0.3), S * (0.06 + r() * 0.06) * scale, ink, r);
      texturePoly(x, heavy, ink, r, 26);
      // opposing red wedge — apex/target/taper continuous
      const apex = [W * (0.78 + r() * 0.2), H * (0.05 + r() * 0.35)];
      const tgt = [W * (0.1 + r() * 0.4), H * (0.55 + r() * 0.35)];
      const wAng = Math.atan2(tgt[1] - apex[1], tgt[0] - apex[0]);
      const wp = drawWedge(x, apex[0], apex[1], wAng, D * (0.55 + r() * 0.3) * crop, S * (0.07 + r() * 0.1) * scale, S * (0.07 + r() * 0.1) * scale, red, r);
      texturePoly(x, wp, red, r, 24);
      // fulcrum disc anywhere, continuous
      dcx = W * (0.38 + r() * 0.24); dcy = H * (0.38 + r() * 0.24); discR = S * (0.09 + r() * 0.08) * scale;
      const dp = discPts(dcx, dcy, discR);
      inkCircle(x, dcx, dcy, discR, r() < 0.6 ? steel : red, r, true); texturePoly(x, dp, steel, r, 22);
      const tl = 1 + Math.round(density * 1.5);
      for (let i = 0; i < tl; i++) {
        crossLine(W * (0.35 + r() * 0.3), H * (0.35 + r() * 0.3), a1 + (i ? 0.05 : Math.PI / 2) + (r() - 0.5) * 0.4, D * (0.8 + r() * 0.3), Math.max(2, S * (0.003 + r() * 0.004)), i ? red : ink, 0.6 + r() * 0.3);
      }
    }

    // ── rare structural spice: small ink/red square locked to the thrust axis ──
    if (r() < (0.22 + density * 0.2)) {
      const sq = S * (0.02 + r() * 0.03) * scale;
      const off = discR + sq * (1.2 + r() * 2.2);
      const sx = dcx + Math.cos(baseAng) * off, sy = dcy + Math.sin(baseAng) * off;
      const sqAng = baseAng + (r() - 0.5) * 0.4;
      const sp = barPts(sx, sy, sqAng, sq, sq * (0.7 + r() * 0.6));
      inkPoly(x, sp, r() < 0.5 ? ink : red, r, 1.2); texturePoly(x, sp, ink, r, 30);
    }

    // ── ATMOSPHERE & SCREENPRINT GRADE (unchanged grade, light per-seed drift) ──
    const hazeCol = K.mix(pal.bg, pal.steel, 0.5);
    K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.08 : 0.12, S * (0.7 + r() * 0.3), 'multiply');
    K.hazeSheet(x, W, H, noise, dark ? K.mix(pal.bg, pal.steel, 0.5) : K.mix(pal.bg, '#ffffff', 0.6), dark ? 0.05 : 0.08, S * (1.05 + r() * 0.35), 'screen');
    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, (dark || pal.name === 'Iron Proletariat') ? 0.34 : 0.26);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    // mirror draw()'s next rng consumer (the format band) to label format
    const fband = r();
    let aspect;
    if (fband < 0.4) aspect = 0.66 + r() * 0.26;
    else if (fband < 0.66) aspect = 0.94 + r() * 0.12;
    else aspect = 1.12 + r() * 0.42;
    const f = aspect > 1.06 ? 'Landscape' : aspect < 0.94 ? 'Portrait' : 'Square';
    return { Palette: pal.name, Mode: mode, Format: f };
  }

  return { name: 'b_vanguard', draw, traits };
})();
