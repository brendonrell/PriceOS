/* DRIFT — a floating sky-archipelago.
 * A vast hazy sky holds many broken landmasses at different depths: chunks of
 * terrain with undersides of root/rock, thin waterfalls pouring off into the
 * void and dissolving to mist, a few far luminous structures perched on distant
 * isles, drifting flocks/particles between them. Strong atmospheric depth — near
 * isles crisp + saturated, far isles fade into colored haze. Painterly, bold,
 * immense. "Real but off." NOT literal fantasy illustration, NOT cyberpunk. */
window.ENGINE = (function () {
  const K = window.KIT;

  // sky1=zenith, sky2=mid sky, sky3=lower void; haze=atmos wash;
  // top=isle grass/top face, rock=stone underside, accent=structures/light;
  // fall=waterfall water; ink=deepest shadow.
  // DRIFT owns the SKY-BLUE + CYAN/AQUA territory: cerulean, teal, turquoise,
  // pale dawn-blue. Warm gold/coral lives ONLY in `accent` (structure beacons).
  // sky3 = lower-sky/void glow, kept blue-cyan so it never reads warm-dominant.
  const PALS = [
    { name: 'Cyan Deep Blue',  sky1: '#04122e', sky2: '#0b3a6b', sky3: '#1b86c4', haze: '#7fd6ff', top: '#2fb6c9', rock: '#0c2444', accent: '#ffe6a8', fall: '#9af2ff', ink: '#020a1c' },
    { name: 'Cerulean Falls',  sky1: '#072543', sky2: '#1267a8', sky3: '#3aa6d6', haze: '#a6e4ff', top: '#36c6c0', rock: '#10314f', accent: '#ffd98a', fall: '#bdf4ff', ink: '#04101f' },
    { name: 'Dawn Aqua',       sky1: '#16395c', sky2: '#3f86b0', sky3: '#9fd0e0', haze: '#d6f0ff', top: '#49cdc0', rock: '#1d4566', accent: '#ffcf86', fall: '#cdf6ff', ink: '#0a2238' },
    { name: 'Turquoise Void',  sky1: '#021c2a', sky2: '#0a5560', sky3: '#16a3a0', haze: '#86f0e8', top: '#2fd6c0', rock: '#063038', accent: '#ffe2a0', fall: '#a8fff4', ink: '#01121a' },
    { name: 'Glacier Teal',    sky1: '#0a2c44', sky2: '#2c7e9e', sky3: '#5fc2cf', haze: '#c2eeff', top: '#5fd6c6', rock: '#143c54', accent: '#ffe6c2', fall: '#d2f8ff', ink: '#062032' },
    { name: 'Cobalt Mist',     sky1: '#040f34', sky2: '#103a86', sky3: '#3a78d6', haze: '#9ec2ff', top: '#36c0d0', rock: '#0a1f4a', accent: '#ffdf9a', fall: '#a6e0ff', ink: '#020726' },
    { name: 'Pale Dawn Blue',  sky1: '#1f4a6e', sky2: '#5298bd', sky3: '#a8d6e6', haze: '#e2f4ff', top: '#62d0c2', rock: '#27506e', accent: '#ffd6a0', fall: '#e0faff', ink: '#10324a' },
    { name: 'Ice Cerulean',    sky1: '#05203e', sky2: '#0e5c9c', sky3: '#2fb0d6', haze: '#b6ecff', top: '#36ccc6', rock: '#0c2c4c', accent: '#ffe8b0', fall: '#c6f6ff', ink: '#031428' },
  ];

  const FMTS = [ { W: 1480, H: 1040, t: 'Vista' }, { W: 1320, H: 1320, t: 'Expanse' }, { W: 1080, H: 1440, t: 'Tower' } ];
  const TIMES = ['Dawn', 'High Haze', 'Dusk', 'Gloaming'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const time = K.pick(TIMES, r);
    const isles = K.rint(r, 7, 11);
    const beacons = r() < 0.7;
    const event = r() < 0.07 ? K.pick(['Great Cascade', 'Twin Suns', 'Inversion'], r) : null;
    return { pal, fmt, time, isles, beacons, event };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = { Palette: p.pal.name, Format: p.fmt.t, Light: p.time, Isles: p.isles >= 9 ? 'Many' : 'Several' };
    if (p.beacons) t.Beacons = 'Lit';
    if (p.event) t.Event = p.event;
    return t;
  }

  /* smooth haze sheet — finer step so it never tiles into a visible grid. */
  function smoothHaze(x, W, H, noise, col, opacity, scale) {
    x.save(); x.globalCompositeOperation = 'screen';
    const step = Math.max(2, Math.floor(Math.min(W, H) / 380));
    const c = K.h2r(col);
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = (noise.fbm(xx / scale, yy / scale, 5, 0.55, 2.1) + 1) / 2;
        const a = K.clamp(n * n * opacity, 0, 1);
        if (a < 0.008) continue;
        x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
        x.fillRect(xx, yy, step + 0.7, step + 0.7);
      }
    }
    x.restore();
  }

  /* ── deep sky gradient + colored void glow ── */
  function sky(x, P, W, H, r) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.sky1);
    g.addColorStop(0.42, K.mix(P.sky1, P.sky2, 0.85));
    g.addColorStop(0.66, P.sky2);
    g.addColorStop(0.86, K.mix(P.sky2, P.sky3, 0.7));
    g.addColorStop(1, K.mix(P.sky3, P.ink, 0.35));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // a low broad glow source (the light behind the haze) — drives bloom on isles
    const lx = W * (0.3 + r() * 0.4), ly = H * (0.78 + r() * 0.14);
    K.bloom(x, lx, ly, Math.max(W, H) * 0.62, P.sky3, 0.42);
    K.bloom(x, lx, ly, Math.max(W, H) * 0.30, P.haze, 0.30);
    return { lx, ly };
  }

  /* one floating island. depth 0=far(hazy,small,desat) .. 1=near(crisp,bold).
     Ragged rock underside + dangling root strands + painterly top.
     returns its footprint for waterfall/structure placement. */
  function island(x, P, W, H, r, noise, cx, cy, scale, depth, light) {
    const haze = 1 - depth;            // how much it dissolves into sky
    const topW = scale * (0.9 + r() * 0.5);
    const topH = topW * (0.15 + r() * 0.09);
    // per-isle top variation within the cyan lane (toward sky-blue or aqua-fall)
    const topHueShift = (r() - 0.5);
    const topBase = K.mix(P.top, topHueShift > 0 ? P.sky2 : P.fall, Math.abs(topHueShift) * 0.45);
    const topCol = K.mix(topBase, P.haze, haze * 0.74);
    const rockCol = K.mix(P.rock, P.haze, haze * 0.62);
    const litTop = K.mix(topCol, P.accent, 0.10 + depth * 0.10);

    // sunlit side: light source is lower-mid, so light comes from below-ish
    const sunDir = Math.sign(light.lx - cx) || 1;

    // ── underside silhouette: irregular, lumpy rock narrowing unevenly ──
    const depthLen = topW * (0.6 + r() * 0.7);
    const segs = 22;
    const ux = [], uy = [];
    const noff = r() * 100;            // per-isle noise offset
    // pick 1-2 deepest root prongs
    const prong1 = 0.32 + r() * 0.16, prong2 = 0.6 + r() * 0.18;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const ex = cx - topW / 2 + topW * t;
      const arch = Math.sin(t * Math.PI);              // overall cone
      // two prong lobes for an organic rooty base
      const lobe = Math.max(0, 1 - Math.abs(t - prong1) * 6) * 0.5
                 + Math.max(0, 1 - Math.abs(t - prong2) * 5) * 0.7;
      const rough = noise.fbm(t * 7 + noff, 3.3, 5) * topH * 1.6;
      const yy = cy + topH * 0.35 + arch * depthLen * (0.55 + lobe) + rough;
      ux.push(ex + noise.fbm(t * 5 + noff, 9.1, 4) * topW * 0.05);
      uy.push(yy);
    }

    x.save();
    x.beginPath();
    x.moveTo(cx - topW / 2, cy);
    // domed, slightly irregular top rim
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, ex = cx - topW / 2 + topW * t;
      const ty = cy - Math.sin(t * Math.PI) * topH * 0.5 + noise.fbm(t * 6 + noff, 0.5, 3) * topH * 0.3;
      x.lineTo(ex, ty);
    }
    for (let i = segs; i >= 0; i--) x.lineTo(ux[i], uy[i]);
    x.closePath();

    // rock body fill — lit near top, plunging to ink at the roots
    const rg = x.createLinearGradient(0, cy - topH, 0, cy + depthLen);
    rg.addColorStop(0, K.mix(rockCol, P.accent, 0.12));
    rg.addColorStop(0.16, rockCol);
    rg.addColorStop(0.55, K.mix(rockCol, P.ink, 0.4 + depth * 0.15));
    rg.addColorStop(1, K.mix(rockCol, P.ink, 0.78 + depth * 0.15));
    x.fillStyle = rg; x.fill();

    // clip to body for all rock detail
    x.save(); x.clip();
    // directional light wash on the sun side of the rock
    x.globalCompositeOperation = 'lighter';
    const lg = x.createLinearGradient(cx - sunDir * topW * 0.6, 0, cx + sunDir * topW * 0.6, 0);
    lg.addColorStop(0, K.rgba(P.haze, 0.0));
    lg.addColorStop(1, K.rgba(K.mix(P.sky3, P.accent, 0.4), 0.10 + depth * 0.16));
    x.fillStyle = lg; x.fillRect(cx - topW, cy - topH, topW * 2, depthLen + topH);
    x.globalCompositeOperation = 'source-over';
    // mottled rock texture
    if (depth > 0.28) {
      K.mottle(x, cx - topW, cy - topH, topW * 2, depthLen + topH * 2, rockCol, 55 - depth * 18, r, 'overlay');
      // vertical erosion striations following the cone
      x.globalCompositeOperation = 'multiply';
      const strs = K.rint(r, 5, 10);
      for (let s = 0; s < strs; s++) {
        const sx0 = cx - topW * 0.4 + r() * topW * 0.8;
        x.strokeStyle = K.rgba(P.ink, 0.10 + r() * 0.12); x.lineWidth = 1 + r() * 2.5;
        x.beginPath();
        for (let yy = cy; yy <= cy + depthLen; yy += 12) {
          const t = (yy - cy) / depthLen;
          const xx = sx0 + (cx - sx0) * t * 0.8 + noise.fbm(yy / 50, s * 3 + noff, 3) * 6;
          yy === cy ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
        }
        x.stroke();
      }
    }
    x.restore();
    x.restore();

    // ── dangling root / rock spike strands hanging below ──
    if (depth > 0.2) {
      x.save();
      const roots = K.rint(r, 3, 7);
      for (let rt = 0; rt < roots; rt++) {
        const t = 0.25 + r() * 0.5;
        const baseX = cx - topW / 2 + topW * t;
        const baseY = cy + topH * 0.35 + Math.sin(t * Math.PI) * depthLen * 0.55;
        const rlen = depthLen * (0.18 + r() * 0.5);
        const w0 = (1.5 + r() * 3) * (0.5 + depth);
        x.beginPath();
        x.moveTo(baseX - w0, baseY);
        const ex = baseX + (r() - 0.5) * topW * 0.12;
        const ey = baseY + rlen;
        x.quadraticCurveTo(baseX + (r() - 0.5) * 14, baseY + rlen * 0.6, ex, ey);
        x.quadraticCurveTo(baseX + (r() - 0.5) * 14, baseY + rlen * 0.6, baseX + w0, baseY);
        x.closePath();
        x.fillStyle = K.mix(rockCol, P.ink, 0.6);
        x.fill();
      }
      x.restore();
    }

    // ── top face: painterly lit cap ──
    x.save();
    const tg = x.createLinearGradient(cx - sunDir * topW * 0.5, cy, cx + sunDir * topW * 0.5, cy);
    tg.addColorStop(0, K.mix(topCol, P.ink, 0.22));
    tg.addColorStop(0.5, topCol);
    tg.addColorStop(1, K.mix(litTop, P.accent, 0.22));
    x.fillStyle = tg;
    x.beginPath();
    x.ellipse(cx, cy - topH * 0.05, topW / 2, topH * 0.6, 0, 0, Math.PI * 2);
    x.fill();
    // painterly dabs of foliage/terrain on nearer isles
    if (depth > 0.4) {
      x.save();
      x.beginPath(); x.ellipse(cx, cy - topH * 0.05, topW / 2, topH * 0.6, 0, 0, Math.PI * 2); x.clip();
      for (let d = 0; d < topW * 0.4; d++) {
        const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * topW * 0.48;
        const dx = cx + Math.cos(a) * rr, dy = cy - topH * 0.05 + Math.sin(a) * rr * (topH * 0.6 / (topW / 2));
        const dab = r() < 0.5 ? K.mix(topCol, P.ink, 0.3) : K.mix(litTop, P.accent, 0.4);
        x.fillStyle = K.rgba(dab, 0.06 + r() * 0.12);
        x.beginPath(); x.arc(dx, dy, 1 + r() * 3, 0, Math.PI * 2); x.fill();
      }
      x.restore();
    }
    // sun-side rim light
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.accent, 0.14 + depth * 0.24);
    x.lineWidth = 2 + depth * 2.5;
    x.beginPath();
    x.ellipse(cx, cy - topH * 0.05, topW / 2, topH * 0.6, 0, sunDir > 0 ? -0.2 : Math.PI - 0.2, sunDir > 0 ? Math.PI * 0.85 : Math.PI * 1.85);
    x.stroke();
    x.restore();

    // contact AO under the top cap onto the rock
    K.softShadow(x, cx, cy + topH * 0.4, topW * 0.5, 0.16 + depth * 0.12);

    return { cx, cy, topW, topH, depthLen, depth, haze, rockCol, bottomY: Math.max(...uy) };
  }

  /* thin waterfall pouring off an isle edge, dissolving to mist at the void.
     A bright cohesive ribbon at the lip → spreading → fading into a mist plume. */
  function waterfall(x, P, W, H, r, noise, isle, light) {
    const startX = isle.cx + (r() - 0.5) * isle.topW * 0.55;
    const startY = isle.cy + isle.topH * 0.25;
    const len = (H - startY) * (0.4 + r() * 0.5);
    const endY = startY + len;
    const wbase = (3 + r() * 5) * (0.55 + isle.depth);
    const fallCol = K.mix(P.fall, '#ffffff', 0.18);
    const wander = r() * 100;
    x.save();
    x.globalCompositeOperation = 'lighter';
    // soft wide veil behind the ribbon (the body of falling water)
    {
      x.beginPath();
      const pts = [];
      for (let yy = startY; yy <= endY; yy += 8) {
        const t = (yy - startY) / len;
        const sway = noise.fbm(yy / 70, wander, 3) * 14 + Math.sin(yy / 90) * 6 * t;
        const half = wbase * (0.5 + t * 1.1);
        pts.push([startX + sway, yy, half]);
      }
      x.moveTo(pts[0][0] - pts[0][2], pts[0][1]);
      for (const [px, py, ph] of pts) x.lineTo(px + ph, py);
      for (let i = pts.length - 1; i >= 0; i--) x.lineTo(pts[i][0] - pts[i][2], pts[i][1]);
      x.closePath();
      const vg = x.createLinearGradient(0, startY, 0, endY);
      vg.addColorStop(0, K.rgba(fallCol, (0.16 + r() * 0.08) * (0.5 + isle.depth)));
      vg.addColorStop(0.7, K.rgba(K.mix(fallCol, P.haze, 0.4), 0.08 * (0.5 + isle.depth)));
      vg.addColorStop(1, K.rgba(fallCol, 0));
      x.fillStyle = vg; x.fill();
    }
    // bright thread strands inside the veil
    const cols = Math.max(3, Math.round(wbase));
    for (let s = 0; s < cols; s++) {
      x.beginPath();
      for (let yy = startY; yy <= endY; yy += 5) {
        const t = (yy - startY) / len;
        const sway = noise.fbm(yy / 60, s * 4 + wander, 3) * 10 + Math.sin(yy / 70 + s) * (2 + t * 8);
        const xx = startX + (s - cols / 2) * 1.6 + sway;
        yy === startY ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
      }
      const a = (0.14 + r() * 0.14) * (0.5 + isle.depth * 0.7) * (1 - 0.35);
      x.strokeStyle = K.rgba(fallCol, a);
      x.lineWidth = (0.8 + r() * 1.4);
      x.lineCap = 'round';
      x.stroke();
    }
    x.restore();
    // bright lip where water leaves the isle
    K.sheen(x, startX, startY, wbase * 5, K.mix(P.fall, '#ffffff', 0.5), 0.3 * (0.4 + isle.depth));
    // mist plume at the bottom where it dissolves into the void — soft,
    // vertically stretched, low-opacity so it reads as vapor not an orb.
    const mistCol = K.mix(fallCol, P.haze, 0.55);
    const plumeX = startX + noise.fbm((startY + len) / 70, wander, 3) * 14;
    const mistN = K.rint(r, 10, 18);
    for (let m = 0; m < mistN; m++) {
      const mt = 0.62 + r() * 0.5;
      const my = startY + len * mt;
      const mx = plumeX + (r() - 0.5) * (24 + (mt - 0.6) * 60);
      const mr = (16 + r() * 44) * (0.6 + isle.depth);
      x.save();
      x.globalCompositeOperation = 'lighter';
      // vertically squashed radial = wispy vapor, not a round bulb
      const g = x.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, K.rgba(mistCol, (0.04 + r() * 0.045) * (0.5 + isle.depth)));
      g.addColorStop(1, K.rgba(mistCol, 0));
      x.translate(mx, my); x.scale(1, 1.5); x.translate(-mx, -my);
      x.fillStyle = g; x.fillRect(mx - mr, my - mr * 1.5, mr * 2, mr * 3);
      x.restore();
    }
  }

  /* far luminous structures perched on an isle top — slender dark monoliths,
     silhouetted against the sky, with a small WARM beacon glow at the tip
     (the only warm accent in the piece). Abstract, not literal buildings. */
  function structures(x, P, r, noise, isle, light, lit) {
    const n = K.rint(r, 2, 5);
    const baseY = isle.cy - isle.topH * 0.4;
    // cluster them toward one side of the top for a "settlement" feel
    const clusterX = isle.cx + (r() - 0.5) * isle.topW * 0.4;
    const sil = K.mix(P.rock, P.ink, 0.55 + isle.haze * 0.2);   // dark silhouette
    const silHaze = K.mix(sil, P.haze, isle.haze * 0.6);
    for (let i = 0; i < n; i++) {
      const sx = clusterX + (r() - 0.5) * isle.topW * 0.5;
      const w = isle.topW * (0.03 + r() * 0.05);
      // height capped so spires read as structures, not hairs / off-canvas needles
      const h = Math.min(isle.topW * 1.0, isle.topW * (0.2 + r() * 0.4) * (0.6 + isle.depth));
      const lean = (r() - 0.5) * 0.05;
      x.save();
      x.translate(sx, baseY); x.rotate(lean);
      // tapered tower silhouette with a needle finial
      const shoulder = h * (0.6 + r() * 0.2);
      x.beginPath();
      x.moveTo(-w / 2, 0);
      x.lineTo(-w * 0.4, -shoulder);
      x.lineTo(-w * 0.16, -h);
      x.lineTo(0, -h - w * 1.3);          // finial tip
      x.lineTo(w * 0.16, -h);
      x.lineTo(w * 0.4, -shoulder);
      x.lineTo(w / 2, 0);
      x.closePath();
      // faint sky-side edge light so it doesn't read flat black
      const g = x.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, silHaze);
      g.addColorStop(0.5, K.mix(sil, P.ink, 0.3));
      g.addColorStop(1, K.mix(silHaze, P.sky3, 0.3));
      x.fillStyle = g; x.fill();
      x.restore();
      const tipX = sx + Math.sin(lean) * -(h + w * 1.3);
      const tipY = baseY - h - w * 1.3;
      // warm beacon glow at the tip — small, the sole warm note, but luminous
      if (lit && r() < 0.8) {
        K.bloom(x, tipX, tipY, w * (7 + isle.depth * 8), P.accent, 0.34 * (0.55 + isle.depth));
        K.bloom(x, tipX, tipY, w * (3 + isle.depth * 3), K.mix(P.accent, '#fff', 0.4), 0.4 * (0.55 + isle.depth));
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(K.mix(P.accent, '#fff', 0.6), 0.95);
        x.beginPath(); x.arc(tipX, tipY, 1.4 + isle.depth * 2, 0, Math.PI * 2); x.fill();
        x.restore();
      }
    }
  }

  /* drifting flock between isles — tiny silhouetted curves, sized by depth. */
  function flock(x, P, W, H, r, n, depth, cx, cy, spread) {
    x.save();
    x.globalCompositeOperation = depth > 0.5 ? 'source-over' : 'screen';
    for (let i = 0; i < n; i++) {
      const bx = cx + (r() - 0.5) * spread;
      const by = cy + (r() - 0.5) * spread * 0.5;
      const s = (1.6 + r() * 3) * (0.4 + depth);
      x.strokeStyle = K.rgba(depth > 0.5 ? P.ink : P.haze, 0.3 + depth * 0.4);
      x.lineWidth = 0.8 + depth;
      x.beginPath();
      x.moveTo(bx - s, by);
      x.quadraticCurveTo(bx, by - s * 0.7, bx + s * 0.1, by);
      x.quadraticCurveTo(bx + s * 0.2, by - s * 0.7, bx + s * 1.2, by);
      x.stroke();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    const light = sky(x, P, W, H, r);

    // back haze sheet behind everything for depth
    smoothHaze(x, W, H, noise, P.haze, 0.10, 420);

    // ── plan the archipelago: many isles distributed across depth bands ──
    // build then sort by depth so far ones paint first (behind).
    const isles = [];
    for (let i = 0; i < p.isles; i++) {
      const depth = K.clamp(Math.pow(r(), 1.3), 0.05, 1);   // skew toward far
      const scale = W * (0.06 + depth * depth * 0.34) * (0.8 + r() * 0.5);
      const cx = W * (0.08 + r() * 0.84);
      // far isles sit higher (toward horizon glow), near isles spread lower
      const cy = H * (0.18 + (1 - depth) * 0.0 + r() * 0.6) * (0.7 + 0.5 * (1 - depth * 0.4));
      isles.push({ cx, cy: K.clamp(cy, H * 0.12, H * 0.82), scale, depth });
    }
    isles.sort((a, b) => a.depth - b.depth);

    // twin-suns event: a second glow high in the sky
    if (p.event === 'Twin Suns') K.bloom(x, W * (0.2 + r() * 0.6), H * (0.18 + r() * 0.18), Math.max(W, H) * 0.34, P.accent, 0.34);

    // ── paint isles far→near; interleave haze between depth bands ──
    let bandHazeAt = 0.4;
    for (const pl of isles) {
      // mid-depth haze pass so far cluster recedes
      if (pl.depth >= bandHazeAt && bandHazeAt < 0.9) {
        smoothHaze(x, W, H, noise, K.mix(P.haze, P.sky2, 0.4), 0.055, 380);
        bandHazeAt = 0.95;
      }
      const isle = island(x, P, W, H, r, noise, pl.cx, pl.cy, pl.scale, pl.depth, light);
      // waterfalls — more likely on bigger/nearer isles
      if (r() < 0.35 + pl.depth * 0.4) waterfall(x, P, W, H, r, noise, isle, light);
      if (r() < 0.55 + pl.depth * 0.3) waterfall(x, P, W, H, r, noise, isle, light);
      // structures on a subset (favor far isles = "distant luminous structures")
      if (r() < 0.4 && pl.scale > W * 0.07) structures(x, P, r, noise, isle, light, p.beacons);
      // a flock drifting near some isles
      if (r() < 0.45) flock(x, P, W, H, r, K.rint(r, 6, 16), pl.depth, pl.cx + (r() - 0.5) * pl.scale, pl.cy - pl.scale * (0.4 + r() * 0.6), pl.scale * 0.9);
    }

    // free-floating flocks in the open sky between isles
    for (let f = 0; f < K.rint(r, 2, 4); f++) {
      flock(x, P, W, H, r, K.rint(r, 8, 20), 0.2 + r() * 0.4, W * r(), H * (0.2 + r() * 0.5), W * 0.14);
    }

    // drifting motes / dust catching the light
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const mx = r() * W, my = r() * H;
      const s = r() * 1.6 + 0.2;
      x.fillStyle = K.rgba(r() < 0.4 ? P.accent : P.haze, 0.06 + r() * 0.3);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();

    // ── finishing atmosphere ──
    // foreground haze veil rising from the void (bottom-heavy)
    x.save(); x.globalCompositeOperation = 'screen';
    const fg = x.createLinearGradient(0, H * 0.55, 0, H);
    fg.addColorStop(0, 'rgba(0,0,0,0)');
    fg.addColorStop(1, K.rgba(P.haze, 0.22));
    x.fillStyle = fg; x.fillRect(0, H * 0.5, W, H * 0.5);
    x.restore();

    smoothHaze(x, W, H, noise, P.sky3, 0.05, 300);
    // big soft bloom over the light source again to unify
    K.bloom(x, light.lx, light.ly, Math.max(W, H) * 0.5, P.sky3, 0.16);

    K.grain(x, W, H, 540, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.40); x.restore();
    // cool top-down wash for depth
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(P.sky1, 0.28));
    tg.addColorStop(0.45, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_drift', draw, traits };
})();
