/* CINDER — a colossal molten foundry at night.
 * Pour-streams of glowing metal fall from gantry cranes in silhouette; a storm
 * of embers rises into an aurora overhead. Heat, smoke, danger. Fire below,
 * cold light above.
 *
 * SURREAL: the embers freeze mid-air into a constellation (rigid lattice of
 * dots + faint joining lines high in the sky), and the aurora bleeds DOWN into
 * the molten pour — cold green light pooling where hot metal falls. Cranes can
 * float, scale can break, a pour can hang in the air.
 *
 * LAYOUT AXIS (seed-picked, 6 structurally distinct pictures — different
 * framing / camera / scale / negative-space balance, NOT the same scene moved):
 *   Foundry Floor  — wide establishing shot, many pours across the floor.
 *   Hero Pour      — ONE colossal pour close-up, sparks filling the frame; no
 *                    horizon, no crane row — pure heat and scale.
 *   Gantry Cathedral — low angle looking UP at a forest of gantry cranes
 *                    against the aurora; foundry glow below the lower edge.
 *   Ember Tempest  — ember storm dominant; the foundry is a thin glowing strip
 *                    pinned to the very base, sky boils with embers.
 *   Aurora Expanse — aurora sky dominant (big negative space), just a sliver of
 *                    molten glow + a few far stacks low in frame.
 *   Crucible Row   — a receding row of glowing crucibles marching into fog
 *                    (one-point perspective, deep recession).
 *
 * Palette family — INCANDESCENT vs AURORA: white-hot orange #ff7a18 /
 * molten yellow-white #ffe7a8 (fire below) / aurora green #38f5b0 + cyan
 * (cold light above) / cold steel blue-black #0a1422 ground.
 *
 * Depth in every layout: BG = aurora sky + far hazy stacks dissolving into
 * smoke (desaturated, low-contrast). MID = ember storm + crane silhouettes
 * (hazier, cooler with height). FG = molten pours / crucibles (bright additive
 * bloom). Atmospheric perspective: far = washed out, near = saturated & sharp. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways — all INCANDESCENT vs AURORA. Vary the balance of fire vs cold
  // light, aurora hue, and the temperature of the smoke, while staying in the
  // orange-below / green-cyan-above / steel-ground family.
  const PALS = [
    { name: 'Foundry Night', ground:'#0a1422', sky:'#08131f', skyHi:'#0c2236',
      hot:'#ff7a18', white:'#ffe7a8', deep:'#b8340a', aur1:'#38f5b0', aur2:'#3ad0ff', smoke:'#16202e' },
    { name: 'Aurora Pour',   ground:'#081420', sky:'#06131d', skyHi:'#0a2a3a',
      hot:'#ff8a22', white:'#fff0bc', deep:'#c23a08', aur1:'#46ffc0', aur2:'#54e0ff', smoke:'#122230' },
    { name: 'Slag Green',    ground:'#091a1c', sky:'#06181c', skyHi:'#0a3030',
      hot:'#ff6a10', white:'#ffe2a0', deep:'#a82e08', aur1:'#5cffae', aur2:'#34f0d6', smoke:'#0e2426' },
    { name: 'Cold Crucible', ground:'#0a1426', sky:'#070f22', skyHi:'#0e2046',
      hot:'#ff7e1c', white:'#ffe9b2', deep:'#b03208', aur1:'#3ae0ff', aur2:'#6aa8ff', smoke:'#141e34' },
    { name: 'Ember Storm',   ground:'#0c1018', sky:'#0a0e16', skyHi:'#141a28',
      hot:'#ff8a14', white:'#ffeaa0', deep:'#cc3a06', aur1:'#48f0a0', aur2:'#9ad84a', smoke:'#18202c' },
    { name: 'Magma Veil',    ground:'#120e16', sky:'#0e0a14', skyHi:'#221432',
      hot:'#ff6c1a', white:'#ffd89a', deep:'#b62a14', aur1:'#56f0c0', aur2:'#c065ff', smoke:'#1c1420' },
  ];

  // Each layout has a default canvas shape that serves the composition.
  const LAYOUTS = ['Foundry Floor', 'Hero Pour', 'Gantry Cathedral', 'Ember Tempest', 'Aurora Expanse', 'Crucible Row'];

  // Surreal anomaly per seed (a few are layout-specific in their expression).
  const ANOM = ['Frozen Constellation', 'Aurora Bleed', 'Floating Crane', 'Hanging Pour', 'Mirrored Pour'];

  function params(r, seed) {
    const pal = K.pick(PALS, r);
    // Layout is spread EVENLY across consecutive seeds (not drawn from the shared
    // rng) so any run of seeds shows the full structural range rather than
    // clustering on one composition. A fixed permutation breaks the dull 0,1,2…
    // march while staying a pure deterministic function of the seed.
    const PERM = [1, 4, 2, 5, 0, 3];
    const layout = LAYOUTS[PERM[((seed % LAYOUTS.length) + LAYOUTS.length) % LAYOUTS.length]];
    const anom = K.pick(ANOM, r);
    // Canvas shape tuned per layout so the framing reads correctly.
    let W, H, fmt;
    switch (layout) {
      case 'Hero Pour':        W = 940;  H = 1240; fmt = 'Portrait'; break;
      case 'Gantry Cathedral': W = 980;  H = 1240; fmt = 'Tall';     break;
      case 'Ember Tempest':    W = 1020; H = 1240; fmt = 'Tall';     break;
      case 'Aurora Expanse':   W = 1000; H = 1240; fmt = 'Tall';     break;
      case 'Crucible Row':     W = 1240; H = 1040; fmt = 'Wide';     break;
      default:                 W = 1240; H = 1000; fmt = 'Wide';     break; // Foundry Floor
    }
    // Focal X for the hero element — biased off-centre on thirds.
    const focusX = K.pick([0.30, 0.38, 0.5, 0.62, 0.70], r);
    return {
      pal, layout, fmt, anom, focusX, W, H,
      pours: K.rint(r, 2, 4),
      cranes: K.rint(r, 2, 4),
      emberDensity: K.pick(['Storm', 'Blizzard', 'Inferno'], r),
      auroraHue: r(),                   // lean aur1<->aur2
      smokeAmt: 0.7 + r() * 0.6,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed), seed);
    return {
      Layout: p.layout,
      Palette: p.pal.name,
      Anomaly: p.anom,
      Embers: p.emberDensity,
      Pours: p.pours,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  SHARED PRIMITIVES (palette-world building blocks reused by every layout)
  // ════════════════════════════════════════════════════════════════════════

  // Sky gradient: cold steel blue-black up top, warming toward the foundry glow
  // at the bottom. `glowFrac` = how far up the warm glow reaches (0..1).
  function skyGradient(x, P, W, H, glowFrac) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.sky);
    g.addColorStop(0.30, K.mix(P.sky, P.skyHi, 0.5));
    g.addColorStop(0.55, P.skyHi);
    g.addColorStop(K.clamp(1 - glowFrac, 0.6, 0.92), K.mix(P.skyHi, P.deep, 0.18));
    g.addColorStop(1, K.mix(P.ground, P.deep, 0.22));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }

  // A soft vertical aurora curtain wavering with noise; additive so they sheet.
  function auroraCurtain(x, cx, w, col, noise, topY, botY, a0, seed) {
    x.save(); x.globalCompositeOperation = 'screen';
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const y = topY + (botY - topY) * t;
      const wob = noise.fbm((cx) / 120, (y) / 80 + seed, 4) * w * 0.7;
      const xc = cx + wob;
      const va = a0 * Math.sin(Math.PI * t) * (0.6 + 0.4 * (1 - t));
      const ww = w * (0.7 + 0.6 * (1 - t));
      const g = x.createLinearGradient(xc - ww, 0, xc + ww, 0);
      g.addColorStop(0, K.rgba(col, 0));
      g.addColorStop(0.5, K.rgba(col, va));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.fillRect(xc - ww, y, ww * 2, (botY - topY) / steps + 2);
    }
    x.restore();
  }

  // Fill the upper sky with aurora curtains + a broad glow wash.
  function auroraSky(x, P, W, H, aur, noise, r, seed, topY, botY, count, strength) {
    const nC = count;
    for (let i = 0; i < nC; i++) {
      const cx = W * (0.08 + 0.84 * (i + r() * 0.6) / nC);
      const col = i % 2 === 0 ? P.aur1 : aur;
      auroraCurtain(x, cx, W * (0.10 + r() * 0.13), col, noise,
        topY + (botY - topY) * (r() * 0.06), botY * (0.8 + r() * 0.2),
        (0.14 + r() * 0.14) * strength, seed + i);
    }
    K.bloom(x, W * (0.3 + r() * 0.4), (topY + botY) * 0.5, W * 0.7, aur, 0.06 * strength);
  }

  // Far hazy smokestacks dissolving into smoke near a baseline. Desaturated /
  // low-contrast for atmospheric depth. `scale` shrinks them for far reads.
  function smokestacks(x, P, W, H, aur, noise, r, baseY, count, scale, opacity) {
    for (let i = 0; i < count; i++) {
      const sx = W * (0.02 + r() * 0.96);
      const sh = ((H * 0.10) + r() * (H * 0.22)) * scale;
      const sw = (7 + r() * 24) * scale;
      const dist = r();
      const col = K.mix(P.smoke, P.skyHi, 0.35 + dist * 0.4);
      x.fillStyle = K.rgba(col, (0.4 + (1 - dist) * 0.3) * opacity);
      x.fillRect(sx, baseY - sh, sw, sh);
      x.fillStyle = K.rgba(K.mix(P.smoke, '#000', 0.3), 0.2 * (1 - dist) * opacity);
      x.fillRect(sx, baseY - sh, sw * 0.4, sh);
      x.save(); x.globalCompositeOperation = 'screen';
      let pxp = sx + sw / 2;
      for (let s = 0; s < 8; s++) {
        const py = baseY - sh - s * (H * 0.026);
        pxp += (noise.fbm(pxp / 60, py / 60, 3)) * 13;
        const pcol = s > 5 ? K.mix(P.smoke, aur, 0.25) : P.smoke;
        K.bloom(x, pxp, py, 14 + s * 8, pcol, (0.06 + (1 - dist) * 0.04) * opacity);
      }
      x.restore();
    }
  }

  // A molten pour: bright additive vertical streak with hot core + halo and a
  // splash fan at its base. `splash` toggles the impact spark-fan/bloom.
  function moltenPour(x, P, px, topY, botY, w, noise, r, bleed, seed, splash) {
    if (splash === undefined) splash = true;
    const segs = 90;
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let pass = 0; pass < 3; pass++) {
      const hw = w * (pass === 0 ? 3.4 : pass === 1 ? 2.0 : 1.0);
      const col = pass === 0 ? P.deep : pass === 1 ? P.hot : P.white;
      const a = pass === 0 ? 0.10 : pass === 1 ? 0.22 : 0.5;
      x.beginPath();
      const widthAt = (t) => {
        const lip = 0.6 + 0.5 * Math.exp(-t * 8);
        const fall = 0.5 + 0.5 * (1 - t * 0.5);
        const sp = 1 + 1.2 * Math.pow(Math.max(0, t - 0.88) / 0.12, 2);
        return hw * 0.7 * lip * fall * (splash ? sp : 1);
      };
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, y = topY + (botY - topY) * t;
        const wob = noise.fbm(px / 60, y / 40 + seed * 3, 4) * w * 1.1;
        const xx = px + wob, half = widthAt(t);
        if (i === 0) x.moveTo(xx - half, y); else x.lineTo(xx - half, y);
      }
      for (let i = segs; i >= 0; i--) {
        const t = i / segs, y = topY + (botY - topY) * t;
        const wob = noise.fbm(px / 60, y / 40 + seed * 3, 4) * w * 1.1;
        const xx = px + wob, half = widthAt(t);
        x.lineTo(xx + half, y);
      }
      x.closePath();
      x.fillStyle = K.rgba(col, a);
      x.fill();
    }
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = K.rgba(pass === 0 ? P.white : '#ffffff', pass === 0 ? 0.7 : 0.85);
      x.lineWidth = w * (pass === 0 ? 1.0 : 0.4);
      x.beginPath();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, y = topY + (botY - topY) * t;
        const wob = noise.fbm(px / 60, y / 40 + seed * 3, 4) * w * 1.1;
        const xx = px + wob;
        if (i === 0) x.moveTo(xx, y); else x.lineTo(xx, y);
      }
      x.stroke();
    }
    x.restore();
    if (bleed) {
      x.save(); x.globalCompositeOperation = 'screen';
      const g = x.createLinearGradient(0, topY + (botY - topY) * 0.45, 0, botY);
      g.addColorStop(0, K.rgba(P.aur1, 0));
      g.addColorStop(1, K.rgba(P.aur1, 0.5));
      x.fillStyle = g;
      x.fillRect(px - w * 4, topY + (botY - topY) * 0.45, w * 8, (botY - topY) * 0.55);
      x.restore();
    }
    if (splash) {
      K.bloom(x, px, botY, w * 6, P.white, 0.4);
      K.bloom(x, px, botY, w * 12, P.hot, 0.22);
      x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
      const sparks = 70 + Math.floor(w * 6);
      for (let i = 0; i < sparks; i++) {
        const side = r() < 0.5 ? -1 : 1;
        const ang = side * (Math.PI * (0.12 + r() * 0.36));
        const sp = (8 + r() * 70) * (0.6 + w * 0.08);
        const ex = px + Math.sin(ang) * sp;
        const ey = botY - Math.abs(Math.cos(ang)) * sp * (0.5 + r() * 0.5) * 0.8 + (r() - 0.5) * 6;
        const col = r() < 0.4 ? P.white : P.hot;
        x.strokeStyle = K.rgba(col, 0.5 + r() * 0.4);
        x.lineWidth = 0.6 + r() * 1.3;
        x.beginPath(); x.moveTo(px + side * w * 0.4, botY); x.lineTo(ex, ey); x.stroke();
      }
      x.restore();
    }
    return { px, botY };
  }

  // Gantry crane silhouette: lattice mast + jib with a hanging ladle, near-black
  // against the glow. fade = atmospheric (far paler). lit = glowing molten lip.
  function crane(x, P, cx, baseY, h, dir, fade, r, lit) {
    const col = K.mix('#000000', P.smoke, fade * 0.7 + 0.1);
    const topY = baseY - h;
    const lw = 2 + (1 - fade) * 4;
    x.save();
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = lw; x.lineJoin = 'round';
    const railGap = lw * 1.6 + h * 0.012;
    x.beginPath(); x.moveTo(cx - railGap, baseY); x.lineTo(cx - railGap, topY); x.stroke();
    x.beginPath(); x.moveTo(cx + railGap, baseY); x.lineTo(cx + railGap, topY); x.stroke();
    x.lineWidth = Math.max(0.6, lw * 0.4);
    for (let yy = topY; yy < baseY; yy += 14) {
      x.beginPath();
      x.moveTo(cx - railGap, yy); x.lineTo(cx + railGap, yy + 7);
      x.moveTo(cx + railGap, yy); x.lineTo(cx - railGap, yy + 7);
      x.stroke();
    }
    const jib = h * (0.5 + r() * 0.4) * dir;
    x.lineWidth = lw * 0.9;
    x.beginPath(); x.moveTo(cx, topY + h * 0.04); x.lineTo(cx + jib, topY + h * 0.12); x.stroke();
    x.beginPath(); x.moveTo(cx, topY + h * 0.04); x.lineTo(cx - jib * 0.32, topY + h * 0.10); x.stroke();
    x.lineWidth = Math.max(0.6, lw * 0.4);
    x.beginPath(); x.moveTo(cx, topY - h * 0.04); x.lineTo(cx + jib, topY + h * 0.12); x.stroke();
    const lx = cx + jib * (0.55 + r() * 0.3);
    const ly = topY + h * 0.10;
    const dropY = ly + h * (0.18 + r() * 0.22);
    x.lineWidth = Math.max(0.6, lw * 0.5);
    x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx, dropY); x.stroke();
    const lw2 = h * 0.06;
    x.beginPath();
    x.moveTo(lx - lw2, dropY); x.lineTo(lx + lw2, dropY);
    x.lineTo(lx + lw2 * 0.7, dropY + lw2 * 1.3); x.lineTo(lx - lw2 * 0.7, dropY + lw2 * 1.3);
    x.closePath(); x.fill();
    x.restore();
    if (lit) {
      K.bloom(x, lx, dropY, lw2 * 2.2, P.hot, 0.5);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(P.white, 0.8);
      x.beginPath(); x.ellipse(lx, dropY, lw2 * 0.9, lw2 * 0.3, 0, 0, 7); x.fill();
      x.restore();
    }
    return { lx, lipY: dropY + lw2 * 1.3, h };
  }

  // A glowing crucible/cauldron: dark vessel rim with an incandescent molten
  // top, set in fog. Used by Crucible Row (and as foreground props elsewhere).
  function crucible(x, P, cx, cy, rad, fade, r) {
    const dark = K.mix('#000000', P.smoke, fade * 0.6 + 0.08);
    const heat = 1 - fade;
    // under-glow cast on the floor BEFORE the vessel (so the vessel sits in it)
    K.bloom(x, cx, cy + rad * 0.4, rad * 3.2, P.deep, 0.16 * heat);
    // vessel body — a heavy industrial ladle: truncated cone with banded steel
    x.save();
    x.fillStyle = dark;
    x.beginPath();
    x.moveTo(cx - rad, cy);
    x.lineTo(cx + rad, cy);
    x.lineTo(cx + rad * 0.58, cy + rad * 1.7);
    x.lineTo(cx - rad * 0.58, cy + rad * 1.7);
    x.closePath(); x.fill();
    // shading: darker on one side for roundness
    const sg = x.createLinearGradient(cx - rad, 0, cx + rad, 0);
    sg.addColorStop(0, K.rgba('#000', 0.45));
    sg.addColorStop(0.5, K.rgba('#000', 0));
    sg.addColorStop(1, K.rgba('#000', 0.30));
    x.fillStyle = sg;
    x.beginPath();
    x.moveTo(cx - rad, cy); x.lineTo(cx + rad, cy);
    x.lineTo(cx + rad * 0.58, cy + rad * 1.7); x.lineTo(cx - rad * 0.58, cy + rad * 1.7);
    x.closePath(); x.fill();
    // hot rim glow from the molten contents spilling light over the lip
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.hot, 0.5 * heat); x.lineWidth = Math.max(1, rad * 0.05);
    x.beginPath(); x.ellipse(cx, cy, rad, rad * 0.32, 0, 0, Math.PI, false); x.stroke();
    // reinforcing band + two trunnion lugs (the pour-axle bosses)
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = K.mix(dark, '#000', 0.35);
    x.fillRect(cx - rad * 0.98, cy + rad * 0.55, rad * 1.96, rad * 0.18);
    x.beginPath(); x.arc(cx - rad * 0.95, cy + rad * 0.6, rad * 0.16, 0, 7); x.fill();
    x.beginPath(); x.arc(cx + rad * 0.95, cy + rad * 0.6, rad * 0.16, 0, 7); x.fill();
    x.restore();
    // molten top — bright elliptical surface with bloom
    K.bloom(x, cx, cy, rad * 2.4, P.hot, 0.32 * heat);
    K.bloom(x, cx, cy, rad * 1.1, P.white, 0.5 * heat);
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(P.white, 0.95 * heat));
    g.addColorStop(0.5, K.rgba(P.hot, 0.7 * heat));
    g.addColorStop(1, K.rgba(P.deep, 0));
    x.fillStyle = g;
    x.beginPath(); x.ellipse(cx, cy, rad, rad * 0.34, 0, 0, 7); x.fill();
    x.restore();
    // sparks lifting off the molten surface
    x.save(); x.globalCompositeOperation = 'lighter';
    const ns = Math.floor(12 * heat);
    for (let i = 0; i < ns; i++) {
      const ex = cx + (r() - 0.5) * rad * 1.6;
      const ey = cy - r() * rad * 2.2;
      x.fillStyle = K.rgba(r() < 0.4 ? P.white : P.hot, 0.4 + r() * 0.4);
      x.fillRect(ex, ey, 0.8 + r() * 1.4, 0.8 + r() * 1.4);
    }
    x.restore();
    return { cx, cy, rad };
  }

  // Ember storm: thousands of advected glowing streaks filling an air band.
  // density 0..1, band defined by [topY,botY]; hot/white low, aurora high.
  // sourceXs = array of x's to bias density toward (pours/crucibles); empty = even.
  function emberStorm(x, P, W, H, aur, noise, r, topY, botY, count, sourceXs, spread) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const nearSrc = sourceXs.length && r() < 0.42;
      let bx0;
      if (nearSrc) {
        const sx = sourceXs[Math.floor(r() * sourceXs.length)];
        bx0 = sx + K.randn(r) * (W * 0.16);
      } else bx0 = r() * W;
      const rise = Math.pow(r(), nearSrc ? 1.5 : 1.12);
      const ey = botY - rise * (botY - topY);
      const fl = K.curl(noise, bx0 * 0.7, ey * 0.7, 2);
      const wander = (fl[0]) * (60 + rise * W * spread) + K.randn(r) * (20 + rise * W * spread * 0.6);
      const ex = bx0 + wander;
      if (ex < -10 || ex > W + 10) continue;
      let col, a, sz;
      if (rise < 0.40) { col = r() < 0.35 ? P.white : P.hot; a = 0.45 + r() * 0.45; sz = 0.6 + r() * 1.7; }
      else if (rise < 0.72) { col = K.mix(P.hot, aur, (rise - 0.40) / 0.32); a = 0.28 + r() * 0.32; sz = 0.5 + r() * 1.3; }
      else { col = K.mix(aur, P.aur1, r()); a = 0.10 + r() * 0.20; sz = 0.4 + r() * 0.9; }
      const ang = Math.atan2(-1, fl[0] * 1.2);
      const len = (1.5 + rise * 5) * (0.5 + r());
      x.strokeStyle = K.rgba(col, a);
      x.lineWidth = sz; x.lineCap = 'round';
      x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + Math.cos(ang) * len, ey + Math.sin(ang) * len); x.stroke();
      if (r() < 0.010) K.bloom(x, ex, ey, sz * 7, col, 0.35);
    }
    x.restore();
  }

  // Incandescent molten floor crust between [topY,H]. Hottest at topY, cooling
  // down. `heatBoost` raises overall brightness for fire-dominant layouts.
  function moltenFloor(x, P, W, H, noise, r, seed, topY, heatBoost) {
    // base warm gradient so the floor is never dead black
    const g = x.createLinearGradient(0, topY - H * 0.04, 0, H);
    g.addColorStop(0, K.rgba(P.deep, 0));
    g.addColorStop(0.18, K.mix(P.ground, P.deep, 0.5));
    g.addColorStop(0.55, K.mix(P.ground, P.deep, 0.18));
    g.addColorStop(1, K.mix(P.ground, '#000', 0.32));
    x.fillStyle = g; x.fillRect(0, topY - H * 0.06, W, H - (topY - H * 0.06));
    x.save(); x.globalCompositeOperation = 'lighter';
    const floorTop = topY + H * 0.01;
    const step = 7;
    for (let yy = floorTop; yy < H; yy += step) {
      const depth = (yy - floorTop) / (H - floorTop);
      const heat = Math.pow(1 - depth, 1.6) * heatBoost;
      for (let xx = 0; xx < W; xx += step) {
        const n = (noise.fbm(xx / 70, yy / 50 + seed, 5, 0.55, 2.2) + 1) / 2;
        const crack = Math.pow(n, 4) * 1.4;
        const glow = crack * heat;
        if (glow < 0.04) continue;
        const col = glow > 0.5 ? P.white : P.hot;
        x.fillStyle = K.rgba(col, Math.min(0.55, glow * 0.5));
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  // Jagged dark industrial roofline cap drawn at baseline.
  function roofline(x, P, W, H, r, baseY, amp) {
    x.fillStyle = K.mix(P.ground, '#000', 0.35);
    x.beginPath();
    x.moveTo(0, baseY + H * 0.10);
    x.lineTo(0, baseY + (r() - 0.5) * 10);
    let cx = 0;
    while (cx < W) {
      const step = 30 + r() * 80;
      const hh = (r() - 0.5) * amp;
      x.lineTo(cx, baseY + hh);
      x.lineTo(cx + step * 0.5, baseY + hh);
      cx += step;
    }
    x.lineTo(W, baseY); x.lineTo(W, baseY + H * 0.10);
    x.closePath(); x.fill();
  }

  // Frozen constellation: rigid lattice of bright dots + joining lines high up.
  function frozenConstellation(x, P, W, H, aur, r, topY, botY) {
    const nStars = K.rint(r, 14, 22);
    const stars = [];
    for (let i = 0; i < nStars; i++) stars.push([W * (0.12 + r() * 0.76), topY + r() * (botY - topY)]);
    x.save(); x.globalCompositeOperation = 'screen';
    x.strokeStyle = K.rgba(aur, 0.28); x.lineWidth = 0.8;
    for (let i = 0; i < stars.length; i++) {
      let best = -1, bd = 1e9;
      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue;
        const d = (stars[i][0] - stars[j][0]) ** 2 + (stars[i][1] - stars[j][1]) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) { x.beginPath(); x.moveTo(stars[i][0], stars[i][1]); x.lineTo(stars[best][0], stars[best][1]); x.stroke(); }
    }
    x.restore();
    for (const s of stars) {
      K.bloom(x, s[0], s[1], 7 + r() * 8, P.white, 0.6);
      K.bloom(x, s[0], s[1], 16 + r() * 14, aur, 0.3);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba('#ffffff', 0.9);
      x.beginPath(); x.arc(s[0], s[1], 1.4 + r() * 1.2, 0, 7); x.fill();
      x.restore();
    }
  }

  // Volumetric smoke band (fbm), cooler with height.
  function smokeBand(x, P, W, H, aur, noise, r, seed, topY, botY, amt) {
    x.save(); x.globalCompositeOperation = 'screen';
    const step = 6;
    for (let yy = topY; yy < botY; yy += step) {
      const rise = 1 - (yy - topY) / (botY - topY);
      for (let xx = 0; xx < W; xx += step) {
        const n = (noise.fbm(xx / 130, yy / 90 - seed, 5, 0.55, 2.1) + 1) / 2;
        const dense = Math.pow(n, 2.2) * amt;
        if (dense < 0.08) continue;
        const col = rise > 0.55 ? K.mix(P.smoke, aur, (rise - 0.55) * 0.5) : K.mix(P.smoke, P.deep, (0.55 - rise) * 0.4);
        x.fillStyle = K.rgba(col, dense * 0.15);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LAYOUTS — each composes the primitives into a structurally distinct shot.
  // ════════════════════════════════════════════════════════════════════════

  // (1) FOUNDRY FLOOR — wide eye-level establishing shot, many pours.
  function layoutFoundryFloor(x, p, P, W, H, aur, noise, r, seed) {
    const horizon = H * (0.58 + r() * 0.06);
    skyGradient(x, P, W, H, 0.32);
    auroraSky(x, P, W, H, aur, noise, r, seed, H * 0.0, horizon * 0.86, K.rint(r, 3, 5), 1.0);
    smokestacks(x, P, W, H, aur, noise, r, horizon, K.rint(r, 6, 11), 1.0, 1.0);

    if (p.anom === 'Aurora Bleed') auroraColumn(x, P, W, H, aur, noise, r, W * p.focusX, H * 0.16, horizon + H * 0.10);

    moltenFloor(x, P, W, H, noise, r, seed, horizon + H * 0.02, 1.0);
    roofline(x, P, W, H, r, horizon, H * 0.06);

    const litCranes = drawCraneRow(x, p, P, W, H, r, horizon, p.cranes, p.focusX);

    const poolY = horizon + H * 0.04;
    const pours = buildPours(p, P, W, H, r, horizon, poolY, litCranes, p.pours);
    drawPoolGlow(x, P, W, H, poolY, pours);
    for (const po of pours) moltenPour(x, P, po.px, po.topY, po.botY, po.w, noise, r, po.bleed, seed, true);
    if (p.anom === 'Mirrored Pour' && pours[0]) mirroredPour(x, P, pours[0], noise, r, seed);

    emberStorm(x, P, W, H, aur, noise, r, H * 0.04, poolY, emberN(p), pours.map(po => po.px), 0.32);
    if (p.anom === 'Frozen Constellation') frozenConstellation(x, P, W, H, aur, r, H * 0.08, H * 0.40);
    smokeBand(x, P, W, H, aur, noise, r, seed, H * 0.2, horizon + H * 0.06, p.smokeAmt);
    finishHaze(x, P, W, H, aur, noise, horizon);
    K.bloom(x, W * p.focusX, poolY, W * 0.5, P.hot, 0.07);
  }

  // (2) HERO POUR — ONE colossal pour close-up; sparks fill the frame. No
  // horizon line, no crane row. Pure heat + scale, big bright central mass.
  function layoutHeroPour(x, p, P, W, H, aur, noise, r, seed) {
    skyGradient(x, P, W, H, 0.55);
    // faint aurora only at the very top — this shot is fire-dominant
    auroraSky(x, P, W, H, aur, noise, r, seed, H * 0.0, H * 0.30, 3, 0.5);
    // the pour fills the vertical frame; pool at the very bottom
    const px = W * (0.42 + (p.focusX - 0.5) * 0.5);
    const poolY = H * (0.86 + r() * 0.04);
    const w = 26 + r() * 14;                 // COLOSSAL
    const topY = -H * 0.05;                  // streams in from above frame
    // huge warm glow behind the pour
    K.bloom(x, px, H * 0.55, W * 0.75, P.deep, 0.20);
    K.bloom(x, px, poolY, W * 0.9, P.hot, 0.16);
    // a faint ladle silhouette overhead the pour leaves from
    drawLadleHead(x, P, px, topY + H * 0.02, w * 1.6, r);
    drawPoolGlow(x, P, W, H, poolY, [{ px, w }]);
    // dense ember haze rising around the column, filling the air
    emberStorm(x, P, W, H, aur, noise, r, H * 0.02, poolY, emberN(p) + 2000, [px, px, W * 0.5], 0.45);
    // the hero pour itself
    moltenPour(x, P, px, topY, poolY, w, noise, r, p.anom === 'Aurora Bleed', seed, true);
    // a second, much smaller pour far off to one side for scale contrast
    const sx = px < W * 0.5 ? W * (0.80 + r() * 0.12) : W * (0.08 + r() * 0.12);
    moltenPour(x, P, sx, H * 0.12, poolY, 5 + r() * 3, noise, r, false, seed + 5, true);
    if (p.anom === 'Mirrored Pour') mirroredPour(x, P, { px, topY: H * 0.30, botY: poolY, w }, noise, r, seed);
    // foreground spark fountain across the bottom from the impact
    sparkFountain(x, P, W, H, px, poolY, r, 220);
    if (p.anom === 'Frozen Constellation') frozenConstellation(x, P, W, H, aur, r, H * 0.06, H * 0.26);
    smokeBand(x, P, W, H, aur, noise, r, seed, H * 0.1, H * 0.7, p.smokeAmt * 0.8);
    // tight warm vignette of heat
    K.bloom(x, px, poolY, W * 0.4, P.white, 0.10);
  }

  // (3) GANTRY CATHEDRAL — low angle looking UP at a forest of gantry cranes
  // against the aurora. The foundry glow lives below the lower edge (warm
  // up-light). Big sky, converging vertical masts, sense of towering scale.
  function layoutGantryCathedral(x, p, P, W, H, aur, noise, r, seed) {
    skyGradient(x, P, W, H, 0.22);
    // aurora dominates the upper 70% of frame
    auroraSky(x, P, W, H, aur, noise, r, seed, H * 0.0, H * 0.62, K.rint(r, 4, 6), 1.25);
    if (p.anom === 'Frozen Constellation') frozenConstellation(x, P, W, H, aur, r, H * 0.05, H * 0.40);
    // warm up-glow from the (unseen) foundry below the bottom edge
    x.save(); x.globalCompositeOperation = 'screen';
    const ug = x.createLinearGradient(0, H * 0.55, 0, H);
    ug.addColorStop(0, K.rgba(P.hot, 0));
    ug.addColorStop(0.7, K.rgba(P.deep, 0.22));
    ug.addColorStop(1, K.rgba(P.hot, 0.40));
    x.fillStyle = ug; x.fillRect(0, H * 0.55, W, H * 0.45);
    x.restore();
    K.bloom(x, W * p.focusX, H * 1.04, W * 0.95, P.hot, 0.30);
    K.bloom(x, W * (1 - p.focusX), H * 1.06, W * 0.5, P.deep, 0.20);
    // A forest of massive gantry cranes seen FROM BELOW: each mast is wide at
    // the bottom of frame and tapers/converges toward a high vanishing point —
    // the classic worm's-eye perspective. Far cranes hazier & thinner; the near
    // ones loom huge with bold lattice and a heavy jib arm crossing overhead.
    const nC = K.rint(r, 3, 5);
    const vanishY = -H * (0.10 + r() * 0.15);    // up out of frame
    const order = [];
    for (let i = 0; i < nC; i++) {
      const t = (i + 0.5) / nC;
      const baseX = W * (0.08 + 0.84 * t + (r() - 0.5) * 0.08);
      const dist = Math.abs(t - (0.35 + r() * 0.3)); // a couple read as "near"
      order.push({ baseX, dist, near: dist < 0.22 });
    }
    order.sort((a, b) => b.dist - a.dist); // far first
    let litDone = false;
    for (const c of order) {
      const fade = c.near ? (0.0 + r() * 0.08) : K.clamp(0.25 + c.dist * 0.9, 0, 0.7);
      const baseW = c.near ? W * (0.10 + r() * 0.05) : W * (0.035 + r() * 0.03);
      const lit = c.near && !litDone && r() < 0.8; if (lit) litDone = true;
      drawGantryUp(x, P, W, H, c.baseX, vanishY, baseW, fade, r, lit, p.focusX);
    }
    // a thin band of rising embers near the bottom (from the foundry below)
    emberStorm(x, P, W, H, aur, noise, r, H * 0.20, H, emberN(p), [W * p.focusX, W * (1 - p.focusX)], 0.30);
    smokeBand(x, P, W, H, aur, noise, r, seed, H * 0.05, H * 0.92, p.smokeAmt);
    K.hazeSheet(x, W, H, noise, aur, 0.12, 220, 'screen');
  }

  // (4) EMBER TEMPEST — ember storm dominant; the foundry is a thin glowing
  // strip pinned to the base. Sky boils with embers + aurora, huge motion.
  function layoutEmberTempest(x, p, P, W, H, aur, noise, r, seed) {
    const horizon = H * (0.84 + r() * 0.04); // foundry strip near the very base
    skyGradient(x, P, W, H, 0.20);
    auroraSky(x, P, W, H, aur, noise, r, seed, H * 0.0, horizon * 0.9, K.rint(r, 3, 5), 1.1);
    // far stacks small along the strip
    smokestacks(x, P, W, H, aur, noise, r, horizon, K.rint(r, 8, 14), 0.55, 0.8);
    moltenFloor(x, P, W, H, noise, r, seed, horizon, 1.2);
    roofline(x, P, W, H, r, horizon, H * 0.03);
    // a couple of small pours rising from the strip to feed the storm
    const litCranes = drawCraneRow(x, p, P, W, H, r, horizon, Math.min(2, p.cranes), p.focusX, 0.55);
    const poolY = horizon + H * 0.02;
    const pours = buildPours(p, P, W, H, r, horizon, poolY, litCranes, Math.min(3, p.pours));
    drawPoolGlow(x, P, W, H, poolY, pours);
    for (const po of pours) moltenPour(x, P, po.px, po.topY, po.botY, po.w * 0.8, noise, r, po.bleed, seed, true);
    // THE STORM — fills almost the whole frame, very dense, wide spread
    emberStorm(x, P, W, H, aur, noise, r, H * 0.02, poolY, emberN(p) + 3500, pours.map(po => po.px), 0.55);
    if (p.anom === 'Frozen Constellation') frozenConstellation(x, P, W, H, aur, r, H * 0.06, H * 0.40);
    smokeBand(x, P, W, H, aur, noise, r, seed, H * 0.05, horizon, p.smokeAmt * 1.1);
    K.hazeSheet(x, W, horizon, noise, aur, 0.10, 200, 'screen');
    K.bloom(x, W * p.focusX, poolY, W * 0.6, P.hot, 0.10);
  }

  // (5) AURORA EXPANSE — aurora sky dominant (big calm negative space). Just a
  // sliver of molten glow + a few far stacks low in frame. Sparse, atmospheric.
  function layoutAuroraExpanse(x, p, P, W, H, aur, noise, r, seed) {
    const horizon = H * (0.88 + r() * 0.05); // very low — sky owns the frame
    skyGradient(x, P, W, H, 0.14);
    // grand aurora across the whole sky
    auroraSky(x, P, W, H, aur, noise, r, seed, H * 0.0, horizon, K.rint(r, 4, 6), 1.4);
    if (p.anom === 'Frozen Constellation') frozenConstellation(x, P, W, H, aur, r, H * 0.10, H * 0.55);
    // distant tiny stacks as a low silhouette band
    smokestacks(x, P, W, H, aur, noise, r, horizon, K.rint(r, 10, 16), 0.42, 0.7);
    // a thin incandescent sliver of foundry along the base
    moltenFloor(x, P, W, H, noise, r, seed, horizon, 0.9);
    roofline(x, P, W, H, r, horizon, H * 0.018);
    // one or two distant tiny pours catching the eye on the strip
    const poolY = horizon + H * 0.012;
    const nP = K.rint(r, 1, 2);
    const pxs = [];
    for (let i = 0; i < nP; i++) {
      const px = W * (0.2 + r() * 0.6);
      pxs.push(px);
      moltenPour(x, P, px, horizon - H * (0.04 + r() * 0.05), poolY, 3 + r() * 2, noise, r, p.anom === 'Aurora Bleed', seed + i, true);
    }
    drawPoolGlow(x, P, W, H, poolY, pxs.map(px => ({ px, w: 4 })));
    // a faint thread of embers drifting up — sparse, doesn't crowd the sky
    emberStorm(x, P, W, H, aur, noise, r, H * 0.30, poolY, Math.floor(emberN(p) * 0.35), pxs, 0.40);
    smokeBand(x, P, W, H, aur, noise, r, seed, H * 0.35, horizon, p.smokeAmt * 0.7);
    K.hazeSheet(x, W, H, noise, aur, 0.14, 240, 'screen');
    K.bloom(x, W * p.focusX, horizon, W * 0.5, P.hot, 0.05);
  }

  // (6) CRUCIBLE ROW — a receding row of glowing crucibles marching into fog
  // (one-point perspective). Deep recession, near crucible large & bright, far
  // ones tiny & washed; gantries faintly arching over the lane.
  function layoutCrucibleRow(x, p, P, W, H, aur, noise, r, seed) {
    const horizon = H * (0.42 + r() * 0.06);
    skyGradient(x, P, W, H, 0.40);
    auroraSky(x, P, W, H, aur, noise, r, seed, H * 0.0, horizon, K.rint(r, 3, 5), 0.9);
    // deep fog wall at the vanishing point (kept subtle so it reads as fog)
    const vx = W * (0.42 + r() * 0.16), vy = horizon;
    K.bloom(x, vx, vy, W * 0.42, K.mix(P.smoke, aur, 0.22), 0.10);
    K.bloom(x, vx, vy + H * 0.06, W * 0.30, K.mix(P.smoke, P.deep, 0.3), 0.10);
    smokestacks(x, P, W, H, aur, noise, r, horizon, K.rint(r, 5, 9), 0.7, 0.7);
    // dark foundry floor
    moltenFloor(x, P, W, H, noise, r, seed, horizon + H * 0.01, 0.8);
    // the receding row: crucibles from far (top, small, faint, near vanishing
    // point) to near (bottom, large, bright). Two parallel rails of vessels.
    const nCru = K.rint(r, 6, 9);
    const cru = [];
    for (let i = 0; i < nCru; i++) {
      const t = i / (nCru - 1 || 1);            // 0 far → 1 near
      const depth = Math.pow(t, 1.3);
      const cy = (horizon + H * 0.02) + (H * 1.02 - (horizon + H * 0.02)) * depth;
      const rad = (W * 0.012) + (W * 0.16 - W * 0.012) * depth;
      const fade = 1 - depth * 0.95;
      // alternate the two rails left/right of the lane, lane narrows to vx
      const side = (i % 2 === 0) ? -1 : 1;
      const laneHalf = (W * 0.02) + (W * 0.34 - W * 0.02) * depth;
      const cx = vx + side * laneHalf;
      cru.push({ cx, cy, rad, fade });
    }
    // draw far→near so near ones overlap correctly
    for (const c of cru) crucible(x, P, c.cx, c.cy, c.rad, c.fade, r);
    // faint gantries arching over the lane in the distance
    if (r() < 0.7) {
      for (let i = 0; i < 2; i++) {
        const gx = vx + (i === 0 ? -1 : 1) * W * (0.10 + r() * 0.08);
        drawTowerCrane(x, P, gx, horizon + H * 0.04, H * 0.30, i === 0 ? 1 : -1, 0.55, r, false, 0);
      }
    }
    if (p.anom === 'Aurora Bleed') auroraColumn(x, P, W, H, aur, noise, r, vx, H * 0.10, horizon + H * 0.2);
    // embers drift up the lane, denser near
    emberStorm(x, P, W, H, aur, noise, r, horizon, H, Math.floor(emberN(p) * 0.7), cru.filter(c => c.fade > 0.4).map(c => c.cx), 0.30);
    if (p.anom === 'Frozen Constellation') frozenConstellation(x, P, W, H, aur, r, H * 0.05, H * 0.32);
    // thick fog rolling across the recession
    smokeBand(x, P, W, H, aur, noise, r, seed, horizon - H * 0.05, H * 0.92, p.smokeAmt * 1.2);
    K.hazeSheet(x, W, H, noise, aur, 0.12, 220, 'screen');
    K.bloom(x, cru[cru.length - 1].cx, cru[cru.length - 1].cy, W * 0.4, P.hot, 0.10);
  }

  // ── layout helper subroutines ──────────────────────────────────────────

  function emberN(p) {
    const counts = { Storm: 3600, Blizzard: 5200, Inferno: 7000 };
    return counts[p.emberDensity] || 4000;
  }

  function drawCraneRow(x, p, P, W, H, r, horizon, nCranes, focusX, scale) {
    scale = scale || 1;
    const craneList = [];
    for (let i = 0; i < nCranes; i++) {
      const isHero = i === nCranes - 1;
      const fade = isHero ? 0.0 : (0.5 - (i / nCranes) * 0.4 + r() * 0.1);
      const cx = isHero ? W * focusX + (r() - 0.5) * W * 0.08 : W * (0.08 + r() * 0.84);
      const baseY = horizon + (1 - fade) * H * 0.03 + r() * H * 0.02;
      const h = (H * (0.22 + r() * 0.18)) * (0.7 + (1 - fade) * 0.7) * scale;
      let by = baseY;
      if (p.anom === 'Floating Crane' && isHero) by = baseY - h * 0.12;
      craneList.push({ cx, by, h, dir: r() < 0.5 ? -1 : 1, fade, isHero });
    }
    craneList.sort((a, b) => b.fade - a.fade);
    const lit = [];
    for (const c of craneList) {
      const info = crane(x, P, c.cx, c.by, c.h, c.dir, c.fade, r, c.isHero);
      if (c.isHero) lit.push(info);
    }
    return lit;
  }

  function buildPours(p, P, W, H, r, horizon, poolY, litCranes, nPours) {
    const pours = [];
    for (let i = 0; i < nPours; i++) {
      const isHero = i === 0;
      let px = isHero ? (litCranes[0] ? litCranes[0].lx : W * p.focusX) : W * (0.12 + r() * 0.76);
      let topY = isHero && litCranes[0] ? litCranes[0].lipY : horizon - H * (0.10 + r() * 0.16);
      if (p.anom === 'Hanging Pour' && isHero) topY = H * 0.30 + r() * H * 0.1;
      const w = (isHero ? 7 : 3.5) + r() * 4;
      const botY = (p.anom === 'Hanging Pour' && isHero) ? topY + H * 0.22 : poolY + r() * H * 0.02;
      const bleed = (p.anom === 'Aurora Bleed') || (isHero && p.anom === 'Frozen Constellation' ? false : r() < 0.4);
      pours.push({ px, topY, botY, w, isHero, bleed });
    }
    return pours;
  }

  function drawPoolGlow(x, P, W, H, poolY, pours) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const pg = x.createLinearGradient(0, poolY - H * 0.02, 0, poolY + H * 0.10);
    pg.addColorStop(0, K.rgba(P.white, 0.0));
    pg.addColorStop(0.3, K.rgba(P.hot, 0.32));
    pg.addColorStop(1, K.rgba(P.deep, 0.0));
    x.fillStyle = pg; x.fillRect(0, poolY - H * 0.02, W, H * 0.12);
    x.restore();
    for (const po of pours) {
      K.bloom(x, po.px, poolY + H * 0.01, po.w * 9, P.hot, 0.3);
      K.bloom(x, po.px, poolY + H * 0.01, po.w * 4, P.white, 0.5);
    }
  }

  function mirroredPour(x, P, po, noise, r, seed) {
    x.save(); x.globalAlpha = 0.4; x.globalCompositeOperation = 'screen';
    x.translate(0, po.topY * 2); x.scale(1, -1);
    moltenPour(x, P, po.px, po.topY, po.topY - (po.botY - po.topY) * 0.6, po.w * 0.8, noise, r, false, seed + 9, false);
    x.restore();
  }

  // Aurora-bleed column (organic spilling light, used by floor/crucible layouts).
  function auroraColumn(x, P, W, H, aur, noise, r, bx, topY, botY) {
    x.save(); x.globalCompositeOperation = 'screen';
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const y = topY + t * (botY - topY);
      const wob = noise.fbm(bx / 100, y / 90, 4) * W * 0.16;
      const a = 0.10 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.04;
      K.bloom(x, bx + wob, y, W * (0.16 + t * 0.10), i % 2 ? aur : P.aur1, a);
    }
    x.restore();
    K.bloom(x, bx, (topY + botY) * 0.5, W * 0.36, aur, 0.10);
  }

  // A glowing ladle head silhouette at the top of a hero pour.
  function drawLadleHead(x, P, px, y, w, r) {
    x.save();
    x.fillStyle = K.mix('#000', P.smoke, 0.2);
    x.beginPath();
    x.moveTo(px - w, y); x.lineTo(px + w, y);
    x.lineTo(px + w * 0.7, y + w * 0.7); x.lineTo(px - w * 0.7, y + w * 0.7);
    x.closePath(); x.fill();
    x.restore();
    K.bloom(x, px, y + w * 0.6, w * 1.6, P.hot, 0.5);
    K.bloom(x, px, y + w * 0.6, w * 0.7, P.white, 0.7);
  }

  // A spark fountain across the bottom from a pour impact (foreground texture).
  function sparkFountain(x, P, W, H, px, baseY, r, n) {
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const ang = side * (Math.PI * (0.05 + r() * 0.42));
      const sp = (20 + r() * 180);
      const ex = px + Math.sin(ang) * sp;
      const ey = baseY - Math.abs(Math.cos(ang)) * sp * (0.4 + r() * 0.7) + (r() - 0.5) * 10;
      const col = r() < 0.45 ? P.white : P.hot;
      x.strokeStyle = K.rgba(col, 0.4 + r() * 0.5);
      x.lineWidth = 0.7 + r() * 1.8;
      x.beginPath(); x.moveTo(px + side * 6, baseY); x.lineTo(ex, ey); x.stroke();
    }
    x.restore();
  }

  // A tower-crane variant for the cathedral/recession shots: lean controls the
  // tilt of the mast (looking up), runs tall. Lighter-weight than `crane`.
  function drawTowerCrane(x, P, cx, baseY, h, dir, fade, r, lit, lean) {
    lean = lean || 0;
    const col = K.mix('#000000', P.smoke, fade * 0.7 + 0.08);
    const topY = baseY - h;
    const topX = cx + lean;
    const lw = 2 + (1 - fade) * 5;
    x.save();
    x.strokeStyle = col; x.fillStyle = col; x.lineJoin = 'round';
    const railGap = lw * 1.7 + h * 0.010;
    x.lineWidth = lw;
    x.beginPath(); x.moveTo(cx - railGap, baseY); x.lineTo(topX - railGap, topY); x.stroke();
    x.beginPath(); x.moveTo(cx + railGap, baseY); x.lineTo(topX + railGap, topY); x.stroke();
    x.lineWidth = Math.max(0.6, lw * 0.4);
    const segs = 26;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 0.5) / segs;
      const yA = baseY + (topY - baseY) * t0, yB = baseY + (topY - baseY) * t1;
      const xA = cx + (topX - cx) * t0, xB = cx + (topX - cx) * t1;
      x.beginPath();
      x.moveTo(xA - railGap, yA); x.lineTo(xB + railGap, yB);
      x.moveTo(xA + railGap, yA); x.lineTo(xB - railGap, yB);
      x.stroke();
    }
    // jib across the top
    const jib = h * (0.4 + r() * 0.35) * dir;
    x.lineWidth = lw * 0.9;
    x.beginPath(); x.moveTo(topX, topY + h * 0.03); x.lineTo(topX + jib, topY + h * 0.08); x.stroke();
    x.beginPath(); x.moveTo(topX, topY + h * 0.03); x.lineTo(topX - jib * 0.30, topY + h * 0.07); x.stroke();
    x.lineWidth = Math.max(0.6, lw * 0.4);
    x.beginPath(); x.moveTo(topX, topY - h * 0.03); x.lineTo(topX + jib, topY + h * 0.08); x.stroke();
    // hanging hook line + small block
    const hx = topX + jib * (0.5 + r() * 0.3);
    const hy = topY + h * 0.07, hyd = hy + h * (0.10 + r() * 0.10);
    x.lineWidth = Math.max(0.5, lw * 0.4);
    x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx, hyd); x.stroke();
    x.fillRect(hx - lw, hyd, lw * 2, lw * 2);
    x.restore();
    if (lit) {
      K.bloom(x, hx, hyd, h * 0.05, P.hot, 0.5);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(P.white, 0.8);
      x.beginPath(); x.ellipse(hx, hyd, h * 0.02, h * 0.008, 0, 0, 7); x.fill();
      x.restore();
    }
  }

  // Worm's-eye tower crane: a massive mast rising from the bottom of frame,
  // WIDE at the base and tapering as it converges toward a high vanishing point
  // (vanishY, above frame). A heavy jib arm crosses near the top. Reads as
  // "looking straight up at a towering gantry." fade = atmospheric distance.
  function drawGantryUp(x, P, W, H, baseX, vanishY, baseW, fade, r, lit, focusX) {
    const col = K.mix('#000000', P.smoke, fade * 0.7 + 0.06);
    // the apex sits up near the vanishing point, pulled slightly toward centre
    const apexX = baseX + (W * focusX - baseX) * (0.10 + r() * 0.12);
    const apexY = vanishY;
    const baseY = H * (1.04 + r() * 0.04);
    // mast as a tapering quad: half-width goes baseW/2 at bottom → ~3px at apex
    const halfAt = (t) => (baseW * 0.5) * (1 - t) + 2 * t; // t:0 base →1 apex
    const xAt = (t) => baseX + (apexX - baseX) * t;
    const yAt = (t) => baseY + (apexY - baseY) * t;
    // solid silhouette fill of the mast
    x.save();
    x.fillStyle = col;
    x.beginPath();
    const N = 24;
    for (let i = 0; i <= N; i++) { const t = i / N; x.lineTo(xAt(t) - halfAt(t), yAt(t)); }
    for (let i = N; i >= 0; i--) { const t = i / N; x.lineTo(xAt(t) + halfAt(t), yAt(t)); }
    x.closePath(); x.fill();
    x.restore();
    // lattice cross-bracing inside the mast (lighter, gives the steel structure)
    x.save();
    x.strokeStyle = K.mix(col, P.skyHi, 0.35);
    x.lineWidth = Math.max(0.7, (1 - fade) * 2.4);
    const rungs = 30;
    for (let i = 0; i < rungs; i++) {
      const t0 = i / rungs, t1 = (i + 1) / rungs;
      const x0 = xAt(t0), y0 = yAt(t0), x1 = xAt(t1), y1 = yAt(t1);
      const h0 = halfAt(t0), h1 = halfAt(t1);
      x.beginPath(); x.moveTo(x0 - h0, y0); x.lineTo(x1 + h1, y1); x.stroke();
      x.beginPath(); x.moveTo(x0 + h0, y0); x.lineTo(x1 - h1, y1); x.stroke();
    }
    // the two outer rails, crisp
    x.strokeStyle = K.mix(col, '#000', 0.2);
    x.lineWidth = Math.max(1, (1 - fade) * 3);
    x.beginPath();
    for (let i = 0; i <= N; i++) { const t = i / N; if (i===0) x.moveTo(xAt(t)-halfAt(t),yAt(t)); else x.lineTo(xAt(t)-halfAt(t),yAt(t)); }
    x.stroke();
    x.beginPath();
    for (let i = 0; i <= N; i++) { const t = i / N; if (i===0) x.moveTo(xAt(t)+halfAt(t),yAt(t)); else x.lineTo(xAt(t)+halfAt(t),yAt(t)); }
    x.stroke();
    x.restore();
    // heavy jib arm crossing the upper frame (the crane's horizontal boom),
    // foreshortened — thick near the mast, thinning toward the tip
    const jt = 0.16 + r() * 0.12;             // height up the mast where the jib sits
    const jx = xAt(jt), jy = yAt(jt);
    const dir = r() < 0.5 ? -1 : 1;
    const jibLen = W * (0.45 + r() * 0.35) * dir;
    const jibTilt = -H * (0.04 + r() * 0.05);  // tilts up toward the tip (perspective)
    const jw0 = baseW * 0.22 + 4, jw1 = 3;
    x.save();
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(jx, jy - jw0); x.lineTo(jx + jibLen, jy + jibTilt - jw1);
    x.lineTo(jx + jibLen, jy + jibTilt + jw1); x.lineTo(jx, jy + jw0);
    x.closePath(); x.fill();
    // counter-jib (short stub the other way) + counterweight block
    x.beginPath();
    x.moveTo(jx, jy - jw0 * 0.8); x.lineTo(jx - jibLen * 0.30, jy + jibTilt * 0.4 - jw1);
    x.lineTo(jx - jibLen * 0.30, jy + jibTilt * 0.4 + jw1); x.lineTo(jx, jy + jw0 * 0.8);
    x.closePath(); x.fill();
    const cwx = jx - jibLen * 0.30, cwy = jy + jibTilt * 0.4;
    x.fillRect(cwx - baseW * 0.06, cwy - baseW * 0.05, baseW * 0.12, baseW * 0.10);
    // jib lattice ticks
    x.strokeStyle = K.mix(col, P.skyHi, 0.3);
    x.lineWidth = Math.max(0.6, (1 - fade) * 1.6);
    const jsegs = 16;
    for (let i = 0; i < jsegs; i++) {
      const a = i / jsegs, b = (i + 0.5) / jsegs;
      const ax = jx + jibLen * a, ay = jy + jibTilt * a;
      const bx = jx + jibLen * b, by = jy + jibTilt * b;
      const wA = jw0 + (jw1 - jw0) * a, wB = jw0 + (jw1 - jw0) * b;
      x.beginPath(); x.moveTo(ax, ay - wA); x.lineTo(bx, by + wB); x.stroke();
    }
    x.restore();
    // hoist cable + ladle hanging from the jib (lit cranes glow molten)
    const hx = jx + jibLen * (0.55 + r() * 0.25);
    const hy = jy + jibTilt * (0.55) + (jw0);
    const hyd = hy + H * (0.06 + r() * 0.06);
    x.save();
    x.strokeStyle = col; x.lineWidth = Math.max(0.6, (1 - fade) * 1.6);
    x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx, hyd); x.stroke();
    const lw2 = baseW * 0.10 + 4;
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(hx - lw2, hyd); x.lineTo(hx + lw2, hyd);
    x.lineTo(hx + lw2 * 0.7, hyd + lw2 * 1.3); x.lineTo(hx - lw2 * 0.7, hyd + lw2 * 1.3);
    x.closePath(); x.fill();
    x.restore();
    if (lit) {
      K.bloom(x, hx, hyd + lw2, lw2 * 3.0, P.hot, 0.55);
      K.bloom(x, hx, hyd + lw2, lw2 * 1.2, P.white, 0.7);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(P.white, 0.85);
      x.beginPath(); x.ellipse(hx, hyd + lw2 * 0.6, lw2 * 0.9, lw2 * 0.3, 0, 0, 7); x.fill();
      x.restore();
      // a thread of molten dripping/pouring from the lit ladle toward the floor
      K.bloom(x, hx, H, W * 0.18, P.hot, 0.18);
    }
  }

  function finishHaze(x, P, W, H, aur, noise, horizon) {
    K.hazeSheet(x, W, horizon, noise, aur, 0.10, 200, 'screen');
    x.save(); x.globalCompositeOperation = 'screen';
    const hg = x.createLinearGradient(0, horizon - H * 0.12, 0, horizon + H * 0.06);
    hg.addColorStop(0, K.rgba(P.hot, 0));
    hg.addColorStop(0.6, K.rgba(P.deep, 0.18));
    hg.addColorStop(1, K.rgba(P.hot, 0));
    x.fillStyle = hg; x.fillRect(0, horizon - H * 0.12, W, H * 0.18);
    x.restore();
  }

  // ════════════════════════════════════════════════════════════════════════

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r, seed), P = p.pal, W = p.W, H = p.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const aur = K.mix(P.aur1, P.aur2, p.auroraHue);

    switch (p.layout) {
      case 'Hero Pour':        layoutHeroPour(x, p, P, W, H, aur, noise, r, seed); break;
      case 'Gantry Cathedral': layoutGantryCathedral(x, p, P, W, H, aur, noise, r, seed); break;
      case 'Ember Tempest':    layoutEmberTempest(x, p, P, W, H, aur, noise, r, seed); break;
      case 'Aurora Expanse':   layoutAuroraExpanse(x, p, P, W, H, aur, noise, r, seed); break;
      case 'Crucible Row':     layoutCrucibleRow(x, p, P, W, H, aur, noise, r, seed); break;
      default:                 layoutFoundryFloor(x, p, P, W, H, aur, noise, r, seed); break;
    }

    K.grain(x, W, H, 420, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'cinder', draw, traits };
})();
