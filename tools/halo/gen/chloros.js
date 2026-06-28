/* CHLOROS — a derelict data-center reclaimed by a glowing jungle.
 * Server racks fused with overgrown vines, fiber-optic roots, bioluminescent
 * spores drifting in volumetric chartreuse haze. A corridor of depth between
 * rack-rows receding into mist. Half-machine plants: cables grow leaves.
 * ACID BOTANICAL palette — chartreuse / hot magenta bloom / deep teal ground.
 * A greenhouse that computes. */
window.ENGINE = (function () {
  const K = window.KIT;

  const PALS = [
    { name: 'Chloros',   ground: '#07251f', glow: '#c6ff2e', spore: '#ff2eb0', haze: '#3cff8e', rack: '#06201c', sky: '#0a3026' },
    { name: 'Nitrogen',  ground: '#041a18', glow: '#9bff5a', spore: '#ff3d7a', haze: '#2effb0', rack: '#051a16', sky: '#06241f' },
    { name: 'Spore',     ground: '#0f061c', glow: '#b6ff3a', spore: '#ff4ec8', haze: '#ff6ad5', rack: '#120a24', sky: '#190a2c' },
    { name: 'Toxic',     ground: '#0a2406', glow: '#dcff1a', spore: '#ff7a2e', haze: '#aaff2e', rack: '#0d2006', sky: '#143008' },
    { name: 'Abyssal',   ground: '#031416', glow: '#5affd0', spore: '#ff2eb0', haze: '#2effe0', rack: '#041618', sky: '#04181c' },
    { name: 'Ferment',   ground: '#0d1a04', glow: '#eaff3a', spore: '#ff2e6a', haze: '#caff5a', rack: '#101805', sky: '#161e06' },
  ];

  const FMTS = [
    { W: 1240, H: 1240, t: 'Square' },
    { W: 1240, H: 930, t: 'Landscape' },
    { W: 930, H: 1240, t: 'Portrait' },
  ];

  const TIMES = ['Spore Bloom', 'Deep Hum', 'Cold Boot', 'Overgrowth'];
  const DENSITIES = ['Sparse', 'Lush', 'Choked'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q) => q.name === window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const time = K.pick(TIMES, r);
    const density = K.pick(DENSITIES, r);
    const vpx = 0.30 + r() * 0.40;     // corridor vanishing point x
    const vpy = 0.34 + r() * 0.14;     // horizon height
    const rows = density === 'Sparse' ? 5 : density === 'Lush' ? 7 : 9;
    const vineDens = density === 'Sparse' ? 0.6 : density === 'Choked' ? 1.6 : 1.05;
    const sporeDens = time === 'Spore Bloom' ? 1.6 : time === 'Overgrowth' ? 1.15 : 0.7;
    return { pal, fmt, time, density, vpx, vpy, rows, vineDens, sporeDens,
      ground: pal.ground, glow: pal.glow, spore: pal.spore, haze: pal.haze, rack: pal.rack, sky: pal.sky };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Climate: p.time, Density: p.density };
  }

  // Smooth volumetric haze — soft overlapping radial fog puffs driven by fbm,
  // no lattice (unlike the gridded hazeSheet). Layered, drifting chartreuse fog.
  function fog(x, W, H, noise, col, count, sizeMin, sizeMax, aMax, r, blend) {
    x.save();
    x.globalCompositeOperation = blend || 'screen';
    for (let i = 0; i < count; i++) {
      const fx = r() * W, fy = r() * H;
      // fbm density gate so fog clumps into drifting banks, not even soup
      const d = (noise.fbm(fx / 240, fy / 200, 4) + 1) / 2;
      const a = aMax * (0.25 + d * 0.85) * (0.5 + r() * 0.5);
      const rad = sizeMin + r() * (sizeMax - sizeMin) * (0.6 + d * 0.8);
      const g = x.createRadialGradient(fx, fy, 0, fx, fy, rad);
      const c = K.mix(col, '#fff', r() * 0.15);
      g.addColorStop(0, K.rgba(c, a));
      g.addColorStop(0.6, K.rgba(c, a * 0.3));
      g.addColorStop(1, K.rgba(c, 0));
      x.fillStyle = g; x.fillRect(fx - rad, fy - rad, rad * 2, rad * 2);
    }
    x.restore();
  }

  // ── one grounded rack tower: solid vertical slab, hazier+washed when far ──
  function rackSlab(x, P, cx, baseY, w, h, depth, r, noise, fore, W) {
    const fog = K.clamp(depth, 0, 1);   // 0 near (sharp) .. 1 far (mist)
    const top = baseY - h;
    const body = K.mix(K.mix(P.rack, '#000', 0.25 * (1 - fog)), P.sky, fog * 0.92);
    const bw = w;
    x.save();
    // soft contact glow at base — algae light pooling on the floor
    K.bloom(x, cx, baseY, bw * 1.4, P.glow, 0.10 * (1 - fog * 0.55));

    // SOLID body — opaque so it reads as a real slab, not a stick
    x.fillStyle = K.rgba(body, (1 - fog * 0.55));
    x.fillRect(cx - bw / 2, top, bw, h);

    // dim face shading (left/right) for volume
    x.fillStyle = K.rgba('#000', 0.22 * (1 - fog * 0.6));
    x.fillRect(cx - bw / 2, top, bw * 0.32, h);
    x.fillStyle = K.rgba(P.glow, 0.06 * (1 - fog * 0.6));
    x.fillRect(cx + bw * 0.18, top, bw * 0.32, h);

    // bay rows — server slots with port LEDs (only legible when reasonably near)
    if (fog < 0.72 && bw > 10) {
      const bays = Math.max(4, Math.floor(h / (12 + r() * 12)));
      const bayH = h / bays;
      for (let i = 0; i < bays; i++) {
        const by = top + i * bayH;
        x.fillStyle = K.rgba('#000', 0.28 * (1 - fog));
        x.fillRect(cx - bw / 2 + 1, by + bayH - 1.5, bw - 2, 1.2);
        if (r() < 0.62 - fog * 0.35) {
          const lit = r() < 0.72 ? P.glow : P.spore;
          const lx = cx - bw / 2 + 3 + r() * (bw - 6);
          x.fillStyle = K.rgba(lit, (0.55 + r() * 0.45) * (1 - fog * 0.5));
          x.fillRect(lx, by + bayH * 0.35, 1.5 + r() * 2.5, Math.max(1, bayH * 0.3));
        }
      }
    }
    // top cap rim catching corridor light
    x.fillStyle = K.rgba(K.mix(P.glow, body, 0.45), 0.3 * (1 - fog * 0.55));
    x.fillRect(cx - bw / 2, top, bw, Math.max(1.5, 3 * (1 - fog)));

    // foreground towers: server-rack detail so they read as racks, not bars
    if (fore) {
      x.fillStyle = K.rgba('#000', 0.12);
      x.fillRect(cx - bw / 2, top, bw, h);             // near silhouette, slightly darker
      // dense bay grid with many lit ports (closest = most legible)
      const fbays = Math.max(10, Math.floor(h / 22));
      const fbh = h / fbays;
      for (let i = 0; i < fbays; i++) {
        const by = top + i * fbh;
        x.fillStyle = K.rgba('#000', 0.4);
        x.fillRect(cx - bw / 2 + 2, by + fbh - 2, bw - 4, 1.5);
        // a row of small port LEDs
        const ports = 2 + Math.floor(r() * 4);
        for (let p = 0; p < ports; p++) {
          if (r() < 0.55) {
            const lit = r() < 0.72 ? P.glow : P.spore;
            const lx = cx - bw / 2 + 5 + (p / ports) * (bw - 10) + r() * 4;
            x.fillStyle = K.rgba(lit, 0.5 + r() * 0.4);
            x.fillRect(lx, by + fbh * 0.3, 2 + r() * 2, Math.max(1.5, fbh * 0.35));
          }
        }
      }
      // glowing moss patches crawling the face
      for (let i = 0; i < 28; i++) {
        const mx = cx - bw / 2 + r() * bw, my = top + r() * h;
        K.bloom(x, mx, my, 6 + r() * 14, r() < 0.8 ? P.glow : P.spore, 0.05 + r() * 0.08);
      }
      // bright edge seam where corridor light rakes the near face
      x.fillStyle = K.rgba(P.glow, 0.14);
      x.fillRect(cx + (cx < W / 2 ? bw / 2 - 2 : -bw / 2), top, 2, h);
    }
    x.restore();
  }

  // ── vine: curl-flow line CLIMBING a slab; cables that grow leaves ──
  function vine(x, P, sx, sy, anchorX, len, baseW, noise, r, fog) {
    let px = sx, py = sy;
    const steps = Math.floor(len / 6);
    let prevx = px, prevy = py;
    const climbBias = 0.75 + r() * 0.6;
    const col = r() < 0.8 ? P.glow : P.spore;
    const cable = K.mix(P.rack, '#000', 0.4);
    x.save();
    x.lineCap = 'round';
    for (let i = 0; i < steps; i++) {
      const c = K.curl(noise, px * 0.8 + sx * 0.3, py * 0.8, 1.3);
      // pull gently toward the slab it clings to
      const pull = (anchorX - px) * 0.04;
      px += c[0] * 16 + pull + (r() - 0.5) * 1.5;
      py += -(3.0 * climbBias) + c[1] * 11;
      const t = i / steps;
      const w = baseW * (1 - t * 0.65);
      x.strokeStyle = K.rgba(cable, 0.7 * (1 - fog * 0.5));
      x.lineWidth = w + 1.6;
      x.beginPath(); x.moveTo(prevx, prevy); x.lineTo(px, py); x.stroke();
      x.strokeStyle = K.rgba(col, (0.55 - t * 0.28) * (1 - fog * 0.55));
      x.lineWidth = Math.max(0.6, w * 0.5);
      x.beginPath(); x.moveTo(prevx, prevy); x.lineTo(px, py); x.stroke();

      // leaves — small glowing blades sprouting (cables grow leaves)
      if (r() < 0.34 * (1 - fog * 0.4) && i > 2) {
        const ang = Math.atan2(py - prevy, px - prevx) + (r() < 0.5 ? 1 : -1) * (0.7 + r() * 0.5);
        const ll = (5 + r() * 10) * (1 - fog * 0.4);
        const lx = px + Math.cos(ang) * ll, ly = py + Math.sin(ang) * ll;
        x.strokeStyle = K.rgba(col, 0.5 * (1 - fog * 0.55));
        x.lineWidth = 1.2 + r() * 1.6;
        x.beginPath(); x.moveTo(px, py); x.lineTo(lx, ly); x.stroke();
        if (r() < 0.45) K.bloom(x, lx, ly, 5 + r() * 6, col, 0.12 * (1 - fog * 0.5));
      }
      prevx = px; prevy = py;
      if (py < -30 || px < -60 || px > 99999) break;
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const P = params(r);
    const W = P.fmt.W, H = P.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed ^ 0x9e37);
    const noise2 = K.makeNoise(seed ^ 0x55aa);

    const VPX = W * P.vpx, VPY = H * P.vpy;

    // ── 1. base atmosphere — deep teal ground, mist toward vanishing point ──
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(P.sky, '#000', 0.42));
    bg.addColorStop(0.4, P.ground);
    bg.addColorStop(1, K.mix(P.ground, '#000', 0.42));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // corridor light — a focused glow at the VP, not a full-frame wash
    const mistR = Math.max(W, H) * 0.42;
    const mg = x.createRadialGradient(VPX, VPY, 0, VPX, VPY, mistR);
    mg.addColorStop(0, K.rgba(P.haze, 0.6));
    mg.addColorStop(0.3, K.rgba(P.haze, 0.22));
    mg.addColorStop(1, K.rgba(P.haze, 0));
    x.fillStyle = mg; x.fillRect(0, 0, W, H);

    // ── 2. far smooth fog FIRST (sits behind racks for atmospheric depth) ──
    fog(x, W, H, noise2, P.haze, 26, 120, 360, 0.18, r, 'screen');

    // floor receding to VP — wet condensation sheen + perspective lines
    x.save();
    const fg = x.createLinearGradient(0, VPY, 0, H);
    fg.addColorStop(0, K.rgba(P.haze, 0.14));
    fg.addColorStop(0.35, K.rgba(P.ground, 0.0));
    fg.addColorStop(1, K.rgba(K.mix(P.ground, '#000', 0.55), 0.5));
    x.fillStyle = fg; x.fillRect(0, VPY, W, H - VPY);
    // faint floor perspective streaks toward VP (subtle, organic, not a grid)
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const fx = (i / 6) * W;
      x.strokeStyle = K.rgba(P.glow, 0.05);
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(fx, H); x.lineTo(VPX, VPY + 6); x.stroke();
    }
    x.restore();

    // ── 3. RACK ROWS — two grounded walls forming a corridor, far→near ──
    const rows = P.rows;
    const slabs = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < rows; i++) {
        const depth = i / (rows - 1);             // 1 far .. 0 near
        const edgeX = side < 0 ? -W * 0.08 : W * 1.08;
        const t = depth;                           // 1 = near VP
        const cx = VPX + (edgeX - VPX) * (1 - t);
        const sc = 0.06 + (1 - depth) * 1.0;
        const w = (34 + r() * 30) * sc + 5;
        const h = (H * 0.62) * sc + 10;
        const baseY = VPY + (H - VPY) * (1 - depth) * (0.5 + r() * 0.45) + 6;
        slabs.push({ cx, baseY, w, h, depth, side });
      }
    }
    // big foreground framing towers — one or two close slabs at the edges to
    // frame the corridor and force a strong fore/mid/back depth read
    const frameSide = r() < 0.5 ? -1 : 1;
    for (const side of [frameSide, -frameSide]) {
      if (side === -frameSide && r() < 0.45) continue; // sometimes just one side
      const fw = 70 + r() * 70;
      const fh = H * (0.7 + r() * 0.5);
      const fcx = side < 0 ? fw * (0.15 + r() * 0.3) : W - fw * (0.15 + r() * 0.3);
      const fbaseY = H + 10;
      slabs.push({ cx: fcx, baseY: fbaseY, w: fw, h: fh, depth: -0.15, side, fore: true });
    }

    slabs.sort((a, b) => b.depth - a.depth);
    for (const s of slabs) rackSlab(x, P, s.cx, s.baseY, s.w, s.h, s.depth, r, noise, s.fore, W);

    // ── 4. mid fog bank (in front of far racks, behind near vines) ──
    fog(x, W, H, noise, P.haze, 20, 90, 240, 0.16, r, 'screen');

    // ── 5. fiber-optic roots draping from above ──
    const roots = 5 + Math.floor(r() * 6);
    for (let i = 0; i < roots; i++) {
      const sx = r() * W;
      let px = sx, py = -10;
      const col = r() < 0.7 ? P.glow : P.spore;
      const len = H * (0.35 + r() * 0.5);
      const steps = Math.floor(len / 7);
      let prevx = px, prevy = py;
      x.save(); x.lineCap = 'round';
      for (let j = 0; j < steps; j++) {
        const c = K.curl(noise, px + 1000, py + sx, 1.5);
        px += c[0] * 16 + (r() - 0.5) * 1.2;
        py += 5 + Math.abs(c[1]) * 7;
        const w = (2.4 - 2 * (j / steps)) + 0.5;
        x.strokeStyle = K.rgba(K.mix(P.rack, '#000', 0.45), 0.55);
        x.lineWidth = w + 1.2;
        x.beginPath(); x.moveTo(prevx, prevy); x.lineTo(px, py); x.stroke();
        x.strokeStyle = K.rgba(col, 0.4 - 0.22 * (j / steps));
        x.lineWidth = Math.max(0.5, w * 0.5);
        x.beginPath(); x.moveTo(prevx, prevy); x.lineTo(px, py); x.stroke();
        prevx = px; prevy = py;
      }
      x.restore();
    }

    // ── 6. VINES — climbing the near slabs (clustered near rack columns) ──
    const nearSlabs = slabs.filter((s) => s.depth < 0.55);
    const foreSlabs = slabs.filter((s) => s.fore);
    const vineCount = Math.floor((42 + r() * 28) * P.vineDens);
    for (let i = 0; i < vineCount; i++) {
      const fog = Math.pow(r(), 1.7);
      let sx, sy, anchorX;
      // cling to foreground towers most, near slabs next, free-float least
      if (foreSlabs.length && r() < 0.4) {
        const s = K.pick(foreSlabs, r);
        sx = s.cx + (r() - 0.5) * s.w * 1.0;
        sy = (s.baseY - s.h) + r() * s.h;       // start anywhere up the tower face
        anchorX = s.cx;
      } else if (nearSlabs.length && r() < 0.7) {
        const s = K.pick(nearSlabs, r);
        sx = s.cx + (r() - 0.5) * s.w * 0.9;
        sy = H * (0.5 + r() * 0.5);
        anchorX = s.cx;
      } else {
        sx = r() * W;
        sy = H * (0.55 + r() * 0.45);
        anchorX = sx;
      }
      const len = (120 + r() * 250) * (1 - fog * 0.5);
      const bw = (1.6 + r() * 3.8) * (1 - fog * 0.45);
      vine(x, P, sx, sy, anchorX, len, bw, noise, r, fog);
    }

    // ── 7. SPORES — bioluminescent bloom dots drifting (depth-scaled) ──
    const sporeCount = Math.floor((70 + r() * 80) * P.sporeDens);
    for (let i = 0; i < sporeCount; i++) {
      const fog = r();
      const sx = r() * W, sy = r() * H;
      const sz = (1.2 + r() * 4.5) * (1 - fog * 0.6);
      const col = r() < 0.55 ? P.spore : P.glow;
      const a = (0.25 + r() * 0.5) * (1 - fog * 0.4);
      K.bloom(x, sx, sy, sz * 4, col, a * 0.5);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), a);
      x.beginPath(); x.arc(sx, sy, sz * 0.5, 0, Math.PI * 2); x.fill();
    }

    // bright spore-pops — hot magenta glints with a white specular core
    const glints = 6 + Math.floor(r() * 8);
    for (let i = 0; i < glints; i++) {
      const gx = r() * W, gy = r() * H * 0.9;
      K.bloom(x, gx, gy, 16 + r() * 28, P.spore, 0.3 + r() * 0.3);
      K.sheen(x, gx, gy, 5 + r() * 5, '#fff', 0.5);
    }

    // ── 8. atmosphere finish ──
    // distance veil re-lifting the corridor mist (kept tight, not full-frame)
    const veil = x.createRadialGradient(VPX, VPY, 0, VPX, VPY, mistR);
    veil.addColorStop(0, K.rgba(P.haze, 0.26));
    veil.addColorStop(0.5, K.rgba(P.haze, 0.06));
    veil.addColorStop(1, K.rgba(P.haze, 0));
    x.save(); x.globalCompositeOperation = 'screen';
    x.fillStyle = veil; x.fillRect(0, 0, W, H);
    x.restore();

    K.mottle(x, 0, 0, W, H, P.haze, 1600, r, 'overlay');
    K.grain(x, W, H, 95, r);
    K.vignette(x, W, H, 0.55);
    K.bloom(x, VPX, VPY, mistR * 0.4, P.haze, 0.14);

    return { aspect: cv.width / cv.height };
  }

  return { draw, traits };
})();
