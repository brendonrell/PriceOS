/* MONSOON — a dense neon hill-town in a tropical monsoon downpour at night.
 * Stacked buildings climbing a slope; every wet surface mirrors sign-light;
 * rain as diagonal streaks; steam rising off rooftops; umbrellas as scattered
 * light-dots in the streets. Surreal: rain can fall UPWARD in one band, or the
 * reflection shows a different/shifted city. Wet, saturated, rain-soaked neon.
 *
 * Palette family — HOT WET NEON: magenta / jade / night-teal ground, cyan +
 * hot-pink sign glow. Deep, rich, monsoon-dark grounds.
 *
 * Depth: BG = hazy distant hill of dim window-grids, MID = climbing stacked
 * blocks with bright signs, FG = big wet street + reflection pool + umbrellas.
 * Reflection = vertically-flipped, blurred, jittered copy of the lower glow. */
window.ENGINE = (function () {
  const K = window.KIT;

  // Colorways — all HOT WET NEON, vary mood (storm time / dominant sign hue).
  const PALS = [
    { name: 'Hot Wet',    sky:'#06202a', ground:'#04161e', deep:'#03252e', mag:'#ff2d9b', jade:'#18d08a', cyan:'#3df0ff', pink:'#ff4fa3', warm:'#ffd23d' },
    { name: 'Jade Storm', sky:'#04201f', ground:'#03161a', deep:'#053026', mag:'#ff2d9b', jade:'#22e89a', cyan:'#2ff0d6', pink:'#ff5db0', warm:'#ffe06a' },
    { name: 'Magenta Rain',sky:'#1a0a28', ground:'#0f0518', deep:'#26103a', mag:'#ff2db8', jade:'#18d08a', cyan:'#6a5dff', pink:'#ff4fc7', warm:'#ffce4d' },
    { name: 'Deep Teal',  sky:'#031820', ground:'#020e14', deep:'#03222c', mag:'#ff3da0', jade:'#15c894', cyan:'#1fe0ff', pink:'#ff5da8', warm:'#ffcf3d' },
    { name: 'Acid Monsoon',sky:'#0a1c10', ground:'#05120a', deep:'#0c2a16', mag:'#ff2d9b', jade:'#7dff4f', cyan:'#3df0ff', pink:'#ff5da8', warm:'#e6ff5d' },
    { name: 'Bruise',     sky:'#120626', ground:'#0a0418', deep:'#1c0a3a', mag:'#ff2d9b', jade:'#18d0b0', cyan:'#4f8dff', pink:'#ff4fa3', warm:'#ffb84d' },
  ];
  const FMTS = [ { W:1080, H:1480, t:'Slope' }, { W:1240, H:1240, t:'Square' }, { W:1240, H:1100, t:'Wide Hill' } ];
  const RAINS = ['Downpour', 'Drizzle', 'Squall', 'Upward Band'];

  function params(r) {
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      rain: K.pick(RAINS, r),
      slope: K.pick(['Left Climb','Right Climb','Twin Ridge'], r),
      density: K.rint(r, 5, 7),
      surreal: K.pick(['Mirror City','Floating Block','Giant Sign','Doubled Moon'], r),
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Rain: p.rain, Slope: p.slope, Anomaly: p.surreal };
  }

  // A stacked building block climbing the hill. Returns its sign-glow seeds so
  // the reflection pass can mirror them.
  function block(x, P, bx, by, bw, bh, depth, r, signSink) {
    // body — far blocks are hazier/desaturated toward the sky color
    const body = K.mix(P.ground, P.sky, 0.25 + (1 - depth) * 0.45);
    x.fillStyle = body;
    x.fillRect(bx, by - bh, bw, bh);
    // wet edge highlight (rim of sign-light catching the soaked concrete)
    x.save(); x.globalCompositeOperation = 'lighter';
    const rim = r() < 0.5 ? P.cyan : P.mag;
    x.strokeStyle = K.rgba(rim, (0.06 + depth * 0.22));
    x.lineWidth = 1;
    x.strokeRect(bx + 0.5, by - bh + 0.5, bw, bh);
    x.restore();

    // window grid — dim, denser & brighter near; far ones barely glow
    const cw = Math.max(3, bw / K.rint(r, 4, 8));
    const ch = Math.max(4, cw * (0.9 + r() * 0.7));
    const onP = 0.12 + depth * 0.38;
    for (let yy = by - bh + ch; yy < by - 2; yy += ch + 1) {
      for (let xx = bx + 2; xx < bx + bw - cw; xx += cw + 1) {
        if (r() > onP) continue;
        const lit = r() < 0.4 ? P.warm : (r() < 0.5 ? P.cyan : P.jade);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(lit, (0.22 + depth * 0.5) * (0.5 + r() * 0.5));
        x.fillRect(xx, yy, cw * 0.7, ch * 0.55);
        x.restore();
      }
    }

    // vertical neon sign strips on nearer blocks (the hot wet glow)
    if (depth > 0.35 && r() < 0.85) {
      const ns = K.rint(r, 1, 2);
      for (let s = 0; s < ns; s++) {
        const sx = bx + bw * (0.1 + r() * 0.7);
        const sh = bh * (0.25 + r() * 0.5);
        const sy = by - bh + bh * (0.1 + r() * 0.3);
        const col = r() < 0.45 ? P.mag : (r() < 0.5 ? P.cyan : (r() < 0.6 ? P.jade : P.pink));
        const sw = Math.max(2, bw * (0.04 + r() * 0.05));
        x.save(); x.globalCompositeOperation = 'lighter';
        // glowing strip
        x.fillStyle = K.rgba(col, 0.55 + depth * 0.35);
        x.fillRect(sx, sy, sw, sh);
        // glyph ticks along the strip
        for (let gy = sy + 3; gy < sy + sh - 3; gy += 5 + r() * 5) {
          if (r() < 0.6) { x.fillStyle = K.rgba(r() < 0.5 ? '#ffffff' : col, 0.8); x.fillRect(sx - 1, gy, sw + 2, 1.6); }
        }
        x.restore();
        K.bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * (0.7 + depth * 0.6), col, 0.28 + depth * 0.22);
        signSink.push({ x: sx + sw / 2, y: sy + sh / 2, rad: Math.max(sw, sh) * (0.8 + depth * 0.5), col, a: 0.3 + depth * 0.2 });
      }
    }
    // horizontal billboard sometimes
    if (depth > 0.5 && r() < 0.3) {
      const sw = bw * (0.5 + r() * 0.4), sh = bh * (0.08 + r() * 0.07);
      const sx = bx + bw * 0.1, sy = by - bh * (0.3 + r() * 0.4);
      const col = r() < 0.5 ? P.pink : P.cyan;
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(col, 0.18); x.fillRect(sx, sy, sw, sh);
      x.strokeStyle = K.rgba(col, 0.6); x.lineWidth = 1.2; x.strokeRect(sx, sy, sw, sh);
      x.restore();
      K.bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * 0.8, col, 0.3);
      signSink.push({ x: sx + sw / 2, y: sy + sh / 2, rad: Math.max(sw, sh) * 0.8, col, a: 0.3 });
    }
  }

  // diagonal rain streaks (alpha lines), optionally an upward band
  function rain(x, P, W, H, r, mode, intensity) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const ang = (-0.32 - r() * 0.12); // diagonal slant (radians from vertical-ish)
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const n = Math.floor(W * H / (mode === 'Drizzle' ? 900 : mode === 'Squall' ? 320 : 500)) * intensity;
    // upward band region
    const bandY0 = H * (0.2 + r() * 0.3), bandY1 = bandY0 + H * (0.18 + r() * 0.12);
    // make the anomalous band faintly visible (a still horizontal seam of mist)
    if (mode === 'Upward Band') {
      const bg = x.createLinearGradient(0, bandY0, 0, bandY1);
      bg.addColorStop(0, K.rgba(P.cyan, 0));
      bg.addColorStop(0.5, K.rgba(P.cyan, 0.06));
      bg.addColorStop(1, K.rgba(P.cyan, 0));
      x.fillStyle = bg; x.fillRect(0, bandY0, W, bandY1 - bandY0);
    }
    for (let i = 0; i < n; i++) {
      const sx = r() * W * 1.2 - W * 0.1;
      const sy = r() * H;
      const len = 14 + r() * (mode === 'Squall' ? 60 : 38);
      let ddx = dx, ddy = dy;
      // surreal upward band: rain in this horizontal band reverses
      if (mode === 'Upward Band' && sy > bandY0 && sy < bandY1) { ddy = -dy; ddx = -dx; }
      const col = r() < 0.2 ? P.cyan : (r() < 0.32 ? P.mag : '#dff2ff');
      x.strokeStyle = K.rgba(col, 0.06 + r() * 0.14);
      x.lineWidth = 0.6 + r() * 1.0;
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx + ddx * len, sy + ddy * len);
      x.stroke();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    // waterline — the wet street where reflection begins (lower third-ish)
    const water = H * (0.60 + r() * 0.12);

    // --- SKY: storm gradient, monsoon-dark with a glow bleed near the town ---
    const g = x.createLinearGradient(0, 0, 0, water);
    g.addColorStop(0, K.mix(P.sky, '#000', 0.35));
    g.addColorStop(0.55, P.sky);
    g.addColorStop(1, K.mix(P.sky, P.deep, 0.6));
    x.fillStyle = g; x.fillRect(0, 0, W, water);
    // ground/water base
    x.fillStyle = K.mix(P.ground, '#000', 0.2); x.fillRect(0, water, W, H - water);

    // low storm-cloud haze + a diffuse city-glow dome over the hill
    K.hazeSheet(x, W, water, noise, K.mix(P.sky, P.mag, 0.18), 0.4, 130, 'screen');
    const glowX = p.slope === 'Right Climb' ? W * 0.7 : p.slope === 'Left Climb' ? W * 0.3 : W * 0.5;
    K.bloom(x, glowX, water * 0.78, W * 0.55, K.mix(P.mag, P.jade, 0.4), 0.16);

    // surreal: doubled moon
    if (p.surreal === 'Doubled Moon') {
      const my = H * (0.16 + r() * 0.1);
      for (let m = 0; m < 2; m++) {
        const mx = W * (0.3 + m * 0.34) + (r() - 0.5) * 40;
        K.bloom(x, mx, my, 70 + m * 20, K.mix(P.warm, P.cyan, m * 0.5), 0.5);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(K.mix(P.warm, '#fff', 0.4), 0.5);
        x.beginPath(); x.arc(mx, my, 24 - m * 6, 0, 7); x.fill(); x.restore();
      }
    }

    // ---- collect sign glows for reflection ----
    const signSink = [];

    // hill silhouette baseline: a slope line the blocks climb along
    const slopeDir = p.slope === 'Right Climb' ? 1 : p.slope === 'Left Climb' ? -1 : 0;
    function hillY(t) { // t in 0..1 across width → baseline y for blocks
      if (p.slope === 'Twin Ridge') {
        return water - Math.sin(t * Math.PI) * H * 0.18 - H * 0.02;
      }
      const climb = slopeDir > 0 ? t : (1 - t);
      return water - climb * H * 0.30 - H * 0.02;
    }

    // ---- BACKGROUND: distant dim hill of small blocks (hazy, desaturated) ----
    {
      const L = p.density + 2;
      let bx = -W * 0.04;
      while (bx < W * 1.02) {
        const t = K.clamp(bx / W, 0, 1);
        const baseY = hillY(t) - H * 0.06 - r() * H * 0.04;
        const bw = W * (0.03 + r() * 0.05);
        const bh = H * (0.06 + r() * 0.12);
        block(x, P, bx, baseY, bw, bh, 0.18 + r() * 0.12, r, signSink);
        bx += bw * (0.9 + r() * 0.4);
      }
      // atmospheric perspective fog over the far hill
      K.hazeSheet(x, W, water, noise, K.mix(P.sky, P.deep, 0.5), 0.5, 160, 'screen');
    }

    // ---- MIDGROUND: the dense climbing stacked town ----
    const ROWS = 3;
    for (let row = 0; row < ROWS; row++) {
      const depth = 0.45 + (row / (ROWS - 1)) * 0.5; // 0.45 → 0.95
      // back row sits up the hill, front row drops to just above the waterline
      const yOff = -H * (0.10 - row * 0.05);
      let bx = -W * 0.06;
      while (bx < W * 1.04) {
        const t = K.clamp(bx / W, 0, 1);
        const baseY = hillY(t) + yOff + row * H * 0.03;
        const bw = W * (0.05 + r() * 0.08) * (0.7 + depth * 0.6);
        const bh = H * (0.14 + r() * 0.24) * (0.7 + depth * 0.55);
        block(x, P, bx, baseY, bw, bh, depth, r, signSink);
        bx += bw * (0.82 + r() * 0.35);
      }
      // thin haze between rows for depth separation
      if (row < ROWS - 1) K.hazeSheet(x, W, water, noise, K.mix(P.sky, P.mag, 0.12), 0.22, 110 + row * 30, 'screen');
    }

    // surreal: a giant out-of-scale sign — a single enormous glyph-tower that
    // dwarfs the town (kept clear of the waterline so it doesn't read as a bug)
    if (p.surreal === 'Giant Sign') {
      const gx = W * (0.15 + r() * 0.55), gy = H * (0.08 + r() * 0.12);
      const gw = W * (0.05 + r() * 0.04), gh = (water - gy) * (0.55 + r() * 0.25);
      const col = r() < 0.5 ? P.mag : P.cyan;
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(col, 0.42); x.fillRect(gx, gy, gw, gh);
      for (let gyy = gy + 6; gyy < gy + gh; gyy += 12 + r() * 8) { x.fillStyle = K.rgba('#fff', 0.7); x.fillRect(gx - 2, gyy, gw + 4, 2.5); }
      x.restore();
      K.bloom(x, gx + gw / 2, gy + gh / 2, gh * 0.6, col, 0.35);
      signSink.push({ x: gx + gw / 2, y: gy + gh / 2, rad: gh * 0.45, col, a: 0.42 });
    }
    if (p.surreal === 'Floating Block') {
      const fx = W * (0.3 + r() * 0.4), fy = H * (0.2 + r() * 0.15);
      const fw = W * 0.12, fh = H * 0.1;
      block(x, P, fx, fy + fh, fw, fh, 0.85, r, signSink);
      // faint tether of rain/light beneath it
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(P.cyan, 0.2); x.lineWidth = 1;
      for (let c = 0; c < 5; c++) { x.beginPath(); x.moveTo(fx + r() * fw, fy + fh); x.lineTo(fx + r() * fw, fy + fh + H * 0.12); x.stroke(); }
      x.restore();
    }

    // ---- WET STREET REFLECTION: vertically-flipped blurred sign glow ----
    // The signature element. Mirror the ENTIRE lit town into the wet street as
    // long, soft, downward-stretched neon smears. "Mirror City" shifts/recolors.
    {
      const shift = p.surreal === 'Mirror City' ? (r() - 0.5) * W * 0.35 : 0;
      const wetH = H - water;
      x.save();
      x.globalCompositeOperation = 'lighter';
      for (const s of signSink) {
        // start the reflection AT the waterline (wet pavement begins there) and
        // streak straight down — brightest at the top, dissolving into the pool
        const into = K.clamp((water - s.y) / water, 0, 1); // how high the source sits
        const fade = 0.5 + into * 0.5;
        let col = s.col;
        if (p.surreal === 'Mirror City' && r() < 0.5) col = K.mix(s.col, P.jade, 0.5);
        // NARROW vertical neon trail, length scaled by how bright the source is
        const colW = K.clamp(s.rad * 0.16, 3, 26);
        const colH = K.clamp(wetH * (0.4 + into * 0.55), 40, wetH * 1.1);
        const top = water + 2;
        const grd = x.createLinearGradient(0, top, 0, top + colH);
        grd.addColorStop(0, K.rgba(col, s.a * fade * 0.55));
        grd.addColorStop(0.35, K.rgba(col, s.a * fade * 0.26));
        grd.addColorStop(1, K.rgba(col, 0));
        // soft horizontal falloff via a radial-ish smear: draw 3 stacked widths
        for (let w = 0; w < 3; w++) {
          const ww = colW * (1 + w * 1.6);
          x.globalAlpha = w === 0 ? 0.85 : (0.34 - w * 0.1);
          x.fillStyle = grd;
          x.fillRect(s.x + shift - ww, top, ww * 2, colH);
        }
        x.globalAlpha = 1;
        // bright glint where the light meets the wet surface
        K.bloom(x, s.x + shift, top + 4, colW * 1.6, col, s.a * fade * 0.32);
      }
      x.restore();

      // horizontal ripple bands chop the reflection into wet broken streaks
      x.save(); x.globalCompositeOperation = 'multiply';
      for (let ry = water; ry < H; ry += 3 + r() * 5) {
        const a = 0.08 + r() * 0.16;
        x.fillStyle = 'rgba(0,0,0,' + a + ')';
        x.fillRect(0, ry, W, 0.8 + r() * 1.6);
      }
      x.restore();
      // a few bright rippling cyan glints on the water surface
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < K.rint(r, 30, 60); i++) {
        const ry = water + r() * wetH;
        const rx = r() * W;
        x.fillStyle = K.rgba(r() < 0.5 ? P.cyan : P.mag, 0.05 + r() * 0.12);
        x.fillRect(rx, ry, 4 + r() * 30, 0.8);
      }
      x.restore();
    }

    // wet street base sheen (gradient toward viewer, mag/cyan soaked)
    {
      const wg = x.createLinearGradient(0, water, 0, H);
      wg.addColorStop(0, K.rgba(K.mix(P.deep, P.mag, 0.22), 0.4));
      wg.addColorStop(0.6, K.rgba(K.mix(P.ground, P.cyan, 0.1), 0.12));
      wg.addColorStop(1, K.rgba(P.ground, 0.0));
      x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = wg; x.fillRect(0, water, W, H - water); x.restore();
    }
    // soften the waterline seam: a thin bright meniscus + dark settle so the
    // town doesn't read as two stacked images
    {
      x.save();
      x.globalCompositeOperation = 'lighter';
      const mg = x.createLinearGradient(0, water - H * 0.04, 0, water + H * 0.02);
      mg.addColorStop(0, K.rgba(K.mix(P.mag, P.cyan, 0.5), 0));
      mg.addColorStop(0.7, K.rgba(K.mix(P.mag, P.cyan, 0.5), 0.10));
      mg.addColorStop(1, K.rgba(K.mix(P.mag, P.cyan, 0.5), 0));
      x.fillStyle = mg; x.fillRect(0, water - H * 0.04, W, H * 0.06);
      x.restore();
    }

    // ---- FOREGROUND: umbrellas as scattered light-dots along the street ----
    {
      const um = K.rint(r, 12, 22);
      for (let i = 0; i < um; i++) {
        const uy = water + (r() * r()) * (H - water) * 0.9 + 6;
        const persp = (uy - water) / (H - water); // nearer = bigger/lower
        const ux = r() * W;
        const sz = 5 + persp * 22;
        const col = r() < 0.3 ? P.warm : (r() < 0.5 ? P.mag : (r() < 0.65 ? P.cyan : P.jade));
        // dark settle under the umbrella so it reads against bright reflections
        K.softShadow(x, ux, uy + sz * 0.3, sz * 2.2, 0.4);
        // umbrella dome silhouette (solid black so the light-dot pops)
        x.fillStyle = K.rgba('#05080a', 0.92);
        x.beginPath(); x.arc(ux, uy, sz, Math.PI, 0); x.fill();
        x.fillRect(ux - sz, uy, sz * 2, 1.5);
        // glowing dot of carried light just under the canopy
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba('#ffffff', 0.95); x.beginPath(); x.arc(ux, uy + sz * 0.35, sz * 0.18, 0, 7); x.fill();
        x.fillStyle = K.rgba(col, 0.95); x.beginPath(); x.arc(ux, uy + sz * 0.35, sz * 0.3, 0, 7); x.fill();
        x.restore();
        K.bloom(x, ux, uy + sz * 0.35, sz * 1.9, col, 0.55);
        // its little reflection streaking down
        K.bloom(x, ux, uy + sz * 1.4, sz * 1.5, col, 0.22);
      }
    }

    // ---- STEAM rising off rooftops (jade/teal hazeSheet, localized) ----
    {
      x.save(); x.globalCompositeOperation = 'screen';
      const steamCol = K.mix(P.jade, P.deep, 0.4);
      for (let s = 0; s < K.rint(r, 4, 7); s++) {
        const sx = r() * W, sy = water - H * (0.05 + r() * 0.3);
        const sw = W * (0.1 + r() * 0.15), sh = H * (0.08 + r() * 0.12);
        const grd = x.createRadialGradient(sx, sy, 0, sx, sy, Math.max(sw, sh));
        const n = (noise.fbm(sx / 120, sy / 120, 4) + 1) / 2;
        grd.addColorStop(0, K.rgba(steamCol, 0.12 + n * 0.1));
        grd.addColorStop(1, K.rgba(steamCol, 0));
        x.fillStyle = grd; x.fillRect(sx - sw, sy - sh, sw * 2, sh * 2);
      }
      x.restore();
    }

    // ---- RAIN over everything ----
    const intensity = p.rain === 'Drizzle' ? 1 : p.rain === 'Squall' ? 1 : 1;
    rain(x, P, W, H, r, p.rain, intensity);

    // foreground heavy rain streaks (closer, brighter, longer)
    {
      x.save(); x.globalCompositeOperation = 'lighter';
      const ang = -0.34;
      const dx = Math.sin(ang), dy = Math.cos(ang);
      const n = Math.floor(W / 6);
      for (let i = 0; i < n; i++) {
        const sx = r() * W * 1.2 - W * 0.1, sy = r() * H;
        const len = 40 + r() * 90;
        x.strokeStyle = K.rgba('#dff4ff', 0.05 + r() * 0.1);
        x.lineWidth = 1 + r() * 1.4;
        x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + dx * len, sy + dy * len); x.stroke();
      }
      x.restore();
    }

    // ---- atmospheric finish ----
    K.hazeSheet(x, W, H, noise, K.mix(P.sky, P.mag, 0.2), 0.12, 240, 'screen');
    K.bloom(x, glowX, water * 0.7, W * 0.4, P.mag, 0.06);
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'monsoon', draw, traits };
})();
