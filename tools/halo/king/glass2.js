/* GLASS2 — molten / cut luminous glass with caustic refraction, REBUILT AS A SYSTEM
 *
 * The original p_glass had a beautiful refraction engine but ONE composition:
 * a single glass mass pooled off-centre, every seed the same blob recolored.
 * glass2 keeps the entire glass technique (Beer–Lambert transmitted colour,
 * overlapping-glass multiply lensing, caustic ribbons, cut-edge speculars,
 * bright back-lit grounds, bespoke saturated palettes) but makes COMPOSITION the
 * primary trait. A `Layout` axis selects one of EIGHT structurally distinct ways
 * glass occupies the frame — each builds a DIFFERENT set of forms (count, scale,
 * placement, rotation), so every seed is a genuinely different artwork.
 *
 *   FORMS model: instead of one fixed focal mass, each layout produces a LIST of
 *   glass forms { x,y,rx,ry,rot,squash,hue,sharp,freq }. thickness(u,v) is the
 *   max-blended height over all forms (overlaps add → thicker glass → lensing).
 *   Everything downstream (transmission, caustics, speculars) just reads the
 *   field, so the technique is identical; only the field's SHAPE changes.
 *
 *   Layouts:
 *     Solitaire — one hero form, OFF-CENTRE on a thirds point, big shaped void.
 *     Pair      — two forms of unequal weight in tension.
 *     Scatter   — a constellation of many small shards, varied size, asymmetric.
 *     Cluster   — a dense crowded overlapping group off to one side (max lensing).
 *     Cascade   — forms strung along a diagonal/curve, edge to edge, full-bleed.
 *     Shoal     — many forms of widely varied scale filling most of the frame.
 *     Edge      — large forms entering from one or two edges, cropped, full-bleed.
 *     Strata    — horizontal-ish elongated slabs stacked like poured layers.
 *
 * Coarse grid for the field (fast). Bounded chromaSplit. Canvas long edge ≤ 1280.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── BESPOKE GLASS PALETTE SET (unchanged from p_glass) ──────────────────────
  //   body    — transmitted colour through thin glass (the lit body)
  //   deep    — pooled transmitted colour through THICK glass (saturated, not black)
  //   caustic — the bright refracted light-band hue (complementary split)
  //   field   — calm shaped negative pool (a quiet relative of body)
  //   glint   — cut-edge specular catch (near-white, faintly tinted)
  const PALS = [
    { name: 'Amber Caustic',   body: '#ffae2b', deep: '#c2530a', caustic: '#2af0ff', field: '#ffd98a', glint: '#fff6dc' },
    { name: 'Cobalt Gold',     body: '#2f6bff', deep: '#16216e', caustic: '#ffd23f', field: '#7ea6ff', glint: '#eaf2ff' },
    { name: 'Rose Teal',       body: '#ff5ea0', deep: '#a81f6e', caustic: '#3fffd0', field: '#ff9cc4', glint: '#ffe9f3' },
    { name: 'Emerald Magenta', body: '#1fd089', deep: '#076648', caustic: '#ff3df0', field: '#7af0c2', glint: '#e2fff0' },
    { name: 'Viridian Coral',  body: '#12c0c4', deep: '#075c70', caustic: '#ff8a4d', field: '#79e8ec', glint: '#dffaff' },
    { name: 'Violet Citrus',   body: '#9b4dff', deep: '#4a1a8e', caustic: '#caff39', field: '#c79cff', glint: '#f1e6ff' },
    { name: 'Tangerine Cobalt',body: '#ff7a2b', deep: '#b53e0c', caustic: '#3f8aff', field: '#ffb27a', glint: '#fff0dc' },
    { name: 'Aqua Ember',      body: '#2bd6ff', deep: '#0a5e8a', caustic: '#ff4f7a', field: '#9ceaff', glint: '#e6fbff' },
  ];

  // varied aspect — portrait / landscape / square (square the minority). ≤1280.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1024, H: 1536, t: 'Tall' },       // 2:3
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.48 ? FMTS[1] : x < 0.70 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  const STATE = ['Molten', 'Cut', 'Poured'];          // surface character of the glass
  const CAUST = ['Ribbon', 'Lattice', 'Scatter'];     // caustic band geometry
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','Caustic Supernova','Prism Split'];

  // THE PRIMARY STRUCTURAL AXIS.
  const LAYOUTS = ['Solitaire', 'Pair', 'Scatter', 'Cluster', 'Cascade', 'Shoal', 'Edge', 'Strata'];

  const PHI = 0.382, IPHI = 0.618;
  function thirds(r) { return r() < 0.5 ? 0.34 : 0.66; }

  // Build a single glass form with sane defaults; overrides via opts.
  function form(x, y, rx, ry, opts) {
    opts = opts || {};
    return {
      x, y, rx, ry,
      rot: opts.rot != null ? opts.rot : 0,
      hue: opts.hue != null ? opts.hue : 0.5,   // body↔caustic transmitted tint
      sharp: opts.sharp != null ? opts.sharp : 1.5,
      freq: opts.freq != null ? opts.freq : 2.0,
      amp: opts.amp != null ? opts.amp : 1.0,   // thickness weight of this form
    };
  }

  // ── LAYOUT BUILDERS — each returns { forms[], focal{x,y}, void{x,y} } ───────
  // focal = where the bloom/hero caustic streak seats; void = calm field centre.
  function buildLayout(layout, r, state, fmt) {
    const forms = [];
    const square = fmt.t === 'Square';
    const baseFreq = state === 'Cut' ? 2.6 + r() * 1.4 : state === 'Poured' ? 1.1 + r() * 0.7 : 1.7 + r() * 0.9;
    const baseSharp = state === 'Cut' ? 2.6 : state === 'Poured' ? 1.0 : 1.5;
    const fr = (base) => base * (square ? 0.85 : 1);

    if (layout === 'Solitaire') {
      // one hero, off-centre on a thirds point, big shaped negative space
      const fx = thirds(r), fy = thirds(r);
      const rad = fr(0.26 + r() * 0.1);
      const sq = 0.7 + r() * 0.6;
      forms.push(form(fx, fy, rad, rad * sq, { rot: (r() - 0.5) * 1.6, hue: r(), sharp: baseSharp, freq: baseFreq, amp: 1.0 }));
      // one tiny satellite far across for asymmetric counterweight (optional)
      if (r() < 0.6) {
        forms.push(form(K.clamp(1 - fx + (r() - 0.5) * 0.2, 0.1, 0.9), K.clamp(1 - fy + (r() - 0.5) * 0.2, 0.1, 0.9),
          fr(0.05 + r() * 0.05), fr(0.05 + r() * 0.05), { rot: r() * 3, hue: r(), sharp: baseSharp, freq: baseFreq, amp: 0.55 }));
      }
      return { forms, focal: { x: fx, y: fy }, vd: { x: 1 - fx, y: 1 - fy } };
    }

    if (layout === 'Pair') {
      // two forms, unequal weight, in tension across the frame
      const onLeft = r() < 0.5;
      const ax = onLeft ? 0.30 + r() * 0.06 : 0.70 - r() * 0.06;
      const ay = thirds(r);
      const bx = onLeft ? 0.68 + r() * 0.06 : 0.32 - r() * 0.06;
      const by = K.clamp(1 - ay + (r() - 0.5) * 0.3, 0.2, 0.8);
      const big = fr(0.24 + r() * 0.08), small = fr(0.12 + r() * 0.06);
      forms.push(form(ax, ay, big, big * (0.7 + r() * 0.5), { rot: (r() - 0.5) * 1.6, hue: r(), sharp: baseSharp, freq: baseFreq, amp: 1.0 }));
      forms.push(form(bx, by, small, small * (0.7 + r() * 0.5), { rot: (r() - 0.5) * 1.8, hue: r(), sharp: baseSharp, freq: baseFreq * 1.1, amp: 0.85 }));
      return { forms, focal: { x: ax, y: ay }, vd: { x: (ax + bx) / 2 > 0.5 ? 0.18 : 0.82, y: 0.5 } };
    }

    if (layout === 'Scatter') {
      // constellation of many small shards on phi/thirds points, asymmetric
      const pts = [];
      const xs = [PHI, IPHI, 1 / 3, 2 / 3, 0.5];
      const ys = [PHI, IPHI, 1 / 3, 2 / 3, 0.5];
      for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      const n = K.rint(r, 6, 11);
      let fx = 0.5, fy = 0.5, maxr = 0;
      for (let i = 0; i < n; i++) {
        const [ax, ay] = pts[i % pts.length];
        const px = K.clamp(ax + (r() - 0.5) * 0.1, 0.08, 0.92);
        const py = K.clamp(ay + (r() - 0.5) * 0.1, 0.08, 0.92);
        const rad = fr(0.05 + Math.pow(r(), 1.6) * 0.14);   // mostly small, a few bigger
        if (rad > maxr) { maxr = rad; fx = px; fy = py; }
        forms.push(form(px, py, rad, rad * (0.7 + r() * 0.6), { rot: r() * 3.14, hue: r(), sharp: baseSharp, freq: baseFreq * (0.9 + r() * 0.4), amp: 1.0 + r() * 0.3 }));
      }
      return { forms, focal: { x: fx, y: fy }, vd: { x: 1 - fx, y: 1 - fy } };
    }

    if (layout === 'Cluster') {
      // dense crowded overlapping group off to one side → maximum lensing mix
      const cx = r() < 0.5 ? 0.33 : 0.67, cy = thirds(r);
      const spread = 0.16 + r() * 0.08;
      const n = K.rint(r, 7, 12);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * spread;
        const px = K.clamp(cx + Math.cos(a) * d, 0.1, 0.9);
        const py = K.clamp(cy + Math.sin(a) * d * 1.05, 0.1, 0.9);
        const rad = fr(0.08 + r() * 0.1);
        forms.push(form(px, py, rad, rad * (0.7 + r() * 0.5), { rot: r() * 3.14, hue: r(), sharp: baseSharp, freq: baseFreq, amp: 0.95 + r() * 0.3 }));
      }
      return { forms, focal: { x: cx, y: cy }, vd: { x: 1 - cx, y: 1 - cy } };
    }

    if (layout === 'Cascade') {
      // forms strung along a diagonal/curve, edge to edge, full-bleed
      const dir = r() < 0.5 ? 1 : -1;            // \ or /
      const n = K.rint(r, 5, 8);
      const bend = (r() - 0.5) * 0.5;            // curve amount
      let fx = 0.5, fy = 0.5, maxr = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const px = -0.05 + t * 1.1;
        let py = dir > 0 ? 0.05 + t * 0.9 : 0.95 - t * 0.9;
        py += Math.sin(t * Math.PI) * bend;
        py = K.clamp(py, -0.05, 1.05);
        const rad = fr(0.08 + (0.5 + 0.5 * Math.sin(t * Math.PI + r())) * 0.12);
        if (rad > maxr) { maxr = rad; fx = K.clamp(px, 0.1, 0.9); fy = K.clamp(py, 0.1, 0.9); }
        forms.push(form(px, py, rad, rad * (0.6 + r() * 0.6), { rot: (dir > 0 ? 0.7 : -0.7) + (r() - 0.5) * 0.6, hue: t, sharp: baseSharp, freq: baseFreq, amp: 0.7 + r() * 0.4 }));
      }
      return { forms, focal: { x: fx, y: fy }, vd: { x: dir > 0 ? 0.85 : 0.15, y: dir > 0 ? 0.15 : 0.85 } };
    }

    if (layout === 'Shoal') {
      // many forms, WIDELY varied scale, filling most of the frame (epic busy)
      const n = K.rint(r, 11, 18);
      let fx = 0.5, fy = 0.5, maxr = 0;
      for (let i = 0; i < n; i++) {
        const px = 0.08 + r() * 0.84;
        const py = 0.08 + r() * 0.84;
        // power distribution → a few big, many small (focal hierarchy among many)
        const rad = fr(0.05 + Math.pow(r(), 2.2) * 0.22);
        if (rad > maxr) { maxr = rad; fx = px; fy = py; }
        forms.push(form(px, py, rad, rad * (0.6 + r() * 0.7), { rot: r() * 3.14, hue: r(), sharp: baseSharp, freq: baseFreq * (0.85 + r() * 0.5), amp: 0.9 + r() * 0.35 }));
      }
      return { forms, focal: { x: fx, y: fy }, vd: { x: 1 - fx, y: 1 - fy } };
    }

    if (layout === 'Edge') {
      // large forms entering from one or two edges, cropped, full-bleed
      const edges = K.shuffle([0, 1, 2, 3], r).slice(0, r() < 0.5 ? 1 : 2);
      let fx = 0.5, fy = 0.5, maxr = 0;
      for (const e of edges) {
        const rad = fr(0.22 + r() * 0.12);
        let px, py;
        if (e === 0) { px = 0.02 + r() * 0.1; py = 0.2 + r() * 0.6; }
        else if (e === 1) { px = 0.88 + r() * 0.1; py = 0.2 + r() * 0.6; }
        else if (e === 2) { px = 0.2 + r() * 0.6; py = 0.02 + r() * 0.1; }
        else { px = 0.2 + r() * 0.6; py = 0.88 + r() * 0.1; }
        if (rad > maxr) { maxr = rad; fx = K.clamp(px, 0.15, 0.85); fy = K.clamp(py, 0.15, 0.85); }
        forms.push(form(px, py, rad, rad * (0.8 + r() * 0.5), { rot: (r() - 0.5) * 1.4, hue: r(), sharp: baseSharp, freq: baseFreq, amp: 1.0 }));
        // a small interior echo
        if (r() < 0.7) forms.push(form(K.clamp(px + (0.5 - px) * (0.4 + r() * 0.3), 0.1, 0.9), K.clamp(py + (0.5 - py) * (0.4 + r() * 0.3), 0.1, 0.9),
          fr(0.06 + r() * 0.06), fr(0.06 + r() * 0.06), { rot: r() * 3, hue: r(), sharp: baseSharp, freq: baseFreq, amp: 0.6 }));
      }
      return { forms, focal: { x: fx, y: fy }, vd: { x: 1 - fx, y: 1 - fy } };
    }

    // Strata — wide elongated slabs stacked like poured layers (a horizon).
    const n = K.rint(r, 4, 6);
    const lean = (r() - 0.5) * 0.5;           // overall tilt of the whole stack
    let fy = 0.5, fyi = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const py = 0.12 + t * 0.76 + (r() - 0.5) * 0.03;
      const px = K.clamp(0.5 + lean * (t - 0.5) * 2 + (r() - 0.5) * 0.08, 0.32, 0.68);
      const rx = fr(0.42 + r() * 0.16), ry = fr(0.075 + r() * 0.045);  // WIDE slab
      if (i === fyi) fy = py;
      forms.push(form(px, py, rx, ry, { rot: lean * 0.4 + (r() - 0.5) * 0.12, hue: t, sharp: baseSharp, freq: baseFreq * (0.8 + r() * 0.3), amp: 0.9 + r() * 0.3 }));
    }
    return { forms, focal: { x: 0.5, y: fy }, vd: { x: 0.5, y: 0.08 } };
  }

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const layout = K.pick(LAYOUTS, r);
    const state = K.pick(STATE, r);
    const caust = K.pick(CAUST, r);
    const event = K.pick(EVENTS, r);

    // diagonal of the refracted light energy (edge-to-edge)
    const ang = (r() < 0.5 ? -0.62 : 0.7) + (r() - 0.5) * 0.5;
    const warp = 0.55 + r() * 0.65;                       // domain-warp strength
    const thick = 0.85 + r() * 0.5;                       // overall glass thickness
    const causFreq = caust === 'Lattice' ? 9 + r() * 6 : caust === 'Scatter' ? 5 + r() * 4 : 6 + r() * 3;
    const causPow  = caust === 'Ribbon' ? 7 : caust === 'Lattice' ? 5 : 9;  // band tightness

    const L = buildLayout(layout, r, state, fmt);

    return {
      pal, fmt, layout, state, caust, event, ang, warp, thick, causFreq, causPow,
      forms: L.forms, fx: L.focal.x, fy: L.focal.y, vx: L.vd.x, vy: L.vd.y,
    };
  }

  function countBand(n) { return n <= 1 ? 'Single' : n === 2 ? 'Pair' : n <= 6 ? 'Few' : n <= 12 ? 'Many' : 'Swarm'; }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Layout: p.layout,
      Format: p.fmt.t,
      Count: countBand(p.forms.length),
      Glass: p.state,
      Caustic: p.caust,
      Event: p.event,
    };
  }

  // ── thickness / height of the molten glass body at normalised (u,v) ──
  // domain-warped fbm, max-blended over ALL forms (overlaps ADD → thicker glass).
  function thickness(noise, u, v, p) {
    const wx = noise.fbm(u * 1.3 + 3.1, v * 1.3 + 1.7, 4) * p.warp;
    const wy = noise.fbm(u * 1.3 + 7.4, v * 1.3 + 9.2, 4) * p.warp;
    const uu = u + wx * 0.32, vv = v + wy * 0.32;
    let h = 0;
    for (const f of p.forms) {
      // anisotropic, rotated radial pooling per form
      let dx = uu - f.x, dy = vv - f.y;
      const c = Math.cos(f.rot), s = Math.sin(f.rot);
      const rxn = (dx * c + dy * s) / f.rx;
      const ryn = (-dx * s + dy * c) / f.ry;
      const d = Math.sqrt(rxn * rxn + ryn * ryn);
      let mass = K.clamp(1 - d, 0, 1);
      mass = mass * mass * (3 - 2 * mass);                 // smoothstep falloff
      if (mass <= 0) continue;
      let body = noise.fbm(uu * f.freq, vv * f.freq, 4) * 0.5 + 0.5;
      body = Math.pow(body, 1 / f.sharp);
      body += 0.15 * (noise.fbm(uu * f.freq * 2.0, vv * f.freq * 2.0, 3) * 0.5 + 0.5);
      // small forms must still read as THICK coloured glass, not pale ghosts —
      // a presence floor lifts the minimum body height so every shard saturates.
      h += mass * (0.85 + 0.55 * body) * p.thick * f.amp;  // ADD → overlaps thicken
    }
    return h;
  }

  // caustic intensity — thin bright ribbons from the warped phase along the diagonal
  function caustic(noise, u, v, p, slope) {
    const c = Math.cos(p.ang), s = Math.sin(p.ang);
    const ru = u * c - v * s;
    const warp = noise.fbm(u * 1.6 + 5.5, v * 1.6 + 2.2, 4) * 0.9;
    const ph = (ru + warp) * p.causFreq + slope * 2.2;
    let band = Math.abs(Math.sin(ph * Math.PI));
    band = Math.pow(band, p.causPow);
    if (p.caust === 'Lattice') {
      const rv = u * s + v * c;
      const ph2 = (rv + warp * 0.7) * p.causFreq;
      band = Math.max(band, Math.pow(Math.abs(Math.sin(ph2 * Math.PI)), p.causPow));
    }
    return band;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal;
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    const lit   = K.mix(P.body, P.glint, 0.14);
    const fieldDeep = K.mix(P.field, P.deep, 0.30);

    // ── 1. LUMINOUS GROUND — calm transmitted-light field, brightest behind the
    //   focal form so glass reads BACK-LIT. Never a void. ──
    const fcx = p.fx * W, fcy = p.fy * H;
    const gg = x.createRadialGradient(fcx, fcy, 0, fcx, fcy, Math.max(W, H) * 0.95);
    gg.addColorStop(0, K.mix(P.field, P.glint, 0.34));
    gg.addColorStop(0.42, P.field);
    gg.addColorStop(1, fieldDeep);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // a wash of the calm pool settling in the shaped negative space
    const ncx = p.vx * W, ncy = p.vy * H;
    const cg = x.createRadialGradient(ncx, ncy, 0, ncx, ncy, Math.max(W, H) * 0.6);
    cg.addColorStop(0, K.rgba(fieldDeep, 0.5));
    cg.addColorStop(1, K.rgba(P.field, 0));
    x.fillStyle = cg; x.fillRect(0, 0, W, H);

    // ── 2. THE GLASS BODY — coarse grid. Beer–Lambert transmitted colour, pushed
    //   toward the caustic hue where the glass bends. ──
    const step = Math.max(3, Math.floor(Math.min(W, H) / 300));
    const du = 0.004, dv = 0.004;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += step) {
        const u = xx / W;
        const h  = thickness(noise, u, v, p);
        if (h < 0.04) continue;
        const hu = thickness(noise, u + du, v, p) - h;
        const hv = thickness(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;

        // saturate FAST so even thin shards read as the body hue (not white);
        // thick troughs still pool into the deep jewel core.
        const t = K.clamp(h / 1.2, 0, 1);
        let col = K.mix(lit, P.body, K.clamp(t * 4.5, 0, 1));
        col = K.mix(col, P.deep, K.clamp(t * t * 1.05, 0, 0.92));
        const refr = K.clamp(slope * 0.14, 0, 0.32);
        col = K.mix(col, P.caustic, refr * 0.3);

        const a = K.clamp(0.6 + t * 0.4, 0, 1);
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(col, a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();

    // ── 3. OVERLAPPING-GLASS LENSING — each form casts a MULTIPLY lens tint so
    //   where forms overlap their colours mix into new, deeper hues. ──
    x.save();
    x.globalCompositeOperation = 'multiply';
    for (const f of p.forms) {
      const bx = f.x * W, by = f.y * H;
      const br = Math.max(f.rx, f.ry) * Math.max(W, H) * 1.15;
      const tint = K.mix(P.body, P.caustic, f.hue * 0.55);
      const bg = x.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, K.rgba(K.mix('#ffffff', tint, 0.32), 1));
      bg.addColorStop(0.5, K.rgba(K.mix('#ffffff', tint, 0.16), 1));
      bg.addColorStop(1, 'rgba(255,255,255,1)');
      x.fillStyle = bg; x.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    x.restore();

    // ── 4. CAUSTIC BANDS — bright additive ribbons of refracted light. ──
    if (!window.SKIP_CAUSTIC) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const cstep = Math.max(3, Math.floor(Math.min(W, H) / 320));
    for (let yy = 0; yy < H; yy += cstep) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += cstep) {
        const u = xx / W;
        const h = thickness(noise, u, v, p);
        if (h < 0.06) continue;
        const hu = thickness(noise, u + du, v, p) - h;
        const hv = thickness(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        const band = caustic(noise, u, v, p, slope);
        if (band < 0.3) continue;
        const amt = K.clamp(band * (0.18 + slope * 0.1) * K.clamp(h, 0, 1.2), 0, 0.32);
        const cc = K.mix(P.caustic, P.glint, K.clamp((band - 0.88) * 4, 0, 0.85));
        x.fillStyle = K.rgba(cc, amt);
        x.fillRect(xx, yy, cstep + 1, cstep + 1);
      }
    }
    x.restore();
    }

    // ── 5. CUT-EDGE SPECULAR — crisp bright glints where slope is steepest. ──
    if (!window.SKIP_SPEC) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const estep = Math.max(2, Math.floor(Math.min(W, H) / 340));
    for (let yy = 0; yy < H; yy += estep) {
      const v = yy / H;
      for (let xx = 0; xx < W; xx += estep) {
        const u = xx / W;
        const h = thickness(noise, u, v, p);
        if (h < 0.05) continue;
        const hu = thickness(noise, u + du, v, p) - h;
        const hv = thickness(noise, u, v + dv, p) - h;
        const slope = Math.sqrt(hu * hu + hv * hv) / du;
        if (slope < 4.8) continue;
        const gl = K.clamp((slope - 4.8) * 0.07, 0, 0.34);
        x.fillStyle = K.rgba(K.mix(P.caustic, P.glint, 0.55), gl);
        x.fillRect(xx, yy, estep + 1, estep + 1);
        if (slope > 7.5) {
          x.fillStyle = K.rgba(P.glint, K.clamp((slope - 7.5) * 0.06, 0, 0.32));
          x.fillRect(xx, yy, estep + 1, estep + 1);
        }
      }
    }
    x.restore();
    }

    // ── 6. FOCAL LENSING BLOOM + caustic diagonal hero streak ──
    K.bloom(x, fcx, fcy, Math.max(W, H) * 0.24, K.mix(P.body, P.caustic, 0.4), 0.08);
    K.sheen(x, fcx, fcy, Math.max(W, H) * 0.1, P.glint, 0.12);
    // a hero caustic ribbon sweeping edge-to-edge through the focal on the diagonal
    x.save(); x.globalCompositeOperation = 'lighter';
    const hsegs = 90, hlen = Math.max(W, H) * (1.1 + r() * 0.3);
    for (let band = 0; band < 3; band++) {
      const off = (band - 1) * 16;
      x.lineWidth = (3 - band) * 1.8;
      const bandCol = band === 1 ? K.mix(P.caustic, P.glint, 0.6) : K.mix(P.caustic, P.glint, 0.3);
      x.strokeStyle = K.rgba(bandCol, 0.13 - band * 0.035);
      x.beginPath();
      for (let sI = 0; sI <= hsegs; sI++) {
        const tt = sI / hsegs;
        const along = (tt - 0.5) * hlen;
        const wob = Math.sin(tt * Math.PI * (3 + r() * 2)) * 22 * Math.sin(tt * Math.PI);
        const px = fcx + Math.cos(p.ang) * along - Math.sin(p.ang) * (wob + off);
        const py = fcy + Math.sin(p.ang) * along + Math.cos(p.ang) * (wob + off);
        sI === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();

    // ── 7. LIGHT-LEAK from an edge + counter-weight glint in the negative space ──
    const leakSide = r();
    const lkx = leakSide < 0.5 ? -W * 0.05 : W * 1.05;
    const lky = H * (0.15 + r() * 0.7);
    K.bloom(x, lkx, lky, Math.max(W, H) * 0.45, K.mix(P.caustic, P.glint, 0.5), 0.13);
    const ogx = p.vx * W + (r() - 0.5) * 0.1 * W;
    const ogy = p.vy * H + (r() - 0.5) * 0.1 * H;
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.05, P.glint, 0.4);
    K.bloom(x, ogx, ogy, Math.max(W, H) * 0.12, K.mix(P.caustic, P.glint, 0.3), 0.14);

    // ── 8. RARE CHASE EVENTS ──
    if (p.event === 'Caustic Supernova') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const rays = 120, maxR = Math.max(W, H) * 1.05;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + noise.fbm(i * 0.3, 0, 3);
        const len = maxR * (0.4 + (noise.fbm(i * 0.7, 5, 3) * 0.5 + 0.5) * 0.6);
        const cc = K.mix(P.caustic, P.glint, (i % 3) / 3);
        x.strokeStyle = K.rgba(cc, 0.10);
        x.lineWidth = 1 + (i % 4) * 0.6;
        x.beginPath(); x.moveTo(fcx, fcy);
        x.lineTo(fcx + Math.cos(a) * len, fcy + Math.sin(a) * len);
        x.stroke();
      }
      K.bloom(x, fcx, fcy, Math.max(W, H) * 0.3, P.glint, 0.3);
      x.restore();
    } else if (p.event === 'Prism Split') {
      x.save();
      x.translate(fcx, fcy); x.rotate(p.ang);
      const pw = Math.max(W, H) * 0.5, ph = Math.max(W, H) * 0.12;
      x.globalCompositeOperation = 'lighter';
      const spec = [P.caustic, P.glint, P.body, P.caustic];
      for (let i = 0; i < spec.length; i++) {
        const oy = (i - spec.length / 2) * ph * 0.5;
        const g = x.createLinearGradient(-pw / 2, 0, pw / 2, 0);
        g.addColorStop(0, K.rgba(spec[i], 0)); g.addColorStop(0.5, K.rgba(spec[i], 0.4)); g.addColorStop(1, K.rgba(spec[i], 0));
        x.fillStyle = g; x.fillRect(-pw / 2, oy - ph * 0.3, pw, ph * 0.6);
      }
      x.restore();
    }

    // ── 9. FILMIC FINISH — refractive edge shimmer, grain, coloured depth. ──
    K.chromaSplit(x, W, H, 2);
    K.grain(x, W, H, 820, r);
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(fcx, fcy, Math.min(W, H) * 0.2, fcx, fcy, Math.max(W, H) * 0.9);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix(P.deep, '#ffffff', 0.5), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'glass2', draw, traits };
})();
