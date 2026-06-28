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
 * Palette family — INCANDESCENT vs AURORA: white-hot orange #ff7a18 /
 * molten yellow-white #ffe7a8 (fire below) / aurora green #38f5b0 + cyan
 * (cold light above) / cold steel blue-black #0a1422 ground.
 *
 * Depth: BG = aurora sky (soft vertical green/cyan haze curtains) + far hazy
 * smokestacks dissolving into smoke. MID = ember storm rising, hazier & cooler
 * with height; gantry cranes in silhouette. FG = molten pours (bright additive
 * vertical streaks with bloom) + a glowing slag pool + heavy crucible mass.
 * Atmospheric perspective: far = desaturated, low-contrast, smoke-washed. */
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

  const FMTS = [ { W:900, H:1240, t:'Portrait' }, { W:1000, H:1240, t:'Tall' }, { W:1120, H:1240, t:'Column' } ];

  // Surreal anomaly per seed.
  const ANOM = ['Frozen Constellation', 'Aurora Bleed', 'Floating Crane', 'Hanging Pour', 'Mirrored Pour'];

  function params(r) {
    const pal = K.pick(PALS, r);
    const fmt = K.pick(FMTS, r);
    const anom = K.pick(ANOM, r);
    // Focal X for the hero pour — biased off-centre on thirds.
    const focusX = K.pick([0.30, 0.38, 0.5, 0.62, 0.70], r);
    return {
      pal, fmt, anom, focusX,
      pours: K.rint(r, 2, 4),
      cranes: K.rint(r, 2, 4),
      emberDensity: K.pick(['Storm', 'Blizzard', 'Inferno'], r),
      horizonT: 0.60 + r() * 0.10,      // where the dark foundry mass begins
      auroraHue: r(),                   // lean aur1<->aur2
      smokeAmt: 0.7 + r() * 0.6,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Palette: p.pal.name,
      Format: p.fmt.t,
      Anomaly: p.anom,
      Embers: p.emberDensity,
      Pours: p.pours,
    };
  }

  // ── a soft vertical aurora curtain: a wide column of cool light that fades
  //    top→down, wavering with noise. Additive so curtains overlap into sheets ──
  function auroraCurtain(x, W, H, cx, w, col, noise, topY, botY, a0, seed) {
    x.save(); x.globalCompositeOperation = 'screen';
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const y = topY + (botY - topY) * t;
      // horizontal waver of the curtain centre
      const wob = noise.fbm((cx) / 120, (y) / 80 + seed, 4) * w * 0.7;
      const xc = cx + wob;
      // curtain brightest mid-height, fading top & bottom
      const va = a0 * Math.sin(Math.PI * t) * (0.6 + 0.4 * (1 - t));
      const ww = w * (0.7 + 0.6 * (1 - t)); // wider toward bottom (spreading)
      const g = x.createLinearGradient(xc - ww, 0, xc + ww, 0);
      g.addColorStop(0, K.rgba(col, 0));
      g.addColorStop(0.5, K.rgba(col, va));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g;
      x.fillRect(xc - ww, y, ww * 2, (botY - topY) / steps + 2);
    }
    x.restore();
  }

  // ── a molten pour: a bright additive vertical streak with hot core + halo,
  //    splashing into the slag pool at its base. Wavers slightly with noise. ──
  function moltenPour(x, P, px, topY, botY, w, noise, r, bleed, seed) {
    const segs = 90;
    // outer heat halo (multiple additive passes)
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let pass = 0; pass < 3; pass++) {
      const hw = w * (pass === 0 ? 3.4 : pass === 1 ? 2.0 : 1.0);
      const col = pass === 0 ? P.deep : pass === 1 ? P.hot : P.white;
      const a = pass === 0 ? 0.10 : pass === 1 ? 0.22 : 0.5;
      // a pour is roughly uniform but slightly WIDER at the ladle (top) where it
      // leaves the lip, thinning as it stretches falling, then flaring at the
      // splash. This avoids the rocket-exhaust (narrow-top/wide-bottom) read.
      x.beginPath();
      const widthAt = (t) => {
        const lip = 0.6 + 0.5 * Math.exp(-t * 8);   // bulge at the ladle lip (top)
        const fall = 0.5 + 0.5 * (1 - t * 0.5);      // gently thins as it falls
        const splash = 1 + 1.2 * Math.pow(Math.max(0, t - 0.88) / 0.12, 2); // flare at pool
        return hw * 0.7 * lip * fall * splash;
      };
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const y = topY + (botY - topY) * t;
        const wob = noise.fbm(px / 60, y / 40 + seed * 3, 4) * w * 1.1;
        const xx = px + wob, half = widthAt(t);
        if (i === 0) x.moveTo(xx - half, y);
        else x.lineTo(xx - half, y);
      }
      for (let i = segs; i >= 0; i--) {
        const t = i / segs;
        const y = topY + (botY - topY) * t;
        const wob = noise.fbm(px / 60, y / 40 + seed * 3, 4) * w * 1.1;
        const xx = px + wob, half = widthAt(t);
        x.lineTo(xx + half, y);
      }
      x.closePath();
      x.fillStyle = K.rgba(col, a);
      x.fill();
    }
    x.restore();
    // hot white core line
    x.save(); x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = K.rgba(pass === 0 ? P.white : '#ffffff', pass === 0 ? 0.7 : 0.85);
      x.lineWidth = w * (pass === 0 ? 1.0 : 0.4);
      x.beginPath();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const y = topY + (botY - topY) * t;
        const wob = noise.fbm(px / 60, y / 40 + seed * 3, 4) * w * 1.1;
        const xx = px + wob;
        if (i === 0) x.moveTo(xx, y); else x.lineTo(xx, y);
      }
      x.stroke();
    }
    x.restore();
    // surreal aurora bleed: cold green tint along the lower pour
    if (bleed) {
      x.save(); x.globalCompositeOperation = 'screen';
      const g = x.createLinearGradient(0, topY + (botY - topY) * 0.45, 0, botY);
      g.addColorStop(0, K.rgba(P.aur1, 0));
      g.addColorStop(1, K.rgba(P.aur1, 0.5));
      x.fillStyle = g;
      x.fillRect(px - w * 4, topY + (botY - topY) * 0.45, w * 8, (botY - topY) * 0.55);
      x.restore();
    }
    // splash bloom at base
    K.bloom(x, px, botY, w * 6, P.white, 0.4);
    K.bloom(x, px, botY, w * 12, P.hot, 0.22);
    // SPLASH spark-fan: sparks fly OUTWARD & up from the impact (sideways
    // arcs), the signature that the metal is HITTING the pool — not launching
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    const sparks = 70 + Math.floor(w * 6);
    for (let i = 0; i < sparks; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const ang = side * (Math.PI * (0.12 + r() * 0.36)); // low, near-horizontal fan
      const sp = (8 + r() * 70) * (0.6 + w * 0.08);
      const ex = px + Math.sin(ang) * sp;
      const ey = botY - Math.abs(Math.cos(ang)) * sp * (0.5 + r() * 0.5) * 0.8 + (r() - 0.5) * 6;
      const col = r() < 0.4 ? P.white : P.hot;
      x.strokeStyle = K.rgba(col, 0.5 + r() * 0.4);
      x.lineWidth = 0.6 + r() * 1.3;
      x.beginPath(); x.moveTo(px + side * w * 0.4, botY); x.lineTo(ex, ey); x.stroke();
    }
    x.restore();
    return { px, botY };
  }

  // ── gantry crane silhouette: a tall leg + horizontal jib with a hanging
  //    ladle, all near-black against the glow. fade = atmospheric (far paler) ──
  function crane(x, P, cx, baseY, h, dir, fade, r, lit) {
    const col = K.mix('#000000', P.smoke, fade * 0.7 + 0.1);
    const topY = baseY - h;
    const lw = 2 + (1 - fade) * 4;
    x.save();
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = lw; x.lineJoin = 'round';
    // main vertical mast (lattice — two rails + cross-ticks)
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
    // horizontal jib
    const jib = h * (0.5 + r() * 0.4) * dir;
    x.lineWidth = lw * 0.9;
    x.beginPath(); x.moveTo(cx, topY + h * 0.04); x.lineTo(cx + jib, topY + h * 0.12); x.stroke();
    // counterweight short arm
    x.beginPath(); x.moveTo(cx, topY + h * 0.04); x.lineTo(cx - jib * 0.32, topY + h * 0.10); x.stroke();
    // diagonal stay cable from mast top to jib end
    x.lineWidth = Math.max(0.6, lw * 0.4);
    x.beginPath(); x.moveTo(cx, topY - h * 0.04); x.lineTo(cx + jib, topY + h * 0.12); x.stroke();
    // hanging ladle from a point on the jib
    const lx = cx + jib * (0.55 + r() * 0.3);
    const ly = topY + h * 0.10;
    const dropY = ly + h * (0.18 + r() * 0.22);
    x.lineWidth = Math.max(0.6, lw * 0.5);
    x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx, dropY); x.stroke();
    // ladle bucket
    const lw2 = h * 0.06;
    x.beginPath();
    x.moveTo(lx - lw2, dropY);
    x.lineTo(lx + lw2, dropY);
    x.lineTo(lx + lw2 * 0.7, dropY + lw2 * 1.3);
    x.lineTo(lx - lw2 * 0.7, dropY + lw2 * 1.3);
    x.closePath(); x.fill();
    x.restore();
    // glowing molten lip on the ladle if lit
    if (lit) {
      K.bloom(x, lx, dropY, lw2 * 2.2, P.hot, 0.5);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(P.white, 0.8);
      x.beginPath(); x.ellipse(lx, dropY, lw2 * 0.9, lw2 * 0.3, 0, 0, 7); x.fill();
      x.restore();
    }
    return { lx, lipY: dropY + lw2 * 1.3, h };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const horizon = H * p.horizonT;
    const aur = K.mix(P.aur1, P.aur2, p.auroraHue);

    // ── BACKDROP: night sky, cold steel blue-black, slightly warmer near the
    //    foundry glow at the bottom ──
    {
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P.sky);
      g.addColorStop(0.32, K.mix(P.sky, P.skyHi, 0.5));
      g.addColorStop(0.55, P.skyHi);
      g.addColorStop(0.72, K.mix(P.skyHi, P.deep, 0.18));
      g.addColorStop(1, K.mix(P.ground, P.deep, 0.22));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    // ── AURORA SKY (background): several soft vertical green/cyan curtains in
    //    the top half, wavering. The signature cold-light-above. ──
    {
      const nC = K.rint(r, 3, 5);
      for (let i = 0; i < nC; i++) {
        const cx = W * (0.1 + 0.8 * (i + r() * 0.6) / nC);
        const col = i % 2 === 0 ? P.aur1 : aur;
        auroraCurtain(x, W, H, cx, W * (0.10 + r() * 0.12), col, noise,
          H * (0.0 + r() * 0.05), horizon * (0.78 + r() * 0.2), 0.16 + r() * 0.12, seed + i);
      }
      // broad aurora glow wash across the upper sky
      K.bloom(x, W * p.focusX, H * 0.14, W * 0.7, aur, 0.06);
    }

    // ── DEEP-BG smokestacks: far hazy verticals dissolving into smoke near the
    //    horizon. Desaturated, low-contrast (atmospheric perspective). ──
    {
      const n = K.rint(r, 6, 11);
      for (let i = 0; i < n; i++) {
        const sx = W * (0.04 + r() * 0.92);
        const sh = (H * 0.12) + r() * (H * 0.26);
        const sw = 8 + r() * 26;            // chunkier industrial stacks
        const dist = r();                    // 0 near → 1 far (hazier, paler)
        const col = K.mix(P.smoke, P.skyHi, 0.35 + dist * 0.4);
        x.fillStyle = K.rgba(col, 0.45 + (1 - dist) * 0.3);
        x.fillRect(sx, horizon - sh, sw, sh);
        // a slightly darker near edge for solidity
        x.fillStyle = K.rgba(K.mix(P.smoke, '#000', 0.3), 0.2 * (1 - dist));
        x.fillRect(sx, horizon - sh, sw * 0.4, sh);
        // billowing smoke plume rising from each, drifting & cooling
        x.save(); x.globalCompositeOperation = 'screen';
        let pxp = sx + sw / 2;
        for (let s = 0; s < 9; s++) {
          const py = horizon - sh - s * (H * 0.028);
          pxp += (noise.fbm(pxp / 60, py / 60, 3)) * 14;
          const pcol = s > 5 ? K.mix(P.smoke, aur, 0.25) : P.smoke;
          K.bloom(x, pxp, py, 16 + s * 9, pcol, 0.07 + (1 - dist) * 0.04);
        }
        x.restore();
      }
    }

    // ── AURORA BLEED anomaly: a strong cold-light pool spilling DOWN from the
    //    sky into the foundry zone ──
    if (p.anom === 'Aurora Bleed') {
      // a soft organic column of cold light spilling down — built from stacked
      // blooms wandering with noise, NOT a hard rectangle
      x.save(); x.globalCompositeOperation = 'screen';
      const bx = W * p.focusX;
      const steps = 22;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const y = H * 0.16 + t * (horizon + H * 0.10 - H * 0.16);
        const wob = noise.fbm(bx / 100, y / 90, 4) * W * 0.16;
        const a = 0.10 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.04;
        K.bloom(x, bx + wob, y, W * (0.16 + t * 0.10), i % 2 ? aur : P.aur1, a);
      }
      x.restore();
      K.bloom(x, bx, horizon * 0.92, W * 0.36, aur, 0.10);
    }

    // ── DARK FOUNDRY MASS (foreground ground): the heavy industrial silhouette
    //    floor the cranes & crucibles stand on. A glowing slag field underfoot
    //    fills the lower frame with cracked, incandescent crust. ──
    {
      // glowing molten crust base (so the lower frame is never dead black)
      const g = x.createLinearGradient(0, horizon - H * 0.04, 0, H);
      g.addColorStop(0, K.rgba(P.deep, 0));
      g.addColorStop(0.18, K.mix(P.ground, P.deep, 0.5));
      g.addColorStop(0.55, K.mix(P.ground, P.deep, 0.18));
      g.addColorStop(1, K.mix(P.ground, '#000', 0.32));
      x.fillStyle = g; x.fillRect(0, horizon - H * 0.06, W, H - (horizon - H * 0.06));

      // incandescent crust in the foundry floor — a glowing molten network,
      // densest just below the horizon (the slag field) and cooling toward the
      // bottom. Built from fbm cells so it reads as molten crust, not scribbles.
      x.save(); x.globalCompositeOperation = 'lighter';
      const floorTop = horizon + H * 0.02;
      const step = 7;
      for (let yy = floorTop; yy < H; yy += step) {
        const depth = (yy - floorTop) / (H - floorTop); // 0 just below horizon → 1 bottom
        const heat = Math.pow(1 - depth, 1.6);          // hottest near horizon, cooling down
        for (let xx = 0; xx < W; xx += step) {
          const n = (noise.fbm(xx / 70, yy / 50 + seed, 5, 0.55, 2.2) + 1) / 2;
          // narrow bright bands = molten cracks between cooled crust plates
          const crack = Math.pow(n, 4) * 1.4;
          const glow = crack * heat;
          if (glow < 0.04) continue;
          const col = glow > 0.5 ? P.white : P.hot;
          x.fillStyle = K.rgba(col, Math.min(0.5, glow * 0.5));
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();

      // jagged industrial roofline silhouette along the horizon (dark cap over glow)
      x.fillStyle = K.mix(P.ground, '#000', 0.35);
      x.beginPath();
      x.moveTo(0, horizon + H * 0.08);
      x.lineTo(0, horizon + (r() - 0.5) * 10);
      let cx = 0;
      while (cx < W) {
        const step = 30 + r() * 80;
        const hh = (r() - 0.5) * H * 0.06;
        x.lineTo(cx, horizon + hh);
        x.lineTo(cx + step * 0.5, horizon + hh);
        cx += step;
      }
      x.lineTo(W, horizon);
      x.lineTo(W, horizon + H * 0.08);
      x.closePath(); x.fill();
    }

    // ── CRANES (midground silhouettes) — back-to-front, far ones hazier. The
    //    hero crane sits near the focal X and is lit (holding a molten ladle). ──
    const craneList = [];
    for (let i = 0; i < p.cranes; i++) {
      const isHero = i === p.cranes - 1;
      const fade = isHero ? 0.0 : (0.5 - (i / p.cranes) * 0.4 + r() * 0.1);
      const cx = isHero ? W * p.focusX + (r() - 0.5) * W * 0.08 : W * (0.08 + r() * 0.84);
      const baseY = horizon + (1 - fade) * H * 0.03 + r() * H * 0.02;
      const h = (H * (0.22 + r() * 0.18)) * (0.7 + (1 - fade) * 0.7);
      let by = baseY;
      if (p.anom === 'Floating Crane' && isHero) by = baseY - h * 0.12; // hovering
      craneList.push({ cx, by, h, dir: r() < 0.5 ? -1 : 1, fade, isHero, r1: r(), r2: r() });
    }
    craneList.sort((a, b) => b.fade - a.fade); // far first
    const litCranes = [];
    for (const c of craneList) {
      const info = crane(x, P, c.cx, c.by, c.h, c.dir, c.fade, r, c.isHero);
      if (c.isHero) litCranes.push(info);
    }

    // ── MOLTEN POURS (foreground hero light) — bright additive vertical streaks
    //    falling into a glowing slag pool. Hero pour at focal X. ──
    const poolY = horizon + H * 0.04;
    const pours = [];
    for (let i = 0; i < p.pours; i++) {
      const isHero = i === 0;
      // hero pour aligned under the lit crane ladle if present
      let px = isHero ? (litCranes[0] ? litCranes[0].lx : W * p.focusX) : W * (0.12 + r() * 0.76);
      let topY = isHero && litCranes[0] ? litCranes[0].lipY : horizon - H * (0.10 + r() * 0.16);
      if (p.anom === 'Hanging Pour' && isHero) { topY = H * 0.30 + r() * H * 0.1; } // pour hangs in air
      const w = (isHero ? 7 : 3.5) + r() * 4;
      const botY = (p.anom === 'Hanging Pour' && isHero) ? topY + H * 0.22 : poolY + r() * H * 0.02;
      const bleed = (p.anom === 'Aurora Bleed') || (isHero && p.anom === 'Frozen Constellation' ? false : r() < 0.4);
      pours.push({ px, topY, botY, w, isHero, bleed });
    }
    // slag pool glow at the base first (so pours splash into it)
    {
      x.save(); x.globalCompositeOperation = 'lighter';
      const pg = x.createLinearGradient(0, poolY - H * 0.02, 0, poolY + H * 0.10);
      pg.addColorStop(0, K.rgba(P.white, 0.0));
      pg.addColorStop(0.3, K.rgba(P.hot, 0.32));
      pg.addColorStop(1, K.rgba(P.deep, 0.0));
      x.fillStyle = pg; x.fillRect(0, poolY - H * 0.02, W, H * 0.12);
      x.restore();
      // bright molten pool puddles
      for (const po of pours) {
        K.bloom(x, po.px, poolY + H * 0.01, po.w * 9, P.hot, 0.3);
        K.bloom(x, po.px, poolY + H * 0.01, po.w * 4, P.white, 0.5);
      }
    }
    for (const po of pours) {
      moltenPour(x, P, po.px, po.topY, po.botY, po.w, noise, r, po.bleed, seed);
    }
    // Mirrored Pour anomaly: a faint upside-down echo of the hero pour above
    if (p.anom === 'Mirrored Pour' && pours[0]) {
      const po = pours[0];
      x.save(); x.globalAlpha = 0.4; x.globalCompositeOperation = 'screen';
      x.translate(0, po.topY * 2); x.scale(1, -1);
      moltenPour(x, P, po.px, po.topY, po.topY - (po.botY - po.topY) * 0.6, po.w * 0.8, noise, r, false, seed + 9);
      x.restore();
    }

    // ── EMBER STORM: thousands of glowing dots filling the air, advected by a
    //    turbulent curl-noise updraft. NOT a tight column per pour — a diffuse
    //    storm across the whole frame, denser low/near the pool, thinning &
    //    cooling with height (hot→white low, aurora-green high). Each ember is a
    //    short streak following the flow so it reads as rising motion. ──
    {
      const counts = { Storm: 3600, Blizzard: 5200, Inferno: 7000 };
      const N = counts[p.emberDensity] || 4000;
      const skyTop = H * 0.04;
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {
        // seed each ember somewhere in the air column; bias start-density toward
        // the foundry floor and toward the pours, but let many fill the open air
        const nearPour = r() < 0.40;
        let bx0;
        if (nearPour) {
          const src = pours[Math.floor(r() * pours.length)] || { px: W * p.focusX };
          bx0 = src.px + K.randn(r) * (W * 0.18); // wider scatter — no tight cone
        } else {
          bx0 = r() * W;
        }
        // vertical position: power-biased toward the bottom (denser low)
        const rise = Math.pow(r(), nearPour ? 1.5 : 1.15); // 0 floor → 1 high sky
        const ey = poolY - rise * (poolY - skyTop);
        // turbulent horizontal wander grows with height (storm spreads out)
        const fl = K.curl(noise, bx0 * 0.7, ey * 0.7, 2);
        const wander = (fl[0]) * (60 + rise * W * 0.35) + K.randn(r) * (20 + rise * W * 0.22);
        const ex = bx0 + wander;
        if (ex < -10 || ex > W + 10) continue;
        // height-based temperature & fade (atmospheric: high = cool, dim, hazy)
        let col, a, sz;
        if (rise < 0.40) { col = r() < 0.35 ? P.white : P.hot; a = 0.45 + r() * 0.45; sz = 0.6 + r() * 1.7; }
        else if (rise < 0.72) { col = K.mix(P.hot, aur, (rise - 0.40) / 0.32); a = 0.28 + r() * 0.32; sz = 0.5 + r() * 1.3; }
        else { col = K.mix(aur, P.aur1, r()); a = 0.10 + r() * 0.20; sz = 0.4 + r() * 0.9; }
        // short motion streak along the flow direction (upward + wander)
        const ang = Math.atan2(-1, fl[0] * 1.2); // mostly up, tilted by flow
        const len = (1.5 + rise * 5) * (0.5 + r());
        x.strokeStyle = K.rgba(col, a);
        x.lineWidth = sz;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(ex, ey);
        x.lineTo(ex + Math.cos(ang) * len, ey + Math.sin(ang) * len);
        x.stroke();
        // occasional brighter ember with a tiny bloom
        if (r() < 0.010) K.bloom(x, ex, ey, sz * 7, col, 0.35);
      }
      x.restore();
    }

    // ── FROZEN CONSTELLATION anomaly: high embers freeze into a rigid lattice
    //    of bright dots joined by faint lines — the surreal centerpiece ──
    if (p.anom === 'Frozen Constellation') {
      const nStars = K.rint(r, 14, 22);
      const stars = [];
      const cyTop = H * (0.08 + r() * 0.1);
      const cyBot = H * 0.42;
      for (let i = 0; i < nStars; i++) {
        stars.push([W * (0.15 + r() * 0.7), cyTop + r() * (cyBot - cyTop)]);
      }
      // joining lines to nearest neighbours
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

    // ── SMOKE: heavy fbm smoke billowing up through the mid-scene, cooler with
    //    height. Layered haze for volume. ──
    {
      x.save(); x.globalCompositeOperation = 'screen';
      const step = 6;
      for (let yy = H * 0.2; yy < horizon + H * 0.06; yy += step) {
        const rise = 1 - (yy - H * 0.2) / (horizon + H * 0.06 - H * 0.2); // 1 high → 0 low
        for (let xx = 0; xx < W; xx += step) {
          const n = (noise.fbm(xx / 130, yy / 90 - seed, 5, 0.55, 2.1) + 1) / 2;
          const dense = Math.pow(n, 2.2) * p.smokeAmt;
          if (dense < 0.08) continue;
          // smoke tinted warm low, cool/aurora high
          const col = rise > 0.55 ? K.mix(P.smoke, aur, (rise - 0.55) * 0.5) : K.mix(P.smoke, P.deep, (0.55 - rise) * 0.4);
          x.fillStyle = K.rgba(col, dense * 0.15);
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();
    }

    // ── SIGNATURE HAZE SHEETS: warm haze low, cool aurora haze high ──
    K.hazeSheet(x, W, horizon, noise, aur, 0.10, 200, 'screen');
    {
      // warm heat haze hugging the foundry floor
      x.save(); x.globalCompositeOperation = 'screen';
      const hg = x.createLinearGradient(0, horizon - H * 0.12, 0, horizon + H * 0.06);
      hg.addColorStop(0, K.rgba(P.hot, 0));
      hg.addColorStop(0.6, K.rgba(P.deep, 0.18));
      hg.addColorStop(1, K.rgba(P.hot, 0));
      x.fillStyle = hg; x.fillRect(0, horizon - H * 0.12, W, H * 0.18);
      x.restore();
    }

    // ── FINISH: broad foundry glow from the focal pool, grain, vignette ──
    K.bloom(x, W * p.focusX, poolY, W * 0.5, P.hot, 0.07);
    K.grain(x, W, H, 420, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'cinder', draw, traits };
})();
