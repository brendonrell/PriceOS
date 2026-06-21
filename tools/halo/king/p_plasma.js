/* PLASMA — luminous volumetric light-field / nebular energy (abstract)
 *
 * Living light with DEPTH and STRUCTURE: glowing plasma clouds with internal
 * density variation, hot luminous cores blooming into cooler halos, bright
 * filament tendrils of light arcing through on the curl field, soft caustic
 * shimmer, and a layered far/mid/near haze. Refik-Anadol data-flow atmosphere
 * crossed with Promare/Edgerunners energy color. NOT a smooth gradient, NOT
 * formless smoke — it must read as emitted light with shape.
 *
 * Composition: an off-center luminous core anchored on a thirds point, a
 * counterweight secondary node, full-bleed filament currents on a diagonal, and
 * a shaped darker-but-still-colored breathing field opposite (never black).
 *
 * BESPOKE LIGHT PALETTE — designed for plasma emission, not the bible's candy
 * sets. Each colorway is a glow-pairing identity: how the emitted light blends
 * from a HOT CORE hue up through a near-white peak, out into a COOLER HALO, on a
 * deep-but-saturated nebular GROUND. core/peak/halo/atmo/spark all chosen so
 * additive (screen/lighter) stacking lands on luminous color, never grey/void.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── BESPOKE PLASMA LIGHT PALETTES ──────────────────────────────────────────
  // ground : the nebular floor — deep but a SATURATED color (the anti-void base)
  // atmo   : mid haze body that fills the field with colored depth
  // halo   : the COOL outer glow the core blooms into
  // core   : the HOT luminous heart hue
  // peak   : the near-white incandescent center the core lifts toward
  // spark  : the electric filament/caustic accent
  const PALS = [
    // magenta heart blooming into a gold corona over a violet nebula
    { name: 'EMBER ORCHID', ground: '#3a1763', atmo: '#7b3bc4', halo: '#ffb24d', core: '#ff2e9a', peak: '#fff3d0', spark: '#ffe04d' },
    // cyan core into a deep-violet halo — cold star in warm-violet gas
    { name: 'GLACIER NOVA',  ground: '#19265e', atmo: '#3a5bd9', halo: '#9b5cff', core: '#1ee9ff', peak: '#e6fffb', spark: '#7af0ff' },
    // emerald core into amber halo — aurora plasma
    { name: 'VERDANT FLARE', ground: '#0d3a3f', atmo: '#1f8f86', halo: '#ffb84d', core: '#2dff9e', peak: '#eafff0', spark: '#caff6e' },
    // tangerine core into fuchsia halo — solar bloom
    { name: 'SOLAR PEONY',   ground: '#5a1840', atmo: '#c4347f', halo: '#ff5ec7', core: '#ff8a2e', peak: '#fff0d6', spark: '#ffd23f' },
    // electric blue core into hot-pink halo — ion discharge
    { name: 'ION DISCHARGE', ground: '#171a52', atmo: '#3947c4', halo: '#ff4fa3', core: '#3a8cff', peak: '#eaf2ff', spark: '#00e5d0' },
    // violet core into cyan halo — phantom plasma
    { name: 'PHANTOM HAZE',  ground: '#2a1a5e', atmo: '#6b4dd6', halo: '#3ad7ff', core: '#b15cff', peak: '#f3eaff', spark: '#9b8cff' },
    // rose-gold core into teal halo — warm filament over cool gas
    { name: 'ROSE FILAMENT', ground: '#143a4a', atmo: '#1f7d8f', halo: '#ff9ec0', core: '#ff6f7d', peak: '#fff0ec', spark: '#ffd166' },
    // lime core into violet halo — toxic luminescence
    { name: 'PLASMA LIME',   ground: '#26165a', atmo: '#6a44c4', halo: '#9b6cff', core: '#aef84d', peak: '#f4ffe0', spark: '#39ffd0' },
  ];

  // Varied formats — long edge ≤ 1280. Square is the minority.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Tall' },     // 4:5 portrait
    { W: 854,  H: 1280, t: 'Column' },   // 2:3 portrait
    { W: 1280, H: 854,  t: 'Wide' },     // 3:2 landscape
    { W: 1280, H: 720,  t: 'Pano' },     // 16:9 landscape
    { W: 1120, H: 1120, t: 'Square' },   // 1:1 minority
  ];

  const FIELDS = ['Nebula', 'Filamentary', 'Caustic', 'Plume'];  // structure archetype
  const TEMPS  = ['Hot Core', 'Cool Core', 'Twin'];              // focal energy register
  const DENS   = ['Sparse', 'Woven', 'Dense'];                   // filament/haze body

  // rare chase events: mostly None, occasional brilliant burst / dark-star
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'None', 'Energy Burst', 'Eclipse Core'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const field = K.pick(FIELDS, r);
    const temp = K.pick(TEMPS, r);
    const dens = K.pick(DENS, r);
    const event = K.pick(EVENTS, r);
    // focal core on a thirds intersection (off-center anchor)
    const fx = r() < 0.5 ? 0.35 : 0.65;
    const fy = r() < 0.5 ? 0.36 : 0.64;
    // primary current direction (full-bleed diagonal)
    const ang = (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6);
    return { pal, fmt, field, temp, dens, event, fx, fy, ang };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name, Format: p.fmt.t, Field: p.field,
      Energy: p.temp, Density: p.dens, Event: p.event,
    };
  }

  // ── a volumetric glow node: a COLORED plasma heart (core hue dominant, only a
  //    small incandescent peak), an anisotropic body stretched along the current
  //    so it reads as flowing gas not a ball, and fbm density puffs for internal
  //    structure. Additive so overlaps build luminance. ──
  function glowNode(x, cx, cy, rad, core, peak, halo, noise, r, intensity, ang) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
    // anisotropic transform: stretch ~1.5x along the current direction
    const stretch = 1.55;
    const tx = (px, py) => {
      const dx = px - cx, dy = py - cy;
      // project onto current axis, scale, rotate back
      const along = dx * ca + dy * sa, perp = -dx * sa + dy * ca;
      const a2 = along * stretch, p2 = perp;
      return [cx + a2 * ca - p2 * sa, cy + a2 * sa + p2 * ca];
    };

    // 1) broad cool halo bloom (far reach) — the cloud's outer atmosphere
    {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.4);
      g.addColorStop(0, K.rgba(halo, 0.0));
      g.addColorStop(0.16, K.rgba(halo, 0.20 * intensity));
      g.addColorStop(0.5, K.rgba(K.mix(halo, core, 0.3), 0.10 * intensity));
      g.addColorStop(1, K.rgba(halo, 0));
      x.fillStyle = g; x.fillRect(cx - rad * 2.4, cy - rad * 2.4, rad * 4.8, rad * 4.8);
    }
    // 2) the hot body — CORE HUE owns the center; only a whisper of peak at the
    //    very heart. Smooth falloff to zero so no rect edge ever shows.
    {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, K.rgba(K.mix(core, peak, 0.32), 0.55 * intensity));
      g.addColorStop(0.12, K.rgba(K.mix(core, peak, 0.12), 0.48 * intensity));
      g.addColorStop(0.32, K.rgba(core, 0.42 * intensity));
      g.addColorStop(0.6, K.rgba(K.mix(core, halo, 0.35), 0.18 * intensity));
      g.addColorStop(0.85, K.rgba(K.mix(core, halo, 0.6), 0.05 * intensity));
      g.addColorStop(1, K.rgba(halo, 0));
      x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    // 3) internal density variation — fbm-driven colored puffs, placed in the
    //    stretched body so the cloud has a flow shape and visible structure.
    {
      const puffs = 44 + Math.floor(r() * 30);
      for (let i = 0; i < puffs; i++) {
        const aa = r() * Math.PI * 2;
        const rr = Math.pow(r(), 0.62) * rad * 1.05;
        let px = cx + Math.cos(aa) * rr, py = cy + Math.sin(aa) * rr;
        const tp = tx(px, py); px = tp[0]; py = tp[1];
        const n = (noise.fbm(px / 70, py / 70, 5) + 1) / 2;   // [0,1] density
        const t = rr / (rad * 1.05);
        const a = (0.05 + n * 0.16) * intensity * (1 - t * 0.55);
        if (a < 0.012) continue;
        const pr = rad * (0.08 + n * 0.26) * stretch;
        const hue = t < 0.4 ? K.mix(peak, core, 0.55 + r() * 0.4) : K.mix(core, halo, t * 0.85);
        const g = x.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, K.rgba(hue, a));
        g.addColorStop(1, K.rgba(hue, 0));
        x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }

  // ── filament tendrils of light: thin bright streaks tracing the curl field,
  //    clustered around a focal node, brightening near it. The "structure" that
  //    makes plasma read as energy and not a blur. ──
  function filaments(x, W, H, noise, col, hi, cx, cy, count, len, spread, r, scale, ang) {
    scale = scale || 1;
    ang = ang || 0;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const perpx = -sa, perpy = ca;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round';
    x.lineJoin = 'round';
    for (let f = 0; f < count; f++) {
      // seed in a BAND that crosses the core along the current axis: offset
      //  upstream along the axis and spread across the perpendicular, so the
      //  whole bundle sweeps through the focal node full-bleed.
      const along = (r() - 0.78) * spread * 2.4;          // mostly upstream of core
      const off = (r() - 0.5) * spread * 1.5;             // perpendicular spread
      let px = cx + ca * along + perpx * off;
      let py = cy + sa * along + perpy * off;
      const startX = px, startY = py;
      // bias the walk so filaments arc generally DOWN-current, curl bends them.
      // higher bias = more graceful sweeping arcs, less scribble.
      const bias = 0.6 + r() * 0.14;
      // per-filament heading: fan each arc off the mean current so the bundle
      // diverges like real discharge instead of combing perfectly parallel.
      const fan = (r() - 0.5) * 0.9;
      const fca = Math.cos(ang + fan), fsa = Math.sin(ang + fan);
      const pts = [[px, py]];
      for (let i = 0; i < len; i++) {
        const c = K.curl(noise, px + 1300, py + 1300, 1.1);
        const cl = Math.hypot(c[0], c[1]) || 1;
        let vx = fca * bias + (c[0] / cl) * (1 - bias);
        let vy = fsa * bias + (c[1] / cl) * (1 - bias);
        const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
        const sp = 10 + r() * 7;
        px += vx * sp;
        py += vy * sp;
        if (px < -40 || px > W + 40 || py < -40 || py > H + 40) break;
        pts.push([px, py]);
      }
      if (pts.length < 3) continue;
      // proximity of the path's nearest-to-core point → brightness/thickness
      const d = Math.hypot(startX - cx, startY - cy);
      const prox = K.clamp(1 - d / (spread * 1.6), 0, 1);
      const useHi = r() < 0.30;
      const w = (0.7 + r() * 2.0 + prox * 2.4) * scale;
      const baseA = (0.26 + r() * 0.34 + prox * 0.22);
      // glow pass — wide soft underlay so the filament reads as LIGHT, not a hair
      x.strokeStyle = K.rgba(K.mix(col, hi, 0.3), baseA * 0.3);
      x.lineWidth = w * 3.4;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.stroke();
      // bright core stroke
      x.strokeStyle = K.rgba(useHi ? hi : col, baseA);
      x.lineWidth = w;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.stroke();
    }
    x.restore();
  }

  // ── caustic shimmer: rippling thin bright bands, like light through cut glass,
  //    laid as incident over the field for shimmer (sparingly). ──
  function caustics(x, W, H, noise, col, cx, cy, count, r) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round';
    for (let c0 = 0; c0 < count; c0++) {
      const t0 = r();
      let px = cx + (r() - 0.5) * W * 0.7;
      let py = cy + (r() - 0.5) * H * 0.7;
      x.strokeStyle = K.rgba(col, 0.10 + r() * 0.16);
      x.lineWidth = 0.5 + r() * 1.1;
      x.beginPath(); x.moveTo(px, py);
      const steps = 30 + Math.floor(r() * 26);
      for (let i = 0; i < steps; i++) {
        const ph = noise.fbm(px / 60 + t0 * 10, py / 60, 3) * Math.PI * 2;
        px += Math.cos(ph) * (5 + r() * 4);
        py += Math.sin(ph) * (5 + r() * 4);
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) break;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H), maxWH = Math.max(W, H);

    const fx = W * p.fx, fy = H * p.fy;                     // hot focal core
    const calmx = W * (1 - p.fx), calmy = H * (1 - p.fy);   // breathing field opposite
    const A = Math.atan2(p.ang, 1);                          // primary current angle

    // ── 1. NEBULAR GROUND — deep but saturated color, never black. A two-tone
    //    diagonal: deepest in the calm field, lifting toward atmo near the core. ──
    {
      const g = x.createLinearGradient(calmx, calmy, fx, fy);
      g.addColorStop(0, K.mix(P.ground, '#000', 0.10));               // deepest corner (still a saturated hue)
      g.addColorStop(0.45, P.ground);
      g.addColorStop(1, K.mix(P.ground, P.atmo, 0.7));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    // ── 2. FAR HAZE PLANE — fbm wash of atmo color, sets depth plane 1 and gives
    //    the gas its first density variation across the whole field. ──
    K.hazeSheet(x, W, H, noise, K.mix(P.atmo, P.halo, 0.35), 0.16, 150, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.ground, P.atmo, 0.6), 0.12, 95, 'screen');

    // ── 3. MID GLOW BODY — broad atmospheric blooms building the volumetric cloud
    //    around the focal core, layered for far→near falloff. ──
    {
      const bodyN = p.dens === 'Dense' ? 6 : p.dens === 'Woven' ? 5 : 4;
      for (let i = 0; i < bodyN; i++) {
        const t = i / bodyN;
        // cluster the body around the core (tighter than before) so the cloud
        // reads as ONE luminous mass, not scattered puffs
        const jx = fx + (r() - 0.5) * minWH * 0.4 * (0.5 + t);
        const jy = fy + (r() - 0.5) * minWH * 0.4 * (0.5 + t);
        const col = i % 2 === 0 ? K.mix(P.atmo, P.core, 0.45) : K.mix(P.atmo, P.halo, 0.55);
        K.bloom(x, jx, jy, minWH * (0.3 + t * 0.42 + r() * 0.1), col, 0.13 + (1 - t) * 0.08);
      }
    }

    // ── 4. ACTIVE NEGATIVE SPACE — a single soft colored drift in the calm field
    //    so the breathing space carries color (counterweight), never empty/black. ──
    {
      const driftCol = K.mix(P.ground, p.temp === 'Cool Core' ? P.core : P.halo, 0.4);
      K.bloom(x, calmx + (r() - 0.5) * W * 0.16, calmy + (r() - 0.5) * H * 0.16,
              maxWH * (0.3 + r() * 0.12), driftCol, 0.08);
    }

    // ── 5. THE HOT CORE — the luminous focal anchor. Hot core → peak → cool halo,
    //    with fbm internal density so it's structured gas. Energy register picks
    //    which hue leads; Twin adds a counterweight secondary node. ──
    const coreHue = p.temp === 'Cool Core' ? P.halo : P.core;
    const haloHue = p.temp === 'Cool Core' ? P.core : P.halo;
    const coreRad = minWH * (0.17 + r() * 0.07) * (p.dens === 'Dense' ? 1.12 : 1.0);
    glowNode(x, fx, fy, coreRad, coreHue, P.peak, haloHue, noise, r, 1.0, A);

    let sx2 = null, sy2 = null;
    if (p.temp === 'Twin' || r() < 0.4) {
      // secondary node — smaller, on the far side, asymmetric counterweight
      sx2 = calmx + (r() - 0.5) * W * 0.22;
      sy2 = calmy + (r() - 0.5) * H * 0.22;
      glowNode(x, sx2, sy2, coreRad * (0.42 + r() * 0.18),
               p.temp === 'Twin' ? P.halo : P.core, P.peak,
               p.temp === 'Twin' ? P.core : P.halo, noise, r, 0.6, A);
    }

    // ── 6. FILAMENT CURRENTS (near plane) — bright tendrils of light arcing on
    //    the curl field, clustered at the core, sweeping full-bleed. This is the
    //    structure that separates plasma from a gradient blur. ──
    const filCount = p.dens === 'Dense' ? 75 : p.dens === 'Woven' ? 52 : 34;
    const filLen   = p.field === 'Filamentary' ? 120 : 80;
    filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.55), P.peak, fx, fy,
              filCount, filLen, minWH * 0.4, r, 1.0, A);
    filaments(x, W, H, noise, K.mix(haloHue, P.peak, 0.4), P.spark, fx, fy,
              Math.floor(filCount * 0.5), filLen - 20, minWH * 0.5, r, 0.85, A);
    // a few hero filaments tracing the main current, brightest near core
    filaments(x, W, H, noise, P.peak, P.spark, fx, fy,
              Math.floor(filCount * 0.16), filLen + 30, minWH * 0.34, r, 1.6, A);
    if (sx2 !== null) {
      filaments(x, W, H, noise, K.mix(P.halo, P.spark, 0.5), P.peak, sx2, sy2,
                Math.floor(filCount * 0.35), filLen - 30, minWH * 0.3, r, 0.8, A);
    }

    // ── 7. CAUSTIC SHIMMER — rippling thin bright bands for incident sparkle,
    //    heavier when Field is Caustic. ──
    {
      const cCount = p.field === 'Caustic' ? 40 : 18;
      caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.4), fx, fy, cCount, r);
    }

    // ── 8. INCANDESCENT PEAK — tight bright sheen at the very heart so the core
    //    reads as emitting light, plus a soft caustic glint near it. ──
    K.sheen(x, fx, fy, coreRad * 0.42, K.mix(P.peak, coreHue, 0.25), 0.4);
    K.sheen(x, fx + (r() - 0.5) * coreRad * 0.4, fy + (r() - 0.5) * coreRad * 0.4,
            coreRad * 0.18, P.spark, 0.34);

    // ── 9. RARE CHASE EVENTS ──
    if (p.event === 'Energy Burst') {
      // brilliant radial energy-burst from the core: anamorphic streaks + flash
      x.save(); x.globalCompositeOperation = 'lighter';
      const rays = 14 + Math.floor(r() * 10);
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2 + r() * 0.4;
        const L = maxWH * (0.4 + r() * 0.6);
        const ex = fx + Math.cos(a0) * L, ey = fy + Math.sin(a0) * L;
        const g = x.createLinearGradient(fx, fy, ex, ey);
        g.addColorStop(0, K.rgba(P.peak, 0.5));
        g.addColorStop(0.3, K.rgba(P.spark, 0.22));
        g.addColorStop(1, K.rgba(P.spark, 0));
        x.strokeStyle = g; x.lineWidth = 1 + r() * 2.5; x.lineCap = 'round';
        x.beginPath(); x.moveTo(fx, fy); x.lineTo(ex, ey); x.stroke();
      }
      // horizontal anamorphic flare bar through the core
      const sg = x.createLinearGradient(0, fy, W, fy);
      sg.addColorStop(0, K.rgba(P.spark, 0));
      sg.addColorStop(0.5, K.rgba(P.peak, 0.6));
      sg.addColorStop(1, K.rgba(P.spark, 0));
      x.fillStyle = sg; x.fillRect(0, fy - minWH * 0.01, W, minWH * 0.02);
      x.restore();
      K.bloom(x, fx, fy, maxWH * 0.5, P.peak, 0.5);
    } else if (p.event === 'Eclipse Core') {
      // a dark-star: the core's heart is occluded (still colored, not black),
      // ringed by a brilliant corona — dramatic but on-mandate (no void).
      x.save();
      x.globalCompositeOperation = 'source-over';
      const g = x.createRadialGradient(fx, fy, 0, fx, fy, coreRad * 0.7);
      g.addColorStop(0, K.rgba(K.mix(P.ground, P.atmo, 0.5), 0.82));
      g.addColorStop(0.7, K.rgba(K.mix(P.ground, P.atmo, 0.5), 0.5));
      g.addColorStop(1, K.rgba(P.ground, 0));
      x.fillStyle = g; x.beginPath(); x.arc(fx, fy, coreRad * 0.7, 0, Math.PI * 2); x.fill();
      x.restore();
      // brilliant corona ring
      x.save(); x.globalCompositeOperation = 'lighter';
      const rg = x.createRadialGradient(fx, fy, coreRad * 0.55, fx, fy, coreRad * 1.0);
      rg.addColorStop(0, K.rgba(P.peak, 0));
      rg.addColorStop(0.5, K.rgba(P.peak, 0.7));
      rg.addColorStop(0.65, K.rgba(P.spark, 0.5));
      rg.addColorStop(1, K.rgba(haloHue, 0));
      x.fillStyle = rg; x.fillRect(fx - coreRad, fy - coreRad, coreRad * 2, coreRad * 2);
      x.restore();
    }

    // ── 10. FINISH — fine grain to keep big hazy fields filmic, gentle chroma
    //    shimmer at edges, a COLOR vignette (never black) to settle the corners
    //    while preserving the saturated-ground mandate. ──
    // a whisper of near-plane colored mottle for tooth on the gas
    K.mottle(x, 0, 0, W, H, K.mix(P.atmo, P.peak, 0.4), 3000, r, 'soft-light');
    K.grain(x, W, H, 620, r);
    K.chromaSplit(x, W, H, 1);
    {
      const g = x.createRadialGradient(fx, fy, minWH * 0.3, fx, fy, maxWH * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, K.rgba(K.mix(P.ground, '#000', 0.22), 0.26));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'p_plasma', draw, traits };
})();
