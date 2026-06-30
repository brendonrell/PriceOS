/* APERTURE — hard-edge non-objective abstraction.
 * Crisp flat geometric figures — concentric rings / targets, chevrons,
 * split discs, clean bands — perfectly poised on a flat ground.
 * Influence: Ellsworth Kelly + Kenneth Noland hard-edge. The work IS
 * composition: form, colour, balance, tension. Depicts NOTHING.
 *
 * NOT flat clip-art: every shape carries a screenprint surface — printed-ink
 * mottle, paper tooth, soft registration-imperfect edges, a faint haze sheet
 * and a vignette grade. Tactile and atmospheric, yet razor-crisp geometry.
 *
 * GENERATIVE, NOT TEMPLATE: there are no discrete "modes × palettes" buckets.
 * Every salient parameter — format aspect, global zoom/scale, density, focal
 * position, counts, sizes, ratios, rotations, asymmetry, AND every colour
 * VALUE (hue/sat/light sampled continuously inside a palette WORLD, ground
 * jittered too) — varies continuously with the seed. A structural family may
 * recur, but two pieces in the same family diverge hard (different counts,
 * scales, crops, focal, asymmetry, secondary layers), so no two seeds are ever
 * near-duplicates. The palette names tag a colour-world, not a fixed swatch.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette WORLD for the colorway jury. KIT preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ── PALETTE WORLDS: each is a relationship of HSL anchors, not fixed hexes.
     ground = [h,s,l] anchor for the field; inks = list of [h,s,l] figure-ink
     anchors with weights; accent = [h,s,l] focal. At draw time every value is
     sampled within a small continuous range around its anchor (hue/sat/light
     jitter), so two pieces in the same world still differ in actual colour.
     Some worlds are rare/edge-case on purpose (near-mono dark, the one pale). */
  const PALS = [
    { name: 'Cobalt Field', ground: [223, 0.82, 0.34],
      inks: [[44, 0.18, 0.86], [16, 0.82, 0.51], [44, 0.85, 0.56], [222, 0.78, 0.21]], w: [4, 3, 2, 2],
      accent: [42, 0.30, 0.88] },
    { name: 'Vermilion Heat', ground: [12, 0.82, 0.45],
      inks: [[40, 0.42, 0.88], [222, 0.60, 0.20], [44, 0.85, 0.56], [12, 0.82, 0.26]], w: [4, 3, 2, 2],
      accent: [222, 0.60, 0.20] },
    { name: 'Forest Deep', ground: [156, 0.73, 0.20],
      inks: [[42, 0.32, 0.84], [22, 0.70, 0.56], [46, 0.62, 0.54], [156, 0.66, 0.12]], w: [4, 3, 2, 2],
      accent: [44, 0.30, 0.88] },
    { name: 'Oxblood', ground: [352, 0.60, 0.22],
      inks: [[34, 0.40, 0.84], [16, 0.66, 0.60], [42, 0.62, 0.53], [350, 0.55, 0.12]], w: [4, 3, 2, 2],
      accent: [40, 0.34, 0.86] },
    { name: 'Ink Field', ground: [38, 0.14, 0.07],
      inks: [[42, 0.22, 0.86], [40, 0.08, 0.56], [50, 0.55, 0.55], [40, 0.10, 0.26]], w: [5, 2, 2, 1],
      accent: [44, 0.24, 0.88] },
    { name: 'Bone', ground: [40, 0.34, 0.86],
      inks: [[222, 0.60, 0.20], [354, 0.72, 0.44], [176, 0.72, 0.27], [30, 0.10, 0.09]], w: [4, 3, 2, 2],
      accent: [30, 0.12, 0.08] },
    // a cool teal/steel world — extends the palette space so worlds collide less
    { name: 'Tideline', ground: [196, 0.55, 0.30],
      inks: [[40, 0.30, 0.86], [18, 0.74, 0.55], [44, 0.78, 0.58], [205, 0.62, 0.16]], w: [4, 3, 2, 2],
      accent: [40, 0.32, 0.88] },
    // a warm ochre/clay world
    { name: 'Sienna', ground: [28, 0.62, 0.42],
      inks: [[44, 0.30, 0.88], [205, 0.55, 0.26], [186, 0.55, 0.34], [20, 0.62, 0.20]], w: [4, 3, 2, 2],
      accent: [200, 0.50, 0.24] },
  ];

  const TAU = Math.PI * 2;

  function pickPalWorld(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  // sample a concrete hex from an [h,s,l] anchor with continuous jitter
  function sampleHSL(anchor, r, jh, js, jl) {
    jh = jh == null ? 10 : jh; js = js == null ? 0.07 : js; jl = jl == null ? 0.05 : jl;
    const h = anchor[0] + (r() - 0.5) * 2 * jh;
    const s = K.clamp(anchor[1] + (r() - 0.5) * 2 * js, 0, 1);
    const l = K.clamp(anchor[2] + (r() - 0.5) * 2 * jl, 0, 1);
    return K.hsl2hex(h, s, l);
  }

  // build a concrete, continuously-sampled palette instance from a world
  function instancePalette(world, r) {
    const ground = sampleHSL(world.ground, r, 8, 0.06, 0.04);
    const inks = world.inks.map((a) => sampleHSL(a, r, 11, 0.08, 0.055));
    const accent = sampleHSL(world.accent, r, 10, 0.07, 0.05);
    return { name: world.name, ground, inks, accent, w: world.w };
  }

  // weighted pick of an ink index from a palette
  function pickInk(pal, r, exclude) {
    const idxs = [];
    for (let i = 0; i < pal.inks.length; i++) {
      if (i === exclude) continue;
      const w = (pal.w && pal.w[i]) || 1;
      for (let k = 0; k < w; k++) idxs.push(i);
    }
    return idxs[Math.floor(r() * idxs.length)];
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const world = pickPalWorld(r);

    /* ── CONTINUOUS GLOBAL PARAMETERS (no discrete format/mode buckets) ── */
    // aspect sampled on a continuous range, biased to three zones but never the
    // same three fixed ratios. Long edge fixed ~1280 so render res is stable.
    const aspect = 0.70 + r() * 0.78;            // 0.70 (tall) … 1.48 (wide)
    let W, H;
    if (aspect >= 1) { W = 1280; H = Math.round(1280 / aspect); }
    else { H = 1280; W = Math.round(1280 * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const D = Math.hypot(W, H);

    // palette instance — every colour value sampled continuously inside the world
    const pal = instancePalette(world, r);

    // global zoom: the whole composition scales/crops continuously. Low zoom =
    // small forms with air (minimal), high zoom = forms crop off the frame.
    const zoom = 0.62 + r() * 1.15;              // 0.62 … 1.77
    // density: near-empty minimal ↔ packed (drives counts & extra elements)
    const density = r();                          // 0 (sparse) … 1 (packed)
    // a global composition rotation for asymmetric poise (small, hard-edge keeps tight)
    const tilt = (r() - 0.5) * 0.42;              // ±0.21 rad
    // focal centre drifts continuously across the frame (not locked to middle)
    const fx = W * (0.30 + r() * 0.40);
    const fy = H * (0.30 + r() * 0.40);

    // which structural family seeds the composition — but each family is heavily
    // sub-randomised, and a secondary family is often layered (de-templating).
    const FAMS = ['target', 'chevron', 'split', 'bands', 'corner', 'bars'];
    const family = K.pick(FAMS, r);

    // ── GROUND ──
    x.fillStyle = pal.ground;
    x.fillRect(0, 0, W, H);
    paintPaperGround(x, W, H, pal.ground, noise, r);

    // apply global zoom + tilt about the focal point for the figure layer
    x.save();
    x.translate(fx, fy);
    x.rotate(tilt);
    x.scale(zoom, zoom);
    x.translate(-fx, -fy);

    /* ── screenprinted figure-fill (flat colour + ink mottle + tooth) ── */
    function inkFill(pathFn, col, opts) {
      opts = opts || {};
      x.save();
      pathFn(x);
      x.clip();
      const b = opts.b || [0, 0, W, H];
      x.fillStyle = col;
      x.fillRect(b[0], b[1], b[2], b[3]);
      if (opts.grad !== false) {
        const ga = opts.gradA != null ? opts.gradA : 0.10;
        const ang = opts.gradAng != null ? opts.gradAng : (r() * TAU);
        const cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2, L = Math.max(b[2], b[3]);
        const g = x.createLinearGradient(cx - Math.cos(ang) * L / 2, cy - Math.sin(ang) * L / 2, cx + Math.cos(ang) * L / 2, cy + Math.sin(ang) * L / 2);
        g.addColorStop(0, K.rgba(K.mix(col, '#ffffff', 0.5), ga));
        g.addColorStop(0.5, K.rgba(col, 0));
        g.addColorStop(1, K.rgba(K.mix(col, '#000000', 0.5), ga * 0.9));
        x.fillStyle = g; x.fillRect(b[0], b[1], b[2], b[3]);
      }
      K.mottle(x, b[0], b[1], b[2], b[3], col, opts.mottleDens || 30, r, 'overlay');
      K.mottle(x, b[0], b[1], b[2], b[3], col, (opts.mottleDens || 30) * 2.4, r, 'multiply');
      x.restore();
    }

    function softEdge(pathFn, col, eps) {
      eps = eps || S * 0.0018;
      x.save();
      x.strokeStyle = K.rgba(K.mix(col, '#000', 0.25), 0.20);
      x.lineWidth = eps;
      x.lineJoin = 'round';
      pathFn(x);
      x.stroke();
      x.restore();
    }

    // helper: a flat disc with surface
    function disc(cx, cy, R, col, md) {
      inkFill((c) => { c.beginPath(); c.arc(cx, cy, R, 0, 7); }, col, { b: [cx - R, cy - R, R * 2, R * 2], mottleDens: md || 28 });
      softEdge((c) => { c.beginPath(); c.arc(cx, cy, R, 0, 7); }, col);
    }
    function rectFill(rx, ry, rw, rh, col, md, gradAng) {
      inkFill((c) => { c.beginPath(); c.rect(rx - 1, ry - 1, rw + 2, rh + 2); }, col, { b: [rx, ry, rw, rh], mottleDens: md || 28, gradAng: gradAng });
      softEdge((c) => { c.beginPath(); c.rect(rx, ry, rw, rh); }, col);
    }

    // ─────────────────── PRIMARY STRUCTURAL FAMILY ───────────────────
    // Each family reads off the continuous fx/fy/density/zoom plus its own
    // freshly-sampled sub-parameters, so two same-family seeds diverge a lot.

    if (family === 'target') {
      // Concentric rings — count, partition rhythm, centring, eccentricity vary.
      const ccx = fx + (r() - 0.5) * S * 0.10;
      const ccy = fy + (r() - 0.5) * S * 0.10;
      const Rmax = S * (0.26 + r() * 0.22) * (0.85 + density * 0.4);
      const nRings = 2 + (r() * (3 + (density * 5 | 0)) | 0);   // 2 … up to 9 with density
      const ecc = 1 + r() * 0.45;                                // ring eccentricity (ovals)
      const eang = r() * Math.PI;
      const cuts = [0]; let acc = 0; const ws = [];
      for (let i = 0; i < nRings; i++) { const v = 0.35 + r() * 1.7; ws.push(v); acc += v; }
      for (let i = 0; i < nRings; i++) cuts.push(cuts[cuts.length - 1] + ws[i] / acc);
      let prev = -1, prev2 = -1;
      for (let i = nRings - 1; i >= 0; i--) {
        const ro = Rmax * cuts[i + 1];
        let ii = pickInk(pal, r, prev);
        if (ii === prev2 && nRings > 2) ii = pickInk(pal, r, prev);
        prev2 = prev; prev = ii;
        const col = pal.inks[ii];
        ellipseFill(ccx, ccy, ro, ro / ecc, eang, col, 26);
      }
      if (r() < 0.8) {
        const dotR = Rmax * cuts[1] * (0.4 + r() * 0.4);
        ellipseFill(ccx, ccy, dotR, dotR / ecc, eang, pal.accent, 40);
      }
      function ellipseFill(cx, cy, rx2, ry2, ang, col, md) {
        inkFill((c) => { c.beginPath(); c.ellipse(cx, cy, rx2, ry2, ang, 0, 7); }, col, { b: [cx - rx2, cy - ry2, rx2 * 2, ry2 * 2], mottleDens: md });
        softEdge((c) => { c.beginPath(); c.ellipse(cx, cy, rx2, ry2, ang, 0, 7); }, col);
      }

    } else if (family === 'chevron') {
      // Nested V's — apex position, slope, count, band thickness, direction vary.
      const up = r() < 0.5 ? 1 : -1;
      const apexX = fx + (r() - 0.5) * W * 0.18;
      const apexY = up > 0 ? H * (0.16 + r() * 0.22) : H * (0.62 + r() * 0.22);
      const arm = S * (0.55 + r() * 0.55) * zoom;
      const slope = 0.45 + r() * 0.9;
      const nCh = 3 + (r() * (2 + (density * 6 | 0)) | 0);   // 3 … up to ~11
      const band = (S * (0.34 + r() * 0.30)) / nCh;
      const ghost = r() < 0.4 ? (r() * nCh | 0) : -1;        // one band left as ground
      let prev = -1;
      for (let i = nCh - 1; i >= 0; i--) {
        if (i === ghost) { prev = -1; continue; }
        const off = i * band;
        const ii = pickInk(pal, r, prev); prev = ii;
        const col = pal.inks[ii];
        const ay = apexY - up * off;
        inkFill((c) => { chevronPath(c, apexX, ay, arm, slope, up, band * 1.02); }, col, { b: [0, 0, W, H], mottleDens: 30, gradAng: Math.PI / 2 });
        softEdge((c) => { chevronPath(c, apexX, ay, arm, slope, up, band * 1.02); }, col);
      }

    } else if (family === 'split') {
      // A disc cut by 1-3 chords into flat fields — radius, centring, chord
      // count & angles, asymmetric offset all continuous.
      const dcx = fx + (r() - 0.5) * S * 0.12;
      const dcy = fy + (r() - 0.5) * S * 0.12;
      const R = S * (0.26 + r() * 0.18) * (0.9 + density * 0.35);
      const baseIi = pickInk(pal, r, -1); const baseCol = pal.inks[baseIi];
      disc(dcx, dcy, R, baseCol, 26);
      const nSplit = 1 + (r() * (1 + (density > 0.5 ? 2 : 1)) | 0);  // 1..3
      let prevIi = baseIi, prevAng = r() * Math.PI;
      for (let s = 0; s < nSplit; s++) {
        const ang = s === 0 ? prevAng : prevAng + (0.4 + r() * 1.2);
        prevAng = ang;
        const useAccent = (s === nSplit - 1 && r() < 0.5);
        const col = useAccent ? pal.accent : pal.inks[pickInk(pal, r, prevIi)];
        if (!useAccent) prevIi = pickInk(pal, r, prevIi);
        x.save();
        x.beginPath(); x.arc(dcx, dcy, R, 0, 7); x.clip();
        inkFill((c) => { halfDiscPath(c, dcx, dcy, R, ang); }, col, { b: [dcx - R, dcy - R, R * 2, R * 2], mottleDens: 28 });
        x.restore();
      }
      softEdge((c) => { c.beginPath(); c.arc(dcx, dcy, R, 0, 7); }, baseCol);

    } else if (family === 'bands') {
      // Edge-to-edge bands — orientation, count, unequal widths, a ghost band,
      // optional skew, and rider circles all vary.
      const vert = r() < 0.5;
      const nB = 3 + (r() * (2 + (density * 6 | 0)) | 0);    // 3 … up to ~11
      const ws = []; let acc = 0;
      for (let i = 0; i < nB; i++) { const v = 0.4 + r() * 2.0; ws.push(v); acc += v; }
      const ghostBand = r() < 0.5 ? (r() * nB | 0) : -1;
      let prev = -1, cur = 0;
      const span0 = vert ? W : H;
      // bands drawn oversized so the tilt/zoom never reveals ground at the edges
      const ext = D;
      for (let i = 0; i < nB; i++) {
        const span = span0 * ws[i] / acc;
        if (i !== ghostBand) {
          let ii = pickInk(pal, r, prev); prev = ii;
          const col = pal.inks[ii];
          const rx = vert ? cur : -ext, ry = vert ? -ext : cur;
          const rw = vert ? span : W + ext * 2, rh = vert ? H + ext * 2 : span;
          inkFill((c) => { c.beginPath(); c.rect(rx - 1, ry - 1, rw + 2, rh + 2); }, col, { b: [vert ? cur : 0, vert ? 0 : cur, vert ? span : W, vert ? H : span], mottleDens: 28, gradAng: vert ? 0 : Math.PI / 2 });
        } else { prev = -1; }
        cur += span;
      }
      const nRide = density > 0.55 ? (1 + (r() * 2 | 0)) : (r() < 0.55 ? 1 : 0);
      for (let k = 0; k < nRide; k++) {
        const orr = S * (0.06 + r() * 0.12);
        const ox = W * (0.2 + r() * 0.6), oy = H * (0.2 + r() * 0.6);
        disc(ox, oy, orr, k === 0 ? pal.accent : pal.inks[pickInk(pal, r, -1)], 40);
      }

    } else if (family === 'corner') {
      // Corner panel(s) + nested disc straddling the right-angle. Panel
      // fractions, corner choice, disc size & nesting offset all continuous.
      const cornerX = r() < 0.5 ? 0 : 1;
      const cornerY = r() < 0.5 ? 0 : 1;
      const pw = W * (0.40 + r() * 0.30), ph = H * (0.40 + r() * 0.30);
      const px = cornerX === 0 ? 0 : W - pw;
      const py = cornerY === 0 ? 0 : H - ph;
      const fieldIi = pickInk(pal, r, -1); const fieldCol = pal.inks[fieldIi];
      rectFill(px, py, pw, ph, fieldCol, 26, r() < 0.5 ? 0 : Math.PI / 2);
      const dii = pickInk(pal, r, fieldIi); const dcol = pal.inks[dii];
      const DR = S * (0.18 + r() * 0.18) * (0.9 + density * 0.3);
      const vertexX = cornerX === 0 ? px + pw : px;
      const vertexY = cornerY === 0 ? py + ph : py;
      const inX = cornerX === 0 ? -1 : 1, inY = cornerY === 0 ? -1 : 1;
      const dcx = vertexX + inX * DR * (0.1 + r() * 0.5);
      const dcy = vertexY + inY * DR * (0.1 + r() * 0.5);
      disc(dcx, dcy, DR, dcol, 28);
      // optional concentric inner ring on the disc (more variety)
      if (r() < 0.4) disc(dcx, dcy, DR * (0.4 + r() * 0.3), pal.inks[pickInk(pal, r, dii)], 34);
      // counter-accent square(s), count tied to density
      const nSq = r() < (0.35 + density * 0.4) ? (1 + (density > 0.6 ? (r() * 2 | 0) : 0)) : 0;
      for (let k = 0; k < nSq; k++) {
        const sq = S * (0.06 + r() * 0.08);
        const sx = cornerX === 0 ? W - sq - S * (0.04 + r() * 0.1) : S * (0.04 + r() * 0.1);
        const sy = cornerY === 0 ? H - sq - S * (0.04 + r() * 0.1) : S * (0.04 + r() * 0.1);
        rectFill(sx, sy, sq, sq, k === 0 ? pal.accent : pal.inks[pickInk(pal, r, -1)], 36);
      }

    } else { // bars — weight & counterweight: dominant bar, counter-bar, fulcrum
      const axisX = W * (0.30 + r() * 0.40);
      const axisY = H * (0.30 + r() * 0.40);
      const horizDom = r() < 0.5;
      const ii0 = pickInk(pal, r, -1), col0 = pal.inks[ii0];
      const ii1 = pickInk(pal, r, ii0), col1 = pal.inks[ii1];
      let dBx, dBy, dBw, dBh;
      if (horizDom) {
        dBh = S * (0.06 + r() * 0.10); dBw = W * (0.5 + r() * 0.5);
        dBx = (r() < 0.5) ? -W * 0.08 : W - dBw + W * 0.08;
        dBy = axisY - dBh / 2;
      } else {
        dBw = S * (0.06 + r() * 0.10); dBh = H * (0.5 + r() * 0.5);
        dBy = (r() < 0.5) ? -H * 0.08 : H - dBh + H * 0.08;
        dBx = axisX - dBw / 2;
      }
      rectFill(dBx, dBy, dBw, dBh, col0, 28);
      // counter-bar(s) — count grows with density
      const nCB = 1 + (density > 0.6 ? (r() * 2 | 0) : 0);
      for (let k = 0; k < nCB; k++) {
        let cBx, cBy, cBw, cBh;
        if (horizDom) {
          cBw = S * (0.05 + r() * 0.06); cBh = H * (0.22 + r() * 0.34);
          cBx = axisX - cBw / 2 + (r() - 0.5) * W * 0.3; cBy = axisY - cBh * (0.15 + r() * 0.7);
        } else {
          cBh = S * (0.05 + r() * 0.06); cBw = W * (0.22 + r() * 0.34);
          cBy = axisY - cBh / 2 + (r() - 0.5) * H * 0.3; cBx = axisX - cBw * (0.15 + r() * 0.7);
        }
        rectFill(cBx, cBy, cBw, cBh, pal.inks[pickInk(pal, r, ii0)], 28);
      }
      const crr = S * (0.06 + r() * 0.08);
      const cx2 = axisX + (r() - 0.5) * S * 0.22, cy2 = axisY + (r() - 0.5) * S * 0.22;
      disc(cx2, cy2, crr, pal.accent, 40);
      if (r() < (0.4 + density * 0.4)) {
        const ii2 = pickInk(pal, r, ii0);
        const sq = S * (0.05 + r() * 0.07);
        const sx = (2 * axisX - cx2) + (r() - 0.5) * S * 0.14 - sq / 2;
        const sy = (2 * axisY - cy2) + (r() - 0.5) * S * 0.14 - sq / 2;
        rectFill(sx, sy, sq, sq, pal.inks[ii2], 32);
      }
    }

    // ── SECONDARY STRUCTURAL ACCENT (de-templating): with probability tied to
    // density, drop one extra crisp form from a DIFFERENT vocabulary, placed
    // off-axis. Breaks the "one mode = one gestalt" lock so same-family pieces
    // read distinctly. Kept small/quiet so the primary still governs the poise.
    if (r() < (0.25 + density * 0.45)) {
      const kind = r();
      const ax = W * (0.12 + r() * 0.76), ay = H * (0.12 + r() * 0.76);
      const col = r() < 0.4 ? pal.accent : pal.inks[pickInk(pal, r, -1)];
      if (kind < 0.4) {
        const rr = S * (0.04 + r() * 0.07);
        disc(ax, ay, rr, col, 38);
      } else if (kind < 0.72) {
        const bw = S * (0.4 + r() * 0.5), bh = S * (0.025 + r() * 0.05);
        x.save(); x.translate(ax, ay); x.rotate((r() - 0.5) * Math.PI); x.translate(-ax, -ay);
        rectFill(ax - bw / 2, ay - bh / 2, bw, bh, col, 30);
        x.restore();
      } else {
        const sq = S * (0.05 + r() * 0.08);
        rectFill(ax - sq / 2, ay - sq / 2, sq, sq, col, 34);
      }
    }

    x.restore(); // end zoom/tilt transform

    // ── ATMOSPHERE & SURFACE GRADE (kills clip-art flatness) ──
    const hazeCol = K.mix(pal.ground, pal.inks[0], 0.25);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.05 + r() * 0.04, S * (0.9 + r() * 0.5), 'soft-light');
    paperTooth(x, W, H, noise, r);
    K.grain(x, W, H, 6, r);
    K.vignette(x, W, H, (world.name === 'Ink Field' ? 0.30 : 0.20) + r() * 0.06);

    return { aspect: W / H };

    // ── local geometry helpers ──
    function chevronPath(c, ax, ay, arm, slope, up, thick) {
      const dx = arm;
      const lx = ax - dx, rx = ax + dx;
      const ly = ay + arm * slope * up * 1, ry = ay + arm * slope * up * 1;
      const t = thick;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(ax, ay);
      c.lineTo(rx, ry);
      c.lineTo(rx, ry + t * 1.0);
      c.lineTo(ax, ay + t * 1.0);
      c.lineTo(lx, ly + t * 1.0);
      c.closePath();
    }
    function halfDiscPath(c, dcx, dcy, R, ang) {
      c.beginPath();
      c.moveTo(dcx + Math.cos(ang) * R, dcy + Math.sin(ang) * R);
      c.arc(dcx, dcy, R, ang, ang + Math.PI);
      c.closePath();
    }
  }

  // large-scale ground tone drift — gives the paper air without breaking flatness
  function paintPaperGround(x, W, H, ground, noise, r) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const step = Math.max(6, Math.floor(Math.min(W, H) / 90));
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = (noise.fbm(xx / (W * 0.7), yy / (H * 0.7), 3, 0.6, 2) + 1) / 2;
        const a = 0.02 + n * 0.05;
        x.fillStyle = K.rgba(K.mix(ground, '#000', 0.4), a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  // subtle canvas/paper tooth across the frame (fine fibrous texture)
  function paperTooth(x, W, H, noise, r) {
    x.save();
    x.globalCompositeOperation = 'overlay';
    const step = Math.max(2, Math.floor(Math.min(W, H) / 260));
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.noise2(xx / 3.5, yy / 3.5);
        const v = n > 0 ? 255 : 0;
        const a = Math.abs(n) * 0.05;
        x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')';
        x.fillRect(xx, yy, step, step);
      }
    }
    x.restore();
  }

  /* traits() MUST mirror draw()'s rng draw order exactly up to the values it
     reports, so the reported family/format/world match the rendered piece. */
  function traits(seed) {
    const r = K.rng(seed);
    K.makeNoise(seed * 7 + 1); // (no r() draws inside makeNoise from THIS r)
    const world = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const aspect = 0.70 + r() * 0.78;
    const fmt = aspect > 1.12 ? 'Landscape' : aspect < 0.9 ? 'Portrait' : 'Square';
    const zoom = 0.62 + r() * 1.15;
    const density = r();
    /* tilt */ r();
    /* fx */ r(); /* fy */ r();
    const FAMS = ['Target', 'Chevron', 'Split Disc', 'Banded Field', 'Corner', 'Floating Bars'];
    const family = K.pick(FAMS, r);
    const dens = density < 0.33 ? 'Sparse' : density < 0.66 ? 'Balanced' : 'Packed';
    const scale = zoom < 0.9 ? 'Wide' : zoom > 1.35 ? 'Close' : 'Mid';
    return { Palette: world.name, Mode: family, Format: fmt, Density: dens, Scale: scale };
  }

  return { name: 'b_aperture', draw, traits };
})();
