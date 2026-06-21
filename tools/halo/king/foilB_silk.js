/* FOILB — SILK · dreamy painterly wet-on-wet iridescent silk
 * A flowing drape of poured-ink-on-satin: soft folds with feathered watercolor
 * edges and bloom halos, the thin-film rainbow blooming softly along the drape.
 * Elegant, dreamy, luxurious — but the BASE HUE DOMINATES the frame (40%+) and
 * white is limited to thin shine highlights only. NO washed-out pale marble.
 *
 * Sibling of k4_foil (bold metal). This one is wet, soft, painterly — but every
 * piece is unmistakably its own saturated color world. The iridescence is a
 * gentle hue-shift BETWEEN two thin-film poles (shiftA / shiftB) riding ON TOP
 * of a saturated colored body, never washing it to white.
 *
 * Coarse-grid membrane (fast, no full-res per-pixel loops).
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // 10 hand-picked DISTINCT palettes — each a different saturated world.
  //   base   = dominant body (the color the piece reads as)
  //   shiftA/shiftB = thin-film hue-shift poles riding on the body
  //   glint  = thin shine highlight (used sparingly)
  //   deep   = COLORED shadow (never black)
  const PALS = [
    { name: 'Molten Gold',     base: '#f5a623', shiftA: '#18d3c0', shiftB: '#ff3da6', glint: '#fff3c4', deep: '#b5471a' },
    { name: 'Emerald Oil',     base: '#12b76a', shiftA: '#ffd23f', shiftB: '#ff3df0', glint: '#d6ffe9', deep: '#07664a' },
    { name: 'Sapphire Flare',  base: '#2b6bff', shiftA: '#ff8a3d', shiftB: '#2af0ff', glint: '#dcebff', deep: '#16267a' },
    { name: 'Amethyst',        base: '#9b4dff', shiftA: '#39ffc2', shiftB: '#ffd23f', glint: '#f0dcff', deep: '#4a1c8a' },
    { name: 'Rose Gold',       base: '#ff8aa8', shiftA: '#7af0e0', shiftB: '#ffe6c4', glint: '#fff0f0', deep: '#b5566a' },
    { name: 'Acid Oil',        base: '#c2ff3d', shiftA: '#ff2bd6', shiftB: '#2af0ff', glint: '#f6ffd6', deep: '#4a8a1c' },
    { name: 'Fuchsia Chrome',  base: '#ff2b8f', shiftA: '#ffd23f', shiftB: '#2af0ff', glint: '#ffd9ec', deep: '#8a1c5a' },
    { name: 'Tangerine Mylar', base: '#ff7a2b', shiftA: '#a05cff', shiftB: '#18d3c0', glint: '#fff0d6', deep: '#b5401a' },
    { name: 'Aqua Pearl',      base: '#18d3c0', shiftA: '#ff3da6', shiftB: '#ffd23f', glint: '#d6fff8', deep: '#0a6e7a' },
    { name: 'Opal Flame',      base: '#ff9be0', shiftA: '#7af0ff', shiftB: '#b6ff6e', glint: '#ffffff', deep: '#a07acf' },
  ];

  // varied aspect — portrait / landscape / square (square the minority)
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1024, H: 1536, t: 'Tall' },       // 2:3
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.48 ? FMTS[1] : x < 0.70 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  const DRAPE = ['Soft Fold', 'Pour', 'Cascade', 'Furl'];   // drape character
  const FLOW  = ['Diagonal', 'Veil', 'Sweep'];               // ridge direction
  const EVENTS = ['None','None','None','None','None','None','Spectrum Bloom','Pearl Vein'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const drape = K.pick(DRAPE, r);
    const flow = K.pick(FLOW, r);
    const event = K.pick(EVENTS, r);
    const ang = (flow === 'Diagonal' ? -0.62 : flow === 'Veil' ? 1.05 : 0.22) + (r() - 0.5) * 0.45;
    // soft, low-frequency folds (silk drapes wide, not crinkled)
    const foldFreq = drape === 'Cascade' ? 2.4 + r() * 1.0 : drape === 'Furl' ? 1.6 + r() * 0.9 : 1.2 + r() * 0.9;
    const soft = drape === 'Furl' ? 1.5 : drape === 'Cascade' ? 1.2 : 0.95;  // edge feathering scale
    const hueRate = 0.55 + r() * 0.9;   // gentle thin-film cycling (soft, not busy)
    // focal drape on a thirds point
    const fx = (r() < 0.5 ? 0.32 : 0.67) + (r() - 0.5) * 0.05;
    const fy = (r() < 0.5 ? 0.34 : 0.65) + (r() - 0.5) * 0.05;
    return { pal, fmt, drape, flow, event, ang, foldFreq, soft, hueRate, fx, fy };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Drape: p.drape, Flow: p.flow, Event: p.event };
  }

  // smooth drape height field — soft wide folds + watercolor wobble, no hard creases
  function sheetH(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s, rv = u * s + v * c;
    const warp = noise.fbm(u * 1.1, v * 1.1, 4) * 0.7;            // big lazy warp
    let h = Math.sin((ru + warp) * Math.PI * p.foldFreq);         // smooth, NOT sharpened
    h += 0.45 * Math.sin((rv + warp * 0.6) * Math.PI * (p.foldFreq * 0.5 + 0.8));
    h += 0.7 * noise.fbm(u * 2.4, v * 2.4, 5);                    // poured-ink body
    h += 0.3 * noise.fbm(u * 5.0, v * 5.0, 4);                    // fine tooth
    return h;
  }

  // gentle thin-film phase → soft rainbow bloom along the drape (few cycles)
  function filmPhase(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.1 + 4.1, v * 1.1 + 2.7, 4) * 0.6;
    return (ru + warp) * p.foldFreq * p.hueRate * 0.45
         + noise.fbm(u * 2.0, v * 2.0, 5) * 0.8;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // ── 1. SATURATED COLORED GROUND — base body, NOT white ──
    // The whole canvas starts as a rich tonal field of the base hue (base→deep),
    // so even the negative space reads as the piece's color, never pale marble.
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0,   K.mix(P.base, P.glint, 0.18));      // a touch of shine at one corner
    gg.addColorStop(0.45, P.base);
    gg.addColorStop(1,   K.mix(P.base, P.deep, 0.55));        // colored shadow corner
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // soft tonal haze in the base family (keeps it living, stays saturated)
    K.hazeSheet(x, W, H, noise, K.mix(P.base, P.deep, 0.35), 0.32, Math.max(W, H) * 0.55, 'multiply');
    K.hazeSheet(x, W, H, noise, K.mix(P.base, P.shiftA, 0.4), 0.18, Math.max(W, H) * 0.42, 'screen');

    // ── 2. THE WET IRIDESCENT SILK — coarse grid, painterly soft body ──
    // Per cell: paint a SATURATED color built from the BASE hue, nudged toward
    // the thin-film poles (shiftA/shiftB) by the film phase. Lightness shaped by
    // how the fold faces the light — but kept in a saturated mid band so it never
    // blows to white. White is reserved for the thin glint pass only.
    const step = Math.max(3, Math.floor(Math.min(W, H) / 230));
    const lx = p.fx, ly = p.fy;
    const du = 0.006, dv = 0.006;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const h  = sheetH(noise, u, v, p);
        const hu = sheetH(noise, u + du, v, p) - h;
        const hv = sheetH(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        const ndx = lx - u, ndy = ly - v;
        const nl = Math.sqrt(ndx * ndx + ndy * ndy) + 1e-4;
        const facing = (hu * ndx + hv * ndy) / (du * nl);   // -ish .. +ish

        // thin-film position 0..1 → blend base with the two poles softly
        const ph = filmPhase(noise, u, v, p) + facing * 0.35;
        const film = (Math.sin(ph * Math.PI * 2) * 0.5 + 0.5);  // 0..1 smooth
        // tilt the body color toward shiftA (film<.5) or shiftB (film>.5),
        // but ONLY a soft amount so the base hue stays dominant.
        let body;
        if (film < 0.5) body = K.mix(P.base, P.shiftA, (0.5 - film) * 0.62);
        else            body = K.mix(P.base, P.shiftB, (film - 0.5) * 0.62);

        // lighting: faces-to-light brighten toward glint (a little), faces-away
        // sink toward the COLORED deep. Saturated mid band — no white blowout.
        const lit = K.clamp(0.5 + facing * 0.5, 0, 1);
        let cell;
        if (lit > 0.55) cell = K.mix(body, P.glint, (lit - 0.55) * 0.42);   // gentle shine
        else            cell = K.mix(body, P.deep,  (0.55 - lit) * 0.78);   // colored shadow

        // coverage: silk body dominates near focal; the corner OPPOSITE relaxes
        // toward the base-tone ground (still colored) for breathing negative space.
        const fd = Math.sqrt((u - lx) * (u - lx) + (v - ly) * (v - ly));
        const od = Math.sqrt((u - (1 - lx)) * (u - (1 - lx)) + (v - (1 - ly)) * (v - (1 - ly)));
        const cover = K.clamp(1.12 - fd * 0.42 - Math.max(0, 0.5 - od) * 1.0, 0.0, 1.0);

        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(cell, 0.40 + cover * 0.55);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();

    // ── 3. WATERCOLOR FOLD SHADING — soft poured-ink bands deepen the drape ──
    // Multiply colored deep into the fold valleys → painterly volume, keeps sat.
    x.save(); x.globalCompositeOperation = 'multiply';
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const h = sheetH(noise, u, v, p);
        const valley = K.clamp(-h * 0.5, 0, 1);              // valleys only
        if (valley < 0.04) continue;
        const fd = Math.sqrt((u - lx) * (u - lx) + (v - ly) * (v - ly));
        const a = valley * 0.5 * K.clamp(1.15 - fd * 0.5, 0.25, 1.0);
        x.fillStyle = K.rgba(K.mix(P.deep, P.base, 0.25), a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();

    // ── 4. SOFT IRIDESCENT BLOOM HALOS — wet rainbow blooming along the drape ──
    // A few large feathered radial blooms in the thin-film hues, screen-blended,
    // low alpha → the "wet-on-wet catches light" feel WITHOUT bleaching.
    x.save(); x.globalCompositeOperation = 'screen';
    const bN = K.rint(r, 4, 6);
    for (let i = 0; i < bN; i++) {
      const bx = (lx + (r() - 0.5) * 0.55) * W;
      const by = (ly + (r() - 0.5) * 0.55) * H;
      const rad = (0.18 + r() * 0.26) * Math.max(W, H);
      const pole = r() < 0.5 ? P.shiftA : P.shiftB;
      const col = K.mix(P.base, pole, 0.7);
      const g = x.createRadialGradient(bx, by, 0, bx, by, rad);
      g.addColorStop(0, K.rgba(col, 0.14 + r() * 0.10));
      g.addColorStop(0.5, K.rgba(col, 0.05));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g; x.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
    }
    x.restore();

    // ── 5. FLOWING SILK STRANDS — soft directional sheen lines along the drape ──
    // Painterly combed-silk strokes (poured ink lines) in pole hues + a glint
    // strand, drawn with low alpha so they read as woven sheen, not hard lines.
    x.save(); x.globalCompositeOperation = 'screen';
    const fcx = lx * W, fcy = ly * H;
    const sN = K.rint(r, 5, 8);
    for (let i = 0; i < sN; i++) {
      const t0 = (i / sN - 0.5);
      const offN = (r() - 0.5);
      const cx0 = fcx + (offN * 0.4 * Math.cos(p.ang + Math.PI / 2)) * Math.max(W, H);
      const cy0 = fcy + (offN * 0.4 * Math.sin(p.ang + Math.PI / 2)) * Math.max(W, H);
      const len = (0.7 + r() * 0.5) * Math.max(W, H);
      const ca = p.ang + (r() - 0.5) * 0.3;
      const segs = 90;
      const pole = r() < 0.4 ? P.glint : (r() < 0.5 ? P.shiftA : P.shiftB);
      x.lineWidth = 1.2 + r() * 3.5;
      x.strokeStyle = K.rgba(K.mix(P.base, pole, pole === P.glint ? 0.7 : 0.6), 0.06 + r() * 0.10);
      x.beginPath();
      for (let sI = 0; sI <= segs; sI++) {
        const t = sI / segs;
        const along = (t - 0.5) * len;
        const wob = Math.sin(t * Math.PI * (2 + r() * 2) + i) * (16 + r() * 30) * Math.sin(t * Math.PI);
        const px = cx0 + Math.cos(ca) * along - Math.sin(ca) * wob;
        const py = cy0 + Math.sin(ca) * along + Math.cos(ca) * wob;
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 6. FOCAL DRAPE SHEEN — the soft bright lobe that commands the eye ──
    // Kept SOFT and small so it's a dreamy highlight, not a white blowout.
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.20, K.mix(P.glint, P.base, 0.35), 0.30);
    K.bloom(x, fcx, fcy, Math.max(W, H) * 0.13, P.glint, 0.16);
    // a single soft specular silk ribbon along the drape (feathered)
    x.save(); x.globalCompositeOperation = 'screen';
    const rsegs = 70, rlen = Math.max(W, H) * (0.55 + r() * 0.3);
    for (let band = 0; band < 3; band++) {
      const off = (band - 1) * 16;
      x.lineWidth = (3 - band) * 2.6;
      x.strokeStyle = K.rgba(band === 1 ? K.mix(P.glint, P.base, 0.4) : K.mix(P.base, band === 0 ? P.shiftA : P.shiftB, 0.55), 0.12 - band * 0.03);
      x.beginPath();
      for (let sI = 0; sI <= rsegs; sI++) {
        const t = sI / rsegs;
        const along = (t - 0.5) * rlen;
        const wob = Math.sin(t * Math.PI * 2.4) * 30 * Math.sin(t * Math.PI);
        const px = fcx + Math.cos(p.ang) * along - Math.sin(p.ang) * (wob + off);
        const py = fcy + Math.sin(p.ang) * along + Math.cos(p.ang) * (wob + off);
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // counter-weight: small dense colored glint opposite the focal (asymmetry)
    const ogx = (1 - lx) * W + (r() - 0.5) * 0.08 * W;
    const ogy = (1 - ly) * H + (r() - 0.5) * 0.08 * H;
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.05, P.glint, 0.30);
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.12, K.mix(P.base, P.shiftB, 0.6), 0.16);

    // ── 7. RARE CHASE EVENTS ──
    if (p.event === 'Spectrum Bloom') {
      x.save(); x.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        const rr = (0.12 + i * 0.07) * Math.max(W, H);
        const pole = i % 2 ? P.shiftA : P.shiftB;
        const g = x.createRadialGradient(fcx, fcy, rr * 0.4, fcx, fcy, rr);
        g.addColorStop(0, K.rgba(K.mix(P.base, pole, 0.75), 0));
        g.addColorStop(0.6, K.rgba(K.mix(P.base, pole, 0.75), 0.10));
        g.addColorStop(1, K.rgba(K.mix(P.base, pole, 0.75), 0));
        x.fillStyle = g; x.fillRect(fcx - rr, fcy - rr, rr * 2, rr * 2);
      }
      x.restore();
    } else if (p.event === 'Pearl Vein') {
      // a soft luminous vein of glint snaking along the drape
      x.save(); x.globalCompositeOperation = 'screen';
      x.lineWidth = 2.2; x.strokeStyle = K.rgba(P.glint, 0.22);
      x.beginPath();
      const vl = Math.max(W, H) * 1.1;
      for (let sI = 0; sI <= 100; sI++) {
        const t = sI / 100; const along = (t - 0.5) * vl;
        const wob = Math.sin(t * Math.PI * 5) * 40 + noise.fbm(t * 4, seed % 7, 3) * 60;
        const px = fcx + Math.cos(p.ang) * along - Math.sin(p.ang) * wob;
        const py = fcy + Math.sin(p.ang) * along + Math.cos(p.ang) * wob;
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke(); x.restore();
    }

    // ── 8. PAINTERLY FINISH — paper tooth, grain, gentle chromatic shimmer ──
    K.mottle(x, 0, 0, W, H, P.deep, 1700, r, 'overlay');         // painterly tooth (colored)
    K.mottle(x, 0, 0, W, H, P.base, 2600, r, 'soft-light');      // soft brushy variation
    K.grain(x, W, H, 700, r);
    K.chromaSplit(x, W, H, 1);                                   // whisper of holographic edge
    // colored deepening at the shadow corner to anchor the composition (NOT black)
    x.save(); x.globalCompositeOperation = 'multiply';
    const sc = x.createRadialGradient((1 - lx) * W, (1 - ly) * H, 0, (1 - lx) * W, (1 - ly) * H, Math.max(W, H) * 0.85);
    sc.addColorStop(0, K.rgba(K.mix(P.deep, P.base, 0.4), 0.0));
    sc.addColorStop(1, K.rgba(P.deep, 0.34));
    x.fillStyle = sc; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'foilB_silk', draw, traits };
})();
