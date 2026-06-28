/* TIDEWORKS — a half-flooded oil refinery at dusk.
 * The tide has risen into the plant: towers, pipes, spheres and flare-stacks
 * stand in a perfectly still mirror of floodwater. The horizon splits the frame
 * mid-height — refinery silhouettes above, a flipped, rippled, slightly blurred
 * reflection below. Surreal: the reflection is sharper/brighter than the real
 * thing, and one flare burns UNDERWATER. Industrial sublime, heavy dusk haze.
 * PALETTE: PETROL DUSK — petrol cyan structures, rust-orange flares,
 * bruised-violet sky, near-black water. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways, all PETROL DUSK family. sky2/sky1 = violet→cyan dusk gradient;
  // water = near-black flood; struct = cyan structure silhouette; flare = rust
  // orange burn; haze = volumetric wash tint; spark = hottest highlight.
  const PALS = [
    { name: 'Petrol Dusk',   sky1:'#3a1f5c', sky2:'#143b52', water:'#040a10', struct:'#1ec8c8', flare:'#ff6a2a', haze:'#2a6e7a', spark:'#ffd2a0' },
    { name: 'Bruised Violet',sky1:'#2a1148', sky2:'#1d2f5a', water:'#05070f', struct:'#26b4c8', flare:'#ff5e1e', haze:'#3a4e88', spark:'#ffc890' },
    { name: 'Rust Tide',     sky1:'#4a1d44', sky2:'#3a2a3e', water:'#0a0608', struct:'#28cfc0', flare:'#ff7a2c', haze:'#7a4a4a', spark:'#ffd8b0' },
    { name: 'Cyan Flood',    sky1:'#241a52', sky2:'#0e4a5a', water:'#030c12', struct:'#18d8d2', flare:'#ff6422', haze:'#1e7e8a', spark:'#d6fbff' },
    { name: 'Deep Petrol',   sky1:'#181436', sky2:'#0a2c3e', water:'#02060a', struct:'#1ab0b8', flare:'#ff5818', haze:'#1a5a68', spark:'#ffcaa0' },
    { name: 'Ember Dusk',    sky1:'#3e1638', sky2:'#522a1e', water:'#080606', struct:'#22c2b6', flare:'#ff8434', haze:'#8a4e36', spark:'#ffe2bc' },
  ];

  const FMTS = [
    { W: 1480, H: 1180, t: 'Wide' },
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1480, H: 1100, t: 'Pano' },
  ];

  const HOURS = ['Last Light', 'Blue Hour', 'Smog Dusk', 'First Dark'];
  const TIDES = ['Slack Water', 'Glass Mirror', 'Rippled', 'Misted'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      hour: K.pick(HOURS, r),
      tide: K.pick(TIDES, r),
      // horizon (waterline) position — mid-frame, varies to change the split
      horizon: 0.46 + (r() - 0.5) * 0.14,
      // density of the refinery skyline
      units: K.rint(r, 7, 12),
      // focal flare-stack horizontal position (the hero plume)
      focal: 0.22 + r() * 0.56,
      flares: K.rint(r, 2, 4),
      underwaterFlare: r() < 0.85, // the surreal one
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Hour: p.hour, Tide: p.tide, Stacks: p.units };
  }

  // ── A single refinery "unit" silhouette built at base x, ground y, with a
  // depth d (0 far/hazy/small .. 1 near/dark/big). Returns its painted extent so
  // the reflection routine can mirror it. We draw into a chosen color & alpha.
  // lightX = world x of the dusk light source (so all units share lighting dir)
  function drawUnit(x, type, bx, groundY, h, w, col, alpha, r, spark, lightX) {
    x.save();
    x.lineCap = 'round'; x.lineJoin = 'round';
    spark = spark || '#ffffff';
    const lx = lightX == null ? bx - w : lightX;       // default: lit from left
    const lit = K.mix(col, spark, 0.40);               // highlight band
    const shade = K.mix(col, '#000', 0.55);            // shadow band
    // a horizontal cylinder gradient across [x0..x1], light side toward lx
    function cylGrad(x0, x1) {
      const fromLeft = lx < bx;
      const g = x.createLinearGradient(fromLeft ? x0 : x1, 0, fromLeft ? x1 : x0, 0);
      g.addColorStop(0, K.rgba(shade, alpha));
      g.addColorStop(0.30, K.rgba(lit, alpha));
      g.addColorStop(0.55, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(shade, alpha));
      return g;
    }
    if (type === 'tower') {
      const tw = w;
      x.fillStyle = cylGrad(bx - tw / 2, bx + tw / 2);
      x.beginPath();
      x.moveTo(bx - tw / 2, groundY);
      x.lineTo(bx - tw * 0.42, groundY - h);
      x.lineTo(bx + tw * 0.42, groundY - h);
      x.lineTo(bx + tw / 2, groundY);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(lit, alpha);
      x.beginPath(); x.ellipse(bx, groundY - h, tw * 0.42, tw * 0.16, 0, 0, 7); x.fill();
      // banding rings (darker) — give the column industrial texture
      x.strokeStyle = K.rgba(shade, alpha * 0.8);
      x.lineWidth = Math.max(0.6, w * 0.05);
      const rings = 4 + Math.floor(r() * 5);
      for (let i = 1; i < rings; i++) {
        const ry = groundY - h * (i / rings);
        x.beginPath(); x.moveTo(bx - tw * 0.45, ry); x.lineTo(bx + tw * 0.45, ry); x.stroke();
      }
    } else if (type === 'sphere') {
      const rad = w * 0.5;
      const cy = groundY - rad - h * 0.12;
      // radial sphere shading: highlight offset toward the light
      const hxx = bx + (lx < bx ? -1 : 1) * rad * 0.4, hyy = cy - rad * 0.35;
      const g = x.createRadialGradient(hxx, hyy, rad * 0.05, bx, cy, rad * 1.15);
      g.addColorStop(0, K.rgba(lit, alpha));
      g.addColorStop(0.5, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(shade, alpha));
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, cy, rad, 0, 7); x.fill();
      // equatorial seam line
      x.strokeStyle = K.rgba(shade, alpha * 0.5); x.lineWidth = Math.max(0.5, w * 0.02);
      x.beginPath(); x.ellipse(bx, cy, rad, rad * 0.18, 0, 0, 7); x.stroke();
      x.strokeStyle = K.rgba(col, alpha);
      x.lineWidth = Math.max(0.8, w * 0.06);
      for (const s of [-0.6, -0.2, 0.2, 0.6]) {
        x.beginPath(); x.moveTo(bx + s * rad, cy + rad * 0.7); x.lineTo(bx + s * rad * 1.3, groundY); x.stroke();
      }
    } else if (type === 'tank') {
      x.fillStyle = cylGrad(bx - w / 2, bx + w / 2);
      x.fillRect(bx - w / 2, groundY - h, w, h);
      x.fillStyle = K.rgba(lit, alpha);
      x.beginPath(); x.ellipse(bx, groundY - h, w * 0.5, w * 0.12, 0, 0, 7); x.fill();
      // a couple of band seams
      x.strokeStyle = K.rgba(shade, alpha * 0.6); x.lineWidth = Math.max(0.5, w * 0.03);
      for (let i = 1; i < 3; i++) { const ry = groundY - h * (i / 3); x.beginPath(); x.moveTo(bx - w / 2, ry); x.lineTo(bx + w / 2, ry); x.stroke(); }
    } else if (type === 'stack') {
      const sw = w * 0.34;
      // gentler shading on the thin stack so it doesn't read as a bright beam
      const sg = x.createLinearGradient(bx - sw / 2, 0, bx + sw / 2, 0);
      sg.addColorStop(0, K.rgba(shade, alpha));
      sg.addColorStop(0.5, K.rgba(col, alpha));
      sg.addColorStop(1, K.rgba(shade, alpha));
      x.fillStyle = sg;
      x.beginPath();
      x.moveTo(bx - sw / 2, groundY);
      x.lineTo(bx - sw * 0.32, groundY - h);
      x.lineTo(bx + sw * 0.32, groundY - h);
      x.lineTo(bx + sw / 2, groundY);
      x.closePath(); x.fill();
    } else if (type === 'cooling') {
      x.fillStyle = cylGrad(bx - w / 2, bx + w / 2);
      x.beginPath();
      x.moveTo(bx - w / 2, groundY);
      x.quadraticCurveTo(bx - w * 0.18, groundY - h * 0.6, bx - w * 0.30, groundY - h);
      x.lineTo(bx + w * 0.30, groundY - h);
      x.quadraticCurveTo(bx + w * 0.18, groundY - h * 0.6, bx + w / 2, groundY);
      x.closePath(); x.fill();
      x.fillStyle = K.rgba(lit, alpha * 0.8);
      x.beginPath(); x.ellipse(bx, groundY - h, w * 0.30, w * 0.07, 0, 0, 7); x.fill();
    }
    x.restore();
  }

  // pipe rack: a horizontal banded structure connecting units along the ground
  function drawPipeRack(x, x0, x1, groundY, h, col, alpha) {
    x.save();
    x.strokeStyle = K.rgba(col, alpha);
    x.lineCap = 'round';
    // top deck pipes
    for (let i = 0; i < 3; i++) {
      const py = groundY - h + i * h * 0.18;
      x.lineWidth = Math.max(0.6, h * 0.06);
      x.beginPath(); x.moveTo(x0, py); x.lineTo(x1, py); x.stroke();
    }
    // legs
    const n = Math.max(2, Math.floor((x1 - x0) / (h * 0.9)));
    x.lineWidth = Math.max(0.8, h * 0.08);
    for (let i = 0; i <= n; i++) {
      const lx = x0 + (x1 - x0) * (i / n);
      x.beginPath(); x.moveTo(lx, groundY - h); x.lineTo(lx, groundY); x.stroke();
    }
    x.restore();
  }

  // Draw a complete refinery skyline at a given depth band into ctx, returning a
  // function the reflection pass uses. We render the whole skyline by callback so
  // we can re-run it flipped for the mirror.
  function buildSkyline(p, r, W, horizonY) {
    const units = [];
    const N = p.units;
    // Composition variety: choose a focal cluster region and a density profile so
    // seeds differ in layout, not just recolor.
    const clusterX = p.focal;            // where the plant is densest
    const spread = 0.6 + r() * 0.5;      // how spread out the plant is
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1 || 1);
      // bias x toward the cluster for a real "plant" feel (not even spacing)
      let bxN = clusterX + (t - 0.5) * spread + K.randn(r) * 0.10;
      bxN = K.clamp(bxN, 0.02, 0.98);
      // depth correlates loosely with distance from cluster (near hero in middle)
      const nearCluster = 1 - Math.min(1, Math.abs(bxN - clusterX) * 2.2);
      const depth = K.clamp(0.14 + nearCluster * 0.5 + r() * 0.4, 0.1, 1);
      const types = ['tower', 'sphere', 'tank', 'stack', 'cooling', 'tower', 'stack', 'tank'];
      const type = K.pick(types, r);
      const baseH = type === 'stack' ? 0.24 : type === 'tower' ? 0.22 : type === 'cooling' ? 0.20 : 0.12;
      const h = horizonY * (baseH + depth * 0.36) * (0.65 + r() * 0.65);
      const w = h * (type === 'sphere' ? 0.85 : type === 'tank' ? 0.9 : type === 'cooling' ? 0.7 : 0.28) * (0.8 + r() * 0.4);
      // each unit carries its own deterministic seed + a flame flag/strength
      const useed = Math.floor(bxN * 9973 + h * 31 + i * 7) >>> 0;
      const hasFlame = type === 'stack' || (type === 'tower' && r() < 0.18);
      units.push({ type, bx: bxN * W, h, w, depth, hasFlame, useed,
        flameStr: 0.6 + r() * 0.8, flick: r() * 6.28 });
    }
    units.sort((a, b) => a.depth - b.depth); // far first
    // precompute pipe racks ONCE so reflection matches reality exactly
    const racks = [];
    const nr = K.rint(r, 2, 4);
    for (let i = 0; i < nr; i++) {
      const rx0 = r() * W * 0.7;
      const rw = W * (0.14 + r() * 0.30);
      racks.push({ x0: rx0, x1: rx0 + rw, h: horizonY * (0.04 + r() * 0.05) });
    }
    return { units, racks };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const horizonY = H * p.horizon;
    const night = p.hour === 'First Dark';
    const blue = p.hour === 'Blue Hour';
    const smog = p.hour === 'Smog Dusk';
    const skyBright = night ? 0.7 : blue ? 0.95 : 1.0;

    // ── 1. DUSK SKY — violet (top) → cyan (horizon) gradient, bruised & hazy
    const sg = x.createLinearGradient(0, 0, 0, horizonY);
    sg.addColorStop(0, K.mix(P.sky1, '#000', night ? 0.4 : 0.12));
    sg.addColorStop(0.5, K.mix(P.sky1, P.sky2, 0.55));
    sg.addColorStop(0.85, K.mix(P.sky2, P.haze, 0.4));
    sg.addColorStop(1, K.mix(P.sky2, P.flare, smog ? 0.22 : 0.10));
    x.fillStyle = sg; x.fillRect(0, 0, W, horizonY);

    // dusk glow band sitting on the horizon (sun just set behind the plant)
    x.save();
    x.globalCompositeOperation = 'lighter';
    const glowX = p.focal * W;
    const gh = x.createRadialGradient(glowX, horizonY, 0, glowX, horizonY, W * 0.55);
    gh.addColorStop(0, K.rgba(K.mix(P.flare, P.spark, 0.4), (smog ? 0.22 : 0.14) * skyBright));
    gh.addColorStop(0.4, K.rgba(P.haze, 0.09 * skyBright));
    gh.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = gh; x.fillRect(0, 0, W, horizonY);
    x.restore();

    // ── 2. WATER base — near-black flood with a subtle vertical sheen
    const wg = x.createLinearGradient(0, horizonY, 0, H);
    wg.addColorStop(0, K.mix(P.water, P.sky2, 0.30)); // reflective just below line
    wg.addColorStop(0.25, K.mix(P.water, P.haze, 0.10));
    wg.addColorStop(1, K.mix(P.water, '#000', 0.3));
    x.fillStyle = wg; x.fillRect(0, horizonY, W, H - horizonY);

    // ── 3. build the skyline geometry, render FAR background haze layers first
    const sky = buildSkyline(p, r, W, horizonY);
    const units = sky.units, racks = sky.racks;

    // far atmospheric haze-bank silhouettes (distant plant lost in smog)
    x.save();
    x.globalCompositeOperation = 'source-over';
    const farCol = K.mix(P.haze, P.sky2, 0.5);
    for (let i = 0; i < 5; i++) {
      const fy = horizonY - r() * H * 0.04;
      const fh = horizonY * (0.06 + r() * 0.08);
      x.fillStyle = K.rgba(farCol, 0.10 + r() * 0.06);
      // jagged distant skyline strip
      x.beginPath(); x.moveTo(0, horizonY);
      let cx = 0;
      while (cx < W) {
        const step = W * (0.03 + r() * 0.05);
        const ty = horizonY - fh * (0.3 + r() * 0.9);
        x.lineTo(cx, ty); x.lineTo(cx + step, ty);
        cx += step;
      }
      x.lineTo(W, horizonY); x.closePath(); x.fill();
    }
    x.restore();

    // dense far micro-skyline: a teeming row of tiny hazy towers/stacks along
    // the horizon so the plant feels vast and busy behind the hero units.
    x.save();
    const microN = K.rint(r, 22, 38);
    for (let i = 0; i < microN; i++) {
      const mx = r() * W;
      const mh = horizonY * (0.04 + r() * 0.10);
      const mw = mh * (0.12 + r() * 0.22);
      const mc = K.mix(P.haze, P.struct, 0.25 + r() * 0.2);
      x.fillStyle = K.rgba(mc, 0.10 + r() * 0.10);
      x.fillRect(mx - mw / 2, horizonY - mh, mw, mh);
      if (r() < 0.3) { // thin chimney
        x.fillRect(mx - mw * 0.08, horizonY - mh * 1.6, mw * 0.16, mh * 0.6);
      }
    }
    x.restore();

    // ── helper that paints the full skyline (units + flares) given a y-transform
    // mode 'real' (above water, dark/hazy) or returns flame anchors.
    function paintSkyline(mode) {
      const reflection = mode === 'reflect';
      const flameAnchors = [];
      for (const u of units) {
        // atmospheric perspective: far = hazy/desaturated/light, near = dark/saturated
        const d = u.depth;
        // far units bleed toward the haze tint and lose contrast (atmosphere);
        // near units are deep, saturated cyan against the dusk.
        const realCol = K.mix(K.mix(P.struct, P.haze, (1 - d) * 0.85), '#000', 0.10 + d * 0.30);
        // reflection is BRIGHTER & MORE SATURATED than reality (the surreal note)
        const col = reflection ? K.mix(P.struct, P.spark, 0.12 + (1 - d) * 0.1) : realCol;
        const alpha = reflection ? (0.45 + d * 0.40) : (0.5 + d * 0.50);
        const gY = horizonY;
        // near real units get a solid dark silhouette underlay so they read as
        // massive industrial forms, not transparent glass.
        if (!reflection && d > 0.45) {
          drawUnit(x, u.type, u.bx, gY, u.h, u.w, K.mix(P.struct, '#000', 0.7), 0.55 + d * 0.35, K.rng(u.useed), P.spark, glowX);
        }
        drawUnit(x, u.type, u.bx, gY, u.h, u.w, col, alpha, K.rng(u.useed), reflection ? P.spark : P.struct, glowX);
        // grit on the nearer real structures so they don't read as clean glass
        if (!reflection && d > 0.5) {
          K.mottle(x, u.bx - u.w * 0.6, gY - u.h, u.w * 1.2, u.h, col, 70, K.rng(u.useed + 3), 'overlay');
        }
        if (u.hasFlame) flameAnchors.push({ bx: u.bx, ty: gY - u.h, depth: d, str: u.flameStr, flick: u.flick });
      }
      // pipe racks threading the ground at horizon (precomputed → mirror matches)
      const rackCol = reflection ? K.mix(P.struct, P.spark, 0.12) : K.mix(P.struct, '#000', 0.3);
      for (const rk of racks) {
        drawPipeRack(x, rk.x0, rk.x1, horizonY, rk.h, rackCol, reflection ? 0.4 : 0.5);
      }
      return flameAnchors;
    }

    // ── 4. REFLECTION FIRST (drawn below, so we can blur+ripple it under the sky line)
    // Render reflection into an offscreen and flip it. Simpler: draw flipped here.
    x.save();
    // clip to water region
    x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
    // flip vertically about the horizon
    x.translate(0, horizonY);
    x.scale(1, -1);
    x.translate(0, -horizonY);
    // re-seed r for deterministic identical geometry: rebuild same units order
    const reflFlames = paintSkyline('reflect');
    x.restore();

    // ── reflection treatment ────────────────────────────────────────────────
    // (a) HORIZONTAL RIPPLE DISPLACEMENT — shift each water row sideways by an
    // fbm-driven offset growing with depth, so the mirror dissolves into water
    // the further down it goes. This is what makes it read as a real flooded
    // surface, not a duplicated copy.
    const rip = p.tide === 'Glass Mirror' ? 0.30 : p.tide === 'Rippled' ? 1.0 : 0.6;
    const hy = Math.round(horizonY);
    try {
      const img = x.getImageData(0, hy, W, H - hy);
      const out = x.createImageData(W, H - hy);
      const sd = img.data, od = out.data, rows = H - hy;
      for (let row = 0; row < rows; row++) {
        const t = row / rows;
        // ramp amplitude from ~0 at the waterline so silhouettes stay crisp at
        // the mirror line and dissolve into water lower down (no torn edges).
        const amp = (t * t * (3 + t * 26)) * rip;
        const off = Math.round(
          (noise.fbm(row / 9, seed * 0.013, 3) +
           0.4 * noise.fbm(row / 3.5 + 11, seed * 0.02, 2)) * amp);
        for (let cx = 0; cx < W; cx++) {
          let sx = cx + off; if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
          const di = (row * W + cx) * 4, si = (row * W + sx) * 4;
          od[di] = sd[si]; od[di + 1] = sd[si + 1]; od[di + 2] = sd[si + 2]; od[di + 3] = 255;
        }
      }
      x.putImageData(out, 0, hy);
    } catch (e) {}

    // (b) faint dark ripple bands + depth darkening over the displaced mirror
    x.save();
    x.globalCompositeOperation = 'source-over';
    for (let yy = hy; yy < H; yy += 2) {
      const t = (yy - hy) / (H - hy);
      const wob = noise.fbm(yy / 6, seed * 0.01, 3) * rip;
      const a = (0.05 + t * 0.16) * (0.6 + Math.abs(wob));
      x.fillStyle = K.rgba(K.mix(P.water, '#000', 0.4), a);
      x.fillRect(0, yy, W, 1);
    }
    x.restore();

    // ── mid-ground atmospheric veil: a soft fog band hugging the horizon so the
    // far micro-plant sinks behind it and the near hero units pop forward.
    x.save();
    x.globalCompositeOperation = 'screen';
    const veilY = horizonY - H * 0.10;
    const vg = x.createLinearGradient(0, veilY, 0, horizonY + H * 0.01);
    vg.addColorStop(0, K.rgba(P.haze, 0));
    vg.addColorStop(0.7, K.rgba(K.mix(P.haze, P.sky2, 0.3), smog ? 0.22 : 0.14));
    vg.addColorStop(1, K.rgba(P.haze, 0.04));
    x.fillStyle = vg; x.fillRect(0, veilY, W, horizonY - veilY + H * 0.01);
    x.restore();

    // ── 5. NOW the real skyline ABOVE the water (drawn over sky)
    const realFlames = paintSkyline('real');

    // ── 6. FLARE PLUMES — orange bloom flames atop the stacks (real, above)
    // A teardrop refinery flame: fat at the base, tapering to a flickering tip.
    // SHORT — a burn, not a laser. `flick` (phase) varies the shape per stack.
    function drawFlare(fx, fy, scale, col, intensity, flip, flick) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      const dir = flip ? 1 : -1;
      const flH = scale * (0.85 + 0.5 * Math.abs(Math.sin(flick || 0))); // SHORT flame
      const flW = scale * 0.62;
      const ph = flick || 0;
      // build a teardrop: widest ~25% up, tip flickering sideways
      function flamePath(wScale, hScale, lean) {
        x.beginPath();
        const segs = 10;
        const tipLean = Math.sin(ph * 1.7) * flW * 0.5 * lean;
        // left edge up
        for (let i = 0; i <= segs; i++) {
          const tt = i / segs;
          const ny = fy + dir * flH * hScale * tt;
          // teardrop profile: 0 at base, bulge at 0.25, → 0 at tip
          const prof = Math.sin(Math.pow(tt, 0.7) * Math.PI) * (1 - tt * 0.25);
          const wob = noise.fbm(tt * 5 + ph, seed * 0.02, 3) * flW * 0.18;
          const cx = fx + tipLean * tt * tt + wob;
          x.lineTo(cx - prof * flW * wScale, ny);
        }
        // right edge down
        for (let i = segs; i >= 0; i--) {
          const tt = i / segs;
          const ny = fy + dir * flH * hScale * tt;
          const prof = Math.sin(Math.pow(tt, 0.7) * Math.PI) * (1 - tt * 0.25);
          const wob = noise.fbm(tt * 5 + ph + 50, seed * 0.02, 3) * flW * 0.18;
          const cx = fx + tipLean * tt * tt + wob;
          x.lineTo(cx + prof * flW * wScale, ny);
        }
        x.closePath();
      }
      // outer orange flame
      const fg = x.createLinearGradient(fx, fy, fx, fy + dir * flH);
      fg.addColorStop(0, K.rgba(col, 0.85 * intensity));
      fg.addColorStop(0.45, K.rgba(col, 0.55 * intensity));
      fg.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = fg; flamePath(1, 1, 1); x.fill();
      // inner hot core (spark)
      const cg = x.createLinearGradient(fx, fy, fx, fy + dir * flH * 0.7);
      cg.addColorStop(0, K.rgba(P.spark, 0.9 * intensity));
      cg.addColorStop(1, K.rgba(P.spark, 0));
      x.fillStyle = cg; flamePath(0.5, 0.72, 0.8); x.fill();
      // hot base glow
      K.bloom(x, fx, fy, scale * 1.6, col, 0.55 * intensity);
      K.bloom(x, fx, fy + dir * flH * 0.2, scale * 0.7, P.spark, 0.7 * intensity);
      // smoke plume drifting up (only for the real, upward flames)
      x.globalCompositeOperation = 'screen';
      const smokeN = flip ? 2 : 5;
      for (let s = 1; s <= smokeN; s++) {
        const sy = fy + dir * flH * (1.0 + s * 0.55);
        const sx = fx + noise.fbm(s * 2 + ph, seed * 0.03, 2) * scale * (1.2 + s * 0.4)
          + dir * 0 + s * scale * 0.15 * Math.sin(ph);
        K.bloom(x, sx, sy, scale * (1.0 + s * 0.7), K.mix(P.haze, P.sky1, 0.5), 0.07);
      }
      x.restore();
    }

    // draw all real flames atop their stacks (short flickering burns)
    x.save();
    for (const f of realFlames) {
      const scale = horizonY * (0.035 + f.depth * 0.05) * f.str;
      const inten = 0.55 + f.depth * 0.45;
      drawFlare(f.bx, f.ty, scale, P.flare, inten, false, f.flick);
    }
    x.restore();

    // reflected flares in the water (flipped, BRIGHTER — surreal sharpness)
    x.save();
    x.beginPath(); x.rect(0, horizonY, W, H - horizonY); x.clip();
    for (const f of reflFlames) {
      const ry = horizonY + (horizonY - f.ty); // mirror about horizon
      const scale = horizonY * (0.035 + f.depth * 0.05) * f.str;
      drawFlare(f.bx, ry, scale, K.mix(P.flare, P.spark, 0.3), 0.6 + f.depth * 0.4, true, f.flick + 1.3);
    }
    x.restore();

    // ── 7. THE SURREAL UNDERWATER FLARE — a flame burning beneath the surface
    if (p.underwaterFlare) {
      const uwx = K.clamp(p.focal + (r() - 0.5) * 0.3, 0.15, 0.85) * W;
      const uwy = horizonY + (H - horizonY) * (0.35 + r() * 0.3);
      x.save();
      // water distortion halo around it
      x.globalCompositeOperation = 'lighter';
      const us = horizonY * 0.11; // bigger — this is a surreal hero element
      // submerged glow halo (the water lit from within around the flame)
      K.bloom(x, uwx, uwy, us * 5, P.flare, 0.22);
      K.bloom(x, uwx, uwy, us * 2.4, K.mix(P.flare, P.spark, 0.3), 0.30);
      // burns UP underwater (impossible) — the surreal hero note
      drawFlare(uwx, uwy, us, P.flare, 1.0, false, seed * 0.7);
      // light shafts rising from the submerged flame toward the surface
      x.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 5; s++) {
        const sxoff = (s - 2) * us * 0.5 + noise.fbm(s * 2, seed * 0.05, 2) * us;
        const grd = x.createLinearGradient(uwx + sxoff, uwy, uwx + sxoff * 0.4, horizonY);
        grd.addColorStop(0, K.rgba(K.mix(P.flare, P.spark, 0.4), 0.10));
        grd.addColorStop(1, K.rgba(P.struct, 0));
        x.fillStyle = grd;
        x.beginPath();
        x.moveTo(uwx + sxoff - us * 0.3, uwy);
        x.lineTo(uwx + sxoff + us * 0.3, uwy);
        x.lineTo(uwx + sxoff * 0.4 + us * 0.6, horizonY);
        x.lineTo(uwx + sxoff * 0.4 - us * 0.6, horizonY);
        x.closePath(); x.fill();
      }
      // caustic disturbance ring on the surface directly above it
      const ring = x.createRadialGradient(uwx, horizonY, 0, uwx, horizonY, us * 5);
      ring.addColorStop(0, K.rgba(K.mix(P.flare, P.spark, 0.3), 0.26));
      ring.addColorStop(0.45, K.rgba(P.struct, 0.12));
      ring.addColorStop(1, K.rgba(P.struct, 0));
      x.fillStyle = ring; x.fillRect(uwx - us * 5, horizonY - us * 1.5, us * 10, us * 6);
      // rising bubbles toward the surface
      for (let b = 0; b < 22; b++) {
        const bt = r();
        const by = uwy - bt * (uwy - horizonY) * 1.05;
        const bx2 = uwx + noise.fbm(b * 3, seed * 0.04, 2) * us * 2.2 + (b % 2 ? 1 : -1) * us * 0.3;
        x.fillStyle = K.rgba(K.mix(P.flare, P.spark, 0.4), 0.10 + (1 - bt) * 0.22);
        x.beginPath(); x.arc(bx2, by, 0.8 + r() * 2.8, 0, 7); x.fill();
      }
      x.restore();
    }

    // ── 8. WATERLINE MIST — a soft fog bank sitting exactly on the horizon
    x.save();
    x.globalCompositeOperation = 'screen';
    const mistY = horizonY;
    const mg = x.createLinearGradient(0, mistY - H * 0.06, 0, mistY + H * 0.05);
    mg.addColorStop(0, K.rgba(P.haze, 0));
    mg.addColorStop(0.5, K.rgba(K.mix(P.haze, P.struct, 0.2), p.tide === 'Misted' ? 0.30 : 0.16));
    mg.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = mg; x.fillRect(0, mistY - H * 0.06, W, H * 0.11);
    // drifting mist puffs along the line
    for (let i = 0; i < 8; i++) {
      const mx = r() * W;
      K.bloom(x, mx, mistY + (r() - 0.5) * H * 0.02, H * (0.04 + r() * 0.05),
        K.mix(P.haze, P.struct, 0.3), p.tide === 'Misted' ? 0.16 : 0.09);
    }
    x.restore();

    // ── 9. VOLUMETRIC DUSK HAZE — the signature wash, violet→cyan, generous
    K.hazeSheet(x, W, H, noise, K.mix(P.sky1, P.struct, 0.4), smog ? 0.16 : 0.12, 340, 'screen');
    K.hazeSheet(x, W, H, noise, P.haze, 0.08, 180, 'screen');

    // sky dust / star grain in the upper sky
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 120; i++) {
      const sx = r() * W, sy = r() * horizonY * 0.7;
      x.fillStyle = K.rgba(K.mix(P.struct, P.spark, r()), 0.05 + r() * 0.2);
      x.fillRect(sx, sy, r() < 0.1 ? 1.4 : 0.8, 0.8);
    }
    x.restore();

    // ── 10. finish: water surface sheen, grain, vignette
    // bright reflective strip right at the waterline (the mirror catching sky)
    x.save();
    x.globalCompositeOperation = 'lighter';
    const sheenG = x.createLinearGradient(0, horizonY, 0, horizonY + H * 0.04);
    sheenG.addColorStop(0, K.rgba(K.mix(P.struct, P.spark, 0.3), 0.18));
    sheenG.addColorStop(1, K.rgba(P.struct, 0));
    x.fillStyle = sheenG; x.fillRect(0, horizonY, W, H * 0.04);
    x.restore();

    if (!night) K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 460, r);
    K.vignette(x, W, H, 0.55);
    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'tideworks', draw, traits };
})();
