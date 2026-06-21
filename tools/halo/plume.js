/* PLUME — curl-noise smoke / ink-in-water.
 * Tens of thousands of fine filaments advected through a divergence-free
 * curl-noise field, forming turbulent plumes, vortices and veils of haze.
 * Streams are tinted with thin-film iridescence that shifts along flow
 * arclength so the smoke shimmers like fuel on water. Many translucent
 * passes build density + depth; soft bloom where streams bunch.
 * Modes per seed: Rising Plume / Twin Vortices / Drift Veil / Radial Burst.
 * Abstract only — no objects, no scenes. */
window.ENGINE = (function () {
  const K = window.KIT;

  // 7 bright/saturated grounds + 2 dark for range. `iri` = iridescence hue
  // centre (turns) the thin-film spectrum leans toward; `dark` flips blend.
  const PALS = [
    { name: 'Opal Bloom',   bg: '#f4eefb', dark: false, iri: 0.62, sat: 0.78, light: 0.58, ink: '#3a2d5e', glow: '#a98cff' },
    { name: 'Lagoon',       bg: '#d8f6f2', dark: false, iri: 0.48, sat: 0.82, light: 0.55, ink: '#0d4a55', glow: '#36e6d6' },
    { name: 'Coral Mist',   bg: '#ffe9e2', dark: false, iri: 0.02, sat: 0.85, light: 0.60, ink: '#6e2438', glow: '#ff7a9c' },
    { name: 'Sherbet',      bg: '#fdf0d8', dark: false, iri: 0.12, sat: 0.88, light: 0.60, ink: '#7a4a16', glow: '#ffb24d' },
    { name: 'Iris Field',   bg: '#ece6ff', dark: false, iri: 0.74, sat: 0.80, light: 0.58, ink: '#3b2670', glow: '#c08cff' },
    { name: 'Spring Veil',  bg: '#e6f7df', dark: false, iri: 0.34, sat: 0.80, light: 0.55, ink: '#26521f', glow: '#7ee06a' },
    { name: 'Glacier',      bg: '#e2eefb', dark: false, iri: 0.55, sat: 0.78, light: 0.60, ink: '#1f3a63', glow: '#79b8ff' },
    { name: 'Obsidian Oil', bg: '#06070e', dark: true,  iri: 0.55, sat: 0.92, light: 0.62, ink: '#cfe6ff', glow: '#36d0ff' },
    { name: 'Nebula Ink',   bg: '#0a0518', dark: true,  iri: 0.78, sat: 0.95, light: 0.64, ink: '#f0d8ff', glow: '#c060ff' },
  ];

  const FMTS = [
    { W: 1400, H: 1400, t: 'Square' },
    { W: 1500, H: 1120, t: 'Landscape' },
    { W: 1120, H: 1500, t: 'Portrait' },
  ];

  const MODES = ['Rising Plume', 'Twin Vortices', 'Drift Veil', 'Radial Burst'];

  function params(r) {
    const pal = K.pick(PALS, r);
    const fmt = K.pick(FMTS, r);
    const mode = K.pick(MODES, r);
    return {
      pal, fmt, mode,
      density: K.pick(['Wispy', 'Balanced', 'Dense'], r),
      flow: K.pick(['Calm', 'Turbulent', 'Violent'], r),
      // numeric knobs (re-derived deterministically below)
      noiseScale: 80 + r() * 90,    // larger = broader swirls
      curlMag: 1.6 + r() * 1.8,     // advection step size
      iriSpan: 0.22 + r() * 0.40,   // how much the thin-film hue travels over a stream
      iriDir: r() < 0.5 ? 1 : -1,
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

    // ── ground: subtle vertical wash so smoke has somewhere to sit ──
    const g = x.createLinearGradient(0, 0, W * 0.25, H);
    if (P.dark) {
      g.addColorStop(0, K.mix(P.bg, P.glow, 0.10));
      g.addColorStop(0.55, P.bg);
      g.addColorStop(1, K.mix(P.bg, '#000000', 0.45));
    } else {
      g.addColorStop(0, K.mix(P.bg, '#ffffff', 0.30));
      g.addColorStop(0.6, P.bg);
      g.addColorStop(1, K.mix(P.bg, P.ink, 0.10));
    }
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // ── flow field helper: curl + a warping rotation so plumes feel organic ──
    const NS = p.noiseScale, CM = p.curlMag;
    function field(px, py) {
      // curl() returns small values (~0.01-0.05); amplify so the swirl is the
      // dominant force and the mode drift only nudges the overall shape.
      const c = K.curl(noise, px / (NS / 100), py / (NS / 100), 1.2);
      const SW = 36; // swirl gain
      // warp angle by slow second field for spatial variety
      const w = noise2.fbm(px / 520, py / 520, 3) * 1.4;
      const ca = Math.cos(w), sa = Math.sin(w);
      let vx = (c[0] * ca - c[1] * sa) * SW;
      let vy = (c[0] * sa + c[1] * ca) * SW;
      // mode bias: a GENTLE underlying drift — kept weaker than the curl so
      // turbulence/swirl dominates and nothing reads as a literal sunburst.
      if (p.mode === 'Rising Plume') {
        vy -= 0.55;                                 // buoyant rise
        vx += Math.sin(py / 180 + px / 90) * 0.30;  // waver
      } else if (p.mode === 'Twin Vortices') {
        const cx1 = W * 0.34, cx2 = W * 0.66, cy = H * 0.5;
        const a1 = Math.atan2(py - cy, px - cx1), a2 = Math.atan2(py - cy, px - cx2);
        vx += (-Math.sin(a1) + Math.sin(a2)) * 0.6;
        vy += (Math.cos(a1) - Math.cos(a2)) * 0.6;
      } else if (p.mode === 'Drift Veil') {
        vx += 0.5;                                   // soft horizontal drift
        vy += Math.sin(px / 160 + py / 240) * 0.35; // undulation breaks the stripes
      } else { // Radial Burst — outward push damped near a soft radius so the
        // field bends it into curling tendrils, not a hard star.
        const dx = px - W / 2, dy = py - H / 2;
        const dist = Math.hypot(dx, dy) || 1;
        const falloff = Math.min(1, dist / (Math.min(W, H) * 0.42));
        const push = 0.55 * (1 - falloff * 0.7);
        vx += (dx / dist) * push;
        vy += (dy / dist) * push;
      }
      const len = Math.hypot(vx, vy) || 1;
      return [vx / len, vy / len];
    }

    // ── seeding: where particles are born, per mode ──
    function seedPoint() {
      if (p.mode === 'Rising Plume') {
        // wider base mouth near lower third → fuller column, not a thin stalk
        const sx = W * (0.5 + K.randn(r) * 0.20);
        const sy = H * (0.62 + r() * 0.36);
        return [sx, sy];
      }
      if (p.mode === 'Twin Vortices') {
        const left = r() < 0.5;
        const cx = left ? W * 0.32 : W * 0.68;
        const rad = (0.04 + r() * 0.34) * Math.min(W, H);
        const a = r() * Math.PI * 2;
        return [cx + Math.cos(a) * rad, H * 0.5 + Math.sin(a) * rad];
      }
      if (p.mode === 'Drift Veil') {
        return [W * (-0.05 + r() * 0.5), H * (0.06 + r() * 0.88)];
      }
      // Radial Burst — born across a broad disc so it fills the frame as a
      // bloom of ink rather than rays from a single pinhole.
      const rad = Math.sqrt(r()) * 0.40 * Math.min(W, H);
      const a = r() * Math.PI * 2;
      return [W / 2 + Math.cos(a) * rad, H / 2 + Math.sin(a) * rad];
    }

    // ── density tuning (capped for sub-minute render) ──
    const densMul = p.density === 'Wispy' ? 0.62 : p.density === 'Dense' ? 1.35 : 1.0;
    const flowSteps = p.flow === 'Calm' ? 1.0 : p.flow === 'Violent' ? 1.5 : 1.2;
    const scaleArea = (W * H) / (1400 * 1400);
    const N = Math.floor(3800 * densMul * scaleArea);     // particle count
    const STEPS = Math.floor(180 * flowSteps);            // life of each filament
    const jitter = p.flow === 'Calm' ? 0.10 : p.flow === 'Violent' ? 0.55 : 0.28;

    const margin = Math.min(W, H) * 0.18;

    // accumulate where strokes bunch → bloom seeds
    const bloomGrid = {};
    const BG = 64; // bloom cell px

    // ── PASSES: a few translucent layers, each its own particle set ──
    const PASSES = P.dark ? 3 : 2;
    x.lineCap = 'round';

    for (let pass = 0; pass < PASSES; pass++) {
      // each pass: slightly different blend + alpha for depth
      if (P.dark) {
        x.globalCompositeOperation = 'lighter';
      } else {
        x.globalCompositeOperation = pass === 0 ? 'multiply' : 'screen';
      }
      const passAlpha = (P.dark ? 0.055 : 0.075) * (pass === 0 ? 1 : 0.7);
      const passWidth = (P.dark ? 1.0 : 1.15) * (pass === 0 ? 1.0 : 0.8);

      const count = Math.floor(N * (pass === 0 ? 1.0 : 0.7));
      for (let i = 0; i < count; i++) {
        let [px, py] = seedPoint();
        // per-filament thin-film phase origin + travel direction
        const phase0 = P.iri + (r() - 0.5) * 0.5;
        const span = p.iriSpan * p.iriDir;
        const life = STEPS + K.rint(r, -30, 30);
        let prevx = px, prevy = py;
        let arc = 0;
        const lw = passWidth * (0.5 + r() * 1.3);

        for (let s = 0; s < life; s++) {
          const [vx, vy] = field(px, py);
          // turbulence jitter on the heading
          const jx = vx + (r() - 0.5) * jitter;
          const jy = vy + (r() - 0.5) * jitter;
          const nx = px + jx * CM;
          const ny = py + jy * CM;
          arc += CM;

          if (nx < -margin || nx > W + margin || ny < -margin || ny > H + margin) break;

          // iridescent colour shifts along arclength
          const phase = phase0 + (arc / (STEPS * CM)) * span;
          let col = K.iridescent(phase, P.sat, P.light);
          // lean toward palette ink/glow so colorways stay coherent
          col = P.dark ? K.mix(col, P.glow, 0.18) : K.mix(col, P.ink, 0.28);

          // fade in at birth, fade out at death → wispy ends
          const t = s / life;
          const env = Math.sin(Math.min(1, t * 3)) * (1 - t * t * 0.85);
          const a = passAlpha * (0.5 + env);

          x.strokeStyle = K.rgba(col, a);
          x.lineWidth = lw;
          x.beginPath();
          x.moveTo(prevx, prevy);
          x.lineTo(nx, ny);
          x.stroke();

          // record bunching every few steps
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

    // ── soft bloom where streams bunched up (sheen on dense knots) ──
    // Restrained: small lobes only on the very densest knots, so the smoke
    // structure stays visible instead of being washed into a white sun.
    const cells = Object.values(bloomGrid).filter((e) => e.n >= 18).sort((a, b) => b.n - a.n);
    const topN = Math.min(cells.length, P.dark ? 30 : 22);
    for (let i = 0; i < topN; i++) {
      const e = cells[i];
      const cx = e.cx / e.n, cy = e.cy / e.n;
      const rad = BG * (0.7 + Math.min(1.2, e.n / 40));
      const bc = P.dark ? K.mix(e.col, '#ffffff', 0.30) : K.mix(e.col, '#ffffff', 0.40);
      K.bloom(x, cx, cy, rad, bc, P.dark ? 0.055 : 0.030);
    }

    // ── a few tiny specular sheen lobes (the headline gloss) on top knots ──
    for (let i = 0; i < Math.min(topN, 5); i++) {
      const e = cells[i]; if (!e) break;
      const cx = e.cx / e.n, cy = e.cy / e.n;
      K.sheen(x, cx - BG * 0.2, cy - BG * 0.2, BG * 0.7, '#ffffff', P.dark ? 0.06 : 0.04);
    }

    // ── atmospheric finish: haze veil, grain, vignette ──
    K.hazeSheet(x, W, H, noise, P.glow, P.dark ? 0.16 : 0.14, 190, P.dark ? 'screen' : 'soft-light');
    // a second, broader iridescent wash for thin-film "fuel on water" cast
    K.hazeSheet(x, W, H, noise2, K.iridescent(P.iri + 0.3, 0.7, 0.6), 0.07, 320, P.dark ? 'screen' : 'soft-light');
    K.grain(x, W, H, P.dark ? 520 : 700, r);
    K.vignette(x, W, H, P.dark ? 0.42 : 0.20);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'plume', draw, traits };
})();
