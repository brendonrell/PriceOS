/* ORDERBOOK — eroded canyon geology whose rock strata ARE frozen market data.
 * Horizontal sandstone bands built from price-ladders, candlestick columns and
 * order-book depth, weathered and wind-carved; glowing cyan/chartreuse data
 * veins run through the stone like ore. Surreal: the land is literally made of
 * charts — geology and data fused. On-brand for a price platform.
 *
 * LAYOUT AXIS (picked by seed): six structurally DISTINCT pictures, not one
 * scene relocated —
 *   Gorge    — a deep V cut down through the strata, raking sun-shafts, ticker
 *              river at the floor. (busy, symmetric)
 *   Wall     — flat-on canyon wall, pure horizontal data-strata, full-bleed,
 *              no gorge. (dense, frontal, abstract)
 *   River    — a meandering data-canyon seen from far above, big hazy sky,
 *              a glowing river snaking through it. (aerial, sparse top)
 *   Mesa     — a single towering data-butte standing against open sky, huge
 *              negative space. (hero silhouette)
 *   Macro    — extreme cross-section: ONE stratum fills the frame, candles and
 *              depth-bars huge, close-up grain. (macro hero)
 *   Badlands — a wide field of many eroded data-buttes receding into haze, tiny
 *              scale. (deep panorama)
 *
 * PALETTE: CANYON DATA — terracotta rock / cyan + chartreuse data veins /
 * dusty-violet shadow. Warm stone, cool glowing data. */
