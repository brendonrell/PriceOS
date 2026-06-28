/* OFF REGISTER — risograph / screenprint spot-ink aesthetic.
 * Flat spot-ink layers printed slightly OFF-REGISTER on textured paper.
 * Each ink is its own halftone DOT screen at a distinct angle; overlaps
 * MULTIPLY into a darker mixed third colour. Bold simple geometry — arcs,
 * blobs, bars, circles, a fragment of huge type — with confident negative
 * space. SURREAL = real-but-off: the registration drift makes a form GHOST /
 * double or land where it shouldn't; the layers disagree about the subject.
 * Restrained, intentional, tactile — NOT messy, NOT clean vector.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Riso spot-ink worlds: warm paper stock + 2–3 named inks. Authentic
     slightly-chalky riso pigments. Overprint of any two multiplies darker. */
  const PALS = [
    { name: 'Fluoro', paper: '#f3ead6', inks: [
      { name: 'Fluoro Pink', hex: '#ff48a0' }, { name: 'Blue', hex: '#2046b0' } ] },
    { name: 'Citrus', paper: '#f1ead2', inks: [
      { name: 'Orange', hex: '#f26b21' }, { name: 'Teal', hex: '#1c8a86' } ] },
    { name: 'Grape', paper: '#f4eccf', inks: [
      { name: 'Yellow', hex: '#f4c20d' }, { name: 'Purple', hex: '#5b2a86' } ] },
    { name: 'Forest', paper: '#eee7d1', inks: [
      { name: 'Green', hex: '#2f8f4e' }, { name: 'Black', hex: '#1a1a1a' } ] },
    { name: 'Brick', paper: '#f0e6d0', inks: [
      { name: 'Red', hex: '#cf3b2e' }, { name: 'Steel', hex: '#5d6b78' } ] },
    { name: 'Sky', paper: '#f2ead4', inks: [
      { name: 'Brown', hex: '#6b4a2b' }, { name: 'Sky', hex: '#4aa7d6' } ] },
  ];

  const MODES = ['Overprint', 'Drift', 'Halftone', 'Cutout', 'Poster', 'Streak'];
  const FORMATS = [[1040, 1300], [1180, 1180], [1300, 1040]]; // portrait / square / landscape

  // big type fragments (single glyphs) for Poster mode
  const GLYPHS = ['R', 'O', 'A', 'G', '7', '&', '?', 'Σ', '∞', '§', '!', 'Q'];

  function pickPal(r) {
    if (window.FORCE_PAL) { const p = PALS.find((p) => p.name === window.FORCE_PAL); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* ── Halftone dot screen ─────────────────────────────────────────────────
     Render an ink LAYER as a screen of dots whose radius ∝ local coverage,
     on its own offscreen canvas, rotated to the ink's screen angle, then the
     whole layer composited with MULTIPLY so overlaps darken into a third hue.
     coverageFn(x,y) -> 0..1 in *layer* (pre-rotation, screen) space inverse —
     we instead sample a "mask" canvas the shapes were drawn onto. */
  function halftoneLayer(W, H, inkHex, angleDeg, cell, maskCtx, paperHex) {
    const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
    const lx = lc.getContext('2d');
    // read the mask (white = ink coverage) once
    const md = maskCtx.getImageData(0, 0, W, H).data;
    const ang = angleDeg * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const cx0 = W / 2, cy0 = H / 2;
    lx.fillStyle = inkHex;
    // iterate the dot grid in ROTATED screen space, covering the canvas diagonal
    const diag = Math.ceil(Math.sqrt(W * W + H * H)) + cell * 2;
    const maxR = cell * 0.72; // dots can slightly kiss at full tone (riso bleed)
    for (let gy = -diag; gy <= diag; gy += cell) {
      for (let gx = -diag; gx <= diag; gx += cell) {
        // rotate grid point back into canvas space
        const px = cx0 + (gx * ca - gy * sa);
        const py = cy0 + (gx * sa + gy * ca);
        if (px < -cell || px > W + cell || py < -cell || py > H + cell) continue;
        const ix = px | 0, iy = py | 0;
        if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
        // average a tiny neighbourhood of the mask for smoother tone
        let cov = 0, cnt = 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const sx = ix + ox * (cell >> 1), sy = iy + oy * (cell >> 1);
          if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
          cov += md[(sy * W + sx) * 4]; cnt++;
        }
        cov = cnt ? (cov / cnt) / 255 : 0;
        if (cov < 0.04) continue;
        // dot radius ∝ sqrt(coverage) (area-linear tone)
        let rad = maxR * Math.sqrt(cov);
        // roller unevenness: tiny per-dot jitter in radius
        rad *= 0.86 + 0.28 * fastHash(ix * 73856093 ^ iy * 19349663);
        if (rad < 0.35) continue;
        lx.beginPath(); lx.arc(px, py, rad, 0, 7); lx.fill();
      }
    }
    return lc;
  }

  // cheap deterministic hash → 0..1 (for dot jitter; not the seeded RNG path)
  function fastHash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return ((n >>> 0) % 1000) / 1000; }

  /* Draw shapes for one ink onto a fresh WHITE-on-black mask canvas, then
     return the halftoned, registered, ink-coloured layer ready to multiply. */
  function makeInkLayer(W, H, inkHex, angle, cell, offX, offY, paintMask, skips) {
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
    const mx = mc.getContext('2d');
    mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
    mx.fillStyle = '#fff';
    mx.save(); mx.translate(offX, offY); // MIS-REGISTRATION: shift this ink
    paintMask(mx);
    mx.restore();
    // roller SKIPS: erase a few streaky bands so ink looks unevenly laid
    if (skips && skips.length) {
      mx.globalCompositeOperation = 'destination-out';
      for (const s of skips) {
        mx.fillStyle = 'rgba(0,0,0,' + s.a + ')';
        mx.fillRect(s.x, s.y, s.w, s.h);
      }
      mx.globalCompositeOperation = 'source-over';
    }
    return halftoneLayer(W, H, inkHex, angle, cell, mx);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 23);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── PAPER STOCK ──
    x.fillStyle = pal.paper; x.fillRect(0, 0, W, H);
    // warm fibre tone variation across the sheet
    const pg = x.createLinearGradient(0, 0, W, H);
    pg.addColorStop(0, K.mix(pal.paper, '#fff', 0.10));
    pg.addColorStop(0.5, pal.paper);
    pg.addColorStop(1, K.mix(pal.paper, '#000', 0.06));
    x.fillStyle = pg; x.fillRect(0, 0, W, H);

    // halftone cell scale (smaller = finer screen). vary a touch per seed.
    const cell = Math.max(5, Math.round(S / (118 + r() * 34)));

    // two (sometimes a faint third overprint of the mix) inks
    const inkA = pal.inks[0], inkB = pal.inks[1];
    // screen angles — classic offset between separations
    const baseAng = r() * 30;
    const angA = baseAng + 15, angB = baseAng + 75;

    // registration drift magnitude (Drift mode pushes it hard)
    const driftBase = mode === 'Drift' ? S * (0.022 + r() * 0.02) : S * (0.004 + r() * 0.008);
    function offset() { const a = r() * 6.283; return [Math.cos(a) * driftBase, Math.sin(a) * driftBase]; }
    const offA = offset(), offB = offset();

    // helper geometry painters (operate in mask space, fill white)
    function disc(mx, cx, cy, rad) { mx.beginPath(); mx.arc(cx, cy, rad, 0, 7); mx.fill(); }
    function ring(mx, cx, cy, rad, th) { mx.save(); mx.lineWidth = th; mx.strokeStyle = '#fff'; mx.beginPath(); mx.arc(cx, cy, rad, 0, 7); mx.stroke(); mx.restore(); }
    function bar(mx, bx, by, bw, bh, rot) { mx.save(); mx.translate(bx, by); mx.rotate(rot || 0); mx.fillRect(-bw / 2, -bh / 2, bw, bh); mx.restore(); }
    function arc(mx, cx, cy, rad, th, a0, a1) { mx.save(); mx.lineWidth = th; mx.strokeStyle = '#fff'; mx.lineCap = 'butt'; mx.beginPath(); mx.arc(cx, cy, rad, a0, a1); mx.stroke(); mx.restore(); }
    function blob(mx, cx, cy, rad, wob) {
      mx.beginPath(); const N = 26;
      for (let i = 0; i <= N; i++) {
        const t = i / N * 6.283;
        const rr = rad * (1 + wob * (noise.noise2(Math.cos(t) * 1.3 + cx * 0.001, Math.sin(t) * 1.3 + cy * 0.001)));
        const px = cx + Math.cos(t) * rr, py = cy + Math.sin(t) * rr;
        i === 0 ? mx.moveTo(px, py) : mx.lineTo(px, py);
      }
      mx.closePath(); mx.fill();
    }
    function glyph(mx, ch, gx, gy, size, rot) {
      mx.save(); mx.translate(gx, gy); mx.rotate(rot || 0);
      mx.font = '900 ' + size + 'px Georgia, "Times New Roman", serif';
      mx.textAlign = 'center'; mx.textBaseline = 'middle';
      mx.fillText(ch, 0, size * 0.04);
      mx.restore();
    }
    function gradientField(mx, dir) {
      // a sweeping tonal field for Halftone mode: white→black ramp = tone
      const g = mx.createLinearGradient(
        dir === 0 ? 0 : (dir === 1 ? W : 0), dir === 2 ? 0 : 0,
        dir === 0 ? W : (dir === 1 ? 0 : 0), dir === 2 ? H : H);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#000');
      mx.fillStyle = g; mx.fillRect(0, 0, W, H); mx.fillStyle = '#fff';
    }

    // build roller skips (sparse for most, prominent in Streak)
    function makeSkips(strong) {
      const arr = []; const n = strong ? K.rint(r, 4, 7) : K.rint(r, 0, 2);
      for (let i = 0; i < n; i++) {
        const horiz = r() < 0.6;
        arr.push(horiz
          ? { x: 0, y: r() * H, w: W, h: 2 + r() * (strong ? 26 : 8), a: 0.12 + r() * (strong ? 0.5 : 0.22) }
          : { x: r() * W, y: 0, w: 2 + r() * (strong ? 22 : 6), h: H, a: 0.1 + r() * (strong ? 0.4 : 0.18) });
      }
      return arr;
    }

    // ── PER-MODE composition: define what each ink paints ──
    let paintA, paintB;
    const cxC = W * (0.5 + (r() - 0.5) * 0.16), cyC = H * (0.5 + (r() - 0.5) * 0.16);

    if (mode === 'Overprint') {
      // two big forms that overlap → visible third colour in the overlap
      const rad = S * (0.27 + r() * 0.06);
      const sep = S * (0.18 + r() * 0.1);
      const ax = cxC - sep * 0.5, bx = cxC + sep * 0.5;
      const ay = cyC + (r() - 0.5) * S * 0.1, by = cyC + (r() - 0.5) * S * 0.1;
      const shapeA = r() < 0.5, shapeB = r() < 0.5;
      paintA = (mx) => { shapeA ? disc(mx, ax, ay, rad) : blob(mx, ax, ay, rad, 0.16); };
      paintB = (mx) => { shapeB ? disc(mx, bx, by, rad) : blob(mx, bx, by, rad, 0.16); };
    } else if (mode === 'Drift') {
      // a hero form repeated on both inks but offset hard → ghosted/doubled
      const rad = S * (0.3 + r() * 0.05);
      const kind = K.rint(r, 0, 2);
      const paint = (mx) => {
        if (kind === 0) disc(mx, cxC, cyC, rad);
        else if (kind === 1) { ring(mx, cxC, cyC, rad, S * 0.1); }
        else blob(mx, cxC, cyC, rad, 0.2);
      };
      // supporting bar on both to reinforce the disagreement
      const brot = (r() - 0.5) * 1.2;
      paintA = (mx) => { paint(mx); bar(mx, W * 0.5, H * (0.18 + r() * 0.04), W * 0.86, S * 0.045, brot); };
      paintB = (mx) => { paint(mx); bar(mx, W * 0.5, H * 0.18, W * 0.86, S * 0.045, brot); };
    } else if (mode === 'Halftone') {
      // a sweeping dot gradient field on one ink + a clean form knocked over it
      const dir = K.rint(r, 0, 2);
      paintA = (mx) => gradientField(mx, dir);
      const rad = S * (0.2 + r() * 0.06);
      const useRing = r() < 0.5;
      paintB = (mx) => { useRing ? ring(mx, cxC, cyC, rad, S * 0.07) : disc(mx, cxC, cyC, rad); };
    } else if (mode === 'Cutout') {
      // ink A floods most of the sheet; shapes are KNOCKED OUT (negative);
      // ink B drops a few accents in the holes
      const holes = [];
      const nh = K.rint(r, 2, 4);
      for (let i = 0; i < nh; i++) holes.push({ x: W * (0.2 + r() * 0.6), y: H * (0.2 + r() * 0.6), r: S * (0.08 + r() * 0.14), b: r() < 0.5 });
      paintA = (mx) => {
        // flood inset from edges (poster border)
        const m = S * (0.06 + r() * 0.03);
        mx.fillRect(m, m, W - 2 * m, H - 2 * m);
        // knock out holes
        mx.save(); mx.globalCompositeOperation = 'destination-out';
        for (const h of holes) { mx.beginPath(); mx.arc(h.x, h.y, h.r, 0, 7); mx.fill(); }
        mx.restore();
      };
      paintB = (mx) => { for (const h of holes) if (h.b) disc(mx, h.x, h.y, h.r * 0.62); };
    } else if (mode === 'Poster') {
      // one hero form + a fragment of HUGE type bleeding off-edge
      const ch = K.pick(GLYPHS, r);
      const size = S * (1.05 + r() * 0.35);
      const gx = W * (0.32 + r() * 0.36), gy = H * (0.46 + r() * 0.2);
      const grot = (r() - 0.5) * 0.5;
      paintA = (mx) => glyph(mx, ch, gx, gy, size, grot);
      const rad = S * (0.16 + r() * 0.05);
      const hx = W * (0.2 + r() * 0.6), hy = H * (0.2 + r() * 0.18);
      const heroArc = r() < 0.5;
      paintB = (mx) => { heroArc ? arc(mx, hx, hy + S * 0.3, rad * 1.7, S * 0.06, Math.PI * 1.05, Math.PI * 1.95) : disc(mx, hx, hy, rad); };
    } else { // Streak — roller/texture forward, sparse
      const rad = S * (0.22 + r() * 0.06);
      paintA = (mx) => { bar(mx, W * 0.5, H * (0.4 + r() * 0.2), W * 0.9, S * (0.08 + r() * 0.05), (r() - 0.5) * 0.3); };
      const useArc = r() < 0.6;
      paintB = (mx) => { useArc ? arc(mx, cxC, cyC, rad, S * 0.05, 0, Math.PI * (1 + r())) : disc(mx, cxC, cyC, rad * 0.7); };
    }

    const skipsA = makeSkips(mode === 'Streak');
    const skipsB = makeSkips(mode === 'Streak' && r() < 0.5);

    // ── BUILD + COMPOSITE LAYERS (multiply for true overprint) ──
    const layerA = makeInkLayer(W, H, inkA.hex, angA, cell, offA[0], offA[1], paintA, skipsA);
    const layerB = makeInkLayer(W, H, inkB.hex, angB, cell, offB[0], offB[1], paintB, skipsB);

    x.save();
    x.globalCompositeOperation = 'multiply';
    // slight per-layer transparency so ink "sits on" the paper
    x.globalAlpha = 0.94; x.drawImage(layerA, 0, 0);
    x.globalAlpha = 0.94; x.drawImage(layerB, 0, 0);
    x.restore();

    // ── INK MOTTLE on the printed areas (roller unevenness) ──
    K.mottle(x, 0, 0, W, H, inkA.hex, 60, r, 'multiply');

    // ── PAPER TEXTURE: fibre grain + faint mottle on the stock ──
    K.mottle(x, 0, 0, W, H, K.mix(pal.paper, '#000', 0.3), 90, r, 'multiply');
    K.grain(x, W, H, 3.4, r);

    // a faint flecks pass (paper specks) — sparse darker dust
    x.save(); x.globalCompositeOperation = 'multiply';
    const flecks = (W * H) / 9000;
    for (let i = 0; i < flecks; i++) { x.fillStyle = K.rgba('#3a3024', 0.05 + r() * 0.08); x.fillRect(r() * W, r() * H, 1, 1 + (r() < 0.2 ? 1 : 0)); }
    x.restore();

    // ── faint vignette (print falloff) ──
    K.vignette(x, W, H, 0.16);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = window.FORCE_PAL ? (PALS.find((p) => p.name === window.FORCE_PAL) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Inks: pal.inks.map((i) => i.name).join(' + ') };
  }

  return { name: 's07_risograph', draw, traits };
})();
