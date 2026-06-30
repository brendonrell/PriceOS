/* EFFLORESCENCE — crystalline salt bloom creeping across damp dark stone.
 * White mineral crust spreading from seams and pores: dendritic salt fans,
 * powdery drifts, feathery crystal growth staining an aged dark wall.
 * Pure abstract FIELD — no horizon, no scene. SURREAL = real-but-off: salt
 * blooming into deliberate, almost-written patterns as if it were growing
 * with intent. Damp stone palette world: umber, slate, charcoal-damp grounds
 * with cream/white salt bloom and a faint mineral blue-green.
 *
 * VARIATION CONTRACT: this is a continuous SYSTEM, not a template picker.
 * Every salient parameter (scale/zoom, density, focal, format aspect, counts,
 * curvature, asymmetry, AND colour values) is sampled continuously from the
 * seed. Palette is a damp-stone WORLD, not a fixed swatch: every ground/salt/
 * mineral colour is jittered in hue/sat/value per seed, so even two seeds in
 * the same world read as distinct pieces. Structural families blend rather than
 * snap to discrete buckets — no two seeds land the same composition.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Six anchor palettes — all DAMP STONE world. These are world SEEDS, not the
     final colours: draw() jitters every channel per piece so the swatch is a
     starting point, never a fixed bucket. `bloom`/`crust`/`pore` are salt
     tones; `stain` is wet mineral discoloration. */
  const PALS = [
    { name: 'Umber Damp',    g0:'#241c16', g1:'#171009', g2:'#3a2c20', bloom:'#efe7d6', crust:'#fbf6ea', pore:'#cdbfa6', stain:'#5a4a36', mineral:'#6f8478', wet:'#0d0905' },
    { name: 'Slate Sweat',   g0:'#1d2228', g1:'#10151a', g2:'#2e373f', bloom:'#e8ecec', crust:'#f7faf8', pore:'#b8c2c0', stain:'#3c4a4e', mineral:'#7fa39a', wet:'#080b0e' },
    { name: 'Charcoal Bloom',g0:'#1a1816', g1:'#0a0908', g2:'#2b2724', bloom:'#ece6da', crust:'#fdfbf3', pore:'#c2b8a6', stain:'#403830', mineral:'#5f7368', wet:'#050403' },
    { name: 'Verdant Crust', g0:'#1c241f', g1:'#0e1410', g2:'#2c3a30', bloom:'#e6e9de', crust:'#f6f8ee', pore:'#aebaa6', stain:'#3a4a3a', mineral:'#86a892', wet:'#070b08' },
    { name: 'Ferrous Wet',   g0:'#26190f', g1:'#150c06', g2:'#3c281a', bloom:'#ede2cf', crust:'#fbf2df', pore:'#cbb392', stain:'#6a4226', mineral:'#7d8b6c', wet:'#0c0703' },
    { name: 'Cellar Blue',   g0:'#161b22', g1:'#0a0e14', g2:'#252f3b', bloom:'#dfe6ea', crust:'#f2f7f8', pore:'#aab8c2', stain:'#33414e', mineral:'#6f96a4', wet:'#06090d' },
  ];

  // Structural FAMILIES (no longer hard buckets — draw() blends a secondary in
  // and varies the envelope continuously). Kept for trait naming + as biases.
  const MODES = ['Seam Creep', 'Crown Bloom', 'Dendrite Field', 'Powder Drift', 'Glyph Trails', 'Fan Cluster'];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  // ── colour jitter: nudge a hex in HSL space so the WORLD holds but the
  //    exact value is continuous per seed. dh in degrees, ds/dl as deltas. ──
  function jitter(hex, dh, ds, dl) {
    const c = K.h2r(hex);
    const max = Math.max(c[0], c[1], c[2]) / 255, min = Math.min(c[0], c[1], c[2]) / 255;
    let h = 0, s = 0, l = (max + min) / 2;
    const d = max - min;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      const R = c[0] / 255, G = c[1] / 255, B = c[2] / 255;
      if (max === R) h = ((G - B) / d + (G < B ? 6 : 0));
      else if (max === G) h = (B - R) / d + 2;
      else h = (R - G) / d + 4;
      h *= 60;
    }
    return K.hsl2hex(h + dh, K.clamp(s + ds, 0, 1), K.clamp(l + dl, 0, 1));
  }

  // Build a per-seed working palette: jitter every channel within world bounds.
  function derivePal(base, r) {
    const hShift = (r() - 0.5) * 26;      // shared hue drift keeps the set coherent
    const warm = (r() - 0.5) * 0.10;      // global warm/cool lean
    const j = (h, dh, ds, dl) => jitter(h, hShift + dh, ds + warm * 0.3, dl);
    return {
      name: base.name,
      g0:  j(base.g0,  (r() - 0.5) * 14, (r() - 0.5) * 0.08, (r() - 0.5) * 0.05),
      g1:  j(base.g1,  (r() - 0.5) * 14, (r() - 0.5) * 0.08, (r() - 0.5) * 0.035),
      g2:  j(base.g2,  (r() - 0.5) * 18, (r() - 0.5) * 0.10, (r() - 0.5) * 0.06),
      bloom:   j(base.bloom,   (r() - 0.5) * 10, (r() - 0.5) * 0.05, (r() - 0.5) * 0.04),
      crust:   j(base.crust,   (r() - 0.5) * 8,  (r() - 0.5) * 0.04, (r() - 0.5) * 0.03),
      pore:    j(base.pore,    (r() - 0.5) * 14, (r() - 0.5) * 0.08, (r() - 0.5) * 0.05),
      stain:   j(base.stain,   (r() - 0.5) * 24, (r() - 0.5) * 0.12, (r() - 0.5) * 0.06),
      mineral: j(base.mineral, (r() - 0.5) * 30, (r() - 0.5) * 0.14, (r() - 0.5) * 0.07),
      wet:     j(base.wet,     (r() - 0.5) * 12, (r() - 0.5) * 0.06, (r() - 0.5) * 0.025),
    };
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const basePal = pickPal(r);
    const pal = derivePal(basePal, r);

    // ── primary family (biased pick) + a secondary that BLENDS in, so two seeds
    //    on the same primary still diverge via different secondaries/weights ──
    const mode = K.pick(MODES, r);
    let secondary = K.pick(MODES, r);
    if (secondary === mode) secondary = MODES[(MODES.indexOf(mode) + 1 + (r() * (MODES.length - 1) | 0)) % MODES.length];
    const secW = r() * r();               // how much the secondary contributes (skewed low)

    // ── CONTINUOUS FORMAT: aspect sampled from a continuous range, not 3 buckets.
    const aspect = 0.62 + r() * 0.96;     // ~0.62 (tall portrait) .. ~1.58 (wide landscape)
    const longEdge = 1140 + (r() * 220 | 0);
    let W, H;
    if (aspect >= 1) { W = longEdge; H = Math.round(longEdge / aspect); }
    else { H = longEdge; W = Math.round(longEdge * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const DIAG = Math.hypot(W, H);

    // ── GLOBAL ENVELOPE: scale/zoom, density, focal, asymmetry — all continuous.
    const zoom = 0.55 + Math.pow(r(), 1.4) * 1.7;   // 0.55 (wide, small forms) .. 2.25 (cropped-in, big)
    const density = Math.pow(r(), 1.15);            // 0 near-empty minimal .. 1 packed
    const focalX = 0.20 + r() * 0.60;               // focal centre, continuous across frame
    const focalY = 0.20 + r() * 0.60;
    const spreadBias = 0.10 + r() * 0.34;           // base curl/curvature wildness
    const rot = (r() - 0.5) * 0.9;                  // global compositional tilt of the bloom field
    const SU = S * zoom;                            // scale unit: every size is keyed to this, not raw S

    // helper: scale a "fraction of frame" into the zoom-aware unit
    const sz = (f) => SU * f;
    // density-scaled count (keeps minimal pieces sparse, packed pieces dense)
    const dc = (lo, hi) => Math.max(lo, Math.round(lo + (hi - lo) * (0.25 + density * 0.95)));

    // ───────────────────────────────────────────────────────── DAMP STONE GROUND
    const lightDir = r() < 0.5 ? -1 : 1;
    const bg = x.createLinearGradient(W * (r() * 0.3), 0, W * (0.4 * lightDir + r() * 0.2), H);
    bg.addColorStop(0, pal.g0);
    bg.addColorStop(0.4 + r() * 0.3, pal.g1);
    bg.addColorStop(1, pal.wet);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // Large-scale damp blotching — fbm value noise modulating between g1/g2.
    (function dampField() {
      const sc = S * (0.4 + r() * 0.6);
      const ox = r() * 1000, oy = r() * 1000;
      const cell = Math.max(7, Math.floor(S / (110 + r() * 90)));
      const warp = 0.4 + r() * 1.6;
      const gamma = 1.1 + r() * 1.1;
      x.save();
      for (let yy = -cell; yy < H + cell; yy += cell) {
        for (let xx = -cell; xx < W + cell; xx += cell) {
          const jx = xx + (r() - 0.5) * cell, jy = yy + (r() - 0.5) * cell;
          let n = (noise.fbm(jx / sc + ox, jy / sc + oy, 5, 0.55, 2.1) + 1) / 2;
          n = Math.pow(n, gamma);
          const damp = K.mix(pal.g1, pal.g2, K.clamp(n * warp, 0, 1));
          x.fillStyle = K.rgba(damp, 0.24 + r() * 0.16);
          const rad = cell * (0.7 + r() * 0.9);
          x.beginPath(); x.arc(jx, jy, rad, 0, 7); x.fill();
        }
      }
      x.restore();
    })();

    // Wet mineral stains — continuous count/size/placement, bleeding with gravity.
    const nStains = dc(1, 6);
    for (let i = 0; i < nStains; i++) {
      const sx = r() * W, sy = r() * H * 0.92;
      const rad = S * (0.12 + r() * 0.42);
      x.save();
      x.globalCompositeOperation = 'multiply';
      const sag = rad * (0.2 + r() * 0.5);
      const sg = x.createRadialGradient(sx, sy, 0, sx, sy + sag, rad);
      const stc = r() < 0.4 ? pal.mineral : pal.stain;
      sg.addColorStop(0, K.rgba(stc, 0.0));
      sg.addColorStop(0.45 + r() * 0.2, K.rgba(stc, 0.12 + r() * 0.16));
      sg.addColorStop(1, K.rgba(stc, 0.0));
      x.fillStyle = sg; x.fillRect(0, 0, W, H);
      x.restore();
    }

    // Hairline seams / mortar lines — origin sites for the bloom.
    const seams = [];
    (function buildSeams() {
      const orient = r();
      const n = 1 + (r() * 4 | 0);
      const wobAmt = 0.02 + r() * 0.08;
      for (let i = 0; i < n; i++) {
        const horiz = orient < 0.5 ? r() < 0.7 : r() < 0.3;
        const pts = [];
        const segs = 6 + (r() * 8 | 0);
        let px, py, dx, dy;
        if (horiz) { px = -10; py = H * (0.1 + r() * 0.8); dx = (W + 20) / segs; dy = 0; }
        else { px = W * (0.1 + r() * 0.8); py = -10; dx = 0; dy = (H + 20) / segs; }
        const wsc = S * (0.2 + r() * 0.25);
        for (let s = 0; s <= segs; s++) {
          const wob = (noise.fbm(px / wsc, py / wsc + i * 9, 3)) * S * wobAmt;
          pts.push([px + (horiz ? 0 : wob), py + (horiz ? wob : 0)]);
          px += dx; py += dy;
        }
        seams.push({ pts, horiz });
        x.save();
        x.lineJoin = 'round'; x.lineCap = 'round';
        x.strokeStyle = K.rgba(pal.wet, 0.4 + r() * 0.3); x.lineWidth = 0.9 + r() * 1.8;
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s < pts.length; s++) x.lineTo(pts[s][0], pts[s][1]);
        x.stroke();
        x.restore();
      }
    })();

    // ───────────────────────────────────────────────────────── SALT PRIMITIVES
    // Per-piece salt colour is itself jittered each call so deposits aren't a
    // single flat white — micro hue/value variation across the bloom.
    function saltCol(base) {
      return jitter(base, (r() - 0.5) * 7, (r() - 0.5) * 0.05, (r() - 0.5) * 0.05);
    }

    function powder(cx, cy, rad, dens, baseA, col) {
      const n = (rad * rad / dens) | 0;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.pow(r(), 0.6) * rad;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        const fall = 1 - rr / rad;
        const al = baseA * fall * fall * (0.4 + r() * 0.7);
        if (al < 0.012) continue;
        const c = r() < 0.18 ? pal.pore : col;
        x.fillStyle = K.rgba(c, al);
        const s = 0.7 + r() * (1.4 + fall * 1.2);
        x.fillRect(px, py, s, s);
      }
    }

    function dendrite(cx, cy, ang, len, wdt, depth, col, spread) {
      if (depth <= 0 || len < S * 0.005) return;
      const segs = 6 + (depth * 2);
      let px = cx, py = cy, a = ang;
      const step = len / segs;
      const lc = saltCol(col);
      x.save();
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = K.rgba(lc, K.clamp(0.42 + depth * 0.08, 0, 0.9));
      x.lineWidth = Math.max(0.4, wdt);
      x.beginPath(); x.moveTo(px, py);
      const branchAt = [];
      const barbProb = 0.7 + r() * 0.25;
      for (let s = 0; s < segs; s++) {
        const c = K.curl(noise, px * 1.3, py * 1.3, 1.2);
        a += (c[0]) * 0.4 + (r() - 0.5) * spread;
        px += Math.cos(a) * step;
        py += Math.sin(a) * step;
        x.lineTo(px, py);
        branchAt.push([px, py, a, s / segs]);
        if (depth >= 2 && r() < barbProb) {
          const side = r() < 0.5 ? 1 : -1;
          const bl = step * (0.5 + r() * 1.1);
          const ba = a + side * (Math.PI * 0.42 + (r() - 0.5) * 0.3);
          x.moveTo(px, py); x.lineTo(px + Math.cos(ba) * bl, py + Math.sin(ba) * bl);
        }
      }
      x.stroke();
      x.restore();
      if (depth >= 2) powder(cx + (px - cx) * 0.5, cy + (py - cy) * 0.5, len * 0.4, 26, 0.22, lc);
      const subProb = 0.4 + r() * 0.3;
      for (const b of branchAt) {
        if (b[3] < 0.18) continue;
        if (r() > subProb) continue;
        const side = r() < 0.5 ? 1 : -1;
        const bAng = b[2] + side * (0.55 + r() * 0.55);
        const bLen = len * (0.3 + r() * 0.28) * (1 - b[3] * 0.45);
        dendrite(b[0], b[1], bAng, bLen, wdt * 0.6, depth - 1, col, spread * 1.18);
        if (r() < 0.4) {
          const bAng2 = b[2] - side * (0.55 + r() * 0.55);
          dendrite(b[0], b[1], bAng2, bLen * 0.78, wdt * 0.5, depth - 1, col, spread * 1.22);
        }
      }
      if (depth <= 2 && r() < 0.75) powder(px, py, len * 0.45, 13, 0.45, lc);
    }

    function fan(cx, cy, ang, spreadA, count, len, col) {
      x.save();
      x.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        let a = ang - spreadA / 2 + spreadA * t + (r() - 0.5) * 0.12;
        const L = len * (0.4 + r() * 0.5) * (0.6 + 0.6 * Math.sin(Math.PI * t));
        let px = cx, py = cy;
        x.strokeStyle = K.rgba(saltCol(col), 0.28 + r() * 0.36);
        x.lineWidth = 0.5 + r() * 0.8;
        x.beginPath(); x.moveTo(px, py);
        const segs = 9;
        for (let s = 0; s < segs; s++) {
          const cc = K.curl(noise, px * 1.4, py * 1.4, 1.3);
          a += cc[0] * 0.5 + (r() - 0.5) * 0.22;
          px += Math.cos(a) * (L / segs);
          py += Math.sin(a) * (L / segs);
          x.lineTo(px, py);
          if (r() < 0.4) {
            const bl = (L / segs) * (0.5 + r());
            const ba = a + (r() < 0.5 ? 1 : -1) * (Math.PI * 0.4);
            x.moveTo(px, py); x.lineTo(px + Math.cos(ba) * bl, py + Math.sin(ba) * bl);
            x.moveTo(px, py);
          }
        }
        x.stroke();
        if (r() < 0.3) powder(px, py, L * 0.14, 11, 0.4, col);
      }
      x.restore();
      powder(cx, cy, len * 0.24, 8, 0.55, col);
    }

    function crustPatch(cx, cy, rad, col) {
      K.softShadow(x, cx + rad * 0.12, cy + rad * 0.16, rad * 1.4, 0.16);
      K.bloom(x, cx, cy, rad * 1.2, col, 0.03 + r() * 0.025);
      x.save();
      const bg2 = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.9);
      bg2.addColorStop(0, K.rgba(pal.crust, 0.32));
      bg2.addColorStop(0.55, K.rgba(col, 0.2));
      bg2.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = bg2; x.beginPath(); x.arc(cx, cy, rad * 0.9, 0, 7); x.fill();
      x.restore();
      powder(cx, cy, rad * 1.2, 3.4, 0.7, col);
      powder(cx, cy, rad * 0.5, 2.8, 0.85, pal.crust);
      const ed = 6 + (r() * 6 | 0);
      for (let i = 0; i < ed; i++) {
        const a = r() * Math.PI * 2;
        const er = rad * (0.7 + r() * 0.6);
        powder(cx + Math.cos(a) * er, cy + Math.sin(a) * er, rad * (0.22 + r() * 0.28), 6, 0.55, col);
      }
    }

    function seamPoint(seam, t) {
      const pts = seam.pts;
      const f = t * (pts.length - 1);
      const i = Math.min(pts.length - 2, f | 0);
      const u = f - i;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
    }
    function seamNormal(seam) { return seam.horiz ? (r() < 0.5 ? -Math.PI / 2 : Math.PI / 2) : (r() < 0.5 ? 0 : Math.PI); }

    const blo = pal.bloom;
    const FX = W * focalX, FY = H * focalY; // focal anchor in pixels

    // ───────────────────────────────────────────────── COMPOSE (blended families)
    // Each family is a function of the global envelope (zoom/density/focal/rot),
    // so the SAME family produces wildly different pieces. We render the primary
    // at full weight and optionally overlay the secondary at reduced weight.
    function compose(which, weight) {
      const dcm = (lo, hi) => Math.max(lo, Math.round((lo + (hi - lo) * (0.25 + density * 0.95)) * weight));

      if (which === 'Seam Creep') {
        const target = seams.length ? K.shuffle(seams, r) : [];
        const useN = Math.max(1, Math.min(target.length, 1 + (r() * Math.max(1, seams.length) | 0)));
        for (let s = 0; s < useN; s++) {
          const seam = target[s];
          const blooms = dcm(3, 12);
          for (let i = 0; i < blooms; i++) {
            const t = (i + 0.5) / blooms + (r() - 0.5) * 0.06;
            const [bx, by] = seamPoint(seam, K.clamp(t, 0.02, 0.98));
            const nrm = seamNormal(seam) + rot;
            const big = i % (2 + (r() * 3 | 0)) === 0 ? 1.4 + r() * 0.6 : 1;
            crustPatch(bx, by, sz(0.014 + r() * 0.03) * big, blo);
            const dn = dcm(1, 4);
            for (let d = 0; d < dn; d++)
              dendrite(bx, by, nrm + (r() - 0.5) * 1.2, sz(0.08 + r() * 0.14), 1.5, 3, blo, spreadBias);
          }
        }
      } else if (which === 'Crown Bloom') {
        const cx = FX, cy = FY;
        crustPatch(cx, cy, sz(0.05 + r() * 0.07), blo);
        const arms = dcm(7, 20);
        const armBias = r() * Math.PI * 2;        // asymmetric arm distribution
        const eccent = 0.5 + r() * 1.4;           // elliptical vs round crown
        for (let i = 0; i < arms; i++) {
          const a = (i / arms) * Math.PI * 2 + r() * 0.4 + rot;
          const ell = (Math.abs(Math.cos(a - armBias)) * eccent + (2 - eccent)) / 2;
          const L = sz(0.14 + r() * 0.26) * (0.55 + 0.65 * (noise.fbm(Math.cos(a) * 2, Math.sin(a) * 2, 3) + 1) / 2) * ell;
          dendrite(cx, cy, a, L, 1.9, 3, blo, spreadBias * 0.9);
        }
        const sat = dcm(2, 8);
        const driftA = r() * Math.PI * 2;
        const driftSpread = 0.5 + r() * 1.4;
        for (let i = 0; i < sat; i++) {
          const dd = sz(0.14 + r() * 0.34);
          const aa = driftA + (r() - 0.5) * driftSpread;
          crustPatch(cx + Math.cos(aa) * dd, cy + Math.sin(aa) * dd, sz(0.012 + r() * 0.034), blo);
        }
      } else if (which === 'Dendrite Field') {
        const flow = r() * Math.PI * 2 + rot;
        const coherence = 0.4 + r() * 1.4;        // how aligned the field is (low=chaotic)
        const n = dcm(4, 16);
        const bandPhase = r() * 6.28;
        for (let i = 0; i < n; i++) {
          // seeds cluster around focal with a continuous falloff → varied crops
          const spreadR = 0.18 + r() * 0.5;
          const ba = r() * Math.PI * 2, br = Math.pow(r(), 0.7) * S * spreadR;
          const bx = K.clamp(FX + Math.cos(ba) * br, W * 0.04, W * 0.96);
          const by = K.clamp(FY + Math.sin(ba) * br, H * 0.04, H * 0.96);
          if (r() < 0.6) powder(bx, by, sz(0.02), 12, 0.4, pal.pore);
          const arms = 2 + (r() * 3 | 0);
          for (let a = 0; a < arms; a++) {
            const ang = flow + (r() - 0.5) * (2.6 / coherence) + Math.sin(bandPhase + br * 0.01) * 0.4;
            dendrite(bx, by, ang, sz(0.1 + r() * 0.2), 1.7, 3 + (r() < 0.4 ? 1 : 0), blo, spreadBias);
          }
        }
        const fx = K.clamp(FX + (r() - 0.5) * S * 0.2, W * 0.2, W * 0.8);
        const fy = K.clamp(FY + (r() - 0.5) * S * 0.2, H * 0.2, H * 0.8);
        crustPatch(fx, fy, sz(0.035 + r() * 0.035), blo);
        const fArms = 4 + (r() * 5 | 0);
        for (let a = 0; a < fArms; a++) dendrite(fx, fy, flow + (a / fArms) * 1.8 - 0.9, sz(0.13 + r() * 0.13), 2, 4, blo, spreadBias * 0.85);
      } else if (which === 'Powder Drift') {
        const baseY = H * (0.42 + r() * 0.24);
        const bands = dcm(3, 7);
        const tilt = (r() - 0.5) * 0.5;
        for (let b = 0; b < bands; b++) {
          const by = baseY + b * H * (0.07 + r() * 0.06) + r() * H * 0.04;
          const lobes = dcm(7, 20);
          for (let i = 0; i < lobes; i++) {
            const bx = W * r();
            const rad = sz(0.04 + r() * 0.07) * (0.7 + b * 0.16);
            const yj = by + (r() - 0.5) * S * 0.09 + (bx / W - 0.5) * tilt * H * 0.2;
            powder(bx, yj, rad, 6, 0.5 + b * 0.07, blo);
          }
          const nuclei = dcm(1, 4);
          for (let i = 0; i < nuclei; i++)
            crustPatch(W * (0.12 + r() * 0.76), by + (r() - 0.5) * S * 0.05, sz(0.02 + r() * 0.028), blo);
        }
        x.save(); x.lineCap = 'round';
        const ly = baseY + H * 0.16;
        x.strokeStyle = K.rgba(blo, 0.08 + r() * 0.06); x.lineWidth = sz(0.03 + r() * 0.02);
        x.beginPath();
        const lsc = S * (0.25 + r() * 0.25), lph = r() * 5;
        for (let xx = 0; xx <= W; xx += W / 36) {
          const yy = ly + noise.fbm(xx / lsc + lph, 3.3, 3) * S * 0.1 + (xx / W - 0.5) * tilt * H * 0.3;
          xx === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
        }
        x.stroke(); x.restore();
        const wisps = dcm(4, 14);
        for (let i = 0; i < wisps; i++) {
          const bx = W * (0.08 + r() * 0.84), by = baseY + r() * H * 0.3;
          dendrite(bx, by, -Math.PI / 2 + (r() - 0.5) * 1.0 + rot, sz(0.09 + r() * 0.14), 1.3, 3, blo, spreadBias * 1.1);
        }
        crustPatch(W * (0.2 + r() * 0.3), H * (0.8 + r() * 0.12), sz(0.05 + r() * 0.05), blo);
        if (r() < 0.7) crustPatch(W * (0.5 + r() * 0.3), H * (0.84 + r() * 0.1), sz(0.04 + r() * 0.05), blo);
      } else if (which === 'Glyph Trails') {
        const writeDir = r() < 0.5 ? 1 : -1;
        const lines = 1 + (r() < 0.5 ? 1 : 0) + (density > 0.7 && r() < 0.4 ? 1 : 0);
        const startX = writeDir > 0 ? W * (0.06 + r() * 0.1) : W * (0.84 + r() * 0.1);
        const glyphs = [];
        const baseLineY = focalY;
        for (let ln = 0; ln < lines; ln++) {
          const lineY = H * K.clamp(baseLineY + (ln - (lines - 1) / 2) * (0.22 + r() * 0.14) + (r() - 0.5) * 0.06, 0.14, 0.86);
          let cursor = startX;
          const nG = dcm(2, 6);
          const adv = 0.13 + r() * 0.16;
          for (let gI = 0; gI < nG; gI++) {
            if (cursor < W * 0.06 || cursor > W * 0.94) break;
            glyphs.push({ x: cursor, y: lineY + (r() - 0.5) * H * 0.06 });
            cursor += writeDir * W * (adv + r() * 0.06);
          }
        }
        for (let gI = 0; gI < glyphs.length; gI++) {
          let px = glyphs[gI].x, py = glyphs[gI].y;
          let a = (writeDir > 0 ? 0 : Math.PI) + (r() - 0.5) * 1.6;
          const len = sz(0.14 + r() * 0.24);
          const segs = 12 + (r() * 14 | 0);
          const step = len / segs;
          const pathPts = [];
          let phase = r() * 6.28, freq = 0.32 + r() * 0.6, amp = 0.6 + r() * 1.1;
          for (let s = 0; s < segs; s++) {
            phase += freq;
            a = (writeDir > 0 ? 0 : Math.PI) + Math.sin(phase) * amp
                + (noise.fbm(px / (S * 0.35), py / (S * 0.35), 3)) * 1.0 + rot * 0.4;
            px += Math.cos(a) * step;
            py += Math.sin(a) * step;
            if (px < W * 0.04 || px > W * 0.96 || py < H * 0.06 || py > H * 0.94) break;
            pathPts.push([px, py, a]);
          }
          if (pathPts.length < 2) continue;
          x.save();
          x.lineJoin = 'round'; x.lineCap = 'round';
          x.strokeStyle = K.rgba(pal.wet, 0.5); x.lineWidth = sz(0.011);
          x.beginPath(); x.moveTo(pathPts[0][0], pathPts[0][1] + 2);
          for (const p of pathPts) x.lineTo(p[0], p[1] + 2);
          x.stroke();
          x.strokeStyle = K.rgba(blo, 0.5); x.lineWidth = sz(0.0065);
          x.beginPath(); x.moveTo(pathPts[0][0], pathPts[0][1]);
          for (const p of pathPts) x.lineTo(p[0], p[1]);
          x.stroke();
          x.restore();
          for (let i = 0; i < pathPts.length; i++) {
            const p = pathPts[i];
            powder(p[0], p[1], sz(0.012 + (i % 5 === 0 ? 0.018 : 0)), 7, 0.6, blo);
            if (i % 6 === 0 && r() < 0.7)
              dendrite(p[0], p[1], p[2] + (r() < 0.5 ? 1 : -1) * (Math.PI / 2), sz(0.04 + r() * 0.06), 1.1, 2, blo, spreadBias * 1.2);
          }
          crustPatch(pathPts[0][0], pathPts[0][1], sz(0.022 + r() * 0.02), blo);
        }
      } else { // Fan Cluster
        const fromSeam = seams.length && r() < 0.6;
        let baseX, baseY, frontA, growA;
        if (fromSeam) {
          const seam = K.pick(seams, r);
          const [sx, sy] = seamPoint(seam, 0.15 + r() * 0.6);
          baseX = sx; baseY = sy;
          growA = seamNormal(seam) + rot;
          frontA = growA + Math.PI / 2;
        } else {
          baseX = FX; baseY = FY;
          growA = r() * Math.PI * 2;
          frontA = growA + Math.PI / 2;
        }
        const nFans = dcm(6, 18);
        const frontLen = sz(0.3 + r() * 0.4);
        const curveFront = (r() - 0.5) * 1.2;     // front bows rather than straight
        for (let i = 0; i < nFans; i++) {
          const t = nFans > 1 ? i / (nFans - 1) : 0.5;
          const along = (t - 0.5) * frontLen + (r() - 0.5) * S * 0.06;
          const off = (r() - 0.5) * S * 0.12 + Math.sin(t * 6.28) * S * 0.03 + (t - 0.5) * (t - 0.5) * curveFront * S * 0.3;
          const fx = baseX + Math.cos(frontA) * along + Math.cos(growA) * off;
          const fy = baseY + Math.sin(frontA) * along + Math.sin(growA) * off;
          const fa = growA + (r() - 0.5) * 0.7;
          fan(fx, fy, fa, 0.5 + r() * 0.7, 8 + (r() * 14 | 0), sz(0.07 + r() * 0.13), blo);
          const fn = 1 + (r() * 2 | 0);
          for (let d = 0; d < fn; d++)
            dendrite(fx, fy, fa + (r() - 0.5) * 0.8, sz(0.06 + r() * 0.11), 1.3, 3, blo, spreadBias);
          if (r() < 0.4) crustPatch(fx, fy, sz(0.016 + r() * 0.024), blo);
        }
        crustPatch(baseX - Math.cos(frontA) * frontLen * 0.2, baseY - Math.sin(frontA) * frontLen * 0.2, sz(0.03 + r() * 0.03), blo);
        crustPatch(baseX + Math.cos(frontA) * frontLen * 0.22, baseY + Math.sin(frontA) * frontLen * 0.22, sz(0.025 + r() * 0.025), blo);
      }
    }

    compose(mode, 1);
    // overlay the secondary family at reduced weight so same-primary seeds diverge
    if (secW > 0.12) compose(secondary, 0.35 + secW * 0.5);

    // ───────────────────────────────────────────────────────── SURFACE / GRADE
    K.mottle(x, 0, 0, W, H, pal.g2, 26 + (r() * 14 | 0), r, 'overlay');
    const hazeCol = K.mix(pal.bloom, pal.mineral, 0.25 + r() * 0.3);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.07 + r() * 0.07, S * (0.5 + r() * 0.5), 'screen');
    const dh = x.createLinearGradient(0, H * (0.4 + r() * 0.2), 0, H);
    dh.addColorStop(0, K.rgba(pal.wet, 0));
    dh.addColorStop(1, K.rgba(pal.wet, 0.24 + r() * 0.14));
    x.fillStyle = dh; x.fillRect(0, H * 0.4, W, H * 0.6);
    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, 0.34 + r() * 0.14);

    return { aspect: W / H };
  }

  function traits(seed) {
    // Mirror draw()'s rng consumption order exactly up to the trait values.
    const r = K.rng(seed);
    const basePal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    // derivePal consumes: hShift, warm, then 9 colours × 3 channels = 27 draws.
    r(); r();                                  // hShift, warm
    for (let i = 0; i < 9; i++) { r(); r(); r(); }
    const mode = K.pick(MODES, r);
    let secondary = K.pick(MODES, r);
    if (secondary === mode) { /* index math uses one draw */ secondary = MODES[(MODES.indexOf(mode) + 1 + (r() * (MODES.length - 1) | 0)) % MODES.length]; }
    r();                                        // secW = r()*r() consumes 2; do both
    r();
    const aspect = 0.62 + r() * 0.96;
    r();                                        // longEdge
    const f = aspect > 1.08 ? 'Landscape' : aspect < 0.92 ? 'Portrait' : 'Square';
    const zoom = 0.55 + Math.pow(r(), 1.4) * 1.7;
    const density = Math.pow(r(), 1.15);
    const scaleT = zoom < 1.0 ? 'Wide' : zoom > 1.7 ? 'Cropped' : 'Mid';
    const densT = density < 0.33 ? 'Sparse' : density > 0.66 ? 'Packed' : 'Even';
    return { Palette: basePal.name, Mode: mode, Format: f, Scale: scaleT, Density: densT };
  }

  return { name: 'z_efflorescence', draw, traits };
})();
