/* TERRACES — an impossible terraced world climbing into haze.
 * A colossal stepped landscape — terraced rice-paddy amphitheatre / Escher-ish
 * stacked ziggurat — receding and CLIMBING upward, level after level, dissolving
 * into saturated atmospheric fog. Each terrace catches colored light and pools
 * of water/light; tiny markers dot the steps for scale. A hanging light source
 * burns above. Geometry is subtly impossible (a level or two that don't resolve).
 * Surreal = "real but off." Saturated, hazy, cool, textured. NOT outrun. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Each palette is its own saturated terraced world.
  //  sky1=zenith, sky2=horizon fog glow, stone=lit terrace tread, riser=shadow
  //  face, edge=lit rim, pool=glowing water, light=hanging source, deep=far-fog,
  //  ink=deep shadow.
  // TERRITORY: verdant jade + mineral gold. Jade / emerald / moss /
  // oxidized-copper-green tones, amber-gold light pools, deep indigo shadow as
  // counterpoint. Must read unmistakably "green + gold terraces" from afar.
  const PALS = [
    { name: 'Jade & Gold',      sky1:'#062a22', sky2:'#1fa882', stone:'#2f9170', riser:'#123a30', edge:'#a6ffd6', pool:'#ffce4e', light:'#fff0c0', deep:'#13a884', ink:'#04140e' },
    { name: 'Paddy Dusk',       sky1:'#103626', sky2:'#3fb06a', stone:'#5aa05a', riser:'#234628', edge:'#d6f08a', pool:'#ffd35a', light:'#fff2bc', deep:'#2f9a5c', ink:'#08160e' },
    { name: 'Emerald Deep',     sky1:'#031c1e', sky2:'#0f8a7a', stone:'#1f8a72', riser:'#0c382f', edge:'#7fffd0', pool:'#ffc24a', light:'#eafff0', deep:'#0e9a82', ink:'#020f0e', shadow:'#0a1840' },
    { name: 'Oxidized Copper',  sky1:'#0c2a22', sky2:'#3fb8a0', stone:'#3f9a82', riser:'#1a4640', edge:'#a8f0d8', pool:'#ff9a3c', light:'#ffe2b0', deep:'#2fb8a0', ink:'#08160f' },
    { name: 'Moss & Amber',     sky1:'#16240e', sky2:'#7fa83a', stone:'#6e9440', riser:'#2c3a1c', edge:'#e0f08a', pool:'#ffbe46', light:'#fbf2c0', deep:'#6e9a3a', ink:'#0c140a' },
    { name: 'Viridian Pools',   sky1:'#072a16', sky2:'#3fc060', stone:'#34a04a', riser:'#143a22', edge:'#aaff9a', pool:'#5af0c0', light:'#eaffd0', deep:'#2fb058', ink:'#05140c' },
    { name: 'Malachite',        sky1:'#04241f', sky2:'#1cb094', stone:'#1f8a6e', riser:'#0e3a30', edge:'#8cffd8', pool:'#ffd24a', light:'#f4fff0', deep:'#16a888', ink:'#03120e', shadow:'#0c1a44' },
    { name: 'Olive & Brass',    sky1:'#1c2410', sky2:'#9aa83a', stone:'#7e8a3a', riser:'#34401c', edge:'#e6f08a', pool:'#ffc850', light:'#fdf4c4', deep:'#8a9a3a', ink:'#0e120a' },
  ];

  const FMTS = [ { W: 1320, H: 1480, t: 'Ascent' }, { W: 1440, H: 1320, t: 'Amphitheatre' }, { W: 1320, H: 1320, t: 'Well' } ];
  const FORMS = ['Amphitheatre', 'Ziggurat', 'Cascade', 'Spiral'];
  const SKIES = ['Hung Sun', 'Twin Moons', 'Slit', 'Eclipse Ring'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const form = K.pick(FORMS, r);
    const sky = K.pick(SKIES, r);
    const levels = K.rint(r, 12, 17);
    const poolDensity = 0.35 + r() * 0.5;
    const impossible = r() < 0.7;
    const event = r() < 0.08 ? K.pick(['Flooded', 'Mirror Pools', 'Goldfall'], r) : null;
    return { pal, fmt, form, sky, levels, poolDensity, impossible, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = {
      Palette: p.pal.name,
      Form: p.form,
      Sky: p.sky,
      Levels: p.levels >= 15 ? 'Many' : 'Stacked',
      Pools: p.poolDensity > 0.6 ? 'Brimming' : 'Scattered',
    };
    if (p.impossible) t.Geometry = 'Impossible';
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── atmospheric sky the terraces climb into ── */
  function sky(x, P, W, H, hY, r) {
    const g = x.createLinearGradient(0, 0, 0, hY * 1.2);
    g.addColorStop(0, P.sky1);
    g.addColorStop(0.55, K.mix(P.sky1, P.sky2, 0.5));
    g.addColorStop(1, P.sky2);
    x.fillStyle = g; x.fillRect(0, 0, W, hY * 1.2);
    // cloud strata high up
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const t = i / 6, y = hY * (0.06 + t * 0.5);
      x.fillStyle = K.rgba(K.mix(P.sky2, P.light, t * 0.4), 0.04 + 0.045 * (1 - t));
      x.fillRect(0, y, W, 24 + r() * 80);
    }
    x.restore();
  }

  /* ── hanging light source / strange sky body above ── */
  function skyBody(x, P, W, H, kind, lx, ly, R) {
    if (kind === 'Slit') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const sw = R * 0.26;
      const g = x.createLinearGradient(lx - sw, 0, lx + sw, 0);
      g.addColorStop(0, K.rgba(P.light, 0)); g.addColorStop(0.5, K.rgba(P.light, 0.8)); g.addColorStop(1, K.rgba(P.light, 0));
      x.fillStyle = g; x.fillRect(lx - sw, ly - R * 1.4, sw * 2, R * 2.4);
      x.restore();
      K.bloom(x, lx, ly, R * 2.2, P.light, 0.42);
      return;
    }
    if (kind === 'Twin Moons') {
      const place = (cx, cy, rad, col) => {
        K.bloom(x, cx, cy, rad * 2.4, col, 0.26);
        const g = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
        g.addColorStop(0, K.mix(col, '#fff', 0.5)); g.addColorStop(0.7, col); g.addColorStop(1, K.mix(col, P.ink, 0.4));
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
      };
      place(lx, ly, R * 0.62, P.light);
      place(lx + R * 1.4, ly + R * 0.55, R * 0.38, K.mix(P.light, P.pool, 0.5));
      return;
    }
    K.bloom(x, lx, ly, R * 2.8, P.light, 0.42);
    if (kind === 'Eclipse Ring') {
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(P.light, 0.85); x.lineWidth = R * 0.09;
      x.beginPath(); x.arc(lx, ly, R, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = K.rgba(K.mix(P.light, P.pool, 0.4), 0.45); x.lineWidth = R * 0.035;
      x.beginPath(); x.arc(lx, ly, R * 1.16, 0, Math.PI * 2); x.stroke();
      x.restore();
      const g = x.createRadialGradient(lx, ly, R * 0.1, lx, ly, R);
      g.addColorStop(0, K.mix(P.ink, P.sky1, 0.25)); g.addColorStop(0.84, K.mix(P.ink, P.sky1, 0.25)); g.addColorStop(1, K.rgba(P.light, 0.45));
      x.fillStyle = g; x.beginPath(); x.arc(lx, ly, R, 0, Math.PI * 2); x.fill();
    } else {
      const g = x.createRadialGradient(lx - R * 0.25, ly - R * 0.25, R * 0.1, lx, ly, R);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, K.mix(P.light, '#fff', 0.35)); g.addColorStop(1, K.mix(P.light, P.sky2, 0.4));
      x.fillStyle = g; x.beginPath(); x.arc(lx, ly, R, 0, Math.PI * 2); x.fill();
    }
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // horizon: terraces vanish into fog high up so the climb feels epic
    const hY = H * (0.255 + r() * 0.05);

    sky(x, P, W, H, hY, r);

    // hanging light source
    const lx = W * (0.34 + r() * 0.32);
    const ly = hY * (0.34 + r() * 0.3);
    const R = W * (0.075 + r() * 0.045);
    skyBody(x, P, W, H, p.sky, lx, ly, R);

    // far fog wall the terraces emerge from
    K.hazeSheet(x, W, hY * 1.3, noise, P.deep, 0.16, 300, 'screen');

    // ground backdrop so any seam between steps shows deep terrace tone, never
    // the raw sky — fades from far-fog at the horizon to deep shadow near.
    {
      const gb = x.createLinearGradient(0, hY - 4, 0, H);
      gb.addColorStop(0, K.mix(P.deep, P.sky2, 0.4));
      gb.addColorStop(0.4, K.mix(P.riser, P.deep, 0.4));
      gb.addColorStop(1, K.mix(P.riser, P.ink, 0.6));
      x.fillStyle = gb; x.fillRect(0, hY - 4, W, H - hY + 4);
    }

    // ── geometry: stacked levels, near=bottom big, far=top tiny ──
    const levels = p.levels;
    const bowl = (p.form === 'Amphitheatre' || p.form === 'Well');
    const spiral = p.form === 'Spiral';
    const cascade = p.form === 'Cascade';
    const vpx = W * (0.5 + (r() - 0.5) * 0.18);

    // each level has a riser height (front wall) + tread depth (flat top).
    // perspective: nearer levels much taller. Sum exactly fills hY..H.
    const riserH = [], treadH = [];
    let acc = 0;
    for (let i = 0; i < levels; i++) {
      const t = i / (levels - 1);            // 0 far ... 1 near
      const unit = 0.02 + Math.pow(t, 1.7) * 0.16;
      const rr = unit * 0.62, td = unit * 0.38;
      riserH.push(rr); treadH.push(td); acc += rr + td;
    }
    const span = H - hY;
    for (let i = 0; i < levels; i++) { riserH[i] = riserH[i] / acc * span; treadH[i] = treadH[i] / acc * span; }

    const impLevel = p.impossible ? K.rint(r, Math.floor(levels * 0.4), Math.floor(levels * 0.75)) : -1;

    // shared per-level top-contour generator — architectural terrace lip:
    // a strong sweeping curve (bowl/valley/spiral) with only light organic warp.
    function contour(i, baseY) {
      const t = i / (levels - 1);
      const unit = riserH[i] + treadH[i];
      const amp = unit * (0.5 + (1 - t) * 0.9);
      const freq = bowl ? 0.8 : (1.1 + (i % 3) * 0.2);
      const phase = (spiral ? i * 0.5 : i * 0.22) + (cascade ? Math.sin(i * 0.8) * 0.35 : 0);
      // keep noise SUBTLE so steps read as built, not as terrain contours
      const warp = unit * (0.35 + (1 - t) * 0.7);
      const pts = [];
      for (let xx = -24; xx <= W + 24; xx += 5) {
        const tt = xx / W;
        let wave = Math.sin(tt * Math.PI * freq + phase) * 0.4
                 + Math.sin(tt * Math.PI * (freq * 1.8) + phase * 1.4) * 0.12;
        // strong concave amphitheatre bowl — sides sweep up into the haze
        if (bowl) { const d = tt - vpx / W; wave += d * d * 7.5 * (0.5 + t * 0.7); }
        if (cascade) { const d = tt - vpx / W; wave += d * d * 3.2; }
        if (spiral) { wave += (tt - 0.5) * (i % 2 ? 1.1 : -1.1) * (0.6 + t); }
        const n = noise.fbm(xx / 320 + i * 0.6, i * 2.1, 3);
        pts.push([xx, baseY + wave * amp + n * warp]);
      }
      return pts;
    }

    // draw far→near so nearer steps overlap farther ones (occlusion = depth)
    let y = hY;
    for (let i = 0; i < levels; i++) {
      const t = i / (levels - 1);
      const fade = Math.pow(1 - t, 1.3);     // 1 near, ~0 far
      const rH = riserH[i], tH = treadH[i];
      const topY = y;                         // top lip of this riser
      const treadFrontY = topY + rH;          // where riser ends / tread starts
      const nextTopY = treadFrontY + tH;      // top of next riser down

      const topPts = contour(i, topY);

      // colors: tread (lit) bright, riser (face) dark; both fade to deep fog.
      // indigo `shadow` (when present) is the cool counterpoint in deep riser.
      const deepShadow = P.shadow ? K.mix(P.ink, P.shadow, 0.6) : P.ink;
      const treadCol = K.mix(P.stone, P.deep, 0.08 + fade * 0.8);
      const riserCol = K.mix(P.riser, P.deep, 0.06 + fade * 0.68);
      const edgeCol  = K.mix(P.edge,  P.deep, fade * 0.5);

      // ---- RISER face: the dark vertical wall of the step (drawn first) ----
      x.save();
      x.beginPath();
      x.moveTo(topPts[0][0], topPts[0][1]);
      for (let k = 1; k < topPts.length; k++) x.lineTo(topPts[k][0], topPts[k][1]);
      for (let k = topPts.length - 1; k >= 0; k--) x.lineTo(topPts[k][0], topPts[k][1] + rH);
      x.closePath();
      const rg = x.createLinearGradient(0, topY, 0, treadFrontY);
      rg.addColorStop(0, K.mix(riserCol, deepShadow, 0.45));
      rg.addColorStop(0.55, K.mix(riserCol, deepShadow, 0.25));
      rg.addColorStop(1, K.mix(riserCol, deepShadow, 0.62));
      x.fillStyle = rg; x.fill();
      if (t > 0.3) { x.save(); x.clip(); K.mottle(x, 0, topY, W, rH + 2, riserCol, 1100 / (t + 0.2), r, 'overlay'); x.restore(); }
      x.restore();

      // ---- TREAD: the flat lit shelf below the riser ----
      x.save();
      x.beginPath();
      x.moveTo(topPts[0][0], topPts[0][1] + rH);
      for (let k = 1; k < topPts.length; k++) x.lineTo(topPts[k][0], topPts[k][1] + rH);
      for (let k = topPts.length - 1; k >= 0; k--) x.lineTo(topPts[k][0], topPts[k][1] + rH + tH + 1);
      x.closePath();
      x.save(); x.clip();
      const tg = x.createLinearGradient(0, treadFrontY, 0, nextTopY);
      tg.addColorStop(0, K.mix(treadCol, '#ffffff', 0.12 * (1 - fade)));
      tg.addColorStop(0.5, treadCol);
      tg.addColorStop(1, K.mix(treadCol, riserCol, 0.5));
      x.fillStyle = tg; x.fillRect(0, treadFrontY - 1, W, tH + 3);
      x.restore();
      x.restore();

      // ---- bright catch-light band where the tread meets the lip ----
      // near steps catch warm mineral gold; far steps stay cool jade edge.
      x.save(); x.globalCompositeOperation = 'lighter';
      x.beginPath();
      x.moveTo(topPts[0][0], topPts[0][1] + rH);
      for (let k = 1; k < topPts.length; k++) x.lineTo(topPts[k][0], topPts[k][1] + rH);
      x.lineWidth = Math.max(1.2, tH * 0.5);
      const catchCol = K.mix(K.mix(treadCol, P.edge, 0.5), P.pool, (1 - fade) * 0.5);
      x.strokeStyle = K.rgba(catchCol, 0.25 + 0.3 * (1 - fade));
      x.stroke();
      x.restore();

      // ---- crisp lit rim on the top lip ----
      x.save(); x.globalCompositeOperation = 'lighter';
      x.beginPath();
      x.moveTo(topPts[0][0], topPts[0][1]);
      for (let k = 1; k < topPts.length; k++) x.lineTo(topPts[k][0], topPts[k][1]);
      x.lineWidth = Math.max(1, rH * 0.16);
      x.strokeStyle = K.rgba(edgeCol, 0.4 + 0.5 * (1 - fade));
      x.stroke();
      x.restore();

      // ---- glowing pools on the tread (controlled, no blowout) ----
      if (t > 0.18 && tH > 3) {
        const nPools = Math.round((1 + t * 4) * p.poolDensity);
        const flooded = p.event === 'Flooded' || p.event === 'Mirror Pools';
        for (let q = 0; q < nPools; q++) {
          const px = (0.08 + ((q + r() * 0.7) / (nPools + 0.3)) * 0.84) * W;
          const ci = Math.min(topPts.length - 1, Math.max(0, Math.round((px + 24) / 5)));
          const py = topPts[ci][1] + rH + tH * (0.4 + r() * 0.4);
          const pw = (tH * (1.6 + r() * 2.4)) * (0.6 + t * 0.8);
          const ph = Math.max(1.5, tH * (0.4 + r() * 0.5));
          const pcol = K.mix(P.pool, P.light, 0.1 + (1 - t) * 0.12);
          // soft reflected glow (modest alpha so it never washes white)
          K.bloom(x, px, py, pw * 1.2, pcol, (0.1 + t * 0.16) * (flooded ? 1.5 : 1));
          x.save(); x.globalCompositeOperation = 'lighter';
          x.translate(px, py); x.scale(1, ph / pw);
          const pg = x.createRadialGradient(0, 0, 0, 0, 0, pw);
          pg.addColorStop(0, K.rgba(K.mix(pcol, '#fff', 0.5), 0.78));
          pg.addColorStop(0.5, K.rgba(pcol, 0.45));
          pg.addColorStop(1, K.rgba(pcol, 0));
          x.fillStyle = pg; x.beginPath(); x.arc(0, 0, pw, 0, Math.PI * 2); x.fill();
          x.restore();
        }
      }

      // ---- tiny scale markers / lit posts on near treads ----
      if (t > 0.5 && tH > 4) {
        x.save(); x.globalCompositeOperation = 'lighter';
        const nMark = K.rint(r, 2, 6);
        for (let m = 0; m < nMark; m++) {
          const mx = (0.06 + r() * 0.88) * W;
          const ci = Math.min(topPts.length - 1, Math.max(0, Math.round((mx + 24) / 5)));
          const my = topPts[ci][1] + rH + tH * (0.25 + r() * 0.35);
          const s = Math.max(1.4, tH * 0.22);
          x.fillStyle = K.rgba(P.light, 0.7);
          x.fillRect(mx, my - s * 2.2, Math.max(1, s * 0.4), s * 2.2);
          x.beginPath(); x.arc(mx + s * 0.2, my - s * 2.2, s * 0.55, 0, Math.PI * 2);
          x.fillStyle = K.rgba(K.mix(P.light, P.pool, r()), 0.85); x.fill();
        }
        x.restore();
      }

      // ---- impossible level: an edge fragment that folds back on itself ----
      if (i === impLevel) {
        x.save(); x.globalCompositeOperation = 'lighter';
        const sx = W * (0.18 + r() * 0.4), sw = W * (0.16 + r() * 0.1);
        x.strokeStyle = K.rgba(edgeCol, 0.6); x.lineWidth = Math.max(1.5, rH * 0.3);
        x.beginPath();
        x.moveTo(sx, treadFrontY);
        x.bezierCurveTo(sx + sw * 0.4, topY - rH * 2.6, sx + sw * 0.95, topY - rH * 0.3, sx + sw, treadFrontY + tH * 0.5);
        x.bezierCurveTo(sx + sw * 0.7, treadFrontY + tH * 1.6, sx + sw * 0.25, topY + rH * 0.4, sx, treadFrontY);
        x.stroke();
        x.restore();
      }

      y = nextTopY;
    }

    // ── inter-level cool fog pooling in the upper (far) terraces — deeper
    // dissolve so the far steps melt into glowing fog (epic aerial depth) ──
    x.save(); x.globalCompositeOperation = 'screen';
    const fogBot = hY + span * 0.55;
    const ff = x.createLinearGradient(0, hY - 6, 0, fogBot);
    ff.addColorStop(0, K.rgba(K.mix(P.deep, P.sky2, 0.3), 0.78));
    ff.addColorStop(0.5, K.rgba(P.deep, 0.4));
    ff.addColorStop(1, K.rgba(P.deep, 0));
    x.fillStyle = ff; x.fillRect(0, hY - 6, W, fogBot - hY + 6);
    x.restore();
    K.hazeSheet(x, W, hY + span * 0.55, noise, K.mix(P.deep, P.sky2, 0.4), 0.11, 360, 'screen');

    // light shafts raking down from the source
    if (p.sky !== 'Twin Moons') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const nShaft = K.rint(r, 3, 5);
      for (let s = 0; s < nShaft; s++) {
        const ang = -Math.PI / 2 + (s - nShaft / 2) * 0.15 + (r() - 0.5) * 0.05;
        const len = H * 0.95;
        const ex = lx + Math.cos(ang) * len * 1.1, ey = ly - Math.sin(ang) * len;
        const grd = x.createLinearGradient(lx, ly, ex, ey);
        grd.addColorStop(0, K.rgba(P.light, 0.07));
        grd.addColorStop(1, K.rgba(P.light, 0));
        x.strokeStyle = grd; x.lineWidth = W * (0.015 + r() * 0.03);
        x.beginPath(); x.moveTo(lx, ly); x.lineTo(ex, ey); x.stroke();
      }
      x.restore();
    }

    if (p.event === 'Goldfall') {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 150; i++) {
        const gx = r() * W, gy = hY + r() * (H - hY);
        x.fillStyle = K.rgba(K.mix(P.pool, P.light, r()), 0.18 + r() * 0.35);
        x.fillRect(gx, gy, 1.4, 3 + r() * 4);
      }
      x.restore();
    }

    // motes near the light
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 80; i++) {
      const mx = lx + (r() - 0.5) * W * 0.65, my = ly + (r() - 0.5) * hY * 1.1;
      const s = r() * 1.5 + 0.3;
      x.fillStyle = K.rgba(r() < 0.4 ? P.light : P.pool, 0.06 + r() * 0.22);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();

    // ── finishing atmosphere ──
    K.hazeSheet(x, W, H, noise, P.sky2, 0.035, 240, 'screen');
    K.grain(x, W, H, 540, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.42); x.restore();
    const topTint = x.createLinearGradient(0, 0, 0, H);
    topTint.addColorStop(0, K.rgba(P.sky1, 0.22)); topTint.addColorStop(0.38, 'rgba(0,0,0,0)');
    x.fillStyle = topTint; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_terraces', draw, traits };
})();
