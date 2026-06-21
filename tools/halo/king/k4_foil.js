/* K4 — FOIL · iridescent holographic membrane / crumpled foil
 * A vast crumpled holographic mylar sheet catching light: soft pearl hue-shift
 * (thin-film / oil-slick rainbow) along every crease, dichroic shimmer,
 * refraction caustics, an off-center bright sheen ridge as the focal, calm
 * pearly negative space opposite. BRIGHT cyberpunk holo — never a void.
 *
 * The hue-shift membrane is computed on a COARSE grid (like hazeSheet) so it
 * stays fast — no per-pixel full-res loops.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // 8 BRIGHT iridescent colorways. ground is the dominant pearly atmosphere
  // (always a luminous COLOR, never dark); the foil bands cycle hue around it.
  // hueBase/hueSpan set where the thin-film rainbow lives; warm/cool pull the
  // pearl wash. tint leans the iridescence toward the family.
  const PALS = [
    { name: 'Holo Foil',     ground: '#e6b8e2', field: '#9cc6ee', mid: '#bfe3cb', accent: '#f3d3b0', hi: '#f6efff', hueBase: 200, hueSpan: 300, sat: 0.62, tint: 0.10 },
    { name: 'Peachy Holo',   ground: '#ffd9c2', field: '#9cf0e4', mid: '#caa7ef', accent: '#ff9fd0', hi: '#fff2e6', hueBase: 320, hueSpan: 260, sat: 0.60, tint: 0.18 },
    { name: 'Prism Spectrum',ground: '#ffb7e6', field: '#9cf2ff', mid: '#caff8e', accent: '#ffce6b', hi: '#ffffff', hueBase: 0,   hueSpan: 360, sat: 0.78, tint: 0.00 },
    { name: 'Promare Burn',  ground: '#ff8fd6', field: '#7fe8ec', mid: '#c98cff', accent: '#fffba6', hi: '#ffffff', hueBase: 300, hueSpan: 240, sat: 0.80, tint: 0.06 },
    { name: 'Aqua Pearl',    ground: '#b9f0e6', field: '#bcd8ff', mid: '#e0c2ff', accent: '#ffe1a8', hi: '#f2fff8', hueBase: 150, hueSpan: 250, sat: 0.58, tint: 0.14 },
    { name: 'Sunset Mylar',  ground: '#ffc78a', field: '#ff9ec4', mid: '#b79bff', accent: '#ffe96b', hi: '#fff3da', hueBase: 280, hueSpan: 260, sat: 0.70, tint: 0.22 },
    { name: 'Lilac Chrome',  ground: '#d9c2ff', field: '#a7e2ff', mid: '#ffc2ec', accent: '#c8ffd8', hi: '#f6f0ff', hueBase: 220, hueSpan: 280, sat: 0.66, tint: 0.12 },
    { name: 'Mint Spectrum', ground: '#c8f5cf', field: '#bce0ff', mid: '#ffd0ef', accent: '#fff0a8', hi: '#f4fff0', hueBase: 120, hueSpan: 300, sat: 0.64, tint: 0.10 },
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

  const CRUMPLE = ['Soft Fold', 'Crinkle', 'Origami', 'Drape'];  // fold structure
  const FLOW    = ['Diagonal', 'Cascade', 'Sweep'];               // ridge direction
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','Spectrum Burst','Mirror Ridge'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const crumple = K.pick(CRUMPLE, r);
    const flow = K.pick(FLOW, r);
    const event = K.pick(EVENTS, r);
    // fold geometry
    const ang = (flow === 'Diagonal' ? -0.6 : flow === 'Cascade' ? 1.1 : 0.25) + (r() - 0.5) * 0.5;
    const foldFreq = crumple === 'Crinkle' ? 5.0 + r() * 2.5 : crumple === 'Origami' ? 3.0 + r() * 1.5 : 1.8 + r() * 1.4;
    const sharp = crumple === 'Origami' ? 2.4 : crumple === 'Crinkle' ? 1.7 : 1.1; // crease hardness
    const hueRate = 0.9 + r() * 1.8;   // how fast the thin-film rainbow cycles per fold
    // focal sheen ridge on a thirds point
    const fx = (r() < 0.5 ? 0.30 : 0.68) + (r() - 0.5) * 0.06;
    const fy = (r() < 0.5 ? 0.32 : 0.66) + (r() - 0.5) * 0.06;
    return { pal, fmt, crumple, flow, event, ang, foldFreq, sharp, hueRate, fx, fy };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Crumple: p.crumple, Flow: p.flow, Event: p.event };
  }

  // height field of the crumpled sheet at normalised (u,v) → folds + macro drape
  function sheetH(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s, rv = u * s + v * c;
    // primary ridge train along one axis (the folds), warped by low-freq noise
    const warp = noise.fbm(u * 1.3, v * 1.3, 4) * 0.55;
    let h = Math.sin((ru + warp) * Math.PI * p.foldFreq);
    h = Math.sign(h) * Math.pow(Math.abs(h), 1 / p.sharp); // sharpen creases
    // cross-crinkle (secondary folds) + fine crumple detail
    h += 0.5 * Math.sin((rv + warp * 0.7) * Math.PI * (p.foldFreq * 0.55 + 1.5));
    h += 0.9 * noise.fbm(u * 3.2, v * 3.2, 5);
    h += 0.4 * noise.fbm(u * 7.0, v * 7.0, 4);
    return h; // unbounded-ish; we use gradients of it
  }

  // continuous thin-film phase field → the oil-slick rainbow. Driven by height +
  // facet orientation so the band order marches teal→magenta→gold across folds.
  function filmPhase(noise, u, v, p) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.3 + 4.1, v * 1.3 + 2.7, 4) * 0.5;
    // accumulate hue along the fold axis + crumple → many full rainbow cycles
    return (ru + warp) * p.foldFreq * p.hueRate * 0.5
         + noise.fbm(u * 2.6, v * 2.6, 5) * 1.1
         + Math.sin((u * c + v * s) * Math.PI * (p.foldFreq * 0.6)) * 0.18;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // ── 1. PEARLY GROUND — luminous color base, soft diagonal holo gradient ──
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, K.mix(P.ground, P.hi, 0.30));
    gg.addColorStop(0.5, P.ground);
    gg.addColorStop(1, K.mix(P.field, P.hi, 0.20));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // far hazy field — atmosphere, kept light so it doesn't bleach the foil
    K.hazeSheet(x, W, H, noise, K.mix(P.field, P.hi, 0.2), 0.30, Math.max(W, H) * 0.5, 'screen');

    // ── 2. THE IRIDESCENT MEMBRANE — coarse grid, OPAQUE rainbow + lit creases ──
    // Two passes per cell on a coarse grid (fast):
    //   (a) a SOLID iridescent fill (source-over) so the whole sheet glows with a
    //       saturated thin-film rainbow — this is what makes it read as foil, not
    //       washed pastel. Lightness from how the facet faces the light anchor.
    //   (b) an additive crease GLINT where the height-field slope spikes, so the
    //       folds light up as bright dichroic edges.
    const step = Math.max(3, Math.floor(Math.min(W, H) / 240));
    const lx = p.fx, ly = p.fy;            // light direction anchor (the focal)
    const du = 0.005, dv = 0.005;          // slope sampling deltas (in uv)
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const h  = sheetH(noise, u, v, p);
        const hu = sheetH(noise, u + du, v, p) - h;
        const hv = sheetH(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du; // crease intensity
        // facet facing toward the light anchor (signed) → specular shaping
        const ndx = lx - u, ndy = ly - v;
        const nl = Math.sqrt(ndx * ndx + ndy * ndy) + 1e-4;
        const facing = (hu * ndx + hv * ndy) / (du * nl);
        // thin-film hue — continuous, many cycles → real oil-slick rainbow.
        // sharpen the band transitions so adjacent folds read as clearly
        // DIFFERENT hues (teal vs magenta vs gold), not one pale wash.
        const ph = filmPhase(noise, u, v, p) + facing * 0.6;
        const hue = P.hueBase + ((ph % 1 + 1) % 1) * P.hueSpan;
        // facets tilted toward light are brighter & whiter (sheen); away = deeper
        // saturated band. keep saturation HIGH so it reads as shiny dichroic foil.
        const litRaw = 0.5 + facing * 0.5;
        const light = K.clamp(0.54 + litRaw * 0.20, 0.42, 0.78);
        const sat = K.clamp(P.sat + 0.22 + Math.abs(facing) * 0.1, 0.45, 0.98);
        const irid = K.iridescent(hue / 360, sat, light);
        // (a) base — SOLID saturated iridescent sheet (this is the body of the
        // foil). Near-opaque across most of the canvas; only the far corner
        // relaxes toward the pearly ground for active negative space.
        const fd = Math.sqrt((u - lx) * (u - lx) + (v - ly) * (v - ly));
        // coverage falls toward the corner OPPOSITE the focal → that corner stays
        // a calm smooth pearl field (active negative space), foil body near focal.
        const od = Math.sqrt((u - (1 - lx)) * (u - (1 - lx)) + (v - (1 - ly)) * (v - (1 - ly)));
        const cover = K.clamp(1.18 - fd * 0.5 - Math.max(0, 0.55 - od) * 0.9, 0.18, 1.0);
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(K.mix(P.ground, irid, cover), 0.78 + cover * 0.22);
        x.fillRect(xx, yy, step + 1, step + 1);
        // (b) crease glint — a TIGHT bright dichroic edge ONLY on the sharpest
        // folds (sparingly, so it doesn't bleach the sheet to white).
        const focalBoost = K.clamp(1.25 - fd * 0.85, 0.22, 1.0);
        if (slope > 4.5) {
          const gl = K.clamp((slope - 4.5) * 0.085, 0, 0.5) * focalBoost;
          const glintHue = hue + 50; // crease leans into the next band
          x.globalCompositeOperation = 'lighter';
          x.fillStyle = K.rgba(K.iridescent(glintHue / 360, sat, 0.6), gl);
          x.fillRect(xx, yy, step + 1, step + 1);
          if (slope > 8.0) { // white-hot specular core on the very sharpest only
            x.fillStyle = K.rgba(P.hi, K.clamp((slope - 8.0) * 0.06, 0, 0.4) * focalBoost);
            x.fillRect(xx, yy, step + 1, step + 1);
          }
        }
      }
    }
    x.restore();

    // smooth pearly wash settling into the calm corner opposite the focal — makes
    // the negative space read as deliberate breathing room, not unfinished.
    x.save(); x.globalCompositeOperation = 'source-over';
    const cg = x.createRadialGradient((1 - lx) * W, (1 - ly) * H, 0, (1 - lx) * W, (1 - ly) * H, Math.max(W, H) * 0.5);
    cg.addColorStop(0, K.rgba(K.mix(P.ground, P.hi, 0.4), 0.5));
    cg.addColorStop(0.6, K.rgba(K.mix(P.ground, P.hi, 0.3), 0.12));
    cg.addColorStop(1, K.rgba(P.ground, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 3. REFRACTION CAUSTICS — rippling bright bands over a region, off-center
    x.save(); x.globalCompositeOperation = 'lighter';
    const cN = K.rint(r, 3, 6);
    for (let i = 0; i < cN; i++) {
      const cx0 = (lx + (r() - 0.5) * 0.5) * W;
      const cy0 = (ly + (r() - 0.5) * 0.5) * H;
      const len = (0.4 + r() * 0.5) * Math.max(W, H);
      const ca = p.ang + (r() - 0.5) * 0.6;
      const segs = 80;
      const hueC = P.hueBase + r() * P.hueSpan;
      x.lineWidth = 1 + r() * 1.6;
      x.strokeStyle = K.rgba(K.iridescent(hueC / 360, P.sat, 0.68), 0.16 + r() * 0.14);
      x.beginPath();
      for (let sI = 0; sI <= segs; sI++) {
        const t = sI / segs;
        const along = (t - 0.5) * len;
        const wob = Math.sin(t * Math.PI * (4 + r() * 4) + i) * (8 + r() * 22) * Math.sin(t * Math.PI);
        const px = cx0 + Math.cos(ca) * along - Math.sin(ca) * wob;
        const py = cy0 + Math.sin(ca) * along + Math.cos(ca) * wob;
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 4. FOCAL SHEEN RIDGE — the bright highlight lobe that commands the eye ──
    const fcx = lx * W, fcy = ly * H;
    K.bloom(x, fcx, fcy, Math.max(W, H) * 0.26, P.hi, 0.18);
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.17, K.mix(P.hi, P.accent, 0.3), 0.38);
    // a tight specular streak along the ridge (full-bleed-ish diagonal)
    x.save(); x.globalCompositeOperation = 'lighter';
    const rsegs = 60, rlen = Math.max(W, H) * (0.6 + r() * 0.3);
    for (let band = 0; band < 3; band++) {
      const off = (band - 1) * 14;
      x.lineWidth = (3 - band) * 2.2;
      x.strokeStyle = K.rgba(band === 1 ? P.hi : K.iridescent((P.hueBase + band * 60) / 360, P.sat, 0.7), 0.18 - band * 0.04);
      x.beginPath();
      for (let sI = 0; sI <= rsegs; sI++) {
        const t = sI / rsegs;
        const along = (t - 0.5) * rlen;
        const wob = Math.sin(t * Math.PI * 3) * 24;
        const px = fcx + Math.cos(p.ang) * along - Math.sin(p.ang) * (wob + off);
        const py = fcy + Math.sin(p.ang) * along + Math.cos(p.ang) * (wob + off);
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 5. LIGHT-LEAK BLOOM from an edge — washes brighter where it lands ──
    const leakSide = r();
    const lkx = leakSide < 0.5 ? -W * 0.05 : W * 1.05;
    const lky = H * (0.15 + r() * 0.7);
    K.bloom(x, lkx, lky, Math.max(W, H) * 0.5, K.mix(P.accent, P.hi, 0.4), 0.2);

    // small counter-weight glint on the opposite side (asymmetric balance)
    const ogx = (1 - lx) * W + (r() - 0.5) * 0.1 * W;
    const ogy = (1 - ly) * H + (r() - 0.5) * 0.1 * H;
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.06, P.hi, 0.5);
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.14, K.iridescent((P.hueBase + 120) / 360, P.sat, 0.7), 0.18);

    // ── 6. RARE CHASE EVENTS ──
    if (p.event === 'Spectrum Burst') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const bx = fcx, by = fcy, rings = 22;
      for (let i = 0; i < rings; i++) {
        const rr = (i / rings) * Math.max(W, H) * 0.5;
        x.strokeStyle = K.rgba(K.iridescent((P.hueBase + i / rings * P.hueSpan) / 360, P.sat + 0.15, 0.66), 0.10);
        x.lineWidth = 6; x.beginPath(); x.arc(bx, by, rr, 0, Math.PI * 2); x.stroke();
      }
      K.bloom(x, bx, by, Math.max(W, H) * 0.3, P.hi, 0.3);
      x.restore();
    } else if (p.event === 'Mirror Ridge') {
      // a perfect chrome-mirror band slicing the ridge
      x.save();
      const mw = Math.max(W, H) * 0.16, mh = Math.max(W, H) * 0.9;
      x.translate(fcx, fcy); x.rotate(p.ang);
      // soft-edged so the mirror band melts into the foil rather than floating
      const grad = x.createLinearGradient(-mw / 2, 0, mw / 2, 0);
      grad.addColorStop(0, K.rgba(P.mid, 0)); grad.addColorStop(0.5, K.rgba(P.hi, 1)); grad.addColorStop(1, K.rgba(P.mid, 0));
      x.fillStyle = K.chromeRamp(x, -mw / 2, -mh / 2, mw, mh, Math.PI / 2, P.mid);
      x.globalAlpha = 0.42; x.fillRect(-mw / 2, -mh / 2, mw, mh);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1; x.fillStyle = grad;
      x.fillRect(-mw / 2, -mh / 2, mw, mh);
      x.restore();
      K.sheen(x, fcx, fcy, Math.max(W, H) * 0.18, P.hi, 0.45);
    }

    // ── 7. PAINTERLY / FILMIC FINISH — chromatic shimmer, grain, soft vignette ──
    K.chromaSplit(x, W, H, 2);                                   // holographic edge shimmer
    K.mottle(x, 0, 0, W, H, P.mid, 2200, r, 'overlay');         // subtle paper tooth
    K.grain(x, W, H, 620, r);
    // gentle inverse-vignette: keep edges bright (no dark frame) — lift toward hi
    x.save(); x.globalCompositeOperation = 'overlay';
    const vg = x.createRadialGradient(fcx, fcy, Math.min(W, H) * 0.2, fcx, fcy, Math.max(W, H) * 0.8);
    vg.addColorStop(0, K.rgba(P.hi, 0.0));
    vg.addColorStop(1, K.rgba(P.hi, 0.10));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'k4_foil', draw, traits };
})();
