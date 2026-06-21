/* PLUME2 — curl-noise smoke / ink-in-water, COMPOSITION-FORWARD.
 * Tens of thousands of fine filaments advected through a divergence-free
 * curl-noise field, forming turbulent plumes, vortices and veils of ink.
 * Streams are tinted with thin-film iridescence that shifts along flow
 * arclength so the smoke shimmers like fuel on water. Many translucent
 * passes build density + depth; soft bloom where streams bunch.
 *
 * This revision fixes COMPOSITION (not the turbulence/iridescence, which
 * already read well):
 *  - Every seed has a deliberate FOCAL HIERARCHY: a hero plume/vortex/billow
 *    placed on a golden/thirds anchor, supporting flow around it, intentional
 *    (never dead) negative space.
 *  - DENSITY/CONTRAST FLOOR: bright colorways get extra particle density, a
 *    darker ink mix, and an anchored core bloom + soft-shadow grounding so
 *    they read as vivid, structured pictures — never near-blank squares.
 *  - Real compositional VARIETY: five distinct pictures, not one haze recoloured —
 *    Rising Column, Twin Vortices, Sweeping Current, Central Bloom, Edge Veil.
 * Abstract only — no objects, no scenes. */
window.ENGINE = (function () {
  const K = window.KIT;

  // 7 bright/saturated grounds + 2 dark for range. `iri` = iridescence hue
  // centre (turns) the thin-film spectrum leans toward; `dark` flips blend.
  const PALS = [
    { name: 'Opal Bloom',   bg: '#f4eefb', dark: false, iri: 0.62, sat: 0.78, light: 0.56, ink: '#2c1f50', glow: '#a98cff' },
    { name: 'Lagoon',       bg: '#d8f6f2', dark: false, iri: 0.48, sat: 0.84, light: 0.50, ink: '#063b45', glow: '#21d6c6' },
    { name: 'Coral Mist',   bg: '#ffe9e2', dark: false, iri: 0.02, sat: 0.88, light: 0.54, ink: '#5e1530', glow: '#ff5f88' },
    { name: 'Sherbet',      bg: '#fdf0d8', dark: false, iri: 0.12, sat: 0.90, light: 0.54, ink: '#6a3a0c', glow: '#ff9e2b' },
    { name: 'Iris Field',   bg: '#ece6ff', dark: false, iri: 0.74, sat: 0.82, light: 0.54, ink: '#2c1a5c', glow: '#b673ff' },
    { name: 'Spring Veil',  bg: '#e6f7df', dark: false, iri: 0.34, sat: 0.82, light: 0.50, ink: '#173f12', glow: '#5ad24a' },
    { name: 'Glacier',      bg: '#e2eefb', dark: false, iri: 0.55, sat: 0.80, light: 0.54, ink: '#13294b', glow: '#5aa6ff' },
    { name: 'Obsidian Oil', bg: '#06070e', dark: true,  iri: 0.55, sat: 0.92, light: 0.62, ink: '#cfe6ff', glow: '#36d0ff' },
    { name: 'Nebula Ink',   bg: '#0a0518', dark: true,  iri: 0.78, sat: 0.95, light: 0.64, ink: '#f0d8ff', glow: '#c060ff' },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  const MODES = ['Rising Column', 'Twin Vortices', 'Sweeping Current', 'Central Bloom', 'Edge Veil'];

  function params(r) {
    const pal = K.pick(PALS, r);
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODES, r);
    // Golden / rule-of-thirds focal anchor — biased toward a strong off-centre
    // point so the hero never sits dead-centre except for Central Bloom.
    const thirdsX = K.pick([0.382, 0.5, 0.618], r);
    const thirdsY = K.pick([0.382, 0.5, 0.618], r);
    return {
      pal, fmt, mode,
      density: K.pick(['Wispy', 'Balanced', 'Dense'], r),
      flow: K.pick(['Calm', 'Turbulent', 'Violent'], r),
      thirdsX, thirdsY,
      // numeric knobs (re-derived deterministically below)
      noiseScale: 78 + r() * 80,    // larger = broader swirls
      curlMag: 1.7 + r() * 1.6,     // advection step size
      iriSpan: 0.24 + r() * 0.40,   // how much the thin-film hue travels over a stream
      iriDir: r() < 0.5 ? 1 : -1,
      vortSpin: r() < 0.5 ? 1 : -1, // base spin for vortex modes
    };
  }

  function traits(seed) {
    let p = params(K.rng(seed));
    if (window.FORCE_PAL) {
      const f = PALS.find((q) => q.name === window.FORCE_PAL);
      if (f) p.pal = f;
    }
    return { Palette: p.pal.name, Mode: p.mode, Density: p.density, Flow: p.flow, Format: p.fmt.t };
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const p = params(r);
    if (window.FORCE_PAL) { const f = PALS.find((q) => q.name === window.FORCE_PAL); if (f) p.pal = f; }
    const P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    // a second, slower noise to warp the field over space → less repetitive
    const noise2 = K.makeNoise(seed ^ 0x9e3779b9);
    const minWH = Math.min(W, H);

    // ── focal anchor (where the hero subject lives) ──
    // Central Bloom anchors centre; everything else uses the thirds anchor.
    let fx = W * p.thirdsX, fy = H * p.thirdsY;
    if (p.mode === 'Central Bloom') { fx = W * 0.5; fy = H * 0.5; }
    if (p.mode === 'Rising Column') { fx = W * (p.thirdsX < 0.5 ? 0.40 : 0.60); fy = H * 0.5; }
    // Twin Vortices: two eyes mirrored about centre, vertically thirds-anchored
    const vCY = H * p.thirdsY;
    const vCX1 = W * 0.36, vCX2 = W * 0.64;
    // Sweeping Current: a broad diagonal current crossing the whole frame.
    const sweepDown = p.vortSpin > 0;
    // Anchor the Sweeping Current focal on the centre of the diagonal so the
    // dense spine sits on the hero point, not off in empty space.
    if (p.mode === 'Sweeping Current') { fx = W * 0.5; fy = H * (sweepDown ? 0.52 : 0.48); }

    // ── ground: subtle wash so the hero has somewhere to sit; for bright
    // grounds we darken the lower corner toward ink so the plume grounds. ──
    const g = x.createLinearGradient(0, 0, W * 0.25, H);
    if (P.dark) {
      g.addColorStop(0, K.mix(P.bg, P.glow, 0.10));
      g.addColorStop(0.55, P.bg);
      g.addColorStop(1, K.mix(P.bg, '#000000', 0.45));
    } else {
      g.addColorStop(0, K.mix(P.bg, '#ffffff', 0.32));
      g.addColorStop(0.55, P.bg);
      g.addColorStop(1, K.mix(P.bg, P.ink, 0.16));
    }
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // For bright grounds: a soft anchored shadow under the focal point so the
    // hero reads as a dense mass over the page, not a faint cloud. Grounds the
    // composition and lifts contrast around the subject.
    if (!P.dark) {
      K.softShadow(x, fx, fy, minWH * 0.46, 0.10);
    }

    // ── flow field helper: curl + a warping rotation so plumes feel organic ──
    const NS = p.noiseScale, CM = p.curlMag;
    function field(px, py) {
      const c = K.curl(noise, px / (NS / 100), py / (NS / 100), 1.2);
      const SW = 36; // swirl gain
      const w = noise2.fbm(px / 520, py / 520, 3) * 1.4;
      const ca = Math.cos(w), sa = Math.sin(w);
      let vx = (c[0] * ca - c[1] * sa) * SW;
      let vy = (c[0] * sa + c[1] * ca) * SW;

      if (p.mode === 'Rising Column') {
        // buoyant rise, but the curl swirl is left dominant so the column
        // BILLOWS and mushrooms outward as it climbs (a broad turbulent plume,
        // not a thin stalk). Lift is strong low down; up high it flares as the
        // horizontal pull inverts to a spreading crown.
        const ty = py / H;                       // 1 at bottom, 0 at top
        vy -= 0.58 * (0.5 + ty);                 // buoyant rise, eases near top
        // gentle pull toward axis low down, FLARE outward up high → crown
        const axisPull = (fx - px) / W;
        vx += axisPull * (ty > 0.45 ? 0.45 : -0.55); // gather low, spread high
        vx += Math.sin(py / 150 + px / 80) * 0.40;   // billow waver
      } else if (p.mode === 'Twin Vortices') {
        const a1 = Math.atan2(py - vCY, px - vCX1), a2 = Math.atan2(py - vCY, px - vCX2);
        const sp = p.vortSpin;
        vx += (-Math.sin(a1) + Math.sin(a2)) * 0.85 * sp;
        vy += (Math.cos(a1) - Math.cos(a2)) * 0.85 * sp;
      } else if (p.mode === 'Sweeping Current') {
        // a strong diagonal current → clear directional gesture, but with the
        // curl swirl left dominant enough to throw wisps into the corners so
        // the frame fills (no dead negative space) instead of a clean band.
        vx += 0.62;
        vy += (sweepDown ? 0.40 : -0.40);
        vx += Math.sin(py / 130 + px / 90) * 0.45;   // cross-current waver
        vy += Math.cos(px / 150 + py / 110) * 0.45;
      } else if (p.mode === 'Central Bloom') {
        // outward bloom from centre, damped near a soft radius so the field
        // curls it into a dense central billow with curling petals.
        const dx = px - fx, dy = py - fy;
        const dist = Math.hypot(dx, dy) || 1;
        const falloff = Math.min(1, dist / (minWH * 0.40));
        const push = 0.70 * (1 - falloff * 0.75);
        vx += (dx / dist) * push;
        vy += (dy / dist) * push;
      } else { // Edge Veil — current sweeps in from one edge with a clear
        // density gradient; gentle vertical undulation breaks stripes.
        vx += 0.60;
        vy += Math.sin(px / 180 + py / 260) * 0.40;
      }
      const len = Math.hypot(vx, vy) || 1;
      return [vx / len, vy / len];
    }

    // ── seeding: where particles are born, per mode (focal-anchored) ──
    function seedPoint() {
      if (p.mode === 'Rising Column') {
        // broad base mouth across the lower-third feeding a tall plume that
        // mushrooms upward → a full column with a clear flared base + crown,
        // occupying the whole vertical frame rather than a small teardrop.
        const sx = fx + K.randn(r) * W * 0.22;
        const sy = H * (0.62 + r() * 0.40);
        return [sx, sy];
      }
      if (p.mode === 'Twin Vortices') {
        const left = r() < 0.5;
        const cx = left ? vCX1 : vCX2;
        // tight core + a few outer arms → a readable eye for each vortex
        const rad = (0.02 + Math.pow(r(), 1.5) * 0.30) * minWH;
        const a = r() * Math.PI * 2;
        return [cx + Math.cos(a) * rad, vCY + Math.sin(a) * rad];
      }
      if (p.mode === 'Sweeping Current') {
        // born across a broad upstream band so the current FILLS the frame as
        // a thick sweeping body, not a thin streak. t spans the full entry
        // edge; a wide perpendicular spread + dense spine gives a clear
        // gradient of density across a confident diagonal gesture.
        const t = r();
        const ax = W * (-0.15 + t * 0.72);
        const ay = sweepDown ? H * (-0.15 + t * 0.72) : H * (1.15 - t * 0.72);
        const off = K.randn(r) * minWH * 0.40;   // broad body that fills the frame
        return [ax + off, ay - off];
      }
      if (p.mode === 'Central Bloom') {
        // dense disc around the centre anchor → a full central billow
        const rad = Math.sqrt(r()) * 0.34 * minWH;
        const a = r() * Math.PI * 2;
        return [fx + Math.cos(a) * rad, fy + Math.sin(a) * rad];
      }
      // Edge Veil — born off the left/top edge, weighted so density falls off
      // across the frame (clear gradient of density, intentional empty space).
      return [W * (-0.06 + Math.pow(r(), 1.6) * 0.7), H * (0.04 + r() * 0.92)];
    }

    // ── density tuning. BRIGHT grounds get a higher floor (they need more
    // ink to read against a pale page); dark grounds stay where they sang. ──
    const densMul = p.density === 'Wispy' ? (P.dark ? 0.78 : 1.0) : p.density === 'Dense' ? 1.45 : 1.08;
    const brightFloor = P.dark ? 1.0 : 1.45;   // raise the floor, smartly (~1.45x)
    const flowSteps = p.flow === 'Calm' ? 1.0 : p.flow === 'Violent' ? 1.5 : 1.2;
    const scaleArea = (W * H) / (1400 * 1400);
    const N = Math.floor(3800 * densMul * brightFloor * scaleArea);
    const STEPS = Math.floor(190 * flowSteps);
    const jitter = p.flow === 'Calm' ? 0.10 : p.flow === 'Violent' ? 0.55 : 0.28;

    const margin = minWH * 0.16;
    // Distributed modes (current/veil) read as a spread gesture — gentle focal
    // bias. Concentrated modes (column/vortex/bloom) get a strong hero pull.
    const spread = (p.mode === 'Sweeping Current' || p.mode === 'Edge Veil');
    const focalGain = spread ? 0.35 : 0.9;
    const focalFloor = spread ? 0.75 : 0.55;

    // accumulate where strokes bunch → bloom seeds
    const bloomGrid = {};
    const BG = 64; // bloom cell px

    // ── PASSES: translucent layers, each its own particle set. Bright grounds
    // get a structural multiply pass first for contrast, then glow screens. ──
    const PASSES = 3;
    x.lineCap = 'round';

    for (let pass = 0; pass < PASSES; pass++) {
      if (P.dark) {
        x.globalCompositeOperation = 'lighter';
      } else {
        // pass 0 multiply lays down readable dark structure; later passes
        // screen in the iridescent glow on top → contrast + shimmer.
        x.globalCompositeOperation = pass === 0 ? 'multiply' : 'screen';
      }
      const passAlpha = (P.dark ? 0.055 : (pass === 0 ? 0.115 : 0.075)) * (pass === 0 ? 1 : 0.78);
      const passWidth = (P.dark ? 1.0 : 1.2) * (pass === 0 ? 1.0 : 0.82);

      const count = Math.floor(N * (pass === 0 ? 1.0 : 0.72));
      for (let i = 0; i < count; i++) {
        let [px, py] = seedPoint();
        const phase0 = P.iri + (r() - 0.5) * 0.5;
        const span = p.iriSpan * p.iriDir;
        const life = STEPS + K.rint(r, -30, 30);
        let prevx = px, prevy = py;
        let arc = 0;
        const lw = passWidth * (0.5 + r() * 1.3);

        for (let s = 0; s < life; s++) {
          const [vx, vy] = field(px, py);
          const jx = vx + (r() - 0.5) * jitter;
          const jy = vy + (r() - 0.5) * jitter;
          const nx = px + jx * CM;
          const ny = py + jy * CM;
          arc += CM;

          if (nx < -margin || nx > W + margin || ny < -margin || ny > H + margin) break;

          // iridescent colour shifts along arclength
          const phase = phase0 + (arc / (STEPS * CM)) * span;
          let col = K.iridescent(phase, P.sat, P.light);
          if (P.dark) {
            col = K.mix(col, P.glow, 0.18);
          } else {
            // structural pass leans hard toward ink for contrast against the
            // pale ground; glow passes carry the colorway hue + shimmer.
            col = K.mix(col, P.glow, 0.22);
            col = K.mix(col, P.ink, pass === 0 ? 0.42 : 0.20);
          }

          // fade in at birth, fade out at death → wispy ends
          const t = s / life;
          const env = Math.sin(Math.min(1, t * 3)) * (1 - t * t * 0.85);
          // FOCAL EMPHASIS: strokes nearer the focal anchor get more opacity
          // so the hero is denser/sharper than the supporting flow.
          const fd = Math.hypot(nx - fx, ny - fy) / minWH;
          const focal = K.clamp(1.35 - fd * focalGain, focalFloor, 1.35);
          const a = passAlpha * (0.5 + env) * focal;

          x.strokeStyle = K.rgba(col, a);
          x.lineWidth = lw;
          x.beginPath();
          x.moveTo(prevx, prevy);
          x.lineTo(nx, ny);
          x.stroke();

          if ((s & 7) === 0) {
            const gx = Math.floor(nx / BG), gy = Math.floor(ny / BG);
            const key = gx + ',' + gy;
            const e = bloomGrid[key] || (bloomGrid[key] = { n: 0, cx: 0, cy: 0, col });
            e.n++; e.cx += nx; e.cy += ny; e.col = col;
          }

          prevx = px = nx; prevy = py = ny;
        }
      }
    }

    // ── CORE bloom at the focal anchor: a soft, contained luminous heart that
    // gives every seed (esp. bright ones) a clear focal subject. Restrained so
    // it reads as a glowing core, not a blown-out sun. ──
    {
      const coreCol = P.dark ? K.mix(P.glow, '#ffffff', 0.25) : K.mix(P.glow, P.ink, 0.20);
      if (p.mode === 'Twin Vortices') {
        K.bloom(x, vCX1, vCY, minWH * 0.16, coreCol, P.dark ? 0.10 : 0.07);
        K.bloom(x, vCX2, vCY, minWH * 0.16, coreCol, P.dark ? 0.10 : 0.07);
      } else {
        K.bloom(x, fx, fy, minWH * 0.20, coreCol, P.dark ? 0.11 : 0.075);
      }
    }

    // ── soft bloom where streams bunched up (sheen on dense knots) ──
    const cells = Object.values(bloomGrid).filter((e) => e.n >= 16).sort((a, b) => b.n - a.n);
    const topN = Math.min(cells.length, P.dark ? 30 : 26);
    for (let i = 0; i < topN; i++) {
      const e = cells[i];
      const cx = e.cx / e.n, cy = e.cy / e.n;
      const rad = BG * (0.7 + Math.min(1.2, e.n / 40));
      const bc = P.dark ? K.mix(e.col, '#ffffff', 0.30) : K.mix(e.col, '#ffffff', 0.40);
      K.bloom(x, cx, cy, rad, bc, P.dark ? 0.055 : 0.034);
    }

    // ── a few tiny specular sheen lobes (the headline gloss) on top knots ──
    for (let i = 0; i < Math.min(topN, 6); i++) {
      const e = cells[i]; if (!e) break;
      const cx = e.cx / e.n, cy = e.cy / e.n;
      K.sheen(x, cx - BG * 0.2, cy - BG * 0.2, BG * 0.7, '#ffffff', P.dark ? 0.06 : 0.045);
    }

    // ── atmospheric finish: haze veil, grain, vignette ──
    K.hazeSheet(x, W, H, noise, P.glow, P.dark ? 0.16 : 0.12, 190, P.dark ? 'screen' : 'soft-light');
    K.hazeSheet(x, W, H, noise2, K.iridescent(P.iri + 0.3, 0.7, 0.6), 0.07, 320, P.dark ? 'screen' : 'soft-light');
    K.grain(x, W, H, P.dark ? 520 : 700, r);
    // slightly stronger vignette on bright grounds focuses the eye on the hero
    K.vignette(x, W, H, P.dark ? 0.42 : 0.26);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'plume2', draw, traits };
})();