window.ENGINE = (function () {
  const K = window.KIT;

  // rock0 = bright sunlit stone, rock1 = mid stone, rock2 = shadow stone;
  // vein = glowing data line tone, hot = chartreuse/cyan ticker; sky = haze band;
  // shadow = gorge depth.
  const PALS = [
    { name: 'Canyon Data',   sky: '#4a2f4a', rock0: '#e08a4a', rock1: '#c2693c', rock2: '#7a3a3e', vein: '#2ec8e0', hot: '#b6e028', shadow: '#1e0e1c' },
    { name: 'Oxide Run',     sky: '#3a2240', rock0: '#ff9a52', rock1: '#d2622e', rock2: '#6e2c34', vein: '#34d8c8', hot: '#d6e84a', shadow: '#1a0a16' },
    { name: 'Cyan Strata',   sky: '#243a52', rock0: '#d88a5a', rock1: '#b06038', rock2: '#5a3450', vein: '#2ad4ff', hot: '#9be030', shadow: '#100c20' },
    { name: 'Chartreuse Bed', sky: '#3e3a28', rock0: '#e89a44', rock1: '#bc6e2e', rock2: '#6e4a30', vein: '#7ce0c0', hot: '#c8ff28', shadow: '#181208' },
    { name: 'Violet Gorge',  sky: '#3a2658', rock0: '#d27a5e', rock1: '#a85240', rock2: '#5e2c54', vein: '#46c6ff', hot: '#b0e84a', shadow: '#140a22' },
    { name: 'Ember Mesa',    sky: '#4e2438', rock0: '#ff8a44', rock1: '#d4582a', rock2: '#7a3030', vein: '#28ccd8', hot: '#e0e83a', shadow: '#1c0810' },
  ];

  const LAYOUTS = ['Gorge', 'Wall', 'River', 'Mesa', 'Macro', 'Badlands'];
  const LIGHTS = ['High Sun', 'Raking Dusk', 'Slot Light', 'Overcast'];
  const READS = ['Candle Stone', 'Ladder Beds', 'Depth Folds'];

  // each layout favours a format that frames it best (but still varied)
  const FMT = {
    Gorge:    [{ W: 1180, H: 1440, t: 'Deep' }, { W: 1240, H: 1240, t: 'Square' }],
    Wall:     [{ W: 1480, H: 1100, t: 'Wide' }, { W: 1240, H: 1240, t: 'Square' }],
    River:    [{ W: 1240, H: 1240, t: 'Square' }, { W: 1180, H: 1440, t: 'Deep' }],
    Mesa:     [{ W: 1180, H: 1440, t: 'Deep' }, { W: 1240, H: 1240, t: 'Square' }],
    Macro:    [{ W: 1480, H: 1080, t: 'Wide' }, { W: 1240, H: 1240, t: 'Square' }],
    Badlands: [{ W: 1480, H: 1040, t: 'Wide' }, { W: 1480, H: 1100, t: 'Wide' }],
  };

  function params(r) {
    const layout = K.pick(LAYOUTS, r);
    return {
      layout,
      pal: K.pick(PALS, r),
      fmt: K.pick(FMT[layout], r),
      light: K.pick(LIGHTS, r),
      read: K.pick(READS, r),
      strata: K.rint(r, 8, 16),
      sunDir: r() < 0.5 ? -1 : 1,
      fold: 0.4 + r() * 0.7,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Light: p.light, Reads: p.read, Strata: p.strata };
  }

  // ───────────────────────── shared primitives ─────────────────────────

  // Paint one stratum band clipped to a polygon region. The band carries the
  // data micro-texture (candles / ladders / depth). `tone` is the rock colour,
  // `lit` 0..1 boosts top-edge highlight (for sun side). y0..y1 are the local
  // band span used for the gradient + data layout.
  function paintBand(x, P, p, noise, seed, b, N, region, y0, y1, read, lit, flat) {
    const bh = y1 - y0;
    const tone = (b % 3 === 0) ? P.rock0 : (b % 3 === 1) ? P.rock1 : P.rock2;
    const base = K.mix(tone, P.rock2, (b / N) * 0.3);
    x.save();
    region();        // sets the clip path + clips
    const bg = x.createLinearGradient(0, y0, 0, y1);
    // `flat` softens the per-band light→dark ramp so stacked bands read as a flat
    // rock face, not a stack of beveled coins (used by Mesa).
    const top = flat ? 0.10 + lit * 0.18 : 0.18 + lit * 0.25;
    const bot = flat ? 0.24 : 0.45;
    bg.addColorStop(0, K.mix(base, P.rock0, top));
    bg.addColorStop(0.16, base);
    bg.addColorStop(1, K.mix(base, P.shadow, bot));
    x.fillStyle = bg; x.fillRect(-9999, y0 - bh, 99999, bh * 3);

    const W = x.canvas.width;
    const dataCol = K.mix(base, b % 2 ? P.vein : P.hot, 0.5);
    const litCol = K.mix(base, '#fff', 0.3);
    if (read === 'Candle Stone' || (read === 'Depth Folds' && b % 2 === 0)) {
      const cw = Math.max(3, W / (60 + (seed % 30)));
      for (let cx = 0; cx < W; cx += cw * 1.5) {
        const open = y0 + bh * (0.2 + noise.fbm(cx / 50, b, 2) * 0.3 + 0.3);
        const close = y0 + bh * (0.2 + noise.fbm(cx / 50 + 9, b, 2) * 0.3 + 0.3);
        const hi = Math.min(open, close) - bh * (0.1 + noise.fbm(cx / 30, b + 4, 2) * 0.18);
        const loo = Math.max(open, close) + bh * (0.1 + noise.fbm(cx / 30, b + 8, 2) * 0.18);
        const up = close < open;
        x.strokeStyle = K.rgba(K.mix(dataCol, P.shadow, 0.3), 0.5);
        x.lineWidth = Math.max(0.6, cw * 0.12);
        x.beginPath(); x.moveTo(cx + cw * 0.5, hi); x.lineTo(cx + cw * 0.5, loo); x.stroke();
        x.fillStyle = K.rgba(up ? K.mix(dataCol, litCol, 0.3) : K.mix(base, P.shadow, 0.5), 0.55);
        x.fillRect(cx + cw * 0.15, Math.min(open, close), cw * 0.7, Math.abs(close - open) + 1);
      }
    } else {
      const rows = Math.max(3, Math.floor(bh / 14));
      for (let rr = 0; rr < rows; rr++) {
        const ry = y0 + bh * (rr / rows) + noise.fbm(rr, b, 2) * 3;
        x.strokeStyle = K.rgba(K.mix(base, rr % 4 === 0 ? dataCol : P.shadow, rr % 4 === 0 ? 0.5 : 0.3), 0.35);
        x.lineWidth = rr % 4 === 0 ? 1.4 : 0.7;
        x.beginPath(); x.moveTo(-50, ry); x.lineTo(W + 50, ry); x.stroke();
        if (rr % 2 === 0) {
          const axis = ((b * 37 + rr * 13) % 100) / 100 * W;
          const len = (noise.fbm(rr * 3, b, 2) * 0.5 + 0.5) * W * 0.12;
          const side = rr % 4 === 0 ? 1 : -1;
          x.fillStyle = K.rgba(K.mix(dataCol, base, 0.4), 0.3);
          x.fillRect(side > 0 ? axis : axis - len, ry - 2, len, 4);
        }
      }
    }
    K.mottle(x, -50, y0, W + 100, bh, base, 90, K.rng(seed + b * 5), 'multiply');
    // wind-carved cracks
    x.strokeStyle = K.rgba(P.shadow, 0.4); x.lineWidth = 1;
    for (let c = 0; c < 3; c++) {
      const cy = y0 + noise.fbm(c * 5, b * 3, 2) * bh + bh * 0.2;
      x.beginPath(); x.moveTo(-20, cy);
      for (let xx = 0; xx < W + 20; xx += 30) x.lineTo(xx, cy + noise.fbm(xx / 60, c + b, 2) * bh * 0.4);
      x.stroke();
    }
    x.restore();
  }

  // sky/haze gradient at top of an open-air scene
  function paintSky(x, P, W, H, skyH, light) {
    const sg = x.createLinearGradient(0, 0, 0, skyH);
    sg.addColorStop(0, K.mix(P.sky, '#000', light === 'Overcast' ? 0.1 : 0.28));
    sg.addColorStop(0.6, P.sky);
    sg.addColorStop(1, K.mix(P.sky, P.rock0, 0.5));
    x.fillStyle = sg; x.fillRect(0, 0, W, skyH);
  }

  // a low sun disc / glow behind a horizon (for hero / open layouts)
  function sunGlow(x, P, sx, sy, rad, str) {
    K.bloom(x, sx, sy, rad, K.mix(P.rock0, '#fff', 0.5), 0.16 * str);
    K.bloom(x, sx, sy, rad * 0.45, K.mix(P.hot, '#fff', 0.5), 0.18 * str);
  }

  // glowing ticker line + candles along a path sampled by fn(t)->{x,y,w}
  function tickerRiver(x, P, noise, seed, pts, glow) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (const pt of pts) K.bloom(x, pt.x, pt.y, pt.w * 2.2, P.hot, 0.16 * glow);
    x.strokeStyle = K.rgba(K.mix(P.hot, '#fff', 0.35), 0.9);
    x.lineWidth = 2;
    x.beginPath();
    pts.forEach((pt, i) => { i ? x.lineTo(pt.x, pt.y) : x.moveTo(pt.x, pt.y); });
    x.stroke();
    // luminous candles standing on the line
    pts.forEach((pt, i) => {
      if (i % 2) return;
      const ch = pt.w * (0.5 + noise.fbm(i, seed, 2) * 0.9);
      x.fillStyle = K.rgba(i % 3 === 0 ? P.vein : P.hot, 0.55);
      x.fillRect(pt.x - 1, pt.y - ch, Math.max(1.5, pt.w * 0.12), ch);
    });
    x.restore();
  }

  function atmosphere(x, P, W, H, noise, r, light) {
    const overcast = light === 'Overcast';
    K.hazeSheet(x, W, H, noise, K.mix(P.sky, P.rock0, 0.4), overcast ? 0.2 : 0.12, 300, 'screen');
    // floating warm dust catching light
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const dx = r() * W, dy = r() * H;
      x.fillStyle = K.rgba(K.mix(P.rock0, '#fff', r()), 0.03 + r() * 0.1);
      const s = 0.6 + r() * 1.4; x.fillRect(dx, dy, s, s);
    }
    x.restore();
    K.grain(x, W, H, 420, r);
    K.vignette(x, W, H, 0.5);
  }

  // ───────────────────────────── layouts ─────────────────────────────

  function drawGorge(x, P, p, W, H, noise, seed, r, sunStr) {
    const skyH = H * (0.10 + r() * 0.05);
    paintSky(x, P, W, H, skyH, p.light);
    const gx0 = (0.34 + r() * 0.32) * W;
    const gW = 0.15 + r() * 0.16;
    const gorgeC = (yy) => {
      const t = (yy - skyH) / (H - skyH);
      return gx0 + Math.sin(t * 2.4 + seed) * W * 0.06 * p.fold + noise.fbm(t * 3, seed, 2) * W * 0.04;
    };
    const gorgeHW = (yy) => {
      const t = K.clamp((yy - skyH) / (H - skyH), 0, 1);
      return gW * W * (0.45 + t * 1.5) * (1 + noise.fbm(yy / 40, seed * 2, 3) * 0.18);
    };
    const N = p.strata;
    const bounds = [skyH];
    for (let i = 1; i < N; i++) bounds.push(skyH + (H - skyH) * (i / N));
    bounds.push(H);
    for (let b = 0; b < N; b++) {
      const y0 = bounds[b], y1 = bounds[b + 1], bh = y1 - y0;
      paintBand(x, P, p, noise, seed, b, N, () => {
        x.beginPath(); x.moveTo(0, y0);
        for (let xx = 0; xx <= W; xx += Math.max(6, W / 160)) {
          const fold = Math.sin(xx / W * Math.PI * (1 + p.fold) + b) * bh * 0.18 * p.fold
            + noise.fbm(xx / 120, b * 7, 3) * bh * 0.3;
          x.lineTo(xx, y0 + fold);
        }
        x.lineTo(W, y1 + bh); x.lineTo(0, y1 + bh); x.closePath(); x.clip();
      }, y0, y1, p.read, p.sunDir < 0 ? 1 : 0);
    }
    // carve the gorge slot
    x.save();
    x.beginPath();
    x.moveTo(gorgeC(skyH) - gorgeHW(skyH), skyH);
    for (let yy = skyH; yy <= H; yy += 8) x.lineTo(gorgeC(yy) - gorgeHW(yy), yy);
    for (let yy = H; yy >= skyH; yy -= 8) x.lineTo(gorgeC(yy) + gorgeHW(yy), yy);
    x.closePath(); x.clip();
    const dg = x.createLinearGradient(0, skyH, 0, H);
    dg.addColorStop(0, K.rgba(K.mix(P.shadow, P.sky, 0.4), 0.7));
    dg.addColorStop(0.5, K.rgba(P.shadow, 0.82));
    dg.addColorStop(1, K.rgba(K.mix(P.shadow, '#000', 0.3), 0.92));
    x.fillStyle = dg; x.fillRect(0, skyH, W, H);
    for (let i = 0; i < 6; i++) {
      const wy = skyH + (H - skyH) * (i / 6);
      x.fillStyle = K.rgba(K.mix(P.rock1, P.shadow, 0.5), 0.16);
      x.fillRect(gorgeC(wy) - gorgeHW(wy) * 0.4, wy, gorgeHW(wy) * 0.8, (H - skyH) / 6);
    }
    x.restore();
    // sun shafts
    if (p.light !== 'Overcast') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const sx = p.sunDir < 0 ? W * 0.05 : W * 0.95, sy = skyH * 0.4;
      const nb = p.light === 'Slot Light' ? 5 : 3;
      for (let i = 0; i < nb; i++) {
        const ang = (p.sunDir < 0 ? 0.6 : Math.PI - 0.6) + (i - nb / 2) * 0.06;
        const len = H * 1.2, ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
        const wB = W * (0.02 + noise.fbm(i, seed, 2) * 0.04 + 0.01);
        const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
        const grd = x.createLinearGradient(sx, sy, ex, ey);
        grd.addColorStop(0, K.rgba(K.mix(P.rock0, '#fff', 0.4), 0.14 * sunStr));
        grd.addColorStop(1, K.rgba(P.rock0, 0));
        x.fillStyle = grd;
        x.beginPath(); x.moveTo(sx, sy);
        x.lineTo(ex + px * wB, ey + py * wB); x.lineTo(ex - px * wB, ey - py * wB);
        x.closePath(); x.fill();
      }
      x.restore();
    }
    // ticker river at the floor
    const riverY = H * 0.93;
    const rc = gorgeC(riverY), rhw = gorgeHW(riverY);
    const pts = [];
    for (let xx = rc - rhw; xx <= rc + rhw; xx += 7) pts.push({ x: xx, y: riverY + noise.fbm(xx / 18, seed * 3, 2) * rhw * 0.4, w: Math.max(2, rhw * 0.05) });
    tickerRiver(x, P, noise, seed, pts, 1);
  }

  function drawWall(x, P, p, W, H, noise, seed, r) {
    // flat-on cliff face: pure horizontal strata, full-bleed, NO gorge, NO sky.
    // dense frontal abstraction. A couple of vertical erosion fissures only.
    const N = Math.max(11, p.strata + 3);
    const bounds = [0];
    // uneven band heights for geological feel
    let acc = 0;
    const ws = [];
    for (let i = 0; i < N; i++) { const w = 0.6 + noise.fbm(i * 1.3, seed, 2) + 0.4; ws.push(w); acc += w; }
    let yy = 0;
    for (let i = 0; i < N; i++) { yy += (ws[i] / acc) * H; bounds.push(yy); }
    bounds[N] = H;
    for (let b = 0; b < N; b++) {
      const y0 = bounds[b], y1 = bounds[b + 1], bh = y1 - y0;
      paintBand(x, P, p, noise, seed, b, N, () => {
        x.beginPath(); x.moveTo(0, y0);
        for (let xx = 0; xx <= W; xx += Math.max(6, W / 200)) {
          const fold = Math.sin(xx / W * Math.PI * (0.8 + p.fold) + b * 0.7) * bh * 0.12 * p.fold
            + noise.fbm(xx / 140, b * 7, 3) * bh * 0.22;
          x.lineTo(xx, y0 + fold);
        }
        x.lineTo(W, y1 + bh); x.lineTo(0, y1 + bh); x.closePath(); x.clip();
      }, y0, y1, p.read, p.sunDir < 0 ? 0.5 : 0.5);
    }
    // a few deep vertical fissures cracking down the wall (negative-space rhythm)
    const nf = K.rint(r, 2, 4);
    for (let f = 0; f < nf; f++) {
      const fx = (0.12 + (f + 0.5) / nf * 0.76 + (noise.fbm(f, seed, 2) - 0.5) * 0.1) * W;
      const fw = W * (0.012 + noise.fbm(f * 3, seed, 2) * 0.03 + 0.006);
      x.save(); x.beginPath();
      x.moveTo(fx, 0);
      for (let y = 0; y <= H; y += 14) x.lineTo(fx + Math.sin(y / 90 + f) * fw * 1.4 + noise.fbm(y / 50, f * 7, 2) * fw, y);
      for (let y = H; y >= 0; y -= 14) x.lineTo(fx + fw + Math.sin(y / 90 + f) * fw * 1.4 + noise.fbm(y / 50, f * 7, 2) * fw, y);
      x.closePath(); x.clip();
      const fg = x.createLinearGradient(fx - fw, 0, fx + fw * 2, 0);
      fg.addColorStop(0, K.rgba(P.shadow, 0.2));
      fg.addColorStop(0.5, K.rgba(P.shadow, 0.8));
      fg.addColorStop(1, K.rgba(P.shadow, 0.2));
      x.fillStyle = fg; x.fillRect(fx - fw * 2, 0, fw * 6, H);
      // a thin glowing data-vein running down inside the fissure
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(f % 2 ? P.vein : P.hot, 0.35); x.lineWidth = 1.4;
      x.beginPath();
      for (let y = 0; y <= H; y += 10) { const vx = fx + fw * 0.5 + Math.sin(y / 90 + f) * fw * 1.4; y ? x.lineTo(vx, y) : x.moveTo(vx, y); }
      x.stroke();
      x.restore();
    }
    // raking side-light wash across the face
    if (p.light !== 'Overcast') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const g = x.createLinearGradient(p.sunDir < 0 ? 0 : W, 0, p.sunDir < 0 ? W : 0, H);
      g.addColorStop(0, K.rgba(K.mix(P.rock0, '#fff', 0.4), 0.16));
      g.addColorStop(0.5, K.rgba(P.rock0, 0.04));
      g.addColorStop(1, K.rgba(P.rock0, 0));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.restore();
    }
  }

  function drawRiver(x, P, p, W, H, noise, seed, r, sunStr) {
    // AERIAL view of a meandering data-canyon. Top third = hazy distance/sky
    // band, the rest = a textured tableland seen from above, with a glowing
    // river snaking through a carved channel. Big sparse top.
    const horizon = H * (0.22 + r() * 0.1);
    paintSky(x, P, W, H, horizon, p.light);
    sunGlow(x, P, W * (p.sunDir < 0 ? 0.2 : 0.8), horizon * 0.7, W * 0.5, sunStr);

    // tableland — paint as a few broad strata fields receding (top-down, so
    // perspective compresses bands toward the horizon)
    const N = Math.max(7, Math.floor(p.strata * 0.6));
    for (let b = 0; b < N; b++) {
      const t0 = b / N, t1 = (b + 1) / N;
      // ease so far bands (near horizon) are thin, near bands tall
      const e = (t) => t * t;
      const y0 = horizon + (H - horizon) * e(t0);
      const y1 = horizon + (H - horizon) * e(t1);
      paintBand(x, P, p, noise, seed, b, N, () => {
        x.beginPath(); x.moveTo(0, y0);
        for (let xx = 0; xx <= W; xx += Math.max(6, W / 160)) {
          const fold = noise.fbm(xx / 130, b * 5, 3) * (y1 - y0) * 0.4;
          x.lineTo(xx, y0 + fold);
        }
        x.lineTo(W, y1 + 40); x.lineTo(0, y1 + 40); x.closePath(); x.clip();
      }, y0, y1, p.read, 0.2);
    }
    // the carved river channel — a dark meandering ribbon getting wider toward us
    const meander = (t) => {
      // t: 0 far(horizon) .. 1 near(bottom)
      const y = horizon + (H - horizon) * (t * t);
      const cx = W * 0.5 + Math.sin(t * 5 + seed) * W * 0.28 * (0.4 + t) + noise.fbm(t * 4, seed, 2) * W * 0.1;
      const w = W * (0.015 + t * t * 0.14);
      return { x: cx, y, w };
    };
    // dark carved channel under the river
    x.save();
    x.beginPath();
    let started = false;
    for (let i = 0; i <= 60; i++) { const m = meander(i / 60); const px = m.x - m.w; started ? x.lineTo(px, m.y) : (x.moveTo(px, m.y), started = true); }
    for (let i = 60; i >= 0; i--) { const m = meander(i / 60); x.lineTo(m.x + m.w, m.y); }
    x.closePath();
    const cg = x.createLinearGradient(0, horizon, 0, H);
    cg.addColorStop(0, K.rgba(K.mix(P.shadow, P.sky, 0.4), 0.6));
    cg.addColorStop(1, K.rgba(P.shadow, 0.9));
    x.fillStyle = cg; x.fill();
    x.restore();
    // glowing ticker running down the channel centre
    const pts = [];
    for (let i = 0; i <= 60; i++) { const m = meander(i / 60); pts.push({ x: m.x, y: m.y, w: Math.max(2, m.w * 0.5) }); }
    tickerRiver(x, P, noise, seed, pts, 1.1);
  }

  function drawMesa(x, P, p, W, H, noise, seed, r, sunStr) {
    // a SINGLE towering data-butte standing in open desert against big sky.
    // huge negative space. hero silhouette, atmospheric perspective behind it.
    const skyH = H;
    paintSky(x, P, W, H, H * 0.95, p.light);
    // ground haze plain
    const groundY = H * (0.66 + r() * 0.08);
    const gg = x.createLinearGradient(0, groundY - H * 0.1, 0, H);
    gg.addColorStop(0, K.rgba(K.mix(P.rock1, P.sky, 0.5), 0.5));
    gg.addColorStop(1, K.mix(P.rock1, P.shadow, 0.4));
    x.fillStyle = gg; x.fillRect(0, groundY - H * 0.1, W, H);
    sunGlow(x, P, W * (p.sunDir < 0 ? 0.22 : 0.78), H * 0.3, W * 0.55, sunStr);

    // a couple of faint distant buttes for depth
    for (let d = 0; d < 3; d++) {
      const bx = W * (0.12 + d * 0.3 + noise.fbm(d, seed, 2) * 0.1);
      const bw = W * (0.07 + noise.fbm(d * 2, seed, 2) * 0.05);
      const bhh = H * (0.1 + noise.fbm(d * 3, seed, 2) * 0.12);
      x.fillStyle = K.rgba(K.mix(P.rock2, P.sky, 0.55), 0.5);
      x.fillRect(bx, groundY - bhh, bw, bhh);
    }

    // THE mesa — tall, offset to a third, flat top, vertical eroded flanks
    const mx = W * (p.sunDir < 0 ? 0.6 : 0.4);
    const mw = W * (0.32 + r() * 0.1);
    const mtop = H * (0.14 + r() * 0.08);
    const profile = (yy, side) => {
      // side: -1 left edge, +1 right edge. near-vertical face with a couple of
      // broad eroded gullies + fine talus jitter (low amplitude so the
      // silhouette stays a clean mesa, not a stack of coins).
      const t = (yy - mtop) / (groundY - mtop);
      const taper = mw * (0.5 - t * 0.05);
      const gully = (noise.fbm(yy / 130, side * 7 + seed, 2) - 0.5) * mw * 0.14;   // broad
      const talus = (noise.fbm(yy / 14, side * 13 + seed, 3) - 0.5) * mw * 0.05;   // fine
      // flare the base into a talus slope so it sits on the ground
      const flare = t > 0.82 ? (t - 0.82) / 0.18 * mw * 0.18 : 0;
      return mx + side * (taper + gully + talus + flare);
    };
    const N = Math.max(13, p.strata + 5);
    // clip the WHOLE eroded mesa silhouette ONCE so band edges follow the rock
    // face continuously (no stair-stepped pancakes), then paint flat strata.
    x.save();
    x.beginPath();
    x.moveTo(profile(mtop, -1), mtop); x.lineTo(profile(mtop, 1), mtop);
    for (let yy = mtop; yy <= groundY; yy += 5) x.lineTo(profile(yy, 1), yy);
    for (let yy = groundY; yy >= mtop; yy -= 5) x.lineTo(profile(yy, -1), yy);
    x.closePath(); x.clip();
    for (let b = 0; b < N; b++) {
      const y0 = mtop + (groundY - mtop) * (b / N);
      const y1 = mtop + (groundY - mtop) * ((b + 1) / N);
      paintBand(x, P, p, noise, seed, b, N, () => {
        // flat horizontal band; the outer silhouette clip already shapes the sides
        x.beginPath(); x.rect(0, y0, W, y1 - y0 + 1); x.clip();
      }, y0, y1, p.read, p.sunDir < 0 ? 0.1 : 0.6, true);
    }
    x.restore();
    // shadow side of the mesa
    x.save();
    x.beginPath();
    const shadeSide = -p.sunDir;
    x.moveTo(mx, mtop);
    for (let yy = mtop; yy <= groundY; yy += 8) x.lineTo(profile(yy, shadeSide), yy);
    for (let yy = groundY; yy >= mtop; yy -= 8) x.lineTo(mx, yy);
    x.closePath();
    x.fillStyle = K.rgba(P.shadow, 0.4); x.fill();
    x.restore();
    // glowing data-vein cresting the flat top (a tiny ticker on the summit)
    const pts = [];
    for (let xx = profile(mtop, -1); xx <= profile(mtop, 1); xx += 8) pts.push({ x: xx, y: mtop + noise.fbm(xx / 20, seed, 2) * 6, w: 3 });
    tickerRiver(x, P, noise, seed, pts, 0.8);
    // cast shadow on the ground plain
    x.save(); x.globalCompositeOperation = 'multiply';
    const sd = x.createLinearGradient(mx, groundY, mx + p.sunDir * -mw, groundY);
    sd.addColorStop(0, K.rgba(P.shadow, 0.5)); sd.addColorStop(1, K.rgba(P.shadow, 0));
    x.fillStyle = sd; x.fillRect(Math.min(mx, mx - p.sunDir * mw), groundY, mw, H * 0.06);
    x.restore();
  }

  function drawMacro(x, P, p, W, H, noise, seed, r) {
    // EXTREME cross-section: ONE stratum fills the whole frame. Candles / depth
    // bars are HUGE. Close-up grain, big carved relief, a thin lit lip top &
    // bottom hinting at neighbouring beds. macro hero — no sky, no horizon.
    const base0 = K.mix(P.rock1, P.rock0, 0.3);
    // backdrop fill
    x.fillStyle = base0; x.fillRect(0, 0, W, H);
    // gradient relief across the single band
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(base0, P.shadow, 0.5));       // shadowed top lip (bed above)
    bg.addColorStop(0.08, K.mix(base0, P.rock0, 0.3));
    bg.addColorStop(0.5, base0);
    bg.addColorStop(0.92, K.mix(base0, P.rock0, 0.2));
    bg.addColorStop(1, K.mix(base0, P.shadow, 0.55));       // shadowed bottom lip
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    const read = p.read;
    if (read === 'Ladder Beds') {
      // huge horizontal price ladders + depth bars
      const rows = K.rint(r, 9, 16);
      for (let i = 0; i < rows; i++) {
        const ry = H * (0.08 + (i / rows) * 0.84) + noise.fbm(i, seed, 2) * 8;
        const major = i % 3 === 0;
        x.strokeStyle = K.rgba(K.mix(base0, major ? (i % 2 ? P.vein : P.hot) : P.shadow, major ? 0.55 : 0.4), major ? 0.6 : 0.4);
        x.lineWidth = major ? 4 : 1.5;
        x.beginPath(); x.moveTo(0, ry); x.lineTo(W, ry); x.stroke();
        // big depth bars
        const axis = (0.2 + noise.fbm(i * 2, seed, 2) * 0.6) * W;
        const len = (0.3 + noise.fbm(i * 3, seed, 2) * 0.6) * W * 0.4;
        const side = i % 2 ? 1 : -1;
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(i % 2 ? P.vein : P.hot, 0.18);
        x.fillRect(side > 0 ? axis : axis - len, ry - 12, len, 24);
        x.restore();
      }
    } else {
      // giant candlesticks FILLING the frame — bodies tall, wicks reach edges.
      const n = K.rint(r, 7, 11);
      const cw = W / n;
      for (let i = 0; i < n; i++) {
        const cx = i * cw + cw * 0.5;
        // body height + vertical position both vary so it reads as a price chart
        // carved in stone, not a uniform fence.
        const cMid = 0.32 + noise.fbm(i * 1.7, seed, 2) * 0.4;          // body centre 0..1
        const cHalf = 0.16 + noise.fbm(i * 2.3, seed + 5, 2) * 0.28;    // body half-height
        const topY = H * K.clamp(cMid - cHalf, 0.04, 0.9);
        const botY = H * K.clamp(cMid + cHalf, 0.1, 0.96);
        const wickTop = topY - H * (0.02 + noise.fbm(i * 3, seed + 7, 2) * 0.05);
        const wickBot = botY + H * (0.02 + noise.fbm(i * 4, seed + 9, 2) * 0.05);
        const up = noise.fbm(i * 5, seed, 2) > 0.5;
        const bx = cx - cw * 0.40, bw = cw * 0.80, bhh = botY - topY;
        // wick — thick carved column
        x.strokeStyle = K.rgba(K.mix(base0, P.shadow, 0.5), 0.8); x.lineWidth = cw * 0.12;
        x.beginPath(); x.moveTo(cx, wickTop); x.lineTo(cx, wickBot); x.stroke();
        x.strokeStyle = K.rgba(K.mix(base0, '#fff', 0.2), 0.3); x.lineWidth = cw * 0.04;
        x.beginPath(); x.moveTo(cx - cw * 0.03, wickTop); x.lineTo(cx - cw * 0.03, wickBot); x.stroke();
        // carved body with vertical relief gradient
        const bodyCol = up ? K.mix(P.hot, base0, 0.45) : K.mix(P.rock2, P.shadow, 0.25);
        const bgrad = x.createLinearGradient(bx, 0, bx + bw, 0);
        bgrad.addColorStop(0, K.mix(bodyCol, '#fff', p.sunDir < 0 ? 0.35 : 0.05));
        bgrad.addColorStop(0.5, bodyCol);
        bgrad.addColorStop(1, K.mix(bodyCol, P.shadow, p.sunDir < 0 ? 0.05 : 0.45));
        x.fillStyle = bgrad; x.fillRect(bx, topY, bw, bhh);
        // top lit lip + bottom shadow ledge
        x.fillStyle = K.rgba(K.mix(bodyCol, '#fff', 0.5), 0.55); x.fillRect(bx, topY, bw, Math.max(3, bhh * 0.04));
        x.fillStyle = K.rgba(P.shadow, 0.5); x.fillRect(bx, botY - bhh * 0.05, bw, bhh * 0.05);
        // internal price-rungs carved across each candle body
        for (let g = 1; g < 7; g++) {
          const gy = topY + bhh * (g / 7);
          x.strokeStyle = K.rgba(K.mix(bodyCol, P.shadow, 0.4), 0.3); x.lineWidth = 1.5;
          x.beginPath(); x.moveTo(bx, gy); x.lineTo(bx + bw, gy); x.stroke();
        }
        // glowing vein edge
        x.save(); x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(up ? P.hot : P.vein, 0.35); x.lineWidth = 2.5;
        x.strokeRect(bx, topY, bw, bhh);
        x.restore();
      }
    }
    // heavy erosion + carved cracks (we're close, so texture is coarse)
    K.mottle(x, 0, 0, W, H, base0, 50, K.rng(seed + 11), 'multiply');
    x.strokeStyle = K.rgba(P.shadow, 0.35); x.lineWidth = 2;
    for (let c = 0; c < 7; c++) {
      const cy = noise.fbm(c * 4, seed, 2) * H;
      x.beginPath(); x.moveTo(-20, cy);
      for (let xx = 0; xx < W + 20; xx += 24) x.lineTo(xx, cy + noise.fbm(xx / 50, c + seed, 3) * H * 0.18);
      x.stroke();
    }
    // raking light gradient
    if (p.light !== 'Overcast') {
      x.save(); x.globalCompositeOperation = 'lighter';
      const g = x.createLinearGradient(p.sunDir < 0 ? 0 : W, 0, p.sunDir < 0 ? W : 0, 0);
      g.addColorStop(0, K.rgba(K.mix(P.rock0, '#fff', 0.5), 0.14));
      g.addColorStop(1, K.rgba(P.rock0, 0));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.restore();
    }
  }

  function drawBadlands(x, P, p, W, H, noise, seed, r, sunStr) {
    // WIDE panorama of many eroded data-buttes rising FROM a continuous receding
    // desert floor into haze. tiny scale, deep atmospheric perspective. Buttes
    // sit on ground lines and overlap front-to-back so the depth reads.
    const horizon = H * (0.34 + r() * 0.08);
    paintSky(x, P, W, H, horizon * 1.04, p.light);
    sunGlow(x, P, W * (p.sunDir < 0 ? 0.25 : 0.75), horizon * 0.5, W * 0.55, sunStr);
    // continuous desert floor receding to the horizon (atmospheric fade)
    const fg = x.createLinearGradient(0, horizon, 0, H);
    fg.addColorStop(0, K.mix(K.mix(P.sky, P.rock0, 0.5), P.rock1, 0.3));   // hazy far ground
    fg.addColorStop(0.35, K.mix(P.rock1, P.rock0, 0.2));
    fg.addColorStop(1, K.mix(P.rock1, P.shadow, 0.4));                      // near ground, darker
    x.fillStyle = fg; x.fillRect(0, horizon, W, H);

    // build buttes back-to-front so nearer ones occlude farther ones.
    const buttes = [];
    const rows = 5;
    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const depth = rIdx / (rows - 1);                 // 0 far .. 1 near
      // ground line for this depth band (perspective compression)
      const baseY = horizon + (H - horizon) * (depth * depth * 0.92 + 0.05);
      const count = rIdx < 2 ? 6 : (5 - rIdx) + 2;     // many small far, few big near
      for (let i = 0; i < count; i++) {
        const jitter = noise.fbm(i * 3.7 + rIdx * 11, seed, 2);
        const bx = W * ((i + 0.5) / count) + (jitter - 0.5) * W * (0.14 + depth * 0.1);
        const groundY = baseY + (noise.fbm(i * 2 + rIdx, seed, 2) - 0.5) * (H - horizon) * 0.04;
        const bw = W * (0.022 + depth * 0.075) * (0.7 + jitter * 0.8);
        const bhh = H * (0.08 + depth * 0.4) * (0.6 + noise.fbm(i * 5 + rIdx, seed, 2) * 0.9);
        buttes.push({ depth, bx, groundY, bw, bhh, i });
      }
    }
    for (const bt of buttes) {
      const { depth, bx, groundY, bw, bhh, i } = bt;
      const haze = 1 - depth;
      const top = groundY - bhh;
      const sN = Math.max(3, Math.round(4 + depth * 7));
      // eroded, FLAT-topped mesa silhouette (sharper than before, vertical sides)
      const edge = (yy, side) => {
        const tt = (yy - top) / bhh;
        const taper = bw * (0.5 - tt * 0.04);
        return bx + side * taper + side * (noise.fbm(yy / 9, side * 9 + i, 3) - 0.3) * bw * 0.22;
      };
      x.save();
      x.beginPath();
      x.moveTo(edge(top, -1), top); x.lineTo(edge(top, 1), top);
      for (let yy = top; yy <= groundY; yy += Math.max(3, bhh / 24)) x.lineTo(edge(yy, 1), yy);
      for (let yy = groundY; yy >= top; yy -= Math.max(3, bhh / 24)) x.lineTo(edge(yy, -1), yy);
      x.closePath(); x.clip();
      for (let s = 0; s < sN; s++) {
        const sy0 = top + bhh * (s / sN), sy1 = top + bhh * ((s + 1) / sN);
        const tone = (s % 3 === 0) ? P.rock0 : (s % 3 === 1) ? P.rock1 : P.rock2;
        let base = K.mix(tone, P.rock2, depth * 0.15);
        base = K.mix(base, K.mix(P.sky, P.rock0, 0.55), haze * 0.42);     // atmospheric fade (kept solid)
        const g = x.createLinearGradient(0, sy0, 0, sy1);
        g.addColorStop(0, K.mix(base, P.rock0, 0.18 * (1 - haze)));
        g.addColorStop(1, K.mix(base, P.shadow, 0.42 * (1 - haze * 0.6)));
        x.fillStyle = g; x.fillRect(bx - bw, sy0, bw * 2, sy1 - sy0 + 1);
        // data lines on nearer buttes
        if (depth > 0.5 && s % 2 === 0) {
          x.strokeStyle = K.rgba(K.mix(base, s % 4 ? P.vein : P.hot, 0.5), 0.32 * depth);
          x.lineWidth = 1; x.beginPath(); x.moveTo(bx - bw, sy0); x.lineTo(bx + bw, sy0); x.stroke();
        }
      }
      // lit / shadow flanks for form
      const lg = x.createLinearGradient(bx - bw, 0, bx + bw, 0);
      const litSide = p.sunDir < 0 ? 0 : 1;
      lg.addColorStop(litSide ? 0 : 1, K.rgba(P.shadow, 0.4 * (1 - haze * 0.7)));
      lg.addColorStop(0.5, K.rgba(P.shadow, 0));
      lg.addColorStop(litSide ? 1 : 0, K.rgba(K.mix(P.rock0, '#fff', 0.3), 0.18 * (1 - haze)));
      x.fillStyle = lg; x.fillRect(bx - bw, top, bw * 2, bhh);
      x.restore();
      // contact shadow — a soft tight shadow RIGHT under the base, fading down,
      // so the butte reads as planted (no detached UFO pool).
      x.save(); x.globalCompositeOperation = 'multiply';
      const cs = x.createLinearGradient(0, groundY - bhh * 0.04, 0, groundY + bw * 0.5);
      cs.addColorStop(0, K.rgba(P.shadow, 0.6 * (1 - haze * 0.4)));
      cs.addColorStop(1, K.rgba(P.shadow, 0));
      x.fillStyle = cs;
      x.fillRect(bx - bw * 1.1, groundY - bhh * 0.06, bw * 2.2, bw * 0.6 + bhh * 0.06);
      // a short cast shadow stretching to the dark side along the ground
      const dir = -p.sunDir;
      const sg = x.createLinearGradient(bx, groundY, bx + dir * bw * 1.8, groundY);
      sg.addColorStop(0, K.rgba(P.shadow, 0.45 * (1 - haze * 0.5)));
      sg.addColorStop(1, K.rgba(P.shadow, 0));
      x.fillStyle = sg;
      x.fillRect(Math.min(bx, bx + dir * bw * 1.8), groundY, bw * 1.8, Math.max(3, bw * 0.22));
      x.restore();
      // faint data-vein glint along the flat top of nearer buttes (a hint of
      // glow, NOT a lamp — keep it reading as rock).
      if (depth > 0.6) {
        x.save(); x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(noise.fbm(i, seed, 2) > 0.5 ? P.hot : P.vein, 0.4 * depth);
        x.lineWidth = Math.max(1, bw * 0.06);
        x.beginPath(); x.moveTo(edge(top + 1, -1), top + 1); x.lineTo(edge(top + 1, 1), top + 1); x.stroke();
        K.bloom(x, bx, top, bw * 0.7, noise.fbm(i, seed, 2) > 0.5 ? P.hot : P.vein, 0.1 * depth);
        x.restore();
      }
    }
  }

  // ───────────────────────────── entry ─────────────────────────────

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const overcast = p.light === 'Overcast';
    const slot = p.light === 'Slot Light';
    const dusk = p.light === 'Raking Dusk';
    const sunStr = overcast ? 0.4 : slot ? 1.0 : dusk ? 0.85 : 0.7;

    // base wash so no layout leaves bare canvas
    x.fillStyle = K.mix(P.shadow, P.rock2, 0.3); x.fillRect(0, 0, W, H);

    switch (p.layout) {
      case 'Gorge':    drawGorge(x, P, p, W, H, noise, seed, r, sunStr); break;
      case 'Wall':     drawWall(x, P, p, W, H, noise, seed, r); break;
      case 'River':    drawRiver(x, P, p, W, H, noise, seed, r, sunStr); break;
      case 'Mesa':     drawMesa(x, P, p, W, H, noise, seed, r, sunStr); break;
      case 'Macro':    drawMacro(x, P, p, W, H, noise, seed, r); break;
      case 'Badlands': drawBadlands(x, P, p, W, H, noise, seed, r, sunStr); break;
    }

    atmosphere(x, P, W, H, noise, r, p.light);
    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'orderbook', draw, traits };
})();
