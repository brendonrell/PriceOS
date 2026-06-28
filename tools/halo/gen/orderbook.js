/* ORDERBOOK — a deep eroded canyon whose rock strata ARE frozen market data.
 * Horizontal sandstone bands built from price-ladders, candlestick columns and
 * order-book depth, weathered and wind-carved; a gorge cut down through them
 * with raking sun-shafts; a glowing ticker "river" running at the very bottom.
 * Surreal: the canyon is literally made of charts — geology and data fused.
 * On-brand for a price platform.
 * PALETTE: CANYON DATA — terracotta rock / cyan + chartreuse data veins /
 * dusty-violet shadow. Warm stone, cool glowing data. */
window.ENGINE = (function () {
  const K = window.KIT;

  // rock0 = bright sunlit stone, rock1 = mid stone, rock2 = shadow stone;
  // vein = glowing data line tone, hot = chartreuse/cyan ticker; sky = haze band;
  // shadow = gorge depth.
  const PALS = [
    { name: 'Canyon Data',  sky: '#4a2f4a', rock0: '#e08a4a', rock1: '#c2693c', rock2: '#7a3a3e', vein: '#2ec8e0', hot: '#b6e028', shadow: '#1e0e1c' },
    { name: 'Oxide Run',    sky: '#3a2240', rock0: '#ff9a52', rock1: '#d2622e', rock2: '#6e2c34', vein: '#34d8c8', hot: '#d6e84a', shadow: '#1a0a16' },
    { name: 'Cyan Strata',  sky: '#243a52', rock0: '#d88a5a', rock1: '#b06038', rock2: '#5a3450', vein: '#2ad4ff', hot: '#9be030', shadow: '#100c20' },
    { name: 'Chartreuse Bed',sky: '#3e3a28', rock0: '#e89a44', rock1: '#bc6e2e', rock2: '#6e4a30', vein: '#7ce0c0', hot: '#c8ff28', shadow: '#181208' },
    { name: 'Violet Gorge', sky: '#3a2658', rock0: '#d27a5e', rock1: '#a85240', rock2: '#5e2c54', vein: '#46c6ff', hot: '#b0e84a', shadow: '#140a22' },
    { name: 'Ember Mesa',   sky: '#4e2438', rock0: '#ff8a44', rock1: '#d4582a', rock2: '#7a3030', vein: '#28ccd8', hot: '#e0e83a', shadow: '#1c0810' },
  ];
  const FMTS = [
    { W: 1480, H: 1180, t: 'Wide' },
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1180, H: 1440, t: 'Deep' },
  ];
  const LIGHTS = ['High Sun', 'Raking Dusk', 'Slot Canyon', 'Overcast'];
  const READS = ['Candle Stone', 'Ladder Beds', 'Depth Folds'];

  function params(r) {
    const gorgeX = 0.30 + r() * 0.40;
    return {
      pal: K.pick(PALS, r),
      fmt: K.pick(FMTS, r),
      light: K.pick(LIGHTS, r),
      read: K.pick(READS, r),
      gorgeX,
      gorgeW: 0.16 + r() * 0.20,       // gorge slot width near top
      strata: K.rint(r, 9, 15),
      sunDir: r() < 0.5 ? -1 : 1,      // sun rakes from left or right
      fold: 0.4 + r() * 0.7,           // how much the strata fold/undulate
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Light: p.light, Reads: p.read, Strata: p.strata };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const slot = p.light === 'Slot Canyon';
    const dusk = p.light === 'Raking Dusk';
    const overcast = p.light === 'Overcast';
    const sunStr = overcast ? 0.4 : slot ? 1.0 : dusk ? 0.85 : 0.7;

    // ── 1. sky haze band at the very top (dusty), rock fills the rest ──
    const skyH = H * (0.10 + r() * 0.06);
    const sg = x.createLinearGradient(0, 0, 0, skyH);
    sg.addColorStop(0, K.mix(P.sky, '#000', 0.25));
    sg.addColorStop(1, K.mix(P.sky, P.rock0, 0.4));
    x.fillStyle = sg; x.fillRect(0, 0, W, skyH);

    // gorge geometry: a slot at top widening into a deep V going down, drifting
    // sideways (a meander). cx(y) = centre of the gorge at height y; hw(y) = half
    // width. The gorge bottom is the glowing ticker river.
    const gx0 = p.gorgeX * W;
    function gorgeC(yy) {
      const t = (yy - skyH) / (H - skyH); // 0 top .. 1 bottom
      return gx0 + Math.sin(t * 2.4 + seed) * W * 0.06 * p.fold + (noise.fbm(t * 3, seed, 2)) * W * 0.04;
    }
    function gorgeHW(yy) {
      const t = K.clamp((yy - skyH) / (H - skyH), 0, 1);
      // widens with depth then the very bottom is the river slot
      const base = p.gorgeW * W * (0.5 + t * 1.4);
      const ragged = 1 + noise.fbm(yy / 40, seed * 2, 3) * 0.18;
      return base * ragged;
    }

    // ── 2. STRATA: horizontal data-rock bands filling the frame. Each band has a
    // base rock tone + embedded data micro-texture (candles / ladders / depth).
    const N = p.strata;
    // precompute band boundaries (undulating, geologically folded)
    const bounds = [skyH];
    for (let i = 1; i < N; i++) bounds.push(skyH + (H - skyH) * (i / N));
    bounds.push(H);

    for (let b = 0; b < N; b++) {
      const yTop = bounds[b], yBot = bounds[b + 1];
      const bh = yBot - yTop;
      // depth tone: alternate + fade. mix of rock tones by index + noise
      const tone = (b % 3 === 0) ? P.rock0 : (b % 3 === 1) ? P.rock1 : P.rock2;
      const base = K.mix(tone, P.rock2, (b / N) * 0.3);
      // band fill with a folded top edge
      x.save();
      x.beginPath();
      x.moveTo(0, yTop);
      for (let xx = 0; xx <= W; xx += Math.max(6, W / 160)) {
        const fold = Math.sin(xx / W * Math.PI * (1 + p.fold) + b) * bh * 0.18 * p.fold
          + noise.fbm(xx / 120, b * 7, 3) * bh * 0.3;
        x.lineTo(xx, yTop + fold);
      }
      x.lineTo(W, yBot + bh); x.lineTo(0, yBot + bh); x.closePath();
      x.clip();
      // base fill
      const bg = x.createLinearGradient(0, yTop, 0, yBot);
      bg.addColorStop(0, K.mix(base, P.rock0, 0.18));   // lit top lip of each layer
      bg.addColorStop(0.18, base);
      bg.addColorStop(1, K.mix(base, P.shadow, 0.45));   // shadowed underside
      x.fillStyle = bg; x.fillRect(0, yTop - bh, W, bh * 3);

      // embedded DATA micro-texture — the layer IS a chart
      const dataCol = K.mix(base, b % 2 ? P.vein : P.hot, 0.5);
      const lit = K.mix(base, '#fff', 0.3);
      if (p.read === 'Candle Stone' || (p.read === 'Depth Folds' && b % 2 === 0)) {
        // candlestick columns embedded in the stone
        const cw = Math.max(3, W / (60 + (seed % 30)));
        for (let cx = 0; cx < W; cx += cw * 1.5) {
          const open = yTop + bh * (0.2 + noise.fbm(cx / 50, b, 2) * 0.3 + 0.3);
          const close = yTop + bh * (0.2 + noise.fbm(cx / 50 + 9, b, 2) * 0.3 + 0.3);
          const hi = Math.min(open, close) - bh * (0.1 + r() * 0.18);
          const loo = Math.max(open, close) + bh * (0.1 + r() * 0.18);
          const up = close < open;
          // wick
          x.strokeStyle = K.rgba(K.mix(dataCol, P.shadow, 0.3), 0.5);
          x.lineWidth = Math.max(0.6, cw * 0.12);
          x.beginPath(); x.moveTo(cx + cw * 0.5, hi); x.lineTo(cx + cw * 0.5, loo); x.stroke();
          // body — carved relief: lit top edge, dark bottom
          x.fillStyle = K.rgba(up ? K.mix(dataCol, lit, 0.3) : K.mix(base, P.shadow, 0.5), 0.55);
          x.fillRect(cx + cw * 0.15, Math.min(open, close), cw * 0.7, Math.abs(close - open) + 1);
        }
      } else {
        // price-ladder rungs: horizontal lines with little depth bars
        const rows = Math.max(3, Math.floor(bh / 14));
        for (let rr = 0; rr < rows; rr++) {
          const ry = yTop + bh * (rr / rows) + noise.fbm(rr, b, 2) * 3;
          x.strokeStyle = K.rgba(K.mix(base, rr % 4 === 0 ? dataCol : P.shadow, rr % 4 === 0 ? 0.5 : 0.3), 0.35);
          x.lineWidth = rr % 4 === 0 ? 1.4 : 0.7;
          x.beginPath(); x.moveTo(0, ry); x.lineTo(W, ry); x.stroke();
          // depth bars (order-book) sticking out from a vertical axis
          if (rr % 2 === 0) {
            const axis = ((b * 37 + rr * 13) % 100) / 100 * W;
            const len = (noise.fbm(rr * 3, b, 2) * 0.5 + 0.5) * W * 0.12;
            const side = rr % 4 === 0 ? 1 : -1;
            x.fillStyle = K.rgba(K.mix(dataCol, base, 0.4), 0.3);
            x.fillRect(side > 0 ? axis : axis - len, ry - 2, len, 4);
          }
        }
      }
      // erosion: dark fbm mottle + a few wind-carved cracks
      K.mottle(x, 0, yTop, W, bh, base, 90, K.rng(seed + b * 5), 'multiply');
      x.strokeStyle = K.rgba(P.shadow, 0.4); x.lineWidth = 1;
      for (let c = 0; c < 3; c++) {
        const cy = yTop + r() * bh;
        x.beginPath(); x.moveTo(0, cy);
        for (let xx = 0; xx < W; xx += 30) x.lineTo(xx, cy + noise.fbm(xx / 60, c + b, 2) * bh * 0.4);
        x.stroke();
      }
      x.restore();
    }

    // ── 3. THE GORGE: carve a dark hazy slot down through the strata (the cut) ──
    x.save();
    x.beginPath();
    x.moveTo(gorgeC(skyH) - gorgeHW(skyH), skyH);
    for (let yy = skyH; yy <= H; yy += 8) x.lineTo(gorgeC(yy) - gorgeHW(yy), yy);
    for (let yy = H; yy >= skyH; yy -= 8) x.lineTo(gorgeC(yy) + gorgeHW(yy), yy);
    x.closePath();
    x.clip();
    // gorge depth fill — receding haze, darker deep
    const dg = x.createLinearGradient(0, skyH, 0, H);
    dg.addColorStop(0, K.rgba(K.mix(P.shadow, P.sky, 0.4), 0.7));
    dg.addColorStop(0.5, K.rgba(P.shadow, 0.82));
    dg.addColorStop(1, K.rgba(K.mix(P.shadow, '#000', 0.3), 0.92));
    x.fillStyle = dg; x.fillRect(0, skyH, W, H);
    // far canyon wall inside the gorge (a hazy lit strip on the back wall)
    for (let i = 0; i < 5; i++) {
      const wy = skyH + (H - skyH) * (i / 5);
      x.fillStyle = K.rgba(K.mix(P.rock1, P.shadow, 0.5), 0.18);
      x.fillRect(gorgeC(wy) - gorgeHW(wy) * 0.4, wy, gorgeHW(wy) * 0.8, (H - skyH) / 5);
    }
    x.restore();

    // ── 4. SUN-SHAFTS raking into the gorge from one upper corner ──
    if (!overcast) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const sx = p.sunDir < 0 ? W * 0.05 : W * 0.95;
      const sy = skyH * 0.4;
      const nb = slot ? 5 : 3;
      for (let i = 0; i < nb; i++) {
        const ang = (p.sunDir < 0 ? 0.6 : Math.PI - 0.6) + (i - nb / 2) * 0.06;
        const len = H * 1.2;
        const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
        const wB = W * (0.02 + r() * 0.04);
        const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
        const grd = x.createLinearGradient(sx, sy, ex, ey);
        grd.addColorStop(0, K.rgba(K.mix(P.rock0, '#fff', 0.4), 0.14 * sunStr));
        grd.addColorStop(1, K.rgba(P.rock0, 0));
        x.fillStyle = grd;
        x.beginPath();
        x.moveTo(sx, sy);
        x.lineTo(ex + px * wB, ey + py * wB);
        x.lineTo(ex - px * wB, ey - py * wB);
        x.closePath(); x.fill();
      }
      x.restore();
    }

    // ── 5. THE TICKER RIVER — a glowing data stream running along the gorge floor.
    // Tiny candles + a bright running line of light at the very bottom of the cut.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const riverY = H * (0.9 + r() * 0.05);
    const rc = gorgeC(riverY), rhw = gorgeHW(riverY);
    // glowing base bloom
    K.bloom(x, rc, riverY, rhw * 2.4, P.hot, 0.4);
    K.bloom(x, rc, riverY, rhw * 1.2, K.mix(P.hot, '#fff', 0.4), 0.5);
    // a jagged price-line running along the river
    x.strokeStyle = K.rgba(K.mix(P.hot, '#fff', 0.3), 0.9);
    x.lineWidth = Math.max(1.5, H * 0.003);
    x.beginPath();
    let lv = riverY;
    for (let xx = rc - rhw; xx <= rc + rhw; xx += 6) {
      lv = riverY + noise.fbm(xx / 18, seed * 3, 2) * rhw * 0.5;
      if (xx === rc - rhw) x.moveTo(xx, lv); else x.lineTo(xx, lv);
    }
    x.stroke();
    // little luminous candles standing in the river
    for (let i = 0; i < 26; i++) {
      const cx = rc - rhw + (i / 26) * rhw * 2;
      const ch = rhw * (0.2 + noise.fbm(i, seed, 2) * 0.5 + 0.3);
      const col = i % 3 === 0 ? P.vein : P.hot;
      x.fillStyle = K.rgba(col, 0.5);
      x.fillRect(cx, riverY - ch, Math.max(1.5, rhw * 0.04), ch);
    }
    // cyan data-veins glowing up the near gorge walls
    for (let i = 0; i < 8; i++) {
      const wy = skyH + (riverY - skyH) * (i / 8);
      x.strokeStyle = K.rgba(P.vein, 0.10 + r() * 0.1);
      x.lineWidth = 1;
      const side = r() < 0.5 ? -1 : 1;
      x.beginPath();
      x.moveTo(gorgeC(wy) + side * gorgeHW(wy), wy);
      x.lineTo(gorgeC(riverY) + side * gorgeHW(riverY) * 0.5, riverY);
      x.stroke();
    }
    x.restore();

    // ── 6. ATMOSPHERE: dust haze in the gorge, overall wash, grain, vignette ──
    K.hazeSheet(x, W, H, noise, K.mix(P.sky, P.rock0, 0.4), overcast ? 0.18 : 0.12, 300, 'screen');
    // warm dust catching light near the top
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 80; i++) {
      const dx = r() * W, dy = skyH + r() * H * 0.5;
      x.fillStyle = K.rgba(K.mix(P.rock0, '#fff', r()), 0.04 + r() * 0.1);
      x.fillRect(dx, dy, 0.8, 0.8);
    }
    x.restore();
    K.grain(x, W, H, 420, r);
    K.vignette(x, W, H, 0.5);
    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 'orderbook', draw, traits };
})();
