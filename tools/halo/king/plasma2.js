/* PLASMA2 — luminous volumetric energy as a TRUE generative SYSTEM.
 *
 * v2 rebuild. The prior p_plasma had ONE composition — a bright core + radiating
 * filaments on a near-black ground — so every seed read as "lightning on black,"
 * the dead cliché. v2 makes COMPOSITION the primary trait: a `Layout` axis picks
 * one of SEVEN structurally distinct energy arrangements (0 cores → many), each
 * a genuinely different way light fills the frame, not the same heart relocated.
 *
 *   1. Single Core     — one off-center luminous heart, restrained filaments.
 *                        RARE. The closest to the old look, deliberately scarce.
 *   2. Constellation   — several glow nodes of varied size scattered on phi /
 *                        thirds points; a network of hearts, no single hero.
 *   3. Filament Web     — a web of light arcs spanning the frame, NO dominant
 *                        core; energy lives in the weave itself.
 *   4. Nebula Field     — soft volumetric colour clouds, NO discrete core —
 *                        purely atmospheric, the brightest/most painterly ground.
 *   5. Plume            — streaming jets of light sweeping a strong diagonal,
 *                        emitter pushed to one edge, long full-bleed throw.
 *   6. Aurora Bands     — rippling horizontal light curtains stacked like
 *                        northern-light drapes; a horizon energy composition.
 *   7. Discharge        — branching electric arcs forking across the frame from
 *                        a few emitters; the controlled-chaos lightning idea, but
 *                        on a BRIGHT saturated ground, never a black void.
 *
 * KEEP from v1: luminous living-light quality, bespoke glow palettes,
 *   window.FORCE_PAL, deterministic, varied aspects, rare events, <=1280px,
 *   fast coarse-grid haze.
 * FIX: grounds are now BRIGHT saturated colour (a luminous mid-light base, not a
 *   deep void); cores let the HUE read (white only as thin sparks, never a blown
 *   disk); and the structural sameness is gone — Layout drives the comp.
 *
 * Deterministic from seed only. ALL trait-determining randomness is drawn in
 * params() in a FIXED order so traits() and draw() never disagree.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  // ── BESPOKE PLASMA LIGHT PALETTES ──────────────────────────────────────────
  // ground : the LUMINOUS atmospheric floor — a BRIGHT saturated colour, the
  //          anti-void base (think Promare candy field, not deep space).
  // atmo   : mid haze body that fills the field with colour depth.
  // halo   : the cool outer glow energy blooms into.
  // core   : the hot luminous heart hue.
  // peak   : the near-white incandescent tip — used only as thin sparks.
  // spark  : the electric filament/caustic accent.
  // All chosen so additive (screen/lighter) stacking lands on luminous colour.
  const PALS = [
    // magenta heart, gold corona, over a HOT VIOLET-ORCHID field
    { name: 'EMBER ORCHID', ground: '#7b3fb0', atmo: '#a85ad6', halo: '#ffc26a', core: '#ff3da6', peak: '#fff3d0', spark: '#ffe04d' },
    // cyan core, violet halo, over a BRIGHT COBALT field — cold star, bright sky
    { name: 'GLACIER NOVA',  ground: '#3a6bd6', atmo: '#5c8cff', halo: '#a86cff', core: '#1ee9ff', peak: '#e9fffb', spark: '#7af0ff' },
    // emerald core, amber halo, over a BRIGHT TEAL-MINT field — aurora plasma
    { name: 'VERDANT FLARE', ground: '#2aa890', atmo: '#54d6b0', halo: '#ffc46a', core: '#2dff9e', peak: '#eafff0', spark: '#caff6e' },
    // tangerine core, fuchsia halo, over a HOT CORAL-ROSE field — solar bloom
    { name: 'SOLAR PEONY',   ground: '#e0568f', atmo: '#ff7aa8', halo: '#ff8ad0', core: '#ff8a2e', peak: '#fff0d6', spark: '#ffd23f' },
    // electric blue core, hot-pink halo, over a BRIGHT INDIGO-BLUE field
    { name: 'ION DISCHARGE', ground: '#4a5ad6', atmo: '#6f7cf0', halo: '#ff6fb0', core: '#3a8cff', peak: '#eaf2ff', spark: '#00e5d0' },
    // violet core, cyan halo, over a BRIGHT ORCHID-LILAC field — phantom plasma
    { name: 'PHANTOM HAZE',  ground: '#8a6ce0', atmo: '#a98cf0', halo: '#5ad7ff', core: '#b15cff', peak: '#f5eaff', spark: '#9b8cff' },
    // rose-gold core, teal halo, over a BRIGHT AQUA field — warm light, cool gas
    { name: 'ROSE FILAMENT', ground: '#2fa0b0', atmo: '#56c8d6', halo: '#ffaecb', core: '#ff7f8d', peak: '#fff0ec', spark: '#ffd166' },
    // lime core, violet halo, over a BRIGHT GRAPE field — toxic luminescence
    { name: 'PLASMA LIME',   ground: '#7a4fcf', atmo: '#9a6ce0', halo: '#b07cff', core: '#aef84d', peak: '#f6ffe0', spark: '#39ffd0' },
    // gold core, peach halo, over a WARM SAFFRON field — radiant warm bloom
    { name: 'GOLDEN CITRINE', ground: '#e0a83a', atmo: '#ffc85a', halo: '#ff9e6a', core: '#ffd23f', peak: '#fff7d6', spark: '#fff0a0' },
    // hot-pink core, lavender halo, over a CANDY ROSE field — sweet vapor
    { name: 'CANDY MIST',    ground: '#ff71ce', atmo: '#ff9adb', halo: '#b988ff', core: '#ff4fb0', peak: '#fff0fa', spark: '#7af0ff' },
  ];

  // Varied formats — long edge <= 1280. Square is the minority.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Tall' },     // 4:5 portrait
    { W: 854,  H: 1280, t: 'Column' },   // 2:3 portrait
    { W: 1280, H: 854,  t: 'Wide' },     // 3:2 landscape
    { W: 1280, H: 720,  t: 'Pano' },     // 16:9 landscape
    { W: 1120, H: 1120, t: 'Square' },   // 1:1 minority
  ];

  // PRIMARY composition trait — each value is a different draw routine. Single
  // Core appears once so it stays RARE (the old default is now the exception).
  const LAYOUTS = [
    'Single Core', 'Constellation', 'Constellation', 'Filament Web', 'Filament Web',
    'Nebula Field', 'Nebula Field', 'Plume', 'Plume', 'Aurora Bands', 'Aurora Bands',
    'Discharge', 'Discharge',
  ];

  const DENS  = ['Sparse', 'Woven', 'Dense'];     // filament/haze body
  const TEMPS = ['Hot Core', 'Cool Core'];        // which hue leads the energy

  // rare chase events: mostly None, occasional brilliant burst / eclipse
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'None', 'Energy Burst', 'Eclipse Core'];

  function params(r) {
    // FIXED DRAW ORDER — Layout first so it dominates the identity.
    const layout = K.pick(LAYOUTS, r);
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const dens = K.pick(DENS, r);
    const temp = K.pick(TEMPS, r);
    const event = K.pick(EVENTS, r);
    // focal anchor on a thirds intersection (off-center)
    const fx = r() < 0.5 ? 0.34 : 0.66;
    const fy = r() < 0.5 ? 0.35 : 0.65;
    // primary current direction (full-bleed diagonal)
    const ang = (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.7);
    return { layout, pal, fmt, dens, temp, event, fx, fy, ang };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t,
      Density: p.dens, Energy: p.temp, Event: p.event,
    };
  }

  // ── a volumetric glow node: a COLORED plasma heart. Core hue owns the centre;
  //    peak (near-white) is only a tiny incandescent tip. Anisotropic body so it
  //    flows, fbm puffs for internal density. Additive. ──
  function glowNode(x, cx, cy, rad, core, peak, halo, noise, r, intensity, ang) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
    const stretch = 1.5;
    const tx = (px, py) => {
      const dx = px - cx, dy = py - cy;
      const along = dx * ca + dy * sa, perp = -dx * sa + dy * ca;
      const a2 = along * stretch, p2 = perp;
      return [cx + a2 * ca - p2 * sa, cy + a2 * sa + p2 * ca];
    };
    // 1) broad cool halo bloom — the cloud's outer atmosphere
    {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.4);
      g.addColorStop(0, K.rgba(halo, 0.0));
      g.addColorStop(0.16, K.rgba(halo, 0.18 * intensity));
      g.addColorStop(0.5, K.rgba(K.mix(halo, core, 0.3), 0.09 * intensity));
      g.addColorStop(1, K.rgba(halo, 0));
      x.fillStyle = g; x.fillRect(cx - rad * 2.4, cy - rad * 2.4, rad * 4.8, rad * 4.8);
    }
    // 2) the hot body — CORE HUE owns the centre; only a whisper of peak at the
    //    very heart (small radius, low alpha) so the hue reads, not a white disk.
    {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, K.rgba(K.mix(core, peak, 0.16), 0.40 * intensity));
      g.addColorStop(0.08, K.rgba(K.mix(core, peak, 0.04), 0.40 * intensity));
      g.addColorStop(0.30, K.rgba(core, 0.42 * intensity));
      g.addColorStop(0.6, K.rgba(K.mix(core, halo, 0.35), 0.16 * intensity));
      g.addColorStop(0.85, K.rgba(K.mix(core, halo, 0.6), 0.05 * intensity));
      g.addColorStop(1, K.rgba(halo, 0));
      x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    // 3) internal density variation — fbm-driven colored puffs in the stretched
    //    body so the cloud has flow shape and visible structure.
    {
      const puffs = 36 + Math.floor(r() * 26);
      for (let i = 0; i < puffs; i++) {
        const aa = r() * Math.PI * 2;
        const rr = Math.pow(r(), 0.62) * rad * 1.05;
        let px = cx + Math.cos(aa) * rr, py = cy + Math.sin(aa) * rr;
        const tp = tx(px, py); px = tp[0]; py = tp[1];
        const n = (noise.fbm(px / 70, py / 70, 5) + 1) / 2;
        const t = rr / (rad * 1.05);
        const a = (0.04 + n * 0.14) * intensity * (1 - t * 0.5);
        if (a < 0.012) continue;
        const pr = rad * (0.08 + n * 0.26) * stretch;
        const hue = t < 0.4 ? K.mix(core, peak, 0.18 + r() * 0.2) : K.mix(core, halo, t * 0.85);
        const g = x.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, K.rgba(hue, a));
        g.addColorStop(1, K.rgba(hue, 0));
        x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }

  // ── tiny incandescent spark: thin near-white tip so the core reads as emitting
  //    light, WITHOUT blowing a white disk. Used sparingly at heart points. ──
  function spark(x, cx, cy, rad, peak, coreHue, a0) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(K.mix(peak, coreHue, 0.35), a0));
    g.addColorStop(0.5, K.rgba(coreHue, a0 * 0.3));
    g.addColorStop(1, K.rgba(coreHue, 0));
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();
  }

  // ── filament tendrils of light: thin bright streaks tracing the curl field,
  //    optionally clustered around a focal node, brightening near it. ──
  function filaments(x, W, H, noise, col, hi, cx, cy, count, len, spread, r, scale, ang, biasMin) {
    scale = scale || 1; ang = ang || 0; biasMin = biasMin == null ? 0.6 : biasMin;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const perpx = -sa, perpy = ca;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let f = 0; f < count; f++) {
      const along = (r() - 0.78) * spread * 2.4;
      const off = (r() - 0.5) * spread * 1.5;
      let px = cx + ca * along + perpx * off;
      let py = cy + sa * along + perpy * off;
      const startX = px, startY = py;
      const bias = biasMin + r() * 0.14;
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
        px += vx * sp; py += vy * sp;
        if (px < -40 || px > W + 40 || py < -40 || py > H + 40) break;
        pts.push([px, py]);
      }
      if (pts.length < 3) continue;
      const d = Math.hypot(startX - cx, startY - cy);
      const prox = K.clamp(1 - d / (spread * 1.6), 0, 1);
      const useHi = r() < 0.22;
      const w = (0.6 + r() * 1.7 + prox * 2.0) * scale;
      const baseA = (0.20 + r() * 0.28 + prox * 0.18);
      x.strokeStyle = K.rgba(K.mix(col, hi, 0.3), baseA * 0.28);
      x.lineWidth = w * 3.2;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.stroke();
      x.strokeStyle = K.rgba(useHi ? hi : col, baseA);
      x.lineWidth = w;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.stroke();
    }
    x.restore();
  }

  // ── a branching electric arc: recursive forking discharge. col bright, on top
  //    of the bright ground (NOT a black void). ──
  function arc(x, x0, y0, ang, len, col, hi, w, r, depth, noise) {
    if (depth > 5 || len < 8) return;
    let px = x0, py = y0;
    const pts = [[px, py]];
    const steps = Math.max(3, Math.floor(len / 14));
    let a = ang;
    for (let i = 0; i < steps; i++) {
      const c = K.curl(noise, px + 700, py + 700, 1.1);
      a += (c[0] - c[1]) * 0.18 + (r() - 0.5) * 0.5;
      const sp = len / steps;
      px += Math.cos(a) * sp; py += Math.sin(a) * sp;
      pts.push([px, py]);
    }
    // soft underlay + bright core
    x.strokeStyle = K.rgba(K.mix(col, hi, 0.4), 0.22);
    x.lineWidth = w * 3.0;
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.stroke();
    x.strokeStyle = K.rgba(r() < 0.4 ? hi : col, 0.5);
    x.lineWidth = w;
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.stroke();
    // fork children from a couple of points along the path
    const forks = 1 + Math.floor(r() * 2);
    for (let k = 0; k < forks; k++) {
      const idx = 1 + Math.floor(r() * (pts.length - 1));
      const [bx, by] = pts[idx];
      arc(x, bx, by, a + (r() - 0.5) * 1.4, len * (0.45 + r() * 0.3),
          col, hi, w * 0.66, r, depth + 1, noise);
    }
  }

  // ── caustic shimmer: rippling thin bright bands ──
  function caustics(x, W, H, noise, col, cx, cy, count, r, spreadW, spreadH) {
    spreadW = spreadW || 0.7; spreadH = spreadH || 0.7;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round';
    for (let c0 = 0; c0 < count; c0++) {
      const t0 = r();
      let px = cx + (r() - 0.5) * W * spreadW;
      let py = cy + (r() - 0.5) * H * spreadH;
      x.strokeStyle = K.rgba(col, 0.08 + r() * 0.14);
      x.lineWidth = 0.5 + r() * 1.1;
      x.beginPath(); x.moveTo(px, py);
      const steps = 28 + Math.floor(r() * 24);
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

  // ── BRIGHT NEBULAR GROUND — a luminous saturated field, never near-black. A
  //    soft two-tone diagonal between ground and atmo, both bright. Optional
  //    extra colour drift biases the field toward a second hue per layout. ──
  function paintGround(x, W, H, P, r, fx, fy, brightLift) {
    brightLift = brightLift || 0;
    // base: ground -> lifted atmo across a diagonal. Lift toward white only a
    // touch so it stays SATURATED, not pastel-washed.
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, K.mix(P.ground, P.atmo, 0.15 + r() * 0.1));
    g.addColorStop(0.5, K.mix(P.ground, '#ffffff', 0.04 + brightLift * 0.06));
    g.addColorStop(1, K.mix(P.atmo, P.ground, 0.35));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // a broad luminous wash near the focal third so the field has a bright lobe
    K.bloom(x, fx, fy, Math.max(W, H) * 0.8, K.mix(P.atmo, P.halo, 0.4), 0.10 + brightLift * 0.06);
    // a secondary colour drift in the opposite corner so the field carries TWO
    // hues and never reads as a flat gradient (anti-mud, anti-void).
    K.bloom(x, W * (1 - fx / W), H * (1 - fy / H),
            Math.max(W, H) * 0.6, K.mix(P.atmo, P.core, 0.3), 0.08);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // THE SEVEN LAYOUTS
  // ════════════════════════════════════════════════════════════════════════════

  // 1. SINGLE CORE — one off-center heart, restrained filaments. RARE.
  function layoutSingleCore(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const fx = W * p.fx, fy = H * p.fy;
    const coreHue = p.temp === 'Cool Core' ? P.halo : P.core;
    const haloHue = p.temp === 'Cool Core' ? P.core : P.halo;
    const coreRad = minWH * (0.19 + r() * 0.06);
    // build the heart from COLOR blooms first so the hue dominates; the glowNode
    // adds structure at low intensity. No incandescent white disk.
    K.bloom(x, fx, fy, coreRad * 2.6, K.mix(haloHue, coreHue, 0.5), 0.16);
    K.bloom(x, fx, fy, coreRad * 1.3, coreHue, 0.20);
    glowNode(x, fx, fy, coreRad, coreHue, coreHue, haloHue, noise, r, 0.55, A);
    K.bloom(x, fx, fy, coreRad * 0.5, K.mix(coreHue, P.peak, 0.4), 0.16);
    // filaments seed OFFSET downstream so they SWEEP PAST the heart instead of
    // piling their bright proximity-cores onto it (that pile-up is what blew the
    // centre white). hi is spark-tinted, not pure peak, so no white hotspot.
    const filCount = p.dens === 'Dense' ? 46 : p.dens === 'Woven' ? 34 : 24;
    const ca = Math.cos(A), sa = Math.sin(A);
    const ofx = fx + ca * coreRad * 1.3, ofy = fy + sa * coreRad * 1.3;
    filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.5), K.mix(P.spark, P.peak, 0.5),
              ofx, ofy, filCount, 90, minWH * 0.46, r, 1.0, A, 0.64);
    filaments(x, W, H, noise, K.mix(haloHue, P.spark, 0.4), P.spark,
              ofx, ofy, Math.floor(filCount * 0.4), 70, minWH * 0.54, r, 0.8, A, 0.62);
    // a whisper of spark only — coreHue-tinted so it never becomes a white disk
    spark(x, fx, fy, coreRad * 0.08, K.mix(P.peak, coreHue, 0.55), coreHue, 0.10);
    return { fx, fy };
  }

  // 2. CONSTELLATION — several glow nodes of varied size on phi/thirds points.
  function layoutConstellation(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const xs = [0.28, 0.5, 0.72, 1 - K.INVPHI, K.INVPHI];
    const ys = [0.3, 0.52, 0.7, 1 - K.INVPHI, K.INVPHI];
    const pts = [];
    for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    const n = 3 + Math.floor(r() * 4); // 3..6 nodes
    let first = null;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i];
      const cx = W * (ax + (r() - 0.5) * 0.06);
      const cy = H * (ay + (r() - 0.5) * 0.06);
      if (!first) first = { fx: cx, fy: cy };
      const big = i === 0;
      const rad = minWH * (big ? 0.13 + r() * 0.05 : 0.05 + r() * 0.06);
      const swap = r() < 0.5;
      const coreHue = swap ? P.core : P.halo;
      const haloHue = swap ? P.halo : P.core;
      glowNode(x, cx, cy, rad, coreHue, P.peak, haloHue, noise, r, big ? 0.85 : 0.6, A + (r() - 0.5));
      // light arcs linking nodes outward — gentle, not a core burst
      filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.5), P.peak, cx, cy,
                big ? 18 : 8, 60, rad * 2.2, r, 0.8, A + (r() - 0.5) * 0.6, 0.5);
      spark(x, cx, cy, rad * 0.26, P.peak, coreHue, big ? 0.26 : 0.18);
    }
    return first;
  }

  // 3. FILAMENT WEB — a web of light arcs spanning the frame, NO dominant core.
  function layoutWeb(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    // several emitters scattered widely; each throws a modest filament bundle in
    // varied directions so the whole frame becomes a woven light mesh.
    const emitters = 5 + Math.floor(r() * 4);
    const dens = p.dens === 'Dense' ? 1.4 : p.dens === 'Woven' ? 1.0 : 0.7;
    for (let e = 0; e < emitters; e++) {
      const cx = W * (0.12 + r() * 0.76);
      const cy = H * (0.12 + r() * 0.76);
      const localA = A + (r() - 0.5) * 2.2;
      const col = r() < 0.5 ? K.mix(P.core, P.spark, 0.5) : K.mix(P.halo, P.spark, 0.5);
      filaments(x, W, H, noise, col, P.peak, cx, cy,
                Math.floor((20 + r() * 16) * dens), 95, minWH * 0.5, r, 0.9, localA, 0.42);
      // tiny glow seed so the weave has nodes of light
      if (r() < 0.6) {
        const swap = r() < 0.5;
        glowNode(x, cx, cy, minWH * (0.04 + r() * 0.04), swap ? P.core : P.halo, P.peak,
                 swap ? P.halo : P.core, noise, r, 0.5, localA);
      }
    }
    // a few caustic ripples through the weave for shimmer
    caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.4), W * 0.5, H * 0.5, 22, r, 0.9, 0.9);
    return { fx: W * p.fx, fy: H * p.fy };
  }

  // 4. NEBULA FIELD — soft volumetric colour clouds, NO discrete core. Brightest.
  function layoutNebula(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    // many broad overlapping blooms of varied hue across the whole frame, layered
    // far->near, building a luminous atmospheric colour field.
    const clouds = p.dens === 'Dense' ? 16 : p.dens === 'Woven' ? 13 : 10;
    const cols = [K.mix(P.atmo, P.core, 0.45), K.mix(P.atmo, P.halo, 0.55),
                  K.mix(P.halo, P.peak, 0.35), K.mix(P.core, P.peak, 0.3),
                  K.mix(P.atmo, P.spark, 0.4), P.core, P.halo];
    // bias clouds toward an off-center focal lobe so the field has a heart of
    // brightness and a calmer breathing side (composition, not uniform fog).
    const lobeX = W * p.fx, lobeY = H * p.fy;
    for (let i = 0; i < clouds; i++) {
      const t = i / clouds;
      const toLobe = r() < 0.55;
      const cx = toLobe ? lobeX + (r() - 0.5) * minWH * 0.6 : W * (0.1 + r() * 0.8);
      const cy = toLobe ? lobeY + (r() - 0.5) * minWH * 0.6 : H * (0.1 + r() * 0.8);
      const rad = minWH * (0.22 + r() * 0.38) * (0.7 + t * 0.5);
      const col = cols[Math.floor(r() * cols.length)];
      K.bloom(x, cx, cy, rad, col, 0.08 + r() * 0.08);
    }
    // extra fbm density wash so the clouds get internal structure, not flat blobs
    K.hazeSheet(x, W, H, noise, K.mix(P.atmo, P.halo, 0.4), 0.18, 120, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.core, P.peak, 0.3), 0.12, 70, 'screen');
    // a couple of soft bright seeds (NOT cores) for focal lift, near the lobe
    const seeds = 2 + Math.floor(r() * 2);
    for (let i = 0; i < seeds; i++) {
      const cx = lobeX + (r() - 0.5) * minWH * 0.4, cy = lobeY + (r() - 0.5) * minWH * 0.4;
      K.bloom(x, cx, cy, minWH * (0.1 + r() * 0.08), K.mix(P.peak, P.core, 0.45), 0.13);
    }
    // faint caustic shimmer to keep it alive
    caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.5), W * 0.5, H * 0.5, 12, r, 0.95, 0.95);
    return { fx: W * 0.5, fy: H * 0.5 };
  }

  // 5. PLUME — streaming jets sweeping a strong diagonal, emitter at one edge.
  function layoutPlume(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    // emitter pushed to an edge/corner; jets throw the full length of the frame.
    const fromLeft = r() < 0.5, fromTop = r() < 0.5;
    const ex = fromLeft ? W * (0.04 + r() * 0.12) : W * (0.84 + r() * 0.12);
    const ey = fromTop ? H * (0.06 + r() * 0.2) : H * (0.74 + r() * 0.2);
    // aim across the frame toward the far side
    const aimA = Math.atan2((fromTop ? 1 : -1) * (0.4 + r() * 0.4),
                            (fromLeft ? 1 : -1) * (0.7 + r() * 0.4));
    const coreHue = p.temp === 'Cool Core' ? P.halo : P.core;
    // a luminous emitter root (colored, restrained)
    glowNode(x, ex, ey, minWH * (0.1 + r() * 0.05), coreHue, P.peak,
             p.temp === 'Cool Core' ? P.core : P.halo, noise, r, 0.8, aimA);
    const dens = p.dens === 'Dense' ? 1.5 : p.dens === 'Woven' ? 1.1 : 0.8;
    // long streaming jets — high directional bias so they read as plumes, not scribble
    filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.5), P.peak, ex, ey,
              Math.floor(60 * dens), 150, minWH * 0.55, r, 1.1, aimA, 0.74);
    filaments(x, W, H, noise, K.mix(P.halo, P.peak, 0.4), P.spark, ex, ey,
              Math.floor(34 * dens), 130, minWH * 0.65, r, 0.85, aimA, 0.7);
    // a couple of hero streaks
    filaments(x, W, H, noise, P.peak, P.spark, ex, ey,
              Math.floor(10 * dens), 170, minWH * 0.4, r, 1.5, aimA, 0.8);
    spark(x, ex, ey, minWH * 0.05, P.peak, coreHue, 0.26);
    return { fx: ex, fy: ey };
  }

  // 6. AURORA BANDS — distinct rippling light curtains hung like drapes, each
  //    striated with vertical rays (the signature aurora look), separated by
  //    breathing space so they read as curtains, not a washed smear.
  function layoutAurora(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    // FEWER, clearer curtains so each one stays legible.
    const bands = p.dens === 'Dense' ? 5 : p.dens === 'Woven' ? 4 : 3;
    const hues = [P.core, P.halo, K.mix(P.core, P.halo, 0.5), P.spark, K.mix(P.halo, P.peak, 0.3)];
    // divide the canvas into separated horizontal slots so curtains don't overlap
    for (let b = 0; b < bands; b++) {
      const t = bands > 1 ? b / (bands - 1) : 0.5;
      const slotY = H * (0.14 + t * 0.68);
      const baseY = slotY + (r() - 0.5) * H * 0.04;
      const amp = H * (0.045 + r() * 0.05);
      const thick = H * (0.06 + r() * 0.06);   // curtain vertical extent
      const hue = hues[(b + Math.floor(r() * hues.length)) % hues.length];
      const strokes = 150;
      // 6a) the curtain body — vertical RAY striations of varied height & alpha,
      //     so the drape has the falling-light texture, not a flat band.
      x.save();
      x.globalCompositeOperation = 'lighter';
      const phase = r() * Math.PI * 2, freq = 0.8 + r() * 1.6, freq2 = 2.0 + r() * 2.5;
      const amp2 = amp * (0.3 + r() * 0.4);
      for (let s = 0; s <= strokes; s++) {
        const sx = (s / strokes) * W;
        const ridge = baseY
          + Math.sin(s / strokes * Math.PI * freq + phase) * amp
          + Math.sin(s / strokes * Math.PI * freq2 + phase * 1.7) * amp2
          + noise.fbm(sx / 180 + b * 17, t * 3, 4) * amp * 1.3;
        // per-ray height flicker → curtain striation
        const rayH = thick * (0.5 + (noise.fbm(sx / 40 + b * 11, 7, 3) + 1) * 0.6);
        const a = (0.12 + (noise.fbm(sx / 26 + b * 13, 3, 3) + 1) * 0.10);
        const g = x.createLinearGradient(sx, ridge - rayH, sx, ridge + rayH * 0.5);
        g.addColorStop(0, K.rgba(K.mix(hue, P.peak, 0.25), a));   // bright top edge
        g.addColorStop(0.35, K.rgba(hue, a * 0.7));
        g.addColorStop(1, K.rgba(hue, 0));                        // fades down
        x.fillStyle = g;
        x.fillRect(sx - 1, ridge - rayH, W / strokes + 2, rayH * 1.5);
      }
      x.restore();
      // 6b) a bright thin crest line along the curtain top — the electric edge
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(K.mix(hue, P.peak, 0.5), 0.34);
      x.lineWidth = 1.2 + r() * 1.6;
      x.beginPath();
      for (let s = 0; s <= strokes; s++) {
        const sx = (s / strokes) * W;
        const rayH = thick * (0.5 + (noise.fbm(sx / 40 + b * 11, 7, 3) + 1) * 0.6);
        const ridge = baseY
          + Math.sin(s / strokes * Math.PI * freq + phase) * amp
          + Math.sin(s / strokes * Math.PI * freq2 + phase * 1.7) * amp2
          + noise.fbm(sx / 180 + b * 17, t * 3, 4) * amp * 1.3 - rayH;
        if (s === 0) x.moveTo(sx, ridge); else x.lineTo(sx, ridge);
      }
      x.stroke();
      x.restore();
    }
    // vertical caustic shimmer like aurora rays
    caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.4), W * 0.5, H * 0.5, 16, r, 0.9, 0.5);
    return { fx: W * p.fx, fy: H * p.fy };
  }

  // 7. DISCHARGE — branching electric arcs forking across a BRIGHT ground.
  function layoutDischarge(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const emitters = 2 + Math.floor(r() * 2); // 2..3
    const dens = p.dens === 'Dense' ? 1.5 : p.dens === 'Woven' ? 1.1 : 0.8;
    const col = K.mix(p.temp === 'Cool Core' ? P.halo : P.core, P.spark, 0.5);
    let first = null;
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round'; x.lineJoin = 'round';
    for (let e = 0; e < emitters; e++) {
      const ex = W * (0.12 + r() * 0.76);
      const ey = H * (0.12 + r() * 0.76);
      if (!first) first = { fx: ex, fy: ey };
      const trunks = Math.floor((3 + r() * 3) * dens);
      for (let t = 0; t < trunks; t++) {
        const a0 = A + (t / trunks) * Math.PI * 2 + (r() - 0.5) * 0.6;
        arc(x, ex, ey, a0, maxWH * (0.4 + r() * 0.4), col, P.peak,
            2.4 + r() * 1.5, r, 0, noise);
      }
      // small colored glow at the discharge root so it reads as an energy source
      glowNode(x, ex, ey, minWH * (0.06 + r() * 0.04),
               p.temp === 'Cool Core' ? P.halo : P.core, P.peak,
               p.temp === 'Cool Core' ? P.core : P.halo, noise, r, 0.6, A);
      spark(x, ex, ey, minWH * 0.03, P.peak, col, 0.3);
    }
    x.restore();
    return first;
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H), maxWH = Math.max(W, H);
    const A = Math.atan2(p.ang, 1);
    const fx0 = W * p.fx, fy0 = H * p.fy;

    // ── 1. BRIGHT NEBULAR GROUND — a luminous saturated field, never near-black.
    // Nebula Field gets the brightest lift; the rest stay bright but with more
    // room for energy contrast.
    const lift = p.layout === 'Nebula Field' ? 1.0 : p.layout === 'Aurora Bands' ? 0.5 : 0.2;
    paintGround(x, W, H, P, r, fx0, fy0, lift);

    // ── 2. FAR HAZE PLANE — fbm wash giving the gas depth + first density. ──
    K.hazeSheet(x, W, H, noise, K.mix(P.atmo, P.halo, 0.4), 0.14, 150, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.ground, P.atmo, 0.7), 0.10, 95, 'screen');

    // ── 3. THE LAYOUT — the structural identity of the piece. ──
    let focal;
    switch (p.layout) {
      case 'Single Core':   focal = layoutSingleCore(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Constellation': focal = layoutConstellation(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Filament Web':  focal = layoutWeb(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Nebula Field':  focal = layoutNebula(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Plume':         focal = layoutPlume(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Aurora Bands':  focal = layoutAurora(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Discharge':     focal = layoutDischarge(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      default:              focal = { fx: fx0, fy: fy0 };
    }
    const fx = focal && focal.fx != null ? focal.fx : fx0;
    const fy = focal && focal.fy != null ? focal.fy : fy0;

    // ── 4. RARE CHASE EVENTS ── (skip on field/aurora where they'd fight the comp)
    if (p.event === 'Energy Burst' && p.layout !== 'Aurora Bands' && p.layout !== 'Nebula Field') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const rays = 12 + Math.floor(r() * 10);
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2 + r() * 0.4;
        const L = maxWH * (0.35 + r() * 0.55);
        const ex = fx + Math.cos(a0) * L, ey = fy + Math.sin(a0) * L;
        const g = x.createLinearGradient(fx, fy, ex, ey);
        g.addColorStop(0, K.rgba(P.peak, 0.4));
        g.addColorStop(0.3, K.rgba(P.spark, 0.18));
        g.addColorStop(1, K.rgba(P.spark, 0));
        x.strokeStyle = g; x.lineWidth = 1 + r() * 2.2; x.lineCap = 'round';
        x.beginPath(); x.moveTo(fx, fy); x.lineTo(ex, ey); x.stroke();
      }
      x.restore();
      K.bloom(x, fx, fy, maxWH * 0.4, K.mix(P.peak, P.core, 0.3), 0.34);
    } else if (p.event === 'Eclipse Core' && p.layout !== 'Nebula Field') {
      // dark-star: heart occluded (still a COLOR, never black), brilliant corona.
      x.save(); x.globalCompositeOperation = 'source-over';
      const cr = minWH * 0.13;
      const g = x.createRadialGradient(fx, fy, 0, fx, fy, cr);
      g.addColorStop(0, K.rgba(K.mix(P.ground, P.atmo, 0.5), 0.72));
      g.addColorStop(0.7, K.rgba(K.mix(P.ground, P.atmo, 0.5), 0.4));
      g.addColorStop(1, K.rgba(P.ground, 0));
      x.fillStyle = g; x.beginPath(); x.arc(fx, fy, cr, 0, Math.PI * 2); x.fill();
      x.restore();
      x.save(); x.globalCompositeOperation = 'lighter';
      const rg = x.createRadialGradient(fx, fy, cr * 0.8, fx, fy, cr * 1.5);
      rg.addColorStop(0, K.rgba(P.peak, 0));
      rg.addColorStop(0.5, K.rgba(P.peak, 0.6));
      rg.addColorStop(0.65, K.rgba(P.spark, 0.45));
      rg.addColorStop(1, K.rgba(P.halo, 0));
      x.fillStyle = rg; x.fillRect(fx - cr * 1.5, fy - cr * 1.5, cr * 3, cr * 3);
      x.restore();
    }

    // ── 5. FINISH — fine grain to keep big hazy fields filmic, gentle chroma
    //    shimmer, and a COLOR vignette (never black) so corners settle while the
    //    saturated-ground mandate holds. ──
    K.mottle(x, 0, 0, W, H, K.mix(P.atmo, P.peak, 0.4), 3200, r, 'soft-light');
    K.grain(x, W, H, 640, r);
    K.chromaSplit(x, W, H, 1);
    {
      // colored vignette — a deeper saturated hue, NOT black, so corners read color.
      const g = x.createRadialGradient(W / 2, H / 2, minWH * 0.34, W / 2, H / 2, maxWH * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, K.rgba(K.mix(P.ground, P.atmo, 0.3), 0.22));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'plasma2', draw, traits };
})();
